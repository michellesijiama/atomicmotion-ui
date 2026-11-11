import Compression
import MetalKit
import SwiftUI

/// A translucent gummy bear that refracts the paragraph behind it.
/// Drag across the glass, or move a pointer over it on iPad.
public struct GradientGummyBear: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pointer = CGPoint.zero

    public init() {}

    public var body: some View {
        GeometryReader { geometry in
            GummyCanvas(pointer: pointer, reduceMotion: reduceMotion)
                .contentShape(Rectangle())
                .onContinuousHover { phase in
                    switch phase {
                    case .active(let location): move(to: location, in: geometry.size)
                    case .ended: pointer = .zero
                    }
                }
                .gesture(DragGesture(minimumDistance: 0)
                    .onChanged { move(to: $0.location, in: geometry.size) }
                    .onEnded { _ in pointer = .zero })
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Gradient gummy bear")
                .accessibilityHint("Slide across the paragraph to move the lens.")
                .accessibilityAdjustableAction { direction in
                    switch direction {
                    case .increment: pointer.x = min(1, pointer.x + 0.25)
                    case .decrement: pointer.x = max(-1, pointer.x - 0.25)
                    @unknown default: break
                    }
                }
        }
        .clipped()
    }

    private func move(to location: CGPoint, in size: CGSize) {
        let radius = max(1, min(size.width, size.height * (3.35 / 5.03)) / 2)
        pointer = CGPoint(
            x: max(-1, min(1, (location.x - size.width / 2) / radius)),
            y: max(-1, min(1, (location.y - size.height / 2) / radius))
        )
    }
}

private struct GummyCanvas: UIViewRepresentable {
    let pointer: CGPoint
    let reduceMotion: Bool

    func makeCoordinator() -> GummyRenderer { GummyRenderer() }

    func makeUIView(context: Context) -> GummyMetalView {
        let view = GummyMetalView(frame: .zero, device: GummyRenderer.resources?.device)
        view.isOpaque = false
        view.isUserInteractionEnabled = false
        view.colorPixelFormat = .bgra8Unorm
        view.depthStencilPixelFormat = .depth32Float
        view.sampleCount = GummyRenderer.resources?.sampleCount ?? 1
        view.clearColor = MTLClearColorMake(0, 0, 0, 0)
        view.preferredFramesPerSecond = 30
        view.autoResizeDrawable = false
        view.isPaused = true
        view.delegate = context.coordinator
        if GummyRenderer.resources == nil {
            // Metal is available on supported iOS hardware. Keep a readable
            // paragraph if the shader cannot be compiled in a preview host.
            let fallback = UIImageView(image: GummyAssets.paragraphImage)
            fallback.frame = view.bounds
            fallback.contentMode = .scaleAspectFit
            fallback.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(fallback)
        }
        return view
    }

    func updateUIView(_ view: GummyMetalView, context: Context) {
        context.coordinator.move(to: SIMD2(Float(pointer.x), Float(pointer.y)), in: view, immediately: reduceMotion)
    }
}

private final class GummyMetalView: MTKView {
    override func layoutSubviews() {
        super.layoutSubviews()
        let scale = min(window?.screen.scale ?? 1, 1.5)
        let next = CGSize(width: max(1, floor(bounds.width * scale)), height: max(1, floor(bounds.height * scale)))
        guard drawableSize != next else { return }
        drawableSize = next
        draw()
    }
}

private enum GummyAssets {
    static func url(_ file: String, _ ext: String) -> URL? {
        Bundle.module.url(forResource: file, withExtension: ext, subdirectory: "GradientGummy")
    }

    static let paragraphImage: UIImage? = url("GummyParagraph", "png").flatMap { UIImage(contentsOfFile: $0.path) }

    static func binary(_ file: String) -> Data? {
        guard let url = url(file, "bin") else { return nil }
        return try? Data(contentsOf: url, options: .mappedIfSafe)
    }
}

private struct GummyResources {
    let device: MTLDevice
    let queue: MTLCommandQueue
    let sampleCount: Int
    let depth: MTLDepthStencilState
    let paperPipeline: MTLRenderPipelineState
    let gummyPipeline: MTLRenderPipelineState
    let mesh: MTLBuffer
    let vertexCount: Int
    let scale: Float
    let travel: SIMD2<Float>
    let paragraph: MTLTexture
    let room: MTLTexture
    let material: MTLTexture

    init?() {
        guard let device = MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue(),
              let url = GummyAssets.url("GummyLens", "metal"),
              let source = try? String(contentsOf: url, encoding: .utf8),
              let image = GummyAssets.paragraphImage?.cgImage,
              let meshData = GummyAssets.binary("GummyMesh"), meshData.count >= 16,
              let roomData = GummyAssets.binary("GummyRoom"), roomData.count >= 4 else { return nil }

        let header = meshData.withUnsafeBytes { $0.loadUnaligned(as: SIMD4<Float>.self) }
        let remaining = meshData.count - 16
        guard remaining > 0, remaining % 48 == 0,
              let mesh = meshData.withUnsafeBytes({ bytes in
                  bytes.baseAddress.flatMap { device.makeBuffer(bytes: $0, length: bytes.count, options: .storageModeShared) }
              }),
              let room = Self.roomTexture(roomData, device: device),
              let material = Self.materialTexture(device: device, queue: queue) else { return nil }

        let samples = device.supportsTextureSampleCount(4) ? 4 : 1
        let depthDescriptor = MTLDepthStencilDescriptor()
        depthDescriptor.depthCompareFunction = .less
        depthDescriptor.isDepthWriteEnabled = true
        guard let depth = device.makeDepthStencilState(descriptor: depthDescriptor) else { return nil }

        do {
            let loader = MTKTextureLoader(device: device)
            paragraph = try loader.newTexture(cgImage: image, options: [.SRGB: false, .generateMipmaps: true])
            let options = MTLCompileOptions()
            options.fastMathEnabled = false
            let library = try device.makeLibrary(source: source, options: options)
            func pipeline(vertex: String, fragment: String) throws -> MTLRenderPipelineState {
                let descriptor = MTLRenderPipelineDescriptor()
                descriptor.vertexFunction = library.makeFunction(name: vertex)
                descriptor.fragmentFunction = library.makeFunction(name: fragment)
                descriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
                descriptor.depthAttachmentPixelFormat = .depth32Float
                descriptor.rasterSampleCount = samples
                return try device.makeRenderPipelineState(descriptor: descriptor)
            }
            paperPipeline = try pipeline(vertex: "paperVertex", fragment: "paperFragment")
            gummyPipeline = try pipeline(vertex: "gummyVertex", fragment: "gummyFragment")
        } catch {
            #if DEBUG
            print("Gradient Gummy Bear Metal shader: \(error)")
            #endif
            return nil
        }

        self.device = device
        self.queue = queue
        self.depth = depth
        self.mesh = mesh
        self.room = room
        self.material = material
        sampleCount = samples
        vertexCount = remaining / 16
        scale = header.z
        // Project the paper bounds back to the bear's center plane.
        let halfSide: Float = 3.35 / 2 * (5.1 / 6.55) - 0.16
        travel = simd_max(.zero, SIMD2(repeating: halfSide) - SIMD2(header.x, header.y) * 0.5)
    }

    private static func roomTexture(_ data: Data, device: MTLDevice) -> MTLTexture? {
        let size = data.withUnsafeBytes { $0.loadUnaligned(as: SIMD2<UInt16>.self) }
        let width = Int(size.x), height = Int(size.y)
        let row = width * 8
        guard width == 768, height == 1024 else { return nil }
        // RoomEnvironment's 256px CubeUV atlas is packed as raw deflate.
        let pixelCount = row * height
        var pixels = Data(count: pixelCount)
        let decoded = pixels.withUnsafeMutableBytes { target in
            data.withUnsafeBytes { source in
                guard let output = target.bindMemory(to: UInt8.self).baseAddress,
                      let input = source.bindMemory(to: UInt8.self).baseAddress else { return 0 }
                return compression_decode_buffer(output, pixelCount, input + 4, source.count - 4, nil, COMPRESSION_ZLIB)
            }
        }
        guard decoded == pixelCount else { return nil }
        let descriptor = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba16Float, width: width, height: height, mipmapped: false)
        guard let texture = device.makeTexture(descriptor: descriptor) else { return nil }
        pixels.withUnsafeBytes { bytes in
            if let base = bytes.baseAddress {
                texture.replace(region: MTLRegionMake2D(0, 0, width, height), mipmapLevel: 0, withBytes: base, bytesPerRow: row)
            }
        }
        return texture
    }

    private static func materialTexture(device: MTLDevice, queue: MTLCommandQueue) -> MTLTexture? {
        let size = 256
        let descriptor = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rg8Unorm, width: size, height: size, mipmapped: true)
        guard let texture = device.makeTexture(descriptor: descriptor),
              let commands = queue.makeCommandBuffer(), let blit = commands.makeBlitCommandEncoder() else { return nil }

        var pixels = [UInt8](repeating: 0, count: size * size * 2)
        var seed: UInt32 = 11
        func noise() -> Float {
            seed = seed &* 1_664_525 &+ 1_013_904_223
            return Float(seed >> 8) / 16_777_216
        }
        for y in 0..<size {
            for x in 0..<size {
                let u = Float(x) / Float(size - 1) - 0.5
                let v = Float(y) / Float(size - 1) - 0.5
                let middle = max(0, 1 - sqrt(u * u + v * v) * 1.8)
                let pull = max(0, 1 - abs(v + 0.08) * 1.45)
                let thickness = 0.34 + middle * 0.42 + pull * 0.2 + noise() * 0.04
                let ripple = sin(Float(x) * 0.34) * sin(Float(y) * 0.27) * 0.06
                let bump = 0.5 + ripple + (noise() - 0.5) * 0.09
                let i = (y * size + x) * 2
                pixels[i] = UInt8(clamping: Int(thickness * 255))
                pixels[i + 1] = UInt8(clamping: Int(bump * 255))
            }
        }
        texture.replace(region: MTLRegionMake2D(0, 0, size, size), mipmapLevel: 0, withBytes: pixels, bytesPerRow: size * 2)
        blit.generateMipmaps(for: texture)
        blit.endEncoding()
        commands.commit()
        return texture
    }
}

private final class GummyRenderer: NSObject, MTKViewDelegate {
    static let resources = GummyResources()
    private var target = SIMD2<Float>.zero
    private var position = SIMD2<Float>.zero

    private struct Uniforms {
        var viewport: SIMD4<Float>
        var offset: SIMD4<Float>
    }

    func move(to next: SIMD2<Float>, in view: MTKView, immediately: Bool) {
        guard Self.resources != nil,
              next != target || (immediately && position != next) else { return }
        target = next
        if immediately {
            position = next
            view.draw()
        } else {
            view.isPaused = false
        }
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        guard let assets = Self.resources,
              let pass = view.currentRenderPassDescriptor, let drawable = view.currentDrawable,
              let commands = assets.queue.makeCommandBuffer(),
              let encoder = commands.makeRenderCommandEncoder(descriptor: pass) else { return }

        position += (target - position) * 0.2256 // two 0.12 easing steps at 30 fps
        let settled = simd_length_squared(target - position) < 0.000_004
        if settled { position = target }

        let width = Float(view.drawableSize.width)
        let height = max(1, Float(view.drawableSize.height))
        let center = position * assets.travel
        var uniforms = Uniforms(
            viewport: SIMD4(width, height, width / height, assets.scale),
            offset: SIMD4(center.x, -center.y, -0.2, 0)
        )
        encoder.setRenderPipelineState(assets.paperPipeline)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 0)
        encoder.setFragmentTexture(assets.paragraph, index: 0)
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)

        encoder.setRenderPipelineState(assets.gummyPipeline)
        encoder.setDepthStencilState(assets.depth)
        encoder.setFrontFacing(.counterClockwise)
        encoder.setCullMode(.back)
        encoder.setVertexBuffer(assets.mesh, offset: 16, index: 0)
        encoder.setVertexBytes(&uniforms, length: MemoryLayout<Uniforms>.stride, index: 1)
        encoder.setFragmentTexture(assets.room, index: 1)
        encoder.setFragmentTexture(assets.material, index: 2)
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: assets.vertexCount)

        encoder.endEncoding()
        commands.present(drawable)
        commands.commit()
        if settled { view.isPaused = true }
    }
}
