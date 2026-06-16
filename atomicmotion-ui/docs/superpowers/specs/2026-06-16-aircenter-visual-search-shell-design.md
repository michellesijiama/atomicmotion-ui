# Aircenter Visual Search Shell Design

## Goal

Rebuild the AtomicMotion UI website shell so it feels like the Aircenter visual-search page, not just an Aircenter-colored component list. The site should keep AtomicMotion UI as a component library, but present components through a full-screen architectural search interface.

## Reference Behaviors To Copy

- A very thin fixed top header instead of a large side navigation rail.
- A compact logo area, count chip, and tiny primary action similar to "Filter by parameters".
- A full-height white visual-search canvas as the main surface.
- Component entries represented as small map/building markers instead of large stacked cards.
- A dense floor/section selector language: `SELECT`, `FLOOR`, and short grouped labels.
- Tiny Onest typography: roughly 10px for most UI and roughly 8px for micro-buttons.
- Minimal ornament: transparent layers, very light black fills, no decorative cards.
- Tooltip/detail behavior around markers for inspecting a component.

## Proposed Architecture

The existing UI components in `src/components/ui/*` remain copy-paste library primitives and should not be redesigned for this shell change. The website layer becomes a visual-search composition that arranges those primitives as preview content inside an Aircenter-like system.

Create or update website-only components:

- `SiteHeader`: fixed thin header with brand, component count, GitHub link, and filter action.
- `VisualSearchShell`: full-screen white canvas that owns marker layout, selected component state, and responsive structure.
- `ComponentMarker`: small Aircenter-like marker for each component, with index and short label.
- `ComponentInspector`: floating/detail panel showing the selected component metadata, command, and live preview.
- `FilterPanel`: Aircenter-like parameter panel, used especially for Noisy Analog Card controls.

## Page Layout

Desktop layout:

- Header height should be close to Aircenter's compact header, about 40px.
- Main content fills the viewport under the header.
- The canvas contains a faint architectural/grid plan, not stacked component cards.
- Component markers are positioned across the canvas with small labels such as `001`, `002`, `003`, `004`.
- A compact selector block appears near the lower or side edge with labels like `SELECT`, `GROUP`, `CORE`, `MOTION`, `MATERIAL`.
- Selecting a marker opens a hard-edged inspector panel with the component preview.

Mobile layout:

- Keep the header compact.
- Replace absolute marker spread with a vertical but still Aircenter-like selector list.
- Inspector becomes the primary visible surface after selecting a component.
- Avoid nested cards and oversized marketing sections.

## Component Mapping

- `001 Magnet Button`: marker and inspector preview with two MagnetButton examples.
- `002 Fluid Tabs`: marker and inspector preview with the existing tab primitive.
- `003 Elastic Drag`: marker and inspector preview with the draggable primitive.
- `004 Noisy Analog Card`: marker and inspector preview with the live noisy controls.

The Noisy Analog Card controls should look like Aircenter parameters: compact rows, square color cells, minimal labels, and a filter-panel feel instead of a card settings sidebar.

## Interaction Model

- Default selected marker: `004 Noisy Analog Card`, because it is the newest feature the user is actively shaping.
- Hovering a marker shows a small tooltip with component name and status.
- Clicking a marker changes the inspector content.
- The filter action in the header toggles or focuses the parameter panel.
- No navigation anchors are required for the primary experience, but component ids can remain for deep links where practical.

## Styling Rules

- Use Onest via `next/font/google`.
- Use white canvas, black text, and reference gray `#8d8d8d`.
- Use tiny type consistently: `text-[10px]` for labels, `text-[8px]` or equivalent for small buttons.
- Use marker boxes around `17px` to `24px`, with `rgba(0,0,0,.08)`-style fills.
- Avoid large sidebars, rounded cards, gradient backgrounds, and decorative hero sections.
- Keep border radius at `0px` to `3px` only where the reference uses tiny rounding.

## Testing And Verification

- Update the existing design verification script so it checks for the visual-search shell terms and component files, not just token-level style.
- Run `npm run test:design`.
- Run `npm run lint`.
- Run `npm run build`.
- Use the in-app browser on `http://localhost:3000/` to verify the computed font, white background, header, marker canvas, and Noisy control behavior.

## Non-Goals

- Do not clone Aircenter branding, real estate data, images, or copy.
- Do not fetch or embed private Aircenter assets.
- Do not change the public API of `src/components/ui/*`.
- Do not add a marketing landing page.
