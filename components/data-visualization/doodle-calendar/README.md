# Doodle Calendar

A sketchbook-style diary for everyday life in Japan. Swipe through dates, write a note, and tap Sketch it to preview a matching pencil illustration. Today is highlighted in blue, and your entries stay saved on this device.

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
| `loop` | `boolean` | `false` | Demonstrate writing and submitting a rainy-day note until someone touches it. Demo notes are never saved. |
| `persist` | `boolean` | `true` | Save this diary on the device. Set false for an isolated gallery demonstration. |
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
