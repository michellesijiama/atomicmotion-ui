# AtomicMotion UI

Open-source micro-interactions for designers and developers — a gallery of
polished, animated UI components you can lift into your own project one file at
a time.

**Live gallery → [atomicmotion.dev](https://atomicmotion.dev)**

Each interaction is a single, self-contained file built with React, Tailwind
CSS, and Framer Motion. Browse them in the gallery, then copy the source (or
hand an AI agent a ready-made prompt) and drop it straight into your codebase.

## Components

| Component | Category | Inspired by | Source |
| --- | --- | --- | --- |
| **Gemini Live** — floating live-assistant panel with source chips, a blue edge glow, and listening pulses | AI | [Gemini](https://gemini.google.com) | [`gemini-live.tsx`](atomicmotion-ui/src/components/gemini-live/gemini-live.tsx) |
| **Emoji Sketch** — pick an emoji and watch it self-draw stroke by stroke, with a pencil wobble | Tool | [Getty × Gehry](https://gehry.getty.edu) | [`emoji-sketch.tsx`](atomicmotion-ui/src/components/emoji-sketch/emoji-sketch.tsx) |
| **Soft Menu Reveal** — a frosted menu that unfolds from a stable nav row on a bell-curve transition | Navigation | [Jitter](https://madewithjitter.com) | [`expanded-navigation.tsx`](atomicmotion-ui/src/components/expanded-navigation/expanded-navigation.tsx) |
| **Filter Dropdown Reveal** — a project filter bar with a soft dropdown and clipped text reveal | Navigation | [MAD](https://www.i-mad.com) | [`filter-dropdown-reveal.tsx`](atomicmotion-ui/src/components/filter-dropdown-reveal/filter-dropdown-reveal.tsx) |
| **Codex Sidebar Reveal** — a compact app shell whose left sidebar expands and shifts the workspace | Navigation | [Codex](https://openai.com/codex) | [`codex-sidebar-reveal.tsx`](atomicmotion-ui/src/components/codex-sidebar-reveal/codex-sidebar-reveal.tsx) |
| **Scroll-Scrubbed Typography** — a sticky editorial title that stretches tall, then compresses as scroll scrubs its scale | Typography | [Getty × Gehry](https://gehry.getty.edu) | [`scroll-scrubbed-typography.tsx`](atomicmotion-ui/src/components/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx) |

More are on the way — see the "Coming soon" slots in the gallery.

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
└─ docs/                     # design specs and plans
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

## License

[MIT](LICENSE) © 2026 Sijia Ma
