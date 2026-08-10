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
| `public/videos/pinterest-floral-scroll.mp4` | **Unresolved** — no source recorded. Used as the demo footage in `scroll-scrubbed-video.tsx`. | Unknown | Unknown | — |
| `public/{next,vercel,globe,file,window}.svg` | Default `create-next-app` scaffold icons | Vercel | MIT (Next.js template default) | — |

## Open item: `pinterest-floral-scroll.mp4`

This file has no recorded source and is **load-bearing** — the
`scroll-scrubbed-video` component's gallery entry uses it as the scrubbed
video content, so deleting it would break that component's demo. It was kept
rather than deleted so this pass doesn't regress a working design.

Before treating this repo as fully public-safe, either:

1. name the real source/license and fill in this row, or
2. replace `atomicmotion-ui/public/videos/pinterest-floral-scroll.mp4` with
   footage you have the rights to (keeping the same filename requires no code
   changes — `VIDEO_SRC` in `scroll-scrubbed-video.tsx` just points at the
   path), or
3. remove the file and swap the component to a self-authored clip.

`scripts/verify-public-surface.mjs` does not fail the build over this file —
it's flagged here as a manual follow-up, not blocked automatically, so this
plan doesn't silently break the component in CI.

## Already removed

`public/gummy-bear-xiaohongshu.mp4` (2.1 MB) had no recorded source and was
not referenced by any component — it was a personal render output. Deleted
along with the script that generated it (`scripts/render-gummy-xiaohongshu.mjs`).
