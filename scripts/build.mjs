import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(projectRoot, 'dist');
const appleAppStoreID = (
  await readFile(
    path.join(
      projectRoot,
      'apple',
      'Simple Video Speed Controller',
      'Configurations',
      'AppStoreID.txt'
    ),
    'utf8'
  )
).trim();
const appleReviewURL = `https://apps.apple.com/app/id${appleAppStoreID}?action=write-review`;
const appleSupportURL = 'simplevideospeedcontroller://support';

const chromeRuntimeFiles = [
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

const safariRuntimeFiles = [
  '_locales',
  'background.js',
  'content.js',
  'icon-16.png',
  'icon-48.png',
  'icon-128.png',
  'icon.png',
  'localization.js',
  'manifest.json',
  'popup-polish.css',
  'popup.html',
  'popup.js',
  'shortcuts.js'
];

const safariForbiddenContent = [
  'ko-fi.com',
  'chromewebstore.google.com',
  'microsoftedge.microsoft.com/addons',
  'addons.mozilla.org/firefox/addon',
  'addons.opera.com/extensions',
  'store.whale.naver.com',
  'reviewPrompt',
  'supportMyWork',
  'pinSuggestion'
];

const safariLocaleKeys = new Set([
  'reviewPromptText',
  'supportMyWork',
  'supportMyWorkCta',
  'pinSuggestionText',
  'gotItBtn'
]);

const mobileShortcutTitles = {
  ar: 'اختصارات لوحة المفاتيح',
  de: 'Tastenkürzel',
  en: 'Keyboard shortcuts',
  es: 'Atajos de teclado',
  es_419: 'Atajos de teclado',
  fr: 'Raccourcis clavier',
  hi: 'कीबोर्ड शॉर्टकट',
  id: 'Pintasan keyboard',
  it: 'Scorciatoie da tastiera',
  ja: 'キーボードショートカット',
  ko: '키보드 단축키',
  ms: 'Pintasan papan kekunci',
  nl: 'Sneltoetsen',
  pl: 'Skróty klawiaturowe',
  pt_BR: 'Atalhos de teclado',
  pt_PT: 'Atalhos de teclado',
  th: 'แป้นพิมพ์ลัด',
  tr: 'Klavye kısayolları',
  uk: 'Клавіатурні скорочення',
  vi: 'Phím tắt',
  zh_CN: '键盘快捷键',
  zh_TW: '鍵盤快速鍵'
};

const safariActionTitles = {
  ar: { rate: 'قيّم هذا التطبيق', support: 'خيارات الدعم' },
  de: { rate: 'Diese App bewerten', support: 'Support-Optionen' },
  en: { rate: 'Rate this app', support: 'Support options' },
  es: { rate: 'Calificar esta app', support: 'Opciones de apoyo' },
  es_419: { rate: 'Califica esta app', support: 'Opciones de apoyo' },
  fr: { rate: 'Noter cette app', support: 'Options de soutien' },
  hi: { rate: 'इस ऐप को रेट करें', support: 'सहायता के विकल्प' },
  id: { rate: 'Beri nilai aplikasi ini', support: 'Opsi dukungan' },
  it: { rate: 'Valuta questa app', support: 'Opzioni di supporto' },
  ja: { rate: 'このアプリを評価', support: 'サポートのオプション' },
  ko: { rate: '이 앱 평가하기', support: '후원 옵션' },
  ms: { rate: 'Nilaikan aplikasi ini', support: 'Pilihan sokongan' },
  nl: { rate: 'Beoordeel deze app', support: 'Ondersteuningsopties' },
  pl: { rate: 'Oceń tę aplikację', support: 'Opcje wsparcia' },
  pt_BR: { rate: 'Avaliar este app', support: 'Opções de apoio' },
  pt_PT: { rate: 'Avaliar esta app', support: 'Opções de apoio' },
  th: { rate: 'ให้คะแนนแอปนี้', support: 'ตัวเลือกการสนับสนุน' },
  tr: { rate: 'Bu uygulamayı değerlendir', support: 'Destek seçenekleri' },
  uk: { rate: 'Оцінити цей застосунок', support: 'Варіанти підтримки' },
  vi: { rate: 'Đánh giá ứng dụng này', support: 'Tùy chọn hỗ trợ' },
  zh_CN: { rate: '为此 App 评分', support: '支持选项' },
  zh_TW: { rate: '為此 App 評分', support: '支持選項' }
};

const safariAppNames = {
  es: 'Control sencillo de velocidad de vídeo',
  es_419: 'Control sencillo de velocidad de video',
  it: 'Controllo semplice velocità video',
  pt_BR: 'Controle simples de velocidade de vídeo',
  pt_PT: 'Controlo simples de velocidade de vídeo'
};

const sourceManifest = JSON.parse(
  await readFile(path.join(projectRoot, 'manifest.json'), 'utf8')
);
const sourcePopup = await readFile(path.join(projectRoot, 'popup.html'), 'utf8');
const sourcePopupScript = await readFile(path.join(projectRoot, 'popup.js'), 'utf8');
const sourcePopupStyles = await readFile(path.join(projectRoot, 'popup-polish.css'), 'utf8');
const sourceBackground = await readFile(path.join(projectRoot, 'background.js'), 'utf8');
const sourceContent = await readFile(path.join(projectRoot, 'content.js'), 'utf8');
const safariTargetStyles = await readFile(
  path.join(projectRoot, 'platforms', 'safari', 'popup.css'),
  'utf8'
);

function replaceRequired(source, searchValue, replacement, description) {
  if (!source.includes(searchValue)) {
    throw new Error(`Unable to create target package: missing ${description}.`);
  }
  return source.replace(searchValue, replacement);
}

function removeRange(source, startMarker, endMarker, description) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end === -1) {
    throw new Error(`Unable to create target package: missing ${description}.`);
  }
  return source.slice(0, start) + source.slice(end);
}

function removeFrom(source, startMarker, description) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Unable to create target package: missing ${description}.`);
  }
  return source.slice(0, start);
}

function addViewport(markup) {
  return replaceRequired(
    markup,
    "  <meta charset='UTF-8' />",
    "  <meta charset='UTF-8' />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">",
    'popup charset declaration'
  );
}

function addStylesheet(markup, fileName) {
  return replaceRequired(
    markup,
    '</head>',
    `  <link rel="stylesheet" href="${fileName}">\n</head>`,
    'popup head'
  );
}

function createFirefoxManifest() {
  const manifest = structuredClone(sourceManifest);
  delete manifest.background.service_worker;
  manifest.icons = {
    16: 'icon-16.png',
    48: 'icon-48.png',
    128: 'icon-128.png'
  };
  manifest.browser_specific_settings ??= {};
  manifest.browser_specific_settings.gecko ??= {};
  manifest.browser_specific_settings.gecko_android = {};

  return manifest;
}

function createSafariManifest() {
  const manifest = structuredClone(sourceManifest);
  delete manifest.background.scripts;
  delete manifest.browser_specific_settings;
  if (!manifest.permissions.includes('scripting')) {
    manifest.permissions.push('scripting');
  }
  manifest.host_permissions = ['<all_urls>'];
  manifest.icons = {
    16: 'icon-16.png',
    48: 'icon-48.png',
    128: 'icon-128.png'
  };
  return manifest;
}

function createFirefoxBackground() {
  const windowListener = `chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) return;
  for (const [tabId, sessionId] of activeBoostSessions) {
    endBoostForTab(tabId, sessionId);
  }
});`;

  const guardedWindowListener = `if (chrome.windows?.onFocusChanged) {
  chrome.windows.onFocusChanged.addListener(windowId => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) return;
    for (const [tabId, sessionId] of activeBoostSessions) {
      endBoostForTab(tabId, sessionId);
    }
  });
}`;

  return replaceRequired(
    sourceBackground,
    windowListener,
    guardedWindowListener,
    'window focus listener'
  );
}

function createFirefoxPopupScript() {
  const unsafeLocalizedMarkup = `      if (element.tagName === 'SPAN' && message.includes('<kbd>')) {
        element.innerHTML = message;
      } else {
        element.textContent = message;
      }`;

  const safeLocalizedMarkup = `      if (element.tagName === 'SPAN' && message.includes('<kbd>')) {
        element.textContent = '';
        for (const part of message.split(/(<kbd>.*?<\\/kbd>)/g).filter(Boolean)) {
          const keyMatch = part.match(/^<kbd>(.*?)<\\/kbd>$/);
          if (keyMatch) {
            const key = document.createElement('kbd');
            key.textContent = keyMatch[1];
            element.append(key);
          } else {
            element.append(document.createTextNode(part));
          }
        }
      } else {
        element.textContent = message;
      }`;

  let script = replaceRequired(
    sourcePopupScript,
    unsafeLocalizedMarkup,
    safeLocalizedMarkup,
    'localized shortcut markup'
  );

  script = replaceRequired(
    script,
    '  // Localize UI first\n  localizeHtmlPage();',
    `  // Localize UI first
  localizeHtmlPage();

  const firefoxAndroid = await isFirefoxAndroid();
  if (firefoxAndroid) {
    const shortcutLabel = document.querySelector('#shortcutsToggle [data-i18n="shortcutsTitle"]');
    const keyboardShortcutTitle = getI18nMessage('keyboardShortcutsTitle');
    if (shortcutLabel && keyboardShortcutTitle) shortcutLabel.textContent = keyboardShortcutTitle;

    document.getElementById('shortcutsToggle')?.classList.remove('open');
    document.getElementById('shortcutsContent')?.classList.remove('open');
  }`,
    'Firefox popup localization initialization'
  );

  script = replaceRequired(
    script,
    '  // Check for first-time open\n  await checkFirstOpen();',
    `  // The desktop pinning prompt does not apply to Firefox Android.
  if (!firefoxAndroid) await checkFirstOpen();`,
    'Firefox first-open prompt call'
  );

  return `async function isFirefoxAndroid() {
  if (/Android/i.test(navigator.userAgent)) return true;

  try {
    const platformInfo = await new Promise((resolve, reject) => {
      chrome.runtime.getPlatformInfo(info => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(info);
      });
    });
    return platformInfo?.os === 'android';
  } catch (error) {
    console.info('Unable to read the Firefox runtime platform.', error);
  }

  return navigator.maxTouchPoints > 0 &&
    matchMedia('(hover: none) and (pointer: coarse)').matches;
}

${script}`;
}

function createSafariBackground() {
  return removeFrom(
    sourceBackground,
    '/**\n * Increment speed change count for the review prompt\n */',
    'review tracking listener'
  );
}

function createSafariPopup() {
  let popup = addViewport(sourcePopup);

  popup = removeRange(
    popup,
    '    .kofi-link {',
    '    /* Shortcuts Section */',
    'support-link inline styles'
  );
  popup = removeRange(
    popup,
    '    /* Pin suggestion overlay */',
    '  </style>',
    'browser-only prompt inline styles'
  );
  popup = popup.replace(
    /\n      <a id="kofi-link"[\s\S]*?<\/a>/,
    ''
  );
  popup = replaceRequired(
    popup,
    '    <div class="shortcuts-header">',
    `    <div class="shortcuts-header">
      <div class="safari-action-links">
      <a class="safari-action-link safari-rate-link" href="${appleReviewURL}" target="_blank" rel="noopener noreferrer"
        data-i18n-title="rateThisApp" data-i18n-aria-label="rateThisApp"
        title="Rate this app" aria-label="Rate this app">
        <span class="safari-action-icon" aria-hidden="true">★</span>
        <span class="safari-action-label" data-i18n="rateThisApp">Rate this app</span>
      </a>
      <a class="safari-action-link safari-support-link" href="${appleSupportURL}" target="_blank"
        data-i18n-title="supportOptions" data-i18n-aria-label="supportOptions"
        title="Support options" aria-label="Support options">
        <span class="safari-action-icon" aria-hidden="true">♥</span>
        <span class="safari-action-label" data-i18n="supportOptions">Support options</span>
      </a>
      </div>`,
    'Safari rating and support actions'
  );
  popup = removeRange(
    popup,
    '\n  <!-- Pin suggestion overlay -->',
    '\n  <script src="localization.js">',
    'browser-only prompt markup'
  );
  popup = replaceRequired(
    popup,
    '<body>',
    '<body tabindex="-1">',
    'Safari popup focus target'
  );

  return popup;
}

function createSafariPopupScript() {
  const stateStart = sourcePopupScript.indexOf('let currentSpeed = 1;');
  if (stateStart === -1) {
    throw new Error('Unable to create Safari package: missing popup state.');
  }

  let script = `// Global state to track current speed and domain\n${sourcePopupScript.slice(stateStart)}`;
  script = replaceRequired(
    script,
    'function localizeHtmlPage() {',
    `function localizeHtmlPage() {
  if (CSS.supports('-webkit-touch-callout', 'none')) {
    document.querySelector('#shortcutsToggle [data-i18n]')
      ?.setAttribute('data-i18n', 'keyboardShortcutsTitle');
  }
`,
    'Safari iOS keyboard shortcuts label'
  );
  script = removeRange(
    script,
    '/**\n * Check if this is the first time opening the popup\n */',
    '/**\n * Check if the review prompt should be shown\n */',
    'first-open browser prompt'
  );
  script = removeRange(
    script,
    '/**\n * Check if the review prompt should be shown\n */',
    '/**\n * Localize the HTML page using Chrome i18n\n */',
    'browser review prompt'
  );
  script = removeRange(
    script,
    "  const kofiLink = document.getElementById('kofi-link');",
    '  // Set default value in custom speed input',
    'browser engagement initialization'
  );

  const sharedMessageFunction = `async function sendSpeedToContentScript(speed) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    return chrome.tabs.sendMessage(tabs[0].id, {\x20
      action: 'setSpeed',\x20
      speed: speed\x20
    });
  }
}`;

  const safariMessageFunction = `async function sendSpeedToContentScript(speed) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  if (!tabId) return undefined;

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'setSpeed',
      speed
    });
    if (response?.success) return response;
  } catch (error) {
    console.info('Safari content script was not ready; injecting it now.', error);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['localization.js', 'shortcuts.js', 'content.js']
    });

    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'setSpeed',
      speed
    });
    if (response?.success) return response;
  } catch (error) {
    console.info('Safari message retry failed; applying the speed directly.', error);
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [speed],
    func: requestedSpeed => {
      function findVideos(root) {
        const videos = Array.from(root.querySelectorAll('video'));
        for (const element of root.querySelectorAll('*')) {
          if (element.shadowRoot) videos.push(...findVideos(element.shadowRoot));
        }
        return videos;
      }

      const videos = findVideos(document);
      for (const video of videos) video.playbackRate = requestedSpeed;
      return videos.length;
    }
  });

  return { success: results.some(result => Number(result.result) > 0) };
}`;

  script = replaceRequired(
    script,
    sharedMessageFunction,
    safariMessageFunction,
    'popup content-script messaging function'
  );
  script += `

function clearSafariInitialInputFocus() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (document.activeElement?.id === 'customSpeed') {
        document.body.focus({ preventScroll: true });
      }
      window.getSelection?.()?.removeAllRanges();
    });
  });
}

document.addEventListener('DOMContentLoaded', clearSafariInitialInputFocus);
window.addEventListener('pageshow', clearSafariInitialInputFocus);
`;
  return script;
}

function createSafariContentScript() {
  return `(() => {
  if (globalThis.__svscSafariContentInitialized) return;
  globalThis.__svscSafariContentInitialized = true;
  try {
${sourceContent.split('\n').map(line => `    ${line}`).join('\n')}
  } catch (error) {
    delete globalThis.__svscSafariContentInitialized;
    throw error;
  }
})();
`;
}

function createSafariPopupStyles() {
  const styles = removeRange(
    sourcePopupStyles,
    '.kofi-link {',
    '@media (prefers-reduced-motion: reduce)',
    'browser engagement styles'
  );
  return `${styles.trimEnd()}\n\n${safariTargetStyles}`;
}

async function copyEntry(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: candidate => path.basename(candidate) !== '.DS_Store'
  });
}

async function copyRuntimeFiles(targetDirectory, runtimeFiles) {
  await Promise.all(runtimeFiles.map(file =>
    copyEntry(path.join(projectRoot, file), path.join(targetDirectory, file))
  ));
}

async function prepareSafariLocaleMessages(targetDirectory) {
  const localesDirectory = path.join(targetDirectory, '_locales');
  const entries = await readdir(localesDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const messagesPath = path.join(localesDirectory, entry.name, 'messages.json');
    const messages = JSON.parse(await readFile(messagesPath, 'utf8'));
    for (const key of safariLocaleKeys) delete messages[key];
    if (safariAppNames[entry.name]) {
      messages.appName.message = safariAppNames[entry.name];
    }
    const actionTitles = safariActionTitles[entry.name] || safariActionTitles.en;
    messages.rateThisApp = {
      message: actionTitles.rate,
      description: 'Accessible label for the Safari App Store rating action'
    };
    messages.supportOptions = {
      message: actionTitles.support,
      description: 'Accessible label for the Safari support options action'
    };
    await writeFile(messagesPath, `${JSON.stringify(messages, null, 2)}\n`);
  }
}

async function addMobileShortcutLocaleMessages(targetDirectory) {
  const localesDirectory = path.join(targetDirectory, '_locales');
  const entries = await readdir(localesDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const messagesPath = path.join(localesDirectory, entry.name, 'messages.json');
    const messages = JSON.parse(await readFile(messagesPath, 'utf8'));
    messages.keyboardShortcutsTitle = {
      message: mobileShortcutTitles[entry.name] || mobileShortcutTitles.en,
      description: 'Mobile title for the keyboard shortcuts section'
    };
    await writeFile(messagesPath, `${JSON.stringify(messages, null, 2)}\n`);
  }
}

async function listFiles(directory, relativeDirectory = '') {
  const entries = await readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(directory, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

async function assertSafariIsExtensionOnly(targetDirectory) {
  const files = await listFiles(targetDirectory);
  if (files.some(file => path.basename(file) === 'kofi_symbol.svg')) {
    throw new Error('Safari contains the Ko-fi asset.');
  }

  const searchableExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.md']);
  for (const relativeFile of files) {
    if (!searchableExtensions.has(path.extname(relativeFile).toLowerCase())) continue;
    const contents = await readFile(path.join(targetDirectory, relativeFile), 'utf8');
    const match = safariForbiddenContent.find(value => contents.includes(value));
    if (match) {
      throw new Error(`Safari contains forbidden browser-only content "${match}" in ${relativeFile}.`);
    }
  }
}

function createArchive(targetDirectory, targetName) {
  const archivePath = path.join(
    distDirectory,
    `simple-video-speed-controller-${targetName}.zip`
  );
  const result = spawnSync('zip', ['-q', '-r', archivePath, '.'], {
    cwd: targetDirectory,
    encoding: 'utf8'
  });
  if (result.error) {
    throw new Error(`Unable to start the zip command: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Failed to create ${path.basename(archivePath)}: ${result.stderr.trim()}`);
  }
  return archivePath;
}

async function buildChromium() {
  const targetDirectory = path.join(distDirectory, 'chromium');
  await mkdir(targetDirectory, { recursive: true });
  await copyRuntimeFiles(targetDirectory, chromeRuntimeFiles);
  return targetDirectory;
}

async function buildFirefox() {
  const targetDirectory = path.join(distDirectory, 'firefox');
  await mkdir(targetDirectory, { recursive: true });
  await copyRuntimeFiles(targetDirectory, chromeRuntimeFiles);
  await Promise.all(['icon-16.png', 'icon-48.png', 'icon-128.png'].map(file =>
    copyEntry(path.join(projectRoot, file), path.join(targetDirectory, file))
  ));
  await copyEntry(
    path.join(projectRoot, 'platforms', 'firefox-android', 'popup.css'),
    path.join(targetDirectory, 'firefox-android.css')
  );
  await addMobileShortcutLocaleMessages(targetDirectory);
  await writeFile(
    path.join(targetDirectory, 'manifest.json'),
    `${JSON.stringify(createFirefoxManifest(), null, 2)}\n`
  );
  await writeFile(path.join(targetDirectory, 'background.js'), createFirefoxBackground());
  await writeFile(path.join(targetDirectory, 'popup.js'), createFirefoxPopupScript());
  await writeFile(
    path.join(targetDirectory, 'popup.html'),
    addStylesheet(addViewport(sourcePopup), 'firefox-android.css')
  );
  return targetDirectory;
}

async function buildSafari() {
  const targetDirectory = path.join(distDirectory, 'safari');
  await mkdir(targetDirectory, { recursive: true });
  await copyRuntimeFiles(targetDirectory, safariRuntimeFiles);
  await writeFile(
    path.join(targetDirectory, 'manifest.json'),
    `${JSON.stringify(createSafariManifest(), null, 2)}\n`
  );
  await writeFile(path.join(targetDirectory, 'background.js'), createSafariBackground());
  await writeFile(path.join(targetDirectory, 'content.js'), createSafariContentScript());
  await writeFile(path.join(targetDirectory, 'popup.html'), createSafariPopup());
  await writeFile(path.join(targetDirectory, 'popup.js'), createSafariPopupScript());
  await writeFile(path.join(targetDirectory, 'popup-polish.css'), createSafariPopupStyles());
  await prepareSafariLocaleMessages(targetDirectory);
  await addMobileShortcutLocaleMessages(targetDirectory);
  await assertSafariIsExtensionOnly(targetDirectory);
  return targetDirectory;
}

await rm(distDirectory, { recursive: true, force: true });
await mkdir(distDirectory, { recursive: true });

for (const [targetName, buildTarget] of [
  ['chromium', buildChromium],
  ['firefox', buildFirefox],
  ['safari', buildSafari]
]) {
  const targetDirectory = await buildTarget();
  const archivePath = createArchive(targetDirectory, targetName);
  console.log(`Built ${path.relative(projectRoot, targetDirectory)}`);
  console.log(`Built ${path.relative(projectRoot, archivePath)}`);
}
