# Repository maintenance status

Reviewed against `main` on October 6, 2026. The private repository contains a
Next.js design library, Stripe/PayPal checkout and purchase-gated source APIs.
It does not have a customer account database; source access uses a signed
purchase cookie after server verification. The separate public repository
contains 14 free components. Gemini Live and Voice Bloom remain interface
demos, independent of the gallery's payment backend.

## Checks and security

- Use Node.js 24 (`.nvmrc`) and `npm ci` for reproducible installation.
- Run `npm run check` from the repository root. CI uses the same guards and
  test discovery, plus lint, TypeScript, build, HTTP route and header checks,
  and production dependency audit. Browser checks also cover mobile layouts and
  expanded controls with `npm run verify:responsive`; copy-paste fixtures compile
  the public components without gallery or Next.js types.
- CI jobs are **Guard, lint, build** and **Verify scripts**. Since the complete
  repository became private, GitHub's branch-protection API reports that this
  account plan requires GitHub Pro for protected branches. Do not assume the
  earlier public-repository protection remains enforced. Maintainers must
  review CI before publishing; restoring enforced protection requires an
  account plan that supports private-repository protection.
- Next.js and its ESLint config are pinned to 16.3.8. Animation, React, icon,
  and Three.js stay on their tested versions. Tailwind and its PostCSS plugin
  are updated together to 4.3.3, ESLint to 9.39.5, and Node type declarations
  to the Node 24 line used by CI. Major toolchain upgrades are not included.
- `npm audit --omit=dev` reports zero vulnerabilities at review time.
- Full `npm audit` reports five high-severity findings in the development-only
  chain `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch
  → braces`. The underlying issue is
  [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
  and the latest published `braces` (3.0.3) has no patched release at review time.
  Do not use `npm audit fix --force`: its suggested Next.js ESLint downgrade
  would break the supported configuration. Revisit when upstream ships a fix.
- The public export has its own pinned package/lockfile and CI. It compiles
  the free sources and README examples without Next.js, checks Tailwind styles,
  and runs a full audit. Refresh its lock with `npm run generate:free-lock`
  after application dependency/import changes. `test:free-dependencies`
  checks a clean installation outside the application checkout.
- Dependabot excludes automatic major-version updates. Major upgrades require
  deliberate compatibility and visual review, particularly TypeScript and
  frontend libraries. Next.js/ESLint config, React/types, and Tailwind/plugin
  updates are grouped together. Three.js and its types also exclude automatic
  minor-version bumps because their 0.x releases can change APIs. Security
  updates remain separately managed by GitHub.

## Payments

Stripe is linked in a claimed sandbox with Preview-only credentials. Live
production checkout is not configured, and an actual sandbox payment/unlock
has not yet been completed. Keep these separate from the mocked regression
checks. The account owner must finish Stripe account activation and payout
setup, configure Live credentials, and complete the payment/unlock flow before
enabling production sales. See [commerce setup](commerce.md).

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
