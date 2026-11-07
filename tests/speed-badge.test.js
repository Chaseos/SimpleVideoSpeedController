const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const noopEvent = { addListener() {} };

function loadBackground(file = path.join(root, 'background.js'), hasBadgeApi = true) {
  const badgeCalls = [];
  const listeners = [];
  const context = vm.createContext({
    chrome: {
      action: hasBadgeApi ? {
        async setBadgeText(details) { badgeCalls.push(details); }
      } : undefined,
      runtime: { onMessage: { addListener: listener => listeners.push(listener) } },
      storage: { onChanged: noopEvent },
      tabs: { onActivated: noopEvent, onUpdated: noopEvent, onRemoved: noopEvent },
      windows: { onFocusChanged: noopEvent }
    }
  });
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return { badgeCalls, send: (request, sender) => listeners[0](request, sender, () => {}) };
}

test('the badge is empty at 1x and fits every other speed', () => {
  const { badgeCalls, send } = loadBackground();
  const labels = new Map([
    [1, ''],
    [0.1, '0.1x'],
    [0.25, '0.25'],
    [1.5, '1.5x'],
    [1.333, '1.33'],
    [2, '2x'],
    [12.55, '12.6'],
    [16, '16x']
  ]);

  for (const speed of labels.keys()) {
    send({ action: 'updateSpeedBadge', speed }, { tab: { id: 7 } });
  }

  assert.deepEqual(badgeCalls.map(call => call.text), [...labels.values()]);
  assert.ok(badgeCalls.every(call => call.tabId === 7));
});

test('every browser build updates the speed badge', () => {
  for (const target of ['chromium', 'edge', 'firefox', 'safari']) {
    const { badgeCalls, send } = loadBackground(path.join(distRoot, target, 'background.js'));
    send({ action: 'updateSpeedBadge', speed: 2 }, { tab: { id: 3 } });
    assert.deepEqual(badgeCalls.map(call => call.text), ['2x'], target);
  }
});

test('browsers without a badge API ignore speed updates', () => {
  const { send } = loadBackground(path.join(root, 'background.js'), false);
  assert.equal(send({ action: 'updateSpeedBadge', speed: 2 }, { tab: { id: 3 } }), false);
});
