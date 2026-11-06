import SwiftUI
import UIKit

/// A sticker journal. Tap to place, drag to move, or drop a sticker on the bin to return it.
public struct StickerPeel: View {
    public struct Placement: Identifiable, Codable, Equatable {
        public let id: String
        public let label: String
        /// Coordinates are fractions of the paper width and height, measured from the top left.
        public var x: CGFloat
        public var y: CGFloat
        public var rotation: Double

        public init(id: String, label: String, x: CGFloat, y: CGFloat, rotation: Double = 0) {
            self.id = id
            self.label = label
            self.x = x
            self.y = y
            self.rotation = rotation
        }
    }

    @Binding private var placements: [Placement]
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dismiss) private var dismiss
    @Namespace private var stage
    @GestureState private var drag: Drag?
    @State private var collectionIndex = 0
    @State private var paper: Paper = .plain
    @State private var dark = false
    @State private var openMenu: Popover?
    @State private var feedback = 0

    private let onBack: (() -> Void)?

    public init(placements: Binding<[Placement]>, onBack: (() -> Void)? = nil) {
        self._placements = placements
        self.onBack = onBack
    }

    public var body: some View {
        GeometryReader { proxy in
            let layout = Layout(host: proxy.size)
            let collection = Self.collections[safe: collectionIndex]
            let theme = Theme(dark: dark)
            let items = collection?.stickers ?? []

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 16)
                    .fill(theme.surface)
                    .frame(width: layout.size.width - 20, height: layout.size.height - 20)
                    .position(x: layout.size.width / 2, y: layout.size.height / 2)
                    .accessibilityHidden(true)

                Notepad(paper: paper, theme: theme)
                    .frame(width: 340, height: 420)
                    .scaleEffect(layout.pageScale)
                    .position(x: layout.paper.midX, y: layout.paper.midY)

                ForEach(visibleStickers(items, layout: layout)) { entry in
                    sticker(entry, layout: layout)
                }

                if openMenu != nil {
                    Color.clear.contentShape(Rectangle())
                        .onTapGesture { showMenu(nil) }
                        .accessibilityHidden(true)
                        .zIndex(1500)
                }

                toolbar(theme: theme, layout: layout).zIndex(2000)
                trayControls(collection: collection, items: items, layout: layout, theme: theme)
                    .position(x: layout.size.width / 2, y: layout.navY + 22)
                    .zIndex(2000)

                if let openMenu {
                    menu(openMenu, theme: theme, layout: layout)
                        .zIndex(2100)
                }
            }
            .frame(width: layout.size.width, height: layout.size.height)
            .coordinateSpace(name: stage)
            .foregroundStyle(theme.ink)
            .environment(\.colorScheme, dark ? .dark : .light)
            .scaleEffect(layout.scale)
            .position(x: proxy.size.width / 2, y: proxy.size.height / 2)
        }
        .frame(minHeight: 260)
        .clipped()
        .sensoryFeedback(.impact(weight: .light, intensity: 0.72), trigger: feedback)
        .accessibilityAction(.escape) { showMenu(nil) }
    }

    private var motion: Animation {
        reduceMotion ? .easeOut(duration: 0.14) : .spring(response: 0.42, dampingFraction: 0.74)
    }

    private enum Popover { case paper, collections }

    private func showMenu(_ menu: Popover?) {
        withAnimation(.timingCurve(0.2, 0.8, 0.25, 1, duration: 0.18)) {
            openMenu = menu
        }
    }

    private func toolbar(theme: Theme, layout: Layout) -> some View {
        let mid = layout.size.width / 2
        return ZStack {
            HStack(spacing: 0) {
                Button { showMenu(nil) } label: {
                    icon("folder", size: 16).frame(width: 52, height: 44).contentShape(Rectangle())
                }
                .accessibilityLabel("Sticker page")
                Button { showMenu(openMenu == .paper ? nil : .paper) } label: {
                    icon("paper", size: 16).frame(width: 52, height: 44).contentShape(Rectangle())
                }
                .accessibilityLabel("Paper")
                .accessibilityAddTraits(openMenu == .paper ? [.isSelected] : [])
            }
            .background(alignment: .leading) {
                Capsule().fill(theme.thumb)
                    .frame(width: 52, height: 36)
                    .offset(x: openMenu == .paper ? 52 : 0)
            }
            .padding(.horizontal, 4)
            .background { glass(theme) }
            .position(x: mid, y: 48)

            Button {
                if let onBack { onBack() } else { dismiss() }
            } label: {
                icon("back", size: 18).frame(width: 44, height: 44)
                    .background { glass(theme) }
            }
            .accessibilityLabel("Back")
            .position(x: 48, y: 48)

            Button { dark.toggle() } label: {
                icon(dark ? "sun" : "moon", size: 18).frame(width: 44, height: 44)
                    .background { glass(theme) }
            }
            .accessibilityLabel(dark ? "Switch to light mode" : "Switch to dark mode")
            .position(x: layout.size.width - 48, y: 48)
        }
        .buttonStyle(.plain)
    }

    private func trayControls(collection: Collection?, items: [Artwork], layout: Layout, theme: Theme) -> some View {
        let available = items.filter { item in !placements.contains { $0.id == item.id } }
        let overBin = drag.map { layout.bin.contains($0.location) } ?? false
        return HStack(spacing: 8) {
            Button {
                if let item = available.randomElement() { place(item, at: nextSpot(in: layout), in: layout) }
            } label: {
                icon("random", size: 18).frame(width: 44, height: 44)
                    .foregroundStyle(available.isEmpty ? theme.disabled : theme.ink)
                    .background { glass(theme) }
            }
            .accessibilityLabel("Stick a random sticker")
            .disabled(available.isEmpty)

            Button { showMenu(openMenu == .collections ? nil : .collections) } label: {
                HStack(spacing: 6) {
                    if let collection, let cover = Self.artworkByID[collection.cover] {
                        cover.image.resizable().frame(width: 28, height: 28)
                    }
                    Text(collection?.name ?? "Stickers")
                        .font(DesignFont.sans(13))
                }
                .frame(width: 132, height: 44)
                .background { glass(theme, solid: true) }
            }
            .accessibilityLabel("Sticker collections")
            .accessibilityValue(collection?.name ?? "")

            Button {
                withAnimation(motion) { placements.removeAll() }
            } label: {
                icon("bin", size: 18).frame(width: 44, height: 44)
                    .foregroundStyle(placements.isEmpty && drag == nil ? theme.disabled : theme.ink)
                    .background { glass(theme, solid: overBin) }
                    .scaleEffect(reduceMotion ? 1 : overBin ? 1.28 : drag == nil ? 1 : 1.08)
            }
            .accessibilityLabel("Clear the notepad")
            .disabled(placements.isEmpty && drag == nil)
        }
        .buttonStyle(.plain)
        .fixedSize()
    }

    private func menu(_ menu: Popover, theme: Theme, layout: Layout) -> some View {
        let below = menu == .paper
        let rowCount = below ? Paper.allCases.count : Self.collections.count
        let height = CGFloat(rowCount) * 44 + 8
        return VStack(spacing: 0) {
            if below {
                ForEach(Paper.allCases, id: \.self) { kind in
                    menuRow(kind.rawValue, selected: paper == kind, theme: theme) {
                        paper = kind
                        showMenu(nil)
                    } thumbnail: {
                        PaperPattern(paper: kind, theme: theme, spacing: 8)
                            .background(theme.paper)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
            } else {
                ForEach(Self.collections.indices, id: \.self) { index in
                    let collection = Self.collections[index]
                    menuRow(collection.name, selected: collectionIndex == index, theme: theme) {
                        collectionIndex = index
                        showMenu(nil)
                    } thumbnail: {
                        Self.artworkByID[collection.cover]?.image.resizable()
                    }
                }
            }
        }
        .padding(4)
        .frame(width: 180)
        .background(theme.glass, in: RoundedRectangle(cornerRadius: 12))
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .position(x: layout.size.width / 2, y: below ? 78 + height / 2 : layout.navY - 8 - height / 2)
        .transition(reduceMotion ? .opacity : .scale(scale: 0.97).combined(with: .opacity))
    }

    private func menuRow<Thumbnail: View>(
        _ title: String,
        selected: Bool,
        theme: Theme,
        action: @escaping () -> Void,
        @ViewBuilder thumbnail: () -> Thumbnail
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                thumbnail().frame(width: 32, height: 32).accessibilityHidden(true)
                Text(title).font(DesignFont.sans(13))
                Spacer()
            }
            .padding(.horizontal, 8)
            .frame(height: 44)
            .background(selected ? theme.glass : .clear, in: RoundedRectangle(cornerRadius: 8))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }

    private func icon(_ name: String, size: CGFloat) -> some View {
        Rectangle()
            .fill(.foreground)
            .mask {
                if let image = Self.icons[name] {
                    Image(uiImage: image).resizable()
                }
            }
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }

    private static let icons: [String: UIImage] = {
        let names = ["back", "random", "paper", "folder", "moon", "sun", "bin"]
        return Dictionary(uniqueKeysWithValues: names.compactMap { name in
            guard let url = Bundle.module.url(forResource: "sticker-" + name, withExtension: "png"),
                  let image = UIImage(contentsOfFile: url.path) else { return nil }
            return (name, image)
        })
    }()

    private func glass(_ theme: Theme, solid: Bool = false) -> some View {
        Capsule()
            .fill(solid ? theme.solid : theme.button)
            .overlay {
                Capsule().fill(LinearGradient(colors: [theme.glassTop, .clear], startPoint: .top, endPoint: .bottom))
            }
            .overlay { Capsule().strokeBorder(theme.rim, lineWidth: 0.5) }
    }

    private func sticker(_ entry: Entry, layout: Layout) -> some View {
        let active = drag?.id == entry.id ? drag : nil
        let side = active == nil ? entry.side : layout.placedSide * 1.06
        let curl = active == nil ? 0 : 0.52
        let hitWidth = entry.placed ? max(44 / layout.scale, entry.side) : layout.dockStep
        let hitHeight = max(44 / layout.scale, entry.side)
        let move = DragGesture(minimumDistance: 6, coordinateSpace: .named(stage))
            .updating($drag) { value, state, _ in
                state = Drag(id: entry.id, location: value.location, translation: value.translation)
            }
            .onEnded { value in
                if layout.bin.contains(value.location) {
                    remove(entry.id)
                } else if layout.paper.insetBy(dx: -8, dy: -8).contains(value.location) {
                    let center = CGPoint(x: entry.center.x + value.translation.width, y: entry.center.y + value.translation.height)
                    place(entry.artwork, at: center, in: layout)
                }
            }
        let tap = TapGesture().onEnded {
            if !entry.placed { place(entry.artwork, at: nextSpot(in: layout), in: layout) }
        }

        // Keep the gesture and accessibility frame anchored while the artwork follows the finger.
        return Color.clear
            .frame(width: hitWidth, height: hitHeight)
            .contentShape(Rectangle())
            .overlay {
                StickerFace(artwork: entry.artwork, curl: reduceMotion ? 0 : curl)
                    .frame(width: side, height: side)
                    .rotationEffect(.degrees(active == nil || reduceMotion ? entry.rotation : 3))
                    .offset(active?.translation ?? .zero)
                    .allowsHitTesting(false)
            }
            .highPriorityGesture(move.exclusively(before: tap))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(entry.artwork.name)
            .accessibilityIdentifier("sticker-\(entry.id)")
            .accessibilityValue(entry.placed ? "On the notepad" : "In the tray")
            .accessibilityAddTraits(.isButton)
            .accessibilityAction {
                if !entry.placed { place(entry.artwork, at: nextSpot(in: layout), in: layout) }
            }
            .accessibilityAction(named: "Return to the tray") {
                if entry.placed { remove(entry.id) }
            }
            .position(entry.center)
            .zIndex(active != nil ? 10_000 : entry.z)
    }

    private func place(_ artwork: Artwork, at point: CGPoint, in layout: Layout) {
        let inset = layout.placedSide * 0.39
        let x = min(max(point.x, layout.paper.minX + inset), layout.paper.maxX - inset)
        let y = min(max(point.y, layout.paper.minY + inset), layout.paper.maxY - inset)
        let placement = Placement(
            id: artwork.id,
            label: artwork.name,
            x: (x - layout.paper.minX) / layout.paper.width,
            y: (y - layout.paper.minY) / layout.paper.height,
            rotation: Self.placementTilts[placements.count % Self.placementTilts.count]
        )
        withAnimation(motion) {
            placements.removeAll { $0.id == artwork.id }
            placements.append(placement)
        }
        feedback += 1
    }

    private func remove(_ id: String) {
        guard placements.contains(where: { $0.id == id }) else { return }
        if let index = Self.collections.firstIndex(where: { $0.stickers.contains { $0.id == id } }) {
            collectionIndex = index
        }
        withAnimation(motion) { placements.removeAll { $0.id == id } }
        feedback += 1
    }

    private func nextSpot(in layout: Layout) -> CGPoint {
        let spots: [(CGFloat, CGFloat)] = [(0.2, 0.3), (0.76, 0.34), (0.3, 0.62), (0.72, 0.66), (0.5, 0.46), (0.2, 0.86), (0.78, 0.88), (0.5, 0.8)]
        let points = spots.map { layout.point(x: $0.0, y: $0.1) }
        let occupied = placements.map { layout.point(x: $0.x, y: $0.y) }
        return points.first { point in
            occupied.allSatisfy { hypot($0.x - point.x, $0.y - point.y) > layout.placedSide * 0.87 }
        } ?? points[placements.count % points.count]
    }

    private func visibleStickers(_ items: [Artwork], layout: Layout) -> [Entry] {
        let placed = placements.enumerated().compactMap { index, placement -> Entry? in
            guard let artwork = Self.artworkByID[placement.id] else { return nil }
            return Entry(
                artwork: artwork, center: layout.point(x: placement.x, y: placement.y),
                side: layout.placedSide, rotation: placement.rotation, placed: true, z: Double(index + 1)
            )
        }
        let used = Set(placements.map(\.id))
        let tray = items.filter { !used.contains($0.id) }
        return placed + tray.enumerated().map { index, artwork in
            Entry(
                artwork: artwork, center: layout.trayCenter(at: index, count: tray.count),
                side: layout.traySide, rotation: Self.trayTilts[(items.firstIndex(where: { $0.id == artwork.id }) ?? index) % Self.trayTilts.count], placed: false, z: 100
            )
        }
    }

    private enum Paper: String, CaseIterable {
        case lined = "Lined", grid = "Grid", dotted = "Dotted", plain = "Plain"
    }

    private struct Drag {
        let id: String
        let location: CGPoint
        let translation: CGSize
    }

    private struct Entry: Identifiable {
        let artwork: Artwork
        let center: CGPoint
        let side: CGFloat
        let rotation: Double
        let placed: Bool
        let z: Double
        var id: String { artwork.id }
    }

    private struct Artwork: Decodable, Identifiable {
        let id: String
        let name: String
        let maxSum: CGFloat

        var image: Image {
            if let image = UIImage(named: id, in: .module, compatibleWith: nil) {
                return Image(uiImage: image)
            }
            return Image(systemName: "sparkle")
        }
    }

    private struct Collection: Decodable {
        let name: String
        let cover: String
        let stickers: [Artwork]
    }

    private static let collections: [Collection] = {
        guard let url = Bundle.module.url(forResource: "collections", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let collections = try? JSONDecoder().decode([Collection].self, from: data) else { return [] }
        return collections
    }()
    private static let artworkByID = Dictionary(uniqueKeysWithValues: collections.flatMap(\.stickers).map { ($0.id, $0) })
    private static let placementTilts: [Double] = [-7, 5, 6, -4, -5, 4, -6, 7]
    private static let trayTilts: [Double] = [-5, 3, -2, 5, -3, 2]

    private struct Layout {
        let size: CGSize
        let scale: CGFloat
        let paper: CGRect
        let pageScale: CGFloat
        let placedSide: CGFloat
        let dockStep: CGFloat
        let navY: CGFloat
        let bin: CGRect
        let traySide: CGFloat = 92 * 0.6

        init(host: CGSize) {
            let width = max(1, host.width - 16)
            let height = max(1, host.height - 16)
            let portrait = height > width * 1.05
            size = portrait ? CGSize(width: 645, height: 860) : CGSize(width: 920, height: 660)
            scale = min(1.4, max(0.2, min(width / size.width, height / size.height)))
            pageScale = portrait ? 1.42 : 1
            placedSide = 92 * (portrait ? 1.3 : 1)
            dockStep = portrait ? 56 : 60
            let paperWidth = 340 * pageScale
            paper = CGRect(x: (size.width - paperWidth) / 2, y: 76, width: paperWidth, height: 420 * pageScale)
            navY = size.height - 68
            bin = CGRect(x: size.width / 2 + 74, y: navY, width: 44, height: 44).insetBy(dx: -18, dy: -18)
        }

        func point(x: CGFloat, y: CGFloat) -> CGPoint {
            CGPoint(x: paper.minX + paper.width * x, y: paper.minY + paper.height * y)
        }

        func trayCenter(at index: Int, count: Int) -> CGPoint {
            CGPoint(x: size.width / 2 + (CGFloat(index) - CGFloat(count - 1) / 2) * dockStep, y: navY - 52)
        }
    }

    private struct StickerFace: View {
        let artwork: Artwork
        let curl: CGFloat

        var body: some View {
            if curl == 0 {
                artwork.image.resizable().scaledToFit()
            } else {
                Canvas { context, size in
                    let side = size.width
                    let cut = side * (artwork.maxSum + 14 - curl * 92) / 100
                    let crease = Path { path in
                        path.move(to: CGPoint(x: -side, y: -side))
                        path.addLine(to: CGPoint(x: cut + side, y: -side))
                        path.addLine(to: CGPoint(x: -side, y: cut + side))
                        path.closeSubpath()
                    }
                    let corner = Path { path in
                        path.move(to: CGPoint(x: cut + side, y: -side))
                        path.addLine(to: CGPoint(x: -side, y: cut + side))
                        path.addLine(to: CGPoint(x: side * 3, y: side * 3))
                        path.closeSubpath()
                    }
                    let image = context.resolve(artwork.image)
                    let bounds = CGRect(origin: .zero, size: size)
                    var front = context
                    front.clip(to: crease)
                    front.draw(image, in: bounds)

                    var back = context
                    let fold = (1 + min(0.86, 0.5 + curl * 0.3)) / 2
                    back.concatenate(CGAffineTransform(a: 1 - fold, b: -fold, c: -fold, d: 1 - fold, tx: fold * cut, ty: fold * cut))
                    back.clip(to: corner)
                    back.drawLayer { layer in
                        layer.draw(image, in: bounds)
                        layer.blendMode = .sourceAtop
                        layer.fill(corner, with: .linearGradient(
                            Gradient(colors: [Color(white: 0.75), Color(white: 0.98), Color(white: 0.84)]),
                            startPoint: CGPoint(x: cut / 2, y: cut / 2),
                            endPoint: CGPoint(x: side, y: side)
                        ))
                    }
                }
            }
        }
    }

    private struct Theme {
        let dark: Bool
        var surface: Color { color(dark ? 0x161618 : 0xfcfcfc) }
        var paper: Color { color(dark ? 0x1f1f22 : 0xffffff) }
        var ink: Color { color(dark ? 0xf2f2f2 : 0x4a4a52) }
        var soft: Color { color(dark ? 0x8b8b90 : 0xa4a4ac) }
        var rule: Color { color(dark ? 0x2a2a2e : 0xefefef) }
        var dot: Color { color(dark ? 0x3a3a3f : 0xd9d9d9) }
        var disabled: Color { color(dark ? 0x55555a : 0xc9c9c9) }
        var glass: Color { color(0x787880).opacity(dark ? 0.26 : 0.14) }
        var button: Color { dark ? .white.opacity(0.08) : color(0x78787c).opacity(0.12) }
        var solid: Color { dark ? .white.opacity(0.16) : color(0x78787c).opacity(0.24) }
        var thumb: Color { .white.opacity(dark ? 0.16 : 0.72) }
        var glassTop: Color { .white.opacity(dark ? 0.04 : 0.16) }
        var rim: Color { .white.opacity(dark ? 0.06 : 0.4) }

        private func color(_ hex: UInt32) -> Color {
            Color(red: Double(hex >> 16) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
        }
    }

    private struct PaperPattern: View {
        let paper: Paper
        let theme: Theme
        var spacing: CGFloat = 28

        var body: some View {
            Canvas { context, size in
                if paper == .plain { return }
                var path = Path()
                if paper == .dotted {
                    for y in stride(from: spacing / 2, to: size.height, by: spacing) {
                        for x in stride(from: spacing / 2, to: size.width, by: spacing) {
                            path.addEllipse(in: CGRect(x: x - 1, y: y - 1, width: 2, height: 2))
                        }
                    }
                    context.fill(path, with: .color(theme.dot))
                } else {
                    for y in stride(from: spacing - 0.5, to: size.height, by: spacing) {
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: size.width, y: y))
                    }
                    if paper == .grid {
                        for x in stride(from: spacing - 0.5, to: size.width, by: spacing) {
                            path.move(to: CGPoint(x: x, y: 0))
                            path.addLine(to: CGPoint(x: x, y: size.height))
                        }
                    }
                    context.stroke(path, with: .color(theme.rule), lineWidth: 1)
                }
            }
            .accessibilityHidden(true)
        }
    }

    private struct Notepad: View {
        let paper: Paper
        let theme: Theme

        private static let notes = [
            "Hover the tray to see each sticker up close",
            "Tap a sticker to add it to the page",
            "Drag it wherever you like",
        ]
        private let dotted = StrokeStyle(lineWidth: 1, lineCap: .round, dash: [0.5, 2.5])

        var body: some View {
            ZStack(alignment: .topLeading) {
                theme.paper
                PaperPattern(paper: paper, theme: theme)

                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text("1")
                        Spacer()
                        Text("Stickers")
                    }
                    .font(DesignFont.sans(15))
                    .frame(height: 20)
                    Text("My sticker journal")
                        .font(DesignFont.sans(21))
                        .tracking(-0.21)
                        .frame(height: 28)
                        .padding(.top, 8)
                        .accessibilityAddTraits(.isHeader)

                    VStack(spacing: 0) {
                        horizontalRule
                        HStack(alignment: .top, spacing: 16) {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(Self.notes.indices, id: \.self) { index in
                                    (Text("0\(index + 1)").bold() + Text(" | " + Self.notes[index]))
                                        .font(.system(size: 7.5, design: .monospaced))
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .frame(width: 104, alignment: .leading)

                            HStack(spacing: 8) {
                                ForEach(0..<2) { _ in
                                    RoundedRectangle(cornerRadius: 2)
                                        .strokeBorder(theme.soft, style: dotted)
                                        .frame(height: 76)
                                        .accessibilityHidden(true)
                                }
                            }
                        }
                        .padding(.top, 12)
                    }
                    .padding(.top, 12)

                    VStack(alignment: .leading, spacing: 12) {
                        horizontalRule
                        Text("This page is a small collection of things worth keeping, stick down what made today soft and let the rest go")
                            .font(.system(size: 8, design: .monospaced))
                            .lineSpacing(3)
                    }
                    .padding(.top, 12)

                    ZStack {
                        Path { path in
                            path.move(to: CGPoint(x: 150, y: 0))
                            path.addLine(to: CGPoint(x: 150, y: 104))
                        }
                        .stroke(theme.soft, style: dotted)
                        Text("( Keepsakes )")
                            .font(DesignFont.sans(11))
                            .fixedSize()
                            .rotationEffect(.degrees(-90), anchor: .leading)
                            .position(x: 162 + 35, y: 52)
                    }
                    .frame(width: 300, height: 104)
                    .padding(.top, 12)
                    .accessibilityHidden(true)
                    Spacer(minLength: 0)

                    Text("Every sticker here is one of a kind, so choose slowly and leave some room to breathe")
                        .font(.system(size: 8, design: .monospaced))
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }

        private var horizontalRule: some View {
            Path { path in
                path.move(to: CGPoint(x: 0, y: 0.5))
                path.addLine(to: CGPoint(x: 300, y: 0.5))
            }
            .stroke(theme.soft, style: dotted)
            .frame(height: 1)
            .accessibilityHidden(true)
        }
    }

}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
