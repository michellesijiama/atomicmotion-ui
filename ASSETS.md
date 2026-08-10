# Third-party asset provenance

One row per binary/media asset under `atomicmotion-ui/public/` that this repo
did not originate from scratch. `src/**` component code is covered by the
repo's [MIT license](LICENSE); this file exists because binary assets can
carry a different license than the code that ships them. Checked by
`scripts/verify-public-surface.mjs`.

| Path | Source | Author | License | Credited in |
| --- | --- | --- | --- | --- |
| `public/emoji/*.svg` (40 files) | [OpenMoji](https://openmoji.org) v15.0.0 | OpenMoji project & contributors | CC BY-SA 4.0 | `licenses/OpenMoji-CC-BY-SA-4.0.txt`, `public/emoji/README.md`, root `README.md` |
| `public/models/gummy-bear.glb` | [Poly Pizza](https://poly.pizza/m/5zl16PPAItW) ("Gummy Bear" by Poly by Google) | Google Poly | CC-BY 3.0 | `src/components/gradient-aura/gradient-aura.tsx` header comment, root `README.md` |
| `public/gummy-bear-poster.png` | Self-authored (poster frame captured from the `gradient-aura` component render) | Sijia Ma | MIT (repo default) | — |
| `public/previews/*.png`, `public/previews/gradient-aura.mp4` | Self-authored (`npm run capture:home-previews`) — screen captures of this repo's own components | Sijia Ma | MIT (repo default) | — |
| `public/{next,vercel,globe,file,window}.svg` | Default `create-next-app` scaffold icons | Vercel | MIT (Next.js template default) | — |

## Already removed

`public/gummy-bear-xiaohongshu.mp4` (2.1 MB) had no recorded source and was
not referenced by any component — it was a personal render output. Deleted
along with the script that generated it (`scripts/render-gummy-xiaohongshu.mjs`).

`public/videos/pinterest-floral-scroll.mp4` had no recorded source or
license. It was the scrubbed-video content for the `scroll-scrubbed-video`
component's gallery demo, so removing it also required unlisting that
component from `component-registry.ts` and `component-map.tsx` (its source
file at `atomicmotion-ui/src/components/scroll-scrubbed-video/` is untouched
and can be re-registered once someone supplies footage they have the rights
to). The hero image was regenerated to no longer depict a frame from this
video.
