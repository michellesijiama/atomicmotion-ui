// The gallery uses a hybrid preview strategy: light components animate live on
// the card, while heavy WebGL scenes opt out via `previewStatic: true` and show
// a poster (looping video when one exists, otherwise the still image). This
// keeps the gallery at zero live GL canvases, which is what the all-static
// strategy that preceded it was actually protecting.
import { existsSync, readFileSync, readdirSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const registry = read("src/lib/component-registry.ts");
const card = read("src/components/website/component-card.tsx");

const ids = Array.from(registry.matchAll(/id: "([^"]+)"/g)).map((match) => match[1]);
const uniqueIds = [...new Set(ids)];

// Split the registry on entry boundaries so `previewStatic` is attributed to
// the entry it actually belongs to.
const entryBlocks = registry.split(/(?=\n\s*id: ")/).filter((block) => /\n?\s*id: "/.test(block));
const staticPreviewIds = new Set(
  entryBlocks
    .filter((block) => block.includes("previewStatic: true"))
    .map((block) => block.match(/id: "([^"]+)"/)?.[1])
    .filter(Boolean)
);

const WEBGL_MARKERS = ["useFrame", "@react-three", "WebGLRenderer", 'getContext("webgl'];

function usesWebGL(id) {
  const dir = `src/components/${id}`;
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((file) => {
    const source = read(`${dir}/${file}`);
    return WEBGL_MARKERS.some((marker) => source.includes(marker));
  });
}

const webglIds = uniqueIds.filter(usesWebGL);

const checks = [
  ["registry exposes previewImage metadata", registry.includes("previewImage: string")],
  ["registry derives preview images from component ids", registry.includes('previewImage: `/previews/${meta.id}.png`')],
  ["component cards render static preview images", card.includes("component.previewImage") && card.includes("<img")],
  ["component cards keep lazy image loading", card.includes('loading="lazy"') && card.includes('decoding="async"')],
  ["component cards honour the previewStatic opt-out", card.includes("component.previewStatic")],
  ["component cards still animate light previews live", card.includes("PreviewStage") && card.includes("<Preview loop />")],
  [
    `every WebGL component opts out of live previews (${webglIds.join(", ") || "none"})`,
    webglIds.every((id) => staticPreviewIds.has(id)),
  ],
  ["all registered components have generated preview files", uniqueIds.every((id) => existsSync(`public/previews/${id}.png`))],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("static home preview checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`static home preview checks passed (${checks.length}/${checks.length}).`);
