/**
 * Listen for tab updates and inject content script
 * This ensures the content script is loaded after page navigation
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
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