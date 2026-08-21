const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const localesRoot = path.join(projectRoot, '_locales');
const englishMessages = require('../_locales/en/messages.json');
const popupScript = fs.readFileSync(path.join(projectRoot, 'popup.js'), 'utf8');
const popupMarkup = fs.readFileSync(path.join(projectRoot, 'popup.html'), 'utf8');
const locales = fs.readdirSync(localesRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name !== 'en')
  .map(entry => entry.name)
  .sort();

test('review links allow each store to select the user locale', () => {
  assert.doesNotMatch(popupScript, /chromewebstore[^'\n]+\?hl=en/i);
  assert.doesNotMatch(popupScript, /addons\.mozilla\.org\/en-US\//i);
  assert.doesNotMatch(popupScript, /addons\.opera\.com\/en\//i);
});

test('popup localizes document metadata without an English-only title', () => {
  assert.match(popupScript, /getI18nMessage\('@@ui_locale'\)/);
  assert.match(popupScript, /getI18nMessage\('@@bidi_dir'\)/);
  assert.match(popupScript, /getI18nMessage\('appName'\)/);
  assert.doesNotMatch(popupScript, /Speed for/);
});

test('speed controls keep language-neutral plus and minus symbols', () => {
  assert.match(popupMarkup, /id="speedUp">\+<\/button>/);
  assert.match(popupMarkup, /id="speedDown">-<\/button>/);
  assert.match(popupMarkup, /id="boostSpeedUp"[^>]*>\+<\/button>/);
  assert.match(popupMarkup, /id="boostSpeedDown"[^>]*>−<\/button>/);
});

for (const locale of locales) {
  test(`${locale} locale contains every English message`, () => {
    const messagesPath = path.join(localesRoot, locale, 'messages.json');
    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

    assert.deepEqual(Object.keys(messages), Object.keys(englishMessages));
    for (const [name, entry] of Object.entries(messages)) {
      assert.equal(typeof entry.message, 'string', `${name} must have a message`);
      assert.notEqual(entry.message.trim(), '', `${name} must not be blank`);
      assert.equal(typeof entry.description, 'string', `${name} must have a description`);
      assert.notEqual(entry.description.trim(), '', `${name} description must not be blank`);

      const englishMarkup = englishMessages[name].message.match(/<\/?[a-z][^>]*>/gi) || [];
      const localizedMarkup = entry.message.match(/<\/?[a-z][^>]*>/gi) || [];
      assert.deepEqual(localizedMarkup, englishMarkup, `${name} must preserve HTML markup`);
    }
  });
}
