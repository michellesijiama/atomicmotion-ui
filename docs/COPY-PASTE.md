# Copy-paste integration

AtomicMotion UI distributes source files, rather than an npm component library.
Each supported folder contains one component source, its named exports, and a
README generated from that source. Start with [the catalogue](../README.md#components).

## Host requirements

- React 19 and matching React type declarations, with TypeScript and DOM types.
- Tailwind CSS 4. Container queries, arbitrary values and opacity utilities are
  part of the components' styling; plain CSS or Tailwind 3 requires adaptation.
- A modern browser with ResizeObserver, CSS container queries and Canvas.
  The 3D examples also need WebGL; retain their fallback images and assets.

Next.js is required to run this gallery, but **not** to use its components.
There are no gallery aliases, Next.js imports or styled-jsx requirements in
supported component files. Keep `"use client"` for Next.js App Router usage;
in other React build tools it is harmless.

## Copy and render

1. Open the component folder's README and install its listed dependency ranges.
   They match this repository's compatible ranges. For Three.js components,
   also install the matching `@types/three` listed there.
2. Copy `<id>.tsx` into your own source folder. `index.ts` is optional; it
   re-exports the component and all public types and presets. Use a relative
   import if your app has no `@/` path alias.
3. Copy every listed runtime asset. Keep its URL relative to the **public
   root**: `public/models/gummy-bear.glb` must be served at
   `/models/gummy-bear.glb`, and Emoji SVGs at `/emoji/<code>.svg`. If your site
   uses a base path or CDN, update those URLs in the copied source. Assets do
   not all share the code's MIT licence; preserve the listed notices.
4. Ensure Tailwind scans your copied source. For the Next.js PostCSS setup:

   ```js
   // postcss.config.mjs
   export default { plugins: { "@tailwindcss/postcss": {} } };
   ```

   ```css
   /* Your app's global stylesheet, imported by its root layout. */
   @import "tailwindcss";
   /* Optional: explicitly scan a copied folder outside automatic discovery.
      This path is relative to THIS stylesheet. */
   @source "../components";
   ```

   Install `tailwindcss@^4` and `@tailwindcss/postcss@^4` if missing. Use your
   existing Tailwind setup if it already works. Vite projects can use the v4
   `@tailwindcss/vite` plugin instead of PostCSS.
5. Use the README's `Demo` example. Its wrapper supplies height and a container
   for size queries. Avoid mounting a `h-full` component inside an ancestor
   with no usable height. Then adapt `className` and exposed props to your app.

No gallery theme stylesheet is required. Optional `--jitter-*` colour variables
and font variables inherit your host theme; components have fallbacks when
those variables are absent. To match the gallery's typography exactly, provide
its fonts yourself: Manrope, Plus Jakarta Sans, Poppins and Instrument Serif
where used. Font files are not bundled with the component source.

## Demo behaviour and data

Gemini Live and Voice Bloom demonstrate interface animation. They do not
connect to a model, microphone service or authentication backend. Menu and
sidebar rows demonstrate disclosure, rather than your app's routing.

Use `loop` for automatic previews; it can replay or disable manual controls.
Check the props table because defaults differ between components. The gallery
mounts components with demo data; connect callbacks and controlled props exposed
by the source when integrating into your product. Persistence and backend
behaviour belong to the host application.

## Common integration problems

| Symptom | Check |
| --- | --- |
| Component has no styling | Tailwind 4 is enabled and scans the copied `.tsx` file. |
| A panel is too small or clipped | Its ancestors have usable height; the README wrapper is a safe starting point. |
| Three.js types cannot be found | Install the README's matching `@types/three` range. |
| Emoji, model or wallpaper is missing | Copy required assets, verify their public URLs, and check network requests. |
| Fonts differ from the preview | Provide the optional gallery fonts or keep the host fallback fonts. |
| Controls replay automatically | Check `loop` and the props defaults in that component's README. |

## What is validated

`npm run test:copy-paste` copies all registered sources and entry points into a
clean temporary folder, then compiles them together with their generated README
examples using React and browser types. The fixture has no gallery path aliases
or Next.js type extensions. Source guards also reject private, relative and
framework imports. Browser responsive checks separately exercise the gallery's
routes, menus and short viewport scrolling.

See [asset provenance](../ASSETS.md) before redistributing third-party material.
Two existing visual assets still have unresolved provenance recorded there;
this repository does not invent or grant missing rights.
