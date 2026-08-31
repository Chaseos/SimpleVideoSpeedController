// Self-contained so Safari's scripting API can also run this in permitted frames.
// A playlist request elsewhere on the page is deliberately not evidence here.
function safariPlaybackPolicy(operation, value) {
  function nativeHlsLimit(video) {
    if (!video || video.srcObject || video.readyState < 1 || !video.currentSrc) return null;
    const isHlsType = type => /^(?:application\/(?:vnd\.apple\.mpegurl|x-mpegurl)|audio\/(?:mpegurl|x-mpegurl))$/i
      .test(type.split(';')[0].trim());
    let source;
    try { source = new URL(video.currentSrc); } catch { return null; }

    // blob: may be MSE (including HLS through MSE) or another unknown source.
    if (source.protocol === 'data:') {
      return isHlsType(video.currentSrc.slice(5).split(',')[0]) ? 2 : null;
    }
    if (!['http:', 'https:'].includes(source.protocol)) return null;
    if (/\.m3u8$/i.test(source.pathname)) return 2;

    // Only use the type of the selected source, never an unused HLS alternative.
    for (const candidate of video.querySelectorAll('source')) {
      if (candidate.src === video.currentSrc && isHlsType(candidate.type)) return 2;
    }
    return null;
  }

  function findVideos(root) {
    const videos = Array.from(root.querySelectorAll('video'));
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) videos.push(...findVideos(element.shadowRoot));
    }
    return videos;
  }

  if (operation === 'limit') return nativeHlsLimit(value);
  const videos = findVideos(document);
  let nativeHlsCount = 0;
  let otherVideoCount = 0;
  for (const video of videos) {
    const limit = nativeHlsLimit(video);
    if (limit) nativeHlsCount++;
    else if (video.readyState >= 1) otherVideoCount++;
    if (operation === 'apply' && Number.isFinite(value) && value > 0) {
      const speed = Math.min(value, limit ?? Infinity);
      if (video.playbackRate !== speed) video.playbackRate = speed;
    }
  }
  if (operation === 'controlSpeed') {
    return nativeHlsCount > 0 && otherVideoCount === 0 ? Math.min(value, 2) : value;
  }
  return { nativeHlsCount, otherVideoCount };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = safariPlaybackPolicy;
} else {
  globalThis.SafariPlaybackPolicy = safariPlaybackPolicy;
}
