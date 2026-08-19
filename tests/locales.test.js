const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const localesRoot = path.join(projectRoot, '_locales');
const englishMessages = require('../_locales/en/messages.json');

for (const locale of ['it', 'pl', 'nl', 'ms']) {
  test(`${locale} locale contains every English message`, () => {
    const messagesPath = path.join(localesRoot, locale, 'messages.json');
    const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

    assert.deepEqual(Object.keys(messages), Object.keys(englishMessages));
    for (const [name, entry] of Object.entries(messages)) {
      assert.equal(typeof entry.message, 'string', `${name} must have a message`);
      assert.notEqual(entry.message.trim(), '', `${name} must not be blank`);
    }
  });
}
