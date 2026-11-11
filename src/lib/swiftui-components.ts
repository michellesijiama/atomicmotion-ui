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
    usage: "Render OrganicUI() as a screen. Its native podcast assistant uses the package's bundled editorial illustrations.",
    previewDescription: "Ask for a podcast, browse matches, and open an episode.",
  },
  "jardin-opening": {
    sourceFile: "JardinOpening.swift",
    usage: "Render JardinOpening() in a landscape iPad view. Use onEnter to continue to your next screen.",
    previewDescription: "Watch the illustrated title draw in, then tap Click to continue.",
  },
} as const;

export type SwiftUIComponentId = keyof typeof swiftUIComponents;

export function hasSwiftUI(id: string): id is SwiftUIComponentId {
  return Object.hasOwn(swiftUIComponents, id);
}
