# AtomicMotion UI Design Spec

## Goal

Build `AtomicMotion UI`, an open-source micro-interaction component library and showcase site. The library should feel premium, be easy for other developers and LLM agents to read, and distribute each core component as a single copy-pasteable file.

## Visual Direction

Use the reference page `https://yiqyan.xyz/game_concept_assassin` as the primary visual source. The site should adapt its black-background portfolio style rather than clone its content.

Core visual traits:

- Black canvas with white and muted gray text.
- Small, restrained sans-serif typography.
- A fixed left-side index panel on desktop.
- Thin divider lines and sparse metadata.
- Large right-side showcase panels that feel like archived design plates.
- Minimal ornamentation, no marketing-style hero, no decorative gradient blobs.

The homepage should read like a design archive for motion components: quiet, technical, and premium.

## Product Scope

The first release contains:

- A Next.js App Router website.
- Tailwind CSS styling.
- Framer Motion-powered interactive demos.
- Three core component files:
  - `magnet-button.tsx`
  - `fluid-tabs.tsx`
  - `elastic-drag.tsx`
- A consumer context file at `.claudecode/context.md`.
- A README with project purpose, install/run commands, and copy-paste usage guidance.

Out of scope for this pass:

- Package publishing to npm.
- Full documentation routing.
- Component registry CLI.
- Authentication, analytics, or backend services.
- Pixel-perfect cloning of the reference site's images or personal content.

## Architecture

The project lives under `atomicmotion-ui/`.

Expected structure:

```text
atomicmotion-ui/
├── .claudecode/
│   └── context.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── elastic-drag.tsx
│   │   │   ├── fluid-tabs.tsx
│   │   │   └── magnet-button.tsx
│   │   └── website/
│   │       ├── component-plate.tsx
│   │       └── site-index.tsx
│   ├── lib/
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

`src/components/ui/*` files are the library surface. Each file must contain its own exported component, local types, and minimal helper logic. They may import React, Framer Motion, and the local `cn` helper, but must avoid cross-importing from other UI components.

`src/components/website/*` files are showcase-only. They may compose the UI components and contain visual scaffolding for the landing page.

## Component Behavior

### MagnetButton

`MagnetButton` reacts to pointer movement by pulling its content toward the cursor. On pointer leave, it springs back to center. It exposes common button props and keeps interaction state local.

### FluidTabs

`FluidTabs` renders a compact tab set with a liquid moving indicator. It owns active tab state by default and supports an optional controlled value API.

### ElasticDrag

`ElasticDrag` renders a draggable object that stretches, rotates, and returns with spring physics. The demo should make the behavior obvious without needing instructions.

## Homepage Experience

Desktop:

- Left rail is fixed and about one-third of the viewport width.
- Left rail contains project name, one-sentence positioning, short metadata, component index rows, install command, GitHub status, and footer location/date-style metadata.
- Right content starts after the left rail and stacks large showcase plates vertically.
- Each plate contains a large interactive demo, compact metadata, and a short copy command.

Mobile:

- Left rail becomes a top section.
- Component plates stack beneath it.
- Demos remain usable with touch input.
- Text must not overlap or overflow controls.

## Error Handling And Accessibility

- Components must degrade gracefully when pointer events are unavailable.
- Buttons and tabs must remain keyboard accessible.
- Motion should respect `prefers-reduced-motion` where practical.
- Interactive elements need visible focus states.

## Testing And Verification

Verification for this pass:

- `npm run lint`
- `npm run build`
- Local dev server on localhost.
- Browser smoke check of the homepage at desktop and mobile widths.
- Confirm that all three demos are visible and interactive.

## Git And Release Setup

Create a private GitHub repository named `atomicmotion-ui` if GitHub CLI authentication is available. Push the local project to that private repo. If repository creation fails because of authentication or account permissions, leave the local Git repo complete and report the exact blocker.
