# Little Nap

Two soft, asymmetrical sleeping pig scoops stack in a cornflower-blue lace bowl,
seen from the front. The lower pig sits inside the cavity; the upper pig rests
on its companion. Warm peach highlights and deep rose shadows give the watercolor
wash a luminous, translucent feel. Fuzzy pigment edges and pencil grains sit on
fibrous white paper, with little ink-like English phrases around and below them.

- [Editable Blender scene](../../public/studio/little-nap/little-nap.blend)
- [1080 × 1440 still](../../public/studio/little-nap/little-nap.png)
- [Six-second soft bouncing GIF](../../public/studio/little-nap/little-nap-soft-hops.gif)

Created in **Blender 5.2.2 LTS**, with a Cycles still and an Eevee motion preview. The bowl is one closed, connected
mesh, from the underside and low foot through the exterior, rounded lip,
inner wall and cavity floor. The ivory lace is a procedural UV print of
floral rosettes, fine mesh and scalloped borders. It stays attached as the
bowl rotates. There are no separate polka-dot decorations.

Each pig has a rose snout sculpted into its connected skin, slightly asymmetric
closed eyelids and nostrils painted directly onto the surface, small folded ears,
full cheeks and a soft drooping body. There are no separate floating facial pieces. Broad watercolor gradients, dark
pigment flecks and paper tooth soften the surface. The pigment is actually
semi-transparent: its dilution varies from the saturated rose shadows to the
light peach areas, while the reverse faces stay clear. No paws, blossoms or
exposed tails crowd the silhouette. Thin, irregular
paper fibers break the silhouette instead of a hard outline. The connected body
is voxel-welded, smoothed and subdivided at level 2. The upper underside follows the actual curved lower crown through an editable
Geometry Nodes raycast, with a tiny clearance to prevent interpenetration. All models, shaders, paper,
lighting, camera and text remain editable. Three area lights provide a clear
upper-left key, a gentle fill and a rear glow; the background stays softly white.

## Render and animate

Open the `.blend` and press F12. Press Space over the timeline to preview the
six-second loop: frames 1–144 at 24 fps. The `ANIMATION` root contains
the slow sway. The pigs squash, stretch and hop gently, their ears lag softly,
the ink lettering floats and five four-point stars twinkle. A height driver
keeps the upper pig above the lower crown throughout each bounce. The paper
and camera stay fixed.

Rebuild from the repository root:

```sh
blender -b --factory-startup --python scenes/little-nap/create_scene.py
```

Use `-- --draft` for a 720 × 960 preview in `.tmp/little-nap/`. Use
`-- --animation` to render the 72 GIF source frames into
`.tmp/little-nap/rotation/` at 480 × 640 and 12 fps using Eevee. The downloadable GIF is scaled to 432 × 576. Encode with:

```sh
ffmpeg -framerate 12 -pattern_type glob -i '.tmp/little-nap/rotation/frame-*.png' \
  -filter_complex '[0:v]scale=432:576:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' \
  -loop 0 public/studio/little-nap/little-nap-soft-hops.gif
```

`bowl.py` and `pig.py` define the geometry; `contact.py` fits the scoop underside
and `face_paint.py` draws the facial pigment on the skin. `animation.py` adds soft hops,
ear wobble, floating ink and twinkling stars. `watercolor_materials.py` and
`paper_fibers.py` define the watercolor washes, grain, fibrous paper and fuzzy
boundaries; `lettering.py` adds the native, editable text. `../shared/` contains the pencil
shaders and turntable helper, also used by the earlier Apple Club source.
No external textures, fonts or add-ons are required by the saved `.blend`.
Courier Prime is packed into the file under SIL OFL 1.1; its notice is in the
embedded readme and downloadable `LICENSE.txt`. The source font and
[license](../apple-club/fonts/OFL.txt) remain in the earlier scene's folder.
The user-provided pig image informed the character proportions and is not
embedded or distributed. All original scene geometry, code and renders use the
repository's [MIT license](../../LICENSE).

Verify the saved geometry and animation:

```sh
blender -b public/studio/little-nap/little-nap.blend --python scenes/little-nap/verify_scene.py
```

The audit checks that both pig bodies and the bowl are connected and watertight,
that the pig surfaces do not intersect during squash and hop extremes, and
that fonts, transparency, portrait dimensions and the seamless bouncing loop are retained.
