import AppKit

// Renders the Edge toolbar icons: the icon.png glyph at its original size,
// recolored neutral gray so it stays visible on light and dark browser themes.
// Usage: swift scripts/generate-edge-icons.swift <glyph> <output-directory>
guard CommandLine.arguments.count == 3 else {
    fputs("Usage: generate-edge-icons.swift <glyph> <output-directory>\n", stderr)
    exit(64)
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)

guard let sourceImage = NSImage(contentsOf: sourceURL),
      let glyph = sourceImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("Unable to load glyph at \(sourceURL.path)\n", stderr)
    exit(66)
}

let colorSpace = CGColorSpaceCreateDeviceRGB()
// #8c8c8c has at least 3:1 contrast against Edge's light and dark toolbars.
let glyphColor = CGColor(colorSpace: colorSpace, components: [0.55, 0.55, 0.55, 1])!

for size in [16, 32, 48, 128] {
    let context = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )!
    let bounds = CGRect(x: 0, y: 0, width: size, height: size)

    context.interpolationQuality = .high
    context.draw(glyph, in: bounds)
    context.setBlendMode(.sourceIn)
    context.setFillColor(glyphColor)
    context.fill(bounds)

    let representation = NSBitmapImageRep(cgImage: context.makeImage()!)
    guard let png = representation.representation(using: .png, properties: [:]) else {
        fputs("Unable to encode \(size)px icon\n", stderr)
        exit(70)
    }
    try png.write(to: outputDirectory.appendingPathComponent("edge-icon-\(size).png"))
}
