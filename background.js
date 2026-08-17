// Coordinate transient boost sessions across every frame in a tab.
const activeBoostSessions = new Map();

async function sendToAllFrames(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Tabs without an active content script are expected (browser pages, closed tabs, etc.).
  }
}

async function endBoostForTab(tabId, sessionId) {
  const activeSessionId = activeBoostSessions.get(tabId);
  if (activeSessionId && sessionId && activeSessionId !== sessionId) return;

  activeBoostSessions.delete(tabId);
  await sendToAllFrames(tabId, {
    action: 'clearTemporaryBoost',
    sessionId: sessionId || activeSessionId
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId || !request.sessionId) return false;

  if (request.action === 'temporaryBoostStart') {
    activeBoostSessions.set(tabId, request.sessionId);
    sendToAllFrames(tabId, {
      action: 'applyTemporaryBoost',
      sessionId: request.sessionId,
      speed: request.speed
    }).then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'temporaryBoostEnd') {
    endBoostForTab(tabId, request.sessionId)
      .then(() => sendResponse({ success: true }));
    return true;
  }

  return false;
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  for (const [activeTabId, sessionId] of activeBoostSessions) {
    if (activeTabId !== tabId) endBoostForTab(activeTabId, sessionId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && activeBoostSessions.has(tabId)) {
    endBoostForTab(tabId, activeBoostSessions.get(tabId));
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  activeBoostSessions.delete(tabId);
});

chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) return;
  for (const [tabId, sessionId] of activeBoostSessions) {
    endBoostForTab(tabId, sessionId);
  }
});

/**
 * Increment speed change count for the review prompt
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.domainSpeeds) {
    chrome.storage.sync.get(['speedChangeCount'], (data) => {
      const count = (data.speedChangeCount || 0) + 1;
      chrome.storage.sync.set({ speedChangeCount: count });
    });
  }
});
