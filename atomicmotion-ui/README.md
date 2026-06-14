# AtomicMotion UI

AtomicMotion UI is an open-source micro-interaction component library built for copy-paste distribution. Each core interaction lives in a focused single file so developers and AI coding agents can read, adapt, and ship it quickly.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Component Rules

- Copy files from `src/components/ui`.
- Keep each component self-contained.
- Use React, Framer Motion, and `@/lib/utils` only.
- Preserve keyboard access and focus states.

## Components

- `MagnetButton`: a spring-loaded button that follows pointer intent.
- `FluidTabs`: compact tabs with a liquid active indicator.
- `ElasticDrag`: a draggable object with elastic return physics.

## Copy-Paste Example

```tsx
import { MagnetButton } from "@/components/ui/magnet-button";

export function Demo() {
  return <MagnetButton>Launch Motion</MagnetButton>;
}
```

## Verification

```bash
npm run lint
npm run build
```

## License

MIT
