// Bake the same mesh, paper and room-light atlas used by the React demo.
// Run from the repository root after installing dependencies: node scripts/export-swiftui-gummy.mjs
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { chromium } from "playwright";

const output = "swiftui/Sources/AtomicMotionUI/GradientGummy";
const host = "http://gummy-export.local";
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-webgl", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.route(`${host}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/") {
      await route.fulfill({
        contentType: "text/html",
        body: '<script type="importmap">{"imports":{"three":"/modules/three/build/three.module.js","three-subdivide":"/modules/three-subdivide/src/index.js"}}</script>',
      });
      return;
    }
    const input = path === "/model.glb" ? "public/models/gummy-bear.glb"
      : path === "/font.ttf" ? "swiftui/Sources/AtomicMotionUI/Design/Manrope-Medium.ttf"
        : path.startsWith("/modules/") ? join("node_modules", path.slice("/modules/".length)) : null;
    if (!input) {
      await route.abort();
      return;
    }
    await route.fulfill({
      path: input,
      contentType: path.endsWith(".js") ? "text/javascript" : "application/octet-stream",
    });
  });
  await page.goto(host);
  const exports = await page.evaluate(async () => {
    const THREE = await import("three");
    const { GLTFLoader } = await import("/modules/three/examples/jsm/loaders/GLTFLoader.js");
    const { RoomEnvironment } = await import("/modules/three/examples/jsm/environments/RoomEnvironment.js");
    const { mergeVertices } = await import("/modules/three/examples/jsm/utils/BufferGeometryUtils.js");
    const { LoopSubdivision } = await import("three-subdivide");
    const encode = (bytes) => {
      let text = "";
      for (let start = 0; start < bytes.length; start += 32768) {
        text += String.fromCharCode(...bytes.subarray(start, start + 32768));
      }
      return btoa(text);
    };

    const { scene } = await new GLTFLoader().loadAsync("/model.glb");
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.5 / size.y;
    const fitted = new THREE.Box3();
    const vertices = [];
    scene.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const smooth = LoopSubdivision.modify(mergeVertices(mesh.geometry), 3);
      smooth.computeVertexNormals();
      smooth.computeBoundingBox();
      fitted.union(smooth.boundingBox);
      const geometry = smooth.index ? smooth.toNonIndexed() : smooth;
      const { position, normal, uv } = geometry.attributes;
      for (let i = 0; i < position.count; i++) {
        vertices.push(
          (position.getX(i) - center.x) * scale, (position.getY(i) - center.y) * scale,
          (position.getZ(i) - center.z) * scale,
          uv.getX(i), normal.getX(i), normal.getY(i), normal.getZ(i), uv.getY(i),
        );
      }
    });
    const fittedSize = fitted.getSize(new THREE.Vector3()).multiplyScalar(scale);
    const mesh = new ArrayBuffer(16 + vertices.length * 2);
    new Float32Array(mesh, 0, 4).set([fittedSize.x, fittedSize.y, scale, 0]);
    new Float16Array(mesh, 16).set(vertices);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    const generator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const atlas = generator.fromScene(room, 0.04);
    const environment = new Uint16Array(2 + atlas.width * atlas.height * 4);
    environment.set([atlas.width, atlas.height]);
    renderer.readRenderTargetPixels(atlas, 0, 0, atlas.width, atlas.height, environment.subarray(2));
    room.dispose();
    atlas.dispose();
    generator.dispose();
    renderer.dispose();
    if (!environment.subarray(2).some((value) => value !== 0)) throw new Error("Empty lighting atlas");

    const font = await new FontFace("Manrope", "url(/font.ttf)", { weight: "500" }).load();
    document.fonts.add(font);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const context = canvas.getContext("2d");
    context.fillStyle = "#121413";
    context.textBaseline = "top";
    context.globalAlpha = 0.9;
    context.font = "500 40px Manrope";
    const paragraph = "a gummy bear lens moves across this paragraph and gently magnifies the words beneath it. the glass keeps a soft red pink tint while the manrope text stays small, regular, and easy to compare through the refractive candy surface.";
    let line = "";
    let y = 150;
    for (const word of `${paragraph} ${paragraph}`.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > 812) {
        context.fillText(line, 108, y);
        y += 58;
        line = word;
      } else {
        line = candidate;
      }
    }
    context.fillText(line, 108, y);

    return {
      "GummyMesh.bin": encode(new Uint8Array(mesh)),
      "GummyRoom.bin": encode(new Uint8Array(environment.buffer)),
      "GummyParagraph.png": canvas.toDataURL().split(",")[1],
    };
  });
  for (const [name, base64] of Object.entries(exports)) {
    const bytes = Buffer.from(base64, "base64");
    const resource = name === "GummyRoom.bin"
      ? Buffer.concat([bytes.subarray(0, 4), deflateRawSync(bytes.subarray(4), { level: 9 })])
      : bytes;
    await writeFile(join(output, name), resource);
  }
  console.log("Exported the gummy mesh, room atlas and paragraph.");
} finally {
  await browser.close();
}
