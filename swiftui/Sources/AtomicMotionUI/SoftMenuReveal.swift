import SwiftUI

/// A frosted menu that unfolds behind a stationary navigation row.
public struct SoftMenuReveal: View {
    public struct Item: Identifiable {
        public let id: String
        public let title: String

        public init(id: String, title: String) {
            self.id = id
            self.title = title
        }
    }

    public static let defaultItems = [
        Item(id: "01", title: "Work"),
        Item(id: "02", title: "Studio"),
        Item(id: "03", title: "Journal"),
    ]

    @Binding private var isOpen: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let ink = Color(red: 14 / 255, green: 16 / 255, blue: 17 / 255)
    private let frosted = Color(white: 245 / 255).opacity(0.85)
    private let title: String
    private let items: [Item]
    private let contact: String
    private let onSelect: (Item) -> Void

    public init(
        isOpen: Binding<Bool>,
        title: String = "Atelier°",
        items: [Item] = SoftMenuReveal.defaultItems,
        contact: String = "hello@atomicmotion.dev",
        onSelect: @escaping (Item) -> Void = { _ in }
    ) {
        self._isOpen = isOpen
        self.title = title
        self.items = items
        self.contact = contact
        self.onSelect = onSelect
    }

    public var body: some View {
        GeometryReader { proxy in
            let top = max(20, (proxy.size.height - 56) / 2 - 142)
            scene
                .padding(.horizontal, 20)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .padding(.top, top)
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
                .clipped()
        }
        .frame(minHeight: max(380, panelHeight + 40))
        .foregroundStyle(ink)
        .accessibilityAction(.escape) { isOpen = false }
    }

    private var panelHeight: CGFloat { CGFloat(items.count) * 48 + 196 }

    private var scene: some View {
        ZStack(alignment: .top) {
            if isOpen {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { isOpen = false }
                    .accessibilityHidden(true)
            }

            ZStack(alignment: .top) {
                panel
                    .frame(height: panelHeight, alignment: .top)
                    .frame(height: isOpen ? panelHeight : 56, alignment: .top)
                    .background(frosted)
                    .background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 28))
                    .opacity(isOpen ? 1 : 0)
                    .allowsHitTesting(isOpen)
                    .accessibilityHidden(!isOpen)

                HStack {
                    Text(title)
                        .font(DesignFont.sans(18, medium: true))
                        .tracking(-0.36)
                    Spacer()
                    Button {
                        isOpen.toggle()
                    } label: {
                        Text("Menu")
                            .font(DesignFont.sans(13))
                            .frame(width: 68, height: 28)
                            .background {
                                if !isOpen { Capsule().fill(frosted) }
                            }
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.plain)
                    .accessibilityValue(isOpen ? "Expanded" : "Collapsed")
                }
                .padding(.horizontal, 24)
                .frame(height: 56)
            }
            .frame(maxWidth: 460)
        }
        .frame(maxWidth: .infinity)
        .animation(reduceMotion ? .easeOut(duration: 0.15) : .timingCurve(0.45, 0, 0.55, 1, duration: 0.78), value: isOpen)
    }

    private var panel: some View {
        VStack(spacing: 0) {
            ForEach(items) { item in
                Button {
                    isOpen = false
                    onSelect(item)
                } label: {
                    HStack {
                        Text(item.title).font(DesignFont.sans(15))
                        Spacer()
                        Text(item.id).font(DesignFont.mono(13)).foregroundStyle(Color(white: 0.4))
                    }
                    .frame(height: 48)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(.black.opacity(0.1)).frame(height: 1)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            Spacer(minLength: 0)

            HStack {
                if let url = URL(string: "mailto:\(contact)") {
                    Link(contact, destination: url)
                        .lineLimit(1)
                        .foregroundStyle(Color(white: 0.2))
                }
                Spacer()
                Button("Close") { isOpen = false }
                    .buttonStyle(.plain)
                    .keyboardShortcut(.cancelAction)
            }
            .font(DesignFont.sans(13))
            .frame(height: 20)
        }
        .padding(.horizontal, 24)
        .padding(.top, 96)
        .padding(.bottom, 24)
        .opacity(isOpen ? 1 : 0)
        .offset(y: isOpen || reduceMotion ? 0 : 18)
        .animation(
            reduceMotion ? nil : .timingCurve(0.45, 0, 0.55, 1, duration: isOpen ? 0.58 : 0.22).delay(isOpen ? 0.18 : 0),
            value: isOpen
        )
    }
}
