import XCTest
@testable import VideoSpeedAppleCore

@MainActor
private final class FakeCommerce: TipCommerce {
    var canMakePayments = true
    var returned: [TipProduct] = []
    var loadError = false
    var purchaseError = false
    var result: TipPurchaseResult = .cancelled
    var purchaseCount = 0
    var purchaseGate: CheckedContinuation<Void, Never>?
    var holdPurchase = false
    var updateContinuation: AsyncStream<TipTransaction>.Continuation?
    var recoveryContinuation: AsyncStream<TipTransaction>.Continuation?
    var recoveryCount = 0
    var updateCount = 0
    func products(for ids: [String]) async throws -> [TipProduct] {
        if loadError { throw CocoaError(.fileReadUnknown) }
        return returned
    }
    func purchase(_ id: String) async throws -> TipPurchaseResult {
        purchaseCount += 1
        if purchaseError { throw CocoaError(.fileReadUnknown) }
        if holdPurchase { await withCheckedContinuation { purchaseGate = $0 } }
        return result
    }
    func updates() -> AsyncStream<TipTransaction> { updateCount += 1; return AsyncStream { updateContinuation = $0 } }
    func unfinished() -> AsyncStream<TipTransaction> { recoveryCount += 1; return AsyncStream { recoveryContinuation = $0 } }
}

final class TipStoreTests: XCTestCase {
    @MainActor func testMissingAndFailedLoadsCanRetry() async {
        let commerce = FakeCommerce()
        let subject = TipStore(ids: ["small", "large"], commerce: commerce)
        await subject.loadProducts()
        XCTAssertTrue(subject.missingProducts)
        commerce.loadError = true
        await subject.loadProducts()
        XCTAssertFalse(subject.isLoading)
        commerce.loadError = false
        commerce.returned = [product("small")]
        await subject.loadProducts()
        XCTAssertEqual(subject.products.count, 1)
        XCTAssertTrue(subject.missingProducts)
        commerce.returned.append(product("large"))
        await subject.loadProducts()
        XCTAssertFalse(subject.missingProducts)
        XCTAssertNil(subject.loadMessage)
    }
    @MainActor func testVerifiedTipsFinishOnceAndOtherResultsDoNotFinish() async {
        let s = TipStore(ids: ["small"], commerce: FakeCommerce())
        var finished = 0
        let t = TipTransaction(id: 1, productID: "small", verified: true, finish: { finished += 1; await Task.yield() })
        async let one: Void = s.accept(t)
        async let two: Void = s.accept(t)
        _ = await (one, two)
        await s.accept(TipTransaction(id: 2, productID: "other", verified: true, finish: { finished += 1 }))
        await s.accept(TipTransaction(id: 3, productID: "small", verified: false, finish: { finished += 1 }))
        XCTAssertEqual(finished, 1)
        await s.accept(TipTransaction(id: 4, productID: "small", verified: true, finish: { finished += 1 }))
        XCTAssertEqual(finished, 2)
    }
    @MainActor func testStoreGuardsConcurrentPurchasesAndRecoversAfterCancel() async {
        let c = FakeCommerce(); c.returned = [product("small")]; c.holdPurchase = true
        let s = TipStore(ids: ["small"], commerce: c)
        await s.loadProducts()
        let task = Task { await s.purchase("small") }
        while c.purchaseGate == nil { await Task.yield() }
        await s.purchase("small")
        XCTAssertEqual(c.purchaseCount, 1)
        c.purchaseGate?.resume(); await task.value
        XCTAssertNil(s.purchasingProductID)
        c.holdPurchase = false
        await s.purchase("small")
        XCTAssertEqual(c.purchaseCount, 2)
    }
    @MainActor func testPendingAndIncomingDeliveryRemainSeparate() async {
        let c = FakeCommerce(); c.returned = [product("small")]; c.result = .pending
        let s = TipStore(ids: ["small"], commerce: c)
        await s.loadProducts(); await s.purchase("small")
        let pendingMessage = s.purchaseMessage
        await s.accept(TipTransaction(id: 8, productID: "small", verified: true, finish: {}))
        XCTAssertEqual(s.purchaseMessage, pendingMessage)
        XCTAssertTrue(s.hasPendingPurchase)
        XCTAssertNotNil(s.deliveryMessage)
        XCTAssertNil(s.purchasingProductID)
    }
    @MainActor func testListenerStartsOnceAndRecoveryDoesNotOverlap() async {
        let c = FakeCommerce()
        let store = TipStore(ids: ["small"], commerce: c)
        store.start(); store.start(); store.reconcileUnfinishedTransactions()
        XCTAssertEqual(c.updateCount, 1); XCTAssertEqual(c.recoveryCount, 1)
        var finished = false
        c.updateContinuation?.yield(TipTransaction(id: 10, productID: "small", verified: true, finish: { finished = true }))
        for _ in 0..<100 where !finished { await Task.yield() }
        XCTAssertTrue(finished)
        c.recoveryContinuation?.finish()
        for _ in 0..<20 { await Task.yield() }
        store.reconcileUnfinishedTransactions()
        XCTAssertEqual(c.recoveryCount, 2)
    }
    @MainActor func testRelaunchRecoversVerifiedUnfinishedTipsWithoutOpeningSheet() async {
        let commerce = FakeCommerce()
        let store = TipStore(ids: ["small"], commerce: commerce)
        store.start()
        let delivered = expectation(description: "Unfinished verified tip finishes")
        commerce.recoveryContinuation?.yield(TipTransaction(id: 42, productID: "small", verified: true, finish: { delivered.fulfill() }))
        commerce.recoveryContinuation?.yield(TipTransaction(id: 43, productID: "small", verified: false, finish: { XCTFail("Unverified tip must not finish") }))
        commerce.recoveryContinuation?.finish()
        await fulfillment(of: [delivered], timeout: 2)
        XCTAssertEqual(commerce.purchaseCount, 0)
        XCTAssertTrue(store.products.isEmpty)
    }

    @MainActor func testUnavailableAndUnverifiedPurchasesRestoreControls() async {
        let c = FakeCommerce(); c.returned = [product("small")]; c.canMakePayments = false
        let s = TipStore(ids: ["small"], commerce: c)
        await s.loadProducts(); await s.purchase("small")
        XCTAssertEqual(c.purchaseCount, 0)
        c.canMakePayments = true
        c.result = .success(TipTransaction(id: 1, productID: "small", verified: false, finish: { XCTFail("Must not finish") }))
        await s.purchase("small")
        XCTAssertNil(s.purchasingProductID); XCTAssertNotNil(s.purchaseMessage)
    }
    @MainActor func testPurchaseErrorRestoresControlsAndRepeatedTipsFinish() async {
        let c = FakeCommerce(); c.returned = [product("small")]; c.purchaseError = true
        let s = TipStore(ids: ["small"], commerce: c)
        await s.loadProducts(); await s.purchase("small")
        XCTAssertNil(s.purchasingProductID); XCTAssertNotNil(s.purchaseMessage)
        c.purchaseError = false
        var finished = 0
        for id in 1...2 {
            c.result = .success(TipTransaction(id: UInt64(id), productID: "small", verified: true, finish: { finished += 1 }))
            await s.purchase("small")
            XCTAssertNil(s.purchasingProductID)
        }
        XCTAssertEqual(finished, 2)
        XCTAssertEqual(c.purchaseCount, 3)
    }
    @MainActor private func product(_ id: String) -> TipProduct { TipProduct(id: id, displayName: id, description: "Optional tip", displayPrice: "$0.99") }
}
