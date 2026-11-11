import CoreText
import ImageIO
import SwiftUI
import UIKit

/// An illustrated August 2026 diary with a month view and swipeable pages.
public struct DoodleCalendar: View {
    public struct Day: Equatable, Sendable {
        public let day: Int
        public let weekday: String
        public let title: String
        public let sentence: String
    }

    private let today: Int
    private let loop: Bool
    private let persist: Bool
    private let onSelect: ((Day) -> Void)?
    private let onGenerateImage: ((String, Day) async throws -> URL)?

    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    @State private var diary: DoodleDiary
    @State private var openDay: Int?
    @State private var filter: DoodleTopic?
    @State private var filterOpen = false
    @State private var composing = false
    @State private var drag: CGFloat = 0
    @State private var morph: DoodleMorph?
    @State private var expanded = false
    @State private var morphPaperVisible = false
    @State private var cardTextVisible = true
    @State private var interacted = false
    @State private var demoEntry: DoodleEntry?
    @State private var demoPressed = false
    @State private var sketchDay: Int?
    @State private var sketchPhase = DoodleSketch.idle
    @State private var sketchErrorDay: Int?

    public init(
        today: Int = 13,
        loop: Bool = false,
        persist: Bool = true,
        onSelect: ((Day) -> Void)? = nil,
        onGenerateImage: ((String, Day) async throws -> URL)? = nil
    ) {
        self.today = min(max(1, today), DoodleScene.all.count)
        self.loop = loop
        self.persist = persist
        self.onSelect = onSelect
        self.onGenerateImage = onGenerateImage
        _diary = State(initialValue: persist ? DoodleDiary.saved : .sample)
    }

    public var body: some View {
        GeometryReader { geometry in
            let scale = max(0.3, min(1, (geometry.size.width - 24) / DoodleLayout.width, (geometry.size.height - 24) / DoodleLayout.height))
            screen
                .scaleEffect(scale)
                .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
        }
        .task(id: morph) { await animateMorph() }
        .task(id: sketchDay) { await sketchNote() }
        .task(id: loop && !interacted && !reducedMotion) {
            guard loop, !interacted else { return }
            if !entry(for: today).note.isEmpty || entry(for: today).art != nil {
                open(today)
            } else if !reducedMotion {
                await playDemo()
            }
        }
        .onChange(of: diary) { _, updated in
            if persist { updated.save() }
        }
        .onChange(of: persist) { _, enabled in
            diary = enabled ? .saved : .sample
        }
    }

    private var screen: some View {
        ZStack {
            DoodleColor.paper
                .onTapGesture(perform: touch)
            month
                .allowsHitTesting(openDay == nil && morph == nil && !filterOpen)
                .accessibilityHidden(openDay != nil || morph != nil || filterOpen)

            if openDay != nil {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        touch()
                        if composing { stopWriting() } else { close() }
                    }
                    .accessibilityHidden(true)
            }

            if let morph {
                morphArtwork(morph)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }

            if let openDay {
                pageStrip(openDay)
                if sketchPhase == .idle {
                    if composing {
                        writingControls(openDay)
                    } else {
                        pageControls(openDay)
                    }
                }
            }

            topNavigation
            RoundedRectangle(cornerRadius: DoodleLayout.radius, style: .circular)
                .strokeBorder(DoodleColor.frame, lineWidth: 1)
                .allowsHitTesting(false)
                .accessibilityHidden(true)

            if filterOpen {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { dismissFilter() }
                    .accessibilityHidden(true)
                filterPanel
            }
        }
        .frame(width: DoodleLayout.width, height: DoodleLayout.height)
        .clipShape(RoundedRectangle(cornerRadius: DoodleLayout.radius, style: .circular))
        .foregroundStyle(DoodleColor.ink)
    }

    private var topNavigation: some View {
        ZStack {
            iconButton(.home, label: "Home, month view", fill: .white) {
                touch()
                filter = nil
                dismissFilter()
                close()
            }
            .doodlePlaced(x: 32, y: 28, width: 44, height: 44)

            if let filter {
                DoodleInkLine(filter.label, size: 18, tracking: -0.16)
                    .doodlePlaced(x: 80, y: 38, width: 140, height: 24)
            }

            iconButton(.filter, label: "Filter diary", fill: filter == nil ? .white : DoodleColor.ink, ink: filter == nil ? DoodleColor.ink : .white) {
                touch()
                withAnimation(animation(.easeOut(duration: 0.16))) { filterOpen.toggle() }
            }
            .doodlePlaced(x: 224, y: 28, width: 44, height: 44)
        }
    }

    private var month: some View {
        let hidden = openDay != nil
        return ZStack {
            VStack(alignment: .leading, spacing: 2) {
                DoodleInkLine("August", size: 44, leading: 20.68, tracking: -0.88)
                    .frame(height: 46)
                DoodleInkLine("2026", size: 44, medium: true, leading: 20.68, tracking: -0.88)
                    .frame(height: 46)
            }
            .doodlePlaced(x: 0, y: DoodleLayout.gridTop - 124, width: 246, height: 94, alignment: .topLeading)
            .opacity(hidden ? 0 : 1)
            .offset(y: hidden && !reducedMotion ? -10 : 0)
            .animation(animation(hidden ? .easeOut(duration: 0.32) : .easeOut(duration: 0.60).delay(0.18)), value: hidden)
            .accessibilityElement(children: .combine)

            ForEach(Array(DoodleLayout.weekdays.enumerated()), id: \.offset) { column, weekday in
                DoodleInkLine(String(weekday.prefix(3)), size: 18, tracking: -0.18, ink: DoodleColor.ink.opacity(0.86))
                    .doodlePlaced(x: DoodleLayout.padding + CGFloat(column) * DoodleLayout.step, y: DoodleLayout.gridTop, width: DoodleLayout.cell, height: 20)
                    .opacity(hidden ? 0 : 1)
                    .animation(animation(.easeOut(duration: 0.28).delay(hidden ? 0 : 0.20)), value: hidden)
                    .accessibilityHidden(true)
            }

            ForEach(1...31, id: \.self) { day in
                let rect = DoodleLayout.cellRect(day)
                let anchor = openDay ?? morph?.day
                let delay = anchor.map { dayDelay(from: $0, to: day) } ?? 0
                let landing = morph?.opening == false && morph?.day == day
                monthCell(day)
                    .scaleEffect(hidden && anchor != day && !reducedMotion ? 0.86 : 1)
                    .opacity(hidden ? 0 : 1)
                    .animation(animation(anchor == day ? nil : .easeOut(duration: 0.32).delay((hidden ? 0 : 0.14) + delay)), value: hidden)
                    .opacity(landing ? 0 : 1)
                    .doodlePlaced(rect)
            }
        }
    }

    @ViewBuilder
    private func monthCell(_ day: Int) -> some View {
        if day > today {
            Circle()
                .strokeBorder(DoodleColor.ink.opacity(0.86), lineWidth: 1)
                .accessibilityLabel("August \(day), still to come")
        } else {
            let data = entry(for: day)
            let isToday = day == today
            let dimmed = !matches(day, topic: filter)
            Button {
                touch()
                open(day)
            } label: {
                ZStack {
                    if isToday || data.art == nil {
                        Circle().strokeBorder(isToday ? DoodleColor.blue : DoodleColor.ink, lineWidth: 1)
                    }
                    if let art = data.art {
                        DoodleArtwork(art: art, thumbnail: true, blue: isToday)
                            .padding(isToday ? 3 : 0)
                    } else {
                        DoodleGlyph(data.note.trimmed.isEmpty ? .plus : .pencil, size: 14, lineWidth: 1.3)
                            .foregroundStyle(isToday ? DoodleColor.blue : DoodleColor.ink)
                    }
                }
                .frame(width: DoodleLayout.cell, height: DoodleLayout.cell)
                .contentShape(Circle())
            }
            .buttonStyle(DoodlePressStyle(reducedMotion: reducedMotion))
            .disabled(dimmed)
            .opacity(dimmed ? 0.2 : 1)
            .accessibilityLabel("\(DoodleLayout.weekday(day)), August \(day), \(data.art?.title ?? DoodleScene.all[day - 1].title)")
        }
    }

    private func pageStrip(_ activeDay: Int) -> some View {
        ZStack {
            ForEach(1...today, id: \.self) { day in
                let isActive = day == activeDay
                let offset = CGFloat(day - activeDay) * DoodleLayout.travel + drag
                let progress = offset / DoodleLayout.travel
                let flying = morph?.opening == true
                if abs(day - activeDay) <= 2 {
                    diaryPage(day, active: isActive, flying: flying, progress: progress)
                        .scaleEffect(reducedMotion || flying ? 1 : 1 - 0.05 * min(1, abs(progress)))
                        .doodlePlaced(x: DoodleLayout.card.minX + offset, y: DoodleLayout.card.minY, width: DoodleLayout.card.width, height: DoodleLayout.card.height)
                        .opacity(flying && !isActive ? 0 : 1)
                        .allowsHitTesting(isActive)
                        .accessibilityHidden(!isActive || filterOpen)
                }
            }
        }
    }

    private func diaryPage(_ day: Int, active: Bool, flying: Bool, progress: CGFloat) -> some View {
        let data = entry(for: day)
        let textVisible = !active || !flying || cardTextVisible
        let generating = active && sketchPhase == .glow
        let showingSketch = active && sketchPhase == .reveal
        let parallax = reducedMotion ? 0 : max(-1.5, min(1.5, progress))
        return ZStack {
            active && flying ? Color.clear : Color.white

            if generating || showingSketch {
                DoodleSketchGlow(reducedMotion: reducedMotion)
                    .opacity(showingSketch ? 0 : 1)
                    .animation(.easeInOut(duration: showingSketch ? 0.8 : 0.5), value: showingSketch)
            }

            VStack(alignment: .leading, spacing: 2) {
                DoodleInkLine(DoodleLayout.weekday(day), size: 40, leading: 12, tracking: -0.16)
                    .frame(height: 42)
                DoodleInkLine(String(day), size: 40, leading: 12, tracking: -0.16, ink: day == today ? DoodleColor.blue : DoodleColor.ink)
                    .frame(height: 42)
            }
            .doodlePlaced(x: -10 * parallax, y: 12, width: 244, height: 86, alignment: .topLeading)
            .opacity(textVisible ? 1 : 0)
            .offset(y: textVisible ? 0 : 6)
            .accessibilityAddTraits(.isHeader)

            if active && textVisible {
                Button {
                    touch()
                    close()
                } label: {
                    Color.clear.contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .doodlePlaced(x: 12, y: 12, width: 174, height: 86)
                .accessibilityLabel("Back to August 2026 month view")
                .keyboardShortcut(.escape, modifiers: [])
            }

            Group {
                if let art = data.art, !generating {
                    DoodleSketchReveal(art: art, blue: day == today, active: showingSketch, reducedMotion: reducedMotion)
                        .frame(width: 192, height: 192)
                } else {
                    DoodleNotebook(animated: active && !flying && !reducedMotion)
                        .frame(width: 176, height: 142)
                        .accessibilityLabel("An open notebook with a pencil writing on the page")
                }
            }
            .doodlePlaced(x: -22 * parallax, y: 100, width: 244, height: 192)
            .opacity(active && flying ? 0 : active && composing ? 0.28 : 1)
            .animation(animation(.easeOut(duration: 0.45)), value: composing)

            DoodleInkLine(data.art?.title ?? DoodleScene.blankTitle, size: 25, medium: true, leading: 12)
                .doodlePlaced(x: 0, y: 308, width: 244, height: 28)
                .opacity(textVisible ? 1 : 0)
                .offset(y: textVisible ? 0 : 6)
                .accessibilityAddTraits(.isHeader)

            VStack(alignment: .leading, spacing: 4) {
                if active && composing && demoEntry == nil {
                    ZStack {
                        if data.note.isEmpty { DoodleNote(text: "") }
                        DoodleTextEditor(text: Binding(
                            get: { entry(for: day).note },
                            set: { updateNote($0, day: day) }
                        ), onCancel: stopWriting, onSketch: { startSketch(day) })
                        .accessibilityLabel("Write about this day")
                    }
                    .frame(height: 85)
                } else {
                    Button {
                        if active && sketchPhase == .idle { startWriting() }
                    } label: {
                        DoodleNote(text: data.note)
                            .frame(height: sketchErrorDay == day ? 62 : 85)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .disabled(!active || sketchPhase != .idle)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Write about this day")
                    .accessibilityValue(data.note)
                }

                if sketchErrorDay == day {
                    Text("Couldn’t create the sketch. Please try again.")
                        .font(DoodleFont.hand(14))
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .doodlePlaced(x: 12, y: 344, width: 220, height: 108, alignment: .topLeading)
            .opacity(textVisible ? 1 : 0)
            .offset(y: textVisible ? 0 : 6)
        }
        .frame(width: 244, height: 460)
        .clipShape(RoundedRectangle(cornerRadius: 34, style: .circular))
        .contentShape(RoundedRectangle(cornerRadius: 34, style: .circular))
        .gesture(pageDrag(active: active, day: day), including: active && !composing && sketchPhase == .idle && morph == nil ? .all : .none)
        .accessibilityElement(children: .contain)
    }

    private func pageControls(_ day: Int) -> some View {
        ZStack {
            DoodleNavigationShape().fill(.white)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            iconButton(.previous, label: "Previous completed date", stroke: 1.6) {
                navigate(to: day - 1)
            }
            .disabled(day == 1)
            .opacity(day == 1 ? 0.28 : 1)
            .keyboardShortcut(.leftArrow, modifiers: [])
            .doodlePlaced(x: 0, y: 0, width: 44, height: 44)

            iconButton(.pencil, label: "Write a note", width: 88, size: 20, stroke: 1.4, fill: .clear) {
                startWriting()
            }
            .doodlePlaced(x: 52, y: 0, width: 88, height: 44)

            iconButton(.next, label: "Next completed date", stroke: 1.6) {
                navigate(to: day + 1)
            }
            .disabled(day == today)
            .opacity(day == today ? 0.28 : 1)
            .keyboardShortcut(.rightArrow, modifiers: [])
            .doodlePlaced(x: 148, y: 0, width: 44, height: 44)
        }
        .frame(width: 192, height: 44)
        .doodlePlaced(x: 54, y: 556, width: 192, height: 44)
        .opacity(morph?.opening == true && !cardTextVisible ? 0 : 1)
        .allowsHitTesting(morph == nil)
        .accessibilityHidden(morph != nil)
        .transition(reducedMotion ? .opacity : .opacity.combined(with: .offset(y: 8)))
    }

    private func writingControls(_ day: Int) -> some View {
        HStack(spacing: 8) {
            iconButton(.cancel, label: "Cancel writing", fill: .white) {
                touch()
                stopWriting()
            }
            Button {
                touch()
                startSketch(day)
            } label: {
                HStack(spacing: 6) {
                    Text("Sketch it").font(DoodleFont.hand(21))
                    DoodleGlyph(.submit, size: 16, lineWidth: 1.6)
                }
                .frame(width: 140, height: 44)
                .foregroundStyle(Color.white)
                .background(Color.black, in: Capsule())
            }
            .buttonStyle(DoodlePressStyle(reducedMotion: reducedMotion))
            .disabled(entry(for: day).note.trimmed.isEmpty)
            .scaleEffect(demoPressed ? 0.96 : 1)
            .accessibilityLabel(onGenerateImage == nil ? "Preview sketch (demo)" : "Generate sketch")
        }
        .doodlePlaced(x: 54, y: 556, width: 192, height: 44)
        .transition(reducedMotion ? .opacity : .opacity.combined(with: .offset(y: 8)))
    }

    private var filterPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            DoodleInkLine("Show moments", size: 24, leading: 0, tracking: -0.16)
                .frame(height: 28)
                .accessibilityAddTraits(.isHeader)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)], spacing: 6) {
                filterButton(nil)
                ForEach(DoodleTopic.allCases) { topic in
                    filterButton(topic)
                }
            }

            let count = (1...today).filter { matches($0, topic: filter) }.count
            DoodleInkLine("\(count) matching \(count == 1 ? "day" : "days")", size: 15, leading: 0, tracking: -0.16, ink: DoodleColor.ink.opacity(0.55))
                .frame(height: 18)
        }
        .padding(15)
        .frame(width: 256, height: 262, alignment: .topLeading)
        .background(.white, in: RoundedRectangle(cornerRadius: 22, style: .circular))
        .overlay { RoundedRectangle(cornerRadius: 22, style: .circular).strokeBorder(DoodleColor.filterBorder, lineWidth: 1) }
        .doodlePlaced(x: 22, y: 84, width: 256, height: 262)
        .transition(reducedMotion ? .opacity : .opacity.combined(with: .offset(y: -4)))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Filter diary topics")
    }

    private func filterButton(_ topic: DoodleTopic?) -> some View {
        let selected = filter == topic
        return Button {
            touch()
            filter = topic
            dismissFilter()
            close()
        } label: {
            HStack(spacing: 4) {
                DoodleInkLine(topic?.label ?? "All moments", size: 18, leading: 0, tracking: -0.16)
                    .frame(height: 22)
                if selected { DoodleGlyph(.check, size: 13, lineWidth: 1.6) }
            }
            .padding(.horizontal, 8)
            .frame(height: 38)
            .background(selected ? DoodleColor.paper : .clear, in: RoundedRectangle(cornerRadius: 12, style: .circular))
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .circular))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func iconButton(
        _ icon: DoodleIcon,
        label: String,
        width: CGFloat = 44,
        size: CGFloat = 18,
        stroke: CGFloat = 1.5,
        fill: Color = .clear,
        ink: Color = DoodleColor.ink,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            DoodleGlyph(icon, size: size, lineWidth: stroke)
                .foregroundStyle(ink)
                .frame(width: width, height: 44)
                .background(fill, in: Capsule())
                .contentShape(Capsule())
        }
        .buttonStyle(DoodlePressStyle(reducedMotion: reducedMotion))
        .accessibilityLabel(label)
    }

    private func dayDelay(from: Int, to: Int) -> Double {
        let a = DoodleLayout.cellRect(from).origin
        let b = DoodleLayout.cellRect(to).origin
        return hypot((a.x - b.x) / DoodleLayout.step, (a.y - b.y) / DoodleLayout.step) * 0.018
    }

    private func pageDrag(active: Bool, day: Int) -> some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                guard active, abs(value.translation.width) > abs(value.translation.height) else { return }
                touch()
                let x = value.translation.width
                let outside = (day == 1 && x > 0) || (day == today && x < 0)
                drag = outside ? x * (reducedMotion ? 0 : 0.16) : x
            }
            .onEnded { value in
                let projected = value.predictedEndTranslation.width
                let next = abs(projected) > DoodleLayout.card.width * 0.28 ? day + (projected < 0 ? 1 : -1) : day
                navigate(to: next)
            }
    }

    private func morphArtwork(_ motion: DoodleMorph) -> some View {
        let cell = DoodleLayout.cellRect(motion.day)
        let paper = expanded ? DoodleLayout.card : cell
        let art = entry(for: motion.day).art
        let thumbnailInset: CGFloat = motion.day == today && art != nil ? 3 : 0
        let illustration = expanded ? DoodleLayout.art : cell.insetBy(dx: thumbnailInset, dy: thumbnailInset)
        return ZStack {
            RoundedRectangle(cornerRadius: expanded ? 34 : DoodleLayout.cell / 2, style: .circular)
                .fill(.white)
                .opacity(morphPaperVisible ? 1 : 0)
                .doodlePlaced(paper)
            if let art {
                DoodleArtwork(art: art, thumbnail: false, blue: motion.day == today)
                    .doodlePlaced(illustration)
            }
        }
    }

    private func animateMorph() async {
        guard let motion = morph else { return }
        do {
            try await Task.sleep(for: .milliseconds(16))
            withAnimation(.spring(duration: 0.56, bounce: 0.1)) { expanded = motion.opening }
            if motion.opening {
                withAnimation(.linear(duration: 0.18)) { morphPaperVisible = true }
            }
            try await Task.sleep(for: .milliseconds(motion.opening ? 284 : 344))
            if motion.opening {
                withAnimation(.easeOut(duration: 0.22)) { cardTextVisible = true }
            } else {
                withAnimation(.linear(duration: 0.18)) { morphPaperVisible = false }
            }
            try await Task.sleep(for: .milliseconds(motion.opening ? 300 : 240))
            morph = nil
        } catch { return }
    }

    private func open(_ day: Int) {
        guard morph == nil, sketchPhase == .idle, (1...today).contains(day) else { return }
        if openDay == nil && !reducedMotion {
            expanded = false
            morphPaperVisible = false
            cardTextVisible = false
            morph = DoodleMorph(day: day, opening: true)
            openDay = day
        } else {
            withAnimation(animation(.interactiveSpring(response: 0.38, dampingFraction: 0.88))) {
                openDay = day
            }
        }
        onSelect?(DoodleScene.info(day))
    }

    private func close() {
        guard let day = openDay, morph == nil, sketchPhase == .idle else { return }
        stopWriting()
        if !reducedMotion {
            expanded = true
            morphPaperVisible = true
            morph = DoodleMorph(day: day, opening: false)
        }
        openDay = nil
        cardTextVisible = true
    }

    private func navigate(to day: Int) {
        touch()
        guard morph == nil, sketchPhase == .idle, !composing else { return }
        let next = min(today, max(1, day))
        let changed = openDay != next
        withAnimation(animation(.interactiveSpring(response: 0.38, dampingFraction: 0.88))) {
            drag = 0
            if changed { openDay = next }
        }
        if changed { onSelect?(DoodleScene.info(next)) }
    }

    private func dismissFilter() {
        withAnimation(animation(.easeOut(duration: 0.16))) { filterOpen = false }
    }

    private func startWriting() {
        touch()
        guard sketchPhase == .idle else { return }
        withAnimation(animation(.easeOut(duration: 0.22))) { composing = true }
    }

    private func stopWriting() {
        withAnimation(animation(.easeOut(duration: 0.22))) { composing = false }
    }

    private func updateNote(_ note: String, day: Int) {
        var data = entry(for: day)
        data.note = note
        diary.entries[day] = data
        if sketchErrorDay == day { sketchErrorDay = nil }
    }

    private func startSketch(_ day: Int) {
        guard sketchPhase == .idle, !entry(for: day).note.trimmed.isEmpty else { return }
        stopWriting()
        sketchErrorDay = nil
        sketchPhase = .glow
        sketchDay = day
    }

    private func sketchNote() async {
        guard let day = sketchDay else { return }
        let note = entry(for: day).note.trimmed
        defer {
            if !Task.isCancelled {
                sketchPhase = .idle
                sketchDay = nil
            }
        }
        do {
            async let minimum: Void = Task.sleep(for: .milliseconds(reducedMotion ? 300 : 4200))
            let art: DoodleArt?
            if let onGenerateImage {
                let url = try await generateWithTimeout(note: note, day: day, generator: onGenerateImage)
                _ = try await DoodleAssets.load(url)
                art = DoodleArt(title: DoodleScene.blankTitle, topic: nil, url: url)
            } else {
                art = DoodleTopic.art(for: note)
            }
            try await minimum
            try Task.checkCancellation()
            guard let art else { return }
            diary.entries[day]?.art = art
            sketchPhase = .reveal
            try await Task.sleep(for: .milliseconds(reducedMotion ? 200 : 2600))
        } catch is CancellationError {
            return
        } catch {
            sketchErrorDay = day
        }
    }

    private func generateWithTimeout(note: String, day: Int, generator: @escaping (String, Day) async throws -> URL) async throws -> URL {
        try await withThrowingTaskGroup(of: URL.self) { group in
            group.addTask { try await generator(note, DoodleScene.info(day)) }
            group.addTask {
                try await Task.sleep(for: .seconds(8))
                throw URLError(.timedOut)
            }
            defer { group.cancelAll() }
            guard let url = try await group.next() else { throw URLError(.badServerResponse) }
            return url
        }
    }

    private func entry(for day: Int) -> DoodleEntry {
        if day == today, let demoEntry { return demoEntry }
        return diary.entries[day] ?? DoodleEntry(note: "", art: nil)
    }

    private func matches(_ day: Int, topic: DoodleTopic?) -> Bool {
        topic?.matches(entry(for: day).note) ?? true
    }

    private func touch() {
        interacted = true
        guard demoEntry != nil else { return }
        demoEntry = nil
        demoPressed = false
        composing = false
        sketchPhase = .idle
    }

    private func playDemo() async {
        let timing = DoodleDemo(persist: persist)
        let note = timing.note
        do {
            try await Task.sleep(for: .milliseconds(timing.start))
            while !Task.isCancelled {
                demoEntry = DoodleEntry(note: "", art: nil)
                if !persist {
                    let monday = today - (today + 4) % 7
                    if monday >= 1 && monday < today {
                        for day in monday..<today {
                            open(day)
                            try await Task.sleep(for: .milliseconds(2600))
                        }
                    }
                }
                open(today)
                try await Task.sleep(for: .milliseconds(timing.open))
                composing = true
                try await Task.sleep(for: .milliseconds(timing.write))
                for index in 1...note.count {
                    demoEntry?.note = String(note.prefix(index))
                    try await Task.sleep(for: .milliseconds(timing.key))
                }
                try await Task.sleep(for: .milliseconds(timing.submit))
                withAnimation(.easeOut(duration: 0.15)) { demoPressed = true }
                try await Task.sleep(for: .milliseconds(timing.press))
                demoPressed = false
                composing = false
                sketchPhase = .glow
                try await Task.sleep(for: .milliseconds(4200))
                demoEntry?.art = DoodleTopic.art(for: note)
                sketchPhase = .reveal
                try await Task.sleep(for: .milliseconds(2600))
                sketchPhase = .idle
                try await Task.sleep(for: .milliseconds(timing.hold))
                close()
                try await Task.sleep(for: .milliseconds(timing.close))
                demoEntry = nil
                try await Task.sleep(for: .milliseconds(timing.pause))
            }
        } catch { return }
    }

    private func animation(_ animation: Animation?) -> Animation? {
        reducedMotion ? nil : animation
    }
}

private enum DoodleLayout {
    static let width: CGFloat = 300
    static let height: CGFloat = 618
    static let radius: CGFloat = 51
    static let padding: CGFloat = 22
    static let cell: CGFloat = (width - padding * 2 - 18) / 7
    static let step = cell + 3
    static let gridTop = height - 36 - 28 - 6 * cell - 15
    static let travel: CGFloat = 258
    static let card = CGRect(x: 28, y: 88, width: 244, height: 460)
    static let art = CGRect(x: 54, y: 188, width: 192, height: 192)
    static let weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    static func weekday(_ day: Int) -> String { weekdays[(day + 4) % 7] }

    static func cellRect(_ day: Int) -> CGRect {
        let index = day + 4
        return CGRect(
            x: padding + CGFloat(index % 7) * step,
            y: gridTop + 28 + CGFloat(index / 7) * step,
            width: cell,
            height: cell
        )
    }
}

private enum DoodleColor {
    static let ink = Color(red: 36.0 / 255, green: 36.0 / 255, blue: 36.0 / 255)
    static let blue = Color(red: 0, green: 65.0 / 255, blue: 1)
    static let paper = Color(white: 240.0 / 255)
    static let frame = Color(white: 190.0 / 255)
    static let filterBorder = Color(white: 212.0 / 255)
}

private enum DoodleFont {
    static func hand(_ size: CGFloat, medium: Bool = false) -> Font {
        if let name = names[medium], let font = UIFont(name: name, size: size) {
            return Font(font)
        }
        return .system(size: size, weight: medium ? .medium : .regular, design: .serif)
    }

    static func ui(_ size: CGFloat, medium: Bool = false) -> UIFont {
        names[medium].flatMap { UIFont(name: $0, size: size) } ?? .systemFont(ofSize: size, weight: medium ? .medium : .regular)
    }

    private static let names: [Bool: String] = {
        var registered: [Bool: String] = [:]
        for (medium, weight) in [(false, "Regular"), (true, "Medium")] {
            guard let url = DoodleAssets.resource("Caveat-\(weight)", extension: "ttf"),
                  let provider = CGDataProvider(url: url as CFURL),
                  let font = CGFont(provider),
                  let name = font.postScriptName else { continue }
            CTFontManagerRegisterGraphicsFont(font, nil)
            registered[medium] = name as String
        }
        return registered
    }()
}

private struct DoodleMorph: Equatable {
    let day: Int
    let opening: Bool
}

/// Caveat's ink overhangs its typographic box, especially at a line's end.
/// Lay it into the full line box so the final stroke never gets clipped.
private struct DoodleInkLine: View {
    let text: String
    let size: CGFloat
    let medium: Bool
    let leading: CGFloat?
    let tracking: CGFloat
    let ink: Color

    init(_ text: String, size: CGFloat, medium: Bool = false, leading: CGFloat? = nil, tracking: CGFloat = 0, ink: Color = DoodleColor.ink) {
        self.text = text
        self.size = size
        self.medium = medium
        self.leading = leading
        self.tracking = tracking
        self.ink = ink
    }

    var body: some View {
        GeometryReader { lineBox in
            let overhang: CGFloat = 8
            Canvas { context, _ in
                let font = DoodleFont.ui(size, medium: medium)
                let text = NSAttributedString(string: text, attributes: [
                    .font: font,
                    .kern: tracking,
                    .foregroundColor: UIColor(ink),
                ])
                let line = CTLineCreateWithAttributedString(text)
                let width = CTLineGetTypographicBounds(line, nil, nil, nil)
                let x = leading ?? (lineBox.size.width - width) / 2
                let baseline = (lineBox.size.height + font.ascender + font.descender) / 2
                context.withCGContext { cg in
                    cg.textMatrix = CGAffineTransform(scaleX: 1, y: -1)
                    cg.textPosition = CGPoint(x: x + overhang, y: baseline + overhang)
                    CTLineDraw(line, cg)
                }
            }
            .frame(width: lineBox.size.width + overhang * 2, height: lineBox.size.height + overhang * 2)
            .position(x: lineBox.size.width / 2, y: lineBox.size.height / 2)
        }
        .accessibilityLabel(text)
        .accessibilityAddTraits(.isStaticText)
    }
}

private enum DoodleSketch {
    case idle, glow, reveal
}

private struct DoodleDemo {
    let persist: Bool

    var note: String { persist ? "It rained today. I walked home under my umbrella." : "Packed a bento for lunch before a busy afternoon at work." }
    var start: Int { persist ? 900 : 1400 }
    var open: Int { persist ? 1300 : 2600 }
    var write: Int { persist ? 450 : 650 }
    var key: Int { persist ? 48 : 70 }
    var submit: Int { persist ? 650 : 1100 }
    var press: Int { persist ? 180 : 250 }
    var hold: Int { persist ? 3800 : 5500 }
    var close: Int { persist ? 1300 : 1700 }
    var pause: Int { persist ? 700 : 1200 }
}

private struct DoodleEntry: Codable, Equatable {
    var note: String
    var art: DoodleArt?
}

private struct DoodleArt: Codable, Equatable {
    let title: String
    let topic: DoodleTopic?
    let url: URL?
}

private struct DoodleDiary: Codable, Equatable {
    var entries: [Int: DoodleEntry]
    private static let key = "atomicmotion-doodle-japan-diary-2026-08-v2"

    static let sample = DoodleDiary(entries: Dictionary(uniqueKeysWithValues: DoodleScene.all.prefix(12).enumerated().map { index, scene in
        (index + 1, DoodleEntry(note: scene.sentence, art: DoodleArt(title: scene.title, topic: scene.topic, url: nil)))
    }))

    static var saved: DoodleDiary {
        guard let data = UserDefaults.standard.data(forKey: key),
              let diary = try? JSONDecoder().decode(Self.self, from: data) else { return .sample }
        return diary
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: Self.key)
    }
}

private struct DoodleScene {
    let title: String
    let sentence: String
    let topic: DoodleTopic

    static let blankTitle = "Today’s Little Moment"

    static func info(_ day: Int) -> DoodleCalendar.Day {
        let scene = all[day - 1]
        return DoodleCalendar.Day(day: day, weekday: DoodleLayout.weekday(day), title: scene.title, sentence: scene.sentence)
    }

    static let all: [Self] = [
        .init(title: "Morning Coffee", sentence: "Stopped for a coffee at the little kissaten before work.", topic: .coffee),
        .init(title: "A Little Bento", sentence: "Packed a bento with rice, tamagoyaki and vegetables for lunch.", topic: .bento),
        .init(title: "Morning Movement", sentence: "Went for a short run, then stretched on the yoga mat.", topic: .exercise),
        .init(title: "The Train Home", sentence: "Took the local train home and watched the stations go by.", topic: .train),
        .init(title: "Rainy Afternoon", sentence: "Walked home under my umbrella after a sudden afternoon rain.", topic: .rain),
        .init(title: "Laundry Day", sentence: "Did the laundry and watered the little plant on the balcony.", topic: .home),
        .init(title: "A Quiet Walk", sentence: "Took a quiet walk past the neighborhood shrine after lunch.", topic: .shrine),
        .init(title: "Lunch Break", sentence: "A bento on the park bench made a simple lunch feel special.", topic: .bento),
        .init(title: "Slow Sunday", sentence: "Made coffee at home and let the morning go slowly.", topic: .coffee),
        .init(title: "After Work Stretch", sentence: "Unrolled the yoga mat for a little exercise after work.", topic: .exercise),
        .init(title: "An Umbrella Walk", sentence: "The rain made the familiar walk home feel a little different.", topic: .rain),
        .init(title: "Window Seat", sentence: "Found a window seat on the train and read a few pages.", topic: .train),
        .init(title: "Little Home Rituals", sentence: "Folded the laundry, watered the plant, and opened the balcony door.", topic: .home),
        .init(title: blankTitle, sentence: "Write about a small moment from your day.", topic: .coffee),
    ]
}

private enum DoodleTopic: String, Codable, CaseIterable, Identifiable {
    case coffee, bento, exercise, train, rain, home, shrine

    var id: Self { self }
    var label: String {
        switch self {
        case .coffee: "Coffee"
        case .bento: "Bento"
        case .exercise: "Movement"
        case .train: "Train rides"
        case .rain: "Rainy days"
        case .home: "Home rituals"
        case .shrine: "Walks"
        }
    }

    private var title: String {
        switch self {
        case .coffee: "A Cup of Coffee"
        case .bento: "A Little Bento"
        case .exercise: "A Little Movement"
        case .train: "The Train Home"
        case .rain: "A Rainy Day"
        case .home: "Little Home Rituals"
        case .shrine: "A Quiet Walk"
        }
    }

    private var pattern: String {
        switch self {
        case .coffee: "cof{1,2}e{1,2}|café|cafe|latte|espresso|kissaten|コーヒー|咖啡"
        case .bento: "bento|lunch|rice|tamagoyaki|弁当|便当|午饭|午餐"
        case .exercise: "run|jog|exercise|gym|yoga|stretch|workout|运动|跑步|瑜伽|锻炼"
        case .train: "train|commut|station|電車|电车|通勤|地铁"
        case .rain: "rain|umbrella|drizzle|雨|伞"
        case .home: "laundry|balcony|plant|watered|chores|家务|洗衣|阳台|浇花"
        case .shrine: "walk|shrine|temple|散步|神社|寺庙"
        }
    }

    func matches(_ note: String) -> Bool {
        note.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
    }

    static func art(for note: String) -> DoodleArt? {
        allCases.first { $0.matches(note) }.map { DoodleArt(title: $0.title, topic: $0, url: nil) }
    }
}

private extension String {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}

private extension View {
    func doodlePlaced(_ rect: CGRect, alignment: Alignment = .center) -> some View {
        doodlePlaced(x: rect.minX, y: rect.minY, width: rect.width, height: rect.height, alignment: alignment)
    }

    func doodlePlaced(x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, alignment: Alignment = .center) -> some View {
        frame(width: width, height: height, alignment: alignment)
            .position(x: x + width / 2, y: y + height / 2)
    }
}

private enum DoodleAssets {
    private static let images: NSCache<NSURL, UIImage> = {
        let cache = NSCache<NSURL, UIImage>()
        cache.totalCostLimit = 36 * 1024 * 1024
        return cache
    }()

    static func resource(_ name: String, extension suffix: String) -> URL? {
        Bundle.module.url(forResource: name, withExtension: suffix, subdirectory: "DoodleCalendar")
    }

    static func illustration(_ topic: DoodleTopic, thumbnail: Bool) -> UIImage? {
        let name = topic.rawValue + (thumbnail ? "-thumb" : "")
        guard let url = resource(name, extension: "webp") else { return nil }
        if let cached = images.object(forKey: url as NSURL) { return cached }
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }
        let result = UIImage(cgImage: image)
        images.setObject(result, forKey: url as NSURL, cost: image.bytesPerRow * image.height)
        return result
    }

    static func load(_ url: URL) async throws -> UIImage {
        if let cached = images.object(forKey: url as NSURL) { return cached }
        let data: Data
        switch url.scheme {
        case "file", "data":
            data = try Data(contentsOf: url)
        case "https", "http":
            let (bytes, response) = try await URLSession.shared.data(for: URLRequest(url: url, timeoutInterval: 3))
            if let response = response as? HTTPURLResponse, !(200..<300).contains(response.statusCode) {
                throw URLError(.badServerResponse)
            }
            data = bytes
        default:
            throw URLError(.unsupportedURL)
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 960,
        ]
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            throw URLError(.cannotDecodeContentData)
        }
        let result = UIImage(cgImage: image)
        images.setObject(result, forKey: url as NSURL, cost: image.bytesPerRow * image.height)
        return result
    }
}

private struct DoodleArtwork: View {
    let art: DoodleArt
    var thumbnail = false
    var blue = false
    @State private var generated: UIImage?

    var body: some View {
        let image = art.topic.flatMap { DoodleAssets.illustration($0, thumbnail: thumbnail) } ?? generated
        Group {
            if let image {
                if blue {
                    Image(uiImage: image).renderingMode(.template).resizable().scaledToFit()
                        .foregroundStyle(DoodleColor.blue)
                } else {
                    Image(uiImage: image).resizable().scaledToFit()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task(id: art.url) {
            generated = nil
            if let url = art.url, let loaded = try? await DoodleAssets.load(url), !Task.isCancelled {
                generated = loaded
            }
        }
        .accessibilityLabel("Diary illustration: \(art.title)")
        .accessibilityHidden(thumbnail)
        .allowsHitTesting(false)
    }
}

private struct DoodleNote: View {
    let text: String

    var body: some View {
        DoodleTextEditor(text: .constant(text))
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }
}

private struct DoodleTextEditor: UIViewRepresentable {
    @Binding var text: String
    var onCancel: (() -> Void)?
    var onSketch: (() -> Void)?

    private var editable: Bool { onCancel != nil }
    private let placeholder = "A coffee, a bento, a little exercise… what made today yours?"

    func makeUIView(context: Context) -> DoodleUITextView {
        let view = DoodleUITextView()
        view.delegate = context.coordinator
        view.font = DoodleFont.ui(19)
        view.textColor = UIColor(white: 36.0 / 255, alpha: 1)
        view.textContainerInset = UIEdgeInsets(top: 4, left: 0, bottom: 8, right: 0)
        view.textContainer.lineFragmentPadding = 0
        view.tintColor = UIColor(red: 0, green: 65.0 / 255, blue: 1, alpha: 1)
        view.backgroundColor = .clear
        view.showsVerticalScrollIndicator = false
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        view.isEditable = editable
        view.isSelectable = editable
        view.isUserInteractionEnabled = editable
        view.isAccessibilityElement = editable
        if editable { view.accessibilityLabel = "Write about this day" }
        if editable {
            DispatchQueue.main.async { [weak view] in
                guard let view, view.window != nil else { return }
                view.becomeFirstResponder()
                view.selectedRange = NSRange(location: view.text.utf16.count, length: 0)
            }
        }
        return view
    }

    func updateUIView(_ view: DoodleUITextView, context: Context) {
        context.coordinator.parent = self
        view.onCancel = onCancel
        view.onSketch = onSketch
        if editable {
            if view.text != text { view.attributedText = formatted(text, placeholder: false) }
            view.typingAttributes = attributes(placeholder: false)
        } else {
            let content = text.isEmpty ? placeholder : text
            if view.text != content { view.attributedText = formatted(content, placeholder: text.isEmpty) }
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    private func formatted(_ value: String, placeholder: Bool) -> NSAttributedString {
        NSAttributedString(string: value, attributes: attributes(placeholder: placeholder))
    }

    private func attributes(placeholder: Bool) -> [NSAttributedString.Key: Any] {
        let paragraph = NSMutableParagraphStyle()
        paragraph.minimumLineHeight = 23
        paragraph.maximumLineHeight = 23
        paragraph.lineBreakMode = .byWordWrapping
        return [
            .font: DoodleFont.ui(19),
            .kern: -0.16,
            .foregroundColor: UIColor(white: 36.0 / 255, alpha: placeholder ? 0.42 : 1),
            .paragraphStyle: paragraph,
        ]
    }

    class Coordinator: NSObject, UITextViewDelegate {
        var parent: DoodleTextEditor

        init(parent: DoodleTextEditor) { self.parent = parent }

        func textViewDidChange(_ textView: UITextView) { parent.text = textView.text }
    }
}

private final class DoodleUITextView: UITextView {
    var onCancel: (() -> Void)?
    var onSketch: (() -> Void)?

    override var keyCommands: [UIKeyCommand]? {
        guard isEditable else { return super.keyCommands }
        return [
            UIKeyCommand(input: UIKeyCommand.inputEscape, modifierFlags: [], action: #selector(cancel)),
            UIKeyCommand(input: "\r", modifierFlags: .command, action: #selector(sketch)),
            UIKeyCommand(input: "\r", modifierFlags: .control, action: #selector(sketch)),
        ]
    }

    @objc private func cancel() { onCancel?() }
    @objc private func sketch() { onSketch?() }
}

private struct DoodlePressStyle: ButtonStyle {
    let reducedMotion: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reducedMotion ? 0.94 : 1)
            .animation(reducedMotion ? nil : .easeOut(duration: 0.14), value: configuration.isPressed)
    }
}

private enum DoodleIcon {
    case home, filter, previous, next, pencil, plus, cancel, submit, check
}

private struct DoodleGlyph: View {
    let icon: DoodleIcon
    let size: CGFloat
    let lineWidth: CGFloat

    init(_ icon: DoodleIcon, size: CGFloat, lineWidth: CGFloat) {
        self.icon = icon
        self.size = size
        self.lineWidth = lineWidth
    }

    var body: some View {
        DoodleIconShape(icon: icon)
            .stroke(style: StrokeStyle(lineWidth: lineWidth * size / 24, lineCap: .round, lineJoin: .round))
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

private struct DoodleIconShape: Shape {
    let icon: DoodleIcon

    func path(in rect: CGRect) -> Path {
        var path = Path()
        switch icon {
        case .home:
            path.move(to: CGPoint(x: 15, y: 21))
            path.addLine(to: CGPoint(x: 15, y: 13))
            path.addQuadCurve(to: CGPoint(x: 14, y: 12), control: CGPoint(x: 15, y: 12))
            path.addLine(to: CGPoint(x: 10, y: 12))
            path.addQuadCurve(to: CGPoint(x: 9, y: 13), control: CGPoint(x: 9, y: 12))
            path.addLine(to: CGPoint(x: 9, y: 21))
            path.move(to: CGPoint(x: 3, y: 10))
            path.addQuadCurve(to: CGPoint(x: 3.71, y: 8.47), control: CGPoint(x: 3, y: 9.1))
            path.addLine(to: CGPoint(x: 10.71, y: 2.47))
            path.addQuadCurve(to: CGPoint(x: 13.29, y: 2.47), control: CGPoint(x: 12, y: 1.4))
            path.addLine(to: CGPoint(x: 20.29, y: 8.47))
            path.addQuadCurve(to: CGPoint(x: 21, y: 10), control: CGPoint(x: 21, y: 9.1))
            path.addLine(to: CGPoint(x: 21, y: 19))
            path.addQuadCurve(to: CGPoint(x: 19, y: 21), control: CGPoint(x: 21, y: 21))
            path.addLine(to: CGPoint(x: 5, y: 21))
            path.addQuadCurve(to: CGPoint(x: 3, y: 19), control: CGPoint(x: 3, y: 21))
            path.closeSubpath()
        case .filter:
            for (x1, y1, x2, y2) in [(10,5,3,5), (12,19,3,19), (14,3,14,7), (16,17,16,21), (21,12,12,12), (21,19,16,19), (21,5,14,5), (8,10,8,14), (8,12,3,12)] {
                path.addLines([CGPoint(x: x1, y: y1), CGPoint(x: x2, y: y2)])
            }
        case .previous:
            path.addLines([CGPoint(x: 15, y: 18), CGPoint(x: 9, y: 12), CGPoint(x: 15, y: 6)])
        case .next:
            path.addLines([CGPoint(x: 9, y: 18), CGPoint(x: 15, y: 12), CGPoint(x: 9, y: 6)])
        case .pencil:
            path.addLines([CGPoint(x: 13, y: 21), CGPoint(x: 21, y: 21)])
            path.move(to: CGPoint(x: 21.174, y: 6.812))
            path.addCurve(to: CGPoint(x: 17.188, y: 2.825), control1: CGPoint(x: 23.8, y: 4.15), control2: CGPoint(x: 19.85, y: 0.2))
            path.addLine(to: CGPoint(x: 3.842, y: 16.174))
            path.addQuadCurve(to: CGPoint(x: 3.342, y: 17.004), control: CGPoint(x: 3.5, y: 16.5))
            path.addLine(to: CGPoint(x: 2.021, y: 21.356))
            path.addQuadCurve(to: CGPoint(x: 2.644, y: 21.978), control: CGPoint(x: 1.8, y: 22.2))
            path.addLine(to: CGPoint(x: 6.997, y: 20.658))
            path.addQuadCurve(to: CGPoint(x: 7.827, y: 20.161), control: CGPoint(x: 7.52, y: 20.5))
            path.closeSubpath()
        case .plus:
            path.addLines([CGPoint(x: 5, y: 12), CGPoint(x: 19, y: 12)])
            path.addLines([CGPoint(x: 12, y: 5), CGPoint(x: 12, y: 19)])
        case .cancel:
            path.addLines([CGPoint(x: 18, y: 6), CGPoint(x: 6, y: 18)])
            path.addLines([CGPoint(x: 6, y: 6), CGPoint(x: 18, y: 18)])
        case .submit:
            path.addLines([CGPoint(x: 5, y: 12), CGPoint(x: 12, y: 5), CGPoint(x: 19, y: 12)])
            path.addLines([CGPoint(x: 12, y: 19), CGPoint(x: 12, y: 5)])
        case .check:
            path.addLines([CGPoint(x: 20, y: 6), CGPoint(x: 9, y: 17), CGPoint(x: 5, y: 13)])
        }
        return path.applying(CGAffineTransform(scaleX: rect.width / 24, y: rect.height / 24))
    }
}

private struct DoodleNavigationShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 22, y: 0))
        path.addCurve(to: CGPoint(x: 40, y: 11), control1: CGPoint(x: 30, y: 0), control2: CGPoint(x: 36, y: 5))
        path.addCurve(to: CGPoint(x: 52, y: 11), control1: CGPoint(x: 44, y: 18), control2: CGPoint(x: 48, y: 18))
        path.addCurve(to: CGPoint(x: 74, y: 0), control1: CGPoint(x: 56, y: 4), control2: CGPoint(x: 64, y: 0))
        path.addLine(to: CGPoint(x: 118, y: 0))
        path.addCurve(to: CGPoint(x: 140, y: 11), control1: CGPoint(x: 128, y: 0), control2: CGPoint(x: 136, y: 4))
        path.addCurve(to: CGPoint(x: 152, y: 11), control1: CGPoint(x: 144, y: 18), control2: CGPoint(x: 148, y: 18))
        path.addCurve(to: CGPoint(x: 170, y: 0), control1: CGPoint(x: 156, y: 4), control2: CGPoint(x: 162, y: 0))
        path.addRelativeArc(center: CGPoint(x: 170, y: 22), radius: 22, startAngle: .degrees(-90), delta: .degrees(180))
        path.addCurve(to: CGPoint(x: 152, y: 33), control1: CGPoint(x: 162, y: 44), control2: CGPoint(x: 156, y: 40))
        path.addCurve(to: CGPoint(x: 140, y: 33), control1: CGPoint(x: 148, y: 26), control2: CGPoint(x: 144, y: 26))
        path.addCurve(to: CGPoint(x: 118, y: 44), control1: CGPoint(x: 136, y: 40), control2: CGPoint(x: 128, y: 44))
        path.addLine(to: CGPoint(x: 74, y: 44))
        path.addCurve(to: CGPoint(x: 52, y: 33), control1: CGPoint(x: 64, y: 44), control2: CGPoint(x: 56, y: 40))
        path.addCurve(to: CGPoint(x: 40, y: 33), control1: CGPoint(x: 48, y: 26), control2: CGPoint(x: 44, y: 26))
        path.addCurve(to: CGPoint(x: 22, y: 44), control1: CGPoint(x: 36, y: 40), control2: CGPoint(x: 30, y: 44))
        path.addRelativeArc(center: CGPoint(x: 22, y: 22), radius: 22, startAngle: .degrees(90), delta: .degrees(180))
        path.closeSubpath()
        return path.applying(CGAffineTransform(scaleX: rect.width / 192, y: rect.height / 44))
    }
}

private struct DoodleNotebook: View {
    let animated: Bool
    @State private var start = Date()

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !animated)) { timeline in
            let elapsed = max(0, timeline.date.timeIntervalSince(start)).truncatingRemainder(dividingBy: 3.6) / 3.6
            let drawn = animated ? min(elapsed / 0.64, 1) : 1
            let progress = animated ? (elapsed < 0.82 ? drawn : max(0, (1 - elapsed) / 0.18)) : 0
            let penY = elapsed >= 0.64 ? -8 * min((elapsed - 0.64) / 0.18, (1 - elapsed) / 0.18) : sin(elapsed * 14 * .pi) * 0.9
            Canvas { context, _ in
                let ink = DoodleColor.ink.opacity(0.46)
                let stroke = StrokeStyle(lineWidth: 1.2, lineCap: .round, lineJoin: .round)
                context.stroke(Self.pages, with: .color(ink), style: stroke)
                context.stroke(Self.spine, with: .color(ink.opacity(0.65)), style: stroke)
                context.stroke(Self.rules, with: .color(ink.opacity(0.38)), style: stroke)
                context.stroke(Self.writing.trimmedPath(from: 0, to: drawn), with: .color(ink.opacity(animated ? max(0, min(1, (0.82 - elapsed) / 0.18)) : 1)), style: stroke)
                let pen = Self.pencil.applying(CGAffineTransform(translationX: 24 * progress, y: animated ? penY : 0))
                context.stroke(pen, with: .color(ink), style: stroke)
            }
        }
    }

    private static let pages = Path { path in
        path.move(to: CGPoint(x: 24, y: 43))
        path.addQuadCurve(to: CGPoint(x: 87, y: 44), control: CGPoint(x: 55, y: 34))
        path.addQuadCurve(to: CGPoint(x: 150, y: 43), control: CGPoint(x: 117, y: 34))
        path.addLine(to: CGPoint(x: 155, y: 108))
        path.addQuadCurve(to: CGPoint(x: 87, y: 111), control: CGPoint(x: 120, y: 100))
        path.addQuadCurve(to: CGPoint(x: 19, y: 108), control: CGPoint(x: 55, y: 100))
        path.closeSubpath()
    }

    private static let spine = Path { path in
        path.move(to: CGPoint(x: 87, y: 44))
        path.addQuadCurve(to: CGPoint(x: 87, y: 111), control: CGPoint(x: 84, y: 76))
        path.addLines([CGPoint(x: 24, y: 47), CGPoint(x: 16, y: 112)])
        path.addQuadCurve(to: CGPoint(x: 87, y: 115), control: CGPoint(x: 53, y: 105))
        path.addQuadCurve(to: CGPoint(x: 158, y: 112), control: CGPoint(x: 120, y: 105))
        path.addLine(to: CGPoint(x: 150, y: 47))
        path.addLines([CGPoint(x: 87, y: 111), CGPoint(x: 87, y: 115)])
    }

    private static let rules = Path { path in
        for (x, y, controlX, endX, endY) in [(35,59,54,73,59), (33,70,54,73,71), (32,82,51,72,83), (31,94,51,71,95), (99,82,116,137,82), (99,94,117,139,94)] {
            path.move(to: CGPoint(x: x, y: y))
            path.addQuadCurve(to: CGPoint(x: endX, y: endY), control: CGPoint(x: controlX, y: y - 4))
        }
    }

    private static let writing = Path { path in
        path.move(to: CGPoint(x: 99, y: 67))
        path.addQuadCurve(to: CGPoint(x: 103, y: 66), control: CGPoint(x: 101, y: 63))
        path.addQuadCurve(to: CGPoint(x: 107, y: 66), control: CGPoint(x: 105, y: 69))
        path.addQuadCurve(to: CGPoint(x: 111, y: 65), control: CGPoint(x: 109, y: 63))
        path.addQuadCurve(to: CGPoint(x: 115, y: 66), control: CGPoint(x: 113, y: 67))
        path.addQuadCurve(to: CGPoint(x: 119, y: 66), control: CGPoint(x: 117, y: 65))
        path.addQuadCurve(to: CGPoint(x: 123, y: 66), control: CGPoint(x: 121, y: 67))
    }

    private static let pencil = Path { path in
        path.addLines([CGPoint(x: 99, y: 67), CGPoint(x: 103, y: 56), CGPoint(x: 127, y: 24)])
        path.addQuadCurve(to: CGPoint(x: 132, y: 23), control: CGPoint(x: 129, y: 21))
        path.addLine(to: CGPoint(x: 135, y: 25))
        path.addQuadCurve(to: CGPoint(x: 135, y: 30), control: CGPoint(x: 138, y: 27))
        path.addLine(to: CGPoint(x: 110, y: 62))
        path.closeSubpath()
        path.addLines([CGPoint(x: 103, y: 56), CGPoint(x: 110, y: 62)])
        path.addLines([CGPoint(x: 106, y: 59), CGPoint(x: 131, y: 26)])
        path.addLines([CGPoint(x: 126, y: 26), CGPoint(x: 133, y: 32)])
        path.addLines([CGPoint(x: 99, y: 67), CGPoint(x: 102, y: 64)])
    }
}

private struct DoodleSketchGlow: View {
    let reducedMotion: Bool
    @State private var start = Date()

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reducedMotion)) { timeline in
            let elapsed = max(0, timeline.date.timeIntervalSince(start))
            let angle = reducedMotion ? 0 : elapsed.truncatingRemainder(dividingBy: 6.4) / 6.4 * 360
            RoundedRectangle(cornerRadius: 34, style: .circular)
                .strokeBorder(Self.gradient(angle: angle), lineWidth: 14)
                .blur(radius: 10)
                .opacity(reducedMotion ? 0.9 : 0.95 + sin(elapsed / 5.8 * 2 * .pi) * 0.05)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    static func gradient(angle: Double) -> AngularGradient {
        AngularGradient(stops: [
            .init(color: Color(red: 159.0 / 255, green: 125.0 / 255, blue: 175.0 / 255).opacity(0.94), location: 0),
            .init(color: Color(red: 56.0 / 255, green: 123.0 / 255, blue: 213.0 / 255).opacity(0.96), location: 50.0 / 360),
            .init(color: Color(red: 195.0 / 255, green: 155.0 / 255, blue: 168.0 / 255).opacity(0.94), location: 110.0 / 360),
            .init(color: Color(red: 206.0 / 255, green: 170.0 / 255, blue: 152.0 / 255).opacity(0.92), location: 150.0 / 360),
            .init(color: Color(red: 224.0 / 255, green: 215.0 / 255, blue: 165.0 / 255).opacity(0.96), location: 0.5),
            .init(color: Color(red: 206.0 / 255, green: 170.0 / 255, blue: 152.0 / 255).opacity(0.92), location: 210.0 / 360),
            .init(color: Color(red: 195.0 / 255, green: 155.0 / 255, blue: 168.0 / 255).opacity(0.94), location: 250.0 / 360),
            .init(color: Color(red: 56.0 / 255, green: 123.0 / 255, blue: 213.0 / 255).opacity(0.96), location: 310.0 / 360),
            .init(color: Color(red: 159.0 / 255, green: 125.0 / 255, blue: 175.0 / 255).opacity(0.94), location: 1),
        ], center: .center, angle: .degrees(angle - 90))
    }
}

private struct DoodleSketchReveal: View {
    let art: DoodleArt
    let blue: Bool
    let active: Bool
    let reducedMotion: Bool
    @State private var wipeProgress = 1.0
    @State private var colorStrength = 0.0

    var body: some View {
        let artwork = DoodleArtwork(art: art, blue: blue)
        ZStack {
            artwork
                .opacity(1 - colorStrength * 0.75)
            if active && !reducedMotion {
                DoodleSketchGlow.gradient(angle: 0)
                    .mask { artwork }
                    .opacity(colorStrength)
                    .accessibilityHidden(true)
            }
        }
        .mask { DoodleWipeMask(progress: wipeProgress) }
        .task(id: active) {
            guard active, !reducedMotion else {
                wipeProgress = 1
                colorStrength = 0
                return
            }
            wipeProgress = 0
            colorStrength = 0.82
            try? await Task.sleep(for: .milliseconds(16))
            guard !Task.isCancelled else { return }
            withAnimation(.timingCurve(0.4, 0, 0.2, 1, duration: 0.85)) { wipeProgress = 1 }
            withAnimation(.easeInOut(duration: 2.5)) { colorStrength = 0 }
        }
    }
}

private struct DoodleWipeMask: View, Animatable {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    var body: some View {
        let edge = progress * 1.4 - 0.25
        LinearGradient(
            colors: [.white, .clear],
            startPoint: UnitPoint(x: edge, y: edge),
            endPoint: UnitPoint(x: edge + 0.22, y: edge + 0.22)
        )
    }
}
