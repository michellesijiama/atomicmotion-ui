# AtomicMotion — Design Library

[![CI](https://github.com/michellesijiama/atomicmotion-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/michellesijiama/atomicmotion-ui/actions/workflows/ci.yml)

![Four AtomicMotion UI components: Gemini Live, Gradient Gummy Bear, Emoji Sketch, and Scroll Phase Cursor](docs/images/hero.png)

A design library of expressive interfaces and interactions for designers and
frontend developers. Explore every [live demo](https://atomicmotion.dev) for
free and copy every component’s open-source code.

The components use **React 19, TypeScript and Tailwind CSS 4**. They have no
private gallery imports or Next.js dependency. The gallery itself is a Next.js
app. This repository distributes source, rather than an npm component package;
adapt the code and connect it to your own application behaviour.

## Source access and repositories

All registered components are free and open source under MIT. There are no purchases,
checkout integrations or locked source files.

The public [atomicmotion-free repository](https://github.com/michellesijiama/atomicmotion-free)
contains every registered component, its required runtime assets and setup
instructions. The application repository contains the gallery, editable Blender scenes and
development checks. See [GitHub distribution](docs/github-distribution.md).

[Download the components ZIP](https://github.com/michellesijiama/atomicmotion-free/archive/refs/heads/main.zip)
or [download the full gallery ZIP](https://github.com/michellesijiama/atomicmotion-ui/archive/refs/heads/main.zip).
Both downloads work without private credentials or local environment files.

To prepare a complete component release: `npm run export:free`, then
`node scripts/export-free-library.mjs --verify .artifacts/atomicmotion-free`.
The export excludes application code, secrets and Git history.

## Using a component

1. Choose a component below. Its **README** contains compatible installation
   commands, a working example, props and defaults, and asset requirements.
2. Copy the `.tsx` file into your own source folder. `index.ts` is optional and
   exports the component, public types and presets.
3. Install its listed packages and copy required assets with their attribution.
4. Enable Tailwind CSS 4 in your app and ensure it scans the copied source.
   See the [integration guide](docs/COPY-PASTE.md) for complete setup and common
   problems. No gallery theme stylesheet is required.

For example, after copying `gemini-live.tsx` beside your demo:

```bash
npm install framer-motion@^12.40.0 clsx@^2.1.1 tailwind-merge@^3.6.0
```

```tsx
"use client";

import { GeminiLive } from "./gemini-live";

export function Demo() {
  return (
    <div className="@container h-[36rem] w-full">
      <GeminiLive />
    </div>
  );
}
```

**Copy link** copies the public source URL and **Copy for AI** provides
integration instructions for every component.

## 3D Studio

[Download Little Nap’s Blender file](https://raw.githubusercontent.com/michellesijiama/atomicmotion-ui/main/public/studio/little-nap/little-nap.blend)
or its [animated GIF](https://raw.githubusercontent.com/michellesijiama/atomicmotion-ui/main/public/studio/little-nap/little-nap-soft-hops.gif).
The scene packs its font and procedural materials; no external add-ons or textures are needed.

The `/3d-studio` gallery presents editable Blender scenes alongside the interface
library, using the same card grid and navigation. [Little Nap](scenes/little-nap/README.md)
features five whole, round pig tangyuan floating in clear water in a blue lace bowl.
A twelve-second loop keeps a fixed frontal camera as the bowl slides in.
The piglets briefly open their painted eyes and shiver, then return to sleepy
faces and float in individual rhythms. Soft, volume-preserving shape changes,
little nuzzles, following ripples and moving reflections bring the water to life.
A downloadable GIF and a 1080 × 1440 still accompany the editable scene.
Textured pencil outlines, pale pink and blue washes, fibrous paper, ink following the bowl rim
and warm glowing stars retain the illustration style. The models, shaders,
water waves, camera and three-light rig remain editable. Little Nap's original
scene assets use MIT; the packed Courier Prime typeface uses SIL OFL 1.1.
These scene downloads live in this repository and on the gallery; the
`atomicmotion-free` export remains the React component library.

## Components

<!-- component-catalogue:start -->
| Preview | Component | Category | Source | Setup |
| --- | --- | --- | --- | --- |
| <img src="public/previews/bead-club.png" width="160" alt="Bead Club preview"> | **Bead Club** | Play | [Source](components/play/bead-club/bead-club.tsx) | [README](components/play/bead-club/README.md) |
| <img src="public/previews/ui-walkthrough.png" width="160" alt="UI Walkthrough preview"> | **UI Walkthrough** | Template | [Source](components/template/ui-walkthrough/ui-walkthrough.tsx) | [README](components/template/ui-walkthrough/README.md) |
| <img src="public/previews/jardin-opening.png" width="160" alt="Jardin Opening preview"> | **Jardin Opening** | Immersive | [Source](components/immersive/jardin-opening/jardin-opening.tsx) | [README](components/immersive/jardin-opening/README.md) |
| <img src="public/previews/emoji-sketch.png" width="160" alt="Emoji Sketch preview"> | **Emoji Sketch** | Play | [Source](components/play/emoji-sketch/emoji-sketch.tsx) | [README](components/play/emoji-sketch/README.md) |
| <img src="public/previews/soft-menu-reveal.png" width="160" alt="Soft Menu Reveal preview"> | **Soft Menu Reveal** | Navigation | [Source](components/navigation/soft-menu-reveal/soft-menu-reveal.tsx) | [README](components/navigation/soft-menu-reveal/README.md) |
| <img src="public/previews/filter-dropdown-reveal.png" width="160" alt="Filter Dropdown Reveal preview"> | **Filter Dropdown Reveal** | Navigation | [Source](components/navigation/filter-dropdown-reveal/filter-dropdown-reveal.tsx) | [README](components/navigation/filter-dropdown-reveal/README.md) |
| <img src="public/previews/scroll-scrubbed-typography.png" width="160" alt="Scroll-Scrubbed Typography preview"> | **Scroll-Scrubbed Typography** | Typography | [Source](components/typography/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx) | [README](components/typography/scroll-scrubbed-typography/README.md) |
| <img src="public/previews/codex-sidebar-reveal.png" width="160" alt="Codex Sidebar Reveal preview"> | **Codex Sidebar Reveal** | Navigation | [Source](components/navigation/codex-sidebar-reveal/codex-sidebar-reveal.tsx) | [README](components/navigation/codex-sidebar-reveal/README.md) |
| <img src="public/previews/gemini-live.png" width="160" alt="Gemini Live preview"> | **Gemini Live** | AI | [Source](components/ai/gemini-live/gemini-live.tsx) | [README](components/ai/gemini-live/README.md) |
| <img src="public/previews/geometric-logo-reveal.png" width="160" alt="Geometric Logo Reveal preview"> | **Geometric Logo Reveal** | Typography | [Source](components/typography/geometric-logo-reveal/geometric-logo-reveal.tsx) | [README](components/typography/geometric-logo-reveal/README.md) |
| <img src="public/previews/gradient-gummy-bear.png" width="160" alt="Gradient Gummy Bear preview"> | **Gradient Gummy Bear** | 3D | [Source](components/3d/gradient-gummy-bear/gradient-gummy-bear.tsx) | [README](components/3d/gradient-gummy-bear/README.md) |
| <img src="public/previews/scroll-phase-cursor.png" width="160" alt="Scroll Phase Cursor preview"> | **Scroll Phase Cursor** | Cursor | [Source](components/cursor/scroll-phase-cursor/scroll-phase-cursor.tsx) | [README](components/cursor/scroll-phase-cursor/README.md) |
| <img src="public/previews/voice-bloom.png" width="160" alt="Voice Bloom preview"> | **Voice Bloom** | AI | [Source](components/ai/voice-bloom/voice-bloom.tsx) | [README](components/ai/voice-bloom/README.md) |
| <img src="public/previews/showreel-sphere.png" width="160" alt="Showreel Sphere preview"> | **Showreel Sphere** | 3D | [Source](components/3d/showreel-sphere/showreel-sphere.tsx) | [README](components/3d/showreel-sphere/README.md) |
| <img src="public/previews/coffee-gauge.png" width="160" alt="Coffee Gauge preview"> | **Coffee Gauge** | Data Visualization | [Source](components/data-visualization/coffee-gauge/coffee-gauge.tsx) | [README](components/data-visualization/coffee-gauge/README.md) |
| <img src="public/previews/halftone-bloom.png" width="160" alt="Halftone Bloom preview"> | **Halftone Bloom** | Data Visualization | [Source](components/data-visualization/halftone-bloom/halftone-bloom.tsx) | [README](components/data-visualization/halftone-bloom/README.md) |
| <img src="public/previews/blossom-light.png" width="160" alt="Blossom Light preview"> | **Blossom Light** | Control | [Source](components/control/blossom-light/blossom-light.tsx) | [README](components/control/blossom-light/README.md) |
| <img src="public/previews/gradient-event-card.png" width="160" alt="Gradient Event Card preview"> | **Gradient Event Card** | Gradient | [Source](components/gradient/gradient-event-card/gradient-event-card.tsx) | [README](components/gradient/gradient-event-card/README.md) |
| <img src="public/previews/stamp-tracker.png" width="160" alt="Stamp Tracker preview"> | **Stamp Tracker** | Data Visualization | [Source](components/data-visualization/stamp-tracker/stamp-tracker.tsx) | [README](components/data-visualization/stamp-tracker/README.md) |
| <img src="public/previews/doodle-calendar.png" width="160" alt="Doodle Calendar preview"> | **Doodle Calendar** | Data Visualization | [Source](components/data-visualization/doodle-calendar/doodle-calendar.tsx) | [README](components/data-visualization/doodle-calendar/README.md) |
| <img src="public/previews/pocket-piggy.png" width="160" alt="Pocket Piggy preview"> | **Pocket Piggy** | Play | [Source](components/play/pocket-piggy/pocket-piggy.tsx) | [README](components/play/pocket-piggy/README.md) |
<!-- component-catalogue:end -->

Gemini Live and Voice Bloom are interface demos; they do not connect to an AI
service or microphone backend. Other components use demo content and expose
props and callbacks where available. Your app owns routing, persistence and
backend integration. Automatic `loop` behaviour and defaults are documented in
each folder README.

## Repository layout

Run gallery and maintenance commands from the repository root.

```text
.
├── components/                  # supported copyable components
│   ├── 3d/                      # WebGL examples and their asset instructions
│   ├── ai/
│   ├── control/
│   ├── cursor/
│   ├── data-visualization/
│   ├── gradient/
│   ├── navigation/
│   ├── immersive/
│   ├── play/
│   ├── template/
│   └── typography/
│       └── <id>/
│           ├── <id>.tsx          # complete source
│           ├── index.ts          # public exports
│           └── README.md         # generated setup, usage and props
├── src/
│   ├── app/                     # Next.js gallery routes
│   ├── components/website/      # gallery shell, separate from copyable sources
│   ├── lib/                     # metadata, renderer map and gallery helpers
│   └── styles/                  # gallery-only global styling
├── public/                      # runtime assets and gallery previews
├── docs/                        # integration guide and maintenance records
├── licenses/                    # third-party notices
├── scripts/                     # generation, capture and verification tools
├── tests/                       # source-contract and repository regressions
└── archive/                     # incomplete examples, outside the catalogue
```

See [component folder conventions](components/README.md) and
[contributing](CONTRIBUTING.md). Folder docs, public exports and this catalogue
are regenerated from source with `npm run generate:readmes` and checked in CI.

## Local development

Use Node.js 24 (see `.nvmrc`):

```bash
nvm use
npm ci
npm run dev
```

A GitHub ZIP works too: extract it, enter the extracted folder and run the same commands.
No `.env` file or API key is needed for the gallery or component demos.

Open [localhost:3000](http://localhost:3000). The gallery uses Next.js, React,
Tailwind CSS, Framer Motion and lucide-react; its 3D scenes use Three.js.

## Validation

Before publishing a change:

```bash
npm run check
npx playwright install chromium
npm run verify:responsive
```

`check` covers repository and asset guards, documentation freshness, public
exports, isolated copy-paste compilation, lint, TypeScript, regression tests,
an independent install and check of the public free export, the production
build, HTTP routes and headers, and production dependency audit.
Browser checks cover the home page and all component routes at phone, tablet,
desktop and short landscape sizes, including expanded menus and scroll endings.
CI runs both suites. `npm run verify:links` separately checks the anonymous public
GitHub downloads against the local publication, including their exact contents.
Use `npm run verify:links -- --site` after deploying to check live preview routes too.

After updating dependencies, run `npm run generate:free-lock` to refresh the
public repository's tested dependency lock before exporting another release.

For a running development server, set `RESPONSIVE_BASE_URL` to its URL.
Set `RESPONSIVE_EVIDENCE_DIR` to save browser screenshots and a JSON report.
See [maintenance status](docs/REMAINING-TASKS.md) for tracked upstream issues.

## Credits and licensing

Designed and built by [Sijia Ma](https://www.linkedin.com/in/michellesijiama/).
Inspiration credits remain in the gallery metadata and component sources.

Repository code is [MIT licensed](LICENSE). Third-party assets carry their own
terms. Read [ASSETS.md](ASSETS.md) before copying or redistributing them:

- OpenMoji SVGs use **CC BY-SA 4.0**; retain the attribution and share-alike notice.
- The Gummy Bear model by Poly by Google uses **CC-BY 3.0**.
- The Met's Open Access painting reproductions use **CC0 1.0**.
- The lunar reference used by Halftone Bloom and the Blossom Light wallpaper
  still have unresolved provenance recorded in `ASSETS.md`. Confirm their
  rights before redistribution; the code's MIT licence does not cover them.

Incomplete old examples live in [archive](archive/README.md) and are not part of
the verified catalogue. Report security issues via [SECURITY.md](SECURITY.md).
