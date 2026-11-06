import CoreText
import SwiftUI

enum DesignFont {
    static func sans(_ size: CGFloat, medium: Bool = false) -> Font {
        font(medium ? "Geist-Medium" : "Geist-Regular", size: size, fallback: .system(size: size, weight: medium ? .medium : .regular))
    }

    static func mono(_ size: CGFloat) -> Font {
        font("GeistMono-Regular", size: size, fallback: .system(size: size, design: .monospaced))
    }

    private static func font(_ resource: String, size: CGFloat, fallback: Font) -> Font {
        guard let postScriptName = registered[resource] else { return fallback }
        return .custom(postScriptName, fixedSize: size)
    }

    private static let registered: [String: String] = {
        var fonts: [String: String] = [:]
        for resource in ["Geist-Regular", "Geist-Medium", "GeistMono-Regular"] {
            guard let url = Bundle.module.url(forResource: resource, withExtension: "ttf"),
                  let provider = CGDataProvider(url: url as CFURL),
                  let font = CGFont(provider),
                  let name = font.postScriptName as String? else { continue }
            CTFontManagerRegisterGraphicsFont(font, nil)
            fonts[resource] = name
        }
        return fonts
    }()
}
