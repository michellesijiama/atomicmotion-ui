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
  // Design QA scratch notes — they cite local temp paths and components that
  // may no longer exist.
  /(^|\/)[\w-]*qa\.md$/i,
  /(^|\/)\.DS_Store$/,
];

const ASSET_EXEMPT = [
  /\.md$/i,
  /(^|\/)ASSETS\.md$/,
  /(^|\/)public\/previews\//, // self-authored gallery screenshots/clips, regenerated via capture:home-previews
];

// Only the provenance table's Path column declares assets. Basename matches
// previously let an undocumented file pass if another directory had that name.
function documentedAssetPatterns(doc) {
  const paths = doc.split("\n").filter((line) => line.startsWith("|"))
    .flatMap((line) => [...(line.split("|")[1] ?? "").matchAll(/`(public\/[^`]+)`/g)].map((match) => match[1]));
  return paths.flatMap((path) => {
    const brace = path.match(/\{([^{}]+)\}/);
    const expanded = brace ? brace[1].split(",").map((part) => path.replace(brace[0], part)) : [path];
    return expanded.map((pattern) => new RegExp(`^${pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`));
  });
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
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
      violations.push(`tracked file is missing: ${file}`);
      continue;
    }
    if (size > MAX_BYTES) {
      violations.push(
        `file exceeds ${MAX_BYTES / 1024 / 1024}MB: ${file} (${(size / 1024 / 1024).toFixed(2)}MB)`
      );
    }
  }

  const publicFiles = files.filter(
    (f) => f.startsWith("public/") && !ASSET_EXEMPT.some((p) => p.test(f))
  );
  let assetsDoc = "";
  try {
    assetsDoc = readFileSync("ASSETS.md", "utf8");
  } catch {
    violations.push("ASSETS.md is missing at the repo root");
  }
  const assetPatterns = documentedAssetPatterns(assetsDoc);
  for (const f of publicFiles) {
    if (!assetPatterns.some((pattern) => pattern.test(f))) {
      violations.push(`public/ asset not listed in ASSETS.md: ${f}`);
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
