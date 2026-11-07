import SwiftUI
import UIKit

/// A scrollable dessert menu with an interactive close-up of each bead artwork.
public struct BeadClub: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var artworkTransition
    @AccessibilityFocusState private var backFocused: Bool
    @State private var category: Category = .all
    @State private var selected: Cake?

    private let title: String
    private let ink = Color(red: 0.14, green: 0.16, blue: 0.15)
    private let muted = Color(red: 0.34, green: 0.39, blue: 0.36)
    private let paper = Color(white: 0.949)

    public init(title: String = "Little Bead Club") {
        self.title = title
    }

    public var body: some View {
        GeometryReader { geometry in
            let artSize = min(max(0, geometry.size.width - 40), 500)
            let inset = max(108, (geometry.size.height - artSize) / 2 - 46)

            ZStack(alignment: .top) {
                menu(artSize: artSize, inset: inset, height: geometry.size.height)
                    .allowsHitTesting(selected == nil)
                    .accessibilityHidden(selected != nil)

                if let selected {
                    detail(selected, artSize: artSize, inset: inset)
                }

                LinearGradient(colors: [paper.opacity(0), paper], startPoint: .top, endPoint: .bottom)
                    .frame(height: 48)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)

                header
                    .zIndex(1)
                    .accessibilitySortPriority(1)
            }
            .clipped()
        }
        .foregroundStyle(ink)
        .background(paper.ignoresSafeArea())
        .environment(\.colorScheme, .light)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                if let selected {
                    Button {
                        show(nil)
                    } label: {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 19, weight: .medium))
                            .frame(width: 44, height: 44)
                            .background(.white.opacity(0.55), in: Circle())
                            .overlay(Circle().strokeBorder(ink.opacity(0.14)))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Back to collection")
                    .accessibilityFocused($backFocused)

                    Text(selected.name)
                        .font(.subheadline.weight(.semibold))
                        .accessibilityAddTraits(.isHeader)
                } else {
                    Text(title)
                        .font(.body.weight(.medium))
                        .accessibilityAddTraits(.isHeader)
                }
                Spacer(minLength: 4)
                Image(systemName: "birthday.cake")
                    .font(.system(size: 20, weight: .medium))
                    .accessibilityHidden(true)
            }
            .frame(minHeight: 44)
            .padding(.horizontal, 20)

            if selected == nil {
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        ForEach(Category.allCases, id: \.self) { tab in
                            Button {
                                category = tab
                            } label: {
                                Text(tab.rawValue)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(tab == category ? Color.white : muted)
                                    .padding(.horizontal, 16)
                                    .frame(minHeight: 44)
                                    .background(tab == category ? ink : .white.opacity(0.55), in: Capsule())
                                    .overlay(Capsule().strokeBorder(ink.opacity(0.08)))
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(tab == category ? .isSelected : [])
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .scrollIndicators(.hidden)
                .accessibilityLabel("Cake categories")
            }
        }
        .padding(.top, 6)
        .padding(.bottom, 24)
        .background {
            Rectangle()
                .fill(.regularMaterial)
                .mask {
                    LinearGradient(stops: [
                        .init(color: .black, location: 0),
                        .init(color: .black, location: 0.72),
                        .init(color: .clear, location: 1)
                    ], startPoint: .top, endPoint: .bottom)
                }
                .ignoresSafeArea(edges: .top)
        }
    }

    private func menu(artSize: CGFloat, inset: CGFloat, height: CGFloat) -> some View {
        let animate = !reduceMotion
        return ScrollView {
            LazyVStack(spacing: 32) {
                ForEach(Self.cakes.filter { category == .all || $0.category == category }) { cake in
                    VStack(alignment: .leading, spacing: 10) {
                        Button {
                            show(cake)
                        } label: {
                            BeadArtwork(cake: cake)
                                .frame(width: artSize, height: artSize)
                                .matchedGeometryEffect(
                                    id: cake.id, in: artworkTransition,
                                    isSource: selected?.id != cake.id
                                )
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Open \(cake.name)")
                        .scrollTransition(.interactive, axis: .vertical) { content, phase in
                            content.scaleEffect(animate ? 1 - 0.04 * abs(phase.value) : 1)
                        }

                        caption(cake, expanded: false)
                            .padding(.horizontal, 6)
                    }
                    .frame(width: artSize)
                    .opacity(selected == nil ? 1 : 0)
                }
            }
            .scrollTargetLayout()
            .padding(.bottom, max(30, height - inset - artSize - 50))
            .frame(maxWidth: .infinity)
        }
        .contentMargins(.top, inset, for: .scrollContent)
        .scrollTargetBehavior(.viewAligned(limitBehavior: .always))
        .scrollIndicators(.hidden)
        .id(category)
        .accessibilityLabel("Cake menu")
    }

    private func detail(_ cake: Cake, artSize: CGFloat, inset: CGFloat) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                BeadArtwork(cake: cake, interactive: true)
                    .frame(width: artSize, height: artSize)
                    .scaleEffect(reduceMotion ? 1 : 1.04)
                    .matchedGeometryEffect(id: cake.id, in: artworkTransition)
                    .accessibilityElement()
                    .accessibilityLabel("\(cake.name), fused bead artwork")
                    .accessibilityAddTraits(.isImage)
                    .accessibilityHint(reduceMotion ? "" : "Drag to tilt the artwork")

                caption(cake, expanded: true)
                    .padding(.horizontal, 6)
            }
            .frame(width: artSize)
            .padding(.top, inset)
            .padding(.bottom, 54)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .accessibilityAction(.escape) { show(nil) }
    }

    private func caption(_ cake: Cake, expanded: Bool) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Text(expanded ? "About this cake" : cake.name)
                    .font(.body.weight(.semibold))
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: 0)
                Text(cake.price)
                    .font(.subheadline.weight(.medium).monospacedDigit())
                    .foregroundStyle(muted)
                    .fixedSize()
            }
            Text(expanded ? cake.detailDescription : cake.description)
                .font(.footnote)
                .foregroundStyle(muted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func show(_ cake: Cake?) {
        withAnimation(reduceMotion ? nil : .spring(response: 0.58, dampingFraction: 0.86)) {
            selected = cake
        }
        backFocused = cake != nil
    }

    private enum Category: String, CaseIterable, Decodable {
        case all = "All"
        case tarts = "Tarts"
        case cakes = "Cakes"
    }

    private struct Cake: Identifiable, Decodable {
        let id: String
        let name: String
        let price: String
        let description: String
        let detailDescription: String
        let category: Category
        let glints: [Glint]
    }

    private struct Glint: Decodable {
        let x: Double
        let y: Double
        let phase: Double
    }

    private static let cakes: [Cake] = {
        guard let url = Bundle.module.url(forResource: "cakes", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let cakes = try? JSONDecoder().decode([Cake].self, from: data) else { return [] }
        return cakes
    }()

    private struct BeadArtwork: View {
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        @GestureState(resetTransaction: Transaction(animation: .spring(response: 0.48, dampingFraction: 0.72)))
        private var tilt = CGSize.zero

        let cake: Cake
        var interactive = false

        var body: some View {
            GeometryReader { geometry in
                ZStack {
                    if let image = UIImage(named: cake.id, in: .module, compatibleWith: nil) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .accessibilityHidden(true)
                    }
                    if interactive && !reduceMotion {
                        TimelineView(.animation(minimumInterval: 1.0 / 30)) { timeline in
                            glints(at: timeline.date.timeIntervalSinceReferenceDate)
                        }
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
                .rotation3DEffect(.degrees(-Double(tilt.height) * 15), axis: (1, 0, 0), perspective: 0.45)
                .rotation3DEffect(.degrees(Double(tilt.width) * 18), axis: (0, 1, 0), perspective: 0.45)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 3)
                        .updating($tilt) { value, state, _ in
                            state = CGSize(
                                width: min(1, max(-1, value.translation.width / 100)),
                                height: min(1, max(-1, value.translation.height / 100))
                            )
                        },
                    including: interactive && !reduceMotion ? .gesture : .none
                )
            }
        }

        private func glints(at time: TimeInterval) -> some View {
            Canvas { context, size in
                for glint in cake.glints {
                    let pulse = pow(max(0, sin(time * 1.7 + glint.phase)), 18)
                    guard pulse > 0.24 else { continue }
                    let x = glint.x * size.width
                    let y = glint.y * size.height
                    let radius = 1.5 + pulse
                    var star = Path()
                    star.move(to: CGPoint(x: x, y: y - radius))
                    star.addQuadCurve(to: CGPoint(x: x + radius, y: y), control: CGPoint(x: x, y: y))
                    star.addQuadCurve(to: CGPoint(x: x, y: y + radius), control: CGPoint(x: x, y: y))
                    star.addQuadCurve(to: CGPoint(x: x - radius, y: y), control: CGPoint(x: x, y: y))
                    star.addQuadCurve(to: CGPoint(x: x, y: y - radius), control: CGPoint(x: x, y: y))
                    context.fill(star, with: .color(.white.opacity(pulse * 0.8)))
                }
            }
        }
    }
}
