# Apple and Firefox Android Release Guide

This repository contains one universal Apple product with iPhone, iPad, and Mac targets, plus one Safari Web Extension. Chromium and Firefox keep their existing review and Ko-fi controls. The Safari toolbar popup contains the video controls, a compact user-initiated App Store rating link, and a compact “Support options” handoff to the containing app. All StoreKit products, prices, explanations, and purchases remain in the containing Apple app.

## Local build

Requirements:

- A current Node.js release
- The `zip` command-line utility
- A current Xcode installation with the iOS platform installed

Run:

```sh
npm test
npm run build:apple
```

The Apple command creates all three extension packages, regenerates the Apple icons from the existing extension artwork, and compiles unsigned macOS and iOS Simulator apps. Open the Xcode project at:

```text
apple/Simple Video Speed Controller/Simple Video Speed Controller.xcodeproj
```

Signed App Store archives are intentionally not automated. The project is configured for the personal Chase Olson team (`QG4CBM3K89`) with automatic signing on all four targets. Verify that team is still selected in Xcode, then create separate iOS and macOS archives with Product > Archive.

## Apple identifiers and versions

- App bundle ID: `app.chaseos.SimpleVideoSpeedController`
- Extension bundle ID: `app.chaseos.SimpleVideoSpeedController.Extension`
- Marketing version: `1.15`
- Build number: `1`
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

For local tests, open Product > Scheme > Edit Scheme > Run > Options in Xcode and select `Configurations/TipProducts.storekit` as the StoreKit configuration. Exercise success, cancellation, pending approval, product-loading failure, retry, unverified transaction, and purchase failure. Then create a Sandbox Apple Account and complete sandbox purchases on both iOS/iPadOS and macOS.

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
