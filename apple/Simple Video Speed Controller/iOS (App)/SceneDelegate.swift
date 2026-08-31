//
//  SceneDelegate.swift
//  iOS (App)
//
//  Created by Chase on 8/29/26.
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let _ = (scene as? UIWindowScene) else { return }
        if let url = connectionOptions.urlContexts.first?.url {
            AppleAppLinkRouter.shared.handle(url)
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        TipStore.shared.reconcileUnfinishedTransactions()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        AppleAppLinkRouter.shared.handle(url)
    }

}
