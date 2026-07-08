import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const registry = read("src/lib/component-registry.ts");
const card = read("src/components/website/component-card.tsx");

const ids = Array.from(registry.matchAll(/id: "([^"]+)"/g)).map((match) => match[1]);
const uniqueIds = [...new Set(ids)];

const checks = [
  ["registry exposes previewImage metadata", registry.includes("previewImage: string")],
  ["registry derives preview images from component ids", registry.includes('previewImage: `/previews/${meta.id}.png`')],
  ["component cards render static preview images", card.includes("component.previewImage") && card.includes("<img")],
  ["component cards keep lazy image loading", card.includes('loading="lazy"') && card.includes('decoding="async"')],
  ["home cards no longer import componentMap", !card.includes('from "@/lib/component-map"')],
  ["home cards no longer mount live Preview components", !card.includes("<Preview loop") && !card.includes("const Preview =")],
  ["home cards no longer wrap live previews in PreviewStage", !card.includes("PreviewStage")],
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
