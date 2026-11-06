# AtomicMotionUI for SwiftUI

Two native components for iOS and iPadOS 17 or later. AtomicMotionUI uses system SwiftUI and UIKit APIs and bundles its original sticker artwork. See the [MIT license](../LICENSE).

## Add to Xcode

1. Choose **File → Add Package Dependencies** and enter `https://github.com/michellesijiama/atomicmotion-ui.git`.
2. Select the `main` branch and add the **AtomicMotionUI** product to your app target.
3. For a local checkout, use **Add Local** and select the repository root containing `Package.swift`.

## Soft Menu Reveal

The binding lets your app control when the menu opens. Supply your own title, items and contact address, and handle navigation in the selection callback.

```swift
import AtomicMotionUI
import SwiftUI

struct MenuExample: View {
    @State private var menuOpen = false

    var body: some View {
        SoftMenuReveal(isOpen: $menuOpen) { item in
            // Open the destination for item.id.
        }
        .padding()
    }
}
```

## Sticker Peel

Tap to place, drag to position, or drop a sticker on the bin to return it to its collection. The binding stores sticker IDs, labels, rotations and positions normalized to the paper. Your app can persist those values and restore them through the binding. The four collections ship as package resources, so use the package when integrating this component.

```swift
import AtomicMotionUI
import SwiftUI

struct JournalExample: View {
    @State private var stickers: [StickerPeel.Placement] = []

    var body: some View {
        ScrollView {
            StickerPeel(placements: $stickers)
                .frame(height: 650)
                .padding()
        }
    }
}
```

To refresh the native stickers after editing the React artwork, run `node scripts/export-swiftui-stickers.mjs http://localhost:3100` against the local gallery. The PNGs preserve the printed faces of the original SVG stickers. The native component draws the peel during a drag.

The native previews use Geist from the [Geist font project](https://github.com/vercel/geist-font) under [SIL OFL 1.1](Sources/AtomicMotionUI/Design/Geist-OFL.txt) and icons from [Lucide](https://lucide.dev/) under the [bundled Lucide license](Sources/AtomicMotionUI/Design/Lucide-LICENSE.txt).
