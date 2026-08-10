# AtomicMotion UI — Remaining Open-Source Release Tasks

> This document tracks the work that still needs to happen before the repository is fully public-release ready. It is intended for the next agent (or human) that picks up the project.

## Current state

- Git history has been cleaned with `git filter-repo` to remove private AI planning docs (`CLAUDE.md`, `AGENTS.md`, `.claudecode/`, `docs/superpowers/`).
- OSS scaffolding is in place: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ASSETS.md`, `licenses/`, `.github/` templates, `dependabot.yml`, and CI guard scripts.
- `scroll-scrubbed-video` was removed from the registry and its unresolved video asset deleted because the source could not be proven. The component source files still exist in the repo if you want to re-instate it later with a properly licensed video.
- Build and guard scripts pass locally.

## Remaining tasks

### 1. GitHub repository metadata

Set on the repository settings page or with `gh`:

- **Description**: copy from `package.json` description or use: `Open-sourced interaction components built with React, Framer Motion, and Tailwind CSS.`
- **Website**: `https://atomicmotion.dev`
- **Topics**: `react`, `nextjs`, `tailwindcss`, `framer-motion`, `ui-components`, `animation`, `micro-interactions`, `copy-paste`
- **Social preview**: upload `docs/images/hero.png` in Settings → Social preview
- Disable unused features: Wiki, Projects (optional)
- Enable Discussions if you want questions routed away from Issues (optional)

### 2. Make the repository public

In GitHub repository settings, change visibility from private to public.

### 3. Create the first tag and release

```bash
git checkout main
git pull origin main
git tag -a v0.1.0 -m "First public release"
git push origin v0.1.0
```

Then create a GitHub Release from that tag with text explaining that this is a copy-paste component library, not an npm package, and list the components.

### 4. Branch protection for `main`

Recommended rules (for a solo maintainer, do not require PR approvals or you will lock yourself out):

- `Settings → Rules → Branches → Add rule`
- Branch name pattern: `main`
- Check `Require status checks to pass before merging`
- Select:
  - `Guard, lint, build`
  - `Playwright verify scripts`
- Do **not** require pull request reviews unless you have a second maintainer.
- Keep `Allow force pushes` unchecked unless you really need it.

### 5. Verify CI is green

After the next push, the CI badge in `README.md` should update. Open `.github/workflows/ci.yml` and confirm the workflow succeeds. If the Playwright job times out, increase the sleep/timeout or switch it to `npm run build && npm run start`.

### 6. Re-instate `scroll-scrubbed-video` (optional)

If you find a properly licensed video to replace `public/videos/pinterest-floral-scroll.mp4`:

1. Add the new video under `public/videos/`.
2. Register the component in `atomicmotion-ui/src/lib/component-registry.ts` and `component-map.tsx`.
3. Add the asset to `ASSETS.md` with full provenance.
4. Run `npm run capture:home-previews scroll-scrubbed-video` to generate a new preview.
5. Run `node scripts/verify-public-surface.mjs` and `node scripts/verify-registry-paths.mjs`.
6. Re-add the row in `README.md` Components table.

## Verification commands

Always run these before any commit:

```bash
cd atomicmotion-ui
npm run lint
npm run build
cd ..
node scripts/verify-public-surface.mjs
node scripts/verify-registry-paths.mjs
```

## Do not re-introduce

- `CLAUDE.md`, `AGENTS.md`, `.claudecode/`, `docs/superpowers/` planning docs
- Social-media render scripts (`scripts/render-*`)
- Unsourced binary assets larger than 3 MB

`verify-public-surface.mjs` will fail the build if any of these return.
