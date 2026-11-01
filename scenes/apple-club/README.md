# Apple Club

An apple still life rendered as a colored-pencil illustration in Blender:
a whole red apple, an ivory apple cross-section with five brown seeds,
a translucent blue polka-dot bowl, green leaves, scattered pigment,
little graphite stars, and editable typewriter captions on cotton paper.

- [Editable Blender scene](../../public/still-life/apple-club/apple-club.blend)
- [1080 × 1440 PNG](../../public/still-life/apple-club/apple-club.png)
- [Web preview](../../public/still-life/apple-club/apple-club.webp)
- [360° looping GIF](../../public/still-life/apple-club/apple-club-rotation.gif)

Created with **Blender 5.2.2 LTS / Cycles**. This is a 2.5D scene with real
models, native text objects, lights, and procedural shader nodes. It contains
no flattened image plane of the finished drawing and does not embed the
user-provided reference. A six-second 360° turn rotates the models around
the vertical axis while the paper, typography and decorative stars stay fixed.
The apple slice has front and rear faces, the bowl is round, and its patterns
continue around the back so the animation shows actual model rotation.

## Render or edit

Open the `.blend` and press F12. Models, lettering, camera and lights are
organized in six named collections. The saved output is `//apple-club.png`.
Frames 1–144 at 24 fps make a seamless six-second loop. Press Space over the
timeline to play it. The `ANIMATION` root holds the linear turntable keyframes;
timeline markers identify the front, side and back views.
The grain, paper coverage, pencil pressure, stroke scale and shading direction
are labeled in each material's node graph. The bowl's blue pigment is mixed
with transparency to let the fruit show through its front surface.

Rebuild the scene and render from the repository root:

```sh
blender -b --factory-startup --python scenes/apple-club/create_scene.py
```

For a 720 × 960 preview, append `-- --draft`; previews go into `.tmp/apple-club/`.
The generator selects Metal when available and otherwise uses CPU rendering.
The website serves a small WebP export and downloads the original PNG.

Render the GIF source frames with `-- --animation`. This renders every other
frame at 600 × 800 into `.tmp/apple-club/rotation/`. To encode the 72 frames
as a 480 × 640, 12 fps, six-second GIF:

```sh
ffmpeg -framerate 12 -pattern_type glob -i '.tmp/apple-club/rotation/frame-*.png' \
  -filter_complex '[0:v]scale=480:640:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' \
  -loop 0 public/still-life/apple-club/apple-club-rotation.gif
```

The 3D Studio gallery and model detail page play the GIF. Reduced-motion
visitors receive the static WebP instead. Scene and GIF downloads are available
on the detail page, using the same gallery and navigation design as Interfaces.

## License and typography

Original geometry, material code and renders use the repository's [MIT license](../../LICENSE).
[Courier Prime](https://github.com/google/fonts/tree/main/ofl/courierprime) is
Copyright 2015 The Courier Prime Project Authors, licensed under
[SIL Open Font License 1.1](fonts/OFL.txt). The font and its license are packed
into the `.blend`; the downloadable `LICENSE.txt` contains both notices.
