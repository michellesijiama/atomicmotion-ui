"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { cn } from "@/lib/utils";

export type GradientAuraProps = {
  className?: string;
  loop?: boolean;
};

// A single glossy 3D blob that morphs circle → heart → rectangle and loops.
// Built from one sphere whose vertices carry two morph targets (a heart and a
// rounded rectangle); the influences cross-fade on a timeline. Physically-based
// glossy material with real environment reflections, multi-color vertex gradient,
// transparent background, and cursor parallax.

const PALETTE = ["#6ee7c7", "#5b8cff", "#a86bf0", "#ff7eb3", "#b6f06a", "#ffd15c", "#ff8a5c"];

// Implicit "Taubin heart": lobes along +z, cusp at -z, thin along y.
function heartField(x: number, y: number, z: number) {
  const a = x * x + 2.25 * y * y + z * z - 1;
  return a * a * a - x * x * z * z * z - 0.1125 * y * y * z * z * z;
}

// Solve for the heart-surface radius along a view direction (heart faces camera:
// its thin axis maps to view-z, lobes point up in view-y).
function heartRadius(dx: number, dy: number, dz: number) {
  const ex = dx;
  const ey = dz; // thin axis
  const ez = dy; // vertical (lobes/cusp)
  let lo = 0.001;
  let hi = 3;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (heartField(ex * mid, ey * mid, ez * mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// Superellipsoid → rounded rectangular slab (wide x, medium y, thin z).
function rectRadius(dx: number, dy: number, dz: number) {
  const n = 6;
  const ax = Math.abs(dx / 1.25);
  const ay = Math.abs(dy / 0.95);
  const az = Math.abs(dz / 0.58);
  return 1 / Math.pow(ax ** n + ay ** n + az ** n, 1 / n);
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// [rectInfluence, heartInfluence] over a normalized cycle phase.
function influences(ph: number): [number, number] {
  if (ph < 0.3) return [0, smoothstep(0.03, 0.27, ph)];
  if (ph < 0.4) return [0, 1];
  if (ph < 0.66) {
    const k = smoothstep(0.4, 0.63, ph);
    return [k, 1 - k];
  }
  if (ph < 0.76) return [1, 0];
  return [1 - smoothstep(0.76, 0.99, ph), 0];
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    camera.position.set(0, 0, 4.2);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);
    const rimA = new THREE.PointLight(0x6ea8ff, 22, 14);
    rimA.position.set(-3, -1.5, 2);
    scene.add(rimA);
    const rimB = new THREE.PointLight(0xff8ad0, 18, 14);
    rimB.position.set(3, 2, -1);
    scene.add(rimB);

    // Base sphere ("circle") + heart & rectangle morph targets from the same
    // vertices, so they deform smoothly into one another.
    const base = new THREE.SphereGeometry(1.05, 128, 128);
    const posAttr = base.attributes.position as THREE.BufferAttribute;
    const normAttr = base.attributes.normal as THREE.BufferAttribute;
    const count = posAttr.count;

    const heartPos = new Float32Array(count * 3);
    const rectPos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const stops = PALETTE.map((c) => new THREE.Color(c));
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Unit direction (base is a radius-1.05 sphere → normalize).
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      const inv = 1 / Math.hypot(px, py, pz);
      const dx = px * inv;
      const dy = py * inv;
      const dz = pz * inv;

      const hr = heartRadius(dx, dy, dz) * 0.92;
      heartPos[i * 3] = dx * hr;
      heartPos[i * 3 + 1] = dy * hr + 0.15; // lift so the heart sits centered
      heartPos[i * 3 + 2] = dz * hr;

      const rr = rectRadius(dx, dy, dz);
      rectPos[i * 3] = dx * rr;
      rectPos[i * 3 + 1] = dy * rr;
      rectPos[i * 3 + 2] = dz * rr;

      // Multi-color gradient across the blob (diagonal sweep through palette).
      const t = Math.min(1, Math.max(0, (dx * 0.45 + dy * 0.55) * 0.5 + 0.5)) * (stops.length - 1);
      const idx = Math.floor(t);
      col.copy(stops[idx]).lerp(stops[Math.min(idx + 1, stops.length - 1)], t - idx);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    base.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const rectGeom = base.clone();
    rectGeom.setAttribute("position", new THREE.BufferAttribute(rectPos, 3));
    rectGeom.computeVertexNormals();
    const heartGeom = base.clone();
    heartGeom.setAttribute("position", new THREE.BufferAttribute(heartPos, 3));
    heartGeom.computeVertexNormals();

    // Relative morphs = target minus base, for both position and normal.
    const rectPD = new Float32Array(count * 3);
    const rectND = new Float32Array(count * 3);
    const heartPD = new Float32Array(count * 3);
    const heartND = new Float32Array(count * 3);
    const rectN = rectGeom.attributes.normal as THREE.BufferAttribute;
    const heartN = heartGeom.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 3; k++) {
        const bi = posAttr.array[i * 3 + k];
        const bn = normAttr.array[i * 3 + k];
        rectPD[i * 3 + k] = rectPos[i * 3 + k] - bi;
        heartPD[i * 3 + k] = heartPos[i * 3 + k] - bi;
        rectND[i * 3 + k] = rectN.array[i * 3 + k] - bn;
        heartND[i * 3 + k] = heartN.array[i * 3 + k] - bn;
      }
    }
    base.morphAttributes.position = [
      new THREE.BufferAttribute(rectPD, 3),
      new THREE.BufferAttribute(heartPD, 3),
    ];
    base.morphAttributes.normal = [
      new THREE.BufferAttribute(rectND, 3),
      new THREE.BufferAttribute(heartND, 3),
    ];
    base.morphTargetsRelative = true;
    rectGeom.dispose();
    heartGeom.dispose();

    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.5,
      iridescence: 0.3,
      iridescenceIOR: 1.3,
      sheen: 0.4,
    });

    const mesh = new THREE.Mesh(base, material);
    scene.add(mesh);

    const CYCLE = 9; // seconds for circle → heart → rectangle → circle
    let raf = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const t = clock.getElapsedTime();

      pointer.current.cx += (pointer.current.x - pointer.current.cx) * 0.06;
      pointer.current.cy += (pointer.current.y - pointer.current.cy) * 0.06;
      const cx = pointer.current.cx;
      const cy = pointer.current.cy;

      const [rectInf, heartInf] = influences((t % CYCLE) / CYCLE);
      if (mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[0] = rectInf;
        mesh.morphTargetInfluences[1] = heartInf;
      }

      // Gentle oscillating tilt (not a full spin, so heart/rect stay readable).
      mesh.rotation.y = Math.sin(t * 0.2) * 0.35 + cx * 0.4;
      mesh.rotation.x = Math.sin(t * 0.16) * 0.12 - cy * 0.3;

      camera.position.x += (cx * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (-cy * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
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

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.remove();
      base.dispose();
      material.dispose();
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
