# Simple Video Speed Controller

<img width="100" alt="Simple Video Speed Controller icon" src="https://github.com/user-attachments/assets/17514be3-7964-4000-982c-143bbcfaa1c0">

A lightweight, open-source browser extension for controlling HTML5 video playback from **0.1x to 16x**. Set a speed from the popup, use keyboard shortcuts without leaving the video, or hold a customizable shortcut for a temporary speed boost. Your preferred speed is remembered separately for each website.

## Install

| Browser | Store |
| --- | --- |
| Google Chrome | [Chrome Web Store](https://chromewebstore.google.com/detail/simple-video-speed-contro/kcjfpmjkbkhgojilpihplkedadndnked) |
| Mozilla Firefox | [Firefox Browser Add-ons](https://addons.mozilla.org/en-US/firefox/addon/simple-video-speed-controller/) |
| Microsoft Edge | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/simple-video-speed-contro/mnmagmdfgdjhbfkdnonnhkfnbnjpehja) |
| Opera | [Opera Add-ons](https://addons.opera.com/en/extensions/details/simple-video-speed-controller/) |
| NAVER Whale | [Whale Store](https://store.whale.naver.com/detail/fkcbnblnjclbfnkkhnmoaelklgfiigbc) |

After installing or updating the extension, reload any already-open video tabs. Pin the extension for quick access to the popup.

<img width="280" height="397" alt="Simple Video Speed Controller PC/Linux" src="https://github.com/user-attachments/assets/556c255d-6716-472e-b242-ebb3ab501e5f" />
<img width="277" height="396" alt="Simple Video Speed Controller Mac" src="https://github.com/user-attachments/assets/c218afaf-2d78-4b28-a608-252e8c9782a5" />

## Features

- **Broad HTML5 video support:** Works across streaming sites, course platforms, social media, and other websites that use HTML5 video.
- **Embedded and dynamic video support:** Controls videos in embedded frames, videos added after a page loads, and videos inside open shadow DOMs.
- **Per-site speed memory:** Saves and reapplies a separate playback speed for each domain using browser sync storage.
- **Precise speed control:** Choose a 0.5x–3x preset, enter a custom speed from 0.1x–16x, or fine-tune in 0.05x steps.
- **Temporary Boost:** Choose a boost speed and letter key, then hold the platform shortcut to use that speed temporarily. Releasing the shortcut restores the previous speed, including for videos across frames in the active tab.
- **Speed lock:** Reapplies the selected speed when a player starts, loads new media, or tries to change its own playback rate.
- **YouTube live-edge handling:** Returns playback to 1x at the live edge to avoid repeated buffering and catch-up loops.
- **On-video feedback:** Shows the current speed in a short toast, including in fullscreen mode.
- **Localized interface:** Available in 21 languages.
- **Privacy focused:** No analytics, accounts, or developer-operated servers.

## Usage

### Popup controls

1. Click the extension icon in the browser toolbar.
2. Choose a preset, enter a custom speed, or use the `+` and `−` buttons to adjust by 0.05x.
3. Expand **Shortcuts** to view the keys or configure **Temporary Boost**.

Changes apply to every video in the active tab and the regular playback speed is saved for that website.

### Keyboard shortcuts

| Action | macOS | Windows / Linux |
| --- | --- | --- |
| Increase by 0.05x | `Command + Option + Plus` | `Ctrl + Shift + Plus` |
| Decrease by 0.05x | `Command + Option + Minus` | `Ctrl + Shift + Minus` |
| Reset to 1x | `Command + Option + Backspace/Delete` | `Ctrl + Shift + Backspace` |
| Set 1x–9x | `Command + Option + 1–9` | `Ctrl + Shift + 1–9` |
| Toggle 16x | `Command + Option + 0` | `Ctrl + Shift + 0` |
| Temporary Boost | `Command + Option + chosen letter` | `Ctrl + Shift + chosen letter` |

Pressing the currently selected `1`–`9` shortcut again toggles an extra `0.5x` (for example, `2x` → `2.5x` → `2x`). The `0` shortcut toggles between `16x` and the speed you were using before it.

Windows and Linux use `Ctrl + Shift` because `Ctrl + Alt` is exposed as AltGr on many international keyboard layouts. Reset uses `Backspace` because browsers reserve `Ctrl + Shift + Delete` for clearing browsing data.

## Languages

The extension interface is available in 21 languages across these 22 locales:

| Language | Locale | Language | Locale | Language | Locale |
| --- | --- | --- | --- | --- | --- |
| Arabic | `ar` | Indonesian | `id` | Portuguese (Brazil) | `pt_BR` |
| Chinese (Simplified) | `zh_CN` | Italian | `it` | Portuguese (Portugal) | `pt_PT` |
| Chinese (Traditional) | `zh_TW` | Japanese | `ja` | Spanish (Spain) | `es` |
| Dutch | `nl` | Korean | `ko` | Thai | `th` |
| English | `en` | Malay | `ms` | Turkish | `tr` |
| French | `fr` | Polish | `pl` | Ukrainian | `uk` |
| German | `de` | Hindi | `hi` | Vietnamese | `vi` |
| Spanish (Latin America and Caribbean) | `es_419` |  |  |  |  |

## Build and test

Requirements: a current Node.js release and the `zip` command-line utility. Building the Apple app also requires a current Xcode installation.

```sh
npm run preview
npm test
npm run build
npm run build:apple
```

`npm run preview` serves the real popup UI for macOS and Windows/Linux side by side at `http://127.0.0.1:4173/`. Set `PREVIEW_PORT` to use a different local port.

The build produces browser-specific unpacked extensions and ZIP archives:

- `dist/chromium` and `dist/simple-video-speed-controller-chromium.zip` for Chrome, Edge, Opera, and Whale
- `dist/firefox` and `dist/simple-video-speed-controller-firefox.zip` for Firefox desktop and Android
- `dist/safari` and `dist/simple-video-speed-controller-safari.zip` as the web-extension resources embedded in the Apple app

The Chromium package is a byte-for-byte copy of the existing extension runtime. Firefox Android and Safari changes are applied only while producing their target packages, with platform styles kept under `platforms/`; they do not alter the Chrome popup or scripts. The Safari package excludes browser-store review prompts, Ko-fi links, pinning guidance, and related engagement resources, while adding a compact user-initiated link to the app's App Store review page.

`npm run build:apple` rebuilds all web targets, synchronizes the Safari resources, regenerates Apple icon assets from the existing extension artwork, and compiles unsigned macOS and iOS Simulator builds. Signed App Store archives are created explicitly in Xcode after selecting an Apple development team.

See [APPLE_RELEASE.md](APPLE_RELEASE.md) for the Apple, StoreKit, App Store Connect, TestFlight, and Firefox Android release checklist.

## Privacy

Simple Video Speed Controller stores domain-keyed playback preferences and extension settings in your browser's sync storage. Depending on your browser settings, that storage may sync through your browser account. The extension does not send this information to the developer, include analytics, or transmit video content or metadata to external servers.

See the [privacy policy](PRIVACYPOLICY.md) for details.

## Support

Found a bug or have a feature request? [Open a GitHub issue](../../issues).

<p align="center">
<a href="https://chaseos.app">🌐 Explore my work</a>
</p>

<p align="center">
<a href="https://ko-fi.com/chaseos" target="_blank">
<img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" />
</a>
</p>

## License

Licensed under the [MIT License](LICENSE).
