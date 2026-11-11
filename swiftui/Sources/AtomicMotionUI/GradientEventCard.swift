import MetalKit
import SwiftUI

/// An endless, swipeable deck of animated invitations.
public struct GradientEventCard: View {
    public enum Aura: Int, Sendable {
        case waves, ovals, stack, orbit, hourglass, sphere, coil, streaks
    }

    public enum Mood: Sendable {
        case monet, matisse, rothko, hockney, hilma, delaunay, frankenthaler, okeeffe

        fileprivate var palette: Palette {
            switch self {
            case .monet: Palette(
                [0xB9C4F2, 0xA9C7F0, 0xA6D6EA, 0xB4E4DC, 0xCDEFD9, 0xE2F6E4, 0xF1FBF0],
                [0xC9B8F2, 0x9FD3F5, 0xA9DDB0, 0xF2B8D6])
            case .matisse: Palette(
                [0x4F7BFF, 0x5E9BFF, 0x7DB9FF, 0xA2D2FF, 0xC7E4FF, 0xE3F2FF, 0xF5FAFF],
                [0xB8F03A, 0xFF6F5E, 0xFFD93B, 0xFF4FA3])
            case .rothko: Palette(
                [0xFF9A3C, 0xFFAB45, 0xFFBE52, 0xFFD062, 0xFFE27A, 0xFFEE9C, 0xFFF7C4],
                [0xFF6B6B, 0xFFC83D, 0xFFB48A, 0xFFA5C8], ink: 0x4A2A12)
            case .hockney: Palette(
                [0x3FC9D9, 0x5AD5E0, 0x7EDFE7, 0xA4E9EE, 0xC6F1F3, 0xE1F8F8, 0xF4FCFC],
                [0xFFE04A, 0x3C8BFF, 0xFF8FC2, 0xC6F25A], ink: 0x123E48)
            case .hilma: Palette(
                [0xFFC6A8, 0xFFD0AE, 0xFFDAB4, 0xFFE3BC, 0xFFECC6, 0xFFF3D3, 0xFFF9E4],
                [0xFFB6D5, 0xD9BFF7, 0xA8D8FF, 0xFF9A5C], ink: 0x5A3A2A)
            case .delaunay: Palette(
                [0xFFF1B8, 0xFFF4BE, 0xFFF7C8, 0xFFF9D2, 0xFFFBDD, 0xFFFDE8, 0xFFFFF3],
                [0x2ED3C7, 0xFF7A1F, 0xFF3D8F, 0x2B5BFF], ink: 0x2A2440)
            case .frankenthaler: Palette(
                [0xF0B7C8, 0xF1BFCB, 0xF2C8CF, 0xF4D2D4, 0xF6DDDA, 0xF8E8E2, 0xFBF2EC],
                [0xB9D9B0, 0xF2C56B, 0xB6CDE3, 0xF6C1D1], ink: 0x4A3040)
            case .okeeffe: Palette(
                [0xBFDDF7, 0xCCE4F8, 0xD9EBF9, 0xE5F1FA, 0xEFF6FB, 0xF6FAFD, 0xFCFDFE],
                [0xF8BBD0, 0xD7C4F3, 0xFFF1C9, 0xBCEBD7], ink: 0x2E3A55)
            }
        }
    }

    public struct Event: Identifiable, Sendable {
        public let id: String
        public let pattern: Aura
        public let mood: Mood
        public let title: [String]
        public let subtitle: String
        public let dateLabel: String
        public let dateTime: String

        public init(id: String, pattern: Aura, mood: Mood, title: [String], subtitle: String, dateLabel: String, dateTime: String) {
            self.id = id
            self.pattern = pattern
            self.mood = mood
            self.title = title
            self.subtitle = subtitle
            self.dateLabel = dateLabel
            self.dateTime = dateTime
        }
    }

    public static let sampleEvents: [Event] = [
        Event(id: "poetry", pattern: .ovals, mood: .matisse, title: ["Poetry", "After Dark"], subtitle: "An evening of readings by candlelight, with a glass of something warm", dateLabel: "Thu 22 OCT", dateTime: "2026-10-22"),
        Event(id: "salon", pattern: .waves, mood: .monet, title: ["The Autumn", "Book Salon"], subtitle: "This season's pick: The Remains of the Day by Kazuo Ishiguro", dateLabel: "Wed 14 OCT", dateTime: "2026-10-14"),
        Event(id: "table", pattern: .stack, mood: .rothko, title: ["The Long", "Table"], subtitle: "A shared supper and a swap of the books you loved this year", dateLabel: "Thu 5 NOV", dateTime: "2026-11-05"),
        Event(id: "voices", pattern: .orbit, mood: .hockney, title: ["Two", "Voices"], subtitle: "Two novelists in conversation about writing from memory", dateLabel: "Thu 19 NOV", dateTime: "2026-11-19"),
        Event(id: "winter", pattern: .hourglass, mood: .hilma, title: ["The Winter", "Reading Party"], subtitle: "Closing the season with readings, cake and a raffle of signed copies", dateLabel: "Thu 3 DEC", dateTime: "2026-12-03"),
        Event(id: "press", pattern: .sphere, mood: .delaunay, title: ["Small Press", "Fair"], subtitle: "Twelve independent publishers, one long afternoon of browsing", dateLabel: "Sat 12 DEC", dateTime: "2026-12-12"),
        Event(id: "letters", pattern: .coil, mood: .frankenthaler, title: ["Letters", "by Lamplight"], subtitle: "Write to someone you have been meaning to; stamps and paper provided", dateLabel: "Sat 9 JAN", dateTime: "2027-01-09"),
        Event(id: "quiet", pattern: .streaks, mood: .okeeffe, title: ["The Quiet", "Hour"], subtitle: "Sixty minutes of silent reading together, then tea", dateLabel: "Thu 21 JAN", dateTime: "2027-01-21")
    ]

    private let events: [Event]
    private let loop: Bool
    private let onSelect: ((Event) -> Void)?
    private let onShare: ((Event) -> Void)?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var track: CGFloat
    @State private var active: Int
    @State private var panStart: CGFloat?
    @State private var interacted = false

    public init(
        events: [Event] = Self.sampleEvents,
        defaultIndex: Int = 0,
        loop: Bool = false,
        onSelect: ((Event) -> Void)? = nil,
        onShare: ((Event) -> Void)? = nil
    ) {
        self.events = events
        self.loop = loop
        self.onSelect = onSelect
        self.onShare = onShare
        let index = events.isEmpty ? 0 : max(0, min(events.count - 1, defaultIndex))
        _track = State(initialValue: -CGFloat(index) * Deck.step)
        _active = State(initialValue: index)
    }

    public var body: some View {
        Deck(events: events, track: track, active: active, animateAura: !reduceMotion && scenePhase == .active, select: select, share: onShare)
            .frame(maxWidth: 640)
            .frame(height: 296)
            .background(eventColor(0x08080A), in: frame)
            .overlay { frame.strokeBorder(.white.opacity(0.08), lineWidth: 1).allowsHitTesting(false) }
            .clipShape(frame)
            .contentShape(frame)
            .gesture(swipe)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Upcoming events")
            .accessibilityScrollAction { edge in
                switch edge {
                case .leading: move(by: 1)
                case .trailing: move(by: -1)
                default: break
                }
            }
            .focusable()
            .onKeyPress(.leftArrow) { move(by: -1); return .handled }
            .onKeyPress(.rightArrow) { move(by: 1); return .handled }
            .task(id: loop && !interacted && !reduceMotion && scenePhase == .active) {
                guard loop, !interacted, !reduceMotion, scenePhase == .active, events.count > 1 else { return }
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(2.8)) } catch { return }
                    settle((track / Deck.step).rounded() * Deck.step - Deck.step)
                }
            }
            .onChange(of: events.map(\.id)) { _, _ in
                // Keep the current slot valid if the caller replaces the deck.
                let index = events.isEmpty ? 0 : min(active, events.count - 1)
                active = index
                track = -CGFloat(index) * Deck.step
            }
    }

    private var frame: RoundedRectangle { RoundedRectangle(cornerRadius: 42, style: .circular) }

    private var swipe: some Gesture {
        DragGesture(minimumDistance: 5)
            .onChanged { value in
                guard events.count > 1, abs(value.translation.width) > abs(value.translation.height) else { return }
                if panStart == nil {
                    interacted = true
                    panStart = track
                }
                track = (panStart ?? track) + value.translation.width
            }
            .onEnded { value in
                guard let start = panStart else { return }
                panStart = nil
                let from = (start / Deck.step).rounded() * Deck.step
                let travel = track - from
                let momentum = value.predictedEndTranslation.width - value.translation.width
                let motion = abs(travel) > Deck.step / 3 ? travel : abs(momentum) > 55 ? momentum : 0
                settle(from + (motion == 0 ? 0 : motion > 0 ? Deck.step : -Deck.step))
            }
    }

    private func select(_ index: Int) {
        let distance = Deck.wrap(CGFloat(index) + track / Deck.step, count: events.count)
        move(by: Int(distance.rounded()))
    }

    private func move(by slots: Int) {
        interacted = true
        guard slots != 0 else { return }
        settle(((track / Deck.step).rounded() - CGFloat(slots)) * Deck.step)
    }

    private func settle(_ target: CGFloat) {
        guard events.count > 1 else { return }
        let index = Int((-target / Deck.step).rounded())
        let destination = (index % events.count + events.count) % events.count
        let event = events[destination]
        withAnimation(reduceMotion ? nil : .timingCurve(0.2, 0.7, 0.2, 1, duration: 0.72)) {
            track = target
        } completion: {
            guard panStart == nil, track == target else { return }
            active = destination
            onSelect?(event)
        }
    }
}

private struct Deck: View, Animatable {
    static let step: CGFloat = 200
    static let size: CGFloat = 252
    let events: [GradientEventCard.Event]
    var track: CGFloat
    let active: Int
    let animateAura: Bool
    let select: (Int) -> Void
    let share: ((GradientEventCard.Event) -> Void)?

    var animatableData: CGFloat {
        get { track }
        set { track = newValue }
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(Array(events.enumerated()), id: \.element.id) { index, event in
                    let d = Self.wrap(CGFloat(index) + track / Self.step, count: events.count)
                    let pose = Pose(distance: d)
                    if abs(d) <= 3.6 {
                        let visible = abs(pose.offset) - 126 * pose.scale * abs(cos(pose.angle)) < geometry.size.width / 2 + 30
                        EventFace(event: event, seed: index + 1, front: index == active, animateAura: visible && animateAura, share: share)
                            .overlay {
                                RoundedRectangle(cornerRadius: 22, style: .circular)
                                    .fill(eventColor(0x0B0B0D).opacity(pose.shade))
                                    .allowsHitTesting(false)
                            }
                            .modifier(DeckProjection(pose: pose))
                            .zIndex(-abs(d))
                            .gesture(TapGesture().onEnded { select(index) }, including: index == active ? .subviews : .all)
                            .accessibilityHidden(index != active)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    static func wrap(_ distance: CGFloat, count: Int) -> CGFloat {
        guard count > 0 else { return 0 }
        let count = CGFloat(count)
        let d = distance + count / 2
        return d - floor(d / count) * count - count / 2
    }
}

private struct Pose {
    let offset: CGFloat
    let scale: CGFloat
    let angle: CGFloat
    let shade: CGFloat

    init(distance: CGFloat) {
        let near = min(abs(distance), 1)
        let far = max(abs(distance) - 1, 0)
        let sign: CGFloat = distance < 0 ? -1 : 1
        offset = sign * (near * 170 + far * 58)
        scale = 1 - near * 0.12 - min(far, 3) * 0.04
        angle = -sign * (near * 52 + min(far, 2) * 5) * .pi / 180
        shade = near * 0.22 + min(far, 3) * 0.08
    }
}

private struct DeckProjection: GeometryEffect {
    let pose: Pose

    func effectValue(size: CGSize) -> ProjectionTransform {
        let half = size.width / 2
        var perspective = CATransform3DIdentity
        perspective.m34 = -1 / 1100
        var transform = CATransform3DMakeTranslation(-half, -half, 0)
        transform = CATransform3DConcat(transform, CATransform3DMakeRotation(pose.angle, 0, 1, 0))
        transform = CATransform3DConcat(transform, CATransform3DMakeScale(pose.scale, pose.scale, 1))
        transform = CATransform3DConcat(transform, CATransform3DMakeTranslation(pose.offset, 0, 0))
        transform = CATransform3DConcat(transform, perspective)
        transform = CATransform3DConcat(transform, CATransform3DMakeTranslation(half, half, 0))
        return ProjectionTransform(transform)
    }
}

private struct EventFace: View {
    let event: GradientEventCard.Event
    let seed: Int
    let front: Bool
    let animateAura: Bool
    let share: ((GradientEventCard.Event) -> Void)?

    private var palette: Palette { event.mood.palette }
    private var ink: Color { palette.ink.map(eventColor) ?? .white }
    private var shareText: String { (event.title + [event.dateLabel, event.subtitle]).joined(separator: "\n") }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            EventAura(palette: palette, pattern: event.pattern, seed: seed, live: animateAura)
                .accessibilityHidden(true)
                .allowsHitTesting(false)

            VStack(alignment: .leading, spacing: 6) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(event.title.indices, id: \.self) { index in
                        Text(event.title[index])
                            .font(DesignFont.bundled("InstrumentSerif-Regular", size: 24, fallback: .system(size: 24, design: .serif)))
                            .tracking(-0.24)
                            .lineLimit(1)
                            .frame(height: 24.96)
                    }
                }
                Text(event.dateLabel)
                    .font(DesignFont.bundled("Manrope-Medium", size: 11, fallback: .system(size: 11, weight: .medium)))
                    .tracking(0.11)
                    .opacity(0.8)
                    .frame(height: 16.5)
            }
            .foregroundStyle(ink)
            .shadow(color: .white.opacity(palette.ink == nil ? 0.7 : 0.55), radius: palette.ink == nil ? 7 : 6)
            .shadow(color: .black.opacity(palette.ink == nil ? 0.3 : 0), radius: 1, y: 1)
            .padding(16)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel((event.title + [event.dateLabel]).joined(separator: " "))
            .accessibilityHint(event.subtitle)
            .accessibilityHidden(!front)
        }
        .frame(width: Deck.size, height: Deck.size)
        .background(eventColor(palette.ramp[0]))
        .overlay(alignment: .topTrailing) {
            Group {
                if let share {
                    Button { share(event) } label: { shareGlyph }
                        .buttonStyle(EventShareStyle())
                } else {
                    ShareLink(item: shareText) { shareGlyph }
                        .buttonStyle(EventShareStyle())
                }
            }
            .accessibilityLabel("Share event")
            .accessibilityIdentifier("event-share-\(event.id)")
            .accessibilityHidden(!front)
            .padding(14)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .circular))
    }

    private var shareGlyph: some View {
        Path { path in
            path.move(to: CGPoint(x: 9, y: 2.25))
            path.addLine(to: CGPoint(x: 9, y: 11.25))
            path.move(to: CGPoint(x: 6, y: 5.25))
            path.addLine(to: CGPoint(x: 9, y: 2.25))
            path.addLine(to: CGPoint(x: 12, y: 5.25))
            path.move(to: CGPoint(x: 3.75, y: 8.25))
            path.addLine(to: CGPoint(x: 3.75, y: 14.25))
            path.addQuadCurve(to: CGPoint(x: 5.25, y: 15.75), control: CGPoint(x: 3.75, y: 15.75))
            path.addLine(to: CGPoint(x: 12.75, y: 15.75))
            path.addQuadCurve(to: CGPoint(x: 14.25, y: 14.25), control: CGPoint(x: 14.25, y: 15.75))
            path.addLine(to: CGPoint(x: 14.25, y: 8.25))
        }
        .stroke(palette.ink.map(eventColor) ?? eventColor(0x1C1C1E), style: StrokeStyle(lineWidth: 1.35, lineCap: .round, lineJoin: .round))
        .frame(width: 18, height: 18)
    }
}

private struct EventShareStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: 14, style: .circular)
        configuration.label
            .frame(width: 44, height: 44)
            .background(.white.opacity(0.38), in: shape)
            .overlay { shape.strokeBorder(.white.opacity(0.55), lineWidth: 1) }
            .contentShape(shape)
            .scaleEffect(!reduceMotion && configuration.isPressed ? 0.94 : 1)
            .animation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.67), value: configuration.isPressed)
    }
}

private struct Palette: Equatable {
    let ramp: [UInt32]
    let accents: [UInt32]
    let ink: UInt32?

    init(_ ramp: [UInt32], _ accents: [UInt32], ink: UInt32? = nil) {
        self.ramp = ramp
        self.accents = accents
        self.ink = ink
    }
}

private func eventColor(_ hex: UInt32) -> Color {
    let rgb = EventAura.rgb(hex)
    return Color(.sRGB, red: Double(rgb.x), green: Double(rgb.y), blue: Double(rgb.z))
}

private struct EventAura: UIViewRepresentable {
    let palette: Palette
    let pattern: GradientEventCard.Aura
    let seed: Int
    let live: Bool

    func makeCoordinator() -> Renderer { Renderer() }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero, device: Renderer.resources?.device)
        view.isOpaque = true
        view.isUserInteractionEnabled = false
        view.autoResizeDrawable = false
        view.drawableSize = CGSize(width: 512, height: 512)
        view.colorPixelFormat = .bgra8Unorm
        view.clearColor = MTLClearColorMake(0, 0, 0, 1)
        view.preferredFramesPerSecond = 30
        view.isPaused = true
        if Renderer.resources != nil {
            view.delegate = context.coordinator
        } else {
            view.isHidden = true
        }
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {
        context.coordinator.configure(palette, pattern: pattern, seed: seed, live: live, view: view)
    }

    static func rgb(_ hex: UInt32) -> SIMD4<Float> {
        SIMD4(Float((hex >> 16) & 255) / 255, Float((hex >> 8) & 255) / 255, Float(hex & 255) / 255, 0)
    }

    final class Renderer: NSObject, MTKViewDelegate {
        struct Resources {
            let device: MTLDevice
            let queue: MTLCommandQueue
            let pipeline: MTLRenderPipelineState
            let composite: MTLRenderPipelineState

            init?() {
                guard let device = MTLCreateSystemDefaultDevice(),
                      let queue = device.makeCommandQueue(),
                      let url = Bundle.module.url(forResource: "GradientAura", withExtension: "metal", subdirectory: "GradientEvent"),
                      let source = try? String(contentsOf: url, encoding: .utf8) else { return nil }
                let options = MTLCompileOptions()
                options.fastMathEnabled = false
                do {
                    let library = try device.makeLibrary(source: source, options: options)
                    func pipeline(for fragment: String) throws -> MTLRenderPipelineState {
                        let descriptor = MTLRenderPipelineDescriptor()
                        descriptor.vertexFunction = library.makeFunction(name: "gradientVertex")
                        descriptor.fragmentFunction = library.makeFunction(name: fragment)
                        descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
                        return try device.makeRenderPipelineState(descriptor: descriptor)
                    }
                    self.pipeline = try pipeline(for: "gradientAura")
                    self.composite = try pipeline(for: "gradientComposite")
                } catch {
                    #if DEBUG
                    print("Gradient Event Card Metal shader: \(error)")
                    #endif
                    return nil
                }
                self.device = device
                self.queue = queue
            }
        }

        static let resources = Resources()
        private var uniforms: [SIMD4<Float>] = []
        private var auraTexture: MTLTexture?
        private var palette: Palette?
        private var pattern: GradientEventCard.Aura?
        private var time: Float = 0
        private var lastFrame: CFTimeInterval?
        private var seed = 0
        private var live = false

        func configure(_ palette: Palette, pattern: GradientEventCard.Aura, seed: Int, live: Bool, view: MTKView) {
            guard Self.resources != nil else { return }
            let changed = self.palette != palette || self.pattern != pattern || self.seed != seed
            let needsStill = changed || self.live != live
            if self.seed != seed {
                self.seed = seed
                time = Float(seed * 37)
            }
            if changed {
                self.palette = palette
                self.pattern = pattern
                uniforms = (palette.ramp + palette.accents).map(EventAura.rgb)
                uniforms.append(SIMD4(time, Float(seed), Float(pattern.rawValue), 0))
            }
            if self.live != live {
                lastFrame = nil
                self.live = live
            }
            if view.isPaused == live { view.isPaused = !live }
            if !live && needsStill { view.draw() }
        }

        func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
            if !live { view.draw() }
        }

        func draw(in view: MTKView) {
            guard let resources = Self.resources, uniforms.count == 12,
                  let pass = view.currentRenderPassDescriptor, let drawable = view.currentDrawable,
                  let commands = resources.queue.makeCommandBuffer() else { return }
            if auraTexture == nil {
                let descriptor = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .bgra8Unorm, width: 512, height: 512, mipmapped: false)
                descriptor.usage = [.renderTarget, .shaderRead]
                descriptor.storageMode = .private
                auraTexture = resources.device.makeTexture(descriptor: descriptor)
            }
            guard let auraTexture else { return }
            let auraPass = MTLRenderPassDescriptor()
            auraPass.colorAttachments[0].texture = auraTexture
            auraPass.colorAttachments[0].loadAction = .dontCare
            auraPass.colorAttachments[0].storeAction = .store
            guard let encoder = commands.makeRenderCommandEncoder(descriptor: auraPass) else { return }
            if live {
                let now = CACurrentMediaTime()
                if let lastFrame { time += Float(now - lastFrame) }
                lastFrame = now
                uniforms[11].x = time
            }
            encoder.setRenderPipelineState(resources.pipeline)
            uniforms.withUnsafeBytes { bytes in
                if let base = bytes.baseAddress { encoder.setFragmentBytes(base, length: bytes.count, index: 0) }
            }
            encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
            encoder.endEncoding()
            guard let composite = commands.makeRenderCommandEncoder(descriptor: pass) else { return }
            composite.setRenderPipelineState(resources.composite)
            composite.setFragmentTexture(auraTexture, index: 0)
            composite.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
            composite.endEncoding()
            commands.present(drawable)
            commands.commit()
        }
    }
}
