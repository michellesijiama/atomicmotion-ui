"use client";

import * as React from "react";
import * as THREE from "three";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ShowreelSphereProps = {
  className?: string;
  loop?: boolean;
};

// A studio landing page whose entire hero is one draggable sphere wrapped in a
// Renaissance painting. Every four seconds the next painting sweeps around the
// ball to replace it. Everything else is 14px condensed type: the studio line
// on one side, the title of whatever is currently on the sphere on the other.
//
// Three things carry it:
//
//   - Each painting is drawn to a 2048x1024 canvas and mirrored across the
//     halfway meridian, so the wrap has no seam and a whole composition faces
//     the viewer rather than half of one.
//   - Transitions sweep along longitude instead of cross-dissolving. A
//     dissolve puts both paintings on every texel at once and its midpoint is
//     a double exposure; a sweep keeps each texel on exactly one painting.
//   - The idle spin wanders. Two slow sines of unrelated period sum into a
//     speed that eases, stalls and reverses over a small positive bias, so the
//     ball still works its way around without grinding one direction forever.
//
// Paintings: four Renaissance architecture and landscape panels from The
// Metropolitan Museum of Art Open Access (CC0 1.0, public domain dedication).
// Served locally from public/paintings/ — see ASSETS.md.

const CONDENSED_STACK =
  '"Arial Narrow", "Helvetica Neue Condensed", "Liberation Sans Narrow", Arial, sans-serif';

// Each face is one full equirectangular wrap of the ball, authored once at a
// fixed size independent of the viewport.
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

// How long each painting holds, and how long the next takes to sweep across.
// The two sum to exactly 4s: the status line below changes on the same beat,
// so the ball and the text stay locked together however long it runs.
const FACE_HOLD = 2.8; // seconds
// A sweep needs longer than a dissolve — it has a whole circumference to cross.
// The two still sum to exactly 4s, which the loop and the caption depend on.
const FACE_FADE = 1.2; // seconds, taken out of the tail of the period
// Width of the soft blend band, as a fraction of the wrap. Wide enough that no
// hard edge is ever visible, narrow enough that the two paintings never sit on
// top of each other across the whole surface.
const FACE_EDGE = 0.16;
const FACE_PERIOD = FACE_HOLD + FACE_FADE;

// The rota. Renaissance architecture and landscape panels — subjects with a
// horizon or a facade, which survive being wrapped around a ball far better
// than a portrait does. The title travels with the source so the caption can
// name whatever is currently on the sphere.
const PAINTINGS = [
  { src: "/paintings/carnevale-birth-of-the-virgin.jpg", title: "The Birth of the Virgin" },
  { src: "/paintings/bruegel-the-harvesters.jpg", title: "The Harvesters" },
  { src: "/paintings/patinir-penitence-of-saint-jerome.jpg", title: "The Penitence of Saint Jerome" },
  { src: "/paintings/bosch-adoration-of-the-magi.jpg", title: "The Adoration of the Magi" },
] as const;

// The sphere spins about a tilted axis rather than straight up-and-down, so the
// poles swing through the silhouette and the motion reads as a body turning in
// space instead of a texture scrolling past.
const AXIS_TILT_Z = -0.38; // rad, leans the poles
const AXIS_TILT_X = 0.17; // rad, pitches them toward the viewer

const FOV = 35;
// Fraction of the container the sphere should span on each axis.
const FIT_VERTICAL = 0.66;
const FIT_HORIZONTAL = 0.55;

// The idle drift wanders rather than grinding one way: two slow sines of
// incommensurate frequency sum into a speed that eases, stalls and reverses,
// over a small positive bias so the ball still works its way around over time.
const IDLE_SPIN = 0.26; // rad/s, scales the whole wander
const IDLE_BIAS = 0.55; // net drift as a fraction of IDLE_SPIN
const IDLE_TILT = 0.34; // rad, amplitude of the slow nod on the other axis
const DRAG_SENSITIVITY = 0.0062; // rad per px
const MAX_THROW = 5.5; // rad/s
const TILT_LIMIT = 0.95; // rad

function loadPaintings() {
  return Promise.all(
    PAINTINGS.map(
      (painting) =>
        new Promise<{ image: HTMLImageElement; title: string } | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ image: img, title: painting.title });
          img.onerror = () => resolve(null);
          img.src = painting.src;
        }),
    ),
  ).then((loaded) => loaded.filter((entry): entry is { image: HTMLImageElement; title: string } => entry !== null));
}

function createFace() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  return canvas;
}

// The painting wrapped around the ball, mirrored across the halfway meridian.
//
// Wrapping a single copy the whole way round leaves a hard vertical seam where
// the left and right edges of the panel meet, and puts only half the painting
// in front of you at a time. Drawing the panel into the first half and its
// mirror into the second makes both joins land on matching pixels — the wrap is
// seamless — and one full composition faces the viewer instead of half of one.
function paintingFace(painting: HTMLImageElement) {
  const canvas = createFace();
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const half = TEXTURE_WIDTH / 2;
  ctx.drawImage(painting, 0, 0, half, TEXTURE_HEIGHT);
  ctx.save();
  ctx.translate(TEXTURE_WIDTH, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(painting, 0, 0, half, TEXTURE_HEIGHT);
  ctx.restore();
  return canvas;
}

// The cycle: one painting per face, in order.
function buildFaces(paintings: { image: HTMLImageElement }[]) {
  return paintings.map((painting) => paintingFace(painting.image));
}

export function ShowreelSphere({ className, loop }: ShowreelSphereProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [titles, setTitles] = React.useState<string[]>([]);
  const [faceIndex, setFaceIndex] = React.useState(0);
  const [hasDragged, setHasDragged] = React.useState(false);
  const draggedRef = React.useRef(false);

  React.useEffect(() => {
    if (loop) return;
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = container.clientWidth || 1;
    let height = container.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearAlpha(0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);

    // Distance is solved from the FOV so the sphere keeps the same share of the
    // frame on any container shape.
    const fitCamera = () => {
      const vFov = THREE.MathUtils.degToRad(FOV);
      const aspect = width / height;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const distanceV = 1 / (FIT_VERTICAL * Math.tan(vFov / 2));
      const distanceH = 1 / (FIT_HORIZONTAL * Math.tan(hFov / 2));
      camera.position.set(0, 0, Math.max(distanceV, distanceH));
      camera.lookAt(0, 0, 0);
    };
    fitCamera();

    const pivot = new THREE.Group();
    pivot.rotation.set(AXIS_TILT_X, 0, AXIS_TILT_Z);
    scene.add(pivot);

    // Built once the paintings have decoded, so the ball never appears with a
    // placeholder skin first. Any image that fails (offline, blocked) simply
    // drops out of the rota.
    let cancelled = false;
    let sphere: THREE.Mesh | null = null;
    let geometry: THREE.SphereGeometry | null = null;
    let material: THREE.MeshStandardMaterial | null = null;
    let textures: THREE.CanvasTexture[] = [];
    // Set by onBeforeCompile — the handle for the sweep between two faces.
    let faceUniforms:
      | {
          uNextMap: { value: THREE.Texture };
          uMix: { value: number };
          uSweep: { value: number };
        }
      | null = null;

    const buildSphere = (paintings: { image: HTMLImageElement }[]) => {
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      textures = buildFaces(paintings).map((canvas) => {
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        texture.wrapS = THREE.RepeatWrapping;
        return texture;
      });

      geometry = new THREE.SphereGeometry(1, 128, 128);
      material = new THREE.MeshStandardMaterial({
        map: textures[0],
        roughness: 0.62,
        metalness: 0.0,
      });

      // The next painting sweeps around the ball along its longitude rather
      // than cross-dissolving into place. A dissolve puts both paintings on
      // every texel at once — the midpoint is a 50/50 double exposure that
      // reads as a slideshow laid over the object. A sweep keeps each texel on
      // exactly one painting and blends only inside a narrow travelling band,
      // so the sphere turns into its new skin instead of blinking into it.
      //
      // Both faces are sampled in the shader for this. Compositing it on the
      // CPU would mean re-uploading an 8MB canvas every frame of every
      // transition; this costs one extra texture fetch.
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uNextMap = { value: textures[textures.length > 1 ? 1 : 0] };
        shader.uniforms.uMix = { value: 0 };
        shader.uniforms.uSweep = { value: 0 };
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            [
              "#include <common>",
              "uniform sampler2D uNextMap;",
              "uniform float uMix;",
              "uniform float uSweep;",
            ].join("\n"),
          )
          .replace(
            "#include <map_fragment>",
            [
              "#ifdef USE_MAP",
              // Distance travelled around the wrap from where this sweep began.
              `  float sweepU = fract( vMapUv.x - uSweep );`,
              // Run the front past both ends so the first and last slivers are
              // covered too, instead of stalling a band short of each pole.
              `  float front = uMix * ( 1.0 + 2.0 * ${FACE_EDGE.toFixed(2)} ) - ${FACE_EDGE.toFixed(2)};`,
              `  float toNext = 1.0 - smoothstep( front - ${FACE_EDGE.toFixed(2)}, front + ${FACE_EDGE.toFixed(2)}, sweepU );`,
              "  diffuseColor *= mix( texture2D( map, vMapUv ), texture2D( uNextMap, vMapUv ), toNext );",
              "#endif",
            ].join("\n"),
          );
        faceUniforms = shader.uniforms as typeof faceUniforms;
      };

      sphere = new THREE.Mesh(geometry, material);
      // Into the tilted pivot, not straight into the scene: the sphere still
      // spins about its own Y, but that axis is now leaning.
      pivot.add(sphere);
    };

    loadPaintings().then((paintings) => {
      if (cancelled || !paintings.length) return;
      buildSphere(paintings);
      setTitles(paintings.map((painting) => painting.title));
    });

    // Soft studio light: broad fill, a key from the upper left, and a cool
    // bounce that keeps the lower-right terminator from going flat.
    const ambient = new THREE.AmbientLight(0xffffff, 1.05);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d8d8, 0.65);
    const key = new THREE.DirectionalLight(0xffffff, 1.85);
    key.position.set(-2.6, 3.4, 4.2);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(3.4, -1.6, 2.2);
    scene.add(ambient, hemi, key, fill);

    const spin = { x: 0.12, y: 0.6 };
    const velocity = { x: 0, y: reduceMotion ? 0 : IDLE_SPIN * IDLE_BIAS };
    const pending = { x: 0, y: 0 };
    let dragging = false;
    let visible = true;
    let raf = 0;

    const clock = new THREE.Clock();
    // Drives the face cycle. Accumulated from the render loop's own delta
    // rather than a timer, so it stays in step with the frames that are
    // actually drawn — and pauses with them when the canvas scrolls away.
    let elapsed = 0;
    let shownFace = 0;
    let wasFading = false;
    let sweepStart = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (!visible) return;
      // Drives both the wander and the face cycle.
      elapsed += delta;

      if (dragging) {
        // Rotation is already applied in the pointer handler so the ball never
        // lags the finger; the frame only has to turn that into a throw
        // velocity for the release.
        if (delta > 0) {
          velocity.y = THREE.MathUtils.clamp(pending.y / delta, -MAX_THROW, MAX_THROW);
          velocity.x = THREE.MathUtils.clamp(pending.x / delta, -MAX_THROW, MAX_THROW);
        }
        pending.x = 0;
        pending.y = 0;
      } else {
        // Throw momentum bleeds off and settles back into the wander.
        const drift = reduceMotion
          ? 0
          : IDLE_SPIN *
            (0.8 * Math.sin(elapsed * 0.21) +
              0.45 * Math.sin(elapsed * 0.083 + 2.1) +
              IDLE_BIAS);
        velocity.y += (drift - velocity.y) * 0.035;
        velocity.x *= 0.92;
        spin.y += velocity.y * delta;
        spin.x += velocity.x * delta;

        // The other axis nods toward a slowly moving target instead of
        // integrating a velocity, so it can never wind up against the clamp.
        if (!reduceMotion) {
          const targetTilt = IDLE_TILT * Math.sin(elapsed * 0.11 + 0.9);
          spin.x += (targetTilt - spin.x) * Math.min(1, delta * 0.5);
        }
      }

      spin.x = THREE.MathUtils.clamp(spin.x, -TILT_LIMIT, TILT_LIMIT);
      if (sphere) {
        sphere.rotation.x = spin.x;
        sphere.rotation.y = spin.y;
      }

      // Which painting is showing, and how far the next has swept across.
      // Derived from elapsed rather than tracked as state, so there is no
      // drift to accumulate and a paused canvas resumes exactly where it left.
      if (material && faceUniforms && textures.length > 1 && !reduceMotion) {
        const cycle = elapsed % (textures.length * FACE_PERIOD);
        const index = Math.floor(cycle / FACE_PERIOD);
        const withinFace = cycle - index * FACE_PERIOD;
        material.map = textures[index];
        faceUniforms.uNextMap.value = textures[(index + 1) % textures.length];

        const fading = withinFace > FACE_HOLD;
        if (fading && !wasFading) {
          // Anchor the sweep to where the ball is pointing right now, so it
          // always starts at the limb and crosses the face you are looking at
          // rather than beginning somewhere round the back.
          sweepStart = (((spin.y / (Math.PI * 2)) % 1) + 1.25) % 1;
        }
        wasFading = fading;

        const raw = fading ? (withinFace - FACE_HOLD) / FACE_FADE : 0;
        // Plain smoothstep, not smootherstep: the harder curve parks the front
        // near both ends and crams the actual travel into a short burst in the
        // middle, which reads as a jump rather than a sweep.
        faceUniforms.uMix.value = raw * raw * (3 - 2 * raw);
        faceUniforms.uSweep.value = sweepStart;
        // Caption swaps at the midpoint of the sweep, so it always names
        // whichever painting covers most of the ball.
        const captionIndex =
          withinFace <= FACE_HOLD + FACE_FADE * 0.5 ? index : (index + 1) % textures.length;
        if (captionIndex !== shownFace) {
          shownFace = captionIndex;
          setFaceIndex(captionIndex);
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    let pointerId: number | null = null;
    let last = { x: 0, y: 0 };

    const canvas = renderer.domElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      dragging = true;
      last = { x: event.clientX, y: event.clientY };
      pending.x = 0;
      pending.y = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const dx = (event.clientX - last.x) * DRAG_SENSITIVITY;
      const dy = (event.clientY - last.y) * DRAG_SENSITIVITY;
      last = { x: event.clientX, y: event.clientY };
      spin.y += dx;
      spin.x += dy;
      // Carried to the next frame purely to derive the release velocity.
      pending.x += dy;
      pending.y += dx;
      if (!draggedRef.current && Math.abs(dx) + Math.abs(dy) > 0.004) {
        draggedRef.current = true;
        setHasDragged(true);
      }
    };

    const endDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    const resizeObserver = new ResizeObserver(() => {
      width = container.clientWidth || 1;
      height = container.clientHeight || 1;
      camera.aspect = width / height;
      fitCamera();
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Stop rendering entirely while the canvas is off-screen.
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.remove();
      geometry?.dispose();
      material?.dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    };
  }, [loop]);

  const typeStyle: React.CSSProperties = {
    fontFamily: CONDENSED_STACK,
    fontStretch: "condensed",
  };

  return (
    <div
      className={cn(
        // Deliberately not isolated. The nav below blends in difference mode,
        // so it needs a painted backdrop; an isolated stacking context with a
        // transparent ground would resolve white-on-white and vanish. Leaving
        // the group open lets the blend reach whatever surface the component
        // is dropped onto, so the ground stays transparent and the nav still
        // inverts correctly on light or dark.
        "relative h-full min-h-full w-full overflow-hidden bg-transparent",
        className,
      )}
      style={typeStyle}
    >
      {loop ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Stand-in for the gallery card — no WebGL mounts in the grid. The
              first painting, masked to a circle and shaded, rather than a
              WebGL context per card. */}
          <div
            aria-hidden
            className="aspect-square h-[66%] rounded-full bg-cover bg-center"
            style={{
              backgroundImage: [
                "radial-gradient(circle at 30% 24%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 52%)",
                "radial-gradient(circle at 74% 84%, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 60%)",
                `url(${PAINTINGS[0].src})`,
              ].join(","),
            }}
          />
        </div>
      ) : (
        <div ref={containerRef} className="absolute inset-0" />
      )}

      {/* Statement and status flank the sphere at mid-height. Below md there is
          no room beside the ball, so the same row drops to the bottom edge:
          `md:inset-y-0` overrides `bottom-0` and turns the row into a
          full-height flex box that centres its two ends vertically. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-6 px-5 pb-5 text-black md:inset-y-0 md:items-center md:pb-0">
        <div className="flex min-w-0 items-center gap-3">
          {/* The studio mark: a wireframe box tumbling on two axes at once. Its
              resting transform is a 3/4 view, so it still reads as a box when
              the animation is off under reduced motion. */}
          <span aria-hidden className="showreel-sphere-box-stage block h-7 w-7 shrink-0">
            <span className="showreel-sphere-box">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </span>
          <p className="max-w-[7.5rem] text-[14px] font-bold leading-4 sm:max-w-[9.5rem] md:max-w-[8rem] lg:max-w-[11rem]">
            Atomic Motion is an open studio for interface craft, motion and curiosity.
          </p>
        </div>

        {/* No max-width and nowrap: the title names what is on the sphere right
            now, and a wrapped title reads as two unrelated fragments. */}
        <div className="shrink-0 text-right text-[14px] leading-4">
          <span className="block font-bold">Currently creating:</span>
          {/* overflow-hidden is what the clip-in animation slides out of. */}
          <span className="block overflow-hidden">
            <em
              key={faceIndex}
              className="showreel-sphere-line block whitespace-nowrap italic leading-[18px]"
            >
              {titles[faceIndex] ?? titles[0] ?? PAINTINGS[0].title}
            </em>
          </span>
        </div>
      </div>

      <p
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-5 z-20 hidden text-center text-[14px] leading-4 text-black opacity-0 transition-opacity duration-500 sm:block",
          !hasDragged && !loop && "opacity-45",
        )}
      >
        Drag to spin
      </p>

      <style>{`
        @keyframes showreel-sphere-tumble {
          from { transform: rotateX(-22deg) rotateY(-32deg); }
          to   { transform: rotateX(338deg) rotateY(328deg); }
        }
        @keyframes showreel-sphere-clip-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .showreel-sphere-box-stage { perspective: 90px; }
        .showreel-sphere-box {
          position: relative;
          display: block;
          height: 100%;
          width: 100%;
          transform-style: preserve-3d;
          transform: rotateX(-22deg) rotateY(-32deg);
          animation: showreel-sphere-tumble 14s linear infinite;
        }
        .showreel-sphere-box > span {
          position: absolute;
          inset: 0;
          border: 1.5px solid currentColor;
        }
        /* Half of the 28px box, so each face sits on the cube's surface. */
        .showreel-sphere-box > span:nth-child(1) { transform: translateZ(14px); }
        .showreel-sphere-box > span:nth-child(2) { transform: rotateY(180deg) translateZ(14px); }
        .showreel-sphere-box > span:nth-child(3) { transform: rotateY(90deg) translateZ(14px); }
        .showreel-sphere-box > span:nth-child(4) { transform: rotateY(-90deg) translateZ(14px); }
        .showreel-sphere-box > span:nth-child(5) { transform: rotateX(90deg) translateZ(14px); }
        .showreel-sphere-box > span:nth-child(6) { transform: rotateX(-90deg) translateZ(14px); }
        .showreel-sphere-line {
          animation: showreel-sphere-clip-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .showreel-sphere-box,
          .showreel-sphere-line { animation: none; }
        }
      `}</style>
    </div>
  );
}
