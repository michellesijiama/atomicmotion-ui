"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BufferGeometry, Intersection, Mesh } from "three";

const MODEL = "/models/silicone-bunny.glb";
const POSTER = "/previews/digital-stress-reliever.png";
const PRESS_KEYS = new Set([" ", "Enter"]);
const CONTACT_LIMIT = 3;

const SQUEEZE_SHADER = `#define BUNNY_CONTACTS ${CONTACT_LIMIT}
uniform vec3 contactPoints[BUNNY_CONTACTS];
uniform vec3 contactAxes[BUNNY_CONTACTS];
uniform float pressures[BUNNY_CONTACTS];

vec3 squeeze(vec3 p) {
  vec3 shift = vec3(0.0);
  for (int i = 0; i < BUNNY_CONTACTS; i++) {
    if (pressures[i] < 0.001) continue;
    vec3 axis = contactAxes[i];
    vec3 offset = p - contactPoints[i];
    float axial = dot(offset, axis);
    vec3 radial = offset - axial * axis;
    float radiusSquared = dot(radial, radial);
    if (radiusSquared + axial * axial > 3.0) continue;
    // The thick cheeks take a deeper squeeze than the thin ear tips.
    float cheek = 1.0 - smoothstep(0.84, 1.42, contactPoints[i].y);
    float edge = sqrt(radiusSquared) - mix(0.31, 0.50, cheek);
    float weight = pressures[i] * exp(-axial * axial / mix(0.22, 0.50, cheek));
    float dent = mix(0.31, 0.72, cheek) * exp(-radiusSquared / mix(0.10, 0.18, cheek));
    float bulge = mix(0.12, 0.22, cheek) * exp(-edge * edge / 0.066);
    float spread = mix(0.22, 0.48, cheek) * exp(-radiusSquared / 0.52);
    shift += weight * (axis * (bulge - dent) + radial * spread);
  }
  return p + shift / max(1.0, length(shift) / 0.76);
}
`;

function bunnyPigment(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(256, 256);
  ctx.scale(128, -128);

  function oval(x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 0.445, 1.28);
    ctx.rotate(-side * 0.25);
    const ear = ctx.createLinearGradient(0, -0.58, 0, 0.56);
    ear.addColorStop(0, "#f3b3bf00");
    ear.addColorStop(0.37, "#eda9b689");
    ear.addColorStop(1, "#f0b0be9e");
    oval(0, 0, 0.119, 0.55, ear);
    ctx.restore();

    ctx.save();
    ctx.translate(side * 0.47, 0.19);
    ctx.scale(1, 0.58);
    const blush = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.23);
    blush.addColorStop(0, "#ee9cb194");
    blush.addColorStop(1, "#ee9cb100");
    oval(0, 0, 0.23, 0.23, blush);
    ctx.restore();

    oval(side * 0.29, 0.37, 0.042, 0.062, "#4e2e43");
    oval(side * 0.29 - 0.011, 0.391, 0.011, 0.014, "#fff7fd");
  }

  ctx.beginPath();
  ctx.moveTo(0, 0.217);
  ctx.bezierCurveTo(-0.105, 0.264, -0.041, 0.313, 0, 0.277);
  ctx.bezierCurveTo(0.041, 0.313, 0.105, 0.264, 0, 0.217);
  ctx.fillStyle = "#a95573";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0.22);
  ctx.lineTo(0, 0.177);
  ctx.quadraticCurveTo(-0.045, 0.137, -0.087, 0.165);
  ctx.moveTo(0, 0.177);
  ctx.quadraticCurveTo(0.045, 0.137, 0.087, 0.165);
  ctx.lineWidth = 0.013;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#704157";
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function bunnyFur(THREE: typeof import("three"), surface: BufferGeometry) {
  // Scatter a fixed set of fibers across the indexed mesh once, weighted by triangle area.
  const faces = surface.getIndex()!;
  const surfacePositions = surface.getAttribute("position");
  const surfaceNormals = surface.getAttribute("normal");
  const strands = 28000;
  const areas = new Float32Array(faces.count / 3);
  const positions = new Float32Array(strands * 6);
  const normals = new Int8Array(strands * 6);
  const fibers = new Uint8Array(strands * 4);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const root = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const tip = new THREE.Vector3();
  let seed = 74641;
  function sample() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  let totalArea = 0;
  for (let triangle = 0; triangle < areas.length; triangle++) {
    const offset = triangle * 3;
    a.fromBufferAttribute(surfacePositions, faces.getX(offset));
    b.fromBufferAttribute(surfacePositions, faces.getX(offset + 1)).sub(a);
    c.fromBufferAttribute(surfacePositions, faces.getX(offset + 2)).sub(a);
    totalArea += b.cross(c).length() * 0.5;
    areas[triangle] = totalArea;
  }

  let triangle = 0;
  for (let strand = 0; strand < strands; strand++) {
    const area = (strand + sample()) / strands * totalArea;
    while (triangle < areas.length - 1 && area > areas[triangle]) triangle++;
    const ia = faces.getX(triangle * 3);
    const ib = faces.getX(triangle * 3 + 1);
    const ic = faces.getX(triangle * 3 + 2);
    let u = sample();
    let v = sample();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    a.fromBufferAttribute(surfacePositions, ia);
    b.fromBufferAttribute(surfacePositions, ib);
    c.fromBufferAttribute(surfacePositions, ic);
    root.copy(a).multiplyScalar(w).addScaledVector(b, u).addScaledVector(c, v);
    a.fromBufferAttribute(surfaceNormals, ia);
    b.fromBufferAttribute(surfaceNormals, ib);
    c.fromBufferAttribute(surfaceNormals, ic);
    normal.copy(a).multiplyScalar(w).addScaledVector(b, u).addScaledVector(c, v).normalize();

    const variation = sample();
    const length = 0.021 + 0.041 * variation ** 2;
    tangent.set(sample() - 0.5, -0.52, sample() - 0.5);
    tangent.addScaledVector(normal, -tangent.dot(normal));
    tip.copy(root).addScaledVector(normal, length).addScaledVector(tangent, length * 1.25);
    root.toArray(positions, strand * 6);
    tip.toArray(positions, strand * 6 + 3);
    normal.multiplyScalar(127).toArray(normals, strand * 6);
    normal.toArray(normals, strand * 6 + 3);
    const tone = Math.round(sample() * 255);
    const offset = strand * 4;
    fibers[offset + 1] = tone;
    fibers[offset + 2] = 255;
    fibers[offset + 3] = tone;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3, true));
  geometry.setAttribute("fiber", new THREE.BufferAttribute(fibers, 2, true));
  return geometry;
}

function mountBunny(
  THREE: typeof import("three"),
  geometry: BufferGeometry,
  canvas: HTMLCanvasElement,
  frame: HTMLButtonElement,
  onReady: () => void,
  onContextLost: () => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.01;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 25);
  camera.position.set(0, 0.83, 5.22);
  camera.lookAt(0, 0.76, 0);
  camera.updateMatrixWorld();

  scene.add(new THREE.HemisphereLight("#fffdfa", "#b9b6ce", 1.48));
  const key = new THREE.DirectionalLight("#fffbf5", 1.7);
  key.position.set(-3.6, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#f2f5ff", 0.48);
  fill.position.set(3, 1, 5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#f5f2ff", 1.08);
  rim.position.set(3, 2, -4);
  scene.add(rim);

  const material = new THREE.MeshPhysicalMaterial({
    color: "#fcf8f3",
    roughness: 0.81,
    sheen: 0.76,
    sheenColor: new THREE.Color("#f9f5ff"),
    sheenRoughness: 0.72,
  });
  const pigment = bunnyPigment(THREE);
  const contacts = Array.from({ length: CONTACT_LIMIT }, () => ({
    source: null as number | string | null,
    support: false,
    goal: 0,
    strength: 0,
    speed: 0,
    point: new THREE.Vector3(),
    axis: new THREE.Vector3(0, 0, 1),
    target: new THREE.Vector3(),
    targetAxis: new THREE.Vector3(0, 0, 1),
  }));
  type Contact = (typeof contacts)[number];
  const pressures = new Float32Array(CONTACT_LIMIT);
  const squeezeUniforms = {
    contactPoints: { value: contacts.map((contact) => contact.point) },
    contactAxes: { value: contacts.map((contact) => contact.axis) },
    pressures: { value: pressures },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, squeezeUniforms, { bunnyPigment: { value: pigment } });
    shader.vertexShader = `${SQUEEZE_SHADER}
      varying vec3 vBunnyRest;
      ${shader.vertexShader}`
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        vec3 bent = position;
        if (pressures[0] + pressures[1] + pressures[2] > 0.001) {
          bent = squeeze(position);
          vec3 helper = abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
          vec3 tangent = normalize(cross(normal, helper));
          vec3 bitangent = cross(normal, tangent);
          objectNormal = normalize(cross(squeeze(position + tangent * 0.008) - bent,
                                         squeeze(position + bitangent * 0.008) - bent));
        }`)
      .replace("#include <begin_vertex>", "vec3 transformed = bent;\n vBunnyRest = position;");
    shader.fragmentShader = `uniform sampler2D bunnyPigment;
      varying vec3 vBunnyRest;
      ${shader.fragmentShader}`.replace("#include <color_fragment>", `#include <color_fragment>
        vec3 fiberPosition = vBunnyRest * vec3(151.0, 104.0, 151.0);
        float fiberScale = 1.0 - smoothstep(1.0, 2.6, length(fwidth(fiberPosition)));
        vec3 fiberCell = fract(floor(fiberPosition) * 0.1031);
        fiberCell += dot(fiberCell, fiberCell.yzx + 33.33);
        float fibers = fract((fiberCell.x + fiberCell.y) * fiberCell.z);
        float glint = smoothstep(0.96, 1.0, fibers) * pow(max(normalize(vNormal).z, 0.0), 4.0);
        diffuseColor.rgb *= 1.0 + ((fibers - 0.5) * 0.10 + glint * 0.05) * fiberScale;
        vec4 paint = texture2D(bunnyPigment, vBunnyRest.xy * 0.25 + 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, paint.rgb, paint.a * smoothstep(0.02, 0.18, vBunnyRest.z));`);
  };

  const bunny = new THREE.Mesh(geometry, material);
  const furGeometry = bunnyFur(THREE, geometry);
  const furMaterial = new THREE.ShaderMaterial({
    uniforms: { ...squeezeUniforms, bunnyPigment: { value: pigment } },
    transparent: true,
    depthWrite: false,
    vertexShader: `${SQUEEZE_SHADER}
      uniform sampler2D bunnyPigment;
      attribute vec2 fiber;
      varying vec2 vFiber;
      varying vec3 vFiberColor;
      varying float vFacing;

      void main() {
        vec3 point = position;
        if (pressures[0] + pressures[1] + pressures[2] > 0.001) point = squeeze(point);
        vec3 n = normalize(normalMatrix * normal);
        float light = max(dot(n, normalize(vec3(-0.55, 0.78, 0.55))), 0.0);
        vec3 color = mix(vec3(0.46, 0.44, 0.51), vec3(0.99, 0.97, 0.94), light);
        vec4 paint = texture2D(bunnyPigment, position.xy * 0.25 + 0.5);
        vFiberColor = mix(color, paint.rgb * (0.66 + light * 0.55), paint.a * smoothstep(0.02, 0.18, position.z));
        vFacing = abs(n.z);
        vFiber = fiber;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vFiber;
      varying vec3 vFiberColor;
      varying float vFacing;

      void main() {
        float opacity = mix(0.57, 0.29, vFacing) * smoothstep(0.02, 0.29, vFiber.x)
          * (1.0 - smoothstep(0.48, 1.0, vFiber.x));
        gl_FragColor = vec4(vFiberColor * mix(0.78, 1.20, vFiber.y), opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  bunny.add(new THREE.LineSegments(furGeometry, furMaterial));
  scene.add(bunny);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const front = new THREE.Vector3(0, 0, 1);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let request = 0;
  let previousTime = 0;
  let pulse = 0;
  let lost = false;
  let visible = true;
  let rendered = false;
  const pendingPointers = new Map<number, { x: number; y: number }>();
  let dirty = true;

  function hit(x: number, y: number) {
    const bounds = canvas.getBoundingClientRect();
    ndc.set(((x - bounds.left) / bounds.width) * 2 - 1, 1 - ((y - bounds.top) / bounds.height) * 2);
    ray.setFromCamera(ndc, camera);
    bunny.updateMatrixWorld();
    return ray.intersectObject(bunny, false)[0];
  }

  function placeContact(contact: Contact, intersection: Intersection) {
    contact.target.copy(bunny.worldToLocal(intersection.point));
    // Keep the press aimed inward, even when the pointer catches the silhouette.
    contact.targetAxis.copy(intersection.normal ?? intersection.face!.normal).lerp(front, 0.18).normalize();
    if (contact.strength < 0.04 || reducedMotion.matches) {
      contact.point.copy(contact.target);
      contact.axis.copy(contact.targetAxis);
    }
  }

  function hasGrip() {
    return contacts.some((contact) => contact.source !== null);
  }

  function findPrimary(source: number | string) {
    return contacts.find((contact) => contact.source === source && !contact.support);
  }

  function render(time: number) {
    request = 0;
    for (const [id, pointer] of pendingPointers) {
      const intersection = hit(pointer.x, pointer.y);
      const contact = findPrimary(id);
      if (contact && intersection) {
        placeContact(contact, intersection);
        dirty = true;
      } else if (!hasGrip()) {
        frame.style.cursor = intersection ? "grab" : "default";
      }
    }
    pendingPointers.clear();
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.12) : 1 / 60;
    previousTime = time;
    const reduced = reducedMotion.matches;
    const follow = reduced ? 1 : 1 - Math.exp(-dt * 24);
    let moving = false;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const { goal } = contact;
      if (!goal && !contact.strength) continue;
      // An exact damped spring keeps the slow recovery consistent on lower refresh rates.
      const frequency = goal ? 16 : 2.65;
      const displacement = contact.strength - goal;
      const drift = contact.speed + frequency * displacement;
      const decay = Math.exp(-frequency * dt);
      contact.speed = reduced ? 0 : (contact.speed - frequency * drift * dt) * decay;
      contact.strength = reduced ? goal : Math.max(0, goal + (displacement + drift * dt) * decay);
      const settling = Math.abs(goal - contact.strength) + Math.abs(contact.speed) > 0.007;
      if (!settling) contact.strength = goal;
      const sliding = goal > 0 && (contact.point.distanceToSquared(contact.target) > 0.00001 ||
        contact.axis.distanceToSquared(contact.targetAxis) > 0.00001);
      contact.point.lerp(contact.target, follow);
      contact.axis.lerp(contact.targetAxis, follow).normalize();
      dirty ||= settling || sliding || pressures[i] !== Math.fround(contact.strength);
      pressures[i] = contact.strength;
      moving ||= settling || sliding;
    }
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
      if (!rendered) {
        rendered = true;
        onReady();
      }
    }
    if (moving) draw();
    else previousTime = 0;
  }

  function draw() {
    if (!request && !lost && visible && !document.hidden) request = requestAnimationFrame(render);
  }

  function syncVisibility() {
    if (visible && !document.hidden) draw();
    else {
      cancelAnimationFrame(request);
      request = 0;
      previousTime = 0;
    }
  }

  function resize() {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
    draw();
  }

  function start(source: number | string, support = false) {
    let slot: Contact | undefined;
    for (const contact of contacts) {
      if (contact.source === null && (!slot || contact.strength < slot.strength)) slot = contact;
    }
    if (!slot) return;
    slot.source = source;
    slot.support = support;
    slot.goal = support ? 0.60 : 1;
    slot.strength = 0;
    slot.speed = 0;
    frame.style.cursor = "grabbing";
    draw();
    return slot;
  }

  function release(source: number | string) {
    for (const contact of contacts) {
      if (contact.source !== source) continue;
      contact.source = null;
      contact.goal = 0;
      contact.speed = 0;
    }
    if (!hasGrip()) frame.style.cursor = "grab";
    draw();
  }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || findPrimary(event.pointerId)) return;
    pendingPointers.delete(event.pointerId);
    const intersection = hit(event.clientX, event.clientY);
    if (!intersection) return;
    const contact = start(event.pointerId);
    if (!contact) return;
    frame.setPointerCapture(event.pointerId);
    placeContact(contact, intersection);

    // Mouse input gets a lighter, fixed grip on the other side of the toy.
    if (event.pointerType === "mouse") {
      const bounds = canvas.getBoundingClientRect();
      const center = bounds.left + bounds.width / 2;
      const side = event.clientX <= center ? 1 : -1;
      const supportY = event.clientY + bounds.height * 0.064;
      const opposite = hit(center + side * bounds.width * 0.17, supportY)
        ?? hit(center + side * bounds.width * 0.17, event.clientY)
        ?? hit(center + side * bounds.width * 0.11, supportY);
      if (!opposite) return;
      const support = start(event.pointerId, true);
      if (support) placeContact(support, opposite);
    }
  }

  function pointerMove(event: PointerEvent) {
    if (!findPrimary(event.pointerId) && (hasGrip() || event.pointerType !== "mouse")) return;
    pendingPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    draw();
  }

  function pointerLeave(event: PointerEvent) {
    pendingPointers.delete(event.pointerId);
    if (!hasGrip()) frame.style.cursor = "default";
  }

  function pointerEnd(event: PointerEvent) {
    pendingPointers.delete(event.pointerId);
    release(event.pointerId);
  }

  function startFromKeyboard(source: string) {
    if (hasGrip()) return;
    const contact = start(source);
    if (!contact) return;
    contact.target.set(-0.31, 0.16, 0.68);
    contact.targetAxis.set(-0.22, 0.04, 0.97).normalize();
    contact.point.copy(contact.target);
    contact.axis.copy(contact.targetAxis);
  }

  function keyDown(event: KeyboardEvent) {
    if (!PRESS_KEYS.has(event.key)) return;
    event.preventDefault();
    if (!event.repeat) startFromKeyboard(event.key);
  }

  function keyUp(event: KeyboardEvent) {
    if (!PRESS_KEYS.has(event.key)) return;
    event.preventDefault();
    release(event.key);
  }

  function blur() {
    for (const contact of contacts) {
      if (typeof contact.source === "string") release(contact.source);
    }
  }

  function click(event: MouseEvent) {
    if (event.detail !== 0 || hasGrip()) return;
    startFromKeyboard("activation");
    window.clearTimeout(pulse);
    pulse = window.setTimeout(() => release("activation"), 390);
  }

  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    onContextLost();
  }

  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  frame.addEventListener("pointerdown", pointerDown, options);
  frame.addEventListener("pointermove", pointerMove, options);
  frame.addEventListener("pointerleave", pointerLeave, options);
  frame.addEventListener("pointerup", pointerEnd, options);
  frame.addEventListener("pointercancel", pointerEnd, options);
  frame.addEventListener("lostpointercapture", pointerEnd, options);
  frame.addEventListener("keydown", keyDown, options);
  frame.addEventListener("keyup", keyUp, options);
  frame.addEventListener("blur", blur, options);
  frame.addEventListener("click", click, options);
  reducedMotion.addEventListener("change", draw, options);
  document.addEventListener("visibilitychange", syncVisibility, options);
  canvas.addEventListener("webglcontextlost", contextLost, options);
  const observer = new ResizeObserver(resize);
  observer.observe(frame);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncVisibility();
  });
  visibility.observe(frame);
  resize();

  return () => {
    listeners.abort();
    observer.disconnect();
    visibility.disconnect();
    cancelAnimationFrame(request);
    window.clearTimeout(pulse);
    geometry.dispose();
    material.dispose();
    furGeometry.dispose();
    furMaterial.dispose();
    pigment.dispose();
    renderer.dispose();
  };
}

export type DigitalStressRelieverProps = {
  /** Show the still preview without loading the 3D model. */
  loop?: boolean;
};

export function DigitalStressReliever({ loop = false }: DigitalStressRelieverProps) {
  const frame = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hint = useId();
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const button = frame.current;
    const surface = canvas.current;
    if (loop || !button || !surface) return;

    const load = new AbortController();
    let dispose: (() => void) | undefined;
    async function start(surface: HTMLCanvasElement, button: HTMLButtonElement) {
      const [THREE, { GLTFLoader }, { MeshoptDecoder }, response] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/libs/meshopt_decoder.module.js"),
        fetch(MODEL, { signal: load.signal }),
      ]);
      if (!response.ok) throw new Error("Could not load the bunny mesh");
      const bytes = await response.arrayBuffer();
      if (load.signal.aborted) return;
      const model = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes, "");
      const mesh = model.scene.children[0] as Mesh<BufferGeometry, import("three").Material>;
      mesh.material.dispose();
      if (load.signal.aborted) {
        mesh.geometry.dispose();
        return;
      }
      try {
        dispose = mountBunny(THREE, mesh.geometry, surface, button, () => setStatus("ready"), () => {
          dispose?.();
          dispose = undefined;
          setStatus("fallback");
        });
      } catch (error) {
        mesh.geometry.dispose();
        throw error;
      }
    }
    // Keep the poster as the first paint and start loading only on the detail view.
    const firstFrame = requestAnimationFrame(() => {
      start(surface, button).catch(() => {
        if (!load.signal.aborted) setStatus("fallback");
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      load.abort();
      dispose?.();
    };
  }, [loop]);

  const interactive = !loop && status !== "fallback";
  const ready = interactive && status === "ready";
  return (
    <div className="grid min-h-full min-w-0 place-items-center">
      {!ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={POSTER} alt="White plush bunny head" width={500} height={600} className="col-start-1 row-start-1 aspect-[5/6] w-full max-w-[500px] object-contain" />
      )}
      {interactive && (
        <button
          ref={frame}
          type="button"
          aria-label="Squeeze the 3D bunny"
          aria-describedby={hint}
          disabled={!ready}
          className="relative col-start-1 row-start-1 aspect-[5/6] w-full max-w-[500px] touch-none select-none rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a95573]"
        >
          <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
          <span id={hint} className="sr-only">Press and drag with your mouse to squeeze, or use up to three fingers to press different spots. You can also press Space or Enter. Release to let the bunny slowly recover.</span>
        </button>
      )}
    </div>
  );
}
