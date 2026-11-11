# Mango on Silver

A portrait still life from Little Bead Club. The mango crepe cake stands on
a straight base between tapered corners, directly on a level silver plate.
Raised roses, veined leaves and a double rolled border frame the single slice.
A deep-blue backdrop, cool tabletop, and dense film grain give the scene a
photographic finish.

- [Editable Blender scene](../../public/studio/mango-on-silver/mango-on-silver.blend)
- [1080 × 1339 Cycles render](../../public/studio/mango-on-silver/mango-on-silver.png)
- [License and artwork terms](../../public/studio/mango-on-silver/LICENSE.txt)

Open the file in Blender 5.2.2 LTS and press F12 to render. The cake is an
editable fused sheet with a mango palette adapted from the Bead Club guava
crepe cake layout. Its color, terry normal, glint and glint-normal maps are
packed into the file. The scene-specific lower rows in
`flat-base.json` give the sheet tapered corners and a continuous level edge.
The orthographic camera focuses on the cake. The compositor adds subtle
optical diffusion before overlaying the editable typography and adding grain.
Grain is denser in the shadows and finer in the highlights.

Rebuild the Blender scene and PNG from the repository root:

```sh
blender -b --factory-startup --python scenes/mango-on-silver/create_scene.py
```

Append `-- --draft` to render a smaller preview in `.tmp/mango-on-silver/`.
Use `-- --rednote` for the 2160 × 2880 poster or `-- --wallpaper` for a
2160 × 3840 render without lettering. Both exports are saved in
`output/mango-on-silver/`.
If the UI artwork changes, regenerate the packed texture inputs with
`node scenes/mango-on-silver/export-textures.mjs` before rebuilding. The exporter
uses the repository's Playwright Chromium installation.
