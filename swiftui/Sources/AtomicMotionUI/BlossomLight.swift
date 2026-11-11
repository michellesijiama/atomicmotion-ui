import CoreText
import MetalKit
import SwiftUI

/// A stepped light control with adjustable tone and a simulated outdoor setting.
public struct BlossomLight: View {
    /// The reference image used by the web demo. Its redistribution terms are pending.
    public static let defaultWallpaper = URL(string: "https://atomicmotion.dev/textures/wall-shadow.jpg")!

    private let label: String
    private let wallpaper: URL?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase

    @State private var brightness: Double
    @State private var warmth: Double
    @State private var toneProgress = 0.0
    @State private var adaptive = true
    @State private var image: UIImage?

    /// Brightness and warmth use 0–100. Pass a different image URL or nil for the procedural wall.
    public init(
        defaultBrightness: Double = 72,
        defaultWarmth: Double = 30,
        label: String = "Brightness",
        wallpaper: URL? = BlossomLight.defaultWallpaper
    ) {
        self.label = label
        self.wallpaper = wallpaper
        _brightness = State(initialValue: blossomClamp(defaultBrightness / 100))
        _warmth = State(initialValue: blossomClamp(defaultWarmth / 100))
    }

    public var body: some View {
        GeometryReader { proxy in
            let scale = min(1, max(0, (min(proxy.size.width, proxy.size.height) - 24) / 420))
            BlossomPanel(
                brightness: brightness,
                warmth: warmth,
                toneProgress: toneProgress,
                adaptive: adaptive,
                label: label,
                image: image,
                still: reduceMotion || scenePhase != .active,
                setBrightness: setBrightness,
                nudgeBrightness: nudgeBrightness,
                setWarmth: { warmth = blossomClamp($0) },
                setAdaptive: setAdaptive
            )
            .scaleEffect(scale)
            .position(x: proxy.size.width / 2, y: proxy.size.height / 2)
        }
        .task(id: wallpaper) {
            image = nil
            guard let wallpaper else { return }
            let loaded = await BlossomImageCache.image(at: wallpaper)
            if !Task.isCancelled { image = loaded }
        }
    }

    private func setBrightness(_ fraction: Double) {
        if adaptive { setAdaptive(false) }
        sendBrightness(fraction)
    }

    private func sendBrightness(_ fraction: Double) {
        withAnimation(reduceMotion ? nil : .timingCurve(0.12, 0.8, 0.2, 1, duration: 0.84)) {
            brightness = blossomClamp(fraction)
        }
    }

    private func nudgeBrightness(_ step: Double) {
        setBrightness(brightness + step)
    }

    private func setAdaptive(_ enabled: Bool) {
        adaptive = enabled
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.30)) {
            toneProgress = enabled ? 0 : 1
        }
        if enabled {
            sendBrightness(0.62)
            warmth = 0.30
        }
    }
}

private struct BlossomPanel: View, Animatable {
    var brightness: Double
    var warmth: Double
    var toneProgress: Double
    let adaptive: Bool
    let label: String
    let image: UIImage?
    let still: Bool
    let setBrightness: (Double) -> Void
    let nudgeBrightness: (Double) -> Void
    let setWarmth: (Double) -> Void
    let setAdaptive: (Bool) -> Void

    var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(brightness, toneProgress) }
        set {
            brightness = newValue.first
            toneProgress = newValue.second
        }
    }

    private var isDark: Bool { brightness < 0.35 }
    private var ink: Color { isDark ? .white : BlossomSkin.ink }
    private var percent: Int { Int((brightness * 100).rounded()) }

    var body: some View {
        ZStack(alignment: .topLeading) {
            BlossomWallpaper(
                image: image, brightness: brightness, warmth: warmth, toneProgress: toneProgress, still: still
            )
            .allowsHitTesting(false)
            .accessibilityHidden(true)

            brightnessPill.offset(x: 85, y: 110)

            if toneProgress > 0 {
                toneCard
                    .frame(width: 168, height: 95 * toneProgress, alignment: .top)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .circular))
                    .opacity(toneProgress)
                    .allowsHitTesting(!adaptive)
                    .accessibilityHidden(adaptive)
                    .offset(x: 167, y: 110)
            }

            adaptiveCard.offset(x: 167, y: 110 + 105 * toneProgress)
        }
        .frame(width: 420, height: 420)
        .clipShape(RoundedRectangle(cornerRadius: 36, style: .circular))
    }

    private var brightnessPill: some View {
        let lit = Int((brightness * 18).rounded())
        return ZStack(alignment: .top) {
            Capsule().fill(.white.opacity(0.22))
            VStack(spacing: 4) {
                ForEach((0..<18).reversed(), id: \.self) { index in
                    Rectangle()
                        .fill(.black.opacity(0.13))
                        .overlay { Rectangle().fill(.white.opacity(index < lit ? 0.95 : 0)) }
                        .frame(height: index == 0 ? 30 : 6)
                }
            }
            Text("\(percent)%")
                .font(BlossomFont.font(16, semibold: true))
                .tracking(-0.32)
                .monospacedDigit()
                .foregroundStyle(ink)
                .frame(height: 16)
                .padding(.top, 16)
            BlossomIcon(.sun)
                .stroke(ink, style: BlossomIcon.stroke(for: 22))
                .frame(width: 22, height: 22)
                .offset(y: 164)
        }
        .frame(width: 72, height: 200)
        .clipShape(Capsule())
        .contentShape(Capsule())
        .gesture(DragGesture(minimumDistance: 0).onChanged { setBrightness(1 - $0.location.y / 200) })
        .focusable()
        .focusEffectDisabled()
        .onKeyPress(keys: [.upArrow, .downArrow, .leftArrow, .rightArrow, .home, .end]) { press in
            if press.key == .home { setBrightness(0) }
            else if press.key == .end { setBrightness(1) }
            else { nudgeBrightness(press.key == .upArrow || press.key == .rightArrow ? 0.05 : -0.05) }
            return .handled
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue("\(percent)%")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: nudgeBrightness(0.05)
            case .decrement: nudgeBrightness(-0.05)
            @unknown default: break
            }
        }
    }

    private var toneCard: some View {
        let kelvin = Int(((6500 - warmth * 3800) / 100).rounded()) * 100
        return ZStack(alignment: .topLeading) {
            isDark ? BlossomSkin.darkFrost : BlossomSkin.paper.opacity(0.72)
            Text("Adjust Tone")
                .font(BlossomFont.font(13, semibold: true))
                .foregroundStyle(ink)
                .frame(height: 13)
                .offset(x: 14, y: 14)
            Capsule()
                .fill(LinearGradient(colors: [BlossomSkin.cool, BlossomSkin.warm], startPoint: .leading, endPoint: .trailing))
                .overlay(alignment: .leading) {
                    Circle().fill(BlossomSkin.ink).frame(width: 20, height: 20).offset(x: 120 * warmth)
                }
                .frame(width: 140, height: 24)
                .contentShape(Capsule())
                .gesture(DragGesture(minimumDistance: 0).onChanged { setWarmth($0.location.x / 140) })
                .focusable()
                .focusEffectDisabled()
                .onKeyPress(keys: [.upArrow, .downArrow, .leftArrow, .rightArrow, .home, .end]) { press in
                    if press.key == .home { setWarmth(0) }
                    else if press.key == .end { setWarmth(1) }
                    else { setWarmth(warmth + (press.key == .upArrow || press.key == .rightArrow ? 0.05 : -0.05)) }
                    return .handled
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Tone")
                .accessibilityValue(Text(verbatim: "\(kelvin) kelvin"))
                .accessibilityAdjustableAction { direction in
                    switch direction {
                    case .increment: setWarmth(warmth + 0.05)
                    case .decrement: setWarmth(warmth - 0.05)
                    @unknown default: break
                    }
                }
                .offset(x: 14, y: 57)
        }
        .frame(width: 168, height: 95)
    }

    private var adaptiveCard: some View {
        ZStack(alignment: .topLeading) {
            BlossomSkin.night
            LinearGradient(
                stops: [
                    .init(color: blossomColor(0xC9A9B8).opacity(0.46), location: 0),
                    .init(color: blossomColor(0xE9C9B4).opacity(0.42), location: 0.34),
                    .init(color: blossomColor(0xE7D3A6).opacity(0.40), location: 0.60),
                    .init(color: blossomColor(0xB9AFC2).opacity(0.46), location: 1),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .opacity(isDark ? 0.22 : 1)
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    BlossomIcon(.partlyCloudy)
                        .stroke(.white, style: BlossomIcon.stroke(for: 15))
                        .frame(width: 15, height: 15)
                        .accessibilityHidden(true)
                    Text("Adaptive")
                        .font(BlossomFont.font(13, semibold: true))
                        .frame(height: 13)
                }
                Text("Follows the weather")
                    .font(BlossomFont.font(12))
                    .foregroundStyle(.white.opacity(0.8))
                    .frame(height: 12)
            }
            .foregroundStyle(.white)
            .offset(x: 14, y: 14)

            if toneProgress < 1 {
                VStack(alignment: .leading, spacing: 0) {
                    Rectangle().fill(.white.opacity(0.14)).frame(height: 1)
                    weatherRow(.cloud, "18° Overcast")
                    weatherRow(.daylight, "Daylight")
                    weatherRow(.sunset, "19:42")
                    Rectangle().fill(.white.opacity(0.14)).frame(height: 1)
                }
                .opacity(1 - toneProgress)
                .accessibilityHidden(!adaptive)
                .offset(y: 59)
            }

            Toggle("Adaptive mode", isOn: Binding(get: { adaptive }, set: setAdaptive))
                .toggleStyle(BlossomToggleStyle())
                .frame(width: 44, height: 26)
                .offset(x: 110, y: 160 - 105 * toneProgress)
        }
        .frame(width: 168, height: 200 - 105 * toneProgress)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .circular))
    }

    private func weatherRow(_ icon: BlossomIcon.Kind, _ title: String) -> some View {
        HStack(spacing: 8) {
            BlossomIcon(icon)
                .stroke(.white.opacity(0.85), style: BlossomIcon.stroke(for: 14))
                .frame(width: 14, height: 14)
                .accessibilityHidden(true)
            Text(title).font(BlossomFont.font(12)).foregroundStyle(.white)
        }
        .padding(.leading, 14)
        .frame(height: 26)
    }
}

private struct BlossomToggleStyle: ToggleStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            Capsule()
                .fill(configuration.isOn ? BlossomSkin.blue : .white.opacity(0.18))
                .overlay(alignment: .leading) {
                    Circle().fill(.white).frame(width: 20, height: 20)
                        .offset(x: configuration.isOn ? 21 : 3)
                }
                .frame(width: 44, height: 26)
        }
        .buttonStyle(.plain)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.20), value: configuration.isOn)
        .accessibilityRepresentation {
            Toggle(isOn: configuration.$isOn) { configuration.label }.toggleStyle(.switch)
        }
    }
}

private struct BlossomIcon: Shape {
    enum Kind { case sun, partlyCloudy, cloud, daylight, sunset }
    let kind: Kind

    init(_ kind: Kind) { self.kind = kind }

    static func stroke(for size: CGFloat) -> StrokeStyle {
        StrokeStyle(lineWidth: 1.8 * size / 24, lineCap: .round, lineJoin: .round)
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        func line(_ x: CGFloat, _ y: CGFloat, _ toX: CGFloat, _ toY: CGFloat) {
            path.move(to: CGPoint(x: x, y: y))
            path.addLine(to: CGPoint(x: toX, y: toY))
        }

        switch kind {
        case .sun, .daylight:
            let radius: CGFloat = kind == .sun ? 4.2 : 4
            path.addEllipse(in: CGRect(x: 12 - radius, y: 12 - radius, width: radius * 2, height: radius * 2))
            let inner: CGFloat = kind == .sun ? 7 : 7.2
            let outer: CGFloat = kind == .sun ? 9.6 : 9
            for index in 0..<8 {
                let angle = CGFloat(index) * .pi / 4
                line(12 + cos(angle) * inner, 12 + sin(angle) * inner, 12 + cos(angle) * outer, 12 + sin(angle) * outer)
            }
        case .partlyCloudy:
            path.addEllipse(in: CGRect(x: 5.8, y: 5.3, width: 6.4, height: 6.4))
            line(9, 2.5, 9, 3.9)
            line(3, 8.5, 4.4, 8.5)
            line(4.8, 4.3, 5.8, 5.3)
            line(13.2, 4.3, 12.2, 5.3)
            path.move(to: CGPoint(x: 8.5, y: 19.5))
            path.addLine(to: CGPoint(x: 17.7, y: 19.5))
            path.addCurve(to: CGPoint(x: 18.1, y: 12.93), control1: CGPoint(x: 22, y: 19.5), control2: CGPoint(x: 22.1, y: 13))
            path.addCurve(to: CGPoint(x: 9.3, y: 11.83), control1: CGPoint(x: 17.4, y: 8.5), control2: CGPoint(x: 10.5, y: 8))
            path.addCurve(to: CGPoint(x: 8.5, y: 19.5), control1: CGPoint(x: 4, y: 11.1), control2: CGPoint(x: 3.7, y: 19.1))
            path.closeSubpath()
        case .cloud:
            path.move(to: CGPoint(x: 7, y: 18.5))
            path.addLine(to: CGPoint(x: 16.5, y: 18.5))
            path.addCurve(to: CGPoint(x: 17, y: 10.53), control1: CGPoint(x: 21.7, y: 18.5), control2: CGPoint(x: 22, y: 10.6))
            path.addCurve(to: CGPoint(x: 6.5, y: 9.2), control1: CGPoint(x: 15.9, y: 5), control2: CGPoint(x: 8.6, y: 4.4))
            path.addCurve(to: CGPoint(x: 7, y: 18.5), control1: CGPoint(x: 0.6, y: 9.2), control2: CGPoint(x: 1, y: 18.5))
            path.closeSubpath()
        case .sunset:
            line(4, 17, 20, 17)
            line(6, 20, 18, 20)
            line(12, 3, 12, 6)
            line(4.5, 8, 6, 9.5)
            line(19.5, 8, 18, 9.5)
            path.move(to: CGPoint(x: 7, y: 13))
            path.addQuadCurve(to: CGPoint(x: 17, y: 13), control: CGPoint(x: 12, y: 3))
        }

        return path.applying(CGAffineTransform(scaleX: rect.width / 24, y: rect.height / 24))
    }
}

private enum BlossomSkin {
    static let ink = blossomColor(0x1D1D1F)
    static let night = blossomColor(0x141416)
    static let blue = blossomColor(0x0040DD)
    static let paper = blossomColor(0xF4F0E7)
    static let darkFrost = blossomColor(0x1C1C20).opacity(0.78)
    static let cool = blossomColor(0x5F7EC6)
    static let warm = blossomColor(0xD97C16)
}

private func blossomClamp(_ value: Double) -> Double {
    value.isFinite ? min(max(0, value), 1) : 0
}

private func blossomColor(_ hex: UInt32) -> Color {
    Color(.sRGB, red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
}

private enum BlossomFont {
    static func font(_ size: CGFloat, semibold: Bool = false) -> Font {
        let name = semibold ? "Manrope-SemiBold" : "Manrope-Regular"
        if let postScriptName = names[name] { return .custom(postScriptName, fixedSize: size) }
        return .system(size: size, weight: semibold ? .semibold : .regular)
    }

    private static let names: [String: String] = {
        var result: [String: String] = [:]
        for name in ["Manrope-Regular", "Manrope-SemiBold"] {
            guard let url = Bundle.module.url(forResource: name, withExtension: "ttf", subdirectory: "BlossomLight"),
                  let provider = CGDataProvider(url: url as CFURL), let font = CGFont(provider),
                  let postScriptName = font.postScriptName as String? else { continue }
            CTFontManagerRegisterGraphicsFont(font, nil)
            result[name] = postScriptName
        }
        return result
    }()
}

@MainActor
private enum BlossomImageCache {
    private static let images = NSCache<NSURL, UIImage>()

    static func image(at url: URL) async -> UIImage? {
        if let cached = images.object(forKey: url as NSURL) { return cached }
        if url.isFileURL { return UIImage(contentsOfFile: url.path) }
        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 8)
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let status = (response as? HTTPURLResponse)?.statusCode,
              (200..<300).contains(status), let image = UIImage(data: data) else { return nil }
        images.setObject(image, forKey: url as NSURL)
        return image
    }
}

private struct BlossomWallpaper: View {
    let image: UIImage?
    let brightness: Double
    let warmth: Double
    let toneProgress: Double
    let still: Bool

    var body: some View {
        Group {
            if BlossomMetalView.Renderer.resources != nil {
                BlossomMetalView(
                    image: image, brightness: brightness, warmth: warmth, toneProgress: toneProgress, still: still
                )
            } else {
                GeometryReader { proxy in
                    ZStack {
                        BlossomSkin.paper
                        if let image {
                            Image(uiImage: image).resizable().scaledToFill()
                                .frame(width: proxy.size.width, height: proxy.size.height)
                                .clipped()
                        }
                        blossomColor(0x2E3260).opacity((1 - brightness) * 0.5).blendMode(.multiply)
                    }
                    .colorMultiply(Color(white: 0.66 + brightness * 0.34))
                }
            }
        }
        .frame(width: 420, height: 420)
    }
}

private struct BlossomMetalView: UIViewRepresentable {
    let image: UIImage?
    let brightness: Double
    let warmth: Double
    let toneProgress: Double
    let still: Bool

    func makeCoordinator() -> Renderer { Renderer() }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero, device: Renderer.resources?.device)
        view.colorPixelFormat = .bgra8Unorm
        view.preferredFramesPerSecond = 30
        view.autoResizeDrawable = false
        view.drawableSize = CGSize(width: Renderer.resolution, height: Renderer.resolution)
        (view.layer as? CAMetalLayer)?.colorspace = CGColorSpace(name: CGColorSpace.sRGB)
        view.delegate = context.coordinator
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {
        context.coordinator.update(
            image: image, brightness: brightness, warmth: warmth, toneProgress: toneProgress, still: still, view: view
        )
    }

    final class Renderer: NSObject, MTKViewDelegate {
        struct Resources {
            let device: MTLDevice
            let queue: MTLCommandQueue
            let scene: MTLRenderPipelineState
            let glass: MTLRenderPipelineState
            let emptyWallpaper: MTLTexture

            init?() {
                let descriptor = MTLTextureDescriptor.texture2DDescriptor(
                    pixelFormat: .rgba8Unorm, width: 1, height: 1, mipmapped: false
                )
                guard let device = MTLCreateSystemDefaultDevice(),
                      let queue = device.makeCommandQueue(),
                      let emptyWallpaper = device.makeTexture(descriptor: descriptor),
                      let url = Bundle.module.url(forResource: "BlossomWallpaper", withExtension: "metal", subdirectory: "BlossomLight"),
                      let source = try? String(contentsOf: url, encoding: .utf8) else { return nil }
                do {
                    let library = try device.makeLibrary(source: source, options: nil)
                    func pipeline(_ fragment: String) throws -> MTLRenderPipelineState {
                        let descriptor = MTLRenderPipelineDescriptor()
                        descriptor.vertexFunction = library.makeFunction(name: "blossomVertex")
                        descriptor.fragmentFunction = library.makeFunction(name: fragment)
                        descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
                        return try device.makeRenderPipelineState(descriptor: descriptor)
                    }
                    scene = try pipeline("blossomScene")
                    glass = try pipeline("blossomGlass")
                } catch {
                    #if DEBUG
                    print("Blossom Light Metal shader: \(error)")
                    #endif
                    return nil
                }
                self.device = device
                self.queue = queue
                self.emptyWallpaper = emptyWallpaper
            }
        }

        struct Uniforms {
            var time: Float = 0
            var brightness: Float = 0.72
            var warmth: Float = 0.3
            var toneProgress: Float = 0
            var hasWallpaper: UInt32 = 0
            var reducedMotion: UInt32 = 0
        }

        static let resources = Resources()
        static let resolution = 560
        private var uniforms = Uniforms()
        private var lastTime: CFTimeInterval?
        private var image: UIImage?
        private var wallpaper: MTLTexture?
        private var sceneTexture: MTLTexture?

        func update(
            image: UIImage?, brightness: Double, warmth: Double, toneProgress: Double, still: Bool, view: MTKView
        ) {
            guard let resources = Self.resources else { return }
            if self.image !== image {
                self.image = image
                wallpaper = image?.cgImage.flatMap {
                    try? MTKTextureLoader(device: resources.device).newTexture(cgImage: $0, options: [.SRGB: false])
                }
            }
            uniforms.brightness = Float(brightness)
            uniforms.warmth = Float(warmth)
            uniforms.toneProgress = Float(toneProgress)
            uniforms.hasWallpaper = wallpaper != nil ? 1 : 0
            uniforms.reducedMotion = still ? 1 : 0
            if view.isPaused != still {
                lastTime = nil
                view.isPaused = still
            }
            if still { view.draw() }
        }

        func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
            if view.isPaused { view.draw() }
        }

        func draw(in view: MTKView) {
            guard let resources = Self.resources,
                  let drawable = view.currentDrawable, let pass = view.currentRenderPassDescriptor,
                  let commands = resources.queue.makeCommandBuffer() else { return }

            if sceneTexture == nil {
                let descriptor = MTLTextureDescriptor.texture2DDescriptor(
                    pixelFormat: .bgra8Unorm, width: Self.resolution, height: Self.resolution, mipmapped: false
                )
                descriptor.usage = [.renderTarget, .shaderRead]
                descriptor.storageMode = .private
                sceneTexture = resources.device.makeTexture(descriptor: descriptor)
            }
            guard let sceneTexture else { return }

            if uniforms.reducedMotion == 0 {
                let now = CACurrentMediaTime()
                if let lastTime { uniforms.time += Float(min(now - lastTime, 0.08)) }
                lastTime = now
            }

            let scenePass = MTLRenderPassDescriptor()
            scenePass.colorAttachments[0].texture = sceneTexture
            scenePass.colorAttachments[0].loadAction = .dontCare
            scenePass.colorAttachments[0].storeAction = .store
            var resolution = Float(Self.resolution)
            guard let encoder = commands.makeRenderCommandEncoder(descriptor: scenePass) else { return }
            encoder.setRenderPipelineState(resources.scene)
            encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 0)
            encoder.setFragmentBytes(&resolution, length: MemoryLayout<Float>.size, index: 1)
            encoder.setFragmentTexture(wallpaper ?? resources.emptyWallpaper, index: 0)
            encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
            encoder.endEncoding()

            guard let glass = commands.makeRenderCommandEncoder(descriptor: pass) else { return }
            glass.setRenderPipelineState(resources.glass)
            glass.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 0)
            glass.setFragmentBytes(&resolution, length: MemoryLayout<Float>.size, index: 1)
            glass.setFragmentTexture(sceneTexture, index: 0)
            glass.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
            glass.endEncoding()

            commands.present(drawable)
            commands.commit()
        }
    }
}
