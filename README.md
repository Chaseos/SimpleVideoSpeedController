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

<img width="250" alt="Simple Video Speed Controller popup" src="https://github.com/user-attachments/assets/217f4ea7-7bb2-4732-8d09-90621a36d622">

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

The extension interface is available in these 21 locales:

| Language | Locale | Language | Locale | Language | Locale |
| --- | --- | --- | --- | --- | --- |
| Arabic | `ar` | Indonesian | `id` | Portuguese (Brazil) | `pt_BR` |
| Chinese (Simplified) | `zh_CN` | Italian | `it` | Portuguese (Portugal) | `pt_PT` |
| Chinese (Traditional) | `zh_TW` | Japanese | `ja` | Spanish | `es` |
| Dutch | `nl` | Korean | `ko` | Thai | `th` |
| English | `en` | Malay | `ms` | Turkish | `tr` |
| French | `fr` | Polish | `pl` | Ukrainian | `uk` |
| German | `de` | Hindi | `hi` | Vietnamese | `vi` |

## Build and test

Requirements: a current Node.js release and the `zip` command-line utility.

```sh
npm test
npm run build
```

The build produces browser-specific unpacked extensions and ZIP archives:

- `dist/chromium` and `dist/simple-video-speed-controller-chromium.zip` for Chrome, Edge, Opera, and Whale
- `dist/firefox` and `dist/simple-video-speed-controller-firefox.zip` for Firefox

The Chromium package uses a Manifest V3 background service worker; the Firefox package uses a background script.

## Privacy

Simple Video Speed Controller stores domain-keyed playback preferences and extension settings in your browser's sync storage. Depending on your browser settings, that storage may sync through your browser account. The extension does not send this information to the developer, include analytics, or transmit video content or metadata to external servers.

See the [privacy policy](PRIVACYPOLICY.md) for details.

## Support

Found a bug or have a feature request? [Open a GitHub issue](../../issues). If the extension is useful to you, you can also [support development on Ko-fi](https://ko-fi.com/chaseos).

## License

Licensed under the [MIT License](LICENSE).
