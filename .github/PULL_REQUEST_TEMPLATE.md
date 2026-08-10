## What

<!-- What does this PR change? -->

## Checklist

- [ ] `npm run lint` and `npm run build` pass (from `atomicmotion-ui/`)
- [ ] `node scripts/verify-public-surface.mjs` and
      `node scripts/verify-registry-paths.mjs` pass (from repo root)
- [ ] New component: registered in `src/lib/component-registry.ts`, preview
      generated via `npm run capture:home-previews <id>`
- [ ] Any non-self-authored asset added is listed in `ASSETS.md` with its
      source and license
- [ ] Keyboard access and focus states preserved
