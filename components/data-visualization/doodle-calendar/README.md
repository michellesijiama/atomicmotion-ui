# Doodle Calendar

A monochrome daily diary about life in Japan: coffee, bento, exercise, commuting, rainy walks and home rituals. Seven generated illustrations use thin textured black pencil strokes with fully transparent interiors. Caveat handwriting and a borderless transparent note area and a pencil action below the card make it feel like a sketchbook. Top Home and Filter buttons return to the full month and filter saved notes by everyday topics, keeping dates in place and fading non-matching entries. Each card shows the full weekday above the date number. A fixed, softly connected control below the cards places the pencil between previous and next arrows. Rounded date cards sit side by side with visible neighboring edges; swiping moves the strip and snaps to the next date. Thursday is today: its page starts blank under a blue circle, and the drawing sketched for it is blue; other dates keep black illustrations, including when opened; Friday onward stays empty. Tapping a date grows its circle into the card and closing shrinks it back; swipes keep their speed and the drawings drift slightly behind the paper. The pencil opens a writing state: press Sketch it, a soft blue light runs along the inside of the card’s edge, then the new drawing wipes in. The demo previews a matching prepared sketch; an optional image-service callback supports real generation. Notes and illustrated calendar thumbnails stay saved on this device.

![Doodle Calendar preview](https://raw.githubusercontent.com/michellesijiama/atomicmotion-ui/main/public/previews/doodle-calendar.png)

- **Category:** Data Visualization
- **Demo:** https://atomicmotion.dev/components/doodle-calendar
- **Dependencies:** clsx, framer-motion, lucide-react, tailwind-merge

## Setup

Use React 19, TypeScript and **Tailwind CSS 4**. Class names use v4 features, including container queries; Tailwind v3 is not a drop-in equivalent.
Enable Tailwind in your app stylesheet (`@import "tailwindcss";`) and make sure it scans the folder where you copy the component. See [the integration guide](../../../docs/COPY-PASTE.md).

Install the compatible dependency ranges tested by this repository:

```bash
npm install clsx@^2.1.1 framer-motion@^12.40.0 lucide-react@^1.18.0 tailwind-merge@^3.6.0
```

## Usage

Save this example beside the copied source file, or adjust the relative import to its new location:

```tsx
"use client";

import { DoodleCalendar } from "./doodle-calendar";

export function Demo() {
  return (
    <div className="@container h-[36rem] w-full">
      <DoodleCalendar />
    </div>
  );
}
```

The wrapper provides a bounded preview area. Resize it or pass `className` to fit your app. Leave demo `loop` mode off when you want manual interaction (see defaults below).

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `today` | `number` | `13` | The day the calendar treats as today (August 2026), 1–31. Days before it are open; days after it are charcoal rings. |
| `loop` | `boolean` | `false` | Open the days one after another until someone touches it (the gallery card sets it). |
| `onSelect` | `(day: CalendarDay) => void` | — | A day's page was opened — by a click, the keyboard, or the loop. |
| `className` | `string` | — | Additional classes for the root container. |
| `onGenerateImage` | `(note: string, day: CalendarDay) => Promise<string>` | — | Optional real image service. Without this, Preview sketch uses prepared demo art. |

Named export: `DoodleCalendar`. Public types: `MomentKind`, `CalendarDay`, `DoodleCalendarProps`.

## Required assets

The component code is one file, but it also loads these files at runtime:

- [public/illustrations/doodle-calendar-diary/coffee.webp](../../../public/illustrations/doodle-calendar-diary/coffee.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/coffee-thumb.webp](../../../public/illustrations/doodle-calendar-diary/coffee-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/bento.webp](../../../public/illustrations/doodle-calendar-diary/bento.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/bento-thumb.webp](../../../public/illustrations/doodle-calendar-diary/bento-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/exercise.webp](../../../public/illustrations/doodle-calendar-diary/exercise.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/exercise-thumb.webp](../../../public/illustrations/doodle-calendar-diary/exercise-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/train.webp](../../../public/illustrations/doodle-calendar-diary/train.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/train-thumb.webp](../../../public/illustrations/doodle-calendar-diary/train-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/rain.webp](../../../public/illustrations/doodle-calendar-diary/rain.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/rain-thumb.webp](../../../public/illustrations/doodle-calendar-diary/rain-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/home.webp](../../../public/illustrations/doodle-calendar-diary/home.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/home-thumb.webp](../../../public/illustrations/doodle-calendar-diary/home-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/shrine.webp](../../../public/illustrations/doodle-calendar-diary/shrine.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.
- [public/illustrations/doodle-calendar-diary/shrine-thumb.webp](../../../public/illustrations/doodle-calendar-diary/shrine-thumb.webp) — MIT. Generated monochrome diary illustration for AtomicMotion UI.

Copy the component and every required asset, preserving the attribution above.

<!-- Generated by scripts/generate-component-readmes.mjs. Do not edit by hand. -->
