#!/usr/bin/env node
// Confirms every component-registry.ts entry points at a file that actually
// exists, resolved the way GitHub resolves "Copy link" URLs — relative to
// the repo root, not the app folder. Catches silent 404s from asset
// deletions or a folder move (e.g. flattening atomicmotion-ui/ into root)
// that the TypeScript build won't catch on its own.
//
// Parses the registry source as text instead of importing it, so this
// script has no TypeScript/bundler dependency and can run under plain Node.
import { existsSync, readFileSync } from "node:fs";

const REGISTRY_PATH = "src/lib/component-registry.ts";
const APP_ROOT = ".";

function main() {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(`verify-registry-paths: registry file not found at ${REGISTRY_PATH}`);
    process.exit(1);
  }
  const src = readFileSync(REGISTRY_PATH, "utf8");

  const videoIdsMatch = src.match(/COMPONENTS_WITH_PREVIEW_VIDEO\s*=\s*new Set\(\[([^\]]*)\]\)/);
  const videoIds = new Set(
    videoIdsMatch ? [...videoIdsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : []
  );

  const entryPattern = /id:\s*"([^"]+)"[\s\S]*?codePath:\s*"([^"]+)"/g;
  const entries = [...src.matchAll(entryPattern)].map(([, id, codePath]) => ({ id, codePath }));

  if (entries.length === 0) {
    console.error("verify-registry-paths: parsed zero entries — regex is out of sync with component-registry.ts");
    process.exit(1);
  }

  const violations = [];
  for (const { id, codePath } of entries) {
    const codeFullPath = `${APP_ROOT}/${codePath}`;
    if (!existsSync(codeFullPath)) {
      violations.push(`[${id}] codePath does not exist: ${codeFullPath}`);
    }

    const previewImage = `${APP_ROOT}/public/previews/${id}.png`;
    if (!existsSync(previewImage)) {
      violations.push(`[${id}] previewImage does not exist: ${previewImage}`);
    }

    if (videoIds.has(id)) {
      const previewVideo = `${APP_ROOT}/public/previews/${id}.mp4`;
      if (!existsSync(previewVideo)) {
        violations.push(`[${id}] previewVideo does not exist: ${previewVideo}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error(`verify-registry-paths: FAILED (${entries.length} entries checked)\n`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log(`verify-registry-paths: OK (${entries.length} entries checked)`);
}

main();
