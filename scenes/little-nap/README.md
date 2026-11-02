# Little Nap

Five whole, round sleeping pig tangyuan float in clear water in a cornflower-blue
lace bowl. Pale pink and blue pencil washes, textured outlines and fibrous white
paper retain the illustration style. Small English ink phrases follow the projected upper bowl rim, and softly
glowing golden stars surround the drawing.

- [Editable Blender scene](../../public/studio/little-nap/little-nap.blend)
- [1080 × 1440 still](../../public/studio/little-nap/little-nap.png)
- [Eight-second animated GIF](../../public/studio/little-nap/little-nap-soft-hops.gif)

The existing GIF filename is retained so previously shared download URLs keep working.

Created in **Blender 5.2.2 LTS**, with a Cycles still and an Eevee motion preview.
Each dumpling has one connected spherical skin, small folded ears and flush
painted eyes, nostrils and snout. Every tangyuan remains whole. The bowl is one
closed mesh from its foot and exterior through the rounded lip to the cavity.
Its floral lace is a procedural UV pencil print. Clear water fits inside the
cavity; the moving dumplings remain partly submerged.

## Fixed camera, tiny individual sways and water

Frames **1–192 at 24 fps** form a seamless eight-second loop. The camera remains
at the frontal angle: 19-degree elevation and -8-degree azimuth. The saved file
opens at the resting view, frame 1.

Each tangyuan has a different phase, small amplitude and rocking direction.
Their vertical drift stays below 0.026 scene units, with tiny forward nuzzles
and almost imperceptible elastic shape changes. They remain in the water.
These quiet motions repeat over eight seconds, preserving their volume and
round shape without moving in identical rhythm.

Ripple carriers follow each dumpling. Small expanding waves, editable surface
wave shapes and changing reflections move with the water. Their opacity and
brightness use object-color controls to keep the material shaders stable.

Lettering is spaced by arc length along the actual projected bowl rim. It sits
on the paper behind the floating dumplings. Three area lights provide a window
key, soft fill and rim.

## Open and rebuild

Open the `.blend` and press F12 to render. Press Space over the timeline to play.
All geometry, procedural materials, facial marks, water motion, camera framing,
lettering and lights remain editable. Courier Prime is packed into the scene;
no add-ons or external files are needed to open the saved download.

Rebuild from the repository root:

```sh
blender -b --factory-startup --python scenes/little-nap/create_scene.py
```

Use `-- --draft` for a 720 × 960 still in `.tmp/little-nap/`.
Use `-- --save-only` to save without rendering. Use `-- --animation` to render
96 preview frames at 480 × 640 and 12 fps into `.tmp/little-nap/hopping-gif-frames/`.
Encode the downloadable GIF with:

```sh
ffmpeg -framerate 12 -pattern_type glob -i '.tmp/little-nap/hopping-gif-frames/frame-*.png' \
  -filter_complex '[0:v]scale=396:528:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' \
  -loop 0 public/studio/little-nap/little-nap-soft-hops.gif
```

`pig.py` builds the round dumplings; `face_paint.py` paints their features directly
onto the skin. `bowl.py` builds the continuous vessel and its lace. `soup.py`
creates contained water, wave shapes and light strokes. `animation.py` adds the
fixed camera, tiny individual sways, following ripples and golden stars.
`watercolor_materials.py`, `pencil_finish.py` and `paper_fibers.py` define the
pencil washes and paper tooth; `lettering.py` adds native editable text.
The shared pencil helpers in `../shared/` also support the earlier Apple Club scene.

## Verification and license

```sh
blender -b public/studio/little-nap/little-nap.blend --python scenes/little-nap/verify_scene.py
```

The audit checks five whole, connected dumplings, a watertight bowl and water
volume, safe spacing throughout the individual motion, continuous immersion, packed fonts, editable
water waves, a fixed camera, three lights and the seamless loop.

Original geometry, code and renders use the repository's [MIT license](../../LICENSE).
The packed Courier Prime typeface uses SIL OFL 1.1; the notice is embedded in the
Blender readme and downloadable `LICENSE.txt`. Its source font and
[license](../apple-club/fonts/OFL.txt) remain in the earlier scene folder.
Supplied visual references are not embedded or distributed.
