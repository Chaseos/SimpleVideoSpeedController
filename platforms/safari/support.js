// Keep app launch as a real link tap in a normal tab, without an automatic redirect.
document.documentElement.lang = chrome.i18n.getUILanguage().replace('_', '-');
document.documentElement.dir = chrome.i18n.getMessage('@@bidi_dir') || 'ltr';
document.title = `${chrome.i18n.getMessage('supportOptions') || 'Support options'} — Simple Video Speed Controller`;
document.querySelectorAll('[data-i18n]').forEach(element => {
  const message = chrome.i18n.getMessage(element.dataset.i18n);
  if (message) element.textContent = message;
});
