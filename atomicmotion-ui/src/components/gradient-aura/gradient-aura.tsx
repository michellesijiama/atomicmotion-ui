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
// cursor parallax.
//
// Model: "Gummy Bear" by Poly by Google (Google Poly), licensed CC-BY,
// sourced via poly.pizza. Served locally from public/models/gummy-bear.glb.

// Pink-red candy gradient: deep rose-red → soft pink.
const PALETTE = ["#d43f5f", "#e85777", "#f4728c", "#fa8ea5", "#ffabc0"];

// Procedural grayscale noise (coarse blotches + fine grain) for the roughness /
// bump maps, so the surface isn't a uniform glossy mirror.
function makeNoiseTexture() {
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
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const val = sample(x / size, y / size) * 0.55 + Math.random() * 0.45;
      const g = Math.max(0, Math.min(255, Math.floor(val * 255)));
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

// Paints a diagonal rose → lavender → cyan sweep across a mesh's (already
// centered) local-space vertices, matching the palette used elsewhere.
function paintGradient(geometry: THREE.BufferGeometry) {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const stops = PALETTE.map((c) => new THREE.Color(c));
  const col = new THREE.Color();

  const box = new THREE.Box3().setFromBufferAttribute(posAttr);
  const size = new THREE.Vector3();
  box.getSize(size);
  const spanX = Math.max(size.x, 1e-6);
  const spanY = Math.max(size.y, 1e-6);

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);

    // Normalize into 0..1 across each axis before blending, so the sweep
    // works regardless of the mesh's native unit scale.
    const nx = (px - box.min.x) / spanX - 0.5; // -0.5..0.5, left → right
    const ny = (py - box.min.y) / spanY; // 0..1, feet → head

    // Mostly-vertical sweep (feet → head): rose at the base, cyan up top,
    // with a gentle diagonal tilt.
    const t = Math.min(1, Math.max(0, ny + nx * 0.25)) * (stops.length - 1);
    const idx = Math.floor(t);
    col.copy(stops[idx]).lerp(stops[Math.min(idx + 1, stops.length - 1)], t - idx);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function GradientAura({ className }: GradientAuraProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef({ x: 0, y: 0, cx: 0, cy: 0 });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 1;
    let height = container.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
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

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);
    const rimA = new THREE.PointLight(0x6ea8ff, 22, 14);
    rimA.position.set(-3, -1.5, 2);
    scene.add(rimA);
    const rimB = new THREE.PointLight(0xff8ad0, 18, 14);
    rimB.position.set(3, 2, -1);
    scene.add(rimB);
    // Backlight behind the gummy so light glows through the translucent body.
    const backLight = new THREE.DirectionalLight(0xffffff, 2.4);
    backLight.position.set(-1.5, 2, -5);
    scene.add(backLight);

    const noiseTex = makeNoiseTexture();
    noiseTex.wrapS = THREE.RepeatWrapping;
    noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.repeat.set(3, 3);

    // The gummy "specimen" — populated once the GLB finishes loading.
    const group = new THREE.Group();
    scene.add(group);

    let cancelled = false;
    const loadedGeometries: THREE.BufferGeometry[] = [];
    const loadedMaterials: THREE.Material[] = [];

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
        const targetHeight = 1.6;
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
          if (!(child instanceof THREE.Mesh)) return;
          const mesh = child;
          const original = mesh.geometry;

          // Weld coincident vertices, then Loop-subdivide to round the
          // low-poly silhouette into a smooth, pillowy gummy, and recompute
          // smooth normals. The bump map is dropped too — it added shimmery
          // micro-normals across the translucent surface.
          const welded = mergeVertices(original);
          const geometry = LoopSubdivision.modify(welded, 3);
          geometry.computeVertexNormals();
          original.dispose();
          welded.dispose();
          mesh.geometry = geometry;

          paintGradient(geometry);

          const oldMaterial = mesh.material;
          const gummyMaterial = new THREE.MeshPhysicalMaterial({
            vertexColors: true,
            color: 0xffffff,
            metalness: 0.0,
            roughness: 0.2,
            roughnessMap: noiseTex,
            // Clear translucent jelly — light passes through the thin volume,
            // colour deepens toward the thicker edges.
            transmission: 0.96,
            thickness: 0.9,
            ior: 1.35,
            attenuationColor: new THREE.Color("#ef5f7e"),
            attenuationDistance: 3.2,
            clearcoat: 0.0,
            envMapIntensity: 0.28,
            specularIntensity: 0.3,
            sheen: 0.1,
            transparent: true,
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

        group.add(model);
      },
      undefined,
      (error) => {
        console.error("Failed to load gummy-bear.glb", error);
      },
    );

    let raf = 0;
    let visible = true;
    const clock = new THREE.Clock();

    const render = () => {
      raf = requestAnimationFrame(render);
      // Skip the heavy transmission render while the canvas is off-screen.
      if (!visible) return;
      const t = clock.getElapsedTime();

      pointer.current.cx += (pointer.current.x - pointer.current.cx) * 0.06;
      pointer.current.cy += (pointer.current.y - pointer.current.cy) * 0.06;
      const cx = pointer.current.cx;
      const cy = pointer.current.cy;

      // Gentle idle sway + bob, no full spin, plus a nudge toward the cursor.
      group.rotation.y = Math.sin(t * 0.4) * 0.35 + cx * 0.5;
      group.position.y = Math.sin(t * 0.8) * 0.04;

      camera.position.x += (cx * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (-cy * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
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
      noiseTex.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate h-full min-h-full w-full overflow-hidden bg-transparent",
        className,
      )}
    />
  );
}
