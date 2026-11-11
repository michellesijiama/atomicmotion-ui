export const SWIFT_PACKAGE_REPO = "https://github.com/michellesijiama/atomicmotion-ui";

export const swiftUIComponents = {
  "soft-menu-reveal": {
    sourceFile: "SoftMenuReveal.swift",
    usage: "Declare @State private var menuOpen = false and render SoftMenuReveal(isOpen: $menuOpen).",
    previewDescription: "Open the frosted menu, choose a row, and close it again.",
  },
  "sticker-peel": {
    sourceFile: "StickerPeel.swift",
    usage: "Declare @State private var stickers: [StickerPeel.Placement] = [] and render StickerPeel(placements: $stickers).",
    previewDescription: "Tap to place a sticker, peel and drag another onto the journal, and switch collections.",
  },
  "bead-club": {
    sourceFile: "BeadClub.swift",
    usage: "Render BeadClub() in a screen with a bounded height. The menu and artwork load from the Swift package.",
    previewDescription: "Scroll through the cake menu, filter by category, and drag an expanded cake to tilt it.",
  },
  "stamp-tracker": {
    sourceFile: "StampTracker.swift",
    usage: "Render StampTracker() in a view with a bounded height. Use onChange to receive the habit, ISO day and new stamped state.",
    previewDescription: "Open the month, pick a habit, and stamp a day.",
  },
  "doodle-calendar": {
    sourceFile: "DoodleCalendar.swift",
    usage: "Render DoodleCalendar() in a view with a bounded height. Pass persist: false to start a fresh diary each time.",
    previewDescription: "Browse the calendar, filter by illustration, and open a day to write a note.",
  },
  "gradient-event-card": {
    sourceFile: "GradientEventCard.swift",
    usage: "Render GradientEventCard(). Pass an array of GradientEventCard.Event to use your own invitations. Use onSelect and onShare to connect it to your app.",
    previewDescription: "Swipe from the first event to the last, then advance through the animated deck.",
  },
  "organic-ui": {
    sourceFile: "OrganicUI.swift",
    usage: "Render OrganicUI() as a screen. Tap the dot to start the simulated voice search and use the microphone button to refine the results.",
    previewDescription: "Watch the dot open into a listening ring, then swipe the episode cards and refine the search to under 20 minutes.",
  },
  "jardin-opening": {
    sourceFile: "JardinOpening.swift",
    usage: "Render JardinOpening() in a landscape iPad view. Use onEnter to continue to your next screen.",
    previewDescription: "Watch the illustrated title draw in, then tap Click to continue.",
  },
  "halftone-bloom": {
    sourceFile: "HalftoneBloom.swift",
    usage: "Render HalftoneBloom() in a bounded view. Pass value, title, caption and unit to connect your own reading.",
    previewDescription: "Watch the halftone plate reveal the lunar image, then expand its reading.",
  },
  "blossom-light": {
    sourceFile: "BlossomLight.swift",
    usage: "Render BlossomLight() in a bounded view. Pass a wallpaper URL to use your own image, or nil for the bundled procedural leaf shadows.",
    previewDescription: "Adjust brightness and warmth, then restore Adaptive mode. The recording uses the built-in procedural wall.",
  },
  "coffee-gauge": {
    sourceFile: "CoffeeGauge.swift",
    usage: "Render CoffeeGauge(). Pass the latte, espresso and cappuccino values as a tuple.",
    previewDescription: "Open a gauge, change the number of cups and close the log.",
  },
  "voice-bloom": {
    sourceFile: "VoiceBloom.swift",
    usage: "Render VoiceBloom() in a bounded view. Tap the microphone to run the scripted voice demo.",
    previewDescription: "Tap the microphone, watch the reply reveal, and copy or regenerate the answer.",
  },
  "gradient-gummy-bear": {
    sourceFile: "GradientGummyBear.swift",
    usage: "Render GradientGummyBear() in a bounded view. The Swift package contains the original model adaptation, Metal shader, lighting and paragraph artwork.",
    previewDescription: "Drag the translucent lens across the paragraph and watch it return to the center.",
  },
  "geometric-logo-reveal": {
    sourceFile: "GeometricLogoReveal.swift",
    usage: "Render GeometricLogoReveal(). Pass text or mark to use your own wordmark.",
    previewDescription: "Watch the geometric wordmark assemble and replay.",
  },
  "gemini-live": {
    sourceFile: "GeminiLive.swift",
    usage: "Render GeminiLive() in a bounded view. Supply onAction to handle its controls in your app.",
    previewDescription: "See the animated listening surface and its native controls.",
  },
} as const;

export type SwiftUIComponentId = keyof typeof swiftUIComponents;

export function hasSwiftUI(id: string): id is SwiftUIComponentId {
  return Object.hasOwn(swiftUIComponents, id);
}
