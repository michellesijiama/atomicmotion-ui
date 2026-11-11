import SwiftUI
import UIKit

/// An animated coffee tally printed on periwinkle stock.
public struct CoffeeGauge: View {
    private let values: (Double, Double, Double)?
    private let title: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var origin = Date()
    @State private var expanded = false
    @State private var pour: CoffeePour?

    /// Supply three percentages (latte, espresso and cappuccino) to own the readings.
    /// When omitted, the card pours until someone opens and adjusts its log.
    public init(values: (Double, Double, Double)? = nil, title: String = "Coffee consumption") {
        self.values = values
        self.title = title
    }

    public var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion || scenePhase != .active)) { timeline in
            let elapsed = reduceMotion ? 0 : max(0, timeline.date.timeIntervalSince(origin))
            let levels = readings(at: elapsed)
            let counts = pour?.counts ?? levels.enumerated().map { index, value in
                Int((value / 100 * Double(CoffeeCup.allCases[index].limit)).rounded())
            }
            card(elapsed: elapsed, levels: levels, counts: counts)
        }
        .frame(maxWidth: 336)
    }

    private func readings(at time: TimeInterval) -> [Double] {
        if let values {
            return [values.0, values.1, values.2].map { $0.isFinite ? min(100, max(0, $0)) : 0 }
        }
        if let pour {
            if reduceMotion { return pour.target }
            let progress = coffeeEase(min(1, max(0, time - pour.start)))
            return zip(pour.source, pour.target).map { $0 + ($1 - $0) * progress }
        }
        return CoffeeCup.allCases.map { $0.idleLevel(at: time) }
    }

    private func card(elapsed: TimeInterval, levels: [Double], counts: [Int]) -> some View {
        let shape = RoundedRectangle(cornerRadius: 20)
        return VStack(spacing: 20) {
            HStack {
                Text(title)
                    .font(.custom("Georgia-Italic", fixedSize: 15))
                    .tracking(0.15)
                    .frame(minHeight: 22.5)
                Spacer(minLength: 0)
                if values == nil {
                    Button {
                        if !expanded && pour == nil { commit(counts, from: levels, at: elapsed) }
                        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.3)) { expanded.toggle() }
                    } label: {
                        CoffeeChevron()
                            .stroke(CoffeePalette.ink.opacity(0.7), style: StrokeStyle(lineWidth: 1.3125, lineCap: .round, lineJoin: .round))
                            .frame(width: 14, height: 14)
                            .rotationEffect(.degrees(expanded ? 180 : 0))
                            .frame(width: 28, height: 28)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, -4)
                    .accessibilityLabel(expanded ? "Hide the log" : "Log a drink")
                }
            }
            HStack(spacing: 8) {
                ForEach(CoffeeCup.allCases) { cup in
                    VStack(spacing: 4) {
                        CoffeeDrawing(cup: cup, level: levels[cup.rawValue] / 100, time: elapsed)
                            .aspectRatio(1, contentMode: .fit)
                            .frame(maxWidth: 86, maxHeight: 86)
                            .accessibilityHidden(true)
                        Text(cup.label)
                            .font(.custom("Georgia-Italic", fixedSize: 11))
                            .opacity(0.9)
                            .frame(height: 11)
                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            Text("\(Int(levels[cup.rawValue].rounded()))")
                                .font(.custom("Georgia", fixedSize: 20).monospacedDigit())
                            Text("%")
                                .font(.custom("Georgia", fixedSize: 11))
                        }
                        .frame(height: 20)
                    }
                    .frame(maxWidth: .infinity)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(cup.label)
                    .accessibilityValue("\(Int(levels[cup.rawValue].rounded())) percent")
                }
            }
            if values == nil {
                VStack(spacing: 0) {
                    Rectangle().fill(CoffeePalette.ink.opacity(0.2)).frame(height: 1)
                    VStack(spacing: 8) {
                        ForEach(CoffeeCup.allCases) { cup in
                            logRow(cup, elapsed: elapsed, levels: levels, counts: counts)
                        }
                    }
                    .padding(.top, 12)
                }
                .frame(height: expanded ? 101 : 0, alignment: .top)
                .clipped()
                .padding(.top, -4)
                .allowsHitTesting(expanded)
                .accessibilityHidden(!expanded)
            }
        }
        .padding(.horizontal, 21)
        .padding(.vertical, 17)
        .foregroundStyle(CoffeePalette.ink)
        .background {
            CoffeePalette.paper
                .overlay(alignment: .topLeading) {
                    if let stock = CoffeeAssets.paper {
                        GeometryReader { geometry in
                            Image(uiImage: stock)
                                .resizable()
                                .frame(width: geometry.size.width - 2, height: 325)
                                .offset(x: 1, y: 1)
                        }
                        .allowsHitTesting(false)
                    }
                }
        }
        .clipShape(shape)
        .overlay { shape.strokeBorder(CoffeePalette.ink.opacity(46.0 / 255), lineWidth: 1).allowsHitTesting(false) }
    }

    private func logRow(_ cup: CoffeeCup, elapsed: TimeInterval, levels: [Double], counts: [Int]) -> some View {
        let count = counts[cup.rawValue]
        return HStack(spacing: 12) {
            Text(cup.label)
                .font(.custom("Georgia-Italic", fixedSize: 12))
                .opacity(0.9)
            Spacer(minLength: 0)
            HStack(spacing: 8) {
                step("−", label: "One less \(cup.label)", disabled: count == 0) {
                    adjust(cup, delta: -1, counts: counts, levels: levels, time: elapsed)
                }
                Text("\(count) / \(cup.limit)")
                    .font(.custom("Georgia", fixedSize: 12).monospacedDigit())
                    .frame(width: 52)
                    .accessibilityIdentifier("coffee-count-\(cup.key)")
                step("+", label: "One more \(cup.label)", disabled: count == cup.limit) {
                    adjust(cup, delta: 1, counts: counts, levels: levels, time: elapsed)
                }
            }
        }
        .frame(height: 24)
    }

    private func step(_ glyph: String, label: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(glyph)
                .font(.custom("Georgia", fixedSize: 13))
                .frame(width: 24, height: 24)
                    .overlay { Circle().strokeBorder(CoffeePalette.ink, lineWidth: 4.0 / 3) }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .disabled(disabled || !expanded)
        .opacity(disabled ? 0.3 : 1)
    }

    private func adjust(_ cup: CoffeeCup, delta: Int, counts: [Int], levels: [Double], time: TimeInterval) {
        var next = counts
        next[cup.rawValue] = min(cup.limit, max(0, counts[cup.rawValue] + delta))
        commit(next, from: levels, at: time)
    }

    private func commit(_ counts: [Int], from levels: [Double], at time: TimeInterval) {
        pour = CoffeePour(counts: counts, source: levels, target: CoffeeCup.allCases.map {
            Double(counts[$0.rawValue]) / Double($0.limit) * 100
        }, start: time)
    }
}

private struct CoffeePour {
    let counts: [Int]
    let source: [Double]
    let target: [Double]
    let start: TimeInterval
}

private enum CoffeePalette {
    static let paper = color(0x93A6DB).opacity(224.0 / 255)
    static let ink = color(0x2E1B0F)
    static let cup = color(0x43291A)
    static let blush = color(0xF5C4D3)
    static let foam = color(0xFBF3E7)

    static func color(_ hex: UInt32) -> Color {
        Color(.sRGB, red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

private enum CoffeeAssets {
    static let paper = load("paper", extension: "webp")
    static let cups = CoffeeCup.allCases.map { load("\($0.key)-cup") }
    static let outlines = CoffeeCup.allCases.map { load("\($0.key)-outline") }

    private static func load(_ name: String, extension fileExtension: String = "png") -> UIImage? {
        Bundle.module.url(forResource: "coffee-gauge-\(name)", withExtension: fileExtension)
            .flatMap { UIImage(contentsOfFile: $0.path) }
    }
}

private struct CoffeeChevron: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: 3.5 * 0.875, y: 6 * 0.875))
            path.addLine(to: CGPoint(x: 8 * 0.875, y: 10.5 * 0.875))
            path.addLine(to: CGPoint(x: 12.5 * 0.875, y: 6 * 0.875))
        }
    }
}

private enum CoffeeCup: Int, CaseIterable, Identifiable {
    case latte, espresso, cappuccino

    var id: Self { self }

    var label: String {
        switch self {
        case .latte: "Latte"
        case .espresso: "Espresso"
        case .cappuccino: "Cappuccino"
        }
    }

    var key: String { label.lowercased() }
    var limit: Int { self == .espresso ? 6 : 4 }

    var bounds: (Double, Double) {
        switch self {
        case .latte: (22, 100)
        case .espresso: (50, 96)
        case .cappuccino: (24, 99)
        }
    }

    var cycle: (range: ClosedRange<Double>, period: Double, offset: Double) {
        switch self {
        case .latte: (28...95, 2.9, 0)
        case .espresso: (18...88, 3.7, 1.25)
        case .cappuccino: (24...92, 3.2, 2.1)
        }
    }

    func idleLevel(at time: Double) -> Double {
        let cycle = cycle
        let phase = time + cycle.offset
        let index = floor(phase / cycle.period)
        let progress = coffeeEase(min(1, max(0, phase - index * cycle.period)))
        func stop(_ step: Double) -> Double {
            let x = sin((step * 7.13 + Double(rawValue) * 41.7) * 127.1 + 311.7) * 43_758.5453
            return cycle.range.lowerBound + (x - floor(x)) * (cycle.range.upperBound - cycle.range.lowerBound)
        }
        return stop(index) + (stop(index + 1) - stop(index)) * progress
    }

    var silhouette: Path {
        Path { path in
            func move(_ x: CGFloat, _ y: CGFloat) { path.move(to: CGPoint(x: x, y: y)) }
            func line(_ x: CGFloat, _ y: CGFloat) { path.addLine(to: CGPoint(x: x, y: y)) }
            func curve(_ a: CGFloat, _ b: CGFloat, _ c: CGFloat, _ d: CGFloat, _ x: CGFloat, _ y: CGFloat) {
                path.addCurve(to: CGPoint(x: x, y: y), control1: CGPoint(x: a, y: b), control2: CGPoint(x: c, y: d))
            }
            switch self {
            case .latte:
                move(38, 22)
                line(84, 22)
                line(84, 92)
                curve(84, 96, 80, 100, 76, 100)
                line(46, 100)
                curve(42, 100, 38, 96, 38, 92)
            case .espresso:
                move(26, 50)
                line(94, 50)
                curve(94, 50, 90, 84, 81, 93)
                curve(77, 97, 43, 97, 39, 93)
                curve(30, 84, 26, 50, 26, 50)
            case .cappuccino:
                move(34, 24)
                curve(42, 33, 30, 41, 38, 50)
                curve(46, 59, 30, 67, 38, 76)
                curve(44, 84, 34, 90, 42, 95)
                curve(48, 99, 73, 99, 79, 94)
                curve(86, 88, 76, 81, 83, 73)
                curve(90, 65, 75, 57, 82, 48)
                curve(89, 39, 75, 32, 81, 24)
            }
            path.closeSubpath()
        }
    }
}

private struct CoffeeDrawing: View {
    let cup: CoffeeCup
    let level: Double
    let time: TimeInterval

    var body: some View {
        let base = CoffeeAssets.cups[cup.rawValue]
        let outline = CoffeeAssets.outlines[cup.rawValue]
        ZStack {
            if let base {
                Image(uiImage: base).resizable()
            }
            Canvas(opaque: false, colorMode: .nonLinear) { context, size in
                let scale = CGAffineTransform(scaleX: size.width / 120, y: size.height / 120)
                let silhouette = cup.silhouette.applying(scale)
                if base == nil { context.fill(silhouette, with: .color(CoffeePalette.blush)) }
                context.clip(to: silhouette)
                let crest = makeCrest()
                var fill = crest
                fill.addLine(to: CGPoint(x: 132, y: 144))
                fill.addLine(to: CGPoint(x: -12, y: 144))
                fill.closeSubpath()
                context.fill(fill.applying(scale), with: .color(CoffeePalette.cup))
                context.stroke(crest.applying(scale), with: .color(CoffeePalette.foam.opacity(0.5 * min(1, level * 4))), style: StrokeStyle(lineWidth: 2.4 * size.width / 120, lineCap: .round))
                if outline == nil { context.stroke(silhouette, with: .color(CoffeePalette.blush), lineWidth: 2) }
            }
            if let outline {
                Image(uiImage: outline).resizable()
            }
        }
    }

    private func makeCrest() -> Path {
        let (top, bottom) = cup.bounds
        let base = bottom + 4 - level * (bottom - top + 8)
        let amplitude = 3.2 * (0.35 + 0.65 * sin(.pi * level))
        let seed = Double(cup.rawValue) * 1.7
        return Path { path in
            for x in stride(from: -12, through: 132, by: 5) {
                let u = Double(x) / 120
                let y = base + sin(u * .pi * 2.4 + time * 1.5 + seed) * amplitude
                    + sin(u * .pi * 5.3 - time * 2.2 + seed) * amplitude * 0.42
                let point = CGPoint(x: Double(x), y: y)
                if x == -12 { path.move(to: point) } else { path.addLine(to: point) }
            }
        }
    }
}

private func coffeeEase(_ progress: Double) -> Double {
    progress < 0.5 ? 4 * progress * progress * progress : 1 - pow(-2 * progress + 2, 3) / 2
}
