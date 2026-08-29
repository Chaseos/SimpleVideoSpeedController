// Global state to track current speed and domain
const KOFI_URL = 'https://ko-fi.com/chaseos';
const REVIEW_URLS = {
  chrome: 'https://chromewebstore.google.com/detail/simple-video-speed-contro/kcjfpmjkbkhgojilpihplkedadndnked/reviews',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/simple-video-speed-contro/mnmagmdfgdjhbfkdnonnhkfnbnjpehja',
  firefox: 'https://addons.mozilla.org/firefox/addon/simple-video-speed-controller/reviews/',
  opera: 'https://addons.opera.com/extensions/details/simple-video-speed-controller/',
  whale: 'https://store.whale.naver.com/detail/fkcbnblnjclbfnkkhnmoaelklgfiigbc'
};
let currentSpeed = 1;
let currentDomain = '';
let storageDebounceTimer;
let boostStorageDebounceTimer;
let boostKeyToastTimer;
let boostSpeed = 3;
let boostKey = 'X';

function normalizeBoostSpeed(value) {
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.min(16, Math.max(0.1, speed)) : 3;
}

function normalizeBoostKey(value) {
  const key = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]$/.test(key) ? key : 'X';
}

function formatSpeed(speed) {
  return VideoSpeedLocalization.formatNumberForInput(speed);
}

function getUiLocale() {
  return getI18nMessage('@@ui_locale') || document.documentElement.lang || 'en';
}

function formatPlaybackRate(speed) {
  return VideoSpeedLocalization.formatPlaybackRate(speed, getUiLocale());
}

function updateSpeedInputDisplay(input) {
  if (!input) return;
  const display = input.parentElement?.querySelector('.speed-input-display');
  if (!display) return;

  const rawValue = input.value.trim();
  if (!rawValue) {
    display.textContent = '';
    return;
  }

  const speed = Number(rawValue);
  display.textContent = Number.isFinite(speed) && speed > 0
    ? formatPlaybackRate(speed)
    : '';
}

/**
 * Check if this is the first time opening the popup
 */
async function checkFirstOpen() {
  try {
    const data = await chrome.storage.sync.get('hasSeenPinSuggestion');
    if (!data.hasSeenPinSuggestion) {
      // Show pin suggestion
      document.querySelector('.pin-suggestion').classList.add('show');
      
      // Add click handler for the "Got it" button
      document.querySelector('.got-it-btn').addEventListener('click', async () => {
        document.querySelector('.pin-suggestion').classList.remove('show');
        // Mark as seen
        await chrome.storage.sync.set({ hasSeenPinSuggestion: true });

        // Automatically expand the shortcuts section
        const toggleBtn = document.getElementById('shortcutsToggle');
        const content = document.getElementById('shortcutsContent');
        if (toggleBtn && content && !toggleBtn.classList.contains('open')) {
          toggleBtn.classList.add('open');
          content.classList.add('open');
        }
      });
    }
  } catch (error) {
    console.error('Error checking first open:', error);
  }
}

/**
 * Check if the review prompt should be shown
 */
async function checkReviewPrompt() {
  try {
    const data = await chrome.storage.sync.get(['speedChangeCount', 'hasDismissedReview']);
    const count = data.speedChangeCount || 0;
    const dismissed = data.hasDismissedReview || false;

    if (count >= 10 && !dismissed) {
      const prompt = document.getElementById('reviewPrompt');
      const reviewLink = document.getElementById('reviewLink');
      const closeBtn = document.getElementById('closeReview');

      if (prompt) {
        prompt.style.display = 'flex';
        
        // Link dynamically based on browser
        if (reviewLink) {
          const ua = navigator.userAgent.toLowerCase();
          const isFirefox = ua.includes('firefox');
          const isOpera = ua.includes('opr') || ua.includes('opera');
          const isWhale = ua.includes('whale');
          const isEdge = ua.includes('edg') || ua.includes('edge') || (
            typeof navigator.userAgentData !== 'undefined' && 
            navigator.userAgentData.brands && 
            navigator.userAgentData.brands.some(b => b.brand.includes('Edge'))
          );

          if (isFirefox) {
            reviewLink.href = REVIEW_URLS.firefox;
          } else if (isOpera) {
            reviewLink.href = REVIEW_URLS.opera;
          } else if (isWhale) {
            reviewLink.href = REVIEW_URLS.whale;
          } else if (isEdge) {
            reviewLink.href = REVIEW_URLS.edge;
          } else {
            reviewLink.href = REVIEW_URLS.chrome;
          }
        }

        const dismissAndHide = async (e) => {
          if (e) e.preventDefault();
          
          // 1. Mark as dismissed in storage immediately and await it
          await chrome.storage.sync.set({ hasDismissedReview: true });

          // 2. Open the review link in a new tab if available
          if (reviewLink && reviewLink.href && reviewLink.href !== '#' && !reviewLink.href.startsWith('javascript:')) {
            chrome.tabs.create({ url: reviewLink.href });
          }

          // 3. Hide the prompt from current view
          prompt.style.display = 'none';
        };

        if (prompt) {
          prompt.addEventListener('click', dismissAndHide);
        }
      }
    }
  } catch (error) {
    console.error('Error checking review prompt:', error);
  }
}

/**
 * Localize the HTML page using Chrome i18n
 */
function getI18nMessage(messageName) {
  if (typeof chrome === 'undefined' || !chrome.i18n?.getMessage) {
    return '';
  }

  return chrome.i18n.getMessage(messageName);
}

function localizeHtmlPage() {
  const uiLocale = getI18nMessage('@@ui_locale');
  const textDirection = getI18nMessage('@@bidi_dir');
  const appName = getI18nMessage('appName');

  if (uiLocale) {
    document.documentElement.lang = uiLocale.replace('_', '-');
  }
  if (textDirection === 'ltr' || textDirection === 'rtl') {
    document.documentElement.dir = textDirection;
  }
  if (appName) {
    document.title = appName;
  }

  // Localize text content
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const message = getI18nMessage(element.getAttribute('data-i18n'));
    if (message) {
      if (element.tagName === 'SPAN' && message.includes('<kbd>')) {
        element.innerHTML = message;
      } else {
        element.textContent = message;
      }
    }
  });

  // Localize placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const message = getI18nMessage(element.getAttribute('data-i18n-placeholder'));
    if (message) {
      element.placeholder = message;
    }
  });

  // Localize tooltip and accessibility labels
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const message = getI18nMessage(element.getAttribute('data-i18n-title'));
    if (message) {
      element.title = message;
    }
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    const message = getI18nMessage(element.getAttribute('data-i18n-aria-label'));
    if (message) {
      element.setAttribute('aria-label', message);
    }
  });

  document.querySelectorAll('.speed-button').forEach(button => {
    button.textContent = formatPlaybackRate(Number(button.dataset.speed));
  });

  document.querySelectorAll('.speed-input-field input').forEach(input => {
    updateSpeedInputDisplay(input);
  });
}

/**
 * Initialize the popup UI and load saved settings
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Localize UI first
  localizeHtmlPage();

  const kofiLink = document.getElementById('kofi-link');
  if (kofiLink) {
    kofiLink.href = KOFI_URL;
  }

  // Check for first-time open
  await checkFirstOpen();

  // Check if review prompt should be shown
  await checkReviewPrompt();

  // Set default value in custom speed input
  const customSpeedInput = document.getElementById('customSpeed');
  if (customSpeedInput) {
    customSpeedInput.value = '1';
  }

  await loadTemporaryBoostPreferences();

  // Get current tab's domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url) {
      currentDomain = new URL(tabs[0].url).hostname.replace('www.', '');
    }
  } catch (error) {
    console.error('Error getting current domain:', error);
  }

  // Initialize event listeners
  setupEventListeners();
  setupShortcutKeys();
  
  // Load and apply saved speed for current domain
  try {
    const data = await chrome.storage.sync.get('domainSpeeds');
    const domainSpeeds = data.domainSpeeds || {};
    const savedSpeed = domainSpeeds[currentDomain];
    if (savedSpeed) {
      currentSpeed = savedSpeed;
      updateUI(savedSpeed);
    } else {
      currentSpeed = 1;
      updateUI(1);
    }
  } catch (error) {
    console.error('Error loading saved speed:', error);
    updateUI(1); // Fallback to default speed
  }
});

/**
 * Setup OS specific shortcut keys and toggle logic
 */
function setupShortcutKeys() {
  const shortcutConfig = VideoSpeedShortcuts.getShortcutConfig(navigator);
  
  document.querySelectorAll('.primary-modifier-key').forEach(el => {
    el.textContent = shortcutConfig.primaryLabel;
  });
  
  document.querySelectorAll('.secondary-modifier-key').forEach(el => {
    el.textContent = shortcutConfig.secondaryLabel;
  });

  const toggleBtn = document.getElementById('shortcutsToggle');
  const content = document.getElementById('shortcutsContent');
  
  if (toggleBtn && content) {
    toggleBtn.addEventListener('click', () => {
      toggleBtn.classList.toggle('open');
      content.classList.toggle('open');
    });
  }
}

async function loadTemporaryBoostPreferences() {
  try {
    const data = await chrome.storage.sync.get([
      'temporaryBoostSpeed',
      'temporaryBoostKey'
    ]);
    boostSpeed = normalizeBoostSpeed(data.temporaryBoostSpeed);
    boostKey = normalizeBoostKey(data.temporaryBoostKey);
  } catch (error) {
    console.error('Error loading temporary boost preferences:', error);
  }
  updateTemporaryBoostUI();
}

function updateTemporaryBoostUI() {
  const speedInput = document.getElementById('boostSpeed');
  const keyInput = document.getElementById('boostKey');
  const editorKey = document.getElementById('boostEditorKeyDisplay');
  const summarySpeed = document.getElementById('boostSummarySpeed');
  const summaryKey = document.getElementById('boostSummaryKey');

  if (speedInput && document.activeElement !== speedInput) {
    speedInput.value = formatSpeed(boostSpeed);
  }
  updateSpeedInputDisplay(speedInput);
  if (keyInput) keyInput.value = boostKey;
  if (editorKey) editorKey.textContent = boostKey;
  if (summarySpeed) summarySpeed.textContent = formatPlaybackRate(boostSpeed);
  if (summaryKey) summaryKey.textContent = boostKey;
}

async function saveBoostKey(key) {
  boostKey = normalizeBoostKey(key);
  updateTemporaryBoostUI();
  try {
    await chrome.storage.sync.set({ temporaryBoostKey: boostKey });
  } catch (error) {
    console.error('Error saving temporary boost key:', error);
  }
}

function saveBoostSpeed(value, immediate = false) {
  const parsedSpeed = Number(value);
  if (!Number.isFinite(parsedSpeed) || parsedSpeed < 0.1 || parsedSpeed > 16) return false;

  boostSpeed = Math.round(parsedSpeed * 100) / 100;
  updateTemporaryBoostUI();
  clearTimeout(boostStorageDebounceTimer);

  const persist = async () => {
    try {
      await chrome.storage.sync.set({ temporaryBoostSpeed: boostSpeed });
    } catch (error) {
      console.error('Error saving temporary boost speed:', error);
    }
  };

  if (immediate) {
    persist();
  } else {
    boostStorageDebounceTimer = setTimeout(persist, 300);
  }
  return true;
}

function setupTemporaryBoostControls() {
  const summary = document.getElementById('boostSummary');
  const editor = document.getElementById('boostEditor');
  const speedInput = document.getElementById('boostSpeed');
  const keyInput = document.getElementById('boostKey');
  const speedUpButton = document.getElementById('boostSpeedUp');
  const speedDownButton = document.getElementById('boostSpeedDown');
  const keyToast = document.getElementById('boostKeyToast');

  const hideKeyToast = () => {
    clearTimeout(boostKeyToastTimer);
    keyToast?.classList.remove('visible');
  };

  const showKeyToast = () => {
    if (!keyToast || !keyInput) return;

    const keyRect = keyInput.getBoundingClientRect();
    keyToast.style.bottom = `${Math.max(16, window.innerHeight - keyRect.top + 8)}px`;
    keyToast.classList.add('visible');
    clearTimeout(boostKeyToastTimer);
    boostKeyToastTimer = setTimeout(hideKeyToast, 3200);
  };

  summary?.addEventListener('click', () => {
    const isOpen = editor.classList.toggle('open');
    summary.setAttribute('aria-expanded', String(isOpen));
  });

  speedInput?.addEventListener('input', () => {
    updateSpeedInputDisplay(speedInput);
    saveBoostSpeed(speedInput.value);
  });
  speedInput?.addEventListener('change', () => {
    if (!saveBoostSpeed(speedInput.value, true)) {
      boostSpeed = normalizeBoostSpeed(speedInput.value);
      saveBoostSpeed(boostSpeed, true);
    }
    updateTemporaryBoostUI();
    speedInput.value = formatSpeed(boostSpeed);
  });

  speedInput?.addEventListener('blur', () => {
    speedInput.value = formatSpeed(boostSpeed);
    updateSpeedInputDisplay(speedInput);
  });

  const adjustBoostSpeed = delta => {
    const nextSpeed = Math.min(
      16,
      Math.max(0.1, Math.round((boostSpeed + delta) * 100) / 100)
    );
    saveBoostSpeed(nextSpeed, true);
  };

  speedUpButton?.addEventListener('click', () => adjustBoostSpeed(0.05));
  speedDownButton?.addEventListener('click', () => adjustBoostSpeed(-0.05));

  keyInput?.addEventListener('focus', showKeyToast);
  keyInput?.addEventListener('click', showKeyToast);
  keyInput?.addEventListener('blur', hideKeyToast);

  keyInput?.addEventListener('keydown', event => {
    event.preventDefault();
    event.stopPropagation();
    if (/^[a-z]$/i.test(event.key)) {
      saveBoostKey(event.key);
      hideKeyToast();
    } else if (event.key === 'Escape') {
      hideKeyToast();
      keyInput.blur();
    }
  });
}

/**
 * Set up all event listeners for the popup UI
 */
function setupEventListeners() {
  setupTemporaryBoostControls();

  // Speed preset button listeners
  document.querySelectorAll('.speed-button').forEach(button => {
    button.addEventListener('click', () => {
      const speed = parseFloat(button.dataset.speed);
      handleSpeedChange(speed);
    });
  });

  // Arrow button listeners for fine-tuning speed
  document.getElementById('speedUp').addEventListener('click', () => {
    const newSpeed = Math.round((currentSpeed + 0.05) * 100) / 100;
    handleSpeedChange(newSpeed);
  });

  document.getElementById('speedDown').addEventListener('click', () => {
    const newSpeed = Math.max(0.1, Math.round((currentSpeed - 0.05) * 100) / 100);
    handleSpeedChange(newSpeed);
  });

  // Custom speed input controls
  const customSpeedInput = document.getElementById('customSpeed');
  const setCustomSpeedBtn = document.getElementById('setCustomSpeed');
  
  if (setCustomSpeedBtn && customSpeedInput) {
    customSpeedInput.addEventListener('input', () => {
      updateSpeedInputDisplay(customSpeedInput);
    });

    // Handle Set button click
    setCustomSpeedBtn.addEventListener('click', () => {
      const speed = parseFloat(customSpeedInput.value);
      if (speed && speed > 0) {
        handleSpeedChange(speed);
      }
    });

    // Handle Enter key in custom speed input
    customSpeedInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const speed = parseFloat(customSpeedInput.value);
        if (speed && speed > 0) {
          handleSpeedChange(speed);
        }
      }
    });
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.temporaryBoostSpeed) {
    boostSpeed = normalizeBoostSpeed(changes.temporaryBoostSpeed.newValue);
  }
  if (changes.temporaryBoostKey) {
    boostKey = normalizeBoostKey(changes.temporaryBoostKey.newValue);
  }
  if (changes.temporaryBoostSpeed || changes.temporaryBoostKey) {
    updateTemporaryBoostUI();
  }
});

/**
 * Update the UI to reflect the current speed
 * @param {number} speed - The current playback speed
 */
function updateUI(speed) {
  // Update preset button highlights
  document.querySelectorAll('.speed-button').forEach(button => {
    const buttonSpeed = parseFloat(button.dataset.speed);
    button.classList.toggle('selected', buttonSpeed === speed);
  });

  // Update custom speed input
  const customSpeedInput = document.getElementById('customSpeed');
  if (customSpeedInput) {
    customSpeedInput.value = formatSpeed(speed);
    updateSpeedInputDisplay(customSpeedInput);
  }
}

/**
 * Handle speed changes, update storage and notify content script
 * @param {number} speed - The new playback speed to set
 */
async function handleSpeedChange(speed) {
  // Update UI immediately for responsiveness
  currentSpeed = speed;
  updateUI(speed);
  
  let contentScriptHandled = false;

  // Update video speed immediately
  try {
    const response = await sendSpeedToContentScript(speed);
    if (response && response.success) {
      contentScriptHandled = true;
    }
  } catch (error) {
    console.error('Error sending speed to content script:', error);
  }
  
  // If content script handled it, it will also handle the debounced storage save.
  // Otherwise, fallback to saving it here in the popup.
  if (!contentScriptHandled) {
    // Debounce storage save to prevent quota issues on rapid changes
    clearTimeout(storageDebounceTimer);
    storageDebounceTimer = setTimeout(async () => {
      try {
        const data = await chrome.storage.sync.get('domainSpeeds');
        const domainSpeeds = data.domainSpeeds || {};
        domainSpeeds[currentDomain] = speed;
        
        await chrome.storage.sync.set({ domainSpeeds });
      } catch (error) {
        console.error('Error saving speed to storage:', error);
      }
    }, 500);
  }
}

/**
 * Send speed change message to content script
 * @param {number} speed - The new playback speed to set
 */
async function sendSpeedToContentScript(speed) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    return chrome.tabs.sendMessage(tabs[0].id, { 
      action: 'setSpeed', 
      speed: speed 
    });
  }
}
