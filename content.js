// Toast styling so the notification works in both windowed and fullscreen video
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  #speed-toast {
    position: fixed;
    left: 50%;
    bottom: 25vh;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 20px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 18px;
    font-weight: 500;
    z-index: 9999999999;
    transition: opacity 0.15s ease-in-out;
    opacity: 0;
    pointer-events: none;
  }
`;
document.head.appendChild(toastStyles);

// Toast node reused for every speed change
const toast = document.createElement('div');
toast.id = 'speed-toast';
document.body.appendChild(toast);

// Global speed the extension believes the current domain should be using
let currentSpeed = 1;
let preMaxSpeed = null; // Stores the speed before toggling to max
let toastTimeout = null;

// Per-video bookkeeping so we can distinguish our own updates from site-driven ones
const videoStates = new WeakMap();
const RATE_EPSILON = 0.0001;
const INITIAL_SYNC_WINDOW = 2500; // ms to enforce saved speed when a new video appears
const USER_INTERACTION_WINDOW = 600;

let lastUserInteraction = 0;
let lastExtensionSetAt = 0;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidSpeed(value) {
  return isFiniteNumber(value) && value > 0;
}

function sanitizeSpeed(value, fallback = 1) {
  return isValidSpeed(value) ? value : fallback;
}

function areRatesEqual(a, b) {
  return Math.abs(a - b) < RATE_EPSILON;
}

function recordUserInteraction(event) {
  if (event && event.isTrusted) {
    lastUserInteraction = performance.now();
  }
}

document.addEventListener('pointerdown', recordUserInteraction, { capture: true, passive: true });
document.addEventListener('touchstart', recordUserInteraction, { capture: true, passive: true });
document.addEventListener('keydown', recordUserInteraction, { capture: true });

function getVideoState(video) {
  if (!video) {
    return null;
  }

  let state = videoStates.get(video);
  if (!state) {
    state = {
      internalDepth: 0,
      lastObserved: sanitizeSpeed(video.playbackRate, 1),
      syncingUntil: 0,
      listenersAttached: false
    };
    videoStates.set(video, state);
  }
  return state;
}

function runAsInternalUpdate(video, action) {
  const state = getVideoState(video);
  if (!state) {
    return;
  }

  state.internalDepth += 1;
  try {
    action();
  } finally {
    state.internalDepth = Math.max(0, state.internalDepth - 1);
  }
}

function isInternalEvent(video) {
  const state = getVideoState(video);
  return Boolean(state && state.internalDepth > 0);
}

function applyPlaybackRate(video, rate) {
  if (!video) {
    return;
  }

  const state = getVideoState(video);
  const targetRate = sanitizeSpeed(rate, state ? state.lastObserved : 1);

  runAsInternalUpdate(video, () => {
    video.playbackRate = targetRate;
  });

  if (state) {
    state.lastObserved = targetRate;
  }
}

function beginInitialSync(video, desiredSpeed) {
  const state = getVideoState(video);
  if (!state) {
    return;
  }

  state.syncingUntil = performance.now() + INITIAL_SYNC_WINDOW;
  applyPlaybackRate(video, desiredSpeed);
}

function showToast(speed) {
  toast.textContent = `${speed}x`;
  toast.style.opacity = '1';

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, 750);
}

function getDomain() {
  return window.location.hostname.replace('www.', '');
}

function getVideos() {
  return Array.from(document.querySelectorAll('video'));
}

function syncAllVideos(speed, enforceWindow = 0) {
  const now = performance.now();
  const enforceUntil = enforceWindow > 0 ? now + enforceWindow : 0;

  getVideos().forEach(video => {
    const state = getVideoState(video);
    if (state && enforceUntil) {
      state.syncingUntil = Math.max(state.syncingUntil, enforceUntil);
    }
    applyPlaybackRate(video, speed);
  });
}

async function setVideoSpeed(speed, options = {}) {
  const { skipStorage = false, source = 'extension' } = options;

  const normalizedSpeed = sanitizeSpeed(speed, currentSpeed > 0 ? currentSpeed : 1);
  const speedChanged = !areRatesEqual(normalizedSpeed, currentSpeed);

  if (!isValidSpeed(speed)) {
    console.warn('Ignoring invalid requested speed, defaulting to', normalizedSpeed, { speed });
  }

  currentSpeed = normalizedSpeed;
  if (source !== 'external') {
    lastExtensionSetAt = performance.now();
  }

  const enforceWindow = source === 'external' ? 0 : INITIAL_SYNC_WINDOW;
  syncAllVideos(normalizedSpeed, enforceWindow);

  if (!skipStorage && speedChanged) {
    try {
      const domain = getDomain();
      const data = await chrome.storage.sync.get('domainSpeeds');
      const domainSpeeds = data.domainSpeeds || {};
      domainSpeeds[domain] = normalizedSpeed;
      await chrome.storage.sync.set({ domainSpeeds });
      console.log(`Stored playback speed ${normalizedSpeed}x for ${domain}`);
    } catch (error) {
      console.error('Failed to persist playback speed', error);
    }
  }
}

async function applySavedSpeed() {
  try {
    const domain = getDomain();
    const data = await chrome.storage.sync.get('domainSpeeds');
    const domainSpeeds = data.domainSpeeds || {};
    const savedSpeed = sanitizeSpeed(domainSpeeds[domain], 1);
    console.log(`Applying saved speed for ${domain}: ${savedSpeed}`);
    await setVideoSpeed(savedSpeed, { skipStorage: true, source: 'storage' });
  } catch (error) {
    console.error('Failed to load saved speed', error);
  }
}

function handleRateChange(event) {
  const video = event.target;
  const state = getVideoState(video);

  if (isInternalEvent(video)) {
    return;
  }

  const observedSpeed = sanitizeSpeed(video.playbackRate, state ? state.lastObserved : currentSpeed);

  if (!isValidSpeed(observedSpeed)) {
    const fallback = sanitizeSpeed(state ? state.lastObserved : currentSpeed, currentSpeed);
    console.warn('Restoring invalid playback rate', { reported: observedSpeed, fallback });
    applyPlaybackRate(video, fallback);
    return;
  }

  if (state) {
    state.lastObserved = observedSpeed;
  }

  const now = performance.now();
  if (state && state.syncingUntil > now) {
    const recentInteraction = now - lastUserInteraction <= USER_INTERACTION_WINDOW;
    const recentlySetByExtension = now - lastExtensionSetAt <= INITIAL_SYNC_WINDOW;
    if (!recentInteraction || recentlySetByExtension) {
      state.syncingUntil = now + INITIAL_SYNC_WINDOW;
      if (!areRatesEqual(observedSpeed, currentSpeed)) {
        state.lastObserved = currentSpeed;
        applyPlaybackRate(video, currentSpeed);
      }
      return;
    }
    state.syncingUntil = 0;
  }

  if (areRatesEqual(observedSpeed, currentSpeed)) {
    return;
  }

  setVideoSpeed(observedSpeed, { source: 'external' })
    .then(() => {
      showToast(observedSpeed);
    })
    .catch((error) => {
      console.error('Failed to sync external speed change', error);
    });
}

function handlePlay() {
  applyPlaybackRate(this, currentSpeed);
}

function handleLoadedMetadata() {
  beginInitialSync(this, currentSpeed);
}

function attachListeners(video) {
  const state = getVideoState(video);
  if (!state || state.listenersAttached) {
    return;
  }

  video.addEventListener('ratechange', handleRateChange);
  video.addEventListener('play', handlePlay);
  video.addEventListener('loadedmetadata', handleLoadedMetadata);

  state.listenersAttached = true;
  beginInitialSync(video, currentSpeed);
}

function monitorVideoElements() {
  getVideos().forEach(attachListeners);
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      monitorVideoElements();
      break;
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes.domainSpeeds) {
    return;
  }

  const domain = getDomain();
  const domainSpeeds = changes.domainSpeeds.newValue || {};
  const newSpeed = sanitizeSpeed(domainSpeeds[domain], currentSpeed);

  if (!areRatesEqual(newSpeed, currentSpeed)) {
    setVideoSpeed(newSpeed, { skipStorage: true, source: 'storage' })
      .then(() => {
        showToast(newSpeed);
      })
      .catch((error) => {
        console.error('Failed to apply speed from storage change', error);
      });
  }
});

document.addEventListener('keydown', (event) => {
  if (!event.metaKey || !event.altKey) {
    return;
  }

  let nextSpeed = null;
  const digitMatch = event.code.match(/^(?:Digit|Numpad)([0-9])$/);

  if (digitMatch) {
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      const digit = parseInt(digitMatch[1], 10);
      if (digit === 0) {
        if (areRatesEqual(currentSpeed, 16)) {
          nextSpeed = preMaxSpeed !== null ? preMaxSpeed : 1;
          preMaxSpeed = null;
        } else {
          preMaxSpeed = currentSpeed;
          nextSpeed = 16;
        }
      } else {
        const baseSpeed = digit;
        if (areRatesEqual(currentSpeed, baseSpeed)) {
          nextSpeed = baseSpeed + 0.5;
        } else if (areRatesEqual(currentSpeed, baseSpeed + 0.5)) {
          nextSpeed = baseSpeed;
        } else {
          nextSpeed = baseSpeed;
        }
      }
    }
  } else {
    switch (event.code) {
      case 'Equal':
      case 'NumpadAdd':
      case 'Plus':
        event.preventDefault();
        event.stopPropagation();
        nextSpeed = Math.min(16, Math.round((currentSpeed + 0.05) * 100) / 100);
        break;
      case 'Minus':
      case 'NumpadSubtract':
        event.preventDefault();
        event.stopPropagation();
        nextSpeed = Math.max(0.1, Math.round((currentSpeed - 0.05) * 100) / 100);
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        event.stopPropagation();
        nextSpeed = 1;
        break;
      default:
        break;
    }
  }

  if (nextSpeed !== null) {
    setVideoSpeed(nextSpeed)
      .then(() => {
        showToast(nextSpeed);
      })
      .catch((error) => {
        console.error('Failed to set speed from shortcut', error);
      });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setSpeed') {
    setVideoSpeed(request.speed)
      .then(() => {
        showToast(currentSpeed);
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Failed to set speed from message', error);
        sendResponse({ success: false, error: error?.message || 'Unknown error' });
      });
    return true;
  }
  return false;
});

applySavedSpeed()
  .catch((error) => {
    console.error('Continuing without saved speed due to error', error);
  })
  .finally(() => {
    monitorVideoElements();
  });
