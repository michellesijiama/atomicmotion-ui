import CoreText
import ImageIO
import SwiftUI

/// A simulated voice assistant that finds and refines podcast episodes.
public struct OrganicUI: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase = Phase.idle
    @State private var phaseStarted = Date.now
    @State private var request = VoiceRequest.everydayDesign
    @State private var preferences = Preferences()
    @State private var searchStarted = Date.now
    @State private var sceneProgress = 0.0
    @State private var resultProgress = 0.0
    @State private var hasResults = false
    @State private var selectedEpisode: Episode?
    @State private var centeredEpisode: String?
    @State private var resultAnchor: String?
    @State private var covers: [String: UIImage] = [:]

    public init() {}

    public var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                backdrop(size: geometry.size)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: reset)
                    .accessibilityHidden(true)

                backdrop(size: geometry.size)
                    .blur(radius: 14)
                    .overlay(Self.color(0x1D192B).opacity(0.57))
                    .mask(alignment: .bottom) {
                        FogMask(progress: resultProgress)
                            .frame(height: 420)
                    }
                    .mask {
                        OpeningMask(progress: sceneProgress, size: geometry.size)
                    }
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)

                assistant(width: geometry.size.width)
                    .padding(.top, 24)
                    .padding(.bottom, 28)
                    .background {
                        Color.clear.contentShape(Rectangle()).onTapGesture {}
                    }
            }
            .frame(width: geometry.size.width, height: geometry.size.height, alignment: .bottom)
            .clipped()
        }
        .foregroundStyle(.white)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Organic UI podcast search")
        .task(id: phase) { await advancePhase(phase) }
        .task { await loadCovers() }
    }

    private var matches: [Episode] {
        preferences.episodes
    }

    private var status: String? {
        switch phase {
        case .idle, .opening: return nil
        case .listening: return "Listening…"
        case .searching: return "Looking for episodes…"
        case .reviewing:
            switch request {
            case .everydayDesign: return "Picking a few stories about everyday design…"
            case .underTwenty: return "Checking episode lengths…"
            case .sound, .anyTopic: return "Checking which episodes match the topic…"
            }
        case .results:
            let subject = matches.count == 1 ? "an episode" : matches.count == 2 ? "two episodes" : "a few episodes"
            if preferences.soundOnly { return "I found \(subject) about sound design." }
            if let maxMinutes = preferences.maxMinutes { return "I found \(subject) under \(maxMinutes) minutes." }
            return "I found a few stories about everyday design."
        }
    }

    private func motion(_ duration: Double) -> Animation? {
        reduceMotion ? nil : .timingCurve(0.42, 0, 0.30, 1, duration: duration)
    }

    private func assistant(width: CGFloat) -> some View {
        ZStack(alignment: .bottom) {
            assistantPanel(width: width)
                .opacity(selectedEpisode == nil ? 1 : 0)
                .allowsHitTesting(selectedEpisode == nil)
                .accessibilityHidden(selectedEpisode != nil)

            if let episode = selectedEpisode {
                episodeDetail(episode, width: max(1, width - 48))
                    .padding(.horizontal, 24)
                    .transition(reduceMotion ? .identity : .opacity.combined(with: .scale(scale: 0.98)))
            }
        }
    }

    private func assistantPanel(width: CGFloat) -> some View {
        VStack(spacing: 0) {
            HStack(alignment: .bottom, spacing: 8) {
                agent
                let textWidth = max(1, width - 148)
                Paragraph(status ?? " ", width: textWidth, size: 17, lineHeight: 21.25)
                    .hidden()
                    .accessibilityHidden(true)
                    .overlay(alignment: .bottomLeading) {
                        if let status {
                            StatusLine(text: status, width: textWidth,
                                       revealWords: phase == .results && !reduceMotion)
                                .id(status)
                                .transition(reduceMotion ? .identity : .asymmetric(
                                    insertion: .opacity.combined(with: .offset(y: 2)).animation(motion(0.30)?.delay(0.06)),
                                    removal: .opacity.combined(with: .offset(y: -1.5)).animation(motion(0.14))
                                ))
                        }
                    }
                    .frame(minHeight: 44)
            }
            .padding(.leading, 24)
            .padding(.trailing, 72)

            ShelfLayout(progress: resultProgress) {
                episodeCarousel(width: width)
                    .padding(.top, 10)
                    .modifier(ShelfAppearance(progress: resultProgress))
                    .padding(.bottom, 52)
            }
            .allowsHitTesting(hasResults && !phase.busy)
            .accessibilityHidden(!hasResults || phase.busy)
        }
        .overlay(alignment: .bottomTrailing) {
            if !phase.compact {
                voiceControl
                    .padding(.trailing, 24)
                    .transition(reduceMotion ? .identity : .opacity)
            }
        }
    }

    private var voiceControl: some View {
        Button(action: phase.busy ? cancelVoice : startVoice) {
            ZStack {
                Glyph(.mic, size: 20).opacity(phase.busy ? 0 : 1)
                Glyph(.stop, size: 13).opacity(phase.busy ? 1 : 0)
            }
            .foregroundStyle(.white.opacity(0.9))
            .frame(width: 44, height: 44)
            .contentShape(Circle())
            .animation(motion(0.26), value: phase.busy)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(phase.controlLabel)
    }

    private var agent: some View {
        ZStack {
            Circle()
                .fill(.thinMaterial)
                .environment(\.colorScheme, .light)
                .overlay(Self.color(0xCCCCD0).opacity(0.76), in: Circle())
                .overlay(alignment: .top) {
                    Circle().strokeBorder(.white.opacity(0.24), lineWidth: 1)
                }
                .frame(width: 36, height: 36)
                .scaleEffect(phase == .opening ? 0.92 : phase.compact ? 1 : 1.08)
                .opacity(phase.compact ? 1 : 0)
                .animation(motion(0.46), value: phase)
            AgentMark(expansion: phase.compact ? 0 : 1,
                      gather: phase == .searching && !reduceMotion ? 1 : 0,
                      listeningSince: phase == .listening && !reduceMotion ? phaseStarted : nil,
                      searchingSince: (phase == .searching || phase == .reviewing) && !reduceMotion ? searchStarted : nil)
                .frame(width: 32, height: 32)
                .animation(motion(phase.compact ? 0.50 : 0.70), value: phase.compact)
                .animation(reduceMotion ? nil : .interpolatingSpring(mass: 1, stiffness: 112, damping: 22), value: phase == .searching)
        }
        .frame(width: 44, height: 44)
        .accessibilityHidden(true)
        .overlay {
            if phase.compact {
                Button(action: startVoice) {
                    Color.clear.contentShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(phase == .opening)
                .accessibilityLabel("Activate voice search demo")
            }
        }
    }

    private func backdrop(size: CGSize) -> some View {
        let backdropHeight = min(size.height, 519)
        let coverSize = max(1, (size.width - 60) / 2)
        return ZStack(alignment: .bottomLeading) {
            Self.color(0xEEECEF)
            VStack(alignment: .leading, spacing: 0) {
                Text("Podcasts")
                    .font(Self.semibold(32))
                    .tracking(-0.8)
                    .frame(height: 32, alignment: .leading)
                HStack(spacing: 12) {
                    ForEach(Episode.all.prefix(2)) { episode in
                        VStack(alignment: .leading, spacing: 8) {
                            cover(episode, size: coverSize, radius: 17, tint: .black.opacity(0.10))
                            Text(episode.show.title)
                                .font(Self.semibold(15))
                                .lineLimit(1)
                                .frame(width: coverSize, height: 19, alignment: .leading)
                        }
                    }
                }
                .padding(.top, 16)
                Text("Up Next")
                    .font(Self.semibold(20))
                    .tracking(-0.5)
                    .frame(height: 25, alignment: .leading)
                    .padding(.top, 16)
                    .padding(.bottom, 4)
                ForEach(Episode.all.suffix(2)) { episode in
                    HStack(spacing: 12) {
                        cover(episode, size: 36, radius: 9, tint: .black.opacity(0.10))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(episode.title).font(Self.semibold(15)).lineLimit(1)
                            Text("\(episode.show.title) · \(episode.duration)")
                                .font(DesignFont.sans(13))
                                .foregroundStyle(Self.color(0x655E6A))
                                .lineLimit(1)
                        }
                        Spacer(minLength: 0)
                        Glyph(.play, size: 12)
                            .frame(width: 32, height: 32)
                            .background(.black.opacity(0.06), in: Circle())
                    }
                    .padding(.vertical, 6)
                    .overlay(alignment: .bottom) {
                        if episode.id != Episode.all.last?.id {
                            Rectangle().fill(.black.opacity(0.08)).frame(height: 1)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            .foregroundStyle(Self.color(0x211D28))
            .padding(.horizontal, 24)
            .padding(.top, 56)
            .frame(height: backdropHeight, alignment: .top)
            .clipped()
        }
        .frame(width: size.width, height: size.height, alignment: .bottom)
    }

    private func episodeCarousel(width: CGFloat) -> some View {
        let hasPeek = matches.count > 1
        let cardWidth = max(1, width - (hasPeek ? 90 : 48))
        let animateCards = !reduceMotion
        return ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                HStack(spacing: 12) {
                    ForEach(matches) { episode in
                        Button {
                            centeredEpisode = episode.id
                            withAnimation(motion(0.30)) { selectedEpisode = episode }
                        } label: {
                            episodeCard(episode, width: cardWidth)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("View \(episode.title), \(episode.show.title)")
                        .scrollTransition(.interactive, axis: .horizontal) { content, phase in
                            content.scaleEffect(animateCards ? 1 - 0.08 * abs(phase.value) : 1)
                        }
                        .id(episode.id)
                    }
                }
                .scrollTargetLayout()
                .padding(.trailing, hasPeek ? 42 : 0)
                .padding(.vertical, 4)
            }
            .contentMargins(.horizontal, 24, for: .scrollContent)
            .scrollIndicators(.hidden)
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $centeredEpisode, anchor: .leading)
            .onChange(of: matches.map(\.id)) { _, _ in alignResults(using: proxy) }
            .onChange(of: hasResults) { _, _ in alignResults(using: proxy) }
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityLabel("Matching podcast episodes. Swipe left or right.")
    }

    private func alignResults(using proxy: ScrollViewProxy) {
        guard hasResults, let resultAnchor else { return }
        var transaction = Transaction(animation: nil)
        transaction.disablesAnimations = true
        withTransaction(transaction) {
            proxy.scrollTo(resultAnchor, anchor: .leading)
        }
    }

    private func episodeCard(_ episode: Episode, width: CGFloat) -> some View {
        let coverSize = max(1, (width - 20) * 0.38)
        let textWidth = max(1, width - coverSize - 36)
        return HStack(alignment: .center, spacing: 12) {
            cover(episode, size: coverSize, radius: 15, tint: .white.opacity(0.1))
            VStack(alignment: .leading, spacing: 0) {
                Paragraph(episode.title, width: textWidth, size: 20, lineHeight: 22, semibold: true, tracking: -0.5)
                Paragraph(episode.show.title, width: textWidth, size: 17, lineHeight: 21.25)
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.top, 6)
                Spacer(minLength: 8)
                Text(episode.duration)
                    .font(DesignFont.sans(17).monospacedDigit())
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(height: 21.25)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 4)
            .padding(.trailing, 4)
        }
        .padding(10)
        .frame(width: width)
        .frame(minHeight: 152)
        .background(Self.color(0x171424).opacity(0.15), in: .rect(cornerRadius: 25))
        .contentShape(.rect(cornerRadius: 25))
    }

    private func episodeDetail(_ episode: Episode, width: CGFloat) -> some View {
        let coverSize = max(1, (width - 24) * 0.38)
        let textWidth = max(1, width - coverSize - 36)
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                cover(episode, size: coverSize, radius: 17, tint: .white.opacity(0.10))
                VStack(alignment: .leading, spacing: 0) {
                    Button {
                        withAnimation(motion(0.30)) { selectedEpisode = nil }
                    } label: {
                        Glyph(.back, size: 19)
                            .frame(width: 40, height: 40)
                            .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back to podcast episodes")
                    .padding(.bottom, 4)
                    Paragraph(episode.title, width: textWidth, size: 20, lineHeight: 25, semibold: true)
                    Paragraph(episode.description, width: textWidth, size: 17, lineHeight: 23.375)
                        .foregroundStyle(.white.opacity(0.95))
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            Link(destination: episode.link) {
                HStack(spacing: 8) {
                    Glyph(.play, size: 14)
                    Text("Listen")
                    Spacer(minLength: 8)
                    Text(episode.duration).monospacedDigit()
                    Glyph(.external, size: 15)
                }
                .font(DesignFont.sans(17))
                .padding(.horizontal, 12)
                .frame(height: 40)
                .background(.white.opacity(0.12), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(.isLink)
            .accessibilityLabel("Listen to \(episode.title) on \(episode.show.title)")
        }
        .padding(12)
        .background(Self.color(0x171424).opacity(0.15), in: .rect(cornerRadius: 25))
    }

    private func cover(_ episode: Episode, size: CGFloat, radius: CGFloat, tint: Color) -> some View {
        Group {
            if let cover = covers[episode.id] { Image(uiImage: cover).resizable() }
            else { episodePhoto(episode).resizable() }
        }
        .scaledToFill()
        .frame(width: size, height: size)
        .background(tint)
        .clipShape(.rect(cornerRadius: radius))
        .accessibilityHidden(true)
    }

    private func episodePhoto(_ episode: Episode) -> Image {
        if let artwork = Self.episodeArtwork[episode.id] { return Image(uiImage: artwork) }
        return Image(systemName: "waveform")
    }

    private func loadCovers() async {
        await withTaskGroup(of: (String, Data?).self) { group in
            for episode in Episode.all {
                let id = episode.id
                let url = episode.artworkURL
                group.addTask {
                    let data = try? await URLSession.shared.data(from: url).0
                    return (id, data)
                }
            }
            for await (id, data) in group {
                guard !Task.isCancelled, let data,
                      let source = CGImageSourceCreateWithData(data as CFData, nil),
                      let preview = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                        kCGImageSourceCreateThumbnailFromImageAlways: true,
                        kCGImageSourceCreateThumbnailWithTransform: true,
                        kCGImageSourceThumbnailMaxPixelSize: 600
                      ] as CFDictionary) else { continue }
                covers[id] = UIImage(cgImage: preview)
            }
        }
    }

    private func startVoice() {
        guard !phase.busy else { return }
        if phase == .idle {
            preferences = Preferences()
            request = .everydayDesign
            withAnimation(motion(1.02)) { sceneProgress = 1 }
            changePhase(to: reduceMotion ? .listening : .opening)
        } else {
            request = preferences.maxMinutes == nil ? .underTwenty : preferences.soundOnly ? .anyTopic : .sound
            changePhase(to: .listening)
        }
    }

    private func cancelVoice() {
        if hasResults { changePhase(to: .results) }
        else { reset() }
    }

    private func reset() {
        guard phase != .idle else { return }
        withAnimation(motion(0.30)) { selectedEpisode = nil }
        hasResults = false
        withAnimation(motion(0.46)) { resultProgress = 0 }
        withAnimation(motion(0.52)) { sceneProgress = 0 }
        changePhase(to: .idle)
    }

    private func changePhase(to next: Phase) {
        phaseStarted = .now
        if next == .searching { searchStarted = phaseStarted }
        withAnimation(motion(0.30)) { phase = next }
    }

    private func advancePhase(_ current: Phase) async {
        do {
            switch current {
            case .idle, .results: return
            case .opening:
                try await Task.sleep(for: .milliseconds(1020))
                try Task.checkCancellation()
                changePhase(to: .listening)
            case .listening:
                try await Task.sleep(for: .milliseconds(reduceMotion ? 500 : Self.listeningDuration))
                try Task.checkCancellation()
                changePhase(to: .searching)
            case .searching:
                try await Task.sleep(for: .milliseconds(reduceMotion ? 600 : 1410))
                try Task.checkCancellation()
                changePhase(to: .reviewing)
            case .reviewing:
                let next = request.applying(to: preferences)
                let nextEpisodes = next.episodes
                let currentIndex = matches.firstIndex { $0.id == centeredEpisode } ?? 0
                let retained = hasResults ? matches.enumerated().filter { match in
                    nextEpisodes.contains { $0.id == match.element.id }
                }.min { abs($0.offset - currentIndex) < abs($1.offset - currentIndex) } : nil
                let anchor = retained?.element.id ?? nextEpisodes.first?.id
                if !reduceMotion, let retained, retained.offset != currentIndex {
                    try await Task.sleep(for: .milliseconds(550))
                    try Task.checkCancellation()
                    withAnimation(motion(0.55)) { centeredEpisode = retained.element.id }
                    try await Task.sleep(for: .milliseconds(770))
                } else {
                    try await Task.sleep(for: .milliseconds(reduceMotion ? 600 : 1320))
                }
                try Task.checkCancellation()
                withAnimation(motion(0.48)) {
                    preferences = next
                    hasResults = true
                    resultAnchor = anchor
                    centeredEpisode = anchor
                }
                changePhase(to: .results)
                withAnimation(motion(0.88)) { resultProgress = 1 }
            }
        } catch is CancellationError {
            // A new phase or a disappearing view has already replaced this task.
        } catch {
            cancelVoice()
        }
    }

    private static func color(_ rgb: UInt32) -> Color {
        Color(red: Double((rgb >> 16) & 255) / 255, green: Double((rgb >> 8) & 255) / 255, blue: Double(rgb & 255) / 255)
    }

    private static let episodeArtwork = Dictionary(uniqueKeysWithValues: Episode.all.compactMap { episode -> (String, UIImage)? in
        guard let url = Bundle.module.url(forResource: "podcast-\(episode.id)", withExtension: "webp", subdirectory: "OrganicUI"),
              let image = UIImage(contentsOfFile: url.path) else { return nil }
        return (episode.id, image)
    })

    private static let semiboldName: String? = {
        guard let url = Bundle.module.url(forResource: "Geist-SemiBold", withExtension: "ttf", subdirectory: "OrganicUI"),
              let provider = CGDataProvider(url: url as CFURL), let font = CGFont(provider) else { return nil }
        CTFontManagerRegisterGraphicsFont(font, nil)
        return font.postScriptName as String?
    }()

    private static func semibold(_ size: CGFloat) -> Font {
        semiboldName.map { .custom($0, fixedSize: size) } ?? .system(size: size, weight: .semibold)
    }
}

private extension OrganicUI {
    static let easing = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.42, y: 0),
                                         endControlPoint: UnitPoint(x: 0.30, y: 1))
    static let listeningDuration = 3100

    static func progress(_ value: Double, from start: Double, to end: Double) -> Double {
        min(1, max(0, (value - start) / (end - start)))
    }

    static func smooth(_ value: Double) -> Double {
        value * value * (3 - 2 * value)
    }

    struct OpeningMask: View, Animatable {
        var progress: Double
        let size: CGSize

        var animatableData: Double {
            get { progress }
            set { progress = newValue }
        }

        private var opacity: Double {
            if progress < 0.2 {
                return 0.37 * OrganicUI.progress(progress, from: 0, to: 0.2)
            } else if progress < 0.58 {
                return 0.37 + 0.52 * OrganicUI.progress(progress, from: 0.2, to: 0.58)
            }
            return 0.89 + 0.11 * OrganicUI.progress(progress, from: 0.58, to: 1)
        }

        var body: some View {
            let radius = 0.001 + 2.05 * progress
            RadialGradient(stops: [
                .init(color: .black, location: 0.54),
                .init(color: .black.opacity(0.75), location: 0.68),
                .init(color: .black.opacity(0.20), location: 0.88),
                .init(color: .clear, location: 1)
            ], center: .center, startRadius: 0, endRadius: 1)
            .frame(width: 2, height: 2)
            .scaleEffect(x: size.width * radius, y: size.height * (0.001 + 1.25 * progress))
            .position(x: 46, y: size.height - 50)
            .opacity(opacity)
        }
    }

    struct FogMask: View, Animatable {
        var progress: Double

        var animatableData: Double {
            get { progress }
            set { progress = newValue }
        }

        var body: some View {
            ZStack(alignment: .bottom) {
                fade(height: 210)
                fade(height: 420)
                    .opacity(OrganicUI.progress(progress, from: 0.12, to: 1))
            }
        }

        private func fade(height: CGFloat) -> some View {
            LinearGradient(stops: [
                .init(color: .clear, location: 0),
                .init(color: .black.opacity(0.27), location: 43 / height),
                .init(color: .black.opacity(0.78), location: 96 / height),
                .init(color: .black, location: 140 / height)
            ], startPoint: .top, endPoint: .bottom)
            .frame(height: height)
        }
    }

    struct AgentMark: View, Animatable {
        var expansion: Double
        var gather: Double
        let listeningSince: Date?
        let searchingSince: Date?

        var animatableData: AnimatablePair<Double, Double> {
            get { AnimatablePair(expansion, gather) }
            set { (expansion, gather) = (newValue.first, newValue.second) }
        }

        var body: some View {
            TimelineView(.animation(paused: listeningSince == nil && searchingSince == nil)) { timeline in
                Canvas { context, _ in
                    let center = CGPoint(x: 16, y: 16)
                    let breath = listeningSince.map { voiceEnergy(timeline.date.timeIntervalSince($0)) } ?? 0
                    let orbit = searchingSince.map { timeline.date.timeIntervalSince($0) / 2.05 } ?? 0
                    let coreRadius = 4 - 2 * OrganicUI.progress(expansion, from: 0, to: 0.5)
                    var core = context
                    core.opacity = 1 - OrganicUI.smooth(OrganicUI.progress(expansion, from: 0.17, to: 0.57))
                    core.fill(circle(center: center, radius: coreRadius), with: .radialGradient(
                        Gradient(colors: [OrganicUI.color(0xA8C8F1), OrganicUI.color(0x749BCE)]),
                        center: center, startRadius: 0, endRadius: coreRadius
                    ))

                    var ring = context
                    ring.opacity = OrganicUI.smooth(OrganicUI.progress(expansion, from: 0.15, to: 0.7))
                    let radius = 1.08 + 0.26 * breath
                    for index in 0..<24 {
                        let position = particle(index, breath: breath, orbit: orbit)
                        ring.fill(circle(center: position, radius: radius), with: .color(OrganicUI.color(0xC4DDFA)))
                    }
                }
            }
        }

        private func voiceEnergy(_ elapsed: Double) -> Double {
            let time = elapsed / (Double(OrganicUI.listeningDuration) / 1000)
            if time < 0.52 {
                return OrganicUI.easing.value(at: OrganicUI.progress(time, from: 0.18, to: 0.52))
            }
            return 1 - OrganicUI.easing.value(at: OrganicUI.progress(time, from: 0.52, to: 0.90))
        }

        private func particle(_ index: Int, breath: Double, orbit: Double) -> CGPoint {
            let angle = Double(index) * .pi / 12
            let inner = index.isMultiple(of: 2)
            let wave = (1 - cos(2 * .pi * (orbit - Double(index) / 24))) / 2
            let arc = point(angle + (inner ? 0.48 : -0.23), radius: inner ? 8.2 : 13.6)
            let sweep = point(angle + (inner ? 0.70 : -0.34), radius: inner ? 9.1 : 13.5)
            let curve = mix(arc, sweep, wave)
            let ripple = breath * sin(2 * angle - .pi * breath)
            let listening = point(angle + 0.064 * breath, radius: 13.5 + 0.85 * ripple)
            let offset = mix(listening, curve, gather * (0.54 + 0.46 * wave))
            return mix(CGPoint(x: 16, y: 16), offset, expansion)
        }

        private func point(_ angle: Double, radius: Double) -> CGPoint {
            CGPoint(x: 16 + cos(angle) * radius, y: 16 + sin(angle) * radius)
        }

        private func mix(_ from: CGPoint, _ to: CGPoint, _ progress: Double) -> CGPoint {
            CGPoint(x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress)
        }

        private func circle(center: CGPoint, radius: Double) -> Path {
            Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
        }
    }

    /// Keep the result row anchored to the bottom while it makes room above.
    struct ShelfLayout: Layout {
        var progress: Double

        var animatableData: Double {
            get { progress }
            set { progress = newValue }
        }

        func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
            guard let shelf = subviews.first else { return .zero }
            let natural = shelf.sizeThatFits(ProposedViewSize(width: proposal.width, height: nil))
            return CGSize(width: natural.width, height: natural.height * progress)
        }

        func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
            subviews.first?.place(at: CGPoint(x: bounds.minX, y: bounds.maxY), anchor: .bottomLeading,
                                  proposal: ProposedViewSize(width: bounds.width, height: nil))
        }
    }

    struct ShelfAppearance: ViewModifier, Animatable {
        var progress: Double

        var animatableData: Double {
            get { progress }
            set { progress = newValue }
        }

        func body(content: Content) -> some View {
            let reveal = OrganicUI.smooth(OrganicUI.progress(progress, from: 0.31, to: 1))
            content.opacity(reveal).offset(y: (1 - reveal) * 10)
        }
    }

    struct StatusLine: View {
        let text: String
        let width: CGFloat
        let revealWords: Bool
        @State private var wordTime = 0.0

        var body: some View {
            Paragraph(text, width: width, size: 17, lineHeight: 21.25, wordTime: revealWords ? wordTime : -1)
                .accessibilityAddTraits(.updatesFrequently)
                .onAppear {
                    guard revealWords else { return }
                    let duration = 0.24 + 0.042 * Double(max(0, text.split(separator: " ").count - 1))
                    withAnimation(.linear(duration: duration)) { wordTime = duration }
                }
        }
    }

    enum Phase: Equatable {
        case idle, opening, listening, searching, reviewing, results

        var compact: Bool { self == .idle || self == .opening }
        var busy: Bool { self != .idle && self != .results }

        var controlLabel: String {
            switch self {
            case .idle, .opening: "Start voice demo"
            case .listening: "Stop listening"
            case .searching, .reviewing: "Stop searching"
            case .results: "Refine with voice demo"
            }
        }
    }

    enum VoiceRequest {
        case everydayDesign, underTwenty, sound, anyTopic

        func applying(to preferences: Preferences) -> Preferences {
            var next = preferences
            switch self {
            case .everydayDesign: break
            case .underTwenty: next.maxMinutes = 20
            case .sound: next.soundOnly = true
            case .anyTopic: next.soundOnly = false
            }
            return next
        }
    }

    struct Preferences {
        var maxMinutes: Int?
        var soundOnly = false

        var episodes: [Episode] {
            Episode.all.filter { episode in
                (maxMinutes.map { episode.seconds <= $0 * 60 } ?? true)
                    && (!soundOnly || episode.topic == .sound)
            }
        }
    }

    /// SwiftUI balances wrapped lines. Pack words from the leading edge as the web layout does.
    struct Paragraph: View, Animatable {
        let text: String
        let width: CGFloat
        let size: CGFloat
        let lineHeight: CGFloat
        let semibold: Bool
        let tracking: CGFloat
        var wordTime: Double

        var animatableData: Double {
            get { wordTime }
            set { wordTime = newValue }
        }

        init(_ text: String, width: CGFloat, size: CGFloat, lineHeight: CGFloat, semibold: Bool = false, tracking: CGFloat = 0, wordTime: Double = -1) {
            self.text = text
            self.width = width
            self.size = size
            self.lineHeight = lineHeight
            self.semibold = semibold
            self.tracking = tracking
            self.wordTime = wordTime
        }

        var body: some View {
            let font = semibold ? OrganicUI.semibold(size) : DesignFont.sans(size)
            let uiFont = UIFont(name: semibold ? (OrganicUI.semiboldName ?? "") : "Geist-Regular", size: size)
                ?? .systemFont(ofSize: size, weight: semibold ? .semibold : .regular)
            let wrapped = lines(font: uiFont)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(wrapped.enumerated()), id: \.offset) { index, line in
                    let firstWord = wrapped.prefix(index).reduce(0) { $0 + $1.split(separator: " ").count }
                    lineText(line, firstWord: firstWord)
                        .font(font)
                        .tracking(tracking)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                        .frame(height: lineHeight)
                }
            }
            .frame(width: width, alignment: .leading)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(text)
            .accessibilityAddTraits(.isStaticText)
        }

        private func lineText(_ line: String, firstWord: Int) -> Text {
            guard wordTime >= 0 else { return Text(verbatim: line) }
            var styled = AttributedString()
            for (index, word) in line.split(separator: " ").enumerated() {
                let delay = Double(firstWord + index) * 0.042
                let opacity = OrganicUI.easing.value(at: OrganicUI.progress(wordTime, from: delay, to: delay + 0.24))
                var piece = AttributedString(index == 0 ? String(word) : " " + word)
                piece.foregroundColor = .white.opacity(opacity)
                styled.append(piece)
            }
            return Text(styled)
        }

        private func lines(font: UIFont) -> [String] {
            var lines: [String] = []
            var current = ""
            let attributes: [NSAttributedString.Key: Any] = [.font: font, .kern: tracking]
            for word in text.split(separator: " ") {
                let candidate = current.isEmpty ? String(word) : "\(current) \(word)"
                if !current.isEmpty && (candidate as NSString).size(withAttributes: attributes).width > width {
                    lines.append(current)
                    current = String(word)
                } else {
                    current = candidate
                }
            }
            if !current.isEmpty { lines.append(current) }
            return lines
        }
    }

    enum Show {
        case twentyThousandHertz, ninetyNinePercentInvisible

        var title: String {
            switch self {
            case .twentyThousandHertz: "Twenty Thousand Hertz"
            case .ninetyNinePercentInvisible: "99% Invisible"
            }
        }

    }

    struct Episode: Identifiable {
        enum Topic { case sound, architecture, technology }

        let id: String
        let title: String
        let show: Show
        let seconds: Int
        let topic: Topic
        let description: String
        let link: URL
        let artworkURL: URL

        var duration: String { String(format: "%d:%02d", seconds / 60, seconds % 60) }

        static let all = [
            Episode(id: "windows", title: "Windows startup sounds", show: .twentyThousandHertz, seconds: 1576, topic: .sound,
                    description: "How Microsoft used a few seconds of sound to give each version of Windows its own personality.",
                    link: URL(string: "https://www.20k.org/episodes/tadaitswindows")!,
                    artworkURL: URL(string: "https://images.squarespace-cdn.com/content/v1/580fbaac440243d8731ffc57/322ef7e8-a834-429e-9384-4c237adc0150/20K_WindowsStartup_Part1.jpg?format=750w")!),
            Episode(id: "kitchen", title: "The Frankfurt Kitchen", show: .ninetyNinePercentInvisible, seconds: 2063, topic: .architecture,
                    description: "How a compact kitchen in 1920s Frankfurt helped shape the way we design kitchens today.",
                    link: URL(string: "https://99percentinvisible.org/episode/541-the-frankfurt-kitchen/")!,
                    artworkURL: URL(string: "https://99percentinvisible.org/wp-content/uploads/2023/05/frankfurt-main.jpg")!),
            Episode(id: "screens", title: "Future Screens Are Mostly Blue", show: .ninetyNinePercentInvisible, seconds: 1194, topic: .technology,
                    description: "Why sci-fi interfaces keep turning blue, and what their designers imagine screens will do next.",
                    link: URL(string: "https://99percentinvisible.org/episode/future-screens-are-mostly-blue/")!,
                    artworkURL: URL(string: "https://99percentinvisible.org/wp-content/uploads/2013/11/7801464974_4fbd765dd9_o.jpg")!),
            Episode(id: "artificial-sound", title: "The Sound of the Artificial World", show: .ninetyNinePercentInvisible, seconds: 319, topic: .sound,
                    description: "Sound designer Jim McKee explains how a digital button gets the feel of a physical click.",
                    link: URL(string: "https://99percentinvisible.org/episode/episode-15-the-sound-of-the-artificial-world/")!,
                    artworkURL: URL(string: "https://99percentinvisible.org/wp-content/uploads/2011/02/3341668133_f0a11049a1_b.jpg")!)
        ]
    }

    struct Glyph: View {
        enum Kind { case mic, stop, back, external, play }
        let kind: Kind
        let size: CGFloat

        init(_ kind: Kind, size: CGFloat) {
            self.kind = kind
            self.size = size
        }

        var body: some View {
            let scale = size / 24
            let shape = path.applying(CGAffineTransform(scaleX: scale, y: scale))
            shape
                .fill(kind == .stop || kind == .play ? AnyShapeStyle(.foreground) : AnyShapeStyle(.clear))
                .overlay {
                    shape.stroke(style: StrokeStyle(lineWidth: 2 * scale, lineCap: .round, lineJoin: .round))
                }
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        }

        private var path: Path {
            var path = Path()
            switch kind {
            case .mic:
                path.addRoundedRect(in: CGRect(x: 9, y: 2, width: 6, height: 13), cornerSize: CGSize(width: 3, height: 3))
                path.move(to: CGPoint(x: 5, y: 10))
                path.addLine(to: CGPoint(x: 5, y: 12))
                path.addCurve(to: CGPoint(x: 19, y: 12), control1: CGPoint(x: 5, y: 21.33), control2: CGPoint(x: 19, y: 21.33))
                path.addLine(to: CGPoint(x: 19, y: 10))
                path.move(to: CGPoint(x: 12, y: 19))
                path.addLine(to: CGPoint(x: 12, y: 22))
            case .stop:
                path.addRoundedRect(in: CGRect(x: 3, y: 3, width: 18, height: 18), cornerSize: CGSize(width: 2, height: 2))
            case .back:
                path.move(to: CGPoint(x: 15, y: 6))
                path.addLines([CGPoint(x: 15, y: 6), CGPoint(x: 9, y: 12), CGPoint(x: 15, y: 18)])
            case .external:
                path.addLines([CGPoint(x: 7, y: 7), CGPoint(x: 17, y: 7), CGPoint(x: 17, y: 17)])
                path.addLines([CGPoint(x: 7, y: 17), CGPoint(x: 17, y: 7)])
            case .play:
                path.move(to: CGPoint(x: 5, y: 5))
                path.addQuadCurve(to: CGPoint(x: 8, y: 3.27), control: CGPoint(x: 5, y: 1.6))
                path.addLine(to: CGPoint(x: 20, y: 10.27))
                path.addQuadCurve(to: CGPoint(x: 20, y: 13.73), control: CGPoint(x: 23, y: 12))
                path.addLine(to: CGPoint(x: 8, y: 20.73))
                path.addQuadCurve(to: CGPoint(x: 5, y: 19), control: CGPoint(x: 5, y: 22.4))
                path.closeSubpath()
            }
            return path
        }
    }
}
