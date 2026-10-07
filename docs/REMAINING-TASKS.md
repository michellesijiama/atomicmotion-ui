# Repository maintenance status

AtomicMotion is a free, open-source design library with 17 registered components.
The gallery's payment providers, purchase APIs and source locks have been removed.
All component source, examples and runtime assets are published in the public
component repository; the website uses Copy link and Copy for AI for all components.

## Verification

Use Node.js 24 and `npm ci`. Run `npm run check` for guards, lint, TypeScript,
all discovered test scripts, a production build, HTTP routes and production
dependency audit. Run `npm run verify:responsive` for gallery/browser checks.
The public export has its own pinned lockfile and independent CI; refresh it
with `npm run generate:free-lock` after dependency or import changes.

No component implementation, preview, animation or gallery layout was redesigned
for this change. Card source-price labels return to the original New status tag.

## Open asset provenance

Two maintainer-supplied images still need their original source and license:

- The lunar photograph traced into Halftone Bloom's `TRACE_*` constants.
- `public/textures/wall-shadow.jpg`, used by Blossom Light.

The existing assets and component appearance are preserved. Record the actual
rights in `ASSETS.md` once the maintainer supplies evidence; do not invent terms.

## Optional component restoration

`archive/scroll-scrubbed-video/` remains unregistered because
its previous video had unresolved provenance. Restoring it requires a licensed
replacement, registry and renderer entries, an asset provenance row, a generated
README and preview, and a passing `npm run check`.
