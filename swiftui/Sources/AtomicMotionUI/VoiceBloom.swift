import SwiftUI
import UIKit

/// A microphone that expands into a scripted reply with copy and regenerate actions.
public struct VoiceBloom: View {
    private enum Phase: Equatable { case idle, listening, answering }

    private static let responses = [
        "Your idea is taking shape. Start small, test it, and see what comes next.",
        "That sounds promising. What part would you like to explore next?",
    ]
    private static let easing = Animation.timingCurve(0.22, 1, 0.36, 1, duration: 0.32)
    private static let panel = Color(red: 212 / 255, green: 210 / 255, blue: 213 / 255)
    private static let pill = Color(red: 2 / 255, green: 0, blue: 6 / 255)

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var phase = Phase.idle
    @State private var responseIndex = 0
    @State private var responseSequence = 0
    @State private var copied = false
    @State private var copySequence = 0

    private let loop: Bool

    /// Set `loop` for an unattended preview. In the default mode, tap the microphone to start.
    public init(loop: Bool = false) {
        self.loop = loop
    }

    private var response: String { Self.responses[responseIndex] }
    private var open: Bool { phase == .answering }
    private var microphoneLabel: String {
        switch phase {
        case .idle: "Start voice input"
        case .listening: "Listening"
        case .answering: "Stop voice response"
        }
    }
    private var panelAnimation: Animation? {
        reduceMotion ? nil : .interpolatingSpring(mass: 0.78, stiffness: 280, damping: 30, initialVelocity: 0)
    }

    public var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            let width = max(0, min(400, size.width - 32))
            let height = max(0, min(224, size.height - 32))
            let panelTop = min(max(16, size.height / 2 - 76), max(16, size.height - height - 16))
            ZStack {
                responsePanel(width: width, height: height)
                    .position(x: size.width / 2, y: open ? panelTop + height / 2 : size.height / 2)
                    .opacity(open ? 1 : 0)
                    .allowsHitTesting(open)
                    .accessibilityHidden(!open)
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.24), value: open)

                microphone
                    .position(x: size.width / 2, y: open ? panelTop + 32 : size.height / 2)
            }
            .animation(panelAnimation, value: open)
        }
        .clipped()
        .task(id: phase) {
            guard phase == .listening,
                  await wait(reduceMotion ? .milliseconds(80) : .milliseconds(150)) else { return }
            responseSequence += 1
            phase = .answering
        }
        .task(id: open ? responseSequence : nil) {
            guard open, responseIndex == 0,
                  await wait(reduceMotion ? .milliseconds(1200) : .milliseconds(4650)) else { return }
            showResponse(1)
        }
        .task(id: copySequence) {
            guard copied, await wait(.milliseconds(1600)) else { return }
            copied = false
        }
        .task(id: loop && scenePhase == .active) {
            guard loop, scenePhase == .active, await wait(.milliseconds(250)) else { return }
            repeat {
                beginListening()
            } while await wait(reduceMotion ? .milliseconds(4200) : .milliseconds(7600))
        }
        .onChange(of: responseSequence) {
            if open { AccessibilityNotification.Announcement(response).post() }
        }
    }

    private func responsePanel(width: CGFloat, height: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 24, style: .circular).fill(Self.panel)
            if open {
                VoiceBloomWords {
                    ForEach(Array(response.split(separator: " ").enumerated()), id: \.offset) { index, word in
                        VoiceBloomWord(word: String(word), delay: 0.38 + Double(index) * 0.075, reduceMotion: reduceMotion)
                    }
                }
                .id(responseSequence)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(response)
                .padding(.horizontal, 16)
                .padding(.top, 76)
                .transition(.opacity)

                footer
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .transition(.opacity)
            }
        }
        .frame(width: open ? width : 192, height: open ? height : 48)
        .clipShape(.rect(cornerRadius: 24, style: .circular))
    }

    private var footer: some View {
        HStack(spacing: 16) {
            Text("AI response")
                .font(DesignFont.sans(9))
                .foregroundStyle(.black.opacity(0.35))
            Spacer(minLength: 0)
            responseAction(copied ? "Copied" : "Copy") {
                UIPasteboard.general.string = response
                copied = true
                copySequence += 1
            }
            responseAction("Regenerate") {
                showResponse((responseIndex + 1) % Self.responses.count)
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 44)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(.black.opacity(0.1))
                .frame(height: 1)
                .accessibilityHidden(true)
        }
    }

    private func responseAction(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(DesignFont.sans(12, medium: true))
                .foregroundStyle(.black.opacity(0.65))
                .frame(height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var microphone: some View {
        Button {
            if phase == .idle { beginListening() } else { close() }
        } label: {
            ZStack {
                if phase == .listening && !reduceMotion {
                    VoiceBloomListeningPulse()
                        .frame(width: 208, height: 64)
                        .accessibilityHidden(true)
                }
                Capsule().fill(Self.pill)
                VoiceBloomMic(muted: false)
                    .offset(y: open ? -2 : 0)
                    .opacity(open ? 0 : 1)
                VoiceBloomMic(muted: true)
                    .offset(y: open ? 0 : 2)
                    .opacity(open ? 1 : 0)
            }
            .animation(reduceMotion ? nil : Self.easing, value: open)
            .frame(width: 192, height: 48)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(microphoneLabel)
        .accessibilityAddTraits(phase == .listening ? [.isSelected] : [])
        .accessibilityAction(.escape, close)
    }

    private func beginListening() {
        copied = false
        responseIndex = 0
        phase = .listening
    }

    private func close() {
        copied = false
        phase = .idle
    }

    private func showResponse(_ index: Int) {
        withAnimation(reduceMotion ? nil : Self.easing) {
            copied = false
            responseIndex = index
            responseSequence += 1
        }
    }

    private func wait(_ duration: Duration) async -> Bool {
        do {
            try await Task.sleep(for: duration)
            return !Task.isCancelled
        } catch {
            return false
        }
    }
}

/// Mirrors the web's wrapping word row, including the row and column spacing.
private struct VoiceBloomWords: Layout {
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        let (positions, sizes) = placements(width: width, subviews: subviews)
        let usedWidth = zip(positions, sizes).map { $0.x + $1.width }.max() ?? 0
        return CGSize(width: proposal.width ?? usedWidth, height: (positions.last?.y ?? -22.95) + 22.95)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let (positions, sizes) = placements(width: bounds.width, subviews: subviews)
        for index in subviews.indices {
            subviews[index].place(at: CGPoint(x: bounds.minX + positions[index].x, y: bounds.minY + positions[index].y),
                                  anchor: .topLeading,
                                  proposal: ProposedViewSize(width: sizes[index].width, height: 22.95))
        }
    }

    private func placements(width: CGFloat, subviews: Subviews) -> ([CGPoint], [CGSize]) {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        var x: CGFloat = 0
        var y: CGFloat = 0
        let positions = sizes.map { size in
            if x > 0 && x + size.width > width {
                x = 0
                y += 26.95
            }
            let origin = CGPoint(x: x, y: y)
            x += size.width + 5
            return origin
        }
        return (positions, sizes)
    }
}

private struct VoiceBloomWord: View {
    let word: String
    let delay: Double
    let reduceMotion: Bool
    @State private var visible = false

    var body: some View {
        Text(word)
            .font(DesignFont.bundled("GeistMono-Medium", size: 17, fallback: .system(size: 17, weight: .medium, design: .monospaced)))
            .tracking(-0.425)
            .foregroundStyle(.black)
            .fixedSize()
            .frame(height: 22.95)
            .offset(y: visible || reduceMotion ? 0 : 8)
            .blur(radius: visible || reduceMotion ? 0 : 5)
            .opacity(visible || reduceMotion ? 1 : 0)
            .onAppear {
                withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.66).delay(delay)) {
                    visible = true
                }
            }
    }
}

private struct VoiceBloomListeningPulse: View {
    @State private var pulsing = false

    var body: some View {
        Capsule()
            .fill(.black.opacity(0.20))
            .scaleEffect(pulsing ? 1.14 : 0.94)
            .opacity(pulsing ? 0 : 0.28)
            .onAppear { withAnimation(.easeOut(duration: 1.8)) { pulsing = true } }
    }
}

private struct VoiceBloomMic: View {
    let muted: Bool

    var body: some View {
        Canvas { context, _ in
            var icon = Path()
            func line(_ x0: CGFloat, _ y0: CGFloat, _ x1: CGFloat, _ y1: CGFloat) {
                icon.move(to: CGPoint(x: x0, y: y0))
                icon.addLine(to: CGPoint(x: x1, y: y1))
            }
            func arc(_ x: CGFloat, _ y: CGFloat, _ radius: CGFloat, from: Double, to: Double, clockwise: Bool = false) {
                icon.addArc(center: CGPoint(x: x, y: y), radius: radius,
                            startAngle: .degrees(from), endAngle: .degrees(to), clockwise: clockwise)
            }
            line(12, 19, 12, 22)
            if muted {
                line(2, 2, 22, 22)
                line(15, 9.34, 15, 5)
                arc(12, 5, 3, from: 0, to: -153.68, clockwise: true)
                icon.move(to: CGPoint(x: 16.95, y: 16.95))
                arc(12, 12, 7, from: 45, to: 180)
                icon.addLine(to: CGPoint(x: 5, y: 10))
                icon.move(to: CGPoint(x: 18.89, y: 13.23))
                arc(12, 12, 7, from: 10.12, to: 0, clockwise: true)
                icon.addLine(to: CGPoint(x: 19, y: 10))
                icon.move(to: CGPoint(x: 9, y: 9))
                icon.addLine(to: CGPoint(x: 9, y: 12))
                arc(12, 12, 3, from: 180, to: 45, clockwise: true)
            } else {
                icon.move(to: CGPoint(x: 19, y: 10))
                icon.addLine(to: CGPoint(x: 19, y: 12))
                arc(12, 12, 7, from: 0, to: 180)
                icon.addLine(to: CGPoint(x: 5, y: 10))
                icon.addRoundedRect(in: CGRect(x: 9, y: 2, width: 6, height: 13), cornerSize: CGSize(width: 3, height: 3))
            }
            context.stroke(icon, with: .color(.white), style: StrokeStyle(lineWidth: 1, lineCap: .round, lineJoin: .round))
        }
        .frame(width: 24, height: 24)
        .accessibilityHidden(true)
    }
}
