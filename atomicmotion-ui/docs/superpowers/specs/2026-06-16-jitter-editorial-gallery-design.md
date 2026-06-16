# Jitter Editorial Gallery Design

## Goal

Update the AtomicMotion UI website to use a Made with Jitter-inspired design system while preserving the current component-library documentation structure.

This is a visual-system migration, not a full page-structure clone. The site should still feel like AtomicMotion UI: a focused open-source micro-interaction component library with copy-paste examples.

## Reference System

Use these Made with Jitter traits:

- Soft neutral page background: `#f5f5f5`.
- Ink text: `#0e1011`.
- Editorial gallery feel: airy sections, white or near-white tiles, compact metadata, and strong typography contrast.
- Categorical color labels rather than heavy decorative gradients.
- Bright accent families:
  - Green: `#15bc64` for `FREE`.
  - Purple: `#7a40ed` for `PRO`.
  - Blue: `#1377e4` for `RE-MADE`.
  - Orange: `#ff8316` for `NEW`.
- Gray scale:
  - `#fafafa`, `#e6e6e6`, `#cccccc`, `#999999`, `#666666`, `#333333`, `#191919`.

## Scope

Update only the website presentation layer:

- Global CSS tokens.
- Root layout body colors.
- `SiteIndex` visual styling.
- `ComponentPlate` visual styling.
- Homepage demo frames in `src/app/page.tsx`.
- `NoisyCardPlayground` panel and control styling.

Do not redesign the source component APIs under `src/components/ui/*`.

## Design Direction

### Page Shell

Keep the current left index and right component showcase layout. Restyle it so it feels closer to an editorial inspiration archive:

- Page background becomes `#f5f5f5`.
- Primary text becomes `#0e1011`.
- The left rail becomes quieter and lighter, with gallery/archive language.
- The component list keeps anchors and current ordering.

### Component Plates

Each component plate should read like a gallery item:

- White or near-white tile surface.
- Softer but still structured borders.
- Compact metadata row with category and availability labels.
- Small colored status pills using the Jitter accent palette.
- More editorial spacing without becoming a marketing landing page.

### Component Metadata

Map current components to Jitter-like status tags:

- `001 Magnet Button`: `FREE`, green.
- `002 Fluid Tabs`: `PRO`, purple.
- `003 Elastic Drag`: `RE-MADE`, blue.
- `004 Noisy Analog Card`: `NEW`, orange.

These labels are visual taxonomy only. They do not change licensing or package behavior.

### Noisy Analog Card Playground

Restyle the playground controls to match the Jitter system:

- White/near-white control panel on `#f5f5f5`.
- Compact metadata labels.
- Square or lightly rounded swatches using the accent palette.
- Keep all existing controls and live behavior: opacity, blur, grain, grain scale, border, hover tilt, tint, highlight, and reset.

## Testing And Verification

- Add or update a lightweight design verification script for the Jitter system.
- Verify tokens and key labels exist in the source.
- Run `npm run lint`.
- Run `npm run build`.
- Open `http://localhost:3000/` and verify the visual state in the in-app browser.

## Non-Goals

- Do not clone Made with Jitter’s exact homepage layout.
- Do not add a new hero/gallery archive structure.
- Do not change the AtomicMotion component APIs.
- Do not add paid/download semantics to the product.
- Do not push changes until implementation and verification are complete.
