# Third-party asset provenance

One row per binary/media asset under `public/` that this repo
did not originate from scratch. `src/**` component code is covered by the
repo's [MIT license](LICENSE); this file exists because binary assets can
carry a different license than the code that ships them. Checked by
`scripts/verify-public-surface.mjs`.

| Path | Source | Author | License | Credited in |
| --- | --- | --- | --- | --- |
| `public/emoji/*.svg` (40 files) | [OpenMoji](https://openmoji.org) v15.0.0 | OpenMoji project & contributors | CC BY-SA 4.0 | `licenses/OpenMoji-CC-BY-SA-4.0.txt`, `public/emoji/README.md`, root `README.md` |
| `public/models/gummy-bear.glb` | [Poly Pizza](https://poly.pizza/m/5zl16PPAItW) ("Gummy Bear" by Poly by Google) | Google Poly | CC-BY 3.0 | `components/3d/gradient-gummy-bear/gradient-gummy-bear.tsx` header comment, root `README.md` |
| `public/paintings/carnevale-birth-of-the-virgin.jpg`, `public/paintings/bruegel-the-harvesters.jpg`, `public/paintings/patinir-penitence-of-saint-jerome.jpg`, `public/paintings/bosch-adoration-of-the-magi.jpg` | [The Met Open Access](https://www.metmuseum.org/art/collection) (objects 435848, 435809, 437261, 435724) | Fra Carnevale; Pieter Bruegel the Elder; Joachim Patinir; Hieronymus Bosch (reproductions by The Metropolitan Museum of Art) | CC0 1.0 | `components/3d/showreel-sphere/showreel-sphere.tsx` header comment, `requiredAssets` in `src/lib/component-registry.ts` |
| `public/gummy-bear-poster.png` | Self-authored (poster frame captured from the `gradient-gummy-bear` component render) | Sijia Ma | MIT (repo default) | — |
| `public/previews/*.png`, `public/previews/*.mp4` | Self-authored — posters via `npm run capture:home-previews`, looping clips via `npm run capture:preview-loop` — screen captures of this repo's own components | Sijia Ma | MIT (repo default) | — |
| **⚠ PROVENANCE OUTSTANDING** — `components/data/halftone-bloom/halftone-bloom.tsx` (`TRACE_*` constants) and therefore `public/previews/halftone-bloom.png` | A mineral-colour lunar photograph supplied by the maintainer, traced to a 132×132 grid of quantised colour dots by `scripts/trace-halftone.mjs`. **Photographer, origin URL and licence terms are not yet recorded.** The maintainer has stated the image is licensed for this use; that statement has not been substantiated here. | Unknown — to be filled in | Unknown — to be filled in | — |
| `public/{next,vercel,globe,file,window}.svg` | Default `create-next-app` scaffold icons | Vercel | MIT (Next.js template default) | — |

## Already removed

`public/gummy-bear-xiaohongshu.mp4` (2.1 MB) had no recorded source and was
not referenced by any component — it was a personal render output. Deleted
along with the script that generated it (`scripts/render-gummy-xiaohongshu.mjs`).

`public/videos/pinterest-floral-scroll.mp4` had no recorded source or
license. It was the scrubbed-video content for the `scroll-scrubbed-video`
component's gallery demo, so removing it also required unlisting that
component from `component-registry.ts` and `component-map.tsx` (its source
file at `components/unregistered/scroll-scrubbed-video/` is untouched
and can be re-registered once someone supplies footage they have the rights
to). The hero image was regenerated to no longer depict a frame from this
video.
