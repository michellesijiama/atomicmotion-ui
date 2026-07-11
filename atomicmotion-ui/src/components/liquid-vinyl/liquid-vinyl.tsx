"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { cn } from "@/lib/utils";

export type LiquidVinylProps = {
  className?: string;
  loop?: boolean;
};

// Citrus marble: orange and lemon with milky white ribbons and a touch of lime.
const PALETTE = {
  liquid: 0xffc21f,
  accent: 0xff421d,
  lime: 0xb8e13b,
};

const liquidVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const liquidFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform vec3 uLime;
  varying vec2 vUv;
  varying vec3 vPosition;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotate = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      value += noise(p) * amplitude;
      p = rotate * p * 2.05 + vec2(0.71, -0.43);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 p = vUv - 0.5;
    float radius = length(p) * 2.0;
    float angle = atan(p.y, p.x);
    vec2 dir = p / max(length(p), 0.001);
    float angularFlow = dot(dir, vec2(2.15, -1.35)) + radius * 0.7;
    float flow = noise(vec2(angularFlow + uTime * 0.05, radius * 10.0 - uTime * 0.11));
    vec2 marbleUv = dir * (1.85 + radius * 0.55) + vec2(radius * 1.35, -radius * 0.82);
    marbleUv += vec2(flow * 1.6, -flow * 0.85);
    float marbleNoise = fbm(marbleUv * 1.02 + uTime * 0.018);
    float pour = sin((dot(dir, vec2(1.42, -0.62)) + radius * 3.05 + marbleNoise * 3.28 - uTime * 0.055) * 3.14159);
    float cloud = smoothstep(-0.18, 1.02, pour * 0.5 + 0.5);
    float softCloud = fbm(marbleUv * 0.42 + vec2(0.18, -0.27) + uTime * 0.01);
    cloud = mix(cloud, smoothstep(0.22, 0.82, softCloud), 0.46);
    cloud *= smoothstep(0.24, 0.5, radius) * (1.0 - smoothstep(0.88, 1.0, radius));
    float pulp = smoothstep(0.46, 0.86, marbleNoise + pour * 0.08);
    pulp *= smoothstep(0.22, 0.44, radius) * (1.0 - smoothstep(0.9, 1.0, radius));
    float rind = fbm(dir * 4.2 + vec2(radius * 2.1, -radius * 1.4));
    float rindVein = smoothstep(0.42, 0.74, rind) * smoothstep(0.3, 0.52, radius);
    float milky = smoothstep(0.36, 0.92, marbleNoise) * 0.34;
    float surfaceGrain = fbm(marbleUv * 6.4 + vec2(flow * 1.7, -flow * 1.2));
    float subsurface = fbm(marbleUv * 2.65 - vec2(radius * 0.6, flow));
    float ribbon = sin(angle * 5.0 + radius * 24.0 - uTime * 0.34 + flow * 4.0);
    float fine = sin(radius * 178.0 + angle * 2.0 + flow * 3.0) * 0.5 + 0.5;
    float caustic = smoothstep(0.68, 1.0, sin(angle * 3.0 - radius * 15.0 + uTime * 0.18) * 0.5 + 0.5);

    vec3 cream = vec3(1.0, 0.975, 0.88);
    vec3 citrus = mix(uColor, uAccent, 0.34 + marbleNoise * 0.34);
    vec3 color = mix(citrus, cream, cloud * 0.48 + milky * 0.08);
    color = mix(color, vec3(1.0, 0.76, 0.08), pulp * 0.3);
    float limeBloom = smoothstep(0.62, 0.84, softCloud + flow * 0.14);
    limeBloom *= 1.0 - smoothstep(0.48, 0.78, cloud);
    limeBloom *= smoothstep(0.34, 0.54, radius) * (1.0 - smoothstep(0.82, 0.96, radius));
    color = mix(color, uLime, limeBloom * 0.24 + rindVein * 0.18);

    // Frosted, foggy haze: lift the surface toward a soft milky tint so the
    // glass reads misty rather than clear.
    vec3 fogTint = mix(uColor, cream, 0.74);
    float haze = smoothstep(0.1, 0.9, flow) * 0.04 + milky * 0.08 + 0.035;
    color = mix(color, fogTint, haze);
    float reliefLight = (surfaceGrain - 0.5) * 0.1 + (subsurface - 0.5) * 0.12 + fine * 0.02;
    color *= 1.0 + reliefLight;
    color += ribbon * 0.01 + fine * 0.012;

    float outerFade = 1.0 - smoothstep(0.94, 1.0, radius);
    float innerFade = smoothstep(0.28, 0.34, radius);
    float alpha = (0.62 + flow * 0.07 + caustic * 0.02) * outerFade * innerFade;
    gl_FragColor = vec4(color, alpha);
  }
`;

function createSurfaceTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create liquid vinyl texture.");
  }

  const image = context.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const groove = Math.sin(radius * 1.52) * 19;
      const grain = (Math.random() - 0.5) * 18;
      const value = Math.max(0, Math.min(255, 132 + groove + grain));
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 1.2);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createLiquidReliefTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create liquid vinyl relief texture.");
  }

  const image = context.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - size / 2) / size;
      const ny = (y - size / 2) / size;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);
      const swirl = Math.sin(angle * 3.2 + radius * 56 + Math.sin(angle * 5.0 - radius * 34) * 1.4);
      const cloud = Math.sin(nx * 25 - ny * 13 + Math.sin(ny * 19) * 1.2);
      const vein = Math.sin(angle * 9.0 + radius * 132 + cloud * 0.8);
      const groove = Math.sin(radius * size * 1.45);
      const pore = Math.sin(x * 0.53 + y * 0.31) * Math.sin(x * 0.19 - y * 0.47);
      const relief = 128 + swirl * 23 + cloud * 15 + vein * 9 + groove * 7 + pore * 5;
      const value = Math.max(0, Math.min(255, relief));
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.04, 1.04);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createOrangeLabelTexture() {
  const size = 1024;
  const center = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create liquid vinyl orange label.");
  }

  const background = context.createRadialGradient(center - 110, center - 120, 30, center, center, center);
  background.addColorStop(0, "#f9822f");
  background.addColorStop(0.48, "#e85b17");
  background.addColorStop(1, "#b83b0d");
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);

  context.save();

  context.beginPath();
  context.arc(center, center, 462, 0, Math.PI * 2);
  context.lineWidth = 22;
  context.strokeStyle = "rgba(255, 223, 179, 0.62)";
  context.stroke();

  context.beginPath();
  context.arc(center, center, 332, 0, Math.PI * 2);
  context.lineWidth = 5;
  context.strokeStyle = "rgba(255, 235, 205, 0.42)";
  context.stroke();

  context.font = "600 74px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255, 247, 226, 0.9)";
  context.shadowColor = "rgba(137, 45, 8, 0.24)";
  context.shadowBlur = 7;
  for (let i = 0; i < 5; i++) {
    context.save();
    context.translate(center, center);
    context.rotate((i / 5) * Math.PI * 2);
    context.translate(0, -370);
    context.fillText("Atomic Motion", 0, 0);
    context.restore();
  }
  context.shadowBlur = 0;

  for (let i = 0; i < 520; i++) {
    const angle = i * 12.9898;
    const radius = 24 + ((i * 73) % 424);
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    context.beginPath();
    context.arc(x, y, 0.8 + (i % 3) * 0.55, 0, Math.PI * 2);
    context.fillStyle = i % 4 === 0 ? "rgba(255, 235, 203, 0.16)" : "rgba(112, 32, 5, 0.08)";
    context.fill();
  }

  context.beginPath();
  context.arc(center, center, 74, 0, Math.PI * 2);
  context.lineWidth = 5;
  context.strokeStyle = "rgba(255, 225, 186, 0.34)";
  context.stroke();
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createLabelPlasticTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create liquid vinyl label plastic texture.");
  }

  const image = context.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - size / 2) / size;
      const ny = (y - size / 2) / size;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const scuff = Math.sin(x * 0.19 + y * 0.27) * 9 + Math.sin(radius * size * 1.8) * 6;
      const speckle = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const value = Math.max(0, Math.min(255, 126 + scuff + speckle * 12));
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.3, 1.3);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createGrooveGeometry() {
  const positions: number[] = [];
  const segments = 192;

  for (let ring = 0; ring < 42; ring++) {
    const radius = 0.72 + ring * 0.0325;
    for (let segment = 0; segment < segments; segment++) {
      const a = (segment / segments) * Math.PI * 2;
      const b = ((segment + 1) / segments) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, Math.sin(a) * radius, 0.132);
      positions.push(Math.cos(b) * radius, Math.sin(b) * radius, 0.132);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createHighlightArc(radius: number, start: number, length: number, z: number) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, start, start + length, false, 0);
  return new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(96).map((point) => new THREE.Vector3(point.x, point.y, z)),
  );
}

function createSoftShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create liquid vinyl shadow texture.");
  }

  const gradient = context.createRadialGradient(128, 128, 36, 128, 128, 126);
  gradient.addColorStop(0, "rgba(96, 76, 20, 0.2)");
  gradient.addColorStop(0.58, "rgba(96, 76, 20, 0.1)");
  gradient.addColorStop(1, "rgba(96, 76, 20, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function LiquidVinyl({ className, loop = false }: LiquidVinylProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (loop) return;
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 1;
    let height = container.clientHeight || 1;
    let visible = true;
    let cancelled = false;
    let raf = 0;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.dataset.liquidVinylCanvas = "true";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const keyLight = new THREE.DirectionalLight(0xfff8ea, 3.5);
    keyLight.position.set(-3.5, 4.5, 5.5);
    scene.add(keyLight);

    const sideLight = new THREE.PointLight(0x9ecbd3, 28, 13, 1.8);
    sideLight.position.set(4.2, 1.4, 3.1);
    scene.add(sideLight);

    const warmLight = new THREE.PointLight(0xffd8b8, 22, 12, 1.8);
    warmLight.position.set(-3.5, -2.6, 2.2);
    scene.add(warmLight);

    const group = new THREE.Group();
    group.rotation.set(-0.17, 0.13, -0.05);
    group.scale.setScalar(0.88);
    scene.add(group);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const surfaceTexture = createSurfaceTexture();
    const liquidReliefTexture = createLiquidReliefTexture();
    const softShadowTexture = createSoftShadowTexture();
    const sunlightCausticsTexture = new THREE.TextureLoader().load(
      "/liquid-vinyl/sunlight-caustics-map.jpg",
      (texture) => {
        if (cancelled) texture.dispose();
      },
    );
    sunlightCausticsTexture.colorSpace = THREE.NoColorSpace;
    sunlightCausticsTexture.center.set(0.5, 0.5);
    sunlightCausticsTexture.rotation = -0.28;
    sunlightCausticsTexture.minFilter = THREE.LinearMipmapLinearFilter;
    sunlightCausticsTexture.magFilter = THREE.LinearFilter;
    textures.push(surfaceTexture, liquidReliefTexture, softShadowTexture, sunlightCausticsTexture);

    const shadowMaterial = new THREE.SpriteMaterial({
      map: softShadowTexture,
      color: 0xc7a846,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    });
    materials.push(shadowMaterial);
    const softShadow = new THREE.Sprite(shadowMaterial);
    softShadow.position.set(0.19, -0.18, -0.24);
    softShadow.scale.set(4.65, 4.65, 1);
    scene.add(softShadow);

    const shellGeometry = new THREE.CylinderGeometry(2.2, 2.2, 0.22, 160, 2, false);
    shellGeometry.rotateX(Math.PI / 2);
    geometries.push(shellGeometry);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfffbef,
      transparent: true,
      opacity: 0.36,
      transmission: 0.92,
      roughness: 0.42,
      roughnessMap: surfaceTexture,
      bumpMap: liquidReliefTexture,
      bumpScale: 0.018,
      ior: 1.42,
      thickness: 0.62,
      attenuationColor: new THREE.Color(0xfff6df),
      attenuationDistance: 2.2,
      clearcoat: 0.88,
      clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materials.push(shellMaterial);
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.renderOrder = 4;
    group.add(shell);

    const liquidShape = new THREE.Shape();
    liquidShape.absarc(0, 0, 2.055, 0, Math.PI * 2, false);
    const liquidHole = new THREE.Path();
    liquidHole.absarc(0, 0, 0.68, 0, Math.PI * 2, true);
    liquidShape.holes.push(liquidHole);
    const liquidVolumeGeometry = new THREE.ExtrudeGeometry(liquidShape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.018,
      bevelThickness: 0.014,
      curveSegments: 128,
    });
    liquidVolumeGeometry.translate(0, 0, -0.0375);
    geometries.push(liquidVolumeGeometry);
    const liquidVolumeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xcac6bc,
      transparent: true,
      opacity: 0.58,
      transmission: 0.74,
      roughness: 0.28,
      roughnessMap: liquidReliefTexture,
      bumpMap: liquidReliefTexture,
      bumpScale: 0.018,
      ior: 1.37,
      thickness: 0.96,
      attenuationColor: new THREE.Color(0xcac6bc),
      attenuationDistance: 1.25,
      clearcoat: 0.72,
      clearcoatRoughness: 0.24,
      depthWrite: false,
    });
    materials.push(liquidVolumeMaterial);
    const liquidVolume = new THREE.Mesh(liquidVolumeGeometry, liquidVolumeMaterial);
    liquidVolume.renderOrder = 1;
    group.add(liquidVolume);

    const liquidSurfaceGeometry = new THREE.RingGeometry(0.68, 2.055, 192, 3);
    geometries.push(liquidSurfaceGeometry);
    const liquidSurfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xcac6bc) },
        uAccent: { value: new THREE.Color(0x6499a3) },
        uLime: { value: new THREE.Color(0xb7d947) },
      },
      vertexShader: liquidVertexShader,
      fragmentShader: liquidFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
    materials.push(liquidSurfaceMaterial);
    const liquidSurface = new THREE.Mesh(liquidSurfaceGeometry, liquidSurfaceMaterial);
    liquidSurface.position.z = 0.081;
    liquidSurface.renderOrder = 2;
    group.add(liquidSurface);

    const meniscusMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfff7d6,
      transparent: true,
      opacity: 0.46,
      transmission: 0.82,
      roughness: 0.34,
      bumpMap: liquidReliefTexture,
      bumpScale: 0.024,
      clearcoat: 0.7,
      clearcoatRoughness: 0.32,
      depthWrite: false,
    });
    materials.push(meniscusMaterial);
    for (const radius of [0.68, 2.055]) {
      const geometry = new THREE.TorusGeometry(radius, radius < 1 ? 0.018 : 0.03, 10, 160);
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, meniscusMaterial);
      mesh.position.z = 0.086;
      mesh.renderOrder = 3;
      group.add(mesh);
    }

    const grooveGeometry = createGrooveGeometry();
    geometries.push(grooveGeometry);
    const grooveMaterial = new THREE.LineBasicMaterial({
      color: 0xa78f47,
      transparent: true,
      opacity: 0.095,
      depthWrite: false,
    });
    materials.push(grooveMaterial);
    const grooves = new THREE.LineSegments(grooveGeometry, grooveMaterial);
    grooves.renderOrder = 5;
    group.add(grooves);

    const edgeGeometry = new THREE.TorusGeometry(2.2, 0.045, 12, 192);
    geometries.push(edgeGeometry);
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfff9e6,
      transparent: true,
      opacity: 0.5,
      transmission: 0.84,
      roughness: 0.3,
      bumpMap: liquidReliefTexture,
      bumpScale: 0.02,
      clearcoat: 0.82,
      clearcoatRoughness: 0.24,
      depthWrite: false,
    });
    materials.push(edgeMaterial);
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.renderOrder = 6;
    group.add(edge);

    const causticsGeometry = new THREE.RingGeometry(0.68, 2.17, 160, 2);
    geometries.push(causticsGeometry);
    const causticsMaterial = new THREE.MeshBasicMaterial({
      map: sunlightCausticsTexture,
      color: 0xfff7d2,
      transparent: true,
      opacity: 0.03,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    materials.push(causticsMaterial);
    const caustics = new THREE.Mesh(causticsGeometry, causticsMaterial);
    caustics.position.z = 0.118;
    caustics.renderOrder = 6;
    group.add(caustics);

    const labelGeometry = new THREE.CircleGeometry(0.78, 128);
    geometries.push(labelGeometry);
    const orangeLabelTexture = createOrangeLabelTexture();
    const labelPlasticTexture = createLabelPlasticTexture();
    textures.push(orangeLabelTexture, labelPlasticTexture);
    const labelMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: orangeLabelTexture,
      roughness: 0.7,
      roughnessMap: labelPlasticTexture,
      bumpMap: labelPlasticTexture,
      bumpScale: 0.012,
      specularIntensity: 0.24,
      clearcoat: 0.14,
      clearcoatRoughness: 0.72,
      side: THREE.DoubleSide,
    });
    materials.push(labelMaterial);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.z = 0.145;
    label.renderOrder = 7;
    group.add(label);

    const holeGeometry = new THREE.CircleGeometry(0.045, 32);
    geometries.push(holeGeometry);
    const holeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfffbe8,
      transparent: true,
      opacity: 0.7,
      transmission: 0.5,
      roughness: 0.38,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
    });
    materials.push(holeMaterial);
    const centerHole = new THREE.Mesh(holeGeometry, holeMaterial);
    centerHole.position.z = 0.158;
    centerHole.renderOrder = 8;
    group.add(centerHole);

    const highlightMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(highlightMaterial);
    const highlights = [
      createHighlightArc(1.96, 1.82, 1.28, 0.153),
      createHighlightArc(1.72, 1.9, 0.88, 0.154),
      createHighlightArc(1.25, 4.72, 0.74, 0.154),
    ];
    highlights.forEach((geometry) => {
      geometries.push(geometry);
      const line = new THREE.Line(geometry, highlightMaterial);
      line.renderOrder = 9;
      group.add(line);
    });

    const liquidColor = new THREE.Color(PALETTE.liquid);
    const accentColor = new THREE.Color(PALETTE.accent);
    const limeColor = new THREE.Color(PALETTE.lime);
    liquidVolumeMaterial.color.copy(liquidColor);
    liquidVolumeMaterial.attenuationColor.copy(liquidColor);
    liquidSurfaceMaterial.uniforms.uColor.value.copy(liquidColor);
    liquidSurfaceMaterial.uniforms.uAccent.value.copy(accentColor);
    liquidSurfaceMaterial.uniforms.uLime.value.copy(limeColor);
    sideLight.color.copy(accentColor.clone().lerp(new THREE.Color(0xffffff), 0.3));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let offsetX = 0;
    let offsetY = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (reduceMotion || event.pointerType !== "mouse") return;
      const bounds = container.getBoundingClientRect();
      const normalizedX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const normalizedY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      targetTiltX = normalizedY * 0.045;
      targetTiltY = normalizedX * 0.055;
      targetOffsetX = normalizedX * 0.025;
      targetOffsetY = -normalizedY * 0.02;
    };

    const handlePointerLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
      targetOffsetX = 0;
      targetOffsetY = 0;
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    const clock = new THREE.Clock();
    let previousElapsed = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      if (!visible) return;

      const elapsed = clock.getElapsedTime();
      const delta = Math.min(elapsed - previousElapsed, 0.1);
      previousElapsed = elapsed;
      tiltX = THREE.MathUtils.damp(tiltX, targetTiltX, 7, delta);
      tiltY = THREE.MathUtils.damp(tiltY, targetTiltY, 7, delta);
      offsetX = THREE.MathUtils.damp(offsetX, targetOffsetX, 7, delta);
      offsetY = THREE.MathUtils.damp(offsetY, targetOffsetY, 7, delta);
      group.rotation.x = -0.17 + tiltX;
      group.rotation.y = 0.13 + tiltY;
      group.rotation.z = -0.05 - elapsed * 0.22;
      group.position.set(offsetX, offsetY, 0);

      liquidSurfaceMaterial.uniforms.uTime.value = elapsed;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(() => {
      width = container.clientWidth || 1;
      height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 1 ? 7.2 * (0.92 / camera.aspect) : 7.2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    visibilityObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.domElement.remove();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [loop]);

  if (loop) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/previews/liquid-vinyl.png"
        alt="Transparent vinyl record filled with colored liquid"
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive transparent vinyl record filled with image-colored liquid"
      className={cn("relative isolate h-full min-h-full w-full touch-none overflow-hidden", className)}
    />
  );
}
