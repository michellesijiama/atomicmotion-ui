import CoreText
import SwiftUI
import UIKit

/// Reveals a geometric wordmark one letter at a time, from four alternating directions.
public struct GeometricLogoReveal: View {
    private let text: String
    private let mark: String
    private let loop: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var started = Date()
    @State private var finished = false

    public init(text: String = "Atomic&Motion", mark: String = "™", loop: Bool = true) {
        self.text = text
        self.mark = mark
        self.loop = loop
    }

    public var body: some View {
        GeometryReader { geometry in
            let contentWidth = max(1, min(1040, geometry.size.width) - geometry.size.width * 0.1)
            let layout = LogoLayout(text: text, mark: mark, contentWidth: contentWidth)
            TimelineView(.animation(minimumInterval: 1 / 60, paused: reduceMotion || finished || scenePhase != .active)) { frame in
                let elapsed = max(0, frame.date.timeIntervalSince(started))
                let time = reduceMotion ? layout.wordDone + 1 : loop
                    ? elapsed.truncatingRemainder(dividingBy: layout.wordDone + 2)
                    : elapsed
                Canvas(opaque: false, colorMode: .nonLinear) { context, size in
                    context.withCGContext { graphics in
                        layout.draw(at: time, in: size, context: graphics)
                    }
                }
                .onChange(of: !loop && elapsed > layout.wordDone + 0.25) { _, settled in
                    if settled { finished = true }
                }
            }
        }
        .clipped()
        .accessibilityLabel(text)
        .accessibilityAddTraits(.isImage)
        .onChange(of: text) { _, _ in restart() }
        .onChange(of: loop) { _, _ in restart() }
    }

    private func restart() {
        started = Date()
        finished = false
    }
}

private struct LogoLayout {
    struct Glyph {
        let line: CTLine
        let advance: CGFloat
    }

    let letters: [Glyph]
    let mark: Glyph?
    let mainFont: CTFont
    let markFont: CTFont
    let size: CGFloat
    let markGap: CGFloat
    let markTop: CGFloat
    let width: CGFloat

    static let wordStart = 0.28
    static let stagger = 0.11
    static let duration = 1.05
    static let ink = UIColor(red: 14 / 255, green: 16 / 255, blue: 17 / 255, alpha: 1).cgColor
    static let ghost = UIColor(white: 0.8, alpha: 1).cgColor

    static let fontName: CFString? = {
        guard let url = Bundle.module.url(forResource: "PlusJakartaSans-Medium", withExtension: "ttf"),
              let data = CGDataProvider(url: url as CFURL),
              let font = CGFont(data),
              let name = font.postScriptName else { return nil }
        CTFontManagerRegisterGraphicsFont(font, nil)
        return name
    }()

    var wordDone: Double { Self.wordStart + Double(max(0, letters.count - 1)) * Self.stagger + Self.duration }

    init(text: String, mark: String, contentWidth: CGFloat) {
        let fontSize = min(120, max(28, contentWidth * 0.095))
        let gap = contentWidth * 0.004
        let main = Self.font(fontSize)
        let symbol = Self.font(contentWidth * 0.024)
        let glyphs = text.map { Self.glyph(String($0), font: main, tracking: -fontSize * 0.04) }
        let trademark = mark.isEmpty ? nil : Self.glyph(mark, font: symbol, tracking: -fontSize * 0.04)
        size = fontSize
        markGap = gap
        markTop = contentWidth * 0.01
        mainFont = main
        markFont = symbol
        letters = glyphs
        self.mark = trademark
        width = glyphs.reduce(0) { $0 + $1.advance } + (trademark.map { gap + $0.advance } ?? 0)
    }

    private static func font(_ size: CGFloat) -> CTFont {
        if let fontName { return CTFontCreateWithName(fontName, size, nil) }
        return UIFont.systemFont(ofSize: size, weight: .medium) as CTFont
    }

    private static func glyph(_ text: String, font: CTFont, tracking: CGFloat) -> Glyph {
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: [
            NSAttributedString.Key(kCTFontAttributeName as String): font,
            NSAttributedString.Key(kCTForegroundColorFromContextAttributeName as String): true,
        ]))
        return Glyph(line: line, advance: max(0, CTLineGetTypographicBounds(line, nil, nil, nil) + tracking))
    }

    func draw(at time: Double, in frame: CGSize, context: CGContext) {
        let lineHeight = size * 0.9
        let top = (frame.height - lineHeight) / 2
        let baseline = top + (lineHeight + CTFontGetAscent(mainFont) - CTFontGetDescent(mainFont)) / 2
        var x = (frame.width - width) / 2

        for (index, glyph) in letters.enumerated() {
            draw(glyph.line, x: x, baseline: baseline, ink: Self.ghost, context: context)

            let start = Self.wordStart + Double(index) * Self.stagger
            let progress = Self.ease((time - start) / Self.duration)
            let opacity = Self.ease((time - start) / (Self.duration * 0.55))
            if opacity >= 1 && progress >= 1 {
                draw(glyph.line, x: x, baseline: baseline, ink: Self.ink, context: context)
            } else if opacity > 0 {
                let wipe = LogoWipe(index: index, progress: progress, width: glyph.advance, height: lineHeight)
                context.saveGState()
                context.setAlpha(opacity)
                context.clip(to: wipe.clip.offsetBy(dx: x + wipe.offset.width, dy: top + wipe.offset.height))
                draw(glyph.line, x: x + wipe.offset.width, baseline: baseline + wipe.offset.height, ink: Self.ink, context: context)
                context.restoreGState()
            }
            x += glyph.advance
        }

        if let mark {
            let opacity = Self.ease((time - wordDone + 0.15) / 0.4)
            let markHeight = CTFontGetSize(markFont)
            let markBaseline = top + markTop + (markHeight + CTFontGetAscent(markFont) - CTFontGetDescent(markFont)) / 2
            context.saveGState()
            context.setAlpha(opacity)
            draw(mark.line, x: x + markGap, baseline: markBaseline, ink: Self.ink, context: context)
            context.restoreGState()
        }
    }

    private func draw(_ line: CTLine, x: CGFloat, baseline: CGFloat, ink: CGColor, context: CGContext) {
        context.saveGState()
        context.translateBy(x: x, y: baseline)
        context.scaleBy(x: 1, y: -1)
        context.textMatrix = .identity
        context.textPosition = .zero
        context.setFillColor(ink)
        CTLineDraw(line, context)
        context.restoreGState()
    }

    /// CSS cubic-bezier(0.22, 1, 0.36, 1), solved on its x-axis.
    private static func ease(_ value: Double) -> CGFloat {
        guard value > 0 else { return 0 }
        guard value < 1 else { return 1 }
        var low = 0.0
        var high = 1.0
        for _ in 0..<14 {
            let t = (low + high) / 2
            let u = 1 - t
            let x = 3 * u * u * t * 0.22 + 3 * u * t * t * 0.36 + t * t * t
            if x < value { low = t } else { high = t }
        }
        return 1 - pow(1 - (low + high) / 2, 3)
    }
}

private struct LogoWipe {
    let offset: CGSize
    let clip: CGRect

    init(index: Int, progress: CGFloat, width: CGFloat, height: CGFloat) {
        let remaining = 1 - progress
        let slide = 8 * remaining
        switch index % 4 {
        case 0:
            offset = CGSize(width: 0, height: -slide)
            clip = CGRect(x: 0, y: 0, width: width, height: height * progress)
        case 1:
            offset = CGSize(width: 0, height: slide)
            clip = CGRect(x: 0, y: height * remaining, width: width, height: height * progress)
        case 2:
            offset = CGSize(width: slide, height: 0)
            clip = CGRect(x: width * remaining, y: 0, width: width * progress, height: height)
        default:
            offset = CGSize(width: -slide, height: 0)
            clip = CGRect(x: 0, y: 0, width: width * progress, height: height)
        }
    }
}
