const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const shortcuts = require('../shortcuts.js');

const macConfig = shortcuts.getShortcutConfig({ platform: 'MacIntel' });
const windowsConfig = shortcuts.getShortcutConfig({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
});

function keyboardEvent(code, modifiers = {}) {
  return {
    code,
    repeat: false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    altKey: false,
    getModifierState: name => name === 'AltGraph' && modifiers.altGraph === true,
    ...modifiers
  };
}

function permutations(values) {
  if (values.length === 1) return [values];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidateIndex) => candidateIndex !== index))
      .map(rest => [value, ...rest])
  );
}

test('selects Command + Option on macOS and Ctrl + Shift elsewhere', () => {
  assert.deepEqual(macConfig.requiredModifierPrefixes, ['Meta', 'Alt']);
  assert.equal(macConfig.primaryLabel, '⌘');
  assert.equal(macConfig.secondaryLabel, '⌥');

  assert.deepEqual(windowsConfig.requiredModifierPrefixes, ['Control', 'Shift']);
  assert.deepEqual(windowsConfig.forbiddenModifierPrefixes, ['Meta', 'Alt']);
  assert.equal(windowsConfig.primaryLabel, 'Ctrl');
  assert.equal(windowsConfig.secondaryLabel, 'Shift');

  const linuxConfig = shortcuts.getShortcutConfig({ platform: 'Linux x86_64' });
  assert.deepEqual(linuxConfig.requiredModifierPrefixes, ['Control', 'Shift']);
});

test('matches platform modifiers and rejects the former Windows chord and AltGr', () => {
  assert.equal(shortcuts.matchesOneShotModifiers(
    keyboardEvent('Digit1', { metaKey: true, altKey: true }),
    macConfig
  ), true);
  assert.equal(shortcuts.matchesOneShotModifiers(
    keyboardEvent('Digit1', { ctrlKey: true, shiftKey: true }),
    windowsConfig
  ), true);
  assert.equal(shortcuts.matchesOneShotModifiers(
    keyboardEvent('Digit1', { metaKey: true, altKey: true }),
    windowsConfig
  ), false);
  assert.equal(shortcuts.matchesOneShotModifiers(
    keyboardEvent('Digit1', { ctrlKey: true, shiftKey: true, altKey: true }),
    windowsConfig
  ), false);
  assert.equal(shortcuts.matchesOneShotModifiers(
    keyboardEvent('Digit1', { ctrlKey: true, shiftKey: true, altGraph: true }),
    windowsConfig
  ), false);
});

test('keeps one-shot shortcuts modifier-first', () => {
  const actionFirst = [
    keyboardEvent('Equal'),
    keyboardEvent('ControlLeft', { ctrlKey: true }),
    keyboardEvent('ShiftLeft', { ctrlKey: true, shiftKey: true })
  ];
  assert.equal(actionFirst.some(event =>
    shortcuts.resolveOneShot(event, 1, null, windowsConfig) !== null
  ), false);

  assert.deepEqual(
    shortcuts.resolveOneShot(
      keyboardEvent('Equal', { ctrlKey: true, shiftKey: true }),
      1,
      null,
      windowsConfig
    ),
    { nextSpeed: 1.05, preMaxSpeed: null }
  );
});

test('preserves tuning, reset, number cycling, repeat, and 16x behavior', () => {
  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Equal', false, 1, null, windowsConfig),
    { nextSpeed: 1.05, preMaxSpeed: null }
  );
  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Minus', false, 0.1, null, windowsConfig),
    { nextSpeed: 0.1, preMaxSpeed: null }
  );
  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Backspace', false, 3, null, windowsConfig),
    { nextSpeed: 1, preMaxSpeed: null }
  );
  assert.equal(
    shortcuts.resolveSpeedShortcut('Delete', false, 3, null, windowsConfig),
    null
  );
  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Delete', false, 3, null, macConfig),
    { nextSpeed: 1, preMaxSpeed: null }
  );

  assert.equal(shortcuts.resolveSpeedShortcut('Digit2', false, 1, null, windowsConfig).nextSpeed, 2);
  assert.equal(shortcuts.resolveSpeedShortcut('Digit2', false, 2, null, windowsConfig).nextSpeed, 2.5);
  assert.equal(shortcuts.resolveSpeedShortcut('Digit2', false, 2.5, null, windowsConfig).nextSpeed, 2);
  assert.equal(shortcuts.resolveSpeedShortcut('Digit2', true, 1, null, windowsConfig).nextSpeed, null);

  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Digit0', false, 1.25, null, windowsConfig),
    { nextSpeed: 16, preMaxSpeed: 1.25 }
  );
  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Digit0', false, 16, 1.25, windowsConfig),
    { nextSpeed: 1.25, preMaxSpeed: null }
  );
  assert.deepEqual(
    shortcuts.resolveSpeedShortcut('Digit0', false, 16, null, windowsConfig),
    { nextSpeed: 1, preMaxSpeed: null }
  );
});

test('Temporary Boost activates in every key order and ends after any required release', () => {
  const platformCases = [
    { config: windowsConfig, requiredCodes: ['ControlLeft', 'ShiftRight', 'KeyX'] },
    { config: macConfig, requiredCodes: ['MetaRight', 'AltLeft', 'KeyX'] }
  ];

  for (const { config, requiredCodes } of platformCases) {
    for (const order of permutations(requiredCodes)) {
      const pressed = new Set();
      for (const code of order) pressed.add(code);
      assert.equal(
        shortcuts.isBoostChordPressed(pressed, 'KeyX', config),
        true,
        `expected activation for ${order.join(', ')}`
      );

      for (const releasedCode of requiredCodes) {
        const afterRelease = new Set(pressed);
        afterRelease.delete(releasedCode);
        assert.equal(
          shortcuts.isBoostChordPressed(afterRelease, 'KeyX', config),
          false,
          `expected release of ${releasedCode} to end boost`
        );
      }
    }
  }
});

test('Temporary Boost rejects legacy, extra modifier, AltRight, AltGraph, and stale action keys', () => {
  assert.equal(shortcuts.isBoostChordPressed(
    new Set(['MetaLeft', 'AltLeft', 'KeyX']),
    'KeyX',
    windowsConfig
  ), false);
  assert.equal(shortcuts.isBoostChordPressed(
    new Set(['ControlLeft', 'ShiftLeft', 'MetaLeft', 'KeyX']),
    'KeyX',
    windowsConfig
  ), false);
  assert.equal(shortcuts.isBoostChordPressed(
    new Set(['ControlLeft', 'ShiftLeft', 'AltRight', 'KeyX']),
    'KeyX',
    windowsConfig
  ), false);
  assert.equal(shortcuts.isBoostChordPressed(
    new Set(['ControlLeft', 'ShiftLeft', 'KeyX']),
    'KeyX',
    windowsConfig,
    true
  ), false);
  assert.equal(shortcuts.isBoostChordPressed(
    new Set(['ControlLeft', 'ShiftLeft', 'KeyX']),
    'KeyY',
    windowsConfig
  ), false);
});

test('macOS Temporary Boost remains compatible with Option modifier reporting', () => {
  assert.equal(shortcuts.isBoostChordPressed(
    new Set(['MetaLeft', 'AltLeft', 'KeyX']),
    'KeyX',
    macConfig,
    true
  ), true);
});

function createContentHarness(platform = 'Win32', uiLocale = '') {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const storageListeners = [];
  let toastElement;
  const video = {
    playbackRate: 1,
    addEventListener() {}
  };
  const makeElement = () => ({
    id: '',
    textContent: '',
    style: {},
    appendChild() {}
  });
  const document = {
    hidden: false,
    documentElement: { lang: '' },
    head: { appendChild() {} },
    body: {
      appendChild(element) {
        if (element.id === 'speed-toast') toastElement = element;
      }
    },
    createElement: makeElement,
    querySelector: () => null,
    querySelectorAll: selector => selector === 'video' ? [video] : [],
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    }
  };
  const window = {
    location: { hostname: 'example.com' },
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    }
  };
  window.top = window;

  const context = vm.createContext({
    chrome: {
      i18n: {
        getMessage: name => name === '@@ui_locale' ? uiLocale : ''
      },
      runtime: {
        onMessage: { addListener() {} },
        sendMessage: () => Promise.resolve({ success: true })
      },
      storage: {
        onChanged: { addListener: listener => storageListeners.push(listener) },
        sync: {
          get: async () => ({
            domainSpeeds: { 'example.com': 1 },
            temporaryBoostSpeed: 3,
            temporaryBoostKey: 'X'
          }),
          set: async () => {}
        }
      }
    },
    console: { log() {}, error() {} },
    document,
    window,
    navigator: { platform },
    MutationObserver: class {
      observe() {}
    },
    setInterval: () => 0,
    setTimeout: () => 0,
    clearTimeout() {}
  });

  const projectRoot = path.resolve(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(projectRoot, 'localization.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, 'shortcuts.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, 'content.js'), 'utf8'), context);

  return {
    video,
    toast: toastElement,
    storageListeners,
    keydown: event => documentListeners.get('keydown')(event),
    keyup: event => documentListeners.get('keyup')(event),
    blur: () => windowListeners.get('blur')()
  };
}

function dispatchedEvent(code, modifiers = {}) {
  return {
    ...keyboardEvent(code, modifiers),
    preventDefault() {},
    stopPropagation() {}
  };
}

test('Temporary Boost restores speed after release and focus loss and follows preference changes', async () => {
  const harness = createContentHarness();
  await new Promise(resolve => setImmediate(resolve));

  harness.keydown(dispatchedEvent('ControlLeft', { ctrlKey: true }));
  harness.keydown(dispatchedEvent('ShiftLeft', { ctrlKey: true, shiftKey: true }));
  harness.keydown(dispatchedEvent('Digit2', { ctrlKey: true, shiftKey: true }));
  assert.equal(harness.video.playbackRate, 2);

  harness.keydown(dispatchedEvent('KeyX', { ctrlKey: true, shiftKey: true }));
  assert.equal(harness.video.playbackRate, 3);
  assert.equal(harness.toast.textContent, '3x');
  harness.keyup(dispatchedEvent('KeyX', { ctrlKey: true, shiftKey: true }));
  assert.equal(harness.video.playbackRate, 2);
  assert.equal(harness.toast.textContent, '2x');

  harness.keydown(dispatchedEvent('KeyX', { ctrlKey: true, shiftKey: true }));
  harness.storageListeners[0]({ temporaryBoostSpeed: { newValue: 4 } }, 'sync');
  assert.equal(harness.video.playbackRate, 4);
  harness.blur();
  assert.equal(harness.video.playbackRate, 2);

  harness.keydown(dispatchedEvent('ControlLeft', { ctrlKey: true }));
  harness.keydown(dispatchedEvent('ShiftLeft', { ctrlKey: true, shiftKey: true }));
  harness.keydown(dispatchedEvent('KeyX', { ctrlKey: true, shiftKey: true }));
  assert.equal(harness.video.playbackRate, 4);
  harness.storageListeners[0]({ temporaryBoostKey: { newValue: 'Y' } }, 'sync');
  assert.equal(harness.video.playbackRate, 2);
});

test('content toasts use the active UI locale for playback rates', async () => {
  const harness = createContentHarness('Win32', 'de_DE');
  await new Promise(resolve => setImmediate(resolve));

  harness.keydown(dispatchedEvent('ControlLeft', { ctrlKey: true }));
  harness.keydown(dispatchedEvent('ShiftLeft', { ctrlKey: true, shiftKey: true }));
  harness.keydown(dispatchedEvent('Equal', { ctrlKey: true, shiftKey: true }));

  assert.equal(harness.toast.textContent, '1,05x');
});

test('macOS content handling preserves Command + Option one-shots and order-independent boost', async () => {
  const harness = createContentHarness('MacIntel');
  await new Promise(resolve => setImmediate(resolve));

  harness.keydown(dispatchedEvent('Digit2', { metaKey: true, altKey: true }));
  assert.equal(harness.video.playbackRate, 2);

  harness.keydown(dispatchedEvent('Equal', {
    metaKey: true,
    altKey: true,
    shiftKey: true
  }));
  assert.equal(harness.video.playbackRate, 2.05);

  harness.keydown(dispatchedEvent('KeyX'));
  harness.keydown(dispatchedEvent('AltLeft', { altKey: true }));
  harness.keydown(dispatchedEvent('MetaRight', { metaKey: true, altKey: true }));
  assert.equal(harness.video.playbackRate, 3);
  harness.keyup(dispatchedEvent('AltLeft', { metaKey: true }));
  assert.equal(harness.video.playbackRate, 2.05);

  harness.keydown(dispatchedEvent('Delete', { metaKey: true, altKey: true }));
  assert.equal(harness.video.playbackRate, 1);
});

test('non-macOS content handling ignores the former Windows + Alt chord', async () => {
  const harness = createContentHarness('Win32');
  await new Promise(resolve => setImmediate(resolve));

  harness.keydown(dispatchedEvent('Digit4', { metaKey: true, altKey: true }));
  assert.equal(harness.video.playbackRate, 1);

  harness.keydown(dispatchedEvent('KeyX'));
  harness.keydown(dispatchedEvent('MetaLeft', { metaKey: true }));
  harness.keydown(dispatchedEvent('AltLeft', { metaKey: true, altKey: true }));
  assert.equal(harness.video.playbackRate, 1);
});
