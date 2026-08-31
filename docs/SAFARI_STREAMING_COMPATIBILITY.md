# Safari streaming observations — 2026-08-31

Read-only inspection of the user's five existing Safari player tabs, using Web Inspector. These observations describe the loaded videos, not every title, browser, or playback mode offered by each service. No speed limits were applied during the initial inspection. A native-HLS safeguard was subsequently implemented below.

| Service | Observed delivery evidence | Observed playback path |
| --- | --- | --- |
| Paramount+ | The loaded video's `currentSrc` ends in `.m3u8`; `.m3u8` resource requests | Native HLS: direct playlist source, no open MediaSource instances |
| Disney+ | `.m3u8` resource requests; loaded video uses a `blob:` source | HLS through MSE: one open MediaSource with two active source buffers |
| HBO Max | `.mpd` resource requests; loaded video uses a `blob:` source | DASH through MSE: one open MediaSource with two active source buffers |
| Netflix | Loaded video uses a `blob:` source; retained resource entries reveal no recognizable playlist extension | MSE confirmed: one open MediaSource with two active source buffers; playlist format unclassified |
| YouTube | Two videos use `blob:` sources; retained resource entries reveal no recognizable playlist extension | MSE confirmed: two open MediaSource instances, each with two active source buffers; playlist format unclassified |

The initial Disney+ title was Hulu content inside Disney+. A follow-up inspection of **Moana** also confirmed HLS through MSE: one loaded `blob:` video, one empty placeholder, one open MediaSource with two active source buffers, and `.m3u8` requests. The actual new detector returned zero native-HLS videos and one unrestricted loaded video. Do not generalize these observations to every title or device.

## Evidence and limits

- Inspected video source scheme/type, current rate, readiness/dimensions, Resource Timing playlist extensions, and live MediaSource instances using Web Inspector's `queryInstances(MediaSource)`. Prototype objects and closed instances were excluded. A `blob:` URL alone was not treated as proof of MSE.
- `queryInstances` is a [Web Inspector console API](https://webkit.org/web-inspector/console-command-line-api/), not an API available to a shipped extension. It cannot simply be copied into content-script detection.
- Netflix and YouTube were paused at 3×. Disney+ and HBO Max were paused at 1×. The user reported successful playback above 2× on these services; this inspection did not independently measure smooth playback or audio above 2× and did not change their speeds.
- Paramount initially showed error 3101 and no video element. One page refresh loaded the episode at 1×, with the direct HLS source recorded above. Playback was paused after inspection.
- Full media URLs, signed query strings, manifest bodies, and account data were not saved in this report. Resource Timing may omit earlier requests or expose extensionless endpoints, so missing playlist extensions do not establish a delivery format.
- Web Inspector panels were closed and the original Safari developer-tools preference restored after inspection.

## Implemented native-HLS safeguard

The Safari build now bundles `platforms/safari/playback-policy.js`. It limits positively identified native-HLS videos to 2×; it does not implement a blanket HLS or service-name limit. Disney+ demonstrates that HLS can use MSE and work above 2×. [WebKit describes native HLS behavior above 2×](https://github.com/WebKit/WebKit/commit/d1cf1ce59abb8c7e1a1f64efdeb4f50d8c9f83ce): iframe-only playback, or pause/seek/play when an iframe variant is absent. That WebKit change applies a Spotify-specific workaround, not a universal service compatibility rule. The Paramount symptoms match this mechanism, but we have not instrumented its internal decoder or inspected its manifest variants.

Detection requires a loaded video's own direct `.m3u8` URL, HLS-typed data URL, or matching selected `<source>` with an HLS MIME type. Playlist requests elsewhere, unused source alternatives, `canPlayType`, encryption, and browser identification alone are not evidence. `blob:` and opaque/unknown sources remain unrestricted. An extension cannot universally query Safari's internal playback engine, so an extensionless HLS URL without a selected source type may remain undetected.

Enforcement is per video and reevaluates on metadata, playback, rate changes, time updates, DOM insertion, and the existing periodic fallback. It covers popup messages, saved rates, keyboard shortcuts, Temporary Boost, and direct scripting fallback. Requested preferences remain separate from effective rates, so a source switching back to MSE can use the requested speed. Chromium and Firefox do not load the helper and keep existing behavior.

The popup disables speeds above 2× only when every detected loaded video is native HLS; mixed or unknown playback stays available. A localized notice explains the cap. Temporary Boost preferences remain global and unchanged, while native-HLS playback itself is capped. Popup inspection failures clear the UI restriction instead of guessing.

Verification: all 73 automated tests passed, including source classification, mixed and shadow-DOM playback, source transitions, boost, rate resets, popup controls, unknown sources, and Safari packaging. Both unsigned and signed macOS builds succeeded. The signed build updated the existing registered Xcode DerivedData app, and its changed runtime files match `dist/safari`; open pages still need a reload to load the new content script. A read-only execution of the actual detector in Moana's Safari console confirmed no cap. A subsequent Paramount console check was interrupted by concurrent Safari interaction; no new successful live enforcement or audio verification is claimed. Developer features were restored off and inspectors closed after inspection.
