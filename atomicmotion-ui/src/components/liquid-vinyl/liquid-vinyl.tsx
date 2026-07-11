"use client";

import * as React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { cn } from "@/lib/utils";

export type LiquidVinylProps = {
  className?: string;
  loop?: boolean;
  imageSrc?: string;
};

type Palette = {
  liquid: THREE.Color;
  accent: THREE.Color;
  background: THREE.Color;
};

const DEFAULT_IMAGE = "/liquid-vinyl/reference.png";

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
  uniform vec2 uPointer;
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

  void main() {
    vec2 p = vUv - 0.5;
    float radius = length(p) * 2.0;
    float angle = atan(p.y, p.x);
    float flow = noise(vec2(angle * 2.5 + uTime * 0.05, radius * 10.0 - uTime * 0.11));
    float ribbon = sin(angle * 5.0 + radius * 24.0 - uTime * 0.34 + flow * 4.0);
    float fine = sin(radius * 178.0 + angle * 2.0 + flow * 3.0) * 0.5 + 0.5;
    float caustic = smoothstep(0.68, 1.0, sin(angle * 3.0 - radius * 15.0 + uTime * 0.18) * 0.5 + 0.5);
    float pointerGlow = max(0.0, dot(normalize(p + 0.0001), normalize(uPointer + vec2(0.18, 0.32))));

    vec3 color = mix(uColor * 0.72, uColor * 1.17, flow);
    color = mix(color, uAccent, caustic * 0.18 + pointerGlow * 0.06);
    color += ribbon * 0.025 + fine * 0.018;

    float outerFade = 1.0 - smoothstep(0.94, 1.0, radius);
    float innerFade = smoothstep(0.28, 0.34, radius);
    float alpha = (0.54 + flow * 0.17 + caustic * 0.08) * outerFade * innerFade;
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

function createLabelTexture(accent: THREE.Color) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create liquid vinyl label.");
  }

  context.fillStyle = "#171918";
  context.fillRect(0, 0, size, size);

  const accentHex = `#${accent.getHexString(THREE.SRGBColorSpace)}`;
  context.fillStyle = accentHex;
  context.beginPath();
  context.arc(230, 510, 88, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#171918";
  context.font = "700 90px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("A", 230, 512);

  context.textAlign = "left";
  context.fillStyle = "#f5f2e9";
  context.font = "600 38px Arial, sans-serif";
  context.fillText("liquid memory,", 310, 278);
  context.fillText("pressed in motion", 310, 326);

  context.font = "500 28px Arial, sans-serif";
  context.fillText("33 1/3 RPM", 670, 520);

  context.globalAlpha = 0.58;
  context.font = "500 18px Arial, sans-serif";
  context.fillText("atomic motion / fluid edition", 310, 770);
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function colorFromRgb(red: number, green: number, blue: number) {
  return new THREE.Color().setRGB(red / 255, green / 255, blue / 255, THREE.SRGBColorSpace);
}

function loadImagePalette(src: string): Promise<Palette> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    const fallback = () =>
      resolve({
        liquid: colorFromRgb(202, 198, 188),
        accent: colorFromRgb(100, 153, 163),
        background: colorFromRgb(222, 218, 208),
      });

    image.onerror = fallback;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 72;
      canvas.height = 72;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        fallback();
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let weightTotal = 0;
      let accentScore = -1;
      let accentRgb = [100, 153, 163];

      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const px = x / canvas.width - 0.5;
          const py = y / canvas.height - 0.5;
          const radius = Math.sqrt(px * px + py * py);
          if (radius < 0.18 || radius > 0.49) continue;

          const offset = (y * canvas.width + x) * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
          const saturation = max === 0 ? 0 : (max - min) / max;
          const weight = 0.35 + saturation * 1.5 + Math.min(luminance, 0.85);

          red += r * weight;
          green += g * weight;
          blue += b * weight;
          weightTotal += weight;

          const score = saturation * 1.8 + (1 - Math.abs(luminance - 0.55));
          if (score > accentScore && luminance > 0.16 && luminance < 0.92) {
            accentScore = score;
            accentRgb = [r, g, b];
          }
        }
      }

      if (!weightTotal) {
        fallback();
        return;
      }

      const average = colorFromRgb(red / weightTotal, green / weightTotal, blue / weightTotal);
      const liquid = average.clone().lerp(new THREE.Color(0xffffff), 0.18);
      const accent = colorFromRgb(accentRgb[0], accentRgb[1], accentRgb[2]);
      const background = average.clone().lerp(new THREE.Color(0xf4f1e8), 0.7);
      resolve({ liquid, accent, background });
    };

    image.src = src;
  });
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

export function LiquidVinyl({ className, loop = false, imageSrc = DEFAULT_IMAGE }: LiquidVinylProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef({ x: 0, y: 0, easedX: 0, easedY: 0 });

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
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.dataset.liquidVinylCanvas = "true";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xded9cf);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const keyLight = new THREE.DirectionalLight(0xfff8ea, 3.2);
    keyLight.position.set(-3.5, 4.5, 5.5);
    scene.add(keyLight);

    const sideLight = new THREE.PointLight(0x9ecbd3, 34, 13, 1.8);
    sideLight.position.set(4.2, 1.4, 3.1);
    scene.add(sideLight);

    const warmLight = new THREE.PointLight(0xffd8b8, 28, 12, 1.8);
    warmLight.position.set(-3.5, -2.6, 2.2);
    scene.add(warmLight);

    const group = new THREE.Group();
    group.rotation.set(-0.055, 0.08, -0.05);
    scene.add(group);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const surfaceTexture = createSurfaceTexture();
    textures.push(surfaceTexture);

    const shellGeometry = new THREE.CylinderGeometry(2.2, 2.2, 0.14, 192, 2, false);
    shellGeometry.rotateX(Math.PI / 2);
    geometries.push(shellGeometry);
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf2eee4,
      transparent: true,
      opacity: 0.34,
      transmission: 0.92,
      roughness: 0.19,
      roughnessMap: surfaceTexture,
      bumpMap: surfaceTexture,
      bumpScale: 0.012,
      ior: 1.46,
      thickness: 0.46,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
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
      curveSegments: 160,
    });
    liquidVolumeGeometry.translate(0, 0, -0.0375);
    geometries.push(liquidVolumeGeometry);
    const liquidVolumeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xcac6bc,
      transparent: true,
      opacity: 0.82,
      transmission: 0.74,
      roughness: 0.16,
      ior: 1.37,
      thickness: 0.72,
      attenuationColor: new THREE.Color(0xcac6bc),
      attenuationDistance: 1.35,
      clearcoat: 0.64,
      clearcoatRoughness: 0.2,
      depthWrite: false,
    });
    materials.push(liquidVolumeMaterial);
    const liquidVolume = new THREE.Mesh(liquidVolumeGeometry, liquidVolumeMaterial);
    liquidVolume.renderOrder = 1;
    group.add(liquidVolume);

    const liquidSurfaceGeometry = new THREE.RingGeometry(0.68, 2.055, 256, 4);
    geometries.push(liquidSurfaceGeometry);
    const liquidSurfaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xcac6bc) },
        uAccent: { value: new THREE.Color(0x6499a3) },
        uPointer: { value: new THREE.Vector2() },
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
      color: 0xe9e4d9,
      transparent: true,
      opacity: 0.58,
      transmission: 0.72,
      roughness: 0.1,
      clearcoat: 1,
      depthWrite: false,
    });
    materials.push(meniscusMaterial);
    for (const radius of [0.68, 2.055]) {
      const geometry = new THREE.TorusGeometry(radius, radius < 1 ? 0.018 : 0.026, 10, 192);
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, meniscusMaterial);
      mesh.position.z = 0.086;
      mesh.renderOrder = 3;
      group.add(mesh);
    }

    const grooveGeometry = createGrooveGeometry();
    geometries.push(grooveGeometry);
    const grooveMaterial = new THREE.LineBasicMaterial({
      color: 0x5b5852,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    });
    materials.push(grooveMaterial);
    const grooves = new THREE.LineSegments(grooveGeometry, grooveMaterial);
    grooves.renderOrder = 5;
    group.add(grooves);

    const edgeGeometry = new THREE.TorusGeometry(2.2, 0.035, 12, 256);
    geometries.push(edgeGeometry);
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8f5ec,
      transparent: true,
      opacity: 0.58,
      transmission: 0.8,
      roughness: 0.09,
      clearcoat: 1,
      depthWrite: false,
    });
    materials.push(edgeMaterial);
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.renderOrder = 6;
    group.add(edge);

    const labelTexture = createLabelTexture(new THREE.Color(0x6499a3));
    textures.push(labelTexture);
    const labelGeometry = new THREE.CircleGeometry(0.67, 128);
    geometries.push(labelGeometry);
    const labelMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    materials.push(labelMaterial);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.z = 0.145;
    label.renderOrder = 7;
    group.add(label);

    const holeGeometry = new THREE.CircleGeometry(0.055, 48);
    geometries.push(holeGeometry);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0xd8d3c9 });
    materials.push(holeMaterial);
    const centerHole = new THREE.Mesh(holeGeometry, holeMaterial);
    centerHole.position.z = 0.158;
    centerHole.renderOrder = 8;
    group.add(centerHole);

    const highlightMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
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

    void loadImagePalette(imageSrc).then((palette) => {
      if (cancelled) return;
      scene.background = palette.background;
      liquidVolumeMaterial.color.copy(palette.liquid);
      liquidVolumeMaterial.attenuationColor.copy(palette.liquid);
      liquidSurfaceMaterial.uniforms.uColor.value.copy(palette.liquid);
      liquidSurfaceMaterial.uniforms.uAccent.value.copy(palette.accent);
      sideLight.color.copy(palette.accent.clone().lerp(new THREE.Color(0xffffff), 0.28));

      const nextLabelTexture = createLabelTexture(palette.accent);
      textures.push(nextLabelTexture);
      labelMaterial.map = nextLabelTexture;
      labelMaterial.needsUpdate = true;
    });

    const clock = new THREE.Clock();
    const render = () => {
      raf = requestAnimationFrame(render);
      if (!visible) return;

      const elapsed = clock.getElapsedTime();
      pointer.current.easedX += (pointer.current.x - pointer.current.easedX) * 0.065;
      pointer.current.easedY += (pointer.current.y - pointer.current.easedY) * 0.065;

      const x = pointer.current.easedX;
      const y = pointer.current.easedY;
      group.rotation.x = -0.055 - y * 0.12 + Math.sin(elapsed * 0.34) * 0.012;
      group.rotation.y = 0.08 + x * 0.14 + Math.cos(elapsed * 0.28) * 0.012;
      group.rotation.z = -0.05 + elapsed * 0.032;
      group.position.x = x * 0.09;
      group.position.y = -y * 0.07;

      liquidSurfaceMaterial.uniforms.uTime.value = elapsed;
      liquidSurfaceMaterial.uniforms.uPointer.value.set(x, -y);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(render);

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      pointer.current.x = THREE.MathUtils.clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
      pointer.current.y = THREE.MathUtils.clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
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
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.remove();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [imageSrc, loop]);

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
