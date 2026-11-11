# AtomicMotionUI for SwiftUI

Native components for iOS and iPadOS 17 or later. AtomicMotionUI uses SwiftUI, UIKit and Metal, and bundles the artwork, fonts and shader source each view needs. See the [MIT license](../LICENSE) and the [asset credits](../ASSETS.md).

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

## Bead Club

Browse the nine desserts, filter by category, and tap a cake to open its ingredient notes. Drag the artwork to tilt it. The SwiftUI view applies perspective and animated glints to the cake faces rendered from the web component. The app uses the device's own status bar and safe areas.

```swift
import AtomicMotionUI
import SwiftUI

struct BeadClubExample: View {
    var body: some View {
        BeadClub()
    }
}
```

The Swift package bundles the menu and artwork. See the [cake artwork terms](Sources/AtomicMotionUI/Beads/BeadArtwork-TERMS.txt) for reuse. To refresh them after editing the React menu or renderer, run `node scripts/export-swiftui-beads.mjs http://localhost:3100` against the local gallery.

## Stamp Tracker

Render `StampTracker()` in a view with a bounded height. Swipe between the four habit cards, switch between Day, Week and Month, and tap a date to add or remove its stamp. Supply `today` for a different reference date and `onChange` to receive the habit, ISO date and stamped state.

## Doodle Calendar

Render `DoodleCalendar()` in a view with a bounded height. Open a date to see its drawing or write a note, swipe between dates, or use the month filter to find a recurring illustration. The diary saves locally by default. Use `DoodleCalendar(persist: false)` for an unsaved demo.

## Gradient Event Card

Render `GradientEventCard()` to show the eight sample events. Supply your own `[GradientEventCard.Event]`, use `onSelect` to follow the centered event, and pass `onShare` to override the system share sheet. The original aura patterns run in Metal, and Reduce Motion holds them still.

## Organic UI

Render `OrganicUI()` as a screen. Tap the microphone to run the podcast search demo, swipe the results and open an episode. The example runs a scripted transcript and links to the publisher's episode page. The package bundles the editorial images.

## Jardin Opening

Render `JardinOpening()` in a landscape iPad view. The title draws over the layered garden before the invitation appears. Pass `onEnter` to continue into your app.

The native previews use Geist from the [Geist font project](https://github.com/vercel/geist-font) under [SIL OFL 1.1](Sources/AtomicMotionUI/Design/Geist-OFL.txt) and icons from [Lucide](https://lucide.dev/) under the [bundled Lucide license](Sources/AtomicMotionUI/Design/Lucide-LICENSE.txt).

The package also includes [Caveat](Sources/AtomicMotionUI/DoodleCalendar/Caveat-OFL.txt), [Instrument Serif](Sources/AtomicMotionUI/Design/InstrumentSerif-OFL.txt), [Manrope](Sources/AtomicMotionUI/Design/Manrope-OFL.txt) and [Poppins](Sources/AtomicMotionUI/Design/Poppins-OFL.txt), each under SIL OFL 1.1.
