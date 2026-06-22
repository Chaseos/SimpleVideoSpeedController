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
