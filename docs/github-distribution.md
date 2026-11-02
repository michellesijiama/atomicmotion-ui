# GitHub distribution

AtomicMotion is a free, open-source design library. Every registered component
is available without payment under the root [MIT license](../LICENSE).
Runtime assets retain the notices in [ASSETS.md](../ASSETS.md).

## Repositories

- `michellesijiama/atomicmotion-ui`: the complete Next.js gallery and development checks.
- `michellesijiama/atomicmotion-free`: all registered components, setup examples, required
  runtime assets, their licenses and an independent dependency verification environment.

The website's Copy link and Copy for AI URLs point to the public component
repository. Both repositories use `main`. No payment provider, private source
bundle or purchase cookies are required.

Previously shared `components/tool/emoji-sketch/` URLs remain available as exact
compatibility copies of the current `components/play/emoji-sketch/` source.

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

The component repository must be synchronized whenever a registered component is
added, moved or changed. A successful local export alone does not update GitHub.
Compare the public manifest with the generated export and run:

```bash
npm run verify:links
```

This check uses anonymous HTTPS requests, verifies every published file against
its expected SHA-256 and checks Blender/GIF/still downloads. It does not rely on
GitHub login, local files or a development server. After a gallery deployment,
run `npm run verify:links -- --site` to verify public preview routes as well.
A `[skip deploy]` release can publish source and downloads while new live routes
remain unavailable until the next deployment.

For GitHub's **Download ZIP**, extract the archive before running `npm ci` and
`npm run check`. Git metadata, API keys and `.env` files are not required.

Publish only verified export files. Preserve original asset attribution.
Unregistered experiments and local build output are not part of the release.
