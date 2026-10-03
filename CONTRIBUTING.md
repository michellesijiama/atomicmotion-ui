# Contributing

Thanks for considering a contribution to AtomicMotion UI.

## Adding a component

1. Create a new folder under `components/<category>/<your-component>/`.
2. Keep the component code **self-contained in a single file**. It must not
   import the gallery's private `@/` modules, other relative files, or Next.js APIs; inline small helpers such as
   `cn()`. External packages are allowed when the interaction genuinely needs
   them, and the generated component README will list what the source imports.
3. Register it in `src/lib/component-registry.ts` so it shows
   up in the gallery, and add its renderer to `src/lib/component-map.tsx`. Set `id`, `title`, `description`, `category`, and
   `codePath`, and credit the site or work that inspired it via `inspiredBy`
   if applicable.
   If the component loads files outside its folder at runtime, add them to
   `requiredAssets` and document their provenance in `ASSETS.md`.
4. Run `npm run generate:readmes` to create its folder README and public exports
   from the source. Include optional prop documentation in the source type.
5. Add a preview: run `npm run capture:home-previews <your-component-id>`
   from the repo root to generate `public/previews/<id>.png`.
6. Preserve keyboard access and focus states — components in this gallery
   are expected to stay usable without a mouse.

## Local development

```bash
nvm use
npm ci
npm run dev
```

Before opening a PR, from the repo root:

```bash
npm run check
```

`npm run check` includes the public-surface and registry guards, lint,
TypeScript, every `test:*` script, the production build, HTTP route and header checks, and the production
dependency audit. CI additionally runs the browser responsive suite:

```bash
npx playwright install chromium
npm run verify:responsive
```

Every `test:*` script is automatically discovered by `npm test`. This includes
isolated compilation of copied components and their README examples, source
contract regressions, and checks for stale README and entry-point exports.
Keep generated files current with `npm run generate:readmes`. Put incomplete
examples in `archive/`; only registered, verified folders belong in `components/`.

To run just the two guards:

```bash
npm run verify
```

## Licensing of contributions

By submitting a contribution, you agree it's licensed under this repo's
[MIT license](LICENSE). If your contribution includes an image, video, 3D
model, font, or other asset you didn't create yourself, you must have the
rights to relicense it (or it must already carry a compatible open license),
and you need to add a row for it to [`ASSETS.md`](ASSETS.md) crediting the
original source and license in your PR.

## Reporting bugs / requesting components

Use the issue templates. See [SECURITY.md](SECURITY.md) instead for security
vulnerabilities — please don't file those as public issues.
