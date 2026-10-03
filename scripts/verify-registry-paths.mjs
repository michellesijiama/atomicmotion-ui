#!/usr/bin/env node
// Validate copyable sources, preview files, declared runtime assets and the
// renderer map. Metadata is parsed without executing application code.
import { readdirSync, statSync } from "node:fs";
import { posix } from "node:path";
import { readComponentMapIds, readRegistry } from "./lib/registry.mjs";

const violations = [];
let entries = [];
try {
  const registry = readRegistry();
  entries = registry.entries;
  const mapIds = readComponentMapIds();
  const ids = new Set(entries.map(({ id }) => id));
  for (const id of mapIds) if (!ids.has(id)) violations.push(`[${id}] renderer has no registry entry`);

  function checkFile(path, label) {
    if (posix.isAbsolute(path) || path !== posix.normalize(path) || path.startsWith("../") || path.includes("\\")) {
      violations.push(`${label}: unsafe repo-relative path: ${path}`);
      return;
    }
    try {
      if (!statSync(path).isFile()) violations.push(`${label}: not a file: ${path}`);
    } catch {
      violations.push(`${label}: file does not exist: ${path}`);
    }
  }

  for (const { id, codePath, requiredAssets } of entries) {
    if (!mapIds.has(id)) violations.push(`[${id}] registry entry has no renderer`);
    checkFile(codePath, `[${id}] codePath`);
    checkFile(`public/previews/${id}.png`, `[${id}] previewImage`);
    if (registry.videoIds.has(id)) checkFile(`public/previews/${id}.mp4`, `[${id}] previewVideo`);
    for (const asset of requiredAssets) {
      // The existing registry documents an asset directory as
      // "public/paintings/ (4 .jpg files)". Validate its declared file count.
      const directory = asset.path.match(/^(public\/[a-z0-9/_-]+\/) \((\d+) (\.[a-z0-9]+) files\)$/i);
      if (directory) {
        const [, path, count, extension] = directory;
        const files = readdirSync(path, { withFileTypes: true }).filter((file) => file.isFile() && file.name.endsWith(extension));
        if (files.length !== Number(count)) violations.push(`[${id}] ${path}: expected ${count} ${extension} files, found ${files.length}`);
        for (const file of files) checkFile(`${path}${file.name}`, `[${id}] requiredAsset`);
      } else {
        checkFile(asset.path, `[${id}] requiredAsset`);
      }
    }
  }
} catch (error) {
  violations.push(error.message);
}

if (violations.length) {
  console.error(`verify-registry-paths: FAILED (${entries.length} entries checked)\n`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}
console.log(`verify-registry-paths: OK (${entries.length} entries checked)`);
