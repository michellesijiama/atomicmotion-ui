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
  className?: string;
  children?: React.ReactNode;
};
```

Default props should produce the reference look:

- `tone="linen"`
- `grain=0.12`
- `blur=9`
- `shadeOpacity=0.22`
- `shadowOpacity=0.58`

## Visual System

The component should be built from CSS/SVG layers:

- base layer: warm off-white, pale mist, or light sage tone,
- light layer: soft cream daylight gradients,
- botanical layer: inline SVG branches and leaf silhouettes drawn with paths and ellipses,
- blur layer: the botanical SVG is blurred so the leaves feel behind a shade or glass,
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

The showcase should display the background as the main surface, with minimal overlay content so users can inspect the leaves and shade bands.

## Testing

Extend `scripts/verify-jitter-design-system.mjs` to verify:

- the UI component file exists,
- it exports `WindowLeafShadow`,
- it defines `WindowLeafShadowTone`,
- it includes `grain`, `blur`, `shadeOpacity`, and `shadowOpacity` props,
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
