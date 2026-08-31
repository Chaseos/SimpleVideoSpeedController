//
//  AppDelegate.swift
//  iOS (App)
//
//  Created by Chase on 8/29/26.
//

import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    private let tipStore = TipStore.shared
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        tipStore.reconcileUnfinishedTransactions()
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

}
