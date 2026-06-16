# Light Mode Default Design Spec

## Goal

Convert AtomicMotion UI from a black default website into a light-mode default website.

## Confirmed Scope

The selected direction is **A: direct default light mode**.

This means:

- no theme toggle
- no system-theme switching
- the public website loads in light mode by default
- the existing archive/index layout remains intact
- component demos may still use dark surfaces when the component needs contrast

## Visual Direction

The site should become a quiet light archive:

- page background: warm off-white / paper white
- primary text: near black
- secondary text: neutral gray
- borders: thin black with low opacity
- index rail: light surface, still fixed on desktop
- component plates: light shells with crisp dividers

Avoid:

- beige-heavy palette
- colorful marketing gradients
- oversized hero styling
- nested card-heavy redesign

## Files To Update

- `atomicmotion-ui/src/styles/globals.css`
- `atomicmotion-ui/src/app/layout.tsx`
- `atomicmotion-ui/src/app/page.tsx`
- `atomicmotion-ui/src/components/website/site-index.tsx`
- `atomicmotion-ui/src/components/website/component-plate.tsx`
- `atomicmotion-ui/src/components/website/noisy-card-playground.tsx`

## Behavior

No behavior changes are required. All component interactions should continue working:

- Magnet Button
- Fluid Tabs
- Elastic Drag
- Noisy Analog Card controls

## Accessibility

Light mode must preserve:

- readable text contrast
- visible focus states
- no horizontal overflow on mobile
- hover/focus states for navigation and controls

## Verification

Run:

- `npm run lint`
- `npm run build`

Browser checks:

- `http://localhost:3000` loads
- overall page is light by default
- left index is light and readable
- all four component plates remain reachable
- Noisy Analog Card controls remain usable
- mobile viewport has no horizontal overflow
