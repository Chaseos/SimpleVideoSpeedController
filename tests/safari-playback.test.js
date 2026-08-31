const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const policy = require('../platforms/safari/playback-policy.js');
const root = path.resolve(__dirname, '..');

function video(currentSrc, extra = {}) {
  return { currentSrc, readyState: 4, playbackRate: 1, querySelectorAll: () => [], ...extra };
}

function tree(videos, children = []) {
  return { querySelectorAll: selector => selector === 'video' ? videos : children };
}

test('native HLS requires evidence from the loaded source, not browser support or page requests', () => {
  for (const source of [
    'https://cdn.example/playlist.m3u8?signature=example#fragment',
    'https://cdn.example/playlist.M3U8',
    'data:application/vnd.apple.mpegurl;base64,I0VYVE0zVQ==',
    'data:application/x-mpegurl,%23EXTM3U'
  ]) assert.equal(policy('limit', video(source)), 2, source);

  for (const source of [
    'blob:https://disney.example/media', 'https://cdn.example/movie.mp4',
    'https://cdn.example/opaque', 'https://cdn.example/video?manifest=playlist.m3u8',
    'data:video/mp4;base64,example', '', 'malformed'
  ]) {
    assert.equal(policy('limit', video(source, {
      canPlayType: () => 'probably',
      querySelectorAll: () => [{ src: 'https://cdn.example/unused.m3u8', type: 'application/vnd.apple.mpegurl' }]
    })), null, source);
  }
  assert.equal(policy('limit', video('https://cdn.example/a.m3u8', { readyState: 0 })), null);
  assert.equal(policy('limit', video('https://cdn.example/a.m3u8', { srcObject: {} })), null);
  assert.equal(policy('limit', video('https://cdn.example/opaque', {
    querySelectorAll: () => [{ src: 'https://cdn.example/opaque', type: 'application/vnd.apple.mpegurl; codecs="avc1"' }]
  })), 2);
});

test('serialized Safari scripting fallback caps only native HLS, including inside shadow roots', () => {
  const native = video('https://cdn.example/playlist.m3u8');
  const mse = video('blob:https://example.com/media');
  const unknown = video('https://cdn.example/opaque');
  const context = vm.createContext({ URL, document: tree([mse, unknown], [{ shadowRoot: tree([native]) }]) });
  vm.runInContext(`this.runPolicy = ${policy.toString()}`, context);
  assert.equal(JSON.stringify(context.runPolicy('inspect')), JSON.stringify({ nativeHlsCount: 1, otherVideoCount: 2 }));
  context.runPolicy('apply', 3);
  assert.deepEqual([native.playbackRate, mse.playbackRate, unknown.playbackRate], [2, 3, 3]);
  context.runPolicy('apply', 1.5);
  assert.deepEqual([native.playbackRate, mse.playbackRate, unknown.playbackRate], [1.5, 1.5, 1.5]);
});

test('Safari popup restricts native-only tabs, leaves mixed and unknown tabs available, and clears stale limits', async () => {
  const buttons = [1, 2, 3, 16].map(speed => ({ dataset: { speed }, classList: { toggle() {} } }));
  const elements = {
    customSpeed: { value: '', parentElement: null }, speedUp: {}, safariPlaybackNotice: {}
  };
  const context = vm.createContext({
    document: {
      addEventListener() {}, querySelectorAll: () => buttons,
      getElementById: id => elements[id]
    },
    window: { addEventListener() {} },
    chrome: {
      storage: { onChanged: { addListener() {} } },
      i18n: { getMessage: () => 'Native HLS limited to 2×' },
      tabs: { query: async () => [{ id: 1 }], sendMessage: async () => ({ success: true }) },
      scripting: { executeScript: async () => { throw new Error('No permission'); } }
    },
    SafariPlaybackPolicy: policy,
    VideoSpeedLocalization: { formatNumberForInput: String },
    console, setInterval() {}, setTimeout() {}, clearTimeout() {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'dist/safari/popup.js'), 'utf8'), context);
  vm.runInContext('currentSpeed = 3', context);
  context.updateSafariPlaybackLimits([{ result: { nativeHlsCount: 1, otherVideoCount: 0 } }]);
  assert.equal(elements.customSpeed.value, '2');
  assert.equal(elements.customSpeed.max, '2');
  assert.equal(elements.speedUp.disabled, true);
  assert.deepEqual(buttons.map(button => button.disabled), [false, false, true, true]);
  assert.equal(elements.safariPlaybackNotice.hidden, false);
  await context.handleSpeedChange(16);
  assert.equal(elements.customSpeed.value, '2');
  assert.equal(vm.runInContext('boostSpeed', context), 3, 'global boost preference is untouched');
  context.updateSafariPlaybackLimits([
    { result: { nativeHlsCount: 1, otherVideoCount: 0 } },
    { result: { nativeHlsCount: 0, otherVideoCount: 1 } }
  ]);
  assert.equal(elements.customSpeed.max, '16');
  assert.equal(buttons[3].disabled, false);
  assert.equal(elements.safariPlaybackNotice.hidden, false);
  context.updateSafariPlaybackLimits([{ result: { nativeHlsCount: 1, otherVideoCount: 0 } }]);
  await context.refreshSafariPlaybackLimits();
  assert.equal(elements.customSpeed.max, '16');
  assert.equal(elements.safariPlaybackNotice.hidden, true);
});

test('Safari packages and both Apple extension targets include the detection helper', () => {
  const safari = path.join(root, 'dist/safari');
  const manifest = JSON.parse(fs.readFileSync(path.join(safari, 'manifest.json')));
  assert.equal(manifest.content_scripts[0].js[0], 'playback-policy.js');
  const popup = fs.readFileSync(path.join(safari, 'popup.html'), 'utf8');
  assert.match(popup, /<script src="playback-policy.js"><\/script>/);
  assert.ok(popup.indexOf('src="playback-policy.js"') < popup.indexOf('src="popup.js"'));
  const project = fs.readFileSync(path.join(root, 'apple/Simple Video Speed Controller/Simple Video Speed Controller.xcodeproj/project.pbxproj'), 'utf8');
  for (const phase of project.matchAll(/isa = PBXResourcesBuildPhase;[\s\S]*?files = \(([\s\S]*?)\);/g)) {
    if (phase[1].includes('content.js in Resources')) assert.match(phase[1], /playback-policy.js in Resources/);
  }
  for (const locale of fs.readdirSync(path.join(safari, '_locales'))) {
    const messages = JSON.parse(fs.readFileSync(path.join(safari, '_locales', locale, 'messages.json')));
    assert.ok(messages.nativeHlsSpeedLimited.message, locale);
  }
});
