#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(readFileSync("publication-manifest.json", "utf8"));
const ignored = new Set([".git", "node_modules", ".tmp"]);
function walk(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!prefix && ignored.has(entry.name)) return [];
    const filename = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), `Symlink in publication: ${filename}`);
    return entry.isDirectory() ? walk(path.join(directory, entry.name), filename) : [filename];
  });
}
assert.deepEqual(walk(".").sort(), [...Object.keys(manifest.files), "publication-manifest.json"].sort(), "Unexpected or missing publication files");
if (existsSync(".git")) {
  const tracked = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  assert.equal(tracked.status, 0, "Could not inspect tracked publication files");
  const allowed = new Set([...Object.keys(manifest.files), "publication-manifest.json"]);
  for (const filename of tracked.stdout.split("\0").filter(Boolean)) {
    assert.ok(allowed.has(filename), `Unexpected tracked file: ${filename}`);
  }
}
for (const [filename, checksum] of Object.entries(manifest.files)) {
  assert.equal(digest(readFileSync(filename)), checksum, `Publication changed: ${filename}`);
}
const catalog = JSON.parse(readFileSync("catalog.json", "utf8"));
assert.deepEqual(catalog.free.map(({ id }) => id), manifest.freeComponents);
const publishedSources = Object.keys(manifest.files).filter((filename) => filename.endsWith(".tsx"));
assert.deepEqual(publishedSources.sort(), catalog.free.map(({ source }) => source).sort(), "Only free component source may be published");
assert.ok(catalog.paid.every((component) => !component.source), "Paid entries must only link to previews");
console.log(`Public library verified: ${catalog.free.length} free components, ${publishedSources.length} source files.`);
