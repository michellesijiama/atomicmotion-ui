#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { exportFreeLibrary, verifyPublicLibrary } from "./export-free-library.mjs";
import { readComponentCatalog, readComponentData } from "./component-data.mjs";

const scratch = mkdtempSync(path.join(tmpdir(), "atomicmotion-free-"));
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const rejected = (action, message) => { assert.throws(action, undefined, message); checks++; };
try {
  const originalRepo = process.env.NEXT_PUBLIC_FREE_REPO_NAME;
  try {
    process.env.NEXT_PUBLIC_FREE_REPO_NAME = "atomicmotion-free";
    const migratedRegistry = readComponentData("src/lib/component-registry.ts");
    check(migratedRegistry.componentList.every(({ codeHref }) => codeHref.startsWith("https://github.com/michellesijiama/atomicmotion-free/blob/main/")), "Website source links switch to the free repository when configured");
  } finally {
    if (originalRepo === undefined) delete process.env.NEXT_PUBLIC_FREE_REPO_NAME;
    else process.env.NEXT_PUBLIC_FREE_REPO_NAME = originalRepo;
  }
  const output = path.join(scratch, "public");
  const result = exportFreeLibrary(output);
  const catalog = readComponentCatalog();
  const publicCatalog = JSON.parse(readFileSync(path.join(output, "catalog.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(path.join(output, "publication-manifest.json"), "utf8"));
  const publicPackage = JSON.parse(readFileSync(path.join(output, "package.json"), "utf8"));
  const publicLock = JSON.parse(readFileSync(path.join(output, "package-lock.json"), "utf8"));
  const publicVerify = () => spawnSync(process.execPath, ["scripts/verify-library.mjs"], { cwd: output, encoding: "utf8" });
  check(publicVerify().status === 0, "Standalone public verifier accepts a clean release without gallery dependencies");
  check(publicPackage.private && !publicPackage.dependencies.next && !publicPackage.dependencies.stripe, "Public verification environment excludes gallery and payment dependencies");
  check(JSON.stringify(publicLock.packages[""].dependencies) === JSON.stringify(publicPackage.dependencies), "Public lock matches its runtime dependencies");
  check(JSON.stringify(publicLock.packages[""].devDependencies) === JSON.stringify(publicPackage.devDependencies), "Public lock matches its development dependencies");
  for (const filename of Object.keys(manifest.files).filter((name) => name.endsWith(".md"))) {
    for (const match of readFileSync(path.join(output, filename), "utf8").matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(match[1])) continue;
      check(existsSync(path.resolve(output, path.dirname(filename), match[1].split("#")[0])), `Public documentation link: ${filename}: ${match[1]}`);
    }
  }
  check(result.components === catalog.length, "Exports every free component");
  for (const component of catalog) {
    const published = path.join(output, component.codePath);
    check(existsSync(published), `${component.id}: source is publicly available`);
    check(readFileSync(published).equals(readFileSync(component.codePath)), `${component.id}: exact source`);
    const readme = readFileSync(path.join(path.dirname(published), "README.md"), "utf8");
    check(readme.includes("```tsx\n") && readme.includes("## Props"), `${component.id}: publishes full usage and props instructions`);
  }
  check(readFileSync(path.join(output, "LICENSE")).equals(readFileSync("LICENSE")), "MIT permissions are preserved");
  for (const filename of ["public/emoji/1F600.svg", "licenses/OpenMoji-CC-BY-SA-4.0.txt", "public/models/gummy-bear.glb", "public/gummy-bear-poster.png", "public/paintings/carnevale-birth-of-the-virgin.jpg", "public/textures/wall-shadow.jpg", "public/illustrations/doodle-calendar-diary/coffee.webp", "public/illustrations/doodle-calendar-diary/coffee-thumb.webp"]) {
    check(readFileSync(path.join(output, filename)).equals(readFileSync(filename)), `Required asset or license: ${filename}`);
  }
  rejected(() => exportFreeLibrary(output), "Existing output cannot be overwritten");
  const leakedSource = path.join(output, "voice-bloom.tsx");
  writeFileSync(leakedSource, readFileSync("components/ai/voice-bloom/voice-bloom.tsx"));
  rejected(() => verifyPublicLibrary(output), "Rejects an unregistered source file");
  check(publicVerify().status !== 0, "Standalone public verifier rejects an unregistered source file");
  rmSync(leakedSource);
  const freeSource = path.join(output, publicCatalog.free[0].source);
  const original = readFileSync(freeSource);
  writeFileSync(freeSource, readFileSync("components/ai/voice-bloom/voice-bloom.tsx"));
  rejected(() => verifyPublicLibrary(output), "Rejects substituted source in a permitted filename");
  check(publicVerify().status !== 0, "Standalone public verifier rejects source hidden in a permitted filename");
  writeFileSync(freeSource, original);
  const secretFile = path.join(output, ".env.local");
  writeFileSync(secretFile, "EXAMPLE_SECRET=mock-not-a-secret\n");
  rejected(() => verifyPublicLibrary(output), "Rejects environment files");
  rmSync(secretFile);
  mkdirSync(path.join(output, ".git"));
  rejected(() => verifyPublicLibrary(output), "Rejects copied Git history even if empty");
  rmSync(path.join(output, ".git"), { recursive: true });
  check(verifyPublicLibrary(output).components === result.components, "Valid publication passes after leak fixtures are removed");
  console.log(`Free-library publication checks passed (${checks}/${checks}).`);
} finally { rmSync(scratch, { recursive: true, force: true }); }
