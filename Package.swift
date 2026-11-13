// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AtomicMotionUI",
    platforms: [.iOS(.v17)],
    products: [.library(name: "AtomicMotionUI", targets: ["AtomicMotionUI"])],
    targets: [
        .target(
            name: "AtomicMotionUI",
            path: "swiftui/Sources/AtomicMotionUI",
            resources: [
                .process("Stickers"),
                .process("Design"),
                .process("Beads"),
                .copy("DoodleCalendar"),
                .copy("GradientEvent"),
                .copy("OrganicUI"),
                .process("JardinOpening"),
                .copy("GradientGummy"),
                .copy("BlossomLight"),
                .process("ParticleAudio")
            ]
        )
    ]
)
