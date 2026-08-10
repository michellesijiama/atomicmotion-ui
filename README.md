# AtomicMotion UI

[![CI](https://github.com/michellesijiama/atomicmotion-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/michellesijiama/atomicmotion-ui/actions/workflows/ci.yml)

![Four AtomicMotion UI components: Gemini Live, Gradient Gummy Bear, Emoji Sketch, and Scroll Phase Cursor](docs/images/hero.png)

Open-source micro-interactions for designers and developers — a gallery of
polished, animated UI components you can lift into your own project one file at
a time.

**Live gallery → [atomicmotion.dev](https://atomicmotion.dev)**

Clone the repo and run commands from the [`atomicmotion-ui/`](atomicmotion-ui)
subfolder — see [Local development](#local-development) below.

Each interaction is a single, self-contained file built with React, Tailwind
CSS, and Framer Motion. Browse them in the gallery, then copy the source (or
hand an AI agent a ready-made prompt) and drop it straight into your codebase.

## What this is / what this isn't

- **This is** a copy-paste component gallery: each file in `src/components/`
  is meant to be pulled into your own project and adapted.
- **This isn't** an npm package — there's nothing to `npm install` from this
  repo, and no semver or API-stability guarantee across commits.
- The gallery site (`atomicmotion.dev`) is a demo of the components, not a
  supported hosted product — issues about the site itself are welcome, but
  it isn't maintained as a service.

## Components

| Preview | Component | Category | Inspired by | Source |
| --- | --- | --- | --- | --- |
| <img src="atomicmotion-ui/public/previews/gemini-live.png" width="160"> | **Gemini Live** — floating live-assistant panel with source chips, a blue edge glow, and listening pulses | AI | [Gemini](https://gemini.google.com) | [`gemini-live.tsx`](atomicmotion-ui/src/components/gemini-live/gemini-live.tsx) |
| <img src="atomicmotion-ui/public/previews/emoji-sketch.png" width="160"> | **Emoji Sketch** — pick an emoji and watch it self-draw stroke by stroke, with a pencil wobble | Tool | [Getty × Gehry](https://gehry.getty.edu) | [`emoji-sketch.tsx`](atomicmotion-ui/src/components/emoji-sketch/emoji-sketch.tsx) |
| <img src="atomicmotion-ui/public/previews/expanded-navigation.png" width="160"> | **Soft Menu Reveal** — a frosted menu that unfolds from a stable nav row on a bell-curve transition | Navigation | [Jitter](https://madewithjitter.com) | [`expanded-navigation.tsx`](atomicmotion-ui/src/components/expanded-navigation/expanded-navigation.tsx) |
| <img src="atomicmotion-ui/public/previews/filter-dropdown-reveal.png" width="160"> | **Filter Dropdown Reveal** — a project filter bar with a soft dropdown and clipped text reveal | Navigation | [MAD](https://www.i-mad.com) | [`filter-dropdown-reveal.tsx`](atomicmotion-ui/src/components/filter-dropdown-reveal/filter-dropdown-reveal.tsx) |
| <img src="atomicmotion-ui/public/previews/codex-sidebar-reveal.png" width="160"> | **Codex Sidebar Reveal** — a compact app shell whose left sidebar expands and shifts the workspace | Navigation | [Codex](https://openai.com/codex) | [`codex-sidebar-reveal.tsx`](atomicmotion-ui/src/components/codex-sidebar-reveal/codex-sidebar-reveal.tsx) |
| <img src="atomicmotion-ui/public/previews/scroll-scrubbed-typography.png" width="160"> | **Scroll-Scrubbed Typography** — a sticky editorial title that stretches tall, then compresses as scroll scrubs its scale | Typography | [Getty × Gehry](https://gehry.getty.edu) | [`scroll-scrubbed-typography.tsx`](atomicmotion-ui/src/components/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx) |
| <img src="atomicmotion-ui/public/previews/geometric-logo-reveal.png" width="160"> | **Geometric Logo Reveal** — a wordmark assembles from a gray ghost into solid ink in a staggered cascade | Typography | [Form&Fun](https://www.formandfun.co) | [`geometric-logo-reveal.tsx`](atomicmotion-ui/src/components/geometric-logo-reveal/geometric-logo-reveal.tsx) |
| <img src="atomicmotion-ui/public/previews/gradient-aura.png" width="160"> | **Gradient Gummy Bear** — a translucent 3D gummy bear (Three.js) with a soft pink gradient and cursor parallax | 3D | — | [`gradient-aura.tsx`](atomicmotion-ui/src/components/gradient-aura/gradient-aura.tsx) |
| <img src="atomicmotion-ui/public/previews/scroll-phase-cursor.png" width="160"> | **Scroll Phase Cursor** — a circular pointer whose ring fills with page progress while a sculpted 3D form rotates with scroll | Cursor | [Inversa](https://inversa.com) | [`scroll-phase-cursor.tsx`](atomicmotion-ui/src/components/scroll-phase-cursor/scroll-phase-cursor.tsx) |

## Using a component

Every component is designed for **copy-paste distribution** — there is no npm
package to install. On each component's page in the [gallery](https://atomicmotion.dev)
you get two actions:

- **Copy link** — the GitHub URL of that component's source file.
- **Copy for AI** — a prompt you can paste into an AI coding agent (Claude Code,
  Cursor, etc.) telling it where the source lives, which dependencies to add,
  and to adapt it into your project.

To add one by hand:

1. Copy the component's `.tsx` file into your project (e.g. under
   `src/components/`).
2. Install the dependencies it uses:
   ```bash
   npm install framer-motion lucide-react clsx tailwind-merge
   ```
3. Add the `cn` helper the components import from `@/lib/utils`:
   ```ts
   // src/lib/utils.ts
   import { type ClassValue, clsx } from "clsx";
   import { twMerge } from "tailwind-merge";

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```
4. Import and render it:
   ```tsx
   import { GeminiLive } from "@/components/gemini-live/gemini-live";

   export function Demo() {
     return <GeminiLive />;
   }
   ```

Components are self-contained: they rely only on React, Framer Motion, and the
`cn` helper, and they preserve keyboard access and focus states so they stay
accessible in your app.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- React + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Framer Motion](https://www.framer.com/motion/)
- [lucide-react](https://lucide.dev) icons

## Repository layout

The gallery site lives in the [`atomicmotion-ui/`](atomicmotion-ui) subfolder;
run all commands from there.

```
.
├─ atomicmotion-ui/          # Next.js gallery app
│  ├─ src/components/        # one folder per interaction
│  ├─ src/lib/               # registry + helpers (cn, clipboard)
│  └─ src/app/               # gallery + component detail pages
└─ docs/                     # OSS audit and asset provenance
```

## Local development

```bash
cd atomicmotion-ui
npm install
npm run dev
```

Then open <http://localhost:3000>.

Before opening a PR, verify the build:

```bash
npm run lint
npm run build
```

## Contributing

Contributions are welcome. Keep each new interaction in its own folder under
`src/components/`, self-contained in a single component file, and add its entry
to `src/lib/component-registry.ts` so it appears in the gallery.

## Credits

Designed and built by [Sijia Ma](https://www.linkedin.com/in/michellesijiama/).
Each component credits the site or work that inspired it.

## Third-party assets

This repo's own code is MIT-licensed, but a few binary assets under
`atomicmotion-ui/public/` carry different licenses or unresolved provenance.
See [`ASSETS.md`](ASSETS.md) for the full table. Notably:

- The Gradient Gummy Bear uses the "Gummy Bear" 3D model by Poly by Google
  (Google Poly), licensed [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/),
  sourced via [Poly Pizza](https://poly.pizza/m/5zl16PPAItW).
- The Emoji Sketch component's line-art SVGs are [OpenMoji](https://openmoji.org)
  v15.0.0, licensed **CC BY-SA 4.0** — see
  [`licenses/OpenMoji-CC-BY-SA-4.0.txt`](licenses/OpenMoji-CC-BY-SA-4.0.txt).

## License

[MIT](LICENSE) © 2026 Sijia Ma — scoped to this repository's original source
code. Third-party assets keep their own licenses; see
[Third-party assets](#third-party-assets) above.
