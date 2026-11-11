import SwiftUI

/// A stippled progress indicator with a moon that stays in phase as its card opens.
public struct HalftoneBloom: View {
    private let value: Double?
    private let title: String
    private let caption: String?
    private let unit: String?
    private let loop: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var started = Date()
    @State private var expanded = false

    public init(
        value: Double? = nil,
        title: String = "Progress Indicator",
        caption: String? = nil,
        unit: String? = "of daily goal",
        loop: Bool = false
    ) {
        self.value = value
        self.title = title
        self.caption = caption
        self.unit = unit
        self.loop = loop
    }

    public var body: some View {
        let animated = value == nil && !reduceMotion
        TimelineView(.animation(minimumInterval: 1 / 30, paused: !animated || scenePhase != .active)) { timeline in
            let phase = max(0, timeline.date.timeIntervalSince(started)).truncatingRemainder(dividingBy: 7.4)
            let fraction = value.map { $0.isFinite ? min(1, max(0, $0 / 100)) : 0 } ?? (reduceMotion ? 0.66 : Self.fraction(at: phase))
            let autoOpen = phase < 5
            card(fraction)
                .onChange(of: autoOpen, initial: true) { _, open in
                    if animated && loop { setExpanded(open) }
                }
        }
        .frame(maxWidth: 468)
    }

    private func card(_ fraction: Double) -> some View {
        let percent = Int((fraction * 100).rounded())
        return VStack(alignment: .leading, spacing: 12) {
            header
            Rectangle().fill(BloomPalette.edge).frame(height: 1)
            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(percent)%")
                        .font(.system(size: 38, weight: .medium).monospacedDigit())
                        .tracking(-0.76)
                        .frame(height: 38)
                        .lineLimit(1)
                    if let unit, !unit.isEmpty {
                        Text(unit)
                            .font(.system(size: 13))
                            .foregroundStyle(BloomPalette.muted)
                            .frame(height: 13)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(title)
                .accessibilityValue("\(percent) percent")
                Spacer(minLength: 0)
                moon(fraction)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .padding(1)
        .foregroundStyle(.white)
        .background(.black, in: RoundedRectangle(cornerRadius: 18))
        .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(BloomPalette.edge, lineWidth: 1) }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 16) {
                Text(title)
                    .font(.system(size: 19, weight: .medium))
                    .tracking(-0.19)
                    .frame(minHeight: 24)
                Spacer(minLength: 0)
                Button {
                    setExpanded(!expanded)
                } label: {
                    BloomChevron()
                        .stroke(BloomPalette.muted, style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
                        .frame(width: 16, height: 16)
                        .rotationEffect(.degrees(expanded ? 180 : 0))
                        .frame(width: 32, height: 32)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.trailing, -6)
                .padding(.top, -4)
                .accessibilityLabel(expanded ? "Hide the moon" : "Show the moon")
                .animation(reduceMotion ? nil : .easeOut(duration: 0.3), value: expanded)
            }
            if let caption, !caption.isEmpty {
                Text(caption)
                    .font(.system(size: 14))
                    .foregroundStyle(BloomPalette.muted)
            }
        }
    }

    private func moon(_ fraction: Double) -> some View {
        let large = BloomPlate.large
        let small = BloomPlate.small
        return ZStack {
            small.canvas(fraction)
                .opacity(expanded ? 0 : 1)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.3), value: expanded)
            large.canvas(fraction)
                .opacity(expanded ? 1 : 0)
                .scaleEffect(expanded ? 1 : small.width / large.width)
        }
        .frame(width: expanded ? large.width : small.width, height: expanded ? large.width : small.width)
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }

    private func setExpanded(_ open: Bool) {
        withAnimation(reduceMotion ? nil : .timingCurve(0, 0, 0.58, 1, duration: 0.5)) { expanded = open }
    }

    private static func fraction(at phase: TimeInterval) -> Double {
        if phase < 4 { return ease(phase / 4) }
        if phase < 5 { return 1 }
        if phase < 7 { return 1 - ease((phase - 5) / 2) }
        return 0
    }

    private static func ease(_ p: Double) -> Double {
        p < 0.5 ? 4 * p * p * p : 1 - pow(-2 * p + 2, 3) / 2
    }
}

private enum BloomPalette {
    static let muted = color(0x8B8B93)
    static let edge = color(0x1E1E22)
    static let ghost: UInt32 = 0x2A2A31

    static func color(_ hex: UInt32) -> Color {
        Color(.sRGB, red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

private struct BloomChevron: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: 3.5, y: 6))
            path.addLine(to: CGPoint(x: 8, y: 10.5))
            path.addLine(to: CGPoint(x: 12.5, y: 6))
        }
    }
}

private struct BloomPlate: Decodable {
    struct Mark: Decodable {
        let x: CGFloat
        let y: CGFloat
        let size: CGFloat
        let color: UInt32
        let turn: Double
    }

    let width: CGFloat
    let marks: [Mark]

    // The lattice comes from the existing web trace. The underlying lunar
    // photograph's provenance is recorded as outstanding in ASSETS.md.
    private static let plates: [BloomPlate] = {
        guard let url = Bundle.module.url(forResource: "halftone-bloom-plates", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([BloomPlate].self, from: data) else { return [] }
        return decoded
    }()

    static let large = plates.first ?? BloomPlate(width: 132, marks: [])
    static let small = plates.dropFirst().first ?? BloomPlate(width: 41, marks: [])

    func canvas(_ fraction: Double) -> some View {
        Canvas(opaque: false, colorMode: .nonLinear) { context, _ in
            var buckets: [UInt32: Path] = [:]
            for mark in marks {
                let position = min(1, max(0, (fraction - mark.turn + 0.02) / 0.04))
                let light = position * position * (3 - 2 * position)
                let diameter = mark.size * (0.7 + 0.3 * light)
                let color = light > 0.5 ? mark.color : BloomPalette.ghost
                buckets[color, default: Path()].addEllipse(in: CGRect(
                    x: mark.x - diameter / 2, y: mark.y - diameter / 2, width: diameter, height: diameter
                ))
            }
            for (color, path) in buckets { context.fill(path, with: .color(BloomPalette.color(color))) }
        }
        .frame(width: width, height: width)
    }
}
