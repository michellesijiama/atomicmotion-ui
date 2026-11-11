import SwiftUI

/// A Material 3 listening panel with a continuously moving, clipped blue edge glow.
public struct GeminiLive: View {
    /// The React demo stays in its listening state. A host app can handle these controls here.
    public enum Action: Sendable {
        case transcript, options, close, unavailableSource, sharedSource, pause, keyboard
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let loop: Bool
    private let onAction: ((Action) -> Void)?

    public init(loop: Bool = false, onAction: ((Action) -> Void)? = nil) {
        self.loop = loop
        self.onAction = onAction
    }

    public var body: some View {
        GeometryReader { geometry in
            let wide = geometry.size.width >= 640
            let width = max(0, min(loop ? 585 : 920, geometry.size.width - (wide ? 40 : 24)))
            let height = loop ? 300 : max(280, width / 1.95)
            panel(wide: wide)
                .frame(width: width, height: height)
                .position(x: geometry.size.width / 2, y: max(height / 2 + 20, geometry.size.height / 2))
        }
        .frame(minHeight: 320)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Gemini Live")
    }

    private func panel(wide: Bool) -> some View {
        let outline = RoundedRectangle(cornerRadius: 28, style: .circular)
        return ZStack {
            GeminiLiveLight()
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 0) {
                header(wide: wide)
                GeminiLiveChipFlow {
                    sourceChip("Can't share", action: .unavailableSource) {
                        GeminiLiveIcon(symbol: .info).frame(width: 18, height: 18).opacity(0.8)
                    }
                    sourceChip("1 shared", action: .sharedSource) {
                        Text("30")
                            .font(DesignFont.bundled("Geist-Bold", size: 13, fallback: .system(size: 13, weight: .bold)))
                            .foregroundStyle(.white)
                            .frame(width: 22, height: 22)
                            .background(GeminiLiveColor.blue, in: RoundedRectangle(cornerRadius: 5, style: .circular))
                    }
                }
                .padding(.top, 24)
                Spacer(minLength: 0)
                controls.frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(.horizontal, wide ? 32 : 16)
            .padding(.vertical, wide ? 20 : 16)
        }
        .clipShape(outline)
        .overlay {
            outline.inset(by: -0.5).stroke(GeminiLiveColor.text, lineWidth: 1)
                .allowsHitTesting(false)
        }
    }

    private func header(wide: Bool) -> some View {
        HStack(alignment: .top, spacing: 4) {
            Text("Listening...")
                .font(DesignFont.sans(wide ? 22 : 20))
                .foregroundStyle(GeminiLiveColor.text)
                .lineLimit(1)
                .fixedSize()
                .frame(height: wide ? 22 : 20)
            Spacer(minLength: 0)
            HStack(spacing: wide ? 12 : 4) {
                headerButton(.article, "Open transcript panel", action: .transcript)
                headerButton(.options, "More options", action: .options)
                headerButton(.close, "Close Gemini Live", action: .close)
            }
        }
    }

    private func headerButton(_ symbol: GeminiLiveIcon.Symbol, _ label: String, action: Action) -> some View {
        Button {
            onAction?(action)
        } label: {
            GeminiLiveIcon(symbol: symbol)
                .frame(width: 24, height: 24)
                .frame(width: 40, height: 40)
                .contentShape(Circle())
        }
        .buttonStyle(GeminiLiveHeaderButtonStyle(reduceMotion: reduceMotion))
        .accessibilityLabel(label)
    }

    private func sourceChip<Icon: View>(_ label: String, action: Action, @ViewBuilder icon: () -> Icon) -> some View {
        Button {
            onAction?(action)
        } label: {
            HStack(spacing: 8) {
                icon()
                Text(label)
                    .font(DesignFont.sans(15, medium: true))
                    .tracking(-0.15)
                    .fixedSize()
                GeminiLiveIcon(symbol: .close)
                    .frame(width: 16, height: 16)
                    .opacity(0.8)
            }
            .foregroundStyle(GeminiLiveColor.chipText)
            .padding(.horizontal, 12)
            .frame(height: 40)
            .background(GeminiLiveColor.chip, in: RoundedRectangle(cornerRadius: 7, style: .circular))
            .overlay(alignment: .top) {
                RoundedRectangle(cornerRadius: 7, style: .circular).strokeBorder(.white.opacity(0.08), lineWidth: 1)
                    .mask(alignment: .top) { Rectangle().frame(height: 1) }
            }
            .contentShape(.rect(cornerRadius: 7, style: .circular))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private var controls: some View {
        HStack(spacing: 4) {
            control(.pause, "Pause", action: .pause)
            Rectangle()
                .fill(GeminiLiveColor.divider)
                .frame(width: 1, height: 28)
                .accessibilityHidden(true)
            control(.keyboard, "Keyboard", action: .keyboard)
        }
        .padding(.horizontal, 8)
        .frame(height: 48)
        .background(GeminiLiveColor.control, in: RoundedRectangle(cornerRadius: 16, style: .circular))
        .shadow(color: .black.opacity(0.18), radius: 18, y: 6)
    }

    private func control(_ symbol: GeminiLiveIcon.Symbol, _ label: String, action: Action) -> some View {
        Button {
            onAction?(action)
        } label: {
            GeminiLiveIcon(symbol: symbol)
                .foregroundStyle(GeminiLiveColor.subtleText)
                .frame(width: 22, height: 22)
                .frame(width: 43, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

private enum GeminiLiveColor {
    static let surface = rgb(0x1d1b20)
    static let control = rgb(0x2b2930)
    static let divider = rgb(0x49454f)
    static let text = rgb(0xe6e0e9)
    static let subtleText = rgb(0xcac4d0)
    static let blue = rgb(0x4285f4)
    static let paleBlue = rgb(0x8ab4f8)
    static let chip = rgb(0x243a61)
    static let chipText = rgb(0xd8e3f8)
    static let shade = rgb(0x07080a)

    private static func rgb(_ value: UInt32) -> Color {
        Color(red: Double(value >> 16) / 255,
              green: Double((value >> 8) & 255) / 255,
              blue: Double(value & 255) / 255)
    }
}

private struct GeminiLiveHeaderButtonStyle: ButtonStyle {
    let reduceMotion: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(configuration.isPressed ? GeminiLiveColor.text : GeminiLiveColor.subtleText)
            .background(.white.opacity(configuration.isPressed ? 0.08 : 0), in: Circle())
            .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: configuration.isPressed)
    }
}

private struct GeminiLiveChipFlow: Layout {
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let (points, sizes) = placement(in: proposal.width ?? .infinity, subviews: subviews)
        let width = zip(points, sizes).map { $0.x + $1.width }.max() ?? 0
        let height = zip(points, sizes).map { $0.y + $1.height }.max() ?? 0
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let (points, sizes) = placement(in: proposal.width ?? bounds.width, subviews: subviews)
        for index in subviews.indices {
            subviews[index].place(at: CGPoint(x: bounds.minX + points[index].x, y: bounds.minY + points[index].y),
                                  anchor: .topLeading, proposal: ProposedViewSize(sizes[index]))
        }
    }

    private func placement(in width: CGFloat, subviews: Subviews) -> ([CGPoint], [CGSize]) {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        var origin = CGPoint.zero
        let points = sizes.map { size in
            if origin.x > 0 && origin.x + size.width > width {
                origin.x = 0
                origin.y += 48
            }
            let point = origin
            origin.x += size.width + 8
            return point
        }
        return (points, sizes)
    }
}

private struct GeminiLiveIcon: View {
    enum Symbol { case article, options, close, info, pause, keyboard }
    let symbol: Symbol

    var body: some View {
        Canvas { context, size in
            var context = context
            context.scaleBy(x: size.width / 24, y: size.height / 24)
            let color = GraphicsContext.Shading.foreground
            var shape = Path()
            func rect(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat, radius: CGFloat = 0) {
                shape.addRoundedRect(in: CGRect(x: x, y: y, width: width, height: height),
                                     cornerSize: CGSize(width: radius, height: radius))
            }
            func circle(_ x: CGFloat, _ y: CGFloat, _ radius: CGFloat) {
                shape.addEllipse(in: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2))
            }
            switch symbol {
            case .article:
                rect(3, 3, 18, 18, radius: 3)
                rect(5, 5, 14, 14, radius: 1)
                rect(8, 9, 8, 2)
                rect(8, 13, 8, 2)
            case .options:
                for y in [8.0, 12.0, 16.0] { circle(12, y, 1.8) }
            case .close:
                shape.move(to: CGPoint(x: 5.7, y: 5.7))
                shape.addLine(to: CGPoint(x: 18.3, y: 18.3))
                shape.move(to: CGPoint(x: 18.3, y: 5.7))
                shape.addLine(to: CGPoint(x: 5.7, y: 18.3))
                context.stroke(shape, with: color, lineWidth: 1.98)
                return
            case .info:
                circle(12, 12, 10)
                circle(12, 12, 8)
                circle(12, 7.6, 1.25)
                rect(11, 11, 2, 6)
            case .pause:
                rect(6, 5, 4.5, 14, radius: 1)
                rect(13.5, 5, 4.5, 14, radius: 1)
            case .keyboard:
                rect(2, 6, 20, 12, radius: 2.78)
                rect(4, 8, 16, 8, radius: 0.78)
                for x in [6.5, 9.5, 12.5, 15.5] { rect(x, 8.75, 2, 1.7) }
                rect(6.5, 11.55, 2, 1.7)
                rect(9.5, 11.55, 8, 1.7)
            }
            context.fill(shape, with: color, style: FillStyle(eoFill: true))
        }
        .accessibilityHidden(true)
    }
}

private struct GeminiLiveLight: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var start = Date()

    private static let conicStops: [Gradient.Stop] = [
        .init(color: GeminiLiveColor.blue.opacity(0), location: 0),
        .init(color: GeminiLiveColor.blue.opacity(0.88), location: 34 / 360),
        .init(color: GeminiLiveColor.paleBlue.opacity(0.92), location: 58 / 360),
        .init(color: GeminiLiveColor.blue.opacity(0.16), location: 92 / 360),
        .init(color: GeminiLiveColor.blue.opacity(0), location: 132 / 360),
        .init(color: GeminiLiveColor.blue.opacity(0.74), location: 188 / 360),
        .init(color: GeminiLiveColor.paleBlue.opacity(0.82), location: 214 / 360),
        .init(color: GeminiLiveColor.blue.opacity(0), location: 258 / 360),
        .init(color: GeminiLiveColor.blue.opacity(0.72), location: 316 / 360),
        .init(color: GeminiLiveColor.blue.opacity(0), location: 1),
    ]
    private static let conicTiming: [Double] = [0, 0.17, 0.33, 0.51, 0.7, 0.86, 1]
    private static let radialTiming: [Double] = [0, 0.24, 0.5, 0.76, 1]
    private static let waveTiming: [Double] = [0, 0.14, 0.28, 0.45, 0.62, 0.78, 1]

    var body: some View {
        GeometryReader { geometry in
            TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion || scenePhase != .active)) { timeline in
                let time = reduceMotion ? 0 : max(0, timeline.date.timeIntervalSince(start))
                let size = geometry.size
                ZStack {
                    GeminiLiveColor.surface
                    LinearGradient(stops: [
                        .init(color: GeminiLiveColor.paleBlue.opacity(0.08), location: 0),
                        .init(color: GeminiLiveColor.blue.opacity(0.04), location: 0.42),
                        .init(color: GeminiLiveColor.surface.opacity(0), location: 0.72),
                    ], startPoint: .topLeading, endPoint: .bottomTrailing)
                    conic(size, time: time)
                    radials(size, time: time)
                    RoundedRectangle(cornerRadius: 22, style: .circular)
                        .fill(GeminiLiveColor.shade.opacity(0.76))
                        .padding(16)
                        .blur(radius: 12)
                    waves(time: time)
                }
                .compositingGroup()
            }
        }
        .allowsHitTesting(false)
    }

    private func conic(_ size: CGSize, time: TimeInterval) -> some View {
        let t = (time / 9.8).truncatingRemainder(dividingBy: 1)
        let angle = keyframe([0, 74, 148, 221, 288, 360], at: t)
        let scale = keyframe([1, 1.035, 0.995, 1.045, 1.01, 1], at: t)
        let opacity = keyframe([0.72, 0.26, 0.82, 0.18, 0.64, 0.34, 0.78], at: t, times: Self.conicTiming)
        return AngularGradient(stops: Self.conicStops, center: .center, angle: .degrees(-48))
            .frame(width: size.width + 56, height: size.height + 56)
            .clipShape(.rect(cornerRadius: 44, style: .circular))
            .blur(radius: 30)
            .rotationEffect(.degrees(angle))
            .scaleEffect(scale)
            .opacity(opacity)
            .blendMode(.screen)
            .position(x: size.width / 2, y: size.height / 2)
    }

    private func radials(_ size: CGSize, time: TimeInterval) -> some View {
        let t = (time / 7.6).truncatingRemainder(dividingBy: 1)
        let opacity = keyframe([0.18, 0.54, 0.22, 0.68, 0.12, 0.48, 0.2], at: t)
        let x = keyframe([0, 0.84, 1, 0.18, 0], at: t, times: Self.radialTiming)
        let y = keyframe([0.18, 0.06, 0.74, 1, 0.18], at: t, times: Self.radialTiming)
        let width = size.width + 36
        let height = size.height + 36
        return Canvas { context, _ in
            let imageWidth = width * 1.6
            let imageHeight = height * 1.6
            let backgroundX = (width - imageWidth) * x
            let backgroundY = (height - imageHeight) * y
            let frame = Path(CGRect(x: 0, y: 0, width: width, height: height))
            func glow(_ x: CGFloat, _ y: CGFloat, _ color: Color, _ alpha: Double, stops: [CGFloat], tail: Double) {
                let px = x * imageWidth
                let py = y * imageHeight
                let radius = hypot(max(px, imageWidth - px), max(py, imageHeight - py))
                let gradient = Gradient(stops: [
                    .init(color: color.opacity(alpha), location: stops[0]),
                    .init(color: GeminiLiveColor.blue.opacity(tail), location: stops[1]),
                    .init(color: GeminiLiveColor.blue.opacity(0), location: stops[2]),
                    .init(color: GeminiLiveColor.blue.opacity(0), location: 1),
                ])
                context.fill(frame, with: .radialGradient(gradient,
                    center: CGPoint(x: px + backgroundX, y: py + backgroundY), startRadius: 0, endRadius: radius))
            }
            glow(0.62, 1.04, GeminiLiveColor.paleBlue, 0.78, stops: [0.07, 0.18, 0.32], tail: 0.18)
            glow(0.92, 0.28, GeminiLiveColor.blue, 0.88, stops: [0.07, 0.16, 0.30], tail: 0.18)
            glow(0.12, 0.18, GeminiLiveColor.paleBlue, 0.86, stops: [0.06, 0.12, 0.24], tail: 0.24)
        }
        .frame(width: width, height: height)
        .clipShape(.rect(cornerRadius: 40, style: .circular))
        .blur(radius: 22)
        .opacity(opacity)
        .blendMode(.screen)
        .position(x: size.width / 2, y: size.height / 2)
    }

    private func waves(time: TimeInterval) -> some View {
        Canvas { context, size in
            for side in GeminiLiveWaveSide.allCases {
                let t = (time / side.duration).truncatingRemainder(dividingBy: 1)
                let opacity = keyframe(side.opacity, at: t) * 0.42
                let translate = side.horizontal ? [-16.0, 28, -8, 36, -16] : [-18.0, 24, -10, 30, -18]
                let shift = keyframe(translate, at: t)
                let depth = keyframe([0.52, 0.86, 0.64, 0.94, 0.46, 0.78, 0.58], at: t, times: Self.waveTiming)
                let width = keyframe([7, 10, 8, 11, 6, 9, 7], at: t, times: Self.waveTiming)
                let shape = keyframe([0, 1, 2, 0, 2, 1, 0], at: t, times: Self.waveTiming)
                let points = GeminiLiveWave.points(horizontal: side.horizontal, shape: shape)
                let rect = side.frame(size, shift: shift)
                let path = Path { path in
                    path.addLines(points.map { CGPoint(x: rect.minX + $0.x * rect.width, y: rect.minY + $0.y * rect.height) })
                }
                let gradient = Gradient(stops: [
                    .init(color: GeminiLiveColor.blue.opacity(0), location: 0),
                    .init(color: GeminiLiveColor.paleBlue.opacity(0.92), location: 0.32),
                    .init(color: GeminiLiveColor.blue.opacity(0.95), location: 0.54),
                    .init(color: GeminiLiveColor.blue.opacity(0), location: 0.82),
                ])
                var layer = context
                layer.opacity = opacity
                layer.addFilter(.shadow(color: GeminiLiveColor.blue.opacity(0.85), radius: 30))
                layer.addFilter(.blur(radius: 15))
                let scale = side.horizontal ? rect.width / 360 : rect.height / 260
                layer.stroke(path.trimmedPath(from: 0, to: depth), with: .linearGradient(
                    gradient, startPoint: rect.origin,
                    endPoint: CGPoint(x: side.horizontal ? rect.maxX : rect.minX,
                                      y: side.horizontal ? rect.minY : rect.maxY)),
                    style: StrokeStyle(lineWidth: width * sqrt(max(0, scale)), lineCap: .round, lineJoin: .round))
            }
        }
    }

    private func keyframe(_ values: [Double], at t: Double, times: [Double]? = nil) -> Double {
        let last = values.count - 1
        for index in 0..<last {
            let a = times?[index] ?? Double(index) / Double(last)
            let b = times?[index + 1] ?? Double(index + 1) / Double(last)
            if t <= b {
                let fraction = max(0, min(1, (t - a) / (b - a)))
                let ease = fraction * fraction * (3 - 2 * fraction)
                return values[index] + (values[index + 1] - values[index]) * ease
            }
        }
        return values[last]
    }
}

private enum GeminiLiveWaveSide: CaseIterable {
    case top, right, bottom, left
    var horizontal: Bool { self == .top || self == .bottom }

    var opacity: [Double] {
        switch self {
        case .top: [0.72, 0.1, 0.02, 0.84, 0.16, 0.04, 0.94, 0.12]
        case .right: [0.08, 0.62, 0.14, 0.02, 0.78, 0.1, 0.04, 0.68]
        case .bottom: [0.04, 0.18, 0.76, 0.08, 0.02, 0.64, 0.12, 0.04]
        case .left: [0.1, 0.02, 0.52, 0.12, 0.82, 0.06, 0.2, 0.04]
        }
    }

    var duration: TimeInterval {
        switch self {
        case .top: 7.8
        case .right: 9.4
        case .bottom: 8.8
        case .left: 10.2
        }
    }

    func frame(_ size: CGSize, shift: CGFloat) -> CGRect {
        switch self {
        case .top: CGRect(x: 24 + shift, y: -15, width: max(0, size.width - 48), height: 48)
        case .right: CGRect(x: size.width - 33, y: 24 + shift, width: 48, height: max(0, size.height - 48))
        case .bottom: CGRect(x: 24 + shift, y: size.height - 33, width: max(0, size.width - 48), height: 48)
        case .left: CGRect(x: -15, y: 24 + shift, width: 48, height: max(0, size.height - 48))
        }
    }
}

private enum GeminiLiveWave {
    // Sample the original relaxed, active and tight cubic paths once into a common mesh.
    private static let horizontal = [
        [36,18,54,30,90,24, 126,18,144,30,180,24, 216,18,234,30,270,24, 306,18,324,30,360,24],
        [22,8,48,40,72,24, 96,8,122,40,144,24, 168,8,192,40,216,24, 240,8,266,40,288,24, 314,8,338,40,360,24],
        [16,4,32,44,48,24, 64,4,80,44,96,24, 112,4,128,44,144,24, 160,4,176,44,192,24, 208,4,224,44,240,24, 256,4,272,44,288,24, 304,4,320,44,336,24, 344,14,352,18,360,24],
    ].map { samples($0, end: 360) }
    private static let vertical = [
        [26,18,42,30,68,24, 94,18,110,30,136,24, 162,18,178,30,204,24, 230,18,244,30,260,24],
        [18,8,38,40,56,24, 74,8,94,40,112,24, 130,8,150,40,168,24, 186,8,206,40,224,24, 240,10,248,38,260,24],
        [12,4,24,44,36,24, 48,4,60,44,72,24, 84,4,96,44,108,24, 120,4,132,44,144,24, 156,4,168,44,180,24, 192,4,204,44,216,24, 228,4,240,44,252,24, 256,18,258,18,260,24],
    ].map { samples($0, end: 260) }

    static func points(horizontal: Bool, shape: Double) -> [CGPoint] {
        let a = min(2, max(0, Int(shape)))
        let b = min(2, a + 1)
        let fraction = shape - Double(a)
        let profiles = horizontal ? Self.horizontal : Self.vertical
        return zip(profiles[a], profiles[b]).enumerated().map { index, values in
            let along = CGFloat(index) / CGFloat(profiles[a].count - 1)
            let across = values.0 + (values.1 - values.0) * fraction
            return horizontal ? CGPoint(x: along, y: across) : CGPoint(x: across, y: along)
        }
    }

    private static func samples(_ controls: [Double], end: Double) -> [CGFloat] {
        var points = [CGPoint(x: 0, y: 24)]
        for segment in stride(from: 0, to: controls.count, by: 6) {
            guard let origin = points.last else { break }
            let c1 = CGPoint(x: controls[segment], y: controls[segment + 1])
            let c2 = CGPoint(x: controls[segment + 2], y: controls[segment + 3])
            let target = CGPoint(x: controls[segment + 4], y: controls[segment + 5])
            for step in 1...16 {
                let t = CGFloat(step) / 16
                let u = 1 - t
                let a = u * u * u
                let b = 3 * u * u * t
                let c = 3 * u * t * t
                let d = t * t * t
                points.append(CGPoint(x: a * origin.x + b * c1.x + c * c2.x + d * target.x,
                                      y: a * origin.y + b * c1.y + c * c2.y + d * target.y))
            }
        }
        var right = 1
        return (0...96).map { index in
            let x = end * Double(index) / 96
            while right < points.count - 1 && points[right].x < x { right += 1 }
            let left = points[right - 1]
            let next = points[right]
            let t = (x - left.x) / (next.x - left.x)
            return (left.y + (next.y - left.y) * t) / 48
        }
    }
}
