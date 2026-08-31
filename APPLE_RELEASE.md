# Apple and Firefox Android Release Guide

This repository contains one universal Apple product with iPhone, iPad, and Mac targets, plus one Safari Web Extension. Chromium and Firefox keep their existing review and Ko-fi controls. The Safari toolbar popup contains the video controls, a compact user-initiated App Store rating link, and a compact “Support options” handoff to the containing app. All StoreKit products, prices, explanations, and purchases remain in the containing Apple app.

## Local Safari registration troubleshooting (2026-08-31)

Paramount speed-control investigation found seven registered local build paths (six enabled entries in Safari). The toolbar popup and the running content script used different `safari-web-extension://` origins. Keep one signed development build registered when testing; multiple Debug, Release, and archive build products with the same bundle ID can leave Safari using mismatched extension instances.

Inspect registrations with `pluginkit -m -A -D -v -i app.chaseos.SimpleVideoSpeedController.Extension`. After identifying and recording the intended build, unregister only stale paths with `pluginkit -r <extension.appex-path>`, then reload affected tabs. This removes registrations, not app files; do not delete builds or reset extension data to diagnose this issue. Recheck registrations after running other local builds.

The repair retained the normal Xcode DerivedData Debug build and reduced registrations to one. Paramount's video accepted `playbackRate = 2` through the existing storage listener. After repair, the popup and content script shared an origin, and a popup-entered 1.5× command reached the top frame and saved successfully. A final elapsed-playback timing check was interrupted by concurrent Safari interaction; no claim of that check passing is made. All 66 existing automated checks passed. No playback-code change was required, and the temporary Safari developer-tools setting was restored.

Follow-up: the user reports smooth Paramount playback through 2×, but isolated frames/seeks and no audio above 2×; YouTube works at higher rates. This matches WebKit's documented native HLS behavior above 2× ([WebKit change explaining the behavior](https://github.com/WebKit/WebKit/commit/d1cf1ce59abb8c7e1a1f64efdeb4f50d8c9f83ce)). The cited change caps Spotify specifically; it does not fix Paramount. Treat the Paramount diagnosis as consistent with the report, not an instrumented reproduction. Reading back a requested `playbackRate` alone does not verify smooth decoding or audible playback. The follow-up Safari safeguard caps positively identified native-HLS videos at 2×; it does not replace the player or restrict services by hostname.

Subsequent inspection of five open Safari tabs confirmed native HLS for the loaded Paramount episode, HLS through MSE for Disney+ (Hulu content), DASH through MSE for HBO Max, and MSE with unclassified playlist formats for Netflix and YouTube. See [the observed streaming comparison](docs/SAFARI_STREAMING_COMPATIBILITY.md) for the implementation and its detection limits. A further inspection of Disney’s Moana also confirmed HLS through MSE and no cap from the new detector. HLS playlist detection alone would incorrectly restrict the working Disney+ player. All 73 automated checks and an unsigned macOS build pass; no end-to-end Paramount audio/decoding test is claimed.

## Local build

Requirements:

- A current Node.js release
- The `zip` command-line utility
- A current Xcode installation with the iOS platform installed

Run:

```sh
npm test
swift test --package-path apple
npm run build:apple
```

The Swift command runs the native transaction-model tests on macOS. The Apple build command creates all three extension packages, regenerates the Apple icons from the existing extension artwork, and compiles unsigned macOS and iOS Simulator apps. Open the Xcode project at:

```text
apple/Simple Video Speed Controller/Simple Video Speed Controller.xcodeproj
```

Signed App Store archives are intentionally not automated. The project is configured for the personal Chase Olson team (`QG4CBM3K89`) with automatic signing on all four targets. Verify that team is still selected in Xcode, then create separate iOS and macOS archives with Product > Archive.

## Apple identifiers and versions

- iPhone/iPad Home Screen name: `Video Speed` (11 characters including the space); Mac and Safari extension names remain unchanged.
- App bundle ID: `app.chaseos.SimpleVideoSpeedController`
- Extension bundle ID: `app.chaseos.SimpleVideoSpeedController.Extension`
- Marketing version: `1.15`
- Build number: `3`
- Minimum iOS/iPadOS: 16
- Minimum macOS: 13
- App Store Connect SKU: `SVSC-APPLE-001`

The universal App Store Connect record for iOS/iPadOS and macOS has Apple ID `6806633069`. Its single source of truth is `Configurations/AppStoreID.txt`, which is read by both the Safari packager and the containing app. The star uses it to open the product's direct write-review page. It does not request an automatic rating prompt.

The star and heart use Apple's built-in SF Symbols, `star.fill` and `heart.fill`; there are no custom action images to maintain.

## StoreKit tips

Accept the Paid Apps Agreement and complete the required banking and tax information. Add the In-App Purchase capability to both containing-app targets.

Create these consumable products under Monetization > In-App Purchases using the exact identifiers:

| Product ID | Reference/display name | US price |
| --- | --- | --- |
| `app.chaseos.SimpleVideoSpeedController.tip.small` | Small Tip | $0.99 |
| `app.chaseos.SimpleVideoSpeedController.tip.standard` | Standard Tip | $2.99 |
| `app.chaseos.SimpleVideoSpeedController.tip.generous` | Generous Tip | $4.99 |

Add localizations, availability, review screenshots, and review notes for all three. The app displays the names and prices returned by StoreKit, so localized storefront values do not need to be duplicated in the interface.

For local tests, select the shared `StoreKit Testing (iOS)` or `StoreKit Testing (macOS)` scheme and run from Xcode. Both bind `Configurations/TipProducts.storekit` to Debug launches. The normal `Simple Video Speed Controller (iOS)` and `(macOS)` schemes remain unbound to local StoreKit and retain Release archive actions. Confirm that purchase dialogs identify the Xcode environment before proceeding. Exercise success, cancellation, pending approval, product-loading failure, retry, unverified transaction, and purchase failure. Reset simulated errors, Ask to Buy, and interruptions afterward. Then create a Sandbox Apple Account and complete sandbox purchases on both iOS/iPadOS and macOS.

Tips are repeatable consumables, unlock nothing, and create no lasting entitlement. The app therefore has no Restore Purchases action, account, receipt server, or analytics.

The App Store Connect products have been created with the identifiers and US prices above, worldwide availability, English (U.S.) localization, and review notes. They remain in Prepare for Submission until review screenshots are added and they are submitted with version 1.15.

## App Store Connect checklist

1. The app and extension identifiers are registered. Select the Apple development team and confirm automatic signing for every Apple target in Xcode.
2. The free, public Utilities-category app record exists with SKU `SVSC-APPLE-001`, iOS/iPadOS and macOS version 1.15, and worldwide availability.
3. Apple ID `6806633069` is set in `AppleConfiguration.appStoreID`.
4. The three consumable tip products exist. Add one review screenshot to each product after the native tip sheet is running on a device.
5. Publish stable support and privacy pages. Ready-to-publish page sources are in `docs/support.html` and `docs/privacy.html`; replace their placeholder public URLs in App Store Connect with the final hosted addresses.
6. The no-data App Privacy label is published and the age-rating questionnaire is complete at 4+. Add copyright, description, keywords, support URL, and screenshots for iPhone, iPad, and Mac. The containing-app Info.plists already declare that the app does not use non-exempt encryption.
7. Upload both archives and test both platforms through TestFlight.
8. Submit the first app version together with all three consumables. The first in-app purchases must accompany an app-version submission.

App Store Connect still requires the account owner to complete Digital Services Act trader compliance. That process uses personal or business identity details and should be completed directly by the account owner.

Suggested App Review notes:

```text
Simple Video Speed Controller is a Safari Web Extension for controlling HTML5 video playback speed.

To enable it on iPhone or iPad, open Settings > Apps > Safari > Extensions, select Simple Video Speed Controller, enable it, and allow access to websites. On Mac, open Safari > Settings > Extensions and enable it.

All-sites access is required because the extension must locate and control HTML5 video elements on whichever website the user chooses. Video content, browsing history, and site data are not sent to the developer.

The Safari extension popup includes a star labeled “Rate this app” and a heart labeled “Support options.” The star opens the app's App Store write-review page. The heart opens the containing app, which then presents the StoreKit tip sheet. The same actions are also available at the bottom of the containing app. Tips are repeatable consumables, are entirely optional, and unlock no features, content, status, or other benefit.

To test playback controls: open [PUBLIC TEST PAGE URL], play its HTML5 video, open the Safari extension, and choose a different speed. The video speed changes immediately. The extension also provides keyboard shortcuts and an optional temporary speed boost.
```

Replace `[PUBLIC TEST PAGE URL]` with a stable public HTML5 video page before submission.

## Device release gates

### Commit-readiness review — 2026-08-31

- Reviewed the pending runtime, native UI/commerce, packaging, and test changes; no blocking code findings remain. Playback detection is shared across enforcement and fallback execution; the native transaction model is shared by both apps and isolated from StoreKit for executable tests.
- Fresh verification: 74 JavaScript checks, 8 native Swift tests, unsigned universal Mac Release and iOS device Release builds, and `git diff --check` all pass. The only build warnings are skipped App Intents metadata extraction for targets without that framework.
- Added Swift build/workspace ignore rules and documented the native test command. Generated builds, archives, logs, and Xcode personal state remain excluded. The separate user-owned `docs/MACOS_SAFARI_HANDOFF_PROMPT.md` is outside this change set and should not be swept into a blanket add.
- Ready for a source commit/push when requested. No commit or push was performed by this review. Distribution archives, TestFlight validation, and the remaining public-release checklist are separate from source readiness. Logs: `build/release-check-2026-08-31/logs/precommit-*` (ignored).


### Companion-app guidance — 2026-08-31

- Action visibility preference: star/heart icons are fully opaque in all native apps (Mac, iPhone, iPad) and in iPhone/iPad Safari popups. Only the Mac Safari popup retains the faded idle treatment. Hover/touch expansion and action behavior are unchanged.

- Instruction correction: removed the cryptic “aA” aside and distinguished the iPhone page menu from the iPad Extensions button beside the address bar. Checked against Apple’s [iPhone guide](https://support.apple.com/en-ie/guide/iphone/iphab0432bf6/26/ios/26) and [iPad guide](https://support.apple.com/en-nz/guide/ipad/ipada7ca2a18/ipados). The Settings path applies to both. This follow-up changes text only.

- iPhone/iPad now explain the Safari-only video controls, setup and website permissions, and how to open the extension from Safari's page menu. Expandable Help and Privacy summaries work offline; existing Settings and native Rate/Support actions are unchanged. Pinch zoom is no longer disabled.
- Mac retains its compact enabled/disabled status and Settings action, with one toolbar-use hint. Its icon/spacing were reduced to keep the existing window comfortable; the longer mobile guide and disclosures are hidden on Mac.
- All 74 existing checks, development-signed Mac Debug, and unsigned iOS Simulator Debug builds pass. Local browser previews checked phone (390×844), iPad (768×1024), and the existing Mac window (425×460), plus Help/Privacy expansion. These previews do not validate native Dynamic Type or VoiceOver; the user's device check remains appropriate. No purchase or handoff logic changed.


### iPad support-link follow-up — 2026-08-31

- User confirms donations work on Mac and iPhone. On iPad, the Safari popup heart opens an empty tab without an app-opening prompt. The first attempted fix (closing the popup after link activation) failed in the user's retest and has been removed.
- Current [WebKit popup navigation code](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebKit/UIProcess/Extensions/Cocoa/WebExtensionActionCocoa.mm) sends external main-frame/new-window navigation through a new-tab operation. This supports investigating popup routing, but does not prove the exact cause on the user's Safari version.
- The iPad heart now opens a bundled support page; a real **Open Simple Video Speed Controller** link tap from that regular tab launches the existing app URL. Both legacy iPad and desktop-style iPad identities take this path. Mac/iPhone retain their original direct links. The page has a localized button in all 22 locales and is bundled in both extension targets. No native purchase code, permissions, server, or automatic redirect was added.
- All 74 JavaScript checks pass, including iPad routing, unchanged Mac/iPhone links, and resource packaging. The user subsequently confirmed that this iPad path opens the app. The page now uses the full app name, explains the optional tip and Apple payment flow, and clarifies that app launch alone does not purchase anything. All 22 locales include the new copy. The English layout was visually checked at iPad and narrow-window sizes, and the updated iOS Simulator build passes. The link behavior is unchanged; an actual iPad donation remains unreported. See [the focused checklist](docs/RELEASE_TEST_CHECKLIST.md).

### Prepared for user testing — 2026-08-31 (not release approval)

- Compared Paramount Quality+ and adopted its explicit AppKit support-window presentation and testable commerce boundary. Both containing apps now own the transaction listener and reconcile unfinished tips on launch/activation. Verified known consumables finish once; purchase and incoming-delivery messages remain separate, and concurrent purchases are guarded.
- All 73 JavaScript checks and 8 executable native transaction-model tests pass. Development-signed Mac Debug, unsigned iOS Simulator Debug, unsigned universal Mac Release, and unsigned iOS device Release builds pass. Native tests use a fake provider, not the system checkout UI.
- An earlier interactive local Xcode run still showed the missing Purchase control. Reference-project code alone does not prove this is fixed or isolate its cause. Per user direction, further UI automation is deferred to a short hands-on test/iterate loop. Purchase, approved-pending recovery, and final Safari checks remain unverified for this prepared revision.
- Smaller-phone largest-text onboarding scrolling reached Open Settings and opened Settings. Other outstanding device/accessibility checks below remain open. Local StoreKit configuration and text-size override were restored; temporary diagnostics were stopped. No commit, archive, upload, or publication occurred in this pass.
- Start with [the short release test checklist](docs/RELEASE_TEST_CHECKLIST.md). Prior archives/uploaded build 3 predate these changes and must not be used to validate this revision. Logs: `build/release-check-2026-08-31/logs/` (ignored).


### Mac purchase fix/retest — 2026-08-30 (partial)

- Mac-only changes now anchor StoreKit confirmation to the visible support window and wrap the SwiftUI sheet in an AppKit container. The observed NSRemoteView/NSHostingController warning disappeared; Done dismissal passed. iOS behavior is unchanged.
- Mac transaction handling is app-owned, with launch/activation reconciliation and shared verified-transaction completion. A fresh external transaction finished, and all three tips plus a repeat consumable finished with Xcode dialogs disabled.
- **Still blocked:** the interactive Xcode purchase dialog has a blank Purchase-button area. A newly approved pending transaction (ID 10) remained unfinished across relaunch, as did older ID 6. These changes do not establish release readiness or prove the problem is exclusively Xcode's.
- Verification: 66/66 automated checks (17 executable JavaScript behavior checks; 49 source/packaging/data assertions), development-signed Mac Debug and universal Release builds, and an unsigned iOS Simulator Debug compile all pass. No iOS runtime changes or testing were performed in this pass.
- Local StoreKit settings were restored and this Mac debug run stopped. No commit, push, archive, or upload was performed. Detailed evidence and remaining scenarios: `build/release-check/MAC_PURCHASE_RETEST.md`.
- Next isolation step: compare a minimal native Mac StoreKit sample under this Xcode installation with a separately authorized Mac sandbox/TestFlight test. Do not substitute dialogs-disabled success for a working checkout UI.

### Beta archive/upload — 2026-08-30

- Version 1.15 build 3 replaces the previously uploaded build 2. All app/extension build numbers match.
- The iPhone/iPad archive was created using Xcode's normal iOS scheme and uploaded through Organizer > Distribute App > App Store Connect. Xcode confirmed upload completion. The archive contains the `Video Speed` Home Screen name.
- A universal Intel/Apple Silicon Mac archive of version 1.15 build 3 was created using the normal macOS scheme. Its App Store Connect upload awaits separate authorization.
- No TestFlight processing status was checked, no tester groups were changed, and no App Store release was submitted. The testing gaps below remain applicable.

### Local release-check results — 2026-08-30 (partial, not release approval)

- Automated checks: 64/64 pass, including the short Home Screen name regression. Seventeen execute JavaScript behavior; 47 check packaging, source patterns, metadata, or locale data. No native UI behavior is proven by source-pattern tests.
- Final iOS Simulator Debug/Release, unsigned iOS device Release compile, and development-signed Mac Debug/Release builds pass on Xcode 26.6. These are not App Store archive validation.
- iPhone 17 Pro Max / iOS 26.5: containing app and support sheet opened; all three local Xcode tips, repeat consumable, cancel, purchase failure/retry, and pending approval/decline were exercised. Approved transactions were finished. These runtime checks preceded the layout fix below.
- Resumed with user authorization. iPhone 17e and iPad passed post-fix small-tip purchase, cancellation, and Done dismissal. Large-text tip rows no longer overlap, but actual gesture reachability remains unverified. Removed disabled onboarding scrolling after largest-text clipping; touch retest remains necessary. The 17e text-size override was restored to normal.
- iPad Safari popup collapse was reproduced and fixed: retain intrinsic minimum width and remove the viewport-height cap. Portrait, landscape, expanded shortcuts, and 2× video control passed. Pro Max still fills Safari's sheet afterward. iPad support is retained; Mac sizing is unchanged.
- Safari: Pro Max presets, same-origin frames, dynamic video, and player-reset recovery passed. An unchanged frame-site storage entry could undo a popup speed; focused fix has red/green executable coverage, but final live cross-origin retest remains unverified. Mac one-shot keyboard shortcuts passed; custom-speed/persistence needs a controlled single-build retest because several local extension copies are registered.
- Mac StoreKit: all tips, repeat purchase, failure/retry and product-load failure/recovery passed with Xcode dialogs disabled. Interactive system purchase/cancel remained blocked by a malformed/unresponsive sheet. An approved pending transaction remained unfinished across relaunch; another same-run approval eventually finished. These remain release gates, not blanket StoreKit approval.
- Remaining: full smaller-phone Safari pass, touch/software keyboard, complete persistence/cross-frame tests, German/Arabic visual layouts, VoiceOver/Reduce Motion, interrupted purchases, Safari-to-app cold/warm handoffs, and external device/sandbox checks. Simulator gestures/coordinates were unreliable even on ordinary Safari pages. StoreKit failure settings and temporary diagnostics were reset/removed.
- Pro Max 1320×2868 and iPad 2064×2752 native captures match accepted dimensions but contain alpha. Computer-use captures are window-sized JPEG evidence (some early filenames end in .png), not store-ready screenshots. No complete screenshot set is approved.
- Detailed scenario status, evidence, and reproducible fixture instructions: `build/release-check/REPORT.md` (local, git-ignored), with logs, screenshots, transactions, and isolated builds in the same directory.

Do not treat a successful Mac build as proof that the iPhone and iPad extension works. Before release, test macOS 13 and a current macOS release, plus iPhone and iPad on iOS/iPadOS 16 and a current release.

Cover ordinary videos, embedded frames, dynamically inserted videos, live streams, navigation, tab changes, fullscreen playback, speed lock, and temporary boost. Test the Apple action strip with mouse, keyboard, touch, VoiceOver, increased text size, dark appearance, and Reduce Motion.

## Firefox Android

The Firefox ZIP is used for both desktop and Android; no separate AMO listing is needed. Before uploading it:

1. Install `dist/simple-video-speed-controller-firefox.zip` in Firefox Android 120 and the current release.
2. Test at approximately 360 x 640 dp and at tablet size.
3. Verify popup scrolling, 44-pixel controls, storage, tab changes, embedded video, livestream handling, temporary boost cleanup, and recovery after Android terminates the extension process.
4. Run `web-ext lint --source-dir dist/firefox` and resolve Android compatibility findings.
5. Upload the new version to the existing AMO listing and mark it compatible with Android.

The source manifest retains Mozilla's required built-in `none` data-collection declaration. The generated Firefox manifest adds an empty `gecko_android` object, which is Mozilla's current documented form for Android availability without imposing a version range. This avoids falsely claiming the data-collection manifest key existed in Android 120 while keeping the existing AMO listing discoverable on Android. Firefox 120 remains a device-testing gate because current tooling cannot prove runtime behavior on that historical version.

The final Firefox artifact was also installed temporarily in Firefox 154.0.1 on a Pixel 7 Pro. The popup rendered in Firefox's Android extension overlay and selecting 2x changed a real HTML5 video's reported playback rate from 1 to 2. Firefox 120 and tablet-size verification remain release gates.
