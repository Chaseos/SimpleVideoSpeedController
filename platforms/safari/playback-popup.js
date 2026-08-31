let safariPopupMaximum = Infinity;
let safariPlaybackInspectionPending = false;

function safariDisplayedSpeed(speed) {
  return Math.min(speed, safariPopupMaximum);
}

function updateSafariPlaybackLimits(results) {
  const counts = results.reduce((total, entry) => {
    total.nativeHlsCount += entry.result?.nativeHlsCount || 0;
    total.otherVideoCount += entry.result?.otherVideoCount || 0;
    return total;
  }, { nativeHlsCount: 0, otherVideoCount: 0 });

  // A tab-wide control must remain available when any loaded video is unknown
  // or unrestricted. Enforcement itself always happens per video.
  safariPopupMaximum = counts.nativeHlsCount > 0 && counts.otherVideoCount === 0 ? 2 : Infinity;
  document.querySelectorAll('.speed-button').forEach(button => {
    button.disabled = Number(button.dataset.speed) > safariPopupMaximum;
  });
  const customInput = document.getElementById('customSpeed');
  customInput.max = String(Number.isFinite(safariPopupMaximum) ? safariPopupMaximum : 16);
  document.getElementById('speedUp').disabled = currentSpeed >= safariPopupMaximum;
  const notice = document.getElementById('safariPlaybackNotice');
  notice.hidden = counts.nativeHlsCount === 0;
  notice.textContent = getI18nMessage('nativeHlsSpeedLimited');
  if (document.activeElement !== customInput) updateUI(currentSpeed);
}

async function refreshSafariPlaybackLimits() {
  if (safariPlaybackInspectionPending) return;
  safariPlaybackInspectionPending = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return updateSafariPlaybackLimits([]);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: SafariPlaybackPolicy,
      args: ['inspect']
    });
    updateSafariPlaybackLimits(results);
  } catch {
    // Missing frame permissions or an inaccessible tab is unknown, not HLS.
    updateSafariPlaybackLimits([]);
  } finally {
    safariPlaybackInspectionPending = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshSafariPlaybackLimits();
  setInterval(refreshSafariPlaybackLimits, 1000);
});
