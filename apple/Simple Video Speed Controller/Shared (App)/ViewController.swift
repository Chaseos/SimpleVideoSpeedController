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

@MainActor
final class TipStore: ObservableObject {
    @Published private(set) var products: [Product] = []
    @Published private(set) var isLoading = false
    @Published private(set) var purchasingProductID: String?
    @Published var statusMessage: String?

    private var hasLoaded = false
    private var transactionUpdatesTask: Task<Void, Never>?

    init() {
        transactionUpdatesTask = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                switch result {
                case .verified(let transaction):
                    guard AppleConfiguration.tipProductIDs.contains(transaction.productID) else {
                        continue
                    }
                    await transaction.finish()
                    self?.statusMessage = "Thank you for supporting my work!"
                case .unverified(let transaction, _):
                    guard AppleConfiguration.tipProductIDs.contains(transaction.productID) else {
                        continue
                    }
                    self?.statusMessage = "The purchase could not be verified. You were not credited for this tip."
                }
            }
        }
    }

    deinit {
        transactionUpdatesTask?.cancel()
    }

    func loadProducts(force: Bool = false) async {
        guard force || !hasLoaded else { return }
        hasLoaded = true
        isLoading = true
        statusMessage = nil

        do {
            let loadedProducts = try await Product.products(for: AppleConfiguration.tipProductIDs)
            products = loadedProducts.sorted {
                productOrder($0.id) < productOrder($1.id)
            }
            if products.isEmpty {
                statusMessage = "Tips are temporarily unavailable. Please try again later."
            }
        } catch {
            statusMessage = "Tips could not be loaded. Please check your connection and try again."
        }

        isLoading = false
    }

    func purchase(_ product: Product) async {
        purchasingProductID = product.id
        statusMessage = nil
        defer { purchasingProductID = nil }

        do {
            switch try await product.purchase() {
            case .success(let verificationResult):
                guard case .verified(let transaction) = verificationResult else {
                    statusMessage = "The purchase could not be verified. You were not credited for this tip."
                    return
                }

                await transaction.finish()
                statusMessage = "Thank you for supporting my work!"
            case .pending:
                statusMessage = "This purchase is pending approval."
            case .userCancelled:
                statusMessage = nil
            @unknown default:
                statusMessage = "The App Store returned an unknown purchase result. Please try again."
            }
        } catch {
            statusMessage = "The purchase could not be completed. Please try again."
        }
    }

    private func productOrder(_ productID: String) -> Int {
        AppleConfiguration.tipProductIDs.firstIndex(of: productID) ?? .max
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
        .opacity(expanded ? 1 : 0.42)
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
    @ObservedObject var store: TipStore
    let dismissAction: () -> Void

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Support my work")
                        .font(.title2.bold())
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
                        Text(store.statusMessage ?? "The App Store did not return any tip options.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        Button("Try Again") {
                            Task { await store.loadProducts(force: true) }
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 150)
                } else {
                    VStack(spacing: 10) {
                        ForEach(store.products, id: \.id) { product in
                            Button {
                                Task { await store.purchase(product) }
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "heart.fill")
                                        .foregroundStyle(Color(red: 1.0, green: 0.353, blue: 0.373))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(product.displayName)
                                            .fontWeight(.semibold)
                                        Text(product.description)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(2)
                                            .multilineTextAlignment(.leading)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    Spacer()
                                    if store.purchasingProductID == product.id {
                                        ProgressView()
                                    } else {
                                        Text(product.displayPrice)
                                            .fontWeight(.semibold)
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

                if let statusMessage = store.statusMessage, !store.products.isEmpty {
                    Text(statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                }

                Spacer(minLength: 0)
            }
            .padding(24)
            .frame(minWidth: 360, idealWidth: 420, minHeight: 360)
            .navigationTitle("Support my work")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done", action: dismissAction)
                }
            }
            .task {
                await store.loadProducts()
            }
        }
    }
}

@MainActor
final class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {
    @IBOutlet private var webView: WKWebView!

    private let actionStripModel = ActionStripModel()
    private let tipStore = TipStore()

#if os(iOS)
    private var actionStripController: UIHostingController<SupportActionStrip>?
#elseif os(macOS)
    private var actionStripController: NSHostingController<SupportActionStrip>?
    private var tipSheetController: NSHostingController<TipSheet>?
#endif

    override func viewDidLoad() {
        super.viewDidLoad()

        webView.navigationDelegate = self
#if os(iOS)
        webView.scrollView.isScrollEnabled = false
#endif
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
        guard tipSheetController == nil else { return }
        let sheet = TipSheet(store: tipStore) { [weak self] in
            self?.dismissTipSheet()
        }
        let hostingController = NSHostingController(rootView: sheet)
        hostingController.title = "Support Simple Video Speed Controller"
        tipSheetController = hostingController
        presentAsSheet(hostingController)
#endif
    }

    func presentSupportOptions() {
        presentTipSheet()
    }

#if os(macOS)
    private func dismissTipSheet() {
        guard let tipSheetController else { return }
        dismiss(tipSheetController)
        self.tipSheetController = nil
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
