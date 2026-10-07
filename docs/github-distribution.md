# GitHub distribution

AtomicMotion is a free, open-source design library. Every registered component
is available without payment under the root [MIT license](../LICENSE).
Runtime assets retain the notices in [ASSETS.md](../ASSETS.md).

## Repositories

- `michellesijiama/atomicmotion-ui`: the complete Next.js gallery and development checks.
- `michellesijiama/atomicmotion-free`: all 17 components, setup examples, required
  runtime assets, their licenses and an independent dependency verification environment.

The website's Copy link and Copy for AI URLs point to the public component
repository. Both repositories use `main`. No payment provider, private source
bundle or purchase cookies are required.

## Publishing components

```bash
npm run generate:readmes
npm run generate:free-lock
npm run export:free
node scripts/export-free-library.mjs --verify .artifacts/atomicmotion-free
```

The exporter uses an explicit allowlist, includes every registered source and
its runtime assets, and rejects modified source, extra files, environment
files, symlinks and copied Git history. It refuses to overwrite non-empty
output; use `--out /absolute/path/to/a/new-empty-folder` for another release.

After dependency changes, regenerate the public lock and run `npm run check`.
The public repository independently compiles every component and its README
example, verifies Tailwind styles and audits dependencies with `npm run check`.

Publish only verified export files. Preserve original asset attribution.
Unregistered experiments and local build output are not part of the release.
