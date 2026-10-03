# Repository maintenance status

Reviewed against `main` on October 3, 2026. The repository contains a Next.js
component gallery; it has no application API, database, authentication service,
or server actions. Components such as Gemini Live and Voice Bloom are demos.

## Checks and security

- Use Node.js 24 (`.nvmrc`) and `npm ci` for reproducible installation.
- Run `npm run check` from the repository root. CI uses the same guards and
  test discovery, plus lint, TypeScript, build, HTTP route and header checks,
  and production dependency audit.
- Required checks for `main` are **Guard, lint, build** and **Verify scripts**.
  Branch protection is already enabled; force pushes and deletion are disabled.
- Next.js and its ESLint config are pinned to 16.3.8. Animation, React, icon,
  Three.js, and Tailwind package versions remain unchanged.
- `npm audit --omit=dev` reports zero vulnerabilities at review time.
- Full `npm audit` reports five high-severity findings in the development-only
  chain `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch
  → braces`. The underlying issue is
  [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
  and the latest published `braces` (3.0.3) has no patched release at review time.
  Do not use `npm audit fix --force`: its suggested Next.js ESLint downgrade
  would break the supported configuration. Revisit when upstream ships a fix.
- Dependabot excludes automatic major-version updates. Major upgrades require
  deliberate compatibility and visual review, particularly TypeScript and
  frontend libraries. Security updates remain separately managed by GitHub.

## Open asset provenance

Two maintainer-supplied images still need their original source and license:

- The lunar photograph traced into Halftone Bloom's `TRACE_*` constants.
- `public/textures/wall-shadow.jpg`, used by Blossom Light.

The existing assets and component appearance are preserved. Record the actual
rights in `ASSETS.md` once the maintainer supplies evidence; do not invent terms.

## Optional component restoration

`components/unregistered/scroll-scrubbed-video/` remains unregistered because
its previous video had unresolved provenance. Restoring it requires a licensed
replacement, registry and renderer entries, an asset provenance row, a generated
README and preview, and a passing `npm run check`.
