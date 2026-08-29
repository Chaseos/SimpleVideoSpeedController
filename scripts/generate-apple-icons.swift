import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: generate-apple-icons.swift <source-icon> <apple-project-root>\n", stderr)
    exit(2)
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let appleProjectRoot = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let appIconDirectory = appleProjectRoot
    .appendingPathComponent("Shared (App)/Assets.xcassets/AppIcon.appiconset", isDirectory: true)

guard let sourceImage = NSImage(contentsOf: sourceURL) else {
    fputs("Unable to load source icon at \(sourceURL.path)\n", stderr)
    exit(1)
}

func writePNG(_ representation: NSBitmapImageRep, to url: URL) throws {
    guard let png = representation.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "IconGeneration", code: 1)
    }
    try png.write(to: url)
}

func makeIcon(size: Int) -> NSBitmapImageRep {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let context = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    )!

    let dimension = CGFloat(size)
    let colors = [
        NSColor(calibratedRed: 0.11, green: 0.18, blue: 0.31, alpha: 1).cgColor,
        NSColor(calibratedRed: 0.25, green: 0.44, blue: 0.77, alpha: 1).cgColor
    ] as CFArray
    let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: [0, 1])!
    context.drawLinearGradient(
        gradient,
        start: CGPoint(x: 0, y: 0),
        end: CGPoint(x: dimension, y: dimension),
        options: []
    )

    var proposedRect = NSRect(origin: .zero, size: sourceImage.size)
    if let sourceCGImage = sourceImage.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) {
        let inset = dimension * 0.105
        context.draw(
            sourceCGImage,
            in: CGRect(x: inset, y: inset, width: dimension - inset * 2, height: dimension - inset * 2)
        )
    }

    return NSBitmapImageRep(cgImage: context.makeImage()!)
}

try writePNG(makeIcon(size: 1024), to: appIconDirectory.appendingPathComponent("universal-icon-1024@1x.png"))

let macIcons: [(String, Int)] = [
    ("mac-icon-16@1x.png", 16),
    ("mac-icon-16@2x.png", 32),
    ("mac-icon-32@1x.png", 32),
    ("mac-icon-32@2x.png", 64),
    ("mac-icon-128@1x.png", 128),
    ("mac-icon-128@2x.png", 256),
    ("mac-icon-256@1x.png", 256),
    ("mac-icon-256@2x.png", 512),
    ("mac-icon-512@1x.png", 512),
    ("mac-icon-512@2x.png", 1024)
]

for (filename, size) in macIcons {
    try writePNG(makeIcon(size: size), to: appIconDirectory.appendingPathComponent(filename))
}

let appResourceIcon = appleProjectRoot.appendingPathComponent("Shared (App)/Resources/Icon.png")
try writePNG(makeIcon(size: 256), to: appResourceIcon)

let largeIcon = appleProjectRoot
    .appendingPathComponent("Shared (App)/Assets.xcassets/LargeIcon.imageset/icon.png")
try writePNG(makeIcon(size: 512), to: largeIcon)
