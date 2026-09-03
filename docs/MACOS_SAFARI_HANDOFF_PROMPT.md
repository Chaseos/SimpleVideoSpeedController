# macOS Safari / Mac App Store implementation prompt

Prepare the browser extension in the current working repository for macOS Safari and Mac App Store distribution. Implement and test it, and perform the app-specific Apple portal setup through my Chrome browser where tools permit. This is an execution request, not a request for a tutorial or a checklist for me to carry out.

## Working mode and authorization

Inspect the current repository, its instructions, uncommitted work, existing UI, localization, tests, and build scripts first. Inspect the reference below next. Produce a short repository-specific plan, then implement it without waiting for another “yes” for ordinary in-scope work.

- Use the available Chrome-control skill/tools to operate my existing Chrome session for Apple Developer and App Store Connect. Read the skill before using it. Inspect existing tabs and signed-in account/team context; do not create duplicate records or make me repeat completed setup.
- Use the computer-use skill for Xcode, Organizer, Safari, native app UI, and TestFlight. Use normal file/build tools for local development. Chrome is for portal work and browser-specific checks; it cannot establish that a Safari extension or native purchase sheet works.
- Navigate, fill forms, save app-specific draft metadata, register approved identifiers, and create approved app/product records yourself. This prompt authorizes those setup actions for this project once their identity and commercial values are established. Confirm ambiguous or irreversible identifiers, SKU, pricing, availability, and other missing product decisions together before creating records. Reuse values I have already approved; do not ask for approval on every click.
- Never guess account/team selection. Let me personally handle passwords, 2FA, CAPTCHA, legal agreements, banking/tax information, identity/trader verification, and declarations requiring my attestation. Ask for required tool or system permissions at the point of action; do not bypass them.
- If browser control is unavailable, request the required connection/permission and continue independent local work. Give manual steps only for the specific blocked action, not as a substitute for doing the rest yourself.
- Do not commit, push, publish support pages, archive/upload a distribution build, invite testers, submit for review, or release publicly without explicit authorization for that action. When authorized, execute it yourself through the appropriate tools and verify the result. These are separate authorization boundaries, not reasons to stop earlier implementation/setup work.
- Keep unrelated apps, portal records, repositories, installations, and user data untouched. Do not revoke certificates, remove development copies, reset transaction history, or sign me out of accounts to simplify testing without approval.
- Keep concise progress updates and record completed actions. If blocked, state the exact missing decision/action and continue anything independent. Do not end with “now you should…” when you can safely do the next step yourself.

## Reference implementation: inspect and adapt, do not blindly clone

Use this local repository read-only as the concrete implementation and visual reference:

`/Users/chase/Documents/ChaseosApps/SimpleVideoSpeedController`

The Mac purchase hardening is in commit `2a397da` (`Improve Mac StoreKit presentation and transaction lifecycle`). Inspect current code and subsequent changes, not just that commit. Do not change or check out another revision in the reference repository. If the reference is unavailable, say so; do not claim to have inspected it.

Read these paths relative to that reference root:

| Reference | What to learn/adapt |
| --- | --- |
| `APPLE_RELEASE.md` | Product structure, release gates, actual test outcomes, and unresolved issues. |
| `build/release-check/MAC_PURCHASE_RETEST.md` and `REPORT.md`, if present | Local, git-ignored runtime evidence and limitations. Their absence is not a pass. |
| `scripts/build.mjs` | Runtime-file allowlists, Safari-only transformations, action-link markup/localizations, forbidden-content validation, and name overrides. |
| `platforms/safari/popup.css` | Compact Mac star/heart UI, colors, subdued idle state, hover/focus expansion, and visible focus. Do not copy mobile rules. |
| `apple/Simple Video Speed Controller/Shared (App)/ViewController.swift` | `AppleConfiguration`, `AppleAppLinkRouter`, `SupportActionStrip`, `TipStore`, `TipSheet`, and AppKit presentation. Extract Mac behavior only. |
| `apple/Simple Video Speed Controller/macOS (App)/AppDelegate.swift` | App-owned StoreKit listener/reconciliation and URL routing. |
| `apple/Simple Video Speed Controller/Shared (App)/Resources/` | Lightweight setup screen and Safari settings handoff. |
| `apple/Simple Video Speed Controller/Configurations/` | Shared numeric App Store ID and local consumable configuration patterns, not reusable identity values. |
| `apple/Simple Video Speed Controller/Simple Video Speed Controller.xcodeproj/xcshareddata/xcschemes/` | Separate normal Mac and local StoreKit-testing schemes. |
| `scripts/build-apple.mjs`, `scripts/generate-apple-icons.swift` | Reproducible Apple preparation and icon generation. The reference builds iOS too; the target script must be Mac-only and support Debug/Release explicitly. |
| `tests/build.test.js`, `tests/apple-project.test.js`, other relevant tests | Existing packaging/source checks and executable behavior-test conventions. |

Before implementation, name the patterns you will reuse and those you must adapt. Mimic the reference's Apple support/rating interaction and lightweight native app, not its video controls or every implementation detail. View its UI or existing screenshots when available; verify the target UI visually afterward. Do not launch/change the reference app simply to obtain a comparison without checking whether it is in use.

The reference is not a certified template or App Review approval. Its native code is concentrated in one large file; place configuration, routing, purchase state, and views in focused files if that fits the target repository. Reuse existing target helpers instead of creating parallel implementations.

Never copy the reference's app name, bundle IDs, numeric Apple ID, URL scheme, product IDs, SKU, artwork, public URLs, or signing identity/team without separately establishing that they belong to this target project.

## Scope and product decisions

- macOS Safari only: no iPhone/iPad targets, mobile popup rules, or Firefox Android work.
- Preserve existing Chrome, Firefox, and other browser behavior, packaging, branding, Ko-fi/review UI, tracking associated with those flows, and cross-promotion. Remove those Apple-inappropriate flows only from the Safari artifact.
- Isolate differences through platform code/resources and the existing build pipeline; do not maintain a duplicate extension. Platform separation does not mean creating a Git branch.
- Preserve unrelated UI and user changes. No redesign, unrelated refactor, dependency churn, or new artwork. Generate required Apple icon sizes from this project's existing artwork.
- Inspect configuration before asking questions. Collect missing app/listing name, app/extension IDs, support scheme, primary language, SKU, Apple version/build, minimum macOS, architectures, category, pricing/countries, public support/privacy URLs, and tip metadata in one concise batch.
- Keep shared identity/configuration in one source of truth. Development may proceed with clearly unavailable features while a value is missing, but release validation must fail for unresolved identifiers/placeholders. Do not ship another project's values or silently invent them.

## Safari artifact and UI

Adapt an existing valid Xcode project rather than regenerating over customizations. Otherwise use Apple's current Safari Web Extension conversion tooling. Track a containing Mac app and embedded Safari Web Extension under an appropriate Apple directory.

Use a runtime-file allowlist. Include required scripts, styles, icons, localizations, and licenses; exclude tests, development docs, previews, logs, credentials, and unrelated assets. Audit Safari API compatibility, background lifecycle, messaging, storage, content scripts, CSP, and permissions. Request the sites this extension actually needs, not the reference's broad website access by default.

Remove from Apple output only: Ko-fi/external donation widgets, other-browser store-review prompts and engagement tracking, cross-promotion of other extensions, irrelevant onboarding, and their unused strings/scripts/assets. Keep genuine help, privacy, and license content.

Provide the reference-style compact, user-initiated actions:

- Star, “Rate this app”: open this app's direct write-review destination, `https://apps.apple.com/app/id<APP_STORE_ID>?action=write-review`. No automatic review request, incentives, or engagement prompt. Explain missing ID/unpublished destination honestly during development.
- Heart, “Support options”: open the containing app's native support sheet. No product names, prices, purchase buttons, or tip sales copy inside the Safari popup.

Match the reference's gold star/red heart, compact placement, subdued idle appearance, label expansion on hover/keyboard focus, and subtle motion where appropriate. Preserve this extension's existing control layout and sensible popup width: do not blindly hardcode the reference's 282px width or English-only expanded label widths. Verify long translations and contrast; accessibility takes precedence over copying exact opacity.

Use native `star.fill`/`heart.fill` SF Symbols and lightweight web equivalents. Provide accessible names, keyboard activation, visible focus, and Reduce Motion behavior. Do not autofocus custom inputs on popup open or section expansion.

Check current [App Review Guidelines §4.4](https://developer.apple.com/app-store/review/guidelines/#extensions). The support/rating handoff is a requested design, not guaranteed approval: extension marketing/IAP restrictions still matter when payment is in the containing app. Disclose it accurately. If review objects, ask about a neutral Open App/help action rather than silently changing the product.

## Native Mac app and support routing

Keep setup lightweight: extension status, Safari enablement/settings access, website-permission instructions, and the reference-style native rating/support strip. Distinguish disabled extension, missing website permission, and a page needing reload. Do not claim permission states unavailable to the app.

Implement a unique, validated support URL route. Bring the correct window forward, wait for presentation readiness, and coalesce duplicate requests. Test cold and warm launches. The route may open support UI, never initiate a purchase or execute arbitrary URL-supplied actions.

Build an accessible, scrollable native tip sheet with aligned descriptions/prices, a proper title, and working Done/Escape behavior. Ensure every control remains reachable with long text and accessibility settings.

## Mac StoreKit implementation, including the latest reference changes

Use optional StoreKit 2 consumable tips. Propose amounts if needed—the reference's US $0.99/$2.99/$4.99 are examples requiring approval, not defaults to register silently. Tips must be repeatable and unlock no feature, content, status, or persistent benefit. Use StoreKit-localized names and prices.

Adapt the Mac changes in `2a397da` deliberately:

1. Supply the visible support sheet's `NSWindow` to `product.purchase(confirmIn:options:)` on macOS 15.2+, checking the installed SDK/API availability. Retain a supported fallback for earlier deployment targets. Resolve the window at purchase time through a weak provider; if no suitable window is visible, recover with an actionable message. Clear the provider when the sheet closes.
2. Present a plain `NSViewController`/`NSView` AppKit sheet container with the `NSHostingController` as a child and its view constrained to the container edges. This avoided the observed unsupported insertion of `NSRemoteView` directly into a SwiftUI-owned hosting root. Size it from content and verify actual layout.
3. A nested hosting controller did not surface the original SwiftUI toolbar Done button. Put the Mac dismissal control in an explicit content header or another verified native location. Test it; do not assume a toolbar exists because it compiles. Prevent unsafe dismissal during an active purchase without leaving the app trapped after cancellation/error.
4. Own the transaction store at app lifetime, not sheet/window lifetime. Start `Transaction.updates` at launch; reconcile `Transaction.unfinished` at launch and on app activation, with no overlapping recovery scans. AppDelegate and support UI must use the same store.
5. Route direct purchase results, updates, and recovery through shared verification/product-ID checking and idempotent completion. Finish accepted, verified tip transactions, including those delivered without a support sheet. Do not credit pending/unverified results, finish unrelated products, or use current entitlements to recover consumables.

Also handle product loading, missing/partial products, retry, unavailable purchases, cancellation, pending approval, failure, unverified results, success, and repeats. Guard concurrent purchase attempts at the store boundary, not only by disabling buttons. Avoid permanently caching failed/empty loads, stale progress indicators, or success messages that imply another pending transaction finished. Reset in-flight state on every terminal path. No tip backend/account/analytics or Restore Purchases button is needed for consumables without lasting benefits; preserve restoration for other restorable products if already present.

Important evidence boundary: these changes did NOT fully fix the reference's Mac purchases. On macOS 26.6.2 / Xcode 26.6, the hosting-view warning disappeared, Done worked, all three tips/repeats finished with dialogs disabled, and a fresh externally created transaction finished. But the real local purchase sheet still had a blank Purchase-button area, and a newly approved pending transaction remained unfinished across relaunch. Do not describe the reference as a working end-to-end donation template or attribute the remaining failures to Apple without evidence.

Create a dedicated shared local StoreKit-testing scheme/configuration. Normal launch schemes must be unbound to it; normal Archive uses Release. Verify the Xcode/local environment before purchases. Test actual confirmation/cancel UI as well as transaction logic; dialogs-disabled success cannot pass checkout UI. If the same problems recur, isolate with a minimal native Mac StoreKit sample and inspect supported diagnostics before adding speculative workarounds. Compare with sandbox/TestFlight when authorized. Never hide the failure, disable real confirmation in production, or delete transaction history to manufacture a pass.

## Apple-specific build and validation commands

Implement reproducible commands in this project's existing tooling, with clear names such as `prepare:apple`, `build:apple:debug`, `build:apple:release`, and `test:apple` or equivalent documented flags. Actually wire and run them; documentation alone is insufficient.

- Preparation regenerates Safari resources and Apple icon sizes deterministically. Fail clearly if a required transformation cannot be applied.
- Mac Debug and Release builds use isolated output directories. Do not copy the reference script's iOS build step. Validate the intended Intel/Apple Silicon architectures.
- Separate ordinary unsigned compilation, development-signed runtime builds, distribution archives, and uploads. Never upload as a build/test side effect.
- Validate the generated Safari package and built app: manifest/localization references, required resources/icons, embedded extension, identifiers, App Sandbox, signing, deployment targets, app category (`LSApplicationCategoryType`), and matching Apple app/extension versions/builds.
- Carry forward a regression guard for the reference's localized Safari extension names exceeding 40 characters. Treat it as a reference validation lesson and verify current tooling requirements; keep it distinct from the App Store listing's name constraint. Apply any shortening only in Apple localizations.
- Scan output for unwanted donation/review/promotion flows and foreign app identifiers. Permit this app's legitimate Apple rating link and help/privacy/licenses. Preserve non-Apple outputs with regression checks.
- Before distribution, verify current Apple Xcode/SDK and metadata requirements. Inspect a freshly generated archive: editing source does not update an older Organizer archive. Use a new Apple build number when replacing an uploaded build without unnecessary browser-version changes.

Audit actual data flows before privacy/export-compliance work. Do not copy “Data Not Collected,” required-reason API/privacy manifest declarations, or encryption answers without evidence. Local preferences and browser permissions are not automatically developer data collection; inspect transmissions and dependencies. Keep secrets, private keys, provisioning material, receipts, personal screenshots, raw sensitive logs, DerivedData, and archives out of version control. Public IDs are not private signing keys. Escalate exposed secrets for revocation; deleting a file alone is insufficient.

## Execute Apple portal setup through Chrome

Use current official documentation and the visible portal state, not memorized screen labels. Within the authorization above, perform and verify these steps yourself:

1. Inspect account/team and existing setup. Reuse completed account-wide agreements, banking/tax and trader setup. Report anything requiring my personal action without attempting legal acceptance or entering financial/identity details for me.
2. Verify or register this app's explicit app and extension IDs. Configure the correct Xcode signing team. Check actual StoreKit requirements; do not invent an entitlement because an In-App Purchase capability row is absent or repeatedly request an already-enabled service.
3. Find or create the one macOS app record using approved identity values; no iOS platform or separate extension listing. Set approved category/pricing/availability, retrieve its numeric Apple ID, update shared review-link configuration, and rebuild.
4. Find or create each approved consumable with exactly matching runtime/local-test product IDs. Fill product localizations, descriptions, pricing, availability, review screenshots and explanatory notes. Read back status; created is not approved. Do not duplicate existing products.
5. Draft/fill listing text, keywords, copyright, support/privacy links, compatibility statements and review instructions grounded in this app. Prepare evidence-based proposed privacy, age-rating, content-rights and export answers; obtain my confirmation for attestations rather than guessing. Do not imply affiliation with third-party services.
6. Capture real Safari/native app screenshots. Validate current accepted dimensions, format and transparency rules; diagnostic images are not automatically store-ready. Distinguish listing screenshots from IAP review screenshots. Supply exact enablement/permission/test steps and an authorized review path if a third-party account/subscription is needed.
7. Once archive/upload is explicitly authorized: regenerate resources, run gates, use the normal Mac scheme and Xcode Organizer, verify the fresh archive's identity/version/build, and validate/upload to App Store Connect—not Developer ID/notarization. Report actual upload completion separately from processing. Re-archive after fixes. Check processing only when in scope; use supported waiting/monitoring for later checks rather than claiming to watch after the task ends.
8. Once tester setup is authorized: configure the requested TestFlight group/test information and any required beta review. Use TestFlight to install the selected build and test the real Safari flow; perform UI steps yourself where possible. Do not add testers or submit beta review without authorization.
9. Test tip products through an explicitly verified test environment. Distinguish Xcode-local, TestFlight sandbox, and separate Sandbox Apple Account tests. Do not purchase in production or needlessly sign me out of my primary account. Verify real product loading, cancellation, repeats and transaction recovery; local configuration success does not validate App Store Connect products/agreements.
10. Only after separate submission authorization, select the tested build and prepare/submit the initial consumables with the app version as current Apple requirements dictate. Confirm release timing. Upload, adding for review, submitting and public release are distinct actions.

When an approval boundary is reached, present the exact app/build/action and ask once. After approval, do the work rather than returning a walkthrough.

## Runtime tests, fixes, and completion

Run existing tests plus focused regressions, then Mac Debug/Release builds. Operate actual Safari and the native app. Cover:

- Enablement, denied/granted site access, popup reopening/sizing/expanded sections, keyboard focus, persistence across refresh/navigation/tabs/restart, frames where relevant, and this extension's actual features.
- Native setup, support/rating actions, cold/warm support deep links, duplicate link requests, and dismissal.
- Keyboard, VoiceOver where tooling permits, larger text, long/RTL locales, light/dark appearance, contrast and Reduce Motion. Record limitations instead of substituting source inspection.
- Each local tip, repeats, real confirmation, cancellation, purchase/product-loading failures and recovery, pending approval/decline, interruptions, and transaction delivery while the sheet is closed and across app relaunch. Inspect transaction completion, not just thank-you text. A clean build or successful API return is not sufficient UI evidence.

Make focused fixes for reproduced bugs and rerun affected scenarios. Escalate product decisions and platform limitations, not ordinary implementation work. Do not claim old macOS support from a newer-system build; mark unavailable environments unverified.

Save sanitized screenshots, logs, transaction evidence and a scenario-by-scenario report under the target repository's ignored `build/release-check/`. Mark each scenario passed, failed, blocked or unverified, with environment and evidence. Separate executable tests, source assertions, local StoreKit, and sandbox/TestFlight results. Update a tracked repository-specific Apple release checklist with dated findings. Reset simulated failures, Ask to Buy/interruptions and other temporary settings, remove diagnostics, and preserve user installations/data.

Finish with a concise account of implemented changes, commands/results, portal actions actually completed, exact remaining blockers, and any specific approval/action needed from me. List remaining tool-executable work as your next work, not homework for me. Do not declare release readiness merely because a build or upload succeeded.

Official starting points to verify at execution time: [Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions), [StoreKit window-anchored purchase](https://developer.apple.com/documentation/storekit/product/purchase%28confirmin%3Aoptions%3A%29-8eai6), [transaction updates](https://developer.apple.com/documentation/storekit/transaction/updates), [unfinished transactions](https://developer.apple.com/documentation/storekit/transaction/unfinished), [App Store Connect Help](https://developer.apple.com/help/app-store-connect/), and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
