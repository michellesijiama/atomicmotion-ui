# Noisy Analog Card Design Spec

## Goal

Add `NoisyAnalogCard` as the fourth AtomicMotion UI component. It should be a premium frosted analog card with generated grain, tint, glow, and border controls. The component must remain copy-paste friendly and live in a single UI file.

## Confirmed Direction

The selected visual direction is **A. Noisy Glass Controls**.

The card should feel like a translucent analog material inside the existing black/white archive site:

- frosted glass depth
- soft static grain
- adjustable color wash
- subtle highlight glow
- restrained 8px-or-less radius
- no decorative blobs outside the component
- no image assets required

## Product Scope

This pass includes:

- `src/components/ui/noisy-analog-card.tsx`
- a website-only control panel for live adjustment
- a new homepage `ComponentPlate` for Noisy Analog Card
- a new SiteIndex entry
- README/context updates

This pass does not include:

- a full code generator
- exporting presets as files
- npm publishing
- a separate route or docs page

## Component API

`NoisyAnalogCard` should expose:

- `opacity?: number`
- `blur?: number`
- `grain?: number`
- `grainScale?: number`
- `tint?: string`
- `highlight?: string`
- `borderOpacity?: number`
- `hoverTilt?: number`
- `className?: string`
- `children?: React.ReactNode`

Numeric props use intuitive ranges in the demo:

- `opacity`: `0.1` to `0.9`
- `blur`: `0` to `28`
- `grain`: `0` to `1`
- `grainScale`: `0.5` to `2.5`
- `borderOpacity`: `0` to `1`
- `hoverTilt`: `0` to `10`

The component should set CSS custom properties internally so styles remain readable and easy to copy.

## Demo Controls

The homepage plate should include a client-side playground with:

- range slider for opacity
- range slider for blur
- range slider for grain
- range slider for grain scale
- range slider for border opacity
- range slider for hover tilt
- color swatches for tint
- color swatches for highlight
- reset button

The controls belong in `src/components/website/noisy-card-playground.tsx`, not inside the core UI component.

## Interaction

The card should:

- tilt gently on pointer movement when `hoverTilt > 0`
- return to rest on pointer leave
- respect `prefers-reduced-motion`
- preserve keyboard/focus accessibility for controls

The playground should update the card in real time.

## Architecture

Follow existing project boundaries:

- `src/components/ui/*`: copy-paste components only
- `src/components/website/*`: showcase composition and controls
- `src/app/page.tsx`: page composition
- `src/components/website/site-index.tsx`: component navigation list

`NoisyAnalogCard` may import React, Framer Motion, and `@/lib/utils`. It must not import other UI components.

## Visual Fit

The new plate should preserve the current site language:

- black metadata shell
- white archive plate area
- compact mono labels
- thin borders
- dense but readable controls

The card preview itself can use subtle teal/white highlights, but the whole page should not become a one-note teal or gradient theme.

## Verification

Run:

- `npm run lint`
- `npm run build`

Browser checks:

- homepage still loads on `http://localhost:3000`
- SiteIndex includes `Noisy Analog Card`
- fourth plate is reachable from the index
- sliders update visible card style
- color swatches update tint/highlight
- reset returns defaults
- mobile viewport has no horizontal overflow
