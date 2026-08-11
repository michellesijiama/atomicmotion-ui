# AtomicMotion UI — Remaining Open-Source Release Tasks

> This document tracks the work that still needs to happen before the repository is fully public-release ready. It is intended for the next agent (or human) that picks up the project.

## Current state

- Git history has been cleaned with `git filter-repo` to remove private AI planning docs (`CLAUDE.md`, `AGENTS.md`, `.claudecode/`, `docs/superpowers/`).
- OSS scaffolding is in place: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `ASSETS.md`, `licenses/`, `.github/` templates, `dependabot.yml`, and CI guard scripts.
- `scroll-scrubbed-video` was removed from the registry and its unresolved video asset deleted because the source could not be proven. The component source files still exist in the repo if you want to re-instate it later with a properly licensed video.
- Build and guard scripts pass locally.

## Remaining tasks

### 1. GitHub repository metadata — DONE

Description, website (`https://atomicmotion.dev`), and all eight topics are set.
Wiki is already disabled.

Still outstanding (both optional, and both **UI-only** — the GitHub API has no
endpoint for them):

- **Social preview**: upload `docs/images/hero.png` in Settings → Social preview.
- Disable Projects, and enable Discussions if you want questions routed away
  from Issues.

### 2. Make the repository public — DONE

The repository is public.

### 3. Create the first tag and release — DONE

`v0.1.0` is tagged and pushed, and the release is published at
<https://github.com/michellesijiama/atomicmotion-ui/releases/tag/v0.1.0>.

### 4. Branch protection for `main` — deferred by choice

Still open. Both required checks now pass on `main`, so this can be turned on
whenever you want it.

Recommended rules (for a solo maintainer, do not require PR approvals or you will lock yourself out):

- `Settings → Rules → Branches → Add rule`
- Branch name pattern: `main`
- Check `Require status checks to pass before merging`
- Select:
  - `Guard, lint, build`
  - `Playwright verify scripts`
- Do **not** require pull request reviews unless you have a second maintainer.
- Keep `Allow force pushes` unchecked unless you really need it.

### 5. Verify CI is green — DONE

CI is green on `main`. It had been red because every `test:*` verify script
still asserted an older UI shape (single-component gallery, all-static
previews, hard-coded colors that have since become design tokens). The scripts
were resynced with the current design; see the commit
`fix: resync verify scripts with the current gallery design`.

Two follow-ups worth doing, neither blocking:

- The `Playwright verify scripts` job installs Chromium and boots a dev server,
  but **none of the `test:*` scripts actually use Playwright or hit the server**
  — they are all static source-text checks. Dropping those two steps would cut
  about a minute per run. The job name is also misleading.
- `actions/checkout@v4` and `actions/setup-node@v4` emit Node 20 deprecation
  warnings. Dependabot has already opened a PR bumping them.

### 6. Keep the verify scripts honest

These scripts assert on exact source strings, so they drift silently every time
the design moves and then fail in a batch. When you change a component, run the
matching `npm run test:*` and update the assertion in the same commit. Prefer
asserting the *intent* (a blurred blue glow, a transparent backdrop) over exact
pixel values, so re-tuning does not break CI.

### 7. Re-instate `scroll-scrubbed-video` (optional)

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
for s in design expanded-navigation codex-sidebar card-padding \
         gemini-live home-filter gradient-gummy home-previews; do
  npm run "test:$s" || echo "FAILED: test:$s"
done
cd ..
node scripts/verify-public-surface.mjs
node scripts/verify-registry-paths.mjs
```

The `test:*` loop matters: CI runs those scripts and they are what turned `main`
red. The `|| echo` keeps the loop going so you see every failure at once — CI
stops at the first one, which hides the rest.

## Do not re-introduce

- `CLAUDE.md`, `AGENTS.md`, `.claudecode/`, `docs/superpowers/` planning docs
- Social-media render scripts (`scripts/render-*`)
- Unsourced binary assets larger than 3 MB

`verify-public-surface.mjs` will fail the build if any of these return.
