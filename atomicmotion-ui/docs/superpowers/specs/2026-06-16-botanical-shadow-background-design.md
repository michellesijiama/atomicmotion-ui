# Botanical Shadow Background Design

## Goal

Create a copy-paste UI background component inspired by a blurred botanical film photograph: blue-gray tone, soft cream highlights, plant-like shadow clusters, grain, and subtle vignette.

The component must be pure code. It must not depend on image files, remote assets, canvas, or generated bitmaps.

## Component

Create `src/components/ui/botanical-shadow-bg.tsx`.

The component should export:

```ts
export type BotanicalShadowTone = "slate" | "warm" | "moss";

export type BotanicalShadowBackgroundProps = {
  tone?: BotanicalShadowTone;
  grain?: number;
  blur?: number;
  contrast?: number;
  className?: string;
  children?: React.ReactNode;
};
```

Default props should produce the reference look:

- `tone="slate"`
- `grain=0.24`
- `blur=28`
- `contrast=1`

## Visual System

The component should be built from CSS/SVG layers:

- base layer: muted blue-gray or tone-specific background,
- bloom layer: large soft cream radial gradients,
- botanical shadow layer: clustered dark radial gradients that suggest out-of-focus leaves or flowers,
- grain layer: inline SVG noise data URI using `feTurbulence`,
- vignette layer: edge darkening and slight analog falloff.

The output should feel photographic and atmospheric, not illustrative. Shapes should remain blurred and abstract.

## Copy-Paste Rules

The distributable file should be self-contained:

- no imported image,
- no external CSS file,
- no package dependency beyond React and existing project utilities,
- works as a wrapper around `children`,
- can be edited by changing prop values or layer arrays.

It may use `cn` from `@/lib/utils`, matching existing UI files.

## Website Integration

Add the component as a new website entry after `Noisy Analog Card`.

Registry metadata:

- id: `botanical-shadow-background`
- index: `005`
- title: `Botanical Shadow Background`
- category: `Atmosphere`
- status: `NEW`
- code path: `src/components/ui/botanical-shadow-bg.tsx`

The showcase should display the background as the main surface, with minimal overlay content so users can inspect the texture.

## Testing

Extend `scripts/verify-jitter-design-system.mjs` to verify:

- the UI component file exists,
- it exports `BotanicalShadowBackground`,
- it defines `BotanicalShadowTone`,
- it includes `grain`, `blur`, and `contrast` props,
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
