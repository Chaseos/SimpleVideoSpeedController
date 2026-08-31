import Combine
import Foundation
import StoreKit
import SwiftUI
import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

enum AppleConfiguration {
    static let extensionBundleIdentifier = "app.chaseos.SimpleVideoSpeedController.Extension"
    static let appURLScheme = "simplevideospeedcontroller"

    static let appStoreID: String = {
        guard let url = Bundle.main.url(forResource: "AppStoreID", withExtension: "txt"),
              let value = try? String(contentsOf: url, encoding: .utf8) else {
            return ""
        }
        return value.trimmingCharacters(in: .whitespacesAndNewlines)
    }()

    static let tipProductIDs = [
        "app.chaseos.SimpleVideoSpeedController.tip.small",
        "app.chaseos.SimpleVideoSpeedController.tip.standard",
        "app.chaseos.SimpleVideoSpeedController.tip.generous"
    ]

    static var reviewURL: URL? {
        guard !appStoreID.isEmpty else { return nil }
        return URL(string: "https://apps.apple.com/app/id\(appStoreID)?action=write-review")
    }
}

@MainActor
final class AppleAppLinkRouter {
    static let shared = AppleAppLinkRouter()

    private weak var viewController: ViewController?
    private var supportRequestPending = false

    private init() {}

    func attach(_ viewController: ViewController) {
        self.viewController = viewController
        presentPendingSupportRequestIfPossible()
    }

    func viewDidAppear() {
        presentPendingSupportRequestIfPossible()
    }

    @discardableResult
    func handle(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == AppleConfiguration.appURLScheme,
              url.host?.lowercased() == "support" else {
            return false
        }

        supportRequestPending = true
        presentPendingSupportRequestIfPossible()
        return true
    }

    private func presentPendingSupportRequestIfPossible() {
        guard supportRequestPending,
              let viewController,
              viewController.isReadyForPresentation else {
            return
        }

        supportRequestPending = false
        viewController.presentSupportOptions()
    }
}

@MainActor
final class ActionStripModel: ObservableObject {
    @Published var isExpandedOnTouch = false

    func collapse() {
        isExpandedOnTouch = false
    }
}

private enum SupportAction: Hashable {
    case rate
    case support

    var title: String {
        switch self {
        case .rate: return "Rate this app"
        case .support: return "Support my work"
        }
    }

    var symbolName: String {
        switch self {
        case .rate: return "star.fill"
        case .support: return "heart.fill"
        }
    }

    var color: Color {
        switch self {
        case .rate: return Color(red: 1.0, green: 0.784, blue: 0.341)
        case .support: return Color(red: 1.0, green: 0.353, blue: 0.373)
        }
    }

    var expandedWidth: CGFloat {
        switch self {
        case .rate: return 126
        case .support: return 148
        }
    }
}

private struct SupportActionStrip: View {
    @ObservedObject var model: ActionStripModel
    let rateAction: () -> Void
    let supportAction: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOverEnabled
    @State private var hoveredAction: SupportAction?
    @State private var poppingAction: SupportAction?
    @FocusState private var focusedAction: SupportAction?

    var body: some View {
        HStack(spacing: 8) {
            actionButton(.rate, action: rateAction)
            actionButton(.support, action: supportAction)
        }
        .padding(6)
        .background(.ultraThinMaterial, in: Capsule())
        .shadow(color: .black.opacity(0.16), radius: 10, y: 4)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: hoveredAction)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: focusedAction)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: model.isExpandedOnTouch)
    }

    private func actionButton(_ action: SupportAction, action perform: @escaping () -> Void) -> some View {
        let expanded = isExpanded(action)

        return Button {
#if os(iOS)
            if !voiceOverEnabled && !model.isExpandedOnTouch {
                model.isExpandedOnTouch = true
                pop(action)
                return
            }
#endif
            perform()
        } label: {
            HStack(spacing: 7) {
                Image(systemName: action.symbolName)
                    .font(.system(size: 24, weight: .semibold))
                    .frame(width: 24, height: 24)
                    .scaleEffect(!reduceMotion && poppingAction == action ? 1.16 : 1)
                    .rotationEffect(.degrees(!reduceMotion && poppingAction == action ? 8 : 0))

                if expanded {
                    Text(action.title)
                        .font(.system(size: 12, weight: .semibold))
                        .lineLimit(1)
                        .transition(.move(edge: .leading).combined(with: .opacity))
                }
            }
            .foregroundStyle(action.color)
            .frame(maxHeight: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(width: expanded ? action.expandedWidth : 44, height: 44)
        .background(action.color.opacity(expanded ? 0.12 : 0), in: Capsule())
        .overlay {
            Capsule().stroke(
                focusedAction == action ? action.color : action.color.opacity(expanded ? 0.48 : 0),
                lineWidth: focusedAction == action ? 2 : 1
            )
        }
        .focused($focusedAction, equals: action)
        .accessibilityLabel(action.title)
        .help(action.title)
        .onHover { hovering in
            hoveredAction = hovering ? action : (hoveredAction == action ? nil : hoveredAction)
            if hovering { pop(action) }
        }
    }

    private func isExpanded(_ action: SupportAction) -> Bool {
#if os(iOS)
        model.isExpandedOnTouch
#else
        hoveredAction == action || focusedAction == action
#endif
    }

    private func pop(_ action: SupportAction) {
        guard !reduceMotion else { return }
        poppingAction = action
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(220))
            if poppingAction == action {
                withAnimation(.easeOut(duration: 0.23)) {
                    poppingAction = nil
                }
            }
        }
    }
}

private struct TipSheet: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ObservedObject var store: TipStore
    let dismissAction: () -> Void

    var body: some View {
        Group {
#if os(macOS)
            VStack(spacing: 0) {
                HStack {
                    Text("Support my work")
                        .font(.title2.bold())
                        .accessibilityAddTraits(.isHeader)
                    Spacer()
                    Button("Done", action: dismissAction)
                        .keyboardShortcut(.cancelAction)
                        .disabled(store.purchasingProductID != nil)
                }
                .padding(24)
                Divider()
                sheetContent
            }
            .frame(minWidth: 420, idealWidth: 480, minHeight: 340, idealHeight: 460)
#else
            NavigationStack {
                sheetContent
                    .navigationTitle("Support my work")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done", action: dismissAction)
                        }
                    }
            }
#endif
        }
        .task { await store.loadProducts() }
    }

    private var sheetContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
#if os(iOS)
                    Text("Support my work")
                        .font(.title2.bold())
#endif
                    Text("Tips are optional and help support continued development. They do not unlock features or content.")
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if store.isLoading {
                    HStack {
                        Spacer()
                        ProgressView("Loading tip options…")
                        Spacer()
                    }
                    .frame(minHeight: 120)
                } else if store.products.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "heart.slash")
                            .font(.system(size: 34))
                            .foregroundStyle(.secondary)
                        Text("Tips unavailable")
                            .font(.headline)
                        Text(store.loadMessage ?? "The App Store did not return any tip options.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Button("Try Again") {
                            Task { await store.loadProducts() }
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 150)
                } else {
                    VStack(spacing: 10) {
                        ForEach(store.products, id: \.id) { product in
                            Button {
                                Task { await store.purchase(product.id) }
                            } label: {
                                let layout = dynamicTypeSize.isAccessibilitySize
                                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                                    : AnyLayout(HStackLayout(spacing: 12))
                                layout {
                                    Image(systemName: "heart.fill")
                                        .foregroundStyle(Color(red: 1.0, green: 0.353, blue: 0.373))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(product.displayName)
                                            .fontWeight(.semibold)
                                        Text(product.description)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                            .multilineTextAlignment(.leading)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    if store.purchasingProductID == product.id {
                                        ProgressView()
                                    } else {
                                        Text(product.displayPrice)
                                            .fontWeight(.semibold)
                                            .fixedSize()
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
                                .background(.secondary.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .disabled(store.purchasingProductID != nil)
                        }
                    }
                }

                if store.missingProducts && !store.products.isEmpty && !store.isLoading {
                    Button("Try Again") { Task { await store.loadProducts() } }
                        .disabled(store.purchasingProductID != nil)
                }
                if let deliveryMessage = store.deliveryMessage {
                    Text(deliveryMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                if let statusMessage = store.statusMessage, !store.products.isEmpty {
                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }

            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

@MainActor
final class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {
    @IBOutlet private var webView: WKWebView!

    private let actionStripModel = ActionStripModel()
    private let tipStore = TipStore.shared

#if os(iOS)
    private var actionStripController: UIHostingController<SupportActionStrip>?
#elseif os(macOS)
    private var actionStripController: NSHostingController<SupportActionStrip>?
    private var tipWindow: NSWindow?
#endif

    override func viewDidLoad() {
        super.viewDidLoad()

        webView.navigationDelegate = self
        webView.configuration.userContentController.add(self, name: "controller")
        webView.loadFileURL(
            Bundle.main.url(forResource: "Main", withExtension: "html")!,
            allowingReadAccessTo: Bundle.main.resourceURL!
        )
        installActionStrip()
        AppleAppLinkRouter.shared.attach(self)
    }

#if os(iOS)
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        AppleAppLinkRouter.shared.viewDidAppear()
    }
#elseif os(macOS)
    override func viewDidAppear() {
        super.viewDidAppear()
        AppleAppLinkRouter.shared.viewDidAppear()
    }
#endif

    var isReadyForPresentation: Bool {
        isViewLoaded && view.window != nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        webView.evaluateJavaScript("show('ios')")
#elseif os(macOS)
        webView.evaluateJavaScript("show('mac')")

        SFSafariExtensionManager.getStateOfSafariExtension(
            withIdentifier: AppleConfiguration.extensionBundleIdentifier
        ) { state, error in
            guard let state, error == nil else { return }

            DispatchQueue.main.async {
                webView.evaluateJavaScript("show('mac', \(state.isEnabled), true)")
            }
        }
#endif
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let action = message.body as? String else { return }

        switch action {
        case "open-preferences":
            openExtensionSettings()
        case "collapse-actions":
            actionStripModel.collapse()
        default:
            break
        }
    }

    private func installActionStrip() {
        let rootView = SupportActionStrip(
            model: actionStripModel,
            rateAction: { [weak self] in self?.openReviewPage() },
            supportAction: { [weak self] in self?.presentTipSheet() }
        )

#if os(iOS)
        let hostingController = UIHostingController(rootView: rootView)
        hostingController.view.backgroundColor = .clear
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -18)
        ])
        actionStripController = hostingController
#elseif os(macOS)
        let hostingController = NSHostingController(rootView: rootView)
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -18)
        ])
        actionStripController = hostingController
#endif
    }

    private func openReviewPage() {
        actionStripModel.collapse()
        guard let reviewURL = AppleConfiguration.reviewURL else {
            showActionMessage("Rating will be available after the App Store page is created.")
            return
        }

#if os(iOS)
        UIApplication.shared.open(reviewURL)
#elseif os(macOS)
        NSWorkspace.shared.open(reviewURL)
#endif
    }

    private func presentTipSheet() {
        actionStripModel.collapse()

#if os(iOS)
        guard presentedViewController == nil else { return }
        let sheet = TipSheet(store: tipStore) { [weak self] in
            self?.dismiss(animated: true)
        }
        let hostingController = UIHostingController(rootView: sheet)
        hostingController.modalPresentationStyle = .formSheet
        present(hostingController, animated: true)
#elseif os(macOS)
        guard tipWindow == nil, let parentWindow = view.window else { return }
        let sheet = TipSheet(store: tipStore) { [weak self] in
            self?.dismissTipSheet()
        }
        let hostingController = NSHostingController(rootView: sheet)
        hostingController.title = "Support Simple Video Speed Controller"
        // StoreKit inserts an AppKit remote view into the presenting controller.
        // Keep that container outside the SwiftUI-owned hosting view.
        let sheetController = NSViewController()
        sheetController.title = hostingController.title
        sheetController.view = NSView()
        sheetController.addChild(hostingController)
        sheetController.view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: sheetController.view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: sheetController.view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: sheetController.view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: sheetController.view.bottomAnchor)
        ])
        let window = NSWindow(contentViewController: sheetController)
        window.title = hostingController.title ?? "Support options"
        hostingController.view.frame.size = NSSize(width: 480, height: 460)
        hostingController.view.layoutSubtreeIfNeeded()
        let fittingSize = hostingController.view.fittingSize
        let maximumHeight = (parentWindow.screen?.visibleFrame.height ?? 800) * 0.8
        window.setContentSize(NSSize(
            width: max(480, fittingSize.width),
            height: min(maximumHeight, max(460, fittingSize.height))
        ))
        window.styleMask = [.titled, .resizable]
        window.minSize = NSSize(width: 440, height: 380)
        tipWindow = window
        StoreKitCommerce.shared.purchaseWindow = { [weak window] in window }
        parentWindow.beginSheet(window) { [weak self] _ in
            StoreKitCommerce.shared.purchaseWindow = nil
            self?.tipWindow = nil
        }
#endif
    }

    func presentSupportOptions() {
        presentTipSheet()
    }

#if os(macOS)
    private func dismissTipSheet() {
        guard tipStore.purchasingProductID == nil, let tipWindow else { return }
        tipWindow.sheetParent?.endSheet(tipWindow)
    }
#endif

    private func openExtensionSettings() {
#if os(iOS)
        guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(settingsURL)
#elseif os(macOS)
        SFSafariApplication.showPreferencesForExtension(
            withIdentifier: AppleConfiguration.extensionBundleIdentifier
        ) { error in
            guard error == nil else { return }
            DispatchQueue.main.async { NSApp.terminate(self) }
        }
#endif
    }

    private func showActionMessage(_ text: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: text),
              let literal = String(data: data, encoding: .utf8) else {
            return
        }
        webView.evaluateJavaScript("showActionMessage(\(literal))")
    }
}
