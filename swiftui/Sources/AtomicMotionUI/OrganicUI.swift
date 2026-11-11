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
    @State private var beat: VoiceBeat?
    @State private var hasResults = false
    @State private var selectedEpisode: Episode?
    @State private var centeredEpisode: String?
    @State private var showCovers: [Show: UIImage] = [:]

    public init() {}

    public var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                backdrop(size: geometry.size)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: reset)
                    .accessibilityHidden(true)

                assistant(width: geometry.size.width)
                    .padding(.top, 24)
                    .padding(.bottom, 28)
                    .contentShape(Rectangle())
                    .background {
                        Color.clear.contentShape(Rectangle()).onTapGesture {}
                    }
                    .background(alignment: .bottom) {
                        GeometryReader { panel in
                            let hazeHeight = panel.size.height + 160
                            ZStack(alignment: .bottom) {
                                backdrop(size: geometry.size)
                                    .blur(radius: 14)
                                    .frame(height: hazeHeight, alignment: .bottom)
                                    .clipped()
                                LinearGradient(stops: [
                                    .init(color: Self.color(0x232236).opacity(0.22), location: 0),
                                    .init(color: Self.color(0x1A182A).opacity(0.58), location: 0.63),
                                    .init(color: Self.color(0x181525).opacity(0.64), location: 1)
                                ], startPoint: .top, endPoint: .bottom)
                            }
                            .frame(height: hazeHeight)
                            .mask {
                                LinearGradient(stops: [
                                    .init(color: .clear, location: 0),
                                    .init(color: .black.opacity(0.30), location: 0.15),
                                    .init(color: .black.opacity(0.83), location: 0.32),
                                    .init(color: .black, location: 0.53)
                                ], startPoint: .top, endPoint: .bottom)
                            }
                            .frame(height: panel.size.height, alignment: .bottom)
                        }
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
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
        guard hasResults else { return [] }
        return Episode.all.filter { episode in
            (preferences.maxMinutes.map { episode.seconds <= $0 * 60 } ?? true)
                && (preferences.soundOnly ? episode.topic == .sound : true)
        }
    }

    private var status: String? {
        switch phase {
        case .idle: return nil
        case .searching: return "Looking for episodes…"
        case .reviewing:
            switch request {
            case .everydayDesign: return "Picking a few stories about everyday design…"
            case .underTwenty: return "Checking episode lengths…"
            case .sound, .anyTopic: return "Checking which episodes match the topic…"
            }
        case .listening, .results:
            guard hasResults else { return nil }
            let subject = matches.count == 1 ? "an episode" : matches.count == 2 ? "two episodes" : "a few episodes"
            if preferences.soundOnly { return "I found \(subject) about sound design." }
            if let maxMinutes = preferences.maxMinutes { return "I found \(subject) under \(maxMinutes) minutes." }
            return "I found a few stories about everyday design."
        }
    }

    private var morph: Animation? {
        reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.65)
    }

    @ViewBuilder private func assistant(width: CGFloat) -> some View {
        if let episode = selectedEpisode {
            episodeDetail(episode, width: max(1, width - 48))
                .padding(.horizontal, 24)
                .transition(.opacity.combined(with: .scale(scale: 0.98)))
        } else {
            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    if phase == .idle {
                        Button(action: startVoice) { agent }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Activate voice search demo")
                    } else {
                        agent.accessibilityHidden(true)
                    }
                    if let status {
                        Paragraph(status, width: max(1, width - (hasResults ? 100 : 152)), size: 17, lineHeight: 21.25)
                            .foregroundStyle(.white.opacity(phase == .listening ? 0.6 : 1))
                            .accessibilityAddTraits(.updatesFrequently)
                    } else {
                        Spacer(minLength: 0)
                    }
                    if !hasResults { voiceControl }
                }
                .frame(minHeight: 44)
                .padding(.horizontal, 24)

                if !matches.isEmpty {
                    episodeCarousel(width: width)
                        .padding(.top, 10)
                        .opacity(phase.busy ? 0.72 : 1)
                        .allowsHitTesting(!phase.busy)
                        .accessibilityHidden(phase.busy)
                        .transition(.offset(y: 14).combined(with: .opacity))
                }
                if hasResults {
                    HStack {
                        Spacer()
                        voiceControl
                    }
                    .padding(.top, 8)
                    .padding(.horizontal, 24)
                }
            }
        }
    }

    private var voiceControl: some View {
        Button(action: phase.busy ? cancelVoice : startVoice) {
            Glyph(phase.busy ? .stop : .mic, size: phase.busy ? 13 : 20)
                .foregroundStyle(.white.opacity(0.9))
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(phase.controlLabel)
    }

    private var agent: some View {
        ZStack {
            if phase == .idle {
                Circle()
                    .fill(RadialGradient(colors: [Self.color(0xF3FBFF), Self.color(0xA8DCFF), Self.color(0x698CF0)],
                                         center: UnitPoint(x: 0.25, y: 0.22), startRadius: 0, endRadius: 7))
                    .frame(width: 8, height: 8)
                    .transition(.opacity)
            } else {
                TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion || phase != .searching)) { context in
                    ZStack(alignment: .topLeading) {
                        ForEach(0..<24) { index in
                            let dot = agentDot(index: index, date: context.date)
                            Circle()
                                .fill(dot.color.opacity(dot.opacity))
                                .frame(width: dot.radius * 2, height: dot.radius * 2)
                                .position(dot.center)
                        }
                    }
                    .frame(width: 32, height: 32)
                }
                .transition(.scale(scale: 0.22).combined(with: .opacity))
            }
        }
        .frame(width: 44, height: 44)
        .contentShape(Circle())
    }

    private func agentDot(index: Int, date: Date) -> AgentDot {
        let angle = Double(index) * .pi / 12
        func point(offset: Double, radius: Double) -> CGPoint {
            CGPoint(x: 16 + cos(angle + offset) * radius, y: 16 + sin(angle + offset) * radius)
        }
        let home = point(offset: 0, radius: 13.5)
        var center = home
        var energy = 0.0
        if phase == .listening, let beat, !reduceMotion {
            let delta = abs(index - beat.focus)
            energy = beat.strength * max(0, 1 - Double(min(delta, 24 - delta)) / 7)
            center = point(offset: 0, radius: 13.5 * (1 - energy * 0.2))
        } else if phase == .searching && !reduceMotion {
            let inner = index.isMultiple(of: 2)
            let elapsed = max(0, date.timeIntervalSince(phaseStarted)) + 0.34 * Double(index % 6) / 5
            let cycle = (elapsed / 1.85).truncatingRemainder(dividingBy: 1)
            let from: (time: Double, position: CGPoint)
            let to: (time: Double, position: CGPoint)
            let arc = (0.38, point(offset: inner ? 0.48 : -0.23, radius: inner ? 8.2 : 13.6))
            let sweep = (0.66, point(offset: inner ? 0.70 : -0.34, radius: inner ? 9.1 : 13.5))
            if cycle < 0.38 {
                from = (0, home)
                to = arc
            } else if cycle < 0.66 {
                from = arc
                to = sweep
            } else {
                from = sweep
                to = (1, home)
            }
            let progress = (cycle - from.time) / (to.time - from.time)
            let eased = progress * progress * (3 - 2 * progress)
            center = CGPoint(x: from.position.x + (to.position.x - from.position.x) * eased,
                             y: from.position.y + (to.position.y - from.position.y) * eased)
        }
        let lightness = (72 + cos(angle) * 12) / 100
        let brightness = lightness + 0.94 * min(lightness, 1 - lightness)
        let color = phase == .results ? Color.white : Color(
            hue: (215 - sin(angle) * 9) / 360, saturation: 2 * (1 - lightness / brightness), brightness: brightness
        )
        return AgentDot(center: center,
                        radius: 1.08 + energy * 0.32, color: color,
                        opacity: phase == .listening && !reduceMotion ? 0.67 + energy * 0.33 : 1)
    }

    private func backdrop(size: CGSize) -> some View {
        let backdropHeight = min(size.height, 505)
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
                    .padding(.top, 20)
                    .padding(.bottom, 4)
                ForEach(Episode.all.suffix(2)) { episode in
                    HStack(spacing: 12) {
                        episodePhoto(episode)
                            .resizable().scaledToFill()
                            .frame(width: 44, height: 44)
                            .clipShape(.rect(cornerRadius: 9))
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
                    .padding(.vertical, 10)
                    .overlay(alignment: .bottom) { Rectangle().fill(.black.opacity(0.08)).frame(height: 1) }
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
        return ScrollView(.horizontal) {
            HStack(spacing: 12) {
                ForEach(matches) { episode in
                    Button {
                        centeredEpisode = episode.id
                        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.24)) { selectedEpisode = episode }
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
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityLabel("Matching podcast episodes. Swipe left or right.")
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
        .background(.white.opacity(0.12), in: .rect(cornerRadius: 25))
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
                        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.24)) { selectedEpisode = nil }
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
            .accessibilityLabel("Listen to \(episode.title) on \(episode.show.title)")
        }
        .padding(12)
        .background(.white.opacity(0.12), in: .rect(cornerRadius: 25))
    }

    private func cover(_ episode: Episode, size: CGFloat, radius: CGFloat, tint: Color) -> some View {
        Group {
            if let cover = showCovers[episode.show] { Image(uiImage: cover).resizable() }
            else { episodePhoto(episode).resizable() }
        }
        .scaledToFit()
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
        await withTaskGroup(of: (Show, Data?).self) { group in
            for show in Show.allCases {
                group.addTask {
                    let data = try? await URLSession.shared.data(from: show.artworkURL).0
                    return (show, data)
                }
            }
            for await (show, data) in group {
                guard !Task.isCancelled, let data,
                      let source = CGImageSourceCreateWithData(data as CFData, nil),
                      let preview = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                        kCGImageSourceCreateThumbnailFromImageAlways: true,
                        kCGImageSourceThumbnailMaxPixelSize: 600
                      ] as CFDictionary) else { continue }
                showCovers[show] = UIImage(cgImage: preview)
            }
        }
    }

    private func startVoice() {
        guard !phase.busy else { return }
        request = !hasResults ? .everydayDesign : preferences.maxMinutes == nil ? .underTwenty : preferences.soundOnly ? .anyTopic : .sound
        beat = nil
        changePhase(to: .listening)
    }

    private func cancelVoice() {
        beat = nil
        changePhase(to: hasResults ? .results : .idle)
    }

    private func reset() {
        guard phase != .idle else { return }
        withAnimation(morph) {
            selectedEpisode = nil
            hasResults = false
            preferences = Preferences()
            beat = nil
            phase = .idle
        }
    }

    private func changePhase(to next: Phase) {
        phaseStarted = .now
        withAnimation(reduceMotion ? nil : .easeOut(duration: next == .reviewing ? 0.76 : 0.28)) { phase = next }
    }

    private func advancePhase(_ current: Phase) async {
        do {
            switch current {
            case .idle, .results: return
            case .listening:
                if reduceMotion {
                    try await Task.sleep(for: .milliseconds(500))
                } else {
                    let words = request.prompt.split(separator: " ")
                    try await Task.sleep(for: .milliseconds(600))
                    for (index, word) in words.enumerated() {
                        withAnimation(.easeOut(duration: 0.28)) {
                            beat = VoiceBeat(focus: (index * 7 + 4) % 24, strength: min(1, 0.32 + Double(word.count) * 0.09))
                        }
                        try await Task.sleep(for: .milliseconds(205))
                        withAnimation(.easeOut(duration: 0.28)) { beat = nil }
                        try await Task.sleep(for: .milliseconds(index == words.count - 1 ? 445 : 155))
                    }
                }
                try Task.checkCancellation()
                changePhase(to: .searching)
            case .searching:
                try await Task.sleep(for: .milliseconds(reduceMotion ? 600 : 1350))
                try Task.checkCancellation()
                changePhase(to: .reviewing)
            case .reviewing:
                try await Task.sleep(for: .milliseconds(reduceMotion ? 600 : 1250))
                try Task.checkCancellation()
                withAnimation(morph) {
                    switch request {
                    case .everydayDesign: break
                    case .underTwenty: preferences.maxMinutes = 20
                    case .sound: preferences.soundOnly = true
                    case .anyTopic: preferences.soundOnly = false
                    }
                    hasResults = true
                    centeredEpisode = matches.first?.id
                    phase = .results
                }
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
    enum Phase: Equatable {
        case idle, listening, searching, reviewing, results

        var busy: Bool { self == .listening || self == .searching || self == .reviewing }

        var controlLabel: String {
            switch self {
            case .idle: "Start voice demo"
            case .listening: "Stop listening"
            case .searching, .reviewing: "Stop searching"
            case .results: "Refine with voice demo"
            }
        }
    }

    enum VoiceRequest {
        case everydayDesign, underTwenty, sound, anyTopic

        var prompt: String {
            switch self {
            case .everydayDesign: "Find a podcast about everyday design."
            case .underTwenty: "Keep it under 20 minutes."
            case .sound: "Something about sound."
            case .anyTopic: "Any topic."
            }
        }
    }

    struct Preferences {
        var maxMinutes: Int?
        var soundOnly = false
    }

    struct VoiceBeat {
        let focus: Int
        let strength: Double
    }

    struct AgentDot {
        let center: CGPoint
        let radius: CGFloat
        let color: Color
        let opacity: Double
    }

    /// SwiftUI balances wrapped lines. Pack words from the leading edge as the web layout does.
    struct Paragraph: View {
        let text: String
        let width: CGFloat
        let size: CGFloat
        let lineHeight: CGFloat
        let semibold: Bool
        let tracking: CGFloat

        init(_ text: String, width: CGFloat, size: CGFloat, lineHeight: CGFloat, semibold: Bool = false, tracking: CGFloat = 0) {
            self.text = text
            self.width = width
            self.size = size
            self.lineHeight = lineHeight
            self.semibold = semibold
            self.tracking = tracking
        }

        var body: some View {
            let font = semibold ? OrganicUI.semibold(size) : DesignFont.sans(size)
            let uiFont = UIFont(name: semibold ? (OrganicUI.semiboldName ?? "") : "Geist-Regular", size: size)
                ?? .systemFont(ofSize: size, weight: semibold ? .semibold : .regular)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(lines(font: uiFont).enumerated()), id: \.offset) { _, line in
                    Text(verbatim: line)
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

    enum Show: CaseIterable, Hashable, Sendable {
        case twentyThousandHertz, ninetyNinePercentInvisible

        var title: String {
            switch self {
            case .twentyThousandHertz: "Twenty Thousand Hertz"
            case .ninetyNinePercentInvisible: "99% Invisible"
            }
        }

        var artworkURL: URL {
            switch self {
            case .twentyThousandHertz:
                URL(string: "https://f.prxu.org/18144/images/24983ab6-e43f-4b49-8c21-f3b4d461c758/Twenty_Thousand_Hertz_-_Key_Icon_-_3000x3000.jpeg")!
            case .ninetyNinePercentInvisible:
                URL(string: "https://image.simplecastcdn.com/images/8436e3c1-2479-4466-ac48-fa58259960bb/a6d5b177-ab5d-430d-b3f2-b393a09d8101/480x480/sxm-cover-99percentinvisible-r2025-3000x3000-final.jpg?aid=rss_feed")!
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

        var duration: String { String(format: "%d:%02d", seconds / 60, seconds % 60) }

        static let all = [
            Episode(id: "windows", title: "Windows startup sounds", show: .twentyThousandHertz, seconds: 1576, topic: .sound,
                    description: "How Microsoft used a few seconds of sound to give each version of Windows its own personality.",
                    link: URL(string: "https://www.20k.org/episodes/tadaitswindows")!),
            Episode(id: "kitchen", title: "The Frankfurt Kitchen", show: .ninetyNinePercentInvisible, seconds: 2063, topic: .architecture,
                    description: "How a compact kitchen in 1920s Frankfurt helped shape the way we design kitchens today.",
                    link: URL(string: "https://99percentinvisible.org/episode/541-the-frankfurt-kitchen/")!),
            Episode(id: "screens", title: "Future Screens Are Mostly Blue", show: .ninetyNinePercentInvisible, seconds: 1194, topic: .technology,
                    description: "Why sci-fi interfaces keep turning blue, and what their designers imagine screens will do next.",
                    link: URL(string: "https://99percentinvisible.org/episode/future-screens-are-mostly-blue/")!),
            Episode(id: "artificial-sound", title: "The Sound of the Artificial World", show: .ninetyNinePercentInvisible, seconds: 319, topic: .sound,
                    description: "Sound designer Jim McKee explains how a digital button gets the feel of a physical click.",
                    link: URL(string: "https://99percentinvisible.org/episode/episode-15-the-sound-of-the-artificial-world/")!)
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
