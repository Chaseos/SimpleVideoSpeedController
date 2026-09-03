const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const chromeRuntimeEntries = [
  '_locales',
  'background.js',
  'content.js',
  'icon.png',
  'kofi_symbol.svg',
  'localization.js',
  'manifest.json',
  'popup-polish.css',
  'popup.html',
  'popup.js',
  'shortcuts.js'
];
const safariRuntimeEntries = [
  '_locales',
  'background.js',
  'content.js',
  'icon-16.png',
  'icon-48.png',
  'icon-128.png',
  'icon.png',
  'localization.js',
  'manifest.json',
  'playback-policy.js',
  'popup-polish.css',
  'popup.html',
  'popup.js',
  'shortcuts.js',
  'support.html',
  'support.js'
];

function readManifest(target) {
  return JSON.parse(fs.readFileSync(path.join(distRoot, target, 'manifest.json'), 'utf8'));
}

function topLevelEntries(target) {
  return fs.readdirSync(path.join(distRoot, target)).sort();
}

function collectRelativeFiles(directory, relativeDirectory = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(directory, relativeDirectory), { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRelativeFiles(directory, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files.sort();
}

function readTextTree(directory) {
  let contents = '';
  for (const relativeFile of collectRelativeFiles(directory)) {
    if (/\.(?:css|html|js|json|md|svg|txt)$/i.test(relativeFile)) {
      contents += fs.readFileSync(path.join(directory, relativeFile), 'utf8');
    }
  }
  return contents;
}

test('build emits only the explicit runtime allowlist for each target', () => {
  assert.deepEqual(topLevelEntries('chromium'), chromeRuntimeEntries.slice().sort());
  assert.deepEqual(
    topLevelEntries('firefox'),
    [
      ...chromeRuntimeEntries,
      'firefox-android.css',
      'icon-16.png',
      'icon-48.png',
      'icon-128.png'
    ].sort()
  );
  assert.deepEqual(topLevelEntries('safari'), safariRuntimeEntries.slice().sort());
});

test('Chromium artifact preserves the original runtime and specializes its manifest', () => {
  const sourceFiles = chromeRuntimeEntries.flatMap(entry => {
    const sourcePath = path.join(projectRoot, entry);
    return fs.statSync(sourcePath).isDirectory()
      ? collectRelativeFiles(sourcePath).map(file => path.join(entry, file))
      : [entry];
  }).sort();
  const builtFiles = collectRelativeFiles(path.join(distRoot, 'chromium'));

  assert.deepEqual(builtFiles, sourceFiles);
  for (const relativeFile of sourceFiles.filter(file => file !== 'manifest.json')) {
    assert.deepEqual(
      fs.readFileSync(path.join(distRoot, 'chromium', relativeFile)),
      fs.readFileSync(path.join(projectRoot, relativeFile)),
      `Chromium build changed ${relativeFile}`
    );
  }
});

test('only Firefox and Safari receive target-specific manifest changes', () => {
  const chromium = readManifest('chromium');
  const firefox = readManifest('firefox');
  const safari = readManifest('safari');

  assert.equal(chromium.background.service_worker, 'background.js');
  assert.equal(chromium.background.scripts, undefined);
  assert.equal(chromium.browser_specific_settings, undefined);

  assert.equal(firefox.background.service_worker, undefined);
  assert.deepEqual(firefox.background.scripts, ['background.js']);
  assert.deepEqual(firefox.browser_specific_settings.gecko_android, {});
  assert.deepEqual(firefox.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
  assert.deepEqual(firefox.icons, {
    16: 'icon-16.png',
    48: 'icon-48.png',
    128: 'icon-128.png'
  });

  assert.equal(safari.background.service_worker, 'background.js');
  assert.equal(safari.background.scripts, undefined);
  assert.equal(safari.browser_specific_settings, undefined);
  assert.deepEqual(safari.host_permissions, ['<all_urls>']);
  assert.equal(safari.permissions.includes('scripting'), true);
  assert.deepEqual(safari.icons, {
    16: 'icon-16.png',
    48: 'icon-48.png',
    128: 'icon-128.png'
  });
});

test('Safari artifact contains only its user-initiated Apple app actions', () => {
  const safariText = readTextTree(path.join(distRoot, 'safari'));
  for (const forbidden of [
    'ko-fi.com',
    'chromewebstore.google.com',
    'microsoftedge.microsoft.com/addons',
    'addons.mozilla.org/firefox/addon',
    'addons.opera.com/extensions',
    'store.whale.naver.com',
    'reviewPrompt',
    'supportMyWork',
    'pinSuggestion'
  ]) {
    assert.equal(safariText.includes(forbidden), false, `Safari contains ${forbidden}`);
  }

  const englishMessages = JSON.parse(
    fs.readFileSync(path.join(distRoot, 'safari', '_locales', 'en', 'messages.json'), 'utf8')
  );
  assert.equal(englishMessages.reviewPromptText, undefined);
  assert.equal(englishMessages.supportMyWork, undefined);
  assert.equal(englishMessages.supportMyWorkCta, undefined);
  assert.equal(englishMessages.pinSuggestionText, undefined);
  assert.equal(englishMessages.gotItBtn, undefined);
  assert.equal(englishMessages.rateThisApp.message, 'Rate this app');
  assert.equal(englishMessages.supportOptions.message, 'Support options');
  assert.equal(fs.existsSync(path.join(distRoot, 'safari', 'kofi_symbol.svg')), false);

  const popup = fs.readFileSync(path.join(distRoot, 'safari', 'popup.html'), 'utf8');
  const appStoreID = fs.readFileSync(
    path.join(
      projectRoot,
      'apple',
      'Simple Video Speed Controller',
      'Configurations',
      'AppStoreID.txt'
    ),
    'utf8'
  ).trim();
  assert.match(popup, /class="safari-action-link safari-rate-link"/);
  assert.ok(popup.includes(`https://apps.apple.com/app/id${appStoreID}?action=write-review`));
  assert.match(popup, /aria-label="Rate this app"/);
  assert.match(popup, /data-i18n-aria-label="rateThisApp"/);
  assert.match(popup, /class="safari-action-link safari-support-link"/);
  assert.match(popup, /simplevideospeedcontroller:\/\/support/);
  assert.match(popup, /aria-label="Support options"/);
  assert.match(popup, /data-i18n-aria-label="supportOptions"/);
  assert.doesNotMatch(popup, /Support my work/);

  for (const locale of fs.readdirSync(path.join(distRoot, 'safari', '_locales'))) {
    const messages = JSON.parse(fs.readFileSync(
      path.join(distRoot, 'safari', '_locales', locale, 'messages.json'),
      'utf8'
    ));
    assert.ok(messages.rateThisApp?.message, `${locale} is missing rateThisApp`);
    assert.ok(messages.supportOptions?.message, `${locale} is missing supportOptions`);
    assert.ok(
      typeof messages.appName?.message === 'string' &&
        Array.from(messages.appName.message).length <= 40,
      `${locale} Safari appName exceeds Apple's 40-character limit`
    );
  }
});

test('Firefox retains browser support and review behavior with Android-only safeguards', () => {
  const firefoxText = readTextTree(path.join(distRoot, 'firefox'));
  assert.match(firefoxText, /https:\/\/ko-fi\.com\/chaseos/);
  assert.match(firefoxText, /reviewPrompt/);
  assert.match(
    fs.readFileSync(path.join(distRoot, 'firefox', 'background.js'), 'utf8'),
    /if \(chrome\.windows\?\.onFocusChanged\)/
  );

  const popup = fs.readFileSync(path.join(distRoot, 'firefox', 'popup.html'), 'utf8');
  const popupScript = fs.readFileSync(path.join(distRoot, 'firefox', 'popup.js'), 'utf8');
  const englishMessages = JSON.parse(
    fs.readFileSync(path.join(distRoot, 'firefox', '_locales', 'en', 'messages.json'), 'utf8')
  );
  assert.match(popup, /name="viewport"/);
  assert.match(popup, /firefox-android\.css/);
  assert.doesNotMatch(popupScript, /\.innerHTML\s*=/);
  assert.equal(englishMessages.keyboardShortcutsTitle.message, 'Keyboard shortcuts');
  assert.match(popupScript, /async function isFirefoxAndroid\(\)/);
  assert.match(popupScript, /chrome\.runtime\.getPlatformInfo/);
  assert.match(popupScript, /platformInfo\?\.os === 'android'/);
  assert.match(popupScript, /return platformInfo\?\.os === 'android';/);
  assert.match(popupScript, /navigator\.maxTouchPoints > 0/);
  assert.match(popupScript, /\(hover: none\) and \(pointer: coarse\)/);
  assert.match(popupScript, /const firefoxAndroid = await isFirefoxAndroid\(\)/);
  assert.match(popupScript, /if \(!firefoxAndroid\) await checkFirstOpen\(\)/);
  assert.match(popupScript, /getI18nMessage\('keyboardShortcutsTitle'\)/);
  assert.match(popupScript, /shortcutsToggle'\)\?\.classList\.remove\('open'\)/);
  assert.match(popupScript, /await checkReviewPrompt\(\)/);
});

test('Safari and Firefox share every mobile keyboard shortcuts translation', () => {
  for (const locale of fs.readdirSync(path.join(distRoot, 'safari', '_locales'))) {
    const messages = target => JSON.parse(fs.readFileSync(
      path.join(distRoot, target, '_locales', locale, 'messages.json'),
      'utf8'
    ));
    const safari = messages('safari');
    assert.ok(safari.keyboardShortcutsTitle?.message, `${locale} is missing its mobile title`);
    assert.deepEqual(safari.keyboardShortcutsTitle, messages('firefox').keyboardShortcutsTitle);
    assert.deepEqual(safari.shortcutsTitle, messages('chromium').shortcutsTitle);
  }
});

test('Safari localizes the keyboard shortcuts label only on iOS', () => {
  const popupScript = fs.readFileSync(path.join(distRoot, 'safari', 'popup.js'), 'utf8');
  for (const locale of ['en', 'de', 'ar']) {
    const messages = JSON.parse(fs.readFileSync(
      path.join(distRoot, 'safari', '_locales', locale, 'messages.json'),
      'utf8'
    ));
    for (const ios of [true, false]) {
      const label = {
        tagName: 'SPAN',
        textContent: 'Shortcuts',
        attributes: { 'data-i18n': 'shortcutsTitle' },
        getAttribute(name) { return this.attributes[name]; },
        setAttribute(name, value) { this.attributes[name] = value; }
      };
      const context = vm.createContext({
        CSS: { supports: (property, value) => {
          assert.equal(property, '-webkit-touch-callout');
          assert.equal(value, 'none');
          return ios;
        } },
        chrome: {
          i18n: { getMessage: key => messages[key]?.message || '' },
          storage: { onChanged: { addListener() {} } }
        },
        document: {
          documentElement: {},
          addEventListener() {},
          querySelector: selector => {
            assert.equal(selector, '#shortcutsToggle [data-i18n]');
            return label;
          },
          querySelectorAll: selector => selector === '[data-i18n]' ? [label] : []
        },
        window: { addEventListener() {} }
      });
      vm.runInContext(popupScript, context);
      vm.runInContext('localizeHtmlPage(); localizeHtmlPage();', context);
      assert.equal(
        label.textContent,
        messages[ios ? 'keyboardShortcutsTitle' : 'shortcutsTitle'].message,
        `${locale} ${ios ? 'iOS' : 'macOS'} label`
      );
    }
  }
});

test('Safari routes iPad support through a bundled page while keeping iPhone and Mac app links', () => {
  const popupScript = fs.readFileSync(path.join(distRoot, 'safari', 'popup.js'), 'utf8');
  const appURL = 'simplevideospeedcontroller://support';
  const pageURL = 'safari-web-extension://example/support.html';
  for (const [userAgent, platform, maxTouchPoints, isIPad] of [
    ['Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X)', 'iPad', 5, true],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5, true],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)', 'iPhone', 5, false],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 0, false]
  ]) {
    const link = { href: appURL };
    const context = vm.createContext({
      navigator: { userAgent, platform, maxTouchPoints },
      chrome: {
        storage: { onChanged: { addListener() {} } },
        runtime: { getURL(file) { assert.equal(file, 'support.html'); return pageURL; } }
      },
      document: {
        addEventListener() {},
        querySelector(selector) { assert.equal(selector, '.safari-support-link'); return link; }
      },
      window: { addEventListener() {} }
    });
    vm.runInContext(popupScript, context);
    vm.runInContext('setupSafariSupportHandoff()', context);
    assert.equal(link.href, isIPad ? pageURL : appURL);
  }
  const page = fs.readFileSync(path.join(distRoot, 'safari', 'support.html'), 'utf8');
  assert.ok(page.includes(`href="${appURL}"`));
  assert.doesNotMatch(page, /target=|http-equiv="refresh"|__APPLE_SUPPORT_URL__/);
  assert.match(page, /src="support\.js"/);
  const project = fs.readFileSync(path.join(projectRoot, 'apple/Simple Video Speed Controller/Simple Video Speed Controller.xcodeproj/project.pbxproj'), 'utf8');
  for (const file of ['support.html', 'support.js']) {
    assert.equal(project.split(`${file} in Resources`).length - 1, 4);
  }
  for (const locale of fs.readdirSync(path.join(distRoot, 'safari', '_locales'))) {
    const messages = JSON.parse(fs.readFileSync(path.join(distRoot, 'safari', '_locales', locale, 'messages.json'), 'utf8'));
    assert.ok(messages.openVideoSpeed?.message, `${locale} needs the app-opening label`);
  }
});

test('Safari adapts iOS sheets while preserving fixed macOS popover sizing', () => {
  const popup = fs.readFileSync(path.join(distRoot, 'safari', 'popup.html'), 'utf8');
  const safariStyles = fs.readFileSync(path.join(distRoot, 'safari', 'popup-polish.css'), 'utf8');
  const safariTargetStyles = fs.readFileSync(
    path.join(projectRoot, 'platforms', 'safari', 'popup.css'),
    'utf8'
  );

  assert.match(popup, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.match(popup, /<body tabindex="-1">/);
  assert.match(safariStyles, /min-width: 282px/);
  assert.match(safariTargetStyles, /html,\s*body\s*{[\s\S]*width: 282px/);
  assert.match(safariTargetStyles, /body\s*{[\s\S]*box-sizing: border-box/);
  const iosStyles = safariTargetStyles.match(
    /@supports \(-webkit-touch-callout: none\) \{([\s\S]*?)\n\}/
  )?.[1];
  assert.ok(iosStyles, 'Safari is missing its iOS-only sizing override');
  assert.match(iosStyles, /html,\s*body\s*\{\s*max-width: none;\s*min-width: 282px;\s*width: 100%;\s*\}/);
  assert.match(iosStyles, /html\s*\{\s*overflow-y: auto;/);
  assert.doesNotMatch(iosStyles, /max-height:/,
    'iPad popover height must be sized from content, not its initial viewport');
  for (const edge of ['right', 'bottom', 'left']) {
    assert.ok(iosStyles.includes(`env(safe-area-inset-${edge})`));
  }
  assert.ok(safariStyles.endsWith(safariTargetStyles));
  assert.match(safariTargetStyles, /\.safari-action-link\s*{[\s\S]*height: 24px/);
  assert.match(safariTargetStyles, /\.safari-action-link\s*{[\s\S]*width: 24px/);
  assert.match(safariTargetStyles, /background-image: none/);
  assert.doesNotMatch(safariTargetStyles, /box-sizing: content-box/);
  assert.doesNotMatch(
    fs.readFileSync(path.join(projectRoot, 'popup-polish.css'), 'utf8'),
    /max-width: 100vw/
  );
});

test('every browser uses the shared solid blue and green controls', () => {
  for (const target of ['chromium', 'firefox', 'safari']) {
    const styles = fs.readFileSync(
      path.join(distRoot, target, 'popup-polish.css'),
      'utf8'
    );

    assert.match(styles, /\.speed-button\s*{[\s\S]*?background: #3a67b6/);
    assert.match(styles, /#setCustomSpeed,[\s\S]*?background: #267a3e/);
    assert.match(styles, /\.arrow-button\s*{[\s\S]*?background: #267a3e/);
    assert.match(styles, /\.arrow-button:hover\s*{[\s\S]*?background: #2b8645/);
  }
});

test('every browser presents the selected boost key as a full-size editable field', () => {
  for (const target of ['chromium', 'firefox', 'safari']) {
    const popup = fs.readFileSync(path.join(distRoot, target, 'popup.html'), 'utf8');
    const styles = fs.readFileSync(
      path.join(distRoot, target, 'popup-polish.css'),
      'utf8'
    );

    assert.match(popup, /class="action-key" id="boostSummaryKey"/);
    assert.match(popup, /class="boost-field boost-key-field" for="boostKey"/);
    assert.match(popup, /class="action-key" id="boostEditorKeyDisplay">X<\/kbd>/);
    assert.match(styles, /#customSpeed,\s*\.boost-input\s*{[\s\S]*?background: var\(--surface-input\)/);
    assert.match(styles, /#boostKey\s*{[\s\S]*?height: 44px/);
    assert.match(styles, /#boostKey\s*{[\s\S]*?width: 100%/);
    assert.match(styles, /\.boost-key-display\s*{[\s\S]*?place-items: center/);
    assert.match(styles, /\.boost-key-display kbd\s*{[\s\S]*?min-width: 32px/);
  }
});

test('custom and boost speed inputs show an idle speed unit', () => {
  for (const target of ['chromium', 'firefox', 'safari']) {
    const popup = fs.readFileSync(path.join(distRoot, target, 'popup.html'), 'utf8');
    const popupScript = fs.readFileSync(path.join(distRoot, target, 'popup.js'), 'utf8');
    const styles = fs.readFileSync(
      path.join(distRoot, target, 'popup-polish.css'),
      'utf8'
    );

    assert.equal((popup.match(/class="speed-input-display"/g) || []).length, 2);
    assert.match(popup, /class="speed-input-field" for="customSpeed"/);
    assert.doesNotMatch(popup, /id="customSpeed"[^>]*placeholder=/);
    assert.match(popup, /class="boost-field speed-input-field" for="boostSpeed"/);
    assert.match(popupScript, /function updateSpeedInputDisplay\(input\)/);
    assert.match(popupScript, /const rawValue = input\.value\.trim\(\)/);
    assert.match(popupScript, /if \(!rawValue\)/);
    assert.match(popupScript, /Number\.isFinite\(speed\) && speed > 0/);
    assert.match(styles, /\.speed-input-field \.speed-input-display\s*{[\s\S]*?place-items: center/);
    assert.match(styles, /\.speed-input-field \.speed-input-display\s*{[\s\S]*?white-space: nowrap/);
    assert.match(styles, /\.speed-input-field:focus-within \.speed-input-display\s*{[\s\S]*?opacity: 0/);
    assert.match(styles, /\.speed-input-field:not\(:focus-within\) > #customSpeed,[\s\S]*?color: transparent/);
    assert.match(styles, /\.speed-input-field:not\(:focus-within\) > #customSpeed,[\s\S]*?-webkit-text-fill-color: transparent/);
  }
});

test('opening Temporary Boost does not focus or select its speed input', () => {
  for (const target of ['chromium', 'firefox', 'safari']) {
    const popupScript = fs.readFileSync(path.join(distRoot, target, 'popup.js'), 'utf8');
    const summaryHandler = popupScript.match(
      /summary\?\.addEventListener\('click',[\s\S]*?\n  \}\);/
    )?.[0];

    assert.ok(summaryHandler, `${target} is missing the Temporary Boost toggle handler`);
    assert.doesNotMatch(summaryHandler, /speedInput\?\.focus\(\)/);
    assert.doesNotMatch(summaryHandler, /speedInput\?\.select\(\)/);
  }
});

test('every browser uses a solid selected orange with a lighter inner outline', () => {
  for (const target of ['chromium', 'firefox', 'safari']) {
    const styles = fs.readFileSync(
      path.join(distRoot, target, 'popup-polish.css'),
      'utf8'
    );
    const selectedRule = styles.match(/\.speed-button\.selected\s*{([\s\S]*?)}/)?.[1];

    assert.ok(selectedRule, `${target} is missing the selected speed style`);
    assert.match(selectedRule, /background:\s*#e87500/);
    assert.match(selectedRule, /inset 0 0 0 1px #ffb66d/);
    assert.doesNotMatch(selectedRule, /gradient/);
  }
});

test('Safari can recover when its content-script message is not delivered', () => {
  const safariPopupScript = fs.readFileSync(
    path.join(distRoot, 'safari', 'popup.js'),
    'utf8'
  );
  const safariContentScript = fs.readFileSync(
    path.join(distRoot, 'safari', 'content.js'),
    'utf8'
  );

  assert.match(safariPopupScript, /chrome\.scripting\.executeScript/);
  assert.match(safariPopupScript, /clearSafariInitialInputFocus/);
  assert.match(safariPopupScript, /files: \['playback-policy\.js', 'localization\.js', 'shortcuts\.js', 'content\.js'\]/);
  assert.match(safariContentScript, /__svscSafariContentInitialized/);
  assert.doesNotMatch(
    fs.readFileSync(path.join(projectRoot, 'popup.js'), 'utf8'),
    /chrome\.scripting\.executeScript/
  );
});

test('every ZIP matches its unpacked target and excludes development files', () => {
  for (const target of ['chromium', 'firefox', 'safari']) {
    const archive = path.join(distRoot, `simple-video-speed-controller-${target}.zip`);
    const archiveEntries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
    assert.match(archiveEntries, /^manifest\.json$/m);
    assert.match(archiveEntries, /^popup\.html$/m);
    assert.doesNotMatch(archiveEntries, /README|PRIVACYPOLICY|package\.json|tests\//);
  }
});
