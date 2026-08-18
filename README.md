# Simple Video Speed Controller
<img width="100" alt="Icon" src="https://github.com/user-attachments/assets/17514be3-7964-4000-982c-143bbcfaa1c0" />

A lightweight and intuitive browser extension that lets you control video playback speed on any streaming service or website. Perfect for watching tutorials, lectures, or any online video content at your preferred pace.

### Available On
Available for [Chrome](https://chromewebstore.google.com/detail/simple-video-speed-contro/kcjfpmjkbkhgojilpihplkedadndnked), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/simple-video-speed-controller/), [Edge](https://microsoftedge.microsoft.com/addons/detail/simple-video-speed-contro/mnmagmdfgdjhbfkdnonnhkfnbnjpehja), [Opera](https://addons.opera.com/en/extensions/details/simple-video-speed-controller/), and [Whale](https://store.whale.naver.com/detail/fkcbnblnjclbfnkkhnmoaelklgfiigbc).

<img width="250" alt="Interface" src="https://github.com/user-attachments/assets/217f4ea7-7bb2-4732-8d09-90621a36d622" />

## Features

- **Universal Compatibility**: Works with any website that plays HTML5 videos
- **Domain-Specific Speed Memory**: Automatically remembers your preferred playback speed for each website
- **Keyboard Shortcuts**:
  - Mac: `Command + Option + Plus` to increase speed
  - Mac: `Command + Option + Minus` to decrease speed
  - Mac: `Command + Option + Delete` to reset to 1x speed
  - Mac: `Command + Option + [1-9]` to set specific speed. Press again to add 0.5x, and press again to revert.
  - Mac: `Command + Option + 0` to set to 16x max speed. Press again to reset to 1x speed.
  - Windows/Linux: `Ctrl + Shift + Plus` to increase speed
  - Windows/Linux: `Ctrl + Shift + Minus` to decrease speed
  - Windows/Linux: `Ctrl + Shift + Backspace` to reset to 1x speed
  - Windows/Linux: `Ctrl + Shift + [1-9]` to set specific speed. Press again to add 0.5x, and press again to revert.
  - Windows/Linux: `Ctrl + Shift + 0` to set to 16x max speed. Press again to reset to 1x speed.

- **Clean, Intuitive Interface**:
  - Quick preset buttons for common speeds (0.5x to 3x)
  - Custom speed input for precise control
  - Fine-tuning buttons for incremental adjustments
  - Visual feedback toast when changing speeds

## Usage

### Using the Popup Interface

1. Click the extension icon in your browser's toolbar
2. Choose a preset speed (0.5x - 3x) or enter a custom speed
3. Use the + and - buttons for fine-tuning
4. Your chosen speed will be saved for that specific website

### Using Keyboard Shortcuts

- Increase speed: `Command + Option + Plus` (Mac) or `Ctrl + Shift + Plus` (Windows/Linux)
- Decrease speed: `Command + Option + Minus` (Mac) or `Ctrl + Shift + Minus` (Windows/Linux)
- Reset to normal speed: `Command + Option + Delete` (Mac) or `Ctrl + Shift + Backspace` (Windows/Linux)
- Set specific speed (1-9): `Command + Option + [1-9]` (Mac) or `Ctrl + Shift + [1-9]` (Windows/Linux). Press again to add 0.5x, and press again to revert.
- Set to max speed (16x): `Command + Option + 0` (Mac) or `Ctrl + Shift + 0` (Windows/Linux). Press again to reset to 1x speed.

`Ctrl + Alt` is intentionally not used on Windows because many international keyboard layouts expose AltGr as that modifier combination. `Ctrl + Shift + Backspace` is used for reset because browsers reserve `Ctrl + Shift + Delete` for clearing browsing data.

The extension will display a toast notification showing the current speed whenever you make adjustments.

## Building

Run `npm run build` to create browser-specific extension packages:

- `dist/chromium` and `dist/simple-video-speed-controller-chromium.zip`
- `dist/firefox` and `dist/simple-video-speed-controller-firefox.zip`

The Chromium manifest uses a background service worker, while the Firefox manifest uses a background script.

## Privacy

This extension only:
- Accesses video elements on the pages you visit
- Stores your preferred playback speeds for different websites
- No data is collected or transmitted to external servers

## Support

If you encounter any issues or have suggestions, please open an issue in this repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
