//
//  AppDelegate.swift
//  macOS (App)
//
//  Created by Chase on 8/29/26.
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    private let tipStore = TipStore.shared

    func applicationDidFinishLaunching(_ notification: Notification) {
        tipStore.reconcileUnfinishedTransactions()
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        tipStore.reconcileUnfinishedTransactions()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls where AppleAppLinkRouter.shared.handle(url) {
            NSApp.activate(ignoringOtherApps: true)
            break
        }
    }

}
