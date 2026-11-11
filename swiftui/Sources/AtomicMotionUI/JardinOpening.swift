import SwiftUI
import UIKit

/// The illustrated City in Bloom opening on a landscape iPad frame.
public struct JardinOpening: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var start = Date()
    @State private var pausedAt: Date?
    @State private var entered = false
    @State private var pointer = CGPoint.zero

    private let title: String
    private let onEnter: (() -> Void)?
    private let deviceAspect: CGFloat = 2816 / 2155

    public init(title: String = "City in Bloom", onEnter: (() -> Void)? = nil) {
        self.title = title
        self.onEnter = onEnter
    }

    public var body: some View {
        GeometryReader { proxy in
            let width = min(980, proxy.size.width, max(0, proxy.size.height - 56) * deviceAspect)
            if width > 0 {
                device(width)
                    .position(x: proxy.size.width / 2, y: proxy.size.height / 2)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                if let pausedAt {
                    start += Date().timeIntervalSince(pausedAt)
                    self.pausedAt = nil
                }
            } else if pausedAt == nil {
                pausedAt = Date()
            }
        }
    }

    private func device(_ width: CGFloat) -> some View {
        let height = width / deviceAspect
        let screenWidth = width * 0.940255
        let deviceShape = RoundedRectangle(cornerRadius: width * 0.039, style: .circular)
        let cameraSize: CGFloat = width <= 600 ? 3 : 5
        return ZStack {
            deviceShape.fill(jardinColor(0x101112))
                .shadow(color: jardinColor(0x08090A), radius: 0, y: 2)
                .shadow(color: jardinColor(0x101412).opacity(0.22), radius: 11, y: 14)
            deviceShape.strokeBorder(jardinColor(0x252628), lineWidth: 3)
            deviceShape.strokeBorder(jardinColor(0x505153), lineWidth: 1)
            screen(CGSize(width: screenWidth, height: screenWidth * 0.75), compact: width <= 600)
                .clipShape(RoundedRectangle(cornerRadius: width * 0.025, style: .circular))
            Circle()
                .fill(jardinColor(0x060709))
                .overlay { Circle().strokeBorder(jardinColor(0x232833), lineWidth: 1) }
                .frame(width: cameraSize, height: cameraSize)
                .position(x: width / 2, y: height * 0.0155 + cameraSize / 2)
                .accessibilityHidden(true)
        }
        .frame(width: width, height: height)
    }

    private func screen(_ size: CGSize, compact: Bool) -> some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion || scenePhase != .active)) { tick in
            let time = max(0, (pausedAt ?? tick.date).timeIntervalSince(start))
            let inviteAt = title == "City in Bloom" ? JardinInk.finished + 0.25 : 7.6
            let invitation = reduceMotion ? 1 : jardinEase((time - inviteAt) / 1.4)
            ZStack(alignment: .topLeading) {
                jardinColor(0xF5E9DC)
                world(size, time: time)
                    .accessibilityHidden(true)
                    .contentShape(Rectangle())
                    .gesture(DragGesture(minimumDistance: 3)
                        .onChanged { if !reduceMotion { movePointer($0.location, in: size) } }
                        .onEnded { _ in resetPointer() })
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let position): if !reduceMotion { movePointer(position, in: size) }
                        case .ended: resetPointer()
                        }
                    }
                titleArt(size, time: time)
                    .offset(y: entered ? -12 : 0)
                    .opacity(entered ? 0 : 1)
                    .accessibilityHidden(entered)
                    .allowsHitTesting(false)
                if invitation > 0 {
                    invitationButton(size, compact: compact, progress: invitation)
                }

                Capsule()
                    .fill(jardinColor(0x253D37).opacity(0.4))
                    .frame(width: size.width * 0.14, height: compact ? 3 : 4)
                    .position(x: size.width / 2, y: size.height - (compact ? 6.5 : 11))
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
            .frame(width: size.width, height: size.height)
        }
        .frame(width: size.width, height: size.height)
        .clipped()
        .accessibilityElement(children: .contain)
        .accessibilityLabel("A living New York garden")
    }

    private func invitationButton(_ size: CGSize, compact: Bool, progress: Double) -> some View {
        let canEnter = !entered && progress >= 1
        return Button {
            guard canEnter else { return }
            resetPointer()
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.85)) { entered = true }
            onEnter?()
        } label: {
            Text("Click to continue")
                .font(.system(size: max(12, size.width * 0.015), weight: .semibold))
                .tracking(max(9, size.width * 0.011) * 0.015)
                .foregroundStyle(.white)
                .shadow(color: jardinColor(0x173A32).opacity(0.6), radius: 2, y: 1)
                .shadow(color: jardinColor(0x173A32).opacity(0.25), radius: 6)
                .padding(.horizontal, compact ? 16 : 23)
                .frame(height: compact ? 36 : 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .opacity(entered ? 0 : progress)
        .position(x: size.width / 2, y: size.height * 0.94 - (compact ? 18 : 22) + 7 * (1 - progress))
        .disabled(!canEnter)
        .accessibilityHidden(!canEnter)
        .accessibilityIdentifier("jardin-opening-continue")
    }

    private func world(_ size: CGSize, time: TimeInterval) -> some View {
        let zoom = reduceMotion ? 1 : 1 + 0.115 * jardinBezier(time / 11, 0.18, 0.5, 0.25, 1)
        return ZStack(alignment: .topLeading) {
            scenery(.background, in: size, time: time)
            JardinOpeningArt.image("garden-visitors")
                .frame(width: size.width, height: size.height)
                .scaleEffect(0.75, anchor: UnitPoint(x: 0.5, y: 0.85))
                .offset(x: -0.02 * size.width)
            scenery(.midground, in: size, time: time)
            bird(alternate: false, in: size, time: time)
            bird(alternate: true, in: size, time: time)
            scenery(.foreground, in: size, time: time)
            flower(alternate: false, in: size, time: time)
            flower(alternate: true, in: size, time: time)
        }
        .frame(width: size.width, height: size.height)
        .scaleEffect(zoom, anchor: UnitPoint(x: 0.5, y: 0.62))
    }

    private func scenery(_ layer: JardinScenery, in size: CGSize, time: TimeInterval) -> some View {
        let width = size.width * 1.1
        let height = size.height * 1.1
        let phase = jardinAlternate(time + layer.offset, period: layer.duration)
        return JardinOpeningArt.image(layer.rawValue)
            .scaledToFill()
            .frame(width: width, height: height)
            .clipped()
            .scaleEffect(reduceMotion ? 1 : 1.015 + 0.02 * phase, anchor: UnitPoint(x: 0.5, y: 0.75))
            .rotationEffect(.degrees(reduceMotion ? 0 : -0.2 + 0.4 * phase), anchor: UnitPoint(x: 0.5, y: 0.75))
            .offset(x: reduceMotion ? 0 : width * (-0.007 + 0.014 * phase),
                    y: reduceMotion ? 0 : height * (0.0015 - 0.0065 * phase))
            .frame(width: width, height: height)
            .scaleEffect(entered ? 1 + layer.depth * 0.009 : 1)
            .animation(reduceMotion ? nil : .timingCurve(0.2, 0.7, 0.2, 1, duration: 2.4), value: entered)
            .position(x: size.width / 2 - pointer.x * layer.depth, y: size.height / 2 - pointer.y * layer.depth * 0.55)
    }

    private func bird(alternate: Bool, in size: CGSize, time: TimeInterval) -> some View {
        let width = size.width * (alternate ? 0.05 : 0.07)
        let height = width * 0.75
        let pose = JardinBird(time: time + (alternate ? 16.5 : 5))
        let frame = reduceMotion ? 0 : Int(time.truncatingRemainder(dividingBy: 0.72) / 0.18) % 4
        let left = size.width * (reduceMotion ? (alternate ? 0.72 : 0.20) : pose.x)
        let top = reduceMotion
            ? (alternate ? 0.17 : 0.24) * size.height
            : (alternate ? 0.1 : 0) * size.height + size.width * pose.y
        return JardinOpeningArt.bird(frame)
            .frame(width: width, height: height)
            .offset(y: frame > 1 ? height * 0.1475 : 0)
            .rotationEffect(.degrees(reduceMotion ? 0 : pose.angle))
            .position(x: left + width / 2, y: top + height / 2)
    }

    private func flower(alternate: Bool, in size: CGSize, time: TimeInterval) -> some View {
        let width = size.width * (alternate ? 0.21 : 0.24)
        let phase = jardinAlternate(time + (alternate ? 3 : 0), period: alternate ? 7.2 : 5.8)
        let left = alternate ? size.width * 1.04 - width : -size.width * 0.04
        let bottom = size.height * (alternate ? 0.98 : 1.05)
        return JardinOpeningArt.image("flower")
            .frame(width: width, height: width)
            .offset(x: reduceMotion ? 0 : size.width * (-0.003 + 0.006 * phase))
            .rotationEffect(.degrees(reduceMotion ? 0 : -4 + 8 * phase), anchor: UnitPoint(x: 0.57, y: 0.98))
            .scaleEffect(x: alternate ? -1 : 1)
            .position(x: left + width / 2, y: bottom - width / 2)
    }

    private func titleArt(_ size: CGSize, time: TimeInterval) -> some View {
        let logo = title == "City in Bloom"
        let width = size.width * (logo ? 0.585 : 0.65)
        let height = size.width * 0.195
        return Group {
            if logo {
                JardinOpeningArt.logo(time: reduceMotion ? JardinInk.finished : time)
            } else {
                let fontSize = min(178, 1100 / CGFloat(max(1, title.count))) * width / 800
                let font = DesignFont.bundled("InstrumentSerif-Regular", size: fontSize, fallback: .system(size: fontSize, design: .serif))
                Text(title)
                    .font(font)
                    .tracking(-fontSize * 0.035)
                    .lineLimit(1)
                    .foregroundStyle(.white)
                    .frame(width: width, height: height, alignment: .center)
                    .mask {
                        JardinInkMask(time: reduceMotion ? 7.6 : time, logo: false)
                    }
            }
        }
        .frame(width: width, height: height)
        .shadow(color: jardinColor(0x123D35).opacity(0.22), radius: 3, y: 1)
        .position(x: size.width / 2, y: size.height * 0.18 + height / 2)
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isHeader)
    }

    private func movePointer(_ location: CGPoint, in size: CGSize) {
        let target = CGPoint(x: max(-1, min(1, 2 * location.x / size.width - 1)),
                             y: max(-1, min(1, 2 * location.y / size.height - 1)))
        withAnimation(.smooth(duration: 0.65)) { pointer = target }
    }

    private func resetPointer() {
        guard pointer != .zero else { return }
        withAnimation(reduceMotion ? nil : .smooth(duration: 0.65)) { pointer = .zero }
    }
}

private enum JardinScenery: String {
    case background = "background-nyc-sunny"
    case midground, foreground

    var depth: CGFloat {
        switch self {
        case .background: 5
        case .midground: 13
        case .foreground: 24
        }
    }

    var duration: Double {
        switch self {
        case .background: 48
        case .midground: 37
        case .foreground: 29
        }
    }

    var offset: Double {
        switch self {
        case .background: 12
        case .midground: 8
        case .foreground: 4
        }
    }
}

private struct JardinBird {
    private static let positions: [(x: CGFloat, y: CGFloat, angle: Double)] = [
        (-0.15, 0.24, -8), (0.20, 0.1575, -4), (0.53, 0.195, 7), (0.85, 0.1275, -6), (1.20, 0.0825, -8),
    ]

    let x: CGFloat
    let y: CGFloat
    let angle: Double

    init(time: Double) {
        let progress = 4 * time.truncatingRemainder(dividingBy: 23) / 23
        let index = Int(progress)
        let fraction = progress - Double(index)
        let from = Self.positions[index]
        let to = Self.positions[index + 1]
        x = from.x + (to.x - from.x) * fraction
        y = from.y + (to.y - from.y) * fraction
        angle = from.angle + (to.angle - from.angle) * fraction
    }
}

private enum JardinOpeningArt {
    private static func load(_ name: String) -> UIImage? {
        guard let url = Bundle.module.url(forResource: "jardin-opening-\(name)", withExtension: "png") else { return nil }
        return UIImage(contentsOfFile: url.path)
    }

    private static let assets: [String: UIImage] = Dictionary(uniqueKeysWithValues:
        ["background-nyc-sunny", "midground", "foreground", "flower", "city-in-bloom-logo", "garden-visitors"]
            .compactMap { name in load(name).map { (name, $0) } }
    )

    private static let wings: [UIImage?] = {
        guard let sprite = load("bird-sprite")?.cgImage else { return Array(repeating: nil, count: 4) }
        let width = sprite.width / 2
        let height = sprite.height / 2
        return (0..<4).map { index in
            let box = CGRect(x: index % 2 * width, y: index / 2 * height, width: width, height: height)
            return sprite.cropping(to: box).map { UIImage(cgImage: $0) }
        }
    }()

    @ViewBuilder
    static func image(_ name: String) -> some View {
        if let art = assets[name] {
            Image(uiImage: art).resizable().interpolation(.high)
        }
    }

    @ViewBuilder
    static func logo(time: Double) -> some View {
        if let art = assets["city-in-bloom-logo"] {
            Canvas { context, size in
                context.clipToLayer { mask in
                    JardinInkMask.paint(time: time, logo: true, context: mask, size: size)
                }
                context.draw(Image(uiImage: art), in: CGRect(origin: .zero, size: size))
            }
        }
    }

    @ViewBuilder
    static func bird(_ index: Int) -> some View {
        if let art = wings[index] { Image(uiImage: art).resizable().interpolation(.high) }
    }
}

private struct JardinInkMask: View {
    let time: Double
    let logo: Bool

    var body: some View {
        Canvas { context, size in
            Self.paint(time: time, logo: logo, context: context, size: size)
        }
        .accessibilityHidden(true)
    }

    static func paint(time: Double, logo: Bool, context: GraphicsContext, size: CGSize) {
        let scale = size.width / (logo ? 2172 : 800)
        let transform = CGAffineTransform(scaleX: scale, y: scale)
        if logo {
            for stroke in JardinInk.strokes where stroke.start <= time {
                let fraction = jardinBezier((time - stroke.start) / stroke.duration, 0.25, 0.05, 0.45, 1)
                paint(stroke.path, width: stroke.width, fraction: fraction, scale: scale, transform: transform, context: context)
            }
        } else if time >= 3 {
            let fraction = jardinBezier((time - 3) / 4.6, 0.32, 0.05, 0.27, 1)
            paint(JardinInk.brush, width: 46, fraction: fraction, scale: scale, transform: transform, context: context)
        }
    }

    private static func paint(_ path: Path, width: CGFloat, fraction: Double, scale: CGFloat, transform: CGAffineTransform, context: GraphicsContext) {
        guard fraction > 0 else { return }
        let ink = fraction >= 1 ? path : path.trimmedPath(from: 0, to: fraction)
        context.stroke(ink.applying(transform), with: .color(.white),
                       style: StrokeStyle(lineWidth: width * scale, lineCap: .round, lineJoin: .round))
    }
}

private enum JardinInk {
    struct Stroke {
        let path: Path
        let width: CGFloat
        let start: Double
        let duration: Double

        init(_ path: String, _ width: CGFloat, _ delay: Double, _ duration: Double) {
            self.path = JardinInk.path(path)
            self.width = width
            self.start = 3 + (delay - 3) / 1.3
            self.duration = duration / 1.3
        }
    }

    static let brush = Path { path in
        for index in 0..<31 {
            let point = CGPoint(x: 70 + index * 22, y: index.isMultiple(of: 2) ? 232 : 12)
            if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
    }

    private static func path(_ svg: String) -> Path {
        let separated = svg.replacingOccurrences(of: "([MLQ])", with: "$1 ", options: .regularExpression)
        var tokens = separated.split(separator: " ").makeIterator()
        func point() -> CGPoint {
            CGPoint(x: Double(tokens.next() ?? "") ?? 0, y: Double(tokens.next() ?? "") ?? 0)
        }
        var path = Path()
        while let command = tokens.next() {
            switch command {
            case "M": path.move(to: point())
            case "L": path.addLine(to: point())
            case "Q":
                let control = point()
                path.addQuadCurve(to: point(), control: control)
            default: break
            }
        }
        return path
    }

    static let finished = strokes.reduce(0) { max($0, $1.start + $1.duration) }

    // Centerlines shared with the React logo. Delays retain the original brush order.
    static let strokes: [Stroke] = [
        Stroke("M372 332 Q494 301 494 244 Q490 181 361 243 Q240 305 171 437 Q119 559 210 568 Q316 568 386 456", 94, 3, 0.464),
        Stroke("M94 478 Q22 514 45 549 Q72 581 146 526", 34, 3.476, 0.2),
        Stroke("M433 400 Q414 449 409 506 Q399 569 454 516 L490 474", 56, 3.688, 0.192),
        Stroke("M448 338 L474 326", 51, 3.892, 0.096),
        Stroke("M553 317 Q527 359 503 454 Q474 572 551 519 L614 447", 60, 4.0, 0.256),
        Stroke("M491 372 Q620 376 691 327", 30, 4.268, 0.144),
        Stroke("M611 400 Q592 445 590 506 Q585 562 632 515 Q674 462 705 398", 57, 4.424, 0.256),
        Stroke("M704 398 L689 544 Q673 635 611 691 Q548 735 538 678 Q520 615 651 546 Q740 463 782 450 Q821 448 793 499", 73, 4.692, 0.44),
        Stroke("M850 403 Q895 384 880 421 Q861 460 855 511 Q854 565 915 509 L943 474", 65, 5.144, 0.2),
        Stroke("M895 328 Q911 337 923 312", 63, 5.356, 0.096),
        Stroke("M954 401 L930 537 Q965 442 1021 408 Q1080 376 991 485 Q979 558 1040 512 L1088 479 Q1117 455 1149 464", 70, 5.464, 0.336),
        Stroke("M1371 228 Q1291 285 1254 403 Q1204 528 1108 599", 95, 5.812, 0.344),
        Stroke("M1156 353 Q1071 342 1177 257 Q1276 191 1360 216 Q1497 222 1407 309 Q1352 354 1225 377", 76, 6.168, 0.384),
        Stroke("M1212 380 Q1309 353 1378 391 Q1454 439 1356 546 Q1222 642 1102 619 Q1038 610 1065 550 M1337 413 Q1273 445 1182 548", 90, 6.564, 0.384),
        Stroke("M1547 277 Q1510 302 1480 434 L1458 510 Q1458 574 1523 514 L1553 475", 61, 6.96, 0.256),
        Stroke("M1603 402 Q1560 391 1537 463 Q1507 564 1590 541 Q1659 523 1631 440 Q1616 390 1588 408 Q1565 432 1613 443 L1671 422", 57, 7.228, 0.304),
        Stroke("M1741 403 Q1701 387 1675 458 Q1640 568 1729 542 Q1800 524 1773 441 Q1755 391 1728 408 Q1706 431 1758 444 L1818 420", 78, 7.544, 0.304),
        Stroke("M1831 402 L1804 540 Q1847 439 1893 408 Q1915 396 1897 453 L1880 536", 62, 7.86, 0.24),
        Stroke("M1880 535 Q1921 450 1959 416 Q1998 383 1976 464 L1967 510", 60, 8.112, 0.208),
        Stroke("M1967 510 Q1977 595 2057 608 Q2172 642 2137 568 L2096 533", 61, 8.332, 0.28),
        Stroke("M1350 373 Q1500 329 1614 291 Q1791 312 1866 297 Q1960 271 2033 249 Q2160 222 2113 269 L2087 286", 44, 8.624, 0.28),
        Stroke("M1614 300 L1614 260 M1595 300 L1595 282", 35, 8.916, 0.088),
        Stroke("M1643 299 L1643 280", 28, 9.016, 0.072),
        Stroke("M1670 298 L1670 228 L1670 175", 34, 9.1, 0.12),
        Stroke("M1706 302 L1706 272 M1694 302 L1694 281 M1727 303 L1727 289", 29, 9.232, 0.072),
        Stroke("M1752 304 L1752 244", 36, 9.316, 0.096),
        Stroke("M1778 305 L1778 270 M1782 305 L1782 263", 25, 9.424, 0.072),
        Stroke("M1802 302 L1802 207 L1802 187", 36, 9.508, 0.112),
        Stroke("M1830 300 L1830 274 M1826 300 L1826 268", 38, 9.632, 0.08),
        Stroke("M1868 293 L1868 150 L1868 66", 49, 9.724, 0.16),
        Stroke("M1907 284 L1907 249 M1924 278 L1924 218 M1947 271 L1947 246", 36, 9.896, 0.112),
        Stroke("M1970 266 L1970 191 L1970 156", 34, 10.02, 0.112),
        Stroke("M164 516 Q224 430 205 340 L170 282", 32, 10.144, 0.16),
        Stroke("M170 283 Q148 251 139 232", 84, 10.316, 0.112),
        Stroke("M222 326 Q253 277 277 187", 72, 10.44, 0.12),
        Stroke("M177 377 Q122 341 82 348", 73, 10.572, 0.112),
        Stroke("M139 487 L128 434", 49, 10.696, 0.096),
        Stroke("M175 488 Q221 444 256 417", 60, 10.804, 0.112),
        Stroke("M306 554 Q366 547 393 594", 66, 10.928, 0.12),
        Stroke("M1987 511 Q2022 442 2086 405 L2119 394", 30, 11.06, 0.16),
        Stroke("M2044 390 Q2049 350 2001 310", 69, 11.232, 0.12),
        Stroke("M2081 410 L2119 381", 70, 11.364, 0.104),
        Stroke("M2028 479 Q2074 463 2106 494", 54, 11.48, 0.112),
        Stroke("M1918 535 Q1948 548 1953 584", 56, 11.604, 0.112),
    ]
}

private func jardinAlternate(_ time: Double, period: Double) -> Double {
    let leg = time.truncatingRemainder(dividingBy: 2 * period) / period
    return jardinBezier(leg <= 1 ? leg : 2 - leg, 0.42, 0, 0.58, 1)
}

private func jardinEase(_ value: Double) -> Double {
    jardinBezier(value, 0.25, 0.1, 0.25, 1)
}

private func jardinBezier(_ value: Double, _ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) -> Double {
    if value <= 0 { return 0 }
    if value >= 1 { return 1 }
    func sample(_ t: Double, _ a: Double, _ b: Double) -> Double {
        let rest = 1 - t
        return 3 * rest * rest * t * a + 3 * rest * t * t * b + t * t * t
    }
    var lower = 0.0
    var upper = 1.0
    for _ in 0..<12 {
        let midpoint = (lower + upper) / 2
        if sample(midpoint, x1, x2) < value { lower = midpoint } else { upper = midpoint }
    }
    return sample((lower + upper) / 2, y1, y2)
}

private func jardinColor(_ rgb: UInt32) -> Color {
    Color(.sRGB, red: Double((rgb >> 16) & 255) / 255,
          green: Double((rgb >> 8) & 255) / 255, blue: Double(rgb & 255) / 255)
}
