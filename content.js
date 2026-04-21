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
let toastTimeout;
let storageDebounceTimer;
const monitoredVideos = new WeakSet();

// Utility for rate comparison
const RATE_EPSILON = 0.0001;
function areRatesEqual(a, b) {
  return Math.abs(a - b) < RATE_EPSILON;
}

/**
 * Shows toast notification with current speed
 */
function showToast(message) {
  const isNumber = typeof message === 'number';
  toast.textContent = isNumber ? `${message}x` : message;
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
function forceUpdateVideoSpeeds(speed) {
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
    forceUpdateVideoSpeeds(speed);

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
    const data = await chrome.storage.sync.get('domainSpeeds');
    const domainSpeeds = data.domainSpeeds || {};
    const savedSpeed = domainSpeeds[domain] || 1;
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
    const effectiveSpeed = getEffectiveSpeed(currentSpeed);
    if (video.playbackRate !== effectiveSpeed) {
      video.playbackRate = effectiveSpeed;
    }
  });
}

// Event handlers for video elements
function handleRateChange(event) {
  const effectiveSpeed = getEffectiveSpeed(currentSpeed);
  if (event.target.playbackRate !== effectiveSpeed) {
    event.target.playbackRate = effectiveSpeed;
  }
}

function handlePlay() {
  this.playbackRate = getEffectiveSpeed(currentSpeed);
}

function handleLoadedMetadata() {
  this.playbackRate = getEffectiveSpeed(currentSpeed);
}

function handleTimeUpdate(event) {
  const effectiveSpeed = getEffectiveSpeed(currentSpeed);
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
  if (namespace === 'sync' && changes.domainSpeeds) {
    const domain = getDomain();
    const domainSpeeds = changes.domainSpeeds.newValue || {};
    const newSpeed = domainSpeeds[domain];
    
    console.log('Storage changed:', {
      domain,
      newSpeed,
      currentSpeed,
      allDomainSpeeds: domainSpeeds
    });
    
    if (newSpeed && newSpeed !== currentSpeed) {
      console.log(`Updating speed from storage change: ${newSpeed}`);
      setVideoSpeed(newSpeed, true);
      showToast(newSpeed);
    }
  }
});

// Handle keyboard shortcuts
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
    setVideoSpeed(nextSpeed);
    showToast(nextSpeed);
  }
});

// Listen for speed change messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setSpeed') {
    // Only the top frame should handle the storage save during broadcast to prevent race conditions
    const skipStorage = window !== window.top;
    setVideoSpeed(request.speed, skipStorage);
    showToast(request.speed);
    sendResponse({ success: true });
  }
  return true;
});

// Initialize
applySavedSpeed();
monitorVideoElements();

// Periodic check as fallback
setInterval(() => {
  forceUpdateVideoSpeeds(currentSpeed);
}, 2000);
