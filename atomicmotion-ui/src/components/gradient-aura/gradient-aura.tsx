"use client";

import * as React from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LoopSubdivision } from "three-subdivide";

import { cn } from "@/lib/utils";

export type GradientAuraProps = {
  className?: string;
  loop?: boolean;
};

// A single glossy, translucent 3D gummy bear that idles with a gentle sway
// and bob. Physically-based translucent material with real environment
// reflections, a multi-color vertex gradient, transparent background, and
// cursor-responsive gummy motion.
//
// Model: "Gummy Bear" by Poly by Google (Google Poly), licensed CC-BY,
// sourced via poly.pizza. Served locally from public/models/gummy-bear.glb.

const GUMMY_COLOR = "#ff789a";
const BACKDROP_SCREEN_RATIO = 3.35 / 5.03;
const BACKDROP_HALF_SIZE = 3.35 / 2;
const LENS_EDGE_PADDING = 0.16;
const LENS_TRAVEL_FALLBACK_X = 0.72;
const LENS_TRAVEL_FALLBACK_Y = 0.62;
const TEXTURE_SIZE = 1024;
const TEXT_PARAGRAPH =
  "a gummy bear lens moves across this paragraph and gently magnifies the words beneath it. the glass keeps a soft red pink tint while the manrope text stays small, regular, and easy to compare through the refractive candy surface.";

function createDataTexture(size: number, fill: (x: number, y: number) => number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const g = Math.max(0, Math.min(255, Math.floor(fill(x, y) * 255)));
      const idx = (y * size + x) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = g;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Coarse sugar-body variation for roughness, so the surface is glossy but not a
// uniform plastic shell.
function makeRoughnessTexture() {
  const size = 256;
  const grid = 40;
  const coarse = new Float32Array((grid + 1) * (grid + 1));
  for (let i = 0; i < coarse.length; i++) coarse[i] = Math.random();
  const sample = (u: number, v: number) => {
    const x = u * grid;
    const y = v * grid;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const a = coarse[y0 * (grid + 1) + x0];
    const b = coarse[y0 * (grid + 1) + x0 + 1];
    const c = coarse[(y0 + 1) * (grid + 1) + x0];
    const d = coarse[(y0 + 1) * (grid + 1) + x0 + 1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
  return createDataTexture(size, (x, y) => sample(x / size, y / size) * 0.48 + Math.random() * 0.22 + 0.18);
}

// The thickness map gives the bear a darker, syrupy middle and clearer edges.
// MeshPhysicalMaterial multiplies this by the material thickness.
function makeGummyThicknessTexture() {
  const size = 256;
  return createDataTexture(size, (x, y) => {
    const u = x / (size - 1) - 0.5;
    const v = y / (size - 1) - 0.5;
    const radial = Math.max(0, 1 - Math.sqrt(u * u + v * v) * 1.8);
    const verticalPull = Math.max(0, 1 - Math.abs(v + 0.08) * 1.45);
    return 0.34 + radial * 0.42 + verticalPull * 0.2 + Math.random() * 0.04;
  });
}

// Fine pectin-like dimples break up the perfect CG highlight without making
// the bear look frosted or dusty.
function makePectinBumpTexture() {
  const size = 256;
  return createDataTexture(size, (x, y) => {
    const wave = Math.sin(x * 0.34) * Math.sin(y * 0.27) * 0.06;
    return 0.5 + wave + (Math.random() - 0.5) * 0.09;
  });
}

function getManropeFontFamily() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-manrope").trim() || "Manrope, Arial, sans-serif";
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, cursorY);
  }
}

function makeManropeTextTexture(fontFamily: string) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create gummy text texture canvas.");
  }

  // Leave the canvas transparent (no white fill) so the backdrop shows only the
  // text — the plane behind the gummy bear reads as a transparent surface.
  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  ctx.fillStyle = "#121413";
  ctx.textBaseline = "top";
  ctx.globalAlpha = 0.9;
  ctx.font = `500 40px ${fontFamily}`;
  wrapText(ctx, `${TEXT_PARAGRAPH} ${TEXT_PARAGRAPH}`, 108, 150, 812, 58);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function GradientAura({ className, loop = false }: GradientAuraProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef({ x: 0, y: 0, cx: 0, cy: 0 });

  React.useEffect(() => {
    // The gallery card (loop) shows a lightweight static poster instead of
    // running the heavy WebGL/transmission scene; the full interactive 3D
    // only mounts on the component detail page.
    if (loop) return;
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 1;
    let height = container.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.9);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);
    const rimA = new THREE.PointLight(0xffc0b5, 24, 14);
    rimA.position.set(-3, -1.5, 2.4);
    scene.add(rimA);
    const rimB = new THREE.PointLight(0xff4f7a, 28, 14);
    rimB.position.set(3, 2, -1.2);
    scene.add(rimB);
    // Backlight behind the gummy so light glows through the translucent body.
    const backLight = new THREE.DirectionalLight(0xfff2d8, 3.5);
    backLight.position.set(-1.5, 2, -5);
    scene.add(backLight);
    const bellyGlow = new THREE.PointLight(0xff426a, 8, 4);
    bellyGlow.position.set(0, -0.05, -1.2);
    scene.add(bellyGlow);

    const noiseTex = makeRoughnessTexture();
    noiseTex.wrapS = THREE.RepeatWrapping;
    noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.repeat.set(3, 3);
    const thicknessTex = makeGummyThicknessTexture();
    thicknessTex.wrapS = THREE.RepeatWrapping;
    thicknessTex.wrapT = THREE.RepeatWrapping;
    const bumpTex = makePectinBumpTexture();
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(4, 4);

    // The gummy "specimen" — populated once the GLB finishes loading.
    const group = new THREE.Group();
    group.position.z = -0.2;
    scene.add(group);
    const lensTravel = {
      x: LENS_TRAVEL_FALLBACK_X,
      y: LENS_TRAVEL_FALLBACK_Y,
    };

    let cancelled = false;
    let backdropTexture: THREE.CanvasTexture | null = null;
    const loadedGeometries: THREE.BufferGeometry[] = [];
    const loadedMaterials: THREE.Material[] = [];

    const backdropGeometry = new THREE.PlaneGeometry(3.35, 3.35);
    const backdropMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      // Discard the empty (transparent) canvas pixels so the page shows through
      // where there's no text, while keeping the material in the opaque queue so
      // the gummy bear's transmission still refracts the paragraph.
      alphaTest: 0.5,
    });
    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.set(0, 0, -1.65);
    scene.add(backdrop);
    loadedGeometries.push(backdropGeometry);
    loadedMaterials.push(backdropMaterial);

    const setTextTexture = () => {
      const nextTexture = makeManropeTextTexture(getManropeFontFamily());
      const previousTexture = backdropTexture;
      backdropTexture = nextTexture;
      backdropMaterial.map = nextTexture;
      backdropMaterial.needsUpdate = true;
      previousTexture?.dispose();
    };
    setTextTexture();

    void document.fonts?.ready.then(() => {
      if (!cancelled) {
        setTextTexture();
        backdropMaterial.needsUpdate = true;
      }
    });

    const loader = new GLTFLoader();
    loader.load(
      "/models/gummy-bear.glb",
      (gltf: GLTF) => {
        if (cancelled) {
          // Effect was torn down before the load resolved — dispose and bail.
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => m.dispose());
            }
          });
          return;
        }

        const model = gltf.scene;

        // Measure the model's native (unscaled) size to compute a fitting
        // scale so the bear reads at a comfortable size in-frame.
        const rawBox = new THREE.Box3().setFromObject(model);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);
        const targetHeight = 1.5;
        const scale = targetHeight / Math.max(rawSize.y, 1e-6);
        model.scale.setScalar(scale);

        // glTF is Y-up and this bear already faces +Z toward the camera, so
        // no base yaw is needed (the idle sway adds gentle rotation).

        // Recenter to the origin using the bounding box AFTER scale is
        // applied, so the offset is correct in the transformed space.
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh) || child.userData.skipGummyMaterial) return;
          const mesh = child;
          const original = mesh.geometry;

          // Weld coincident vertices, then Loop-subdivide to round the
          // low-poly silhouette into a smooth, pillowy gummy, and recompute
          // smooth normals.
          const welded = mergeVertices(original);
          const geometry = LoopSubdivision.modify(welded, 3);
          geometry.computeVertexNormals();
          original.dispose();
          welded.dispose();
          mesh.geometry = geometry;

          const oldMaterial = mesh.material;
          const gummyMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(GUMMY_COLOR),
            metalness: 0.0,
            roughness: 0.025,
            roughnessMap: noiseTex,
            bumpMap: bumpTex,
            bumpScale: 0.012,
            // Real optical gummy: keep alpha opaque and let the 3D volume
            // refract the opaque paragraph plane behind it.
            transmission: 1,
            opacity: 1,
            transparent: false,
            depthWrite: true,
            thickness: 4.6,
            thicknessMap: thicknessTex,
            ior: 2.0,
            dispersion: 0.05,
            attenuationColor: new THREE.Color("#ff4674"),
            attenuationDistance: 7,
            clearcoat: 0.95,
            clearcoatRoughness: 0.08,
            envMapIntensity: 1.05,
            specularColor: new THREE.Color("#fff0df"),
            specularIntensity: 1,
            sheen: 0.08,
            sheenRoughness: 0.38,
          });
          mesh.material = gummyMaterial;

          loadedGeometries.push(geometry);
          loadedMaterials.push(gummyMaterial);
          if (Array.isArray(oldMaterial)) {
            oldMaterial.forEach((m) => m.dispose());
          } else {
            oldMaterial.dispose();
          }
        });

        const fittedBox = new THREE.Box3().setFromObject(model);
        const fittedSize = new THREE.Vector3();
        fittedBox.getSize(fittedSize);
        const lensDepthScale = (camera.position.z - group.position.z) / (camera.position.z - backdrop.position.z);
        const backdropHalfAtLensDepth = BACKDROP_HALF_SIZE * lensDepthScale;
        lensTravel.x = Math.max(0, backdropHalfAtLensDepth - fittedSize.x / 2 - LENS_EDGE_PADDING);
        lensTravel.y = Math.max(0, backdropHalfAtLensDepth - fittedSize.y / 2 - LENS_EDGE_PADDING);

        group.add(model);
      },
      undefined,
      (error) => {
        console.error("Failed to load gummy-bear.glb", error);
      },
    );

    let raf = 0;
    let visible = true;
    const render = () => {
      raf = requestAnimationFrame(render);
      // Skip the heavy transmission render while the canvas is off-screen.
      if (!visible) return;

      pointer.current.cx += (pointer.current.x - pointer.current.cx) * 0.12;
      pointer.current.cy += (pointer.current.y - pointer.current.cy) * 0.12;
      const cx = pointer.current.cx;
      const cy = pointer.current.cy;

      // Keep the lens facing the camera. Only move it across the square image
      // so the refractive body behaves like a movable magnifier.
      group.rotation.set(0, 0, 0);
      group.position.x = cx * lensTravel.x;
      group.position.y = -cy * lensTravel.y;

      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const backdropSize = Math.min(rect.width, rect.height * BACKDROP_SCREEN_RATIO);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      pointer.current.x = Math.max(-1, Math.min(1, (event.clientX - centerX) / (backdropSize / 2)));
      pointer.current.y = Math.max(-1, Math.min(1, (event.clientY - centerY) / (backdropSize / 2)));
    };
    const handlePointerLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      width = container.clientWidth || 1;
      height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Pause rendering entirely when the canvas scrolls out of view.
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
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.remove();
      loadedGeometries.forEach((g) => g.dispose());
      loadedMaterials.forEach((m) => m.dispose());
      if (backdropTexture) backdropTexture.dispose();
      noiseTex.dispose();
      thicknessTex.dispose();
      bumpTex.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [loop]);

  if (loop) {
    return (
      <div
        className={cn(
          "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent",
          className,
        )}
      >
        {/* Static poster for the gallery card — no WebGL runs in the grid. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gummy-bear-poster.png"
          alt="Translucent pink gummy bear"
          className="h-[88%] w-auto max-w-[85%] object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative isolate h-full min-h-full w-full overflow-hidden bg-transparent",
        className,
      )}
    >
      <div ref={containerRef} className="h-full min-h-full w-full" />
    </div>
  );
}
