// Add toast styles that work in both normal and fullscreen modes
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

// Create toast element
const toast = document.createElement('div');
toast.id = 'speed-toast';
document.body.appendChild(toast);

// Global variable to track current playback speed
let currentSpeed = 1;
let preMaxSpeed = null; // Stores the speed before toggling to max
let temporaryBoostSpeed = null;
let temporaryBoostSessionId = null;
let initiatedBoostSessionId = null;
let boostSpeedPreference = 3;
let boostKeyPreference = 'X';
let toastTimeout;
let storageDebounceTimer;
const monitoredVideos = new WeakSet();
const clearedBoostSessionIds = new Set();
const pressedBoostKeys = new Set();
const shortcutConfig = VideoSpeedShortcuts.getShortcutConfig(navigator);
const uiLocale = chrome.i18n.getMessage('@@ui_locale') || document.documentElement?.lang || 'en';

function normalizeBoostSpeed(value) {
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.min(16, Math.max(0.1, speed)) : 3;
}

function normalizeBoostKey(value) {
  const key = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]$/.test(key) ? key : 'X';
}

function getTargetSpeed() {
  return temporaryBoostSpeed ?? currentSpeed;
}

/**
 * Shows toast notification with current speed
 */
function showToast(message) {
  const isNumber = typeof message === 'number';
  toast.textContent = isNumber
    ? VideoSpeedLocalization.formatPlaybackRate(message, uiLocale)
    : message;
  toast.style.opacity = '1';
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, isNumber ? 750 : 2000);
}

/**
 * Gets current domain name without 'www.' prefix
 */
function getDomain() {
  return window.location.hostname.replace('www.', '');
}

/**
 * Recursively find all video elements, including those inside shadow DOMs
 */
function getAllVideos(root = document) {
  let videos = Array.from(root.querySelectorAll('video'));
  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    if (el.shadowRoot) {
      videos = videos.concat(getAllVideos(el.shadowRoot));
    }
  }
  return videos;
}

let isAtLiveEdge = false;

/**
 * Determines the effective speed to apply to the video.
 * If we are watching a YouTube live stream and at the live edge, we force 1x speed
 * to prevent the buffering/catch-up loop. Otherwise, we use the user's selected speed.
 */
function getEffectiveSpeed(targetSpeed) {
  let currentlyAtLiveEdge = false;
  if (window.location.hostname.includes('youtube.com')) {
    const liveBadge = document.querySelector('.ytp-live-badge');
    if (liveBadge && !liveBadge.hasAttribute('hidden') && liveBadge.style.display !== 'none') {
      if (liveBadge.classList.contains('ytp-live-badge-is-livehead')) {
        currentlyAtLiveEdge = true;
      }
    }
  }

  if (currentlyAtLiveEdge) {
    if (!isAtLiveEdge && targetSpeed !== 1) {
      isAtLiveEdge = true;
      const message = chrome.i18n.getMessage('liveStreamSynced') || 'Live stream synced — 1x';
      showToast(message);
    }
    return 1;
  } else {
    isAtLiveEdge = false;
    return targetSpeed;
  }
}

/**
 * Force update all video speeds
 */
function forceUpdateVideoSpeeds(speed = getTargetSpeed()) {
  const videos = getAllVideos();
  const effectiveSpeed = getEffectiveSpeed(speed);
  videos.forEach((video) => {
    if (video && video.playbackRate !== effectiveSpeed) {
      video.playbackRate = effectiveSpeed;
    }
  });
}

/**
 * Sets playback speed for all video elements
 */
async function setVideoSpeed(speed, skipStorage = false) {
  try {
    console.log(`Setting video speed to ${speed} (skipStorage: ${skipStorage})`);
    currentSpeed = speed;
    forceUpdateVideoSpeeds();

    // Save speed setting if not skipped
    if (!skipStorage) {
      clearTimeout(storageDebounceTimer);
      storageDebounceTimer = setTimeout(async () => {
        try {
          const domain = getDomain();
          const data = await chrome.storage.sync.get('domainSpeeds');
          const domainSpeeds = data.domainSpeeds || {};
          domainSpeeds[domain] = speed;
          await chrome.storage.sync.set({ domainSpeeds });
          console.log(`Saved speed ${speed} for domain ${domain}`);
        } catch (err) {
          console.error('Error saving speed:', err);
        }
      }, 500);
    }
  } catch (error) {
    console.error('Error setting video speed:', error);
  }
}

/**
 * Loads and applies saved speed setting
 */
async function applySavedSpeed() {
  try {
    const domain = getDomain();
    const data = await chrome.storage.sync.get([
      'domainSpeeds',
      'temporaryBoostSpeed',
      'temporaryBoostKey'
    ]);
    const domainSpeeds = data.domainSpeeds || {};
    const savedSpeed = domainSpeeds[domain] || 1;
    boostSpeedPreference = normalizeBoostSpeed(data.temporaryBoostSpeed);
    boostKeyPreference = normalizeBoostKey(data.temporaryBoostKey);
    console.log(`Loading saved speed for ${domain}: ${savedSpeed}`);
    await setVideoSpeed(savedSpeed, true);
  } catch (error) {
    console.error('Error loading saved speed:', error);
  }
}

/**
 * Monitors and maintains speed settings for video elements
 */
function monitorVideoElements() {
  const videos = getAllVideos();
  videos.forEach(video => {
    if (!monitoredVideos.has(video)) {
      monitoredVideos.add(video);
      video.addEventListener('ratechange', handleRateChange);
      video.addEventListener('play', handlePlay);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
    }
    
    // Set initial speed
    const effectiveSpeed = getEffectiveSpeed(getTargetSpeed());
    if (video.playbackRate !== effectiveSpeed) {
      video.playbackRate = effectiveSpeed;
    }
  });
}

// Event handlers for video elements
function handleRateChange(event) {
  const effectiveSpeed = getEffectiveSpeed(getTargetSpeed());
  if (event.target.playbackRate !== effectiveSpeed) {
    event.target.playbackRate = effectiveSpeed;
  }
}

function handlePlay() {
  this.playbackRate = getEffectiveSpeed(getTargetSpeed());
}

function handleLoadedMetadata() {
  this.playbackRate = getEffectiveSpeed(getTargetSpeed());
}

function handleTimeUpdate(event) {
  const effectiveSpeed = getEffectiveSpeed(getTargetSpeed());
  if (event.target.playbackRate !== effectiveSpeed) {
    event.target.playbackRate = effectiveSpeed;
  }
}

// Watch for dynamically added videos
let observerTimeout = null;
const observer = new MutationObserver((mutations) => {
  const hasAddedNodes = mutations.some(mutation => mutation.addedNodes.length > 0);
  if (hasAddedNodes) {
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      monitorVideoElements();
    }, 100);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;

  if (changes.temporaryBoostSpeed) {
    boostSpeedPreference = normalizeBoostSpeed(changes.temporaryBoostSpeed.newValue);
    if (temporaryBoostSessionId !== null) {
      temporaryBoostSpeed = boostSpeedPreference;
      forceUpdateVideoSpeeds();
    }
  }

  if (changes.temporaryBoostKey) {
    requestBoostEnd();
    pressedBoostKeys.clear();
    boostKeyPreference = normalizeBoostKey(changes.temporaryBoostKey.newValue);
  }

  if (changes.domainSpeeds) {
    const domain = getDomain();
    const domainSpeeds = changes.domainSpeeds.newValue || {};
    const newSpeed = domainSpeeds[domain];
    const oldSpeed = changes.domainSpeeds.oldValue?.[domain];
    
    console.log('Storage changed:', {
      domain,
      newSpeed,
      currentSpeed,
      allDomainSpeeds: domainSpeeds
    });
    
    // A popup broadcast may temporarily set an embedded frame's speed. Saving
    // the top-level site's value must not restore an unchanged frame-site value.
    if (newSpeed && newSpeed !== oldSpeed && newSpeed !== currentSpeed) {
      console.log(`Updating speed from storage change: ${newSpeed}`);
      setVideoSpeed(newSpeed, true);
      showToast(newSpeed);
    }
  }
});

function isBoostChordKey(code) {
  return VideoSpeedShortcuts.isTrackedBoostCode(
    code,
    `Key${boostKeyPreference}`,
    shortcutConfig
  );
}

function isBoostChordPressed(event) {
  return VideoSpeedShortcuts.isBoostChordPressed(
    pressedBoostKeys,
    `Key${boostKeyPreference}`,
    shortcutConfig,
    event ? VideoSpeedShortcuts.hasAltGraph(event) : false
  );
}

function requestBoostStart() {
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  initiatedBoostSessionId = sessionId;
  applyTemporaryBoost(sessionId, boostSpeedPreference);
  chrome.runtime.sendMessage({
    action: 'temporaryBoostStart',
    sessionId,
    speed: boostSpeedPreference
  }).catch(error => {
    if (initiatedBoostSessionId === sessionId) initiatedBoostSessionId = null;
    clearTemporaryBoost(sessionId);
    console.error('Error starting temporary boost:', error);
  });
}

function requestBoostEnd() {
  const sessionId = initiatedBoostSessionId;
  if (!sessionId) return;

  initiatedBoostSessionId = null;
  clearTemporaryBoost(sessionId);
  chrome.runtime.sendMessage({
    action: 'temporaryBoostEnd',
    sessionId
  }).catch(error => {
    console.error('Error ending temporary boost:', error);
  });
}

function applyTemporaryBoost(sessionId, speed) {
  if (clearedBoostSessionIds.has(sessionId)) return;

  const isNewSession = temporaryBoostSessionId !== sessionId;
  temporaryBoostSessionId = sessionId;
  temporaryBoostSpeed = normalizeBoostSpeed(speed);
  forceUpdateVideoSpeeds();
  if (isNewSession) {
    showToast(temporaryBoostSpeed);
  }
}

function clearTemporaryBoost(sessionId) {
  if (sessionId) {
    clearedBoostSessionIds.add(sessionId);
    if (clearedBoostSessionIds.size > 20) {
      clearedBoostSessionIds.delete(clearedBoostSessionIds.values().next().value);
    }
  }
  if (sessionId && temporaryBoostSessionId !== sessionId) return;

  temporaryBoostSessionId = null;
  temporaryBoostSpeed = null;
  if (initiatedBoostSessionId === sessionId) initiatedBoostSessionId = null;
  forceUpdateVideoSpeeds();
  showToast(currentSpeed);
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (event) => {
  const isChordKey = isBoostChordKey(event.code);
  if (isChordKey) {
    pressedBoostKeys.add(event.code);
  }

  if (isChordKey && isBoostChordPressed(event)) {
    event.preventDefault();
    event.stopPropagation();
    if (!initiatedBoostSessionId) requestBoostStart();
    return;
  }

  if (initiatedBoostSessionId && isChordKey) {
    requestBoostEnd();
  }

  const result = VideoSpeedShortcuts.resolveOneShot(
    event,
    currentSpeed,
    preMaxSpeed,
    shortcutConfig
  );
  if (!result) return;

  event.preventDefault();
  event.stopPropagation();
  preMaxSpeed = result.preMaxSpeed;

  if (result.nextSpeed !== null) {
    setVideoSpeed(result.nextSpeed);
    showToast(result.nextSpeed);
  }
});

document.addEventListener('keyup', (event) => {
  const releasedChordKey = isBoostChordKey(event.code);
  pressedBoostKeys.delete(event.code);
  if (!initiatedBoostSessionId || !releasedChordKey || isBoostChordPressed(event)) return;

  event.preventDefault();
  event.stopPropagation();
  requestBoostEnd();
});

function resetBoostChord() {
  pressedBoostKeys.clear();
  requestBoostEnd();
}

window.addEventListener('blur', resetBoostChord);
window.addEventListener('pagehide', resetBoostChord);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetBoostChord();
});

// Listen for speed change messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setSpeed') {
    // Only the top frame should handle the storage save during broadcast to prevent race conditions
    const skipStorage = window !== window.top;
    setVideoSpeed(request.speed, skipStorage);
    showToast(request.speed);
    sendResponse({ success: true });
  } else if (request.action === 'applyTemporaryBoost') {
    applyTemporaryBoost(request.sessionId, request.speed);
    sendResponse({ success: true });
  } else if (request.action === 'clearTemporaryBoost') {
    clearTemporaryBoost(request.sessionId);
    sendResponse({ success: true });
  }
  return true;
});

// Initialize
applySavedSpeed();
monitorVideoElements();

// Periodic check as fallback
setInterval(() => {
  forceUpdateVideoSpeeds();
}, 2000);
