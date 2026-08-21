const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const localization = require('../localization.js');

test('formats editable numeric values with invariant decimal syntax', () => {
  assert.equal(localization.formatNumberForInput(1), '1');
  assert.equal(localization.formatNumberForInput(1.5), '1.5');
  assert.equal(localization.formatNumberForInput(1.05), '1.05');
});

test('formats displayed playback rates for the active locale', () => {
  assert.equal(localization.formatPlaybackRate(0.5, 'en_US'), '0.5x');
  assert.equal(localization.formatPlaybackRate(0.5, 'de_DE'), '0,5x');
  assert.equal(localization.formatPlaybackRate(0.5, 'ja_JP'), '0.5倍');
  assert.equal(localization.formatPlaybackRate(0.5, 'ko_KR'), '0.5배');
  assert.equal(localization.formatPlaybackRate(0.5, 'zh_CN'), '0.5倍');
});

test('loads localization support before popup and content consumers', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));
  const popup = fs.readFileSync(path.join(projectRoot, 'popup.html'), 'utf8');
  const scripts = manifest.content_scripts[0].js;

  assert.ok(scripts.indexOf('localization.js') < scripts.indexOf('content.js'));
  assert.ok(popup.indexOf('localization.js') < popup.indexOf('popup.js'));
});
