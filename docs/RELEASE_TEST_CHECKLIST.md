# Release test handoff — August 31, 2026

The current source is prepared for hands-on testing, not approved for public release. Nothing was committed, uploaded, or published in this pass. The previously uploaded iOS build 3 does not contain these changes.

## Companion-app screen update

Rebuild/run to see the new iPhone/iPad setup and usage guide. Check that you can scroll to Help and Privacy, expand them, and still reach the native Rate/Support controls. On Mac, check the compact status/Settings screen and short toolbar hint. Purchase and app-opening behavior have not changed in this layout pass.

## Current status: iPad heart

Mac and iPhone donations are user-confirmed working. The user also confirms the iPad support page successfully opens the app; an iPad donation has not yet been reported. Dismissing the iPad extension popup after the heart tap did not fix the empty-tab problem; that attempted fix has been removed.

The updated page now identifies Simple Video Speed Controller, explains that tips are optional and payments are handled by Apple, and clarifies that opening the app does not make a purchase.

The iPad heart opens a bundled support page with an **Open Simple Video Speed Controller** button. The app link is tapped from a regular Safari tab, rather than the extension popup. This adds one tap on iPad only. No automatic redirect, new permissions, external server, or purchase changes are involved.

1. Build and Run the updated **StoreKit Testing (iOS)** scheme on the iPad. An older installed/TestFlight build does not contain this change.
2. Return to Safari, reopen the extension popup, and tap its heart. You should see the support page with **Open Simple Video Speed Controller**.
3. Tap that button and accept Safari's “Open” confirmation if shown. Check that the donation sheet appears. Repeat with the app already running and after closing it. No repeat donation is needed for this link check.

If it fails, report whether the support page appeared and what happened when its button was tapped. A screenshot of that state will distinguish a stale extension from an app-link failure. No need to repeat the full test list yet.

## First round: Mac

1. In the **Simple Video Speed Controller** Xcode project, select **StoreKit Testing (macOS)** and Run. Leave the Paramount Quality+ project alone. Open the heart / Support options.
2. Select Small Tip. **Continue only if the purchase dialog identifies the Xcode testing environment and says you will not be charged.** Check that Purchase appears and completes, then buy the same tip again. Expect responsive tip buttons after each purchase.
3. Start another tip and cancel. Expect the support sheet to remain usable; Done should close it, and reopening it should work.
4. Reload the Safari video tabs to load the rebuilt extension. Paramount should stop at 2× and show “Safari limits this video to 2× for smooth playback.” Disney+, Netflix, HBO Max, and YouTube should still allow 3× on the videos you previously tested. Check audio as well as motion.

Send the first failing step, what happened, and a screenshot if useful. Stop there so we can fix it before expanding the test pass.

## Next round, after the first passes

- In Xcode's local transaction manager, test pending approval and approval after relaunch. Verified tips should finish without opening Support options; unrelated pending purchases should not be reported as completed. Reset simulated errors, Ask to Buy, and interruptions afterward.
- Safari: set a custom speed (e.g. 2.35× on an unrestricted video), reload, and verify persistence. Test temporary boost and restoration, speed lock, embedded frames, and navigation. Open Support from Safari with the containing app both closed and already running.
- Run **StoreKit Testing (iOS)** on iPhone and iPad. Repeat purchase/cancel/repeat, then test Safari controls, the software keyboard, portrait/landscape, and scrolling to every control at the largest text size.
- Check VoiceOver, Reduce Motion, dark appearance, and German/Arabic layouts.

## What has been checked automatically

- 73 JavaScript behavior, packaging, and metadata checks passed.
- 8 native Swift transaction-model tests passed, including duplicate delivery, cancellation, retry, pending-state isolation, and recovery of verified unfinished transactions without opening the tip sheet. These use a fake commerce provider; they do not prove Apple's checkout UI works.
- Development-signed Mac Debug, unsigned iOS Simulator Debug, universal Mac Release, and iOS device Release builds passed. Release compile checks are unsigned and are not distribution archives.
- The original local StoreKit configuration is unchanged. The temporary diagnostic process was stopped. The Paramount Quality+ project was used as a read-only implementation reference; its active development session was not stopped.

Physical-device/minimum-OS checks, real sandbox/TestFlight checkout, store screenshots/metadata, and account-owner compliance remain release gates. Test the current source locally before preparing a new numbered distribution build.
