export const swiftUIComponents = {
  "soft-menu-reveal": {
    sourceFile: "SoftMenuReveal.swift",
    previewDescription: "Open the frosted menu, choose a row, and close it again.",
  },
  "sticker-peel": {
    sourceFile: "StickerPeel.swift",
    previewDescription: "Tap to place a sticker, peel and drag another onto the journal, and switch collections.",
  },
} as const;

export type SwiftUIComponentId = keyof typeof swiftUIComponents;

export function hasSwiftUI(id: string): id is SwiftUIComponentId {
  return Object.hasOwn(swiftUIComponents, id);
}
