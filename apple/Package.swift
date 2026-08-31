// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VideoSpeedAppleCore",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [],
    targets: [
        .target(name: "VideoSpeedAppleCore", path: "Core"),
        .testTarget(name: "VideoSpeedAppleCoreTests", dependencies: ["VideoSpeedAppleCore"], path: "Tests")
    ]
)
