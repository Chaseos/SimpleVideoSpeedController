const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function element(value = '') {
  const listeners = new Map();
  return {
    value,
    listeners,
    parentElement: { querySelector: () => null },
    classList: { add() {}, remove() {}, toggle() { return true; } },
    addEventListener(type, listener) { listeners.set(type, listener); },
    setAttribute() {},
    getBoundingClientRect() { return { top: 0 }; }
  };
}

function popupContext() {
  const elements = {
    boostSummary: element(),
    boostEditor: element(),
    boostSpeed: element('3'),
    boostKey: element('X'),
    boostSpeedUp: element(),
    boostSpeedDown: element(),
    boostKeyToast: element(),
    boostEditorKeyDisplay: element(),
    boostSummarySpeed: element(),
    boostSummaryKey: element(),
    speedUp: element(),
    speedDown: element(),
    customSpeed: element('1'),
    setCustomSpeed: element()
  };
  const storageWrites = [];
  const context = vm.createContext({
    chrome: {
      storage: {
        onChanged: { addListener() {} },
        sync: {
          async get() { return {}; },
          async set(value) { storageWrites.push(value); }
        }
      },
      tabs: {
        async query() { return [{ id: 1, url: 'https://example.com' }]; },
        async sendMessage() { return { success: true }; }
      }
    },
    document: {
      activeElement: null,
      documentElement: {},
      addEventListener() {},
      getElementById(id) { return elements[id] || null; },
      querySelectorAll() { return []; }
    },
    window: { innerHeight: 800 },
    VideoSpeedLocalization: {
      formatNumberForInput: String,
      formatPlaybackRate: speed => `${speed}x`
    },
    console,
    setTimeout,
    clearTimeout
  });

  vm.runInContext(fs.readFileSync(path.join(root, 'popup.js'), 'utf8'), context);
  vm.runInContext('setupEventListeners()', context);
  return { context, elements, storageWrites };
}

test('dismissing the custom speed keyboard applies the entered speed', () => {
  const { context, elements } = popupContext();
  elements.customSpeed.value = '2.25';

  elements.customSpeed.listeners.get('blur')();

  assert.equal(vm.runInContext('currentSpeed', context), 2.25);
  assert.equal(elements.customSpeed.value, '2.25');
});

test('dismissing the temporary boost keyboard commits and formats its entered speed', async () => {
  const { context, elements, storageWrites } = popupContext();
  elements.boostSpeed.value = '4.25';

  elements.boostSpeed.listeners.get('blur')();
  await Promise.resolve();

  assert.equal(vm.runInContext('boostSpeed', context), 4.25);
  assert.equal(elements.boostSpeed.value, '4.25');
  assert.equal(storageWrites.at(-1).temporaryBoostSpeed, 4.25);
});
