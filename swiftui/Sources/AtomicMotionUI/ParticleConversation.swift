import AVFoundation
import SwiftUI
import UniformTypeIdentifiers

/// A landscape audio visualizer with a bundled demo, local files, and microphone input.
public struct ParticleConversation: View {
    public enum Input { case music, microphone }

    private let input: Input
    private let audioURL: URL?
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var audio = ParticleAudioPlayer()
    @State private var importsAudio = false
    @State private var importedURL: URL?

    public init(input: Input = .music, audioURL: URL? = nil) {
        self.input = input
        self.audioURL = audioURL
    }

    private var usesDemo: Bool { input == .music && audioURL == nil && importedURL == nil }
    private var caption: String {
        if let error = audio.error { return error }
        if audio.finished && usesDemo { return "First Light · AtomicMotion" }
        guard audio.active else { return "" }
        if input == .microphone && importedURL == nil { return "I’m listening." }
        return usesDemo ? "First Light · AtomicMotion" : "Playing your track."
    }

    public var body: some View {
        GeometryReader { geometry in
            let compact = geometry.size.width < 500
            let inset: CGFloat = compact ? 16 : 28
            ZStack {
                Color.black
                TimelineView(.animation(minimumInterval: 1.0 / 40, paused: !audio.active || reducedMotion)) { timeline in
                    let reading = audio.reading
                    ZStack(alignment: .topLeading) {
                        ParticleField(time: reducedMotion ? 0 : timeline.date.timeIntervalSince(audio.startedAt),
                                      energy: reducedMotion ? 0 : reading.field)
                        HStack(spacing: 12) {
                            Text("Audio Reactive")
                                .font(DesignFont.sans(compact ? 18 : 24, medium: true))
                                .tracking(-0.4)
                                .accessibilityAddTraits(.isHeader)
                            waveform(energy: reducedMotion ? 0 : reading.wave, time: timeline.date.timeIntervalSince(audio.startedAt))
                                .frame(width: 45, height: 24)
                                .accessibilityHidden(true)
                        }
                        .padding(inset)
                    }
                }

                VStack {
                    Spacer()
                    HStack(alignment: .bottom) {
                        if !caption.isEmpty {
                            Text(caption)
                                .font(DesignFont.sans(compact ? 12 : 16))
                                .shadow(color: .black, radius: 4)
                                .transition(.offset(y: reducedMotion ? 0 : 4).combined(with: .opacity))
                        }
                        Spacer(minLength: 8)
                        controls
                    }
                }
                .padding(inset)
            }
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: compact ? 24 : 32))
        }
        .aspectRatio(1.6, contentMode: .fit)
        .onDisappear { audio.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { audio.stop() }
        }
        .fileImporter(isPresented: $importsAudio, allowedContentTypes: [.audio]) { result in
            if case .success(let url) = result {
                importedURL = url
                start()
            }
        }
    }

    private func waveform(energy: Double, time: Double) -> some View {
        HStack(spacing: 3.5) {
            ForEach(Array([0.23, 0.47, 0.82, 0.54, 1, 0.62, 0.83, 0.44, 0.26].enumerated()), id: \.offset) { index, profile in
                let motion = 0.68 + 0.32 * sin(time * 8 + Double(index) * 0.88)
                Capsule().fill(.white.opacity(0.8))
                    .frame(width: 1.5, height: 2 + 20 * energy * profile * motion)
            }
        }
    }

    private var controls: some View {
        HStack(spacing: 0) {
            Button(action: start) {
                Image(systemName: "mic")
                    .font(.system(size: 19, weight: .medium))
                    .frame(width: 48, height: 48)
                    .contentShape(Rectangle())
            }
            .disabled(audio.active)
            .accessibilityLabel(audio.active ? "Listening" : input == .microphone && importedURL == nil ? "Speak" : "Play music")
            .contextMenu {
                Button("Open audio file", systemImage: "waveform") { importsAudio = true }
            }
            if audio.active {
                Button { audio.stop() } label: {
                    Image(systemName: "stop.fill")
                        .font(.system(size: 12))
                        .frame(width: 48, height: 48)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Stop")
                .transition(.opacity.combined(with: .scale(scale: 0.8)))
            }
        }
        .buttonStyle(.plain)
        .background(.white.opacity(audio.active ? 0.12 : 0), in: Capsule())
        .animation(reducedMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.35), value: audio.active)
    }

    private func start() {
        if let importedURL {
            audio.play(importedURL)
        } else if input == .microphone {
            audio.listen()
        } else if let url = audioURL ?? Bundle.module.url(forResource: "first-light", withExtension: "mp3") {
            audio.play(url)
        } else {
            audio.error = "The demo track is unavailable."
        }
    }
}

private struct ParticleField: View {
    let time: Double
    let energy: Double
    private static let particles: [(Double, Double, Double, Double)] = (0..<3400).map { index in
        func sample(_ salt: Double) -> Double {
            let value = sin(Double(index + 1) * 127.1 + salt * 311.7) * 43758.5453
            return value - floor(value)
        }
        return (sample(0), sample(1), sample(2), sample(3))
    }
    private static let colors = [Color(red: 0.188, green: 0.373, blue: 0.725),
                                 Color(red: 0.337, green: 0.616, blue: 0.984),
                                 Color(red: 0.722, green: 0.871, blue: 1)]
    private static let opacity = [0.32, 0.44, 0.58]

    var body: some View {
        Canvas(opaque: true) { context, size in
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.black))
            context.blendMode = .plusLighter
            let field = min(1, energy)
            let span = size.width * (0.51 + field * 0.43)
            let center = size.height * (0.79 - field * 0.35)
            let phase = time * 0.9
            let scale = max(0.8, min(1.4, size.width / 650))

            for layer in 0..<3 {
                var motes = Path()
                for index in stride(from: layer, to: Self.particles.count, by: 3) {
                    let (along, offset, drift, grain) = Self.particles[index]
                    let x = along - 0.5
                    let crest = sin(x * 9.8 - phase + drift * 0.75) * 0.15
                        + sin(x * 17.7 + phase * 1.33) * 0.057
                    let curl = sin(x * 13 + phase * 1.7 + offset * 5.2)
                    let spread = (offset - 0.5) * (0.044 + field * 0.19) * (0.46 + 0.54 * sin(along * .pi))
                    let px = size.width * 0.5 + (x + sin(phase + drift * 6) * 0.025 * field) * span
                    let py = center + size.height * (crest * (0.12 + field) + spread + curl * grain * field * 0.061)
                    let side = (0.6 + grain * 1.3) * scale
                    motes.addRect(CGRect(x: px, y: py, width: side, height: side))
                }
                context.opacity = Self.opacity[layer] * (0.57 + field * 0.85)
                context.fill(motes, with: .color(Self.colors[layer]))
            }
        }
        .accessibilityHidden(true)
    }
}

@MainActor
private final class ParticleAudioPlayer: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published private(set) var active = false
    @Published private(set) var finished = false
    @Published var error: String?

    private(set) var startedAt = Date()
    private var player: AVAudioPlayer?
    private var engine: AVAudioEngine?
    private var scopedURL: URL?
    private var sessionActive = false
    private var permissionRequest: Task<Void, Never>?
    private var captureLevel = ParticleMicrophoneLevel()
    private var previousLevel = 0.0
    private var pulse = 0.0

    var reading: (field: Double, wave: Double) {
        guard active else { return (0, 0) }
        player?.updateMeters()
        let levelDB = Double(player?.averagePower(forChannel: 0) ?? captureLevel.decibels)
        let level = min(1, max(0, (levelDB + 49) / 45))
        let bass = level * level
        pulse = max(pulse * 0.83, min(1, (level - previousLevel) * 4))
        previousLevel += (level - previousLevel) * 0.26
        return (0.20 + previousLevel * 0.38 + bass * 0.28 + pulse * 0.34,
                min(1, previousLevel * 0.48 + bass * 0.36 + pulse * 0.3))
    }

    func play(_ url: URL) {
        stop()
        if url.startAccessingSecurityScopedResource() { scopedURL = url }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback)
            try session.setActive(true)
            sessionActive = true
            let player = try AVAudioPlayer(contentsOf: url)
            player.isMeteringEnabled = true
            player.delegate = self
            self.player = player
            guard player.play() else { throw CocoaError(.fileReadUnknown) }
            activate()
        } catch {
            stop()
            self.error = "This audio file could not play."
        }
    }

    func listen() {
        stop()
        permissionRequest = Task { @MainActor [weak self] in
            let allowed = await AVAudioApplication.requestRecordPermission()
            guard !Task.isCancelled, let self else { return }
            guard allowed else {
                error = "Microphone access is off."
                return
            }
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.record, mode: .measurement)
                try session.setActive(true)
                sessionActive = true
                let engine = AVAudioEngine()
                let input = engine.inputNode
                let format = input.outputFormat(forBus: 0)
                guard format.sampleRate > 0, format.channelCount > 0 else { throw CocoaError(.fileReadUnknown) }
                let meter = ParticleMicrophoneLevel()
                captureLevel = meter
                input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                    meter.measure(buffer)
                }
                self.engine = engine
                try engine.start()
                activate()
            } catch {
                stop()
                self.error = "The microphone could not start."
            }
        }
    }

    func stop() {
        permissionRequest?.cancel()
        permissionRequest = nil
        player?.delegate = nil
        player?.stop()
        player = nil
        if let engine {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
            self.engine = nil
        }
        if sessionActive {
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            sessionActive = false
        }
        scopedURL?.stopAccessingSecurityScopedResource()
        scopedURL = nil
        active = false
        finished = false
        error = nil
        previousLevel = 0
        pulse = 0
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        let playerID = ObjectIdentifier(player)
        Task { @MainActor [weak self] in
            guard let self, let current = self.player, ObjectIdentifier(current) == playerID else { return }
            stop()
            finished = flag
        }
    }

    private func activate() {
        startedAt = Date()
        active = true
    }
}

private final class ParticleMicrophoneLevel: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Float = -100

    var decibels: Float {
        lock.lock()
        defer { lock.unlock() }
        return value
    }

    func measure(_ buffer: AVAudioPCMBuffer) {
        guard let samples = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return }
        let count = Int(buffer.frameLength)
        var sum: Float = 0
        for index in 0..<count { sum += samples[index] * samples[index] }
        let db = 10 * log10(max(sum / Float(count), 1e-10))
        lock.lock()
        value = db
        lock.unlock()
    }
}
