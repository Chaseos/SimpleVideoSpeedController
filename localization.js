(function initializeLocalizationSupport(globalScope) {
  const LOCALIZED_SPEED_UNITS = {
    ja: '倍',
    ko: '배',
    zh: '倍'
  };

  function normalizeLocale(locale) {
    return typeof locale === 'string' && locale.trim()
      ? locale.replace('_', '-')
      : 'en';
  }

  function formatNumberForInput(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function formatPlaybackRate(value, locale = 'en') {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';

    const normalizedLocale = normalizeLocale(locale);
    const language = normalizedLocale.split('-')[0].toLowerCase();
    let formattedNumber;
    try {
      formattedNumber = new Intl.NumberFormat(normalizedLocale, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
        useGrouping: false
      }).format(number);
    } catch {
      formattedNumber = formatNumberForInput(number);
    }

    return `${formattedNumber}${LOCALIZED_SPEED_UNITS[language] || 'x'}`;
  }

  const api = {
    formatNumberForInput,
    formatPlaybackRate,
    normalizeLocale
  };

  globalScope.VideoSpeedLocalization = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(globalThis);
