import SwiftUI
import UIKit

/// A deck of four risograph habit cards. Swipe to change habits and tap a date to stamp or lift it.
public struct StampTracker: View {
    public enum Habit: String, CaseIterable, Sendable {
        case water, coffee, move, read

        fileprivate var title: String { rawValue.capitalized }

        fileprivate var ink: Color {
            switch self {
            case .water: stampColor(0x113D61)
            case .coffee: stampColor(0x0C0603)
            case .move: stampColor(0x285949)
            case .read: stampColor(0x353178)
            }
        }

        fileprivate var paper: Color {
            switch self {
            case .water: stampColor(0x6BAEE5)
            case .coffee: stampColor(0x9C7158)
            case .move: stampColor(0xF2B6CB)
            case .read: stampColor(0x5DB896)
            }
        }

        fileprivate var printInk: Color {
            switch self {
            case .water: stampColor(0xF8DF3E)
            case .coffee: stampColor(0xEDBC9F)
            case .move: stampColor(0x4FAE8F)
            case .read: stampColor(0x6560BE)
            }
        }

        fileprivate var frequency: Double {
            switch self {
            case .water: 0.66
            case .coffee: 0.68
            case .move: 0.62
            case .read: 0.64
            }
        }
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var view: StampPeriod = .week
    @State private var front = 0
    @State private var stamps: [Habit: Set<String>]
    @State private var progress: CGFloat = 0
    @State private var tuck: [CGFloat] = [0, 0, 0, 0]
    @State private var entrance: [CGFloat] = [1, 1, 1, 1]
    @State private var settling = false
    @State private var interacted = false

    private let calendar: StampCalendar
    private let loop: Bool
    private let onChange: ((Habit, String, Bool) -> Void)?
    private static let habits = Habit.allCases

    /// Defaults to September 30, 2026, matching the React demo. Pass a date to use a different day.
    public init(today: Date? = nil, loop: Bool = false, onChange: ((Habit, String, Bool) -> Void)? = nil) {
        let calendar = StampCalendar(today: today)
        self.calendar = calendar
        self.loop = loop
        self.onChange = onChange
        _stamps = State(initialValue: calendar.initialStamps)
    }

    public var body: some View {
        GeometryReader { proxy in
            let scale = max(0.3, min(1, (proxy.size.width - 24) / 340, (proxy.size.height - 24) / 736))
            ZStack(alignment: .topLeading) {
                let screen = RoundedRectangle(cornerRadius: 60, style: .circular)
                screen.fill(stampColor(0x0B0B0C))
                screen.strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                    .allowsHitTesting(false)
                switcher.position(x: 170, y: 82).zIndex(1)
                deck(scale: scale).position(x: 170, y: 436)
            }
            .frame(width: 340, height: 736)
            .clipShape(RoundedRectangle(cornerRadius: 60, style: .circular))
            .scaleEffect(scale)
            .position(x: proxy.size.width / 2, y: proxy.size.height / 2)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Stamp tracker")
        }
        .clipped()
        .onAppear(perform: revealDeck)
        .task(id: loop && !interacted) {
            guard loop && !interacted else { return }
            try? await runDemo()
        }
    }

    private var switcher: some View {
        ZStack(alignment: .leading) {
            Capsule().fill(Color.white.opacity(0.1))
            Capsule().fill(.white)
                .frame(width: 70, height: 30)
                .offset(x: 3 + CGFloat(view.rawValue) * 70)
                .allowsHitTesting(false)

            HStack(spacing: 0) {
                ForEach(StampPeriod.allCases) { period in
                    Button {
                        interacted = true
                        withAnimation(reduceMotion ? nil : .smooth(duration: 0.23)) { view = period }
                    } label: {
                        Text(period.title)
                            .font(StampTypography.font(.medium, 13))
                            .foregroundStyle(view == period ? stampColor(0x0B0B0C) : Color.white.opacity(0.62))
                            .frame(width: 70, height: 30)
                            .contentShape(Capsule())
                    }
                    .accessibilityAddTraits(view == period ? .isSelected : [])
                    .accessibilityIdentifier("stamp-period-\(period.title.lowercased())")
                }
            }
            .buttonStyle(.plain)
            .padding(.leading, 3)
        }
        .frame(width: 216, height: 36)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("View")
    }

    private func deck(scale: CGFloat) -> some View {
        ZStack {
            ForEach(Array(Self.habits.enumerated()), id: \.element) { index, habit in
                let depth = (index - front + Self.habits.count) % Self.habits.count
                StampDeckCard(
                    habit: habit, depth: depth, period: view, calendar: calendar,
                    dates: stamps[habit, default: []], progress: progress, tuck: tuck[index],
                    entrance: entrance[index], reduceMotion: reduceMotion
                ) { date in
                    interacted = true
                    setStamp(!stamps[habit, default: []].contains(date), for: habit, date: date, notify: true)
                }
            }
        }
        .frame(width: 300, height: 504)
        .simultaneousGesture(DragGesture(minimumDistance: 4, coordinateSpace: .global)
            .onChanged { drag in
                guard !settling, abs(drag.translation.width) > abs(drag.translation.height) else { return }
                interacted = true
                if !reduceMotion {
                    progress = min(1, max(-1, -drag.translation.width / scale / StampDeckPose.travel))
                }
            }
            .onEnded { drag in
                guard !settling else { return }
                guard abs(drag.translation.width) > abs(drag.translation.height) else {
                    settle(toward: 0)
                    return
                }
                let translation = -drag.translation.width / scale / StampDeckPose.travel
                let prediction = -drag.predictedEndTranslation.width / scale / StampDeckPose.travel
                let projected = translation + (prediction - translation) * 0.7
                settle(toward: projected > 0.3 ? 1 : projected < -0.3 ? -1 : 0)
            })
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Habits")
        .accessibilityAction(named: "Next habit") { advance(1) }
        .accessibilityAction(named: "Previous habit") { advance(-1) }
        .focusable()
        .focusEffectDisabled()
        .onKeyPress(.rightArrow) { advance(1); return .handled }
        .onKeyPress(.leftArrow) { advance(-1); return .handled }
    }

    private func revealDeck() {
        for index in Self.habits.indices where entrance[index] != 0 {
            let delay = Double(Self.habits.count - 1 - index) * 0.09
            withAnimation(reduceMotion ? nil : .smooth(duration: 0.7).delay(delay)) {
                entrance[index] = 0
            }
        }
    }

    private func setStamp(_ stamped: Bool, for habit: Habit, date: String, notify: Bool) {
        guard date <= calendar.today.id, stamps[habit, default: []].contains(date) != stamped else { return }
        if stamped {
            stamps[habit, default: []].insert(date)
        } else {
            stamps[habit, default: []].remove(date)
        }
        if notify { onChange?(habit, date, stamped) }
    }

    private func advance(_ step: Int) {
        interacted = true
        settle(toward: step)
    }

    private func settle(toward step: Int) {
        guard !settling else { return }
        if reduceMotion {
            front = (front + step + Self.habits.count) % Self.habits.count
            progress = 0
            return
        }
        settling = true
        withAnimation(.smooth(duration: step == 0 ? 0.30 : 0.36), completionCriteria: .logicallyComplete) {
            progress = CGFloat(step)
        } completion: {
            let outgoing = front
            front = (front + step + Self.habits.count) % Self.habits.count
            progress = 0
            tuck[front] = 0
            if step == 1 {
                tuck[outgoing] = 1
                withAnimation(.smooth(duration: 0.42).delay(0.04)) {
                    tuck[outgoing] = 0
                }
            }
            settling = false
        }
    }

    private func runDemo() async throws {
        try await Task.sleep(for: .milliseconds(1800))
        while !Task.isCancelled {
            let habit = Self.habits[front]
            let today = calendar.today.id
            if !stamps[habit, default: []].contains(today) {
                setStamp(true, for: habit, date: today, notify: false)
                try await Task.sleep(for: .milliseconds(900))
            }
            if Self.habits.allSatisfy({ stamps[$0, default: []].contains(today) }) {
                try await Task.sleep(for: .milliseconds(1500))
                stamps = calendar.initialStamps
                try await Task.sleep(for: .milliseconds(800))
            } else {
                settle(toward: 1)
                try await Task.sleep(for: .milliseconds(2060))
            }
        }
    }
}

private enum StampPeriod: Int, CaseIterable, Identifiable {
    case day, week, month

    var id: Self { self }

    var title: String {
        switch self {
        case .day: "Day"
        case .week: "Week"
        case .month: "Month"
        }
    }

    var stampSize: CGFloat {
        switch self {
        case .day: 150
        case .week: 34
        case .month: 31
        }
    }

    var printSize: CGFloat { stampSize + (self == .day ? 12 : 4) }
}

private struct StampCalendar {
    struct Cell: Identifiable {
        let id: String
        let day: Int
        let short: String
        let spoken: String
    }

    static let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    let today: Cell
    let todayColumn: Int
    let weekday: String
    let monthName: String
    let month: [Cell?]
    let weekRange: String
    let week: [Cell]
    let initialStamps: [StampTracker.Habit: Set<String>]

    init(today date: Date?) {
        let calendar = Calendar(identifier: .gregorian)
        let reference = date ?? calendar.date(from: DateComponents(year: 2026, month: 9, day: 30))!
        let day = calendar.startOfDay(for: reference)
        let monthStart = calendar.dateInterval(of: .month, for: day)!.start
        let monthNames = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"]

        func column(_ date: Date) -> Int { (calendar.component(.weekday, from: date) + 5) % 7 }
        func add(_ offset: Int, to date: Date) -> Date { calendar.date(byAdding: .day, value: offset, to: date)! }

        func cell(_ date: Date) -> Cell {
            let parts = calendar.dateComponents([.year, .month, .day], from: date)
            let number = parts.day!
            let name = monthNames[parts.month! - 1]
            return Cell(id: String(format: "%04d-%02d-%02d", parts.year!, parts.month!, number),
                        day: number, short: "\(name.prefix(3)) \(number)", spoken: "\(name) \(number)")
        }

        let todayCell = cell(day)
        let currentColumn = column(day)
        let firstColumn = column(monthStart)
        let days = calendar.range(of: .day, in: .month, for: day)!.count
        let weekStart = add(-currentColumn, to: day)
        let firstWeek = (0..<7).map { cell(add($0, to: weekStart)) }
        let firstSeedDay = min(monthStart, weekStart)
        let seedCount = calendar.dateComponents([.day], from: firstSeedDay, to: day).day ?? 0
        let seedDates = (0..<seedCount).map { cell(add($0, to: firstSeedDay)).id }

        today = todayCell
        todayColumn = currentColumn
        weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][currentColumn]
        monthName = monthNames[calendar.component(.month, from: day) - 1]
        month = (0..<((firstColumn + days + 6) / 7 * 7)).map { slot in
            let offset = slot - firstColumn
            return (0..<days).contains(offset) ? cell(add(offset, to: monthStart)) : nil
        }
        week = firstWeek
        weekRange = "\(firstWeek[0].short) – \(firstWeek[6].short)"
        initialStamps = Dictionary(uniqueKeysWithValues: StampTracker.Habit.allCases.map { habit in
            (habit, Set(seedDates.filter { stampHash("\(habit.rawValue):\($0)") < habit.frequency }))
        })
    }
}

private struct StampDeckPose {
    static let travel: CGFloat = 344
    private static let slots: [(y: CGFloat, scale: CGFloat, angle: Double)] = [
        (0, 1, 0), (-20, 0.88, -2.2), (-38, 0.77, 2.5), (-54, 0.66, -1.5),
    ]

    var y: CGFloat = 0
    var scale: CGFloat = 1
    var angle: Double = 0
    var flyX: CGFloat = 0
    var flyAngle: Double = 0
    var layer: Double
    var opacity: Double = 1
    var content: Double = 0

    init(progress: CGFloat, depth: Int, tuck: CGFloat, entrance: CGFloat) {
        let progress = min(1, max(-1, progress))
        layer = Double(4 - depth)
        if progress >= 0 {
            if depth == 0 {
                flyX = -progress * Self.travel
                flyAngle = max(-6, Double(flyX / 300) * 6)
                content = 1
                opacity = progress > 0.7 ? Double((1 - progress) / 0.3) : 1
            } else {
                place(at: CGFloat(depth) - progress)
                if depth == 1 { content = min(1, Double(progress / 0.35)) }
            }
        } else {
            let distance = -progress
            if depth == 3 {
                if distance < 0.15 {
                    place(at: 3)
                    y += 84 * distance / 0.15
                    layer = 0
                } else {
                    let arrival = (distance - 0.15) / 0.85
                    flyX = -(1 - arrival) * Self.travel
                    flyAngle = -6 * Double(1 - arrival)
                    content = min(1, Double((distance - 0.15) / 0.25))
                    layer = 8
                }
            } else {
                place(at: CGFloat(depth) + distance)
                if depth == 0 { content = Double(1 - distance) }
            }
        }
        if tuck > 0.002 && !(progress <= -0.15 && depth == 3) {
            place(at: 3)
            y += 84 * tuck
            flyX = 0
            flyAngle = 0
            content = 0
            opacity = 1
            layer = 0
        }
        y += entrance * 736
    }

    private mutating func place(at depth: CGFloat) {
        let index = min(2, Int(depth))
        let fraction = depth - CGFloat(index)
        let a = Self.slots[index]
        let b = Self.slots[index + 1]
        y = a.y + (b.y - a.y) * fraction
        scale = a.scale + (b.scale - a.scale) * fraction
        angle = a.angle + (b.angle - a.angle) * Double(fraction)
    }
}

private struct StampDeckCard: View, Animatable {
    let habit: StampTracker.Habit
    let depth: Int
    let period: StampPeriod
    let calendar: StampCalendar
    let dates: Set<String>
    var progress: CGFloat
    var tuck: CGFloat
    var entrance: CGFloat
    let reduceMotion: Bool
    let toggle: (String) -> Void

    var animatableData: AnimatablePair<CGFloat, AnimatablePair<CGFloat, CGFloat>> {
        get { AnimatablePair(progress, AnimatablePair(tuck, entrance)) }
        set { (progress, tuck, entrance) = (newValue.first, newValue.second.first, newValue.second.second) }
    }

    var body: some View {
        let pose = StampDeckPose(progress: progress, depth: depth, tuck: tuck, entrance: entrance)
        ZStack(alignment: .topLeading) {
            habit.paper
            StampArtwork.image(habit, "paper")
            if pose.content > 0 || depth == 0 {
                content.opacity(pose.content)
            }
        }
        .frame(width: 300, height: 504)
        .clipShape(RoundedRectangle(cornerRadius: 36, style: .circular))
        .rotationEffect(.degrees(pose.flyAngle), anchor: .bottom)
        .offset(x: pose.flyX)
        .scaleEffect(pose.scale, anchor: .top)
        .rotationEffect(.degrees(pose.angle), anchor: .top)
        .offset(y: pose.y)
        .opacity(pose.opacity)
        .zIndex(pose.layer)
        .allowsHitTesting(depth == 0)
        .accessibilityHidden(depth != 0)
    }

    private var subtitle: String {
        switch period {
        case .day: calendar.weekday
        case .week: calendar.weekRange
        case .month: calendar.monthName
        }
    }

    private var content: some View {
        ZStack(alignment: .topLeading) {
            VStack(alignment: .leading, spacing: 0) {
                headline(habit.title)
                    .accessibilityAddTraits(.isHeader)
                headline(subtitle)
                    .opacity(0.8)
                    .id(period)
                    .transition(contentTransition)
            }
            .offset(x: 24, y: 24)

            Group {
                if period == .day {
                    day
                } else {
                    grid
                }
            }
            .id(period)
            .transition(contentTransition)
        }
        .foregroundStyle(habit.ink)
    }

    private var contentTransition: AnyTransition {
        reduceMotion ? .opacity : .asymmetric(
            insertion: .opacity.combined(with: .offset(y: 4)), removal: .opacity
        )
    }

    private func headline(_ text: String) -> some View {
        Text(text)
            .font(StampTypography.font(.semibold, 24))
            .tracking(-0.48)
            .lineLimit(1)
            .fixedSize()
            .frame(height: 30)
    }

    private var day: some View {
        VStack(spacing: 18) {
            button(calendar.today)
            Text(calendar.today.short)
                .font(StampTypography.font(.regular, 16))
                .frame(height: 22)
        }
        .position(x: 150, y: 329)
    }

    private var grid: some View {
        let cells: [StampCalendar.Cell?] = period == .week ? calendar.week.map(Optional.some) : calendar.month
        let rows = cells.count / 7
        let height = 20 + CGFloat(rows) * (period.stampSize + 10) + 2
        let free = 396 - height
        let width = min(period == .week ? 240 : 172, (free - 28) * 240 / 190)
        return ZStack(alignment: .topLeading) {
            if free >= 110 {
                StampArtwork.image(habit, "illustration")
                    .frame(width: width, height: width * 190 / 240)
                    .position(x: 150, y: 84 + (free - (period == .month ? 8 : 0)) / 2)
                    .accessibilityHidden(true)
                    .allowsHitTesting(false)
            }
            VStack(spacing: 10) {
                HStack(spacing: 0) {
                    ForEach(StampCalendar.weekdays.indices, id: \.self) { column in
                        let current = column == calendar.todayColumn
                        Text(StampCalendar.weekdays[column])
                            .font(StampTypography.font(current ? .semibold : .medium, 14))
                            .foregroundStyle(current ? habit.printInk : habit.ink)
                            .frame(width: 260 / 7, height: 20)
                            .accessibilityHidden(true)
                    }
                }
                ForEach(0..<rows, id: \.self) { row in
                    HStack(spacing: 0) {
                        ForEach(0..<7, id: \.self) { column in
                            Group {
                                if let cell = cells[row * 7 + column] {
                                    button(cell)
                                } else {
                                    Color.clear.frame(width: period.stampSize, height: period.stampSize)
                                        .accessibilityHidden(true)
                                }
                            }
                            .frame(width: 260 / 7)
                        }
                    }
                }
            }
            .frame(width: 260)
            .position(x: 150, y: 480 - 2 - (height - 2) / 2)
        }
    }

    private func button(_ cell: StampCalendar.Cell) -> some View {
        StampDateButton(
            cell: cell, habit: habit, period: period, stamped: dates.contains(cell.id),
            today: cell.id == calendar.today.id, future: cell.id > calendar.today.id,
            reduceMotion: reduceMotion
        ) { toggle(cell.id) }
    }
}

private struct StampDateButton: View {
    let cell: StampCalendar.Cell
    let habit: StampTracker.Habit
    let period: StampPeriod
    let stamped: Bool
    let today: Bool
    let future: Bool
    let reduceMotion: Bool
    let toggle: () -> Void
    @State private var animatePrint = false
    @State private var splatter = false

    private var dashRing: some View {
        StampArtwork.image(habit, "ghost")
            .frame(width: period.stampSize, height: period.stampSize)
    }

    private var dateRing: some View {
        Circle()
            .strokeBorder(habit.ink.opacity(future ? 0.3 : today ? 1 : 0.8), lineWidth: today ? 2 : 1.5)
            .overlay {
                Text("\(cell.day)")
                    .font(StampTypography.font(today ? .semibold : .medium, period == .week ? 13 : 12))
                    .foregroundStyle(habit.ink.opacity(future ? 0.4 : 1))
            }
    }

    var body: some View {
        Button(action: toggle) {
            ZStack {
                Group {
                    if period == .day { dashRing } else { dateRing }
                }
                .opacity(stamped ? 0 : 1)
                .animation(.easeInOut(duration: stamped ? 0.12 : 0.20).delay(stamped ? 0 : 0.14), value: stamped)

                if stamped {
                    StampArtwork.image(habit, period.title.lowercased())
                        .frame(width: period.printSize, height: period.printSize)
                        .rotationEffect(.degrees((stampHash("\(habit.rawValue):\(period.title.lowercased()):tilt:\(cell.id)") - 0.5) * (period == .day ? 8 : 20)))
                        .keyframeAnimator(initialValue: StampImpact(), trigger: animatePrint) { content, value in
                            content.scaleEffect(value.scale).opacity(value.opacity)
                        } keyframes: { _ in
                            KeyframeTrack(\.scale) {
                                MoveKeyframe(1.30)
                                CubicKeyframe(0.92, duration: 0.126)
                                CubicKeyframe(1, duration: 0.154)
                            }
                            KeyframeTrack(\.opacity) {
                                MoveKeyframe(0)
                                LinearKeyframe(1, duration: 0.126)
                                LinearKeyframe(1, duration: 0.154)
                            }
                        }
                        .transition(.scale(scale: 0.92).combined(with: .opacity))
                }

                if splatter {
                    ForEach(0..<5) { index in
                        fleck(index)
                    }
                }
            }
            .frame(width: period.stampSize, height: period.stampSize)
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(future)
        .accessibilityLabel("\(habit.title), \(cell.spoken)")
        .accessibilityValue(stamped ? "Stamped" : "Not stamped")
        .accessibilityIdentifier("stamp-\(habit.rawValue)-\(cell.id)")
        .animation(.easeOut(duration: reduceMotion ? 0.12 : 0.18), value: stamped)
        .onChange(of: stamped) { _, isStamped in
            if isStamped && !reduceMotion {
                animatePrint.toggle()
                splatter = true
            } else {
                splatter = false
            }
        }
        .task(id: splatter) {
            guard splatter else { return }
            do {
                try await Task.sleep(for: .milliseconds(650))
                splatter = false
            } catch {}
        }
    }

    private func fleck(_ index: Int) -> some View {
        let big = period == .day
        let key = "\(period.title.lowercased()):\(cell.id):\(index)"
        let angle = stampHash("\(habit.rawValue):fleck:\(key)") * 2 * .pi
        let radius = period.stampSize / 2 + 1 + stampHash("\(habit.rawValue):fr:\(key)") * (big ? 9 : 5)
        let width = (big ? 3.0 : 2.0) + (stampHash("\(habit.rawValue):fs:\(key)") * (big ? 2 : 1)).rounded()
        return Circle()
            .fill(habit.printInk)
            .frame(width: width, height: width)
            .keyframeAnimator(initialValue: StampFleck()) { content, value in
                let distance = radius + value.travel
                content.offset(x: cos(angle) * distance, y: sin(angle) * distance)
                    .opacity(value.opacity)
            } keyframes: { _ in
                KeyframeTrack(\.travel) {
                    LinearKeyframe(0, duration: 0.12)
                    CubicKeyframe(big ? 8 : 3, duration: 0.5)
                }
                KeyframeTrack(\.opacity) {
                    LinearKeyframe(0, duration: 0.12)
                    LinearKeyframe(0.9, duration: 0.16)
                    LinearKeyframe(0, duration: 0.34)
                }
            }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }
}

private struct StampImpact {
    var scale: CGFloat = 1
    var opacity: Double = 1
}

private struct StampFleck {
    var travel: CGFloat = 0
    var opacity: Double = 0
}

private enum StampArtwork {
    // The SVG ink filters are rasterized from the React artwork once, at 2x.
    // SwiftUI renders the layout, date buttons, cards, and interaction independently.
    private static let images: [String: UIImage] = Dictionary(
        uniqueKeysWithValues: StampTracker.Habit.allCases.flatMap { habit in
            ["paper", "illustration", "ghost", "day", "week", "month"].compactMap { role in
                let name = "stamp-\(habit.rawValue)-\(role)"
                guard let url = Bundle.module.url(forResource: name, withExtension: "png"),
                      let image = UIImage(contentsOfFile: url.path) else { return nil }
                return (name, image)
            }
        }
    )

    @ViewBuilder
    static func image(_ habit: StampTracker.Habit, _ role: String) -> some View {
        if let image = images["stamp-\(habit.rawValue)-\(role)"] {
            Image(uiImage: image).resizable().interpolation(.high)
        }
    }
}

private enum StampTypography: String {
    case regular = "Poppins-Regular"
    case medium = "Poppins-Medium"
    case semibold = "Poppins-SemiBold"

    static func font(_ weight: Self, _ size: CGFloat) -> Font {
        let fallback: Font.Weight = weight == .semibold ? .semibold : weight == .medium ? .medium : .regular
        return DesignFont.bundled(weight.rawValue, size: size, fallback: .system(size: size, weight: fallback))
    }
}

private func stampHash(_ string: String) -> Double {
    var hash: UInt32 = 2_166_136_261
    for value in string.utf16 {
        hash = (hash ^ UInt32(value)) &* 16_777_619
    }
    hash = (hash ^ (hash >> 15)) &* 2_246_822_507
    return Double(hash ^ (hash >> 13)) / 4_294_967_296
}

private func stampColor(_ rgb: UInt32) -> Color {
    Color(.sRGB, red: Double((rgb >> 16) & 0xFF) / 255,
          green: Double((rgb >> 8) & 0xFF) / 255, blue: Double(rgb & 0xFF) / 255, opacity: 1)
}
