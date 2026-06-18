# Window Leaf Shadow Design

## Goal

Create a copy-paste UI background component inspired by natural leaves casting shadows from behind a window shade, sheer curtain, or frosted glass. The visual should be light, soft, botanical, and atmospheric.

The component must be pure code. It must not depend on image files, remote assets, canvas, or generated bitmaps.

## Component

Create `src/components/ui/window-leaf-shadow.tsx`.

The component should export:

```ts
export type WindowLeafShadowTone = "linen" | "mist" | "sage";

export type WindowLeafShadowProps = {
  tone?: WindowLeafShadowTone;
  grain?: number;
  blur?: number;
  shadeOpacity?: number;
  shadowOpacity?: number;
  interactive?: boolean;
  wind?: boolean;
  className?: string;
  children?: React.ReactNode;
};
```

Default props should produce the reference look:

- `tone="mist"`
- `grain=0.12`
- `blur=9`
- `shadeOpacity=0`
- `shadowOpacity=0.52`
- `interactive=true`
- `wind=true`

## Visual System

The component should be built from CSS/SVG layers:

- base layer: cool gray mist by default, with optional warm linen or light sage tones,
- the default mist base should blend with the host page background using `var(--jitter-bg, #f5f5f5)` instead of drawing a separate filled rectangle,
- light layer: soft gray-white daylight gradients,
- botanical layer: inline SVG branches and leaf silhouettes drawn with paths and ellipses,
- branch details must stay embedded inside leaf clusters; avoid standalone thick branch strokes that read as visible lines,
- blur layer: the botanical SVG is blurred so the leaves feel behind a shade or glass,
- wind layer: leaf clusters and branches move slowly by default with independent, asynchronous sway animations,
- interaction layer: pointer movement increases the natural motion intensity and adds small per-depth offsets, without moving the whole scene as one flat image,
- shade layer: subtle horizontal/vertical light bands that suggest a window shade or sheer curtain,
- grain layer: low-strength inline SVG noise data URI using `feTurbulence`,
- vignette layer: extremely soft edge falloff.

The output should feel like real leaf shadows behind a bright window treatment. The leaves should be recognizable as natural leaf shapes, but softened enough that they do not read as icons.

## Copy-Paste Rules

The distributable file should be self-contained:

- no imported image,
- no external CSS file,
- no package dependency beyond React and existing project utilities,
- works as a wrapper around `children`,
- can be edited by changing prop values, palette values, or SVG leaf groups.

It may use `cn` from `@/lib/utils`, matching existing UI files.

## Website Integration

Add the component as a new website entry after `Noisy Analog Card`.

Registry metadata:

- id: `window-leaf-shadow`
- index: `005`
- title: `Window Leaf Shadow`
- category: `Atmosphere`
- status: `NEW`
- code path: `src/components/ui/window-leaf-shadow.tsx`

The showcase should display only the generated background surface, without text overlays, so users can inspect the leaves directly.

## Testing

Extend `scripts/verify-jitter-design-system.mjs` to verify:

- the UI component file exists,
- it exports `WindowLeafShadow`,
- it defines `WindowLeafShadowTone`,
- it includes `grain`, `blur`, `shadeOpacity`, `shadowOpacity`, and `interactive` props,
- it includes a `wind` prop for autonomous motion,
- it responds to pointer movement by increasing subtle per-branch and per-leaf-cluster motion,
- it avoids standalone thick branch lines,
- it includes SVG leaf/branch primitives,
- it uses inline SVG turbulence for grain,
- it does not reference external image URLs,
- the registry includes the component path and title,
- the homepage renders the component.

Run:

- `npm run test:design`
- `npm run lint`
- `npm run build`

Browser verification should confirm that the component card appears and exposes `View code`, `Copy for AI`, and `Raw file`.

## Non-Goals

- No image upload.
- No canvas renderer.
- No generated bitmap assets.
- No interactive control panel in this first version.
