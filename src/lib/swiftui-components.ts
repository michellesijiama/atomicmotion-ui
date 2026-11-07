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
} as const;

export type SwiftUIComponentId = keyof typeof swiftUIComponents;

export function hasSwiftUI(id: string): id is SwiftUIComponentId {
  return Object.hasOwn(swiftUIComponents, id);
}
