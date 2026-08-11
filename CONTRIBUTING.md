# Contributing

Thanks for considering a contribution to AtomicMotion UI.

## Adding a component

1. Create a new folder under `src/components/<your-component>/`.
2. Keep the component **self-contained in a single file** — it should only
   depend on React, Framer Motion, and the `cn` helper from `@/lib/utils`
   (plus `lucide-react` if it needs icons). Avoid introducing new
   dependencies unless the interaction genuinely requires one.
3. Register it in `src/lib/component-registry.ts` so it shows
   up in the gallery — set `id`, `title`, `description`, `category`, and
   `codePath`, and credit the site or work that inspired it via `inspiredBy`
   if applicable.
4. Add a preview: run `npm run capture:home-previews <your-component-id>`
   from the repo root to generate `public/previews/<id>.png`.
5. Preserve keyboard access and focus states — components in this gallery
   are expected to stay usable without a mouse.

## Local development

```bash
npm install
npm run dev
```

Before opening a PR, from the repo root:

```bash
npm run lint
npm run build
```

And the two guard scripts that keep the public surface and gallery links
honest (also from the repo root):

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
