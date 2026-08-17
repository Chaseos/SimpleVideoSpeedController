(function initializeShortcutSupport(globalScope) {
  function getPlatformDescription(navigatorLike = {}) {
    return [
      navigatorLike.userAgentData?.platform,
      navigatorLike.platform,
      navigatorLike.userAgent
    ].filter(Boolean).join(' ');
  }

  function getShortcutConfig(navigatorLike = {}) {
    const isMac = /mac/i.test(getPlatformDescription(navigatorLike));
    return isMac ? {
      isMac: true,
      requiredModifierPrefixes: ['Meta', 'Alt'],
      forbiddenModifierPrefixes: [],
      primaryLabel: '⌘',
      secondaryLabel: '⌥',
      resetCodes: ['Backspace', 'Delete']
    } : {
      isMac: false,
      requiredModifierPrefixes: ['Control', 'Shift'],
      forbiddenModifierPrefixes: ['Meta', 'Alt'],
      primaryLabel: 'Ctrl',
      secondaryLabel: 'Shift',
      resetCodes: ['Backspace']
    };
  }

  function hasAltGraph(event) {
    try {
      return event.getModifierState?.('AltGraph') === true;
    } catch {
      return false;
    }
  }

  function matchesOneShotModifiers(event, config) {
    if (config.isMac) {
      return event.metaKey === true && event.altKey === true;
    }

    return event.ctrlKey === true &&
      event.shiftKey === true &&
      event.metaKey !== true &&
      event.altKey !== true &&
      !hasAltGraph(event);
  }

  function isTrackedBoostCode(code, actionCode, config) {
    if (code === actionCode) return true;
    return [
      ...config.requiredModifierPrefixes,
      ...config.forbiddenModifierPrefixes
    ].some(prefix => code === `${prefix}Left` || code === `${prefix}Right`);
  }

  function hasCodePrefix(pressedCodes, prefix) {
    return [...pressedCodes].some(code => code.startsWith(prefix));
  }

  function isBoostChordPressed(pressedCodes, actionCode, config, altGraphActive = false) {
    if ((!config.isMac && altGraphActive) || !pressedCodes.has(actionCode)) return false;
    if (!config.requiredModifierPrefixes.every(prefix => hasCodePrefix(pressedCodes, prefix))) {
      return false;
    }
    return !config.forbiddenModifierPrefixes.some(prefix => hasCodePrefix(pressedCodes, prefix));
  }

  function areRatesEqual(a, b) {
    return Math.abs(a - b) < 0.0001;
  }

  function resolveSpeedShortcut(code, repeat, currentSpeed, preMaxSpeed, config) {
    const digitMatch = code.match(/^(?:Digit|Numpad)([0-9])$/);
    if (digitMatch) {
      if (repeat) return { nextSpeed: null, preMaxSpeed };

      const digit = Number.parseInt(digitMatch[1], 10);
      if (digit === 0) {
        return areRatesEqual(currentSpeed, 16)
          ? { nextSpeed: preMaxSpeed ?? 1, preMaxSpeed: null }
          : { nextSpeed: 16, preMaxSpeed: currentSpeed };
      }

      const baseSpeed = digit;
      return {
        nextSpeed: areRatesEqual(currentSpeed, baseSpeed)
          ? baseSpeed + 0.5
          : baseSpeed,
        preMaxSpeed
      };
    }

    if (['Equal', 'NumpadAdd', 'Plus'].includes(code)) {
      return {
        nextSpeed: Math.min(16, Math.round((currentSpeed + 0.05) * 100) / 100),
        preMaxSpeed
      };
    }
    if (['Minus', 'NumpadSubtract'].includes(code)) {
      return {
        nextSpeed: Math.max(0.1, Math.round((currentSpeed - 0.05) * 100) / 100),
        preMaxSpeed
      };
    }
    if (config.resetCodes.includes(code)) {
      return { nextSpeed: 1, preMaxSpeed };
    }
    return null;
  }

  function resolveOneShot(event, currentSpeed, preMaxSpeed, config) {
    if (!matchesOneShotModifiers(event, config)) return null;
    return resolveSpeedShortcut(event.code, event.repeat, currentSpeed, preMaxSpeed, config);
  }

  const api = {
    getShortcutConfig,
    hasAltGraph,
    matchesOneShotModifiers,
    isTrackedBoostCode,
    isBoostChordPressed,
    resolveSpeedShortcut,
    resolveOneShot
  };

  globalScope.VideoSpeedShortcuts = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(globalThis);
