#!/usr/bin/env node
// Fails the build if a private/process file is tracked by git, or a tracked
// file exceeds the size threshold. Run from the repo root — it reads
// `git ls-files`, not a filesystem walk, so it only ever sees what's
// actually shipped.
import { execFileSync } from "node:child_process";
import { statSync, readFileSync } from "node:fs";

const MAX_BYTES = 3 * 1024 * 1024;

const DENYLIST_PATTERNS = [
  /(^|\/)CLAUDE\.md$/,
  /(^|\/)AGENTS\.md$/,
  /(^|\/)\.claudecode\//,
  /(^|\/)\.claude\//,
  /(^|\/)\.devin\//,
  /(^|\/)docs\/superpowers\//,
  /(^|\/)\.env(\.|$)/,
  /(^|\/)scripts\/render-/,
  /(^|\/)\.vercel\//,
];

const ASSET_EXEMPT = [
  /\.svg$/i,
  /(^|\/)ASSETS\.md$/,
  /(^|\/)public\/previews\//, // self-authored gallery screenshots/clips, regenerated via capture:home-previews
];

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function main() {
  const files = trackedFiles();
  const violations = [];

  for (const file of files) {
    for (const pattern of DENYLIST_PATTERNS) {
      if (pattern.test(file)) {
        violations.push(`denylisted path tracked: ${file}`);
        break;
      }
    }

    let size = 0;
    try {
      size = statSync(file).size;
    } catch {
      continue; // deleted-but-still-staged, or a submodule path; not our concern here
    }
    if (size > MAX_BYTES) {
      violations.push(
        `file exceeds ${MAX_BYTES / 1024 / 1024}MB: ${file} (${(size / 1024 / 1024).toFixed(2)}MB)`
      );
    }
  }

  const publicFiles = files.filter(
    (f) => f.startsWith("atomicmotion-ui/public/") && !ASSET_EXEMPT.some((p) => p.test(f))
  );
  let assetsDoc = "";
  try {
    assetsDoc = readFileSync("ASSETS.md", "utf8");
  } catch {
    violations.push("ASSETS.md is missing at the repo root");
  }
  if (assetsDoc) {
    for (const f of publicFiles) {
      const name = f.split("/").pop();
      if (!assetsDoc.includes(name)) {
        violations.push(`public/ asset not listed in ASSETS.md: ${f}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("verify-public-surface: FAILED\n");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log(`verify-public-surface: OK (${files.length} tracked files checked)`);
}

main();
