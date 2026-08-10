# Public/private surface audit

Classification of every top-level tracked path as of the open-sourcing pass.
Basis: `git ls-files` from the repo root. Enforced mechanically by
`scripts/verify-public-surface.mjs` (run in CI) so this list can't silently
drift out of date.

- **PUBLIC** — part of the product; stays tracked.
- **PRIVATE** — personal tooling / agent process files; untracked from `HEAD`
  going forward (see `.gitignore`), kept on disk for local use.
- **REVIEW** — binary/media asset whose license or provenance needs a human
  decision; see `ASSETS.md`.

| Path | Classification | Notes |
| --- | --- | --- |
| `README.md`, `LICENSE`, `.gitignore` | PUBLIC | repo root docs |
| `docs/OSS-AUDIT.md`, `docs/ASSETS.md` (via root `ASSETS.md`) | PUBLIC | this audit itself |
| `docs/superpowers/` (root and app-level) | PRIVATE | AI-agent planning docs, not product docs |
| `atomicmotion-ui/CLAUDE.md`, `atomicmotion-ui/AGENTS.md` | PRIVATE | agent instructions for this repo's own maintainer workflow |
| `atomicmotion-ui/.claudecode/` | PRIVATE | agent session context |
| `atomicmotion-ui/src/**` | PUBLIC | the product — components, app, lib |
| `atomicmotion-ui/public/**` (svg icons, previews, `models/gummy-bear.glb`) | PUBLIC | credited third-party or self-authored |
| `atomicmotion-ui/public/emoji/*.svg` | PUBLIC (attributed) | OpenMoji, CC BY-SA 4.0 — see `licenses/OpenMoji-CC-BY-SA-4.0.txt` |
| `atomicmotion-ui/public/gummy-bear-xiaohongshu.mp4` | removed | unreferenced by any component; output of the deleted `render:gummy-xiaohongshu` script |
| `atomicmotion-ui/public/videos/pinterest-floral-scroll.mp4` | REVIEW | load-bearing for `scroll-scrubbed-video` — kept so the component still works; provenance unresolved, see `ASSETS.md` |
| `atomicmotion-ui/scripts/verify-*.mjs` | PUBLIC | real Playwright test infrastructure |
| `atomicmotion-ui/scripts/capture-home-previews.mjs` | PUBLIC | legitimate contributor tooling (regenerate gallery previews) |
| `atomicmotion-ui/scripts/render-*.mjs` | removed | personal social-media content generators, no consumer value |
| `atomicmotion-ui/{package.json,tsconfig.json,eslint.config.mjs,postcss.config.mjs,next.config.ts}` | PUBLIC | build config |
| `.devin/`, `atomicmotion-ui/.claude/` | PRIVATE (untracked) | not tracked by git; explicitly ignored so a future `git add -A` can't sweep them in |
