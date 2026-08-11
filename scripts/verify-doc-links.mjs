#!/usr/bin/env node
// Confirms every repo-relative link and image src in README.md/ASSETS.md
// points at a file that actually exists. Catches doc rot from a folder move
// (e.g. flattening atomicmotion-ui/ into root, or the components/ category
// restructure) that the TypeScript build won't catch on its own — these are
// the links on the repo's public landing page, so a 404 here is public.
//
// Scans plain text for markdown links/images and <img src="..."> tags
// instead of using a markdown parser, so this script has no dependency and
// can run under plain Node. Run from the repo root.
import { existsSync, readFileSync } from "node:fs";

const DOC_FILES = ["README.md", "ASSETS.md"];

// Only these prefixes are repo-relative targets we can check on disk.
// Everything else (http(s) URLs, mailto:, bare #anchors) is out of scope.
const CHECKABLE_PREFIXES = ["components/", "src/", "public/", "docs/"];

function isCheckable(target) {
  return CHECKABLE_PREFIXES.some((prefix) => target.startsWith(prefix));
}

// Strips a trailing #fragment (e.g. "README.md#local-development" isn't
// itself checkable, but "docs/foo.md#section" should check "docs/foo.md").
function stripFragment(target) {
  const hashIndex = target.indexOf("#");
  return hashIndex === -1 ? target : target.slice(0, hashIndex);
}

function findLinkTargets(text) {
  const targets = [];

  // Markdown links and images: [text](target) / ![alt](target)
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    targets.push(match[1]);
  }

  // HTML image tags: <img ... src="target" ...>
  for (const match of text.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/g)) {
    targets.push(match[1]);
  }

  return targets;
}

function main() {
  const violations = [];
  let totalChecked = 0;

  for (const docFile of DOC_FILES) {
    if (!existsSync(docFile)) {
      violations.push(`${docFile}: doc file not found`);
      continue;
    }
    const text = readFileSync(docFile, "utf8");
    const targets = findLinkTargets(text);

    for (const rawTarget of targets) {
      const target = stripFragment(rawTarget);
      if (!isCheckable(target)) continue;

      totalChecked += 1;
      if (!existsSync(target)) {
        violations.push(`${docFile}: broken link target "${rawTarget}" (resolved: ${target})`);
      }
    }
  }

  if (violations.length > 0) {
    console.error(`verify-doc-links: FAILED (${totalChecked} repo-relative links checked)\n`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log(`verify-doc-links: OK (${totalChecked} repo-relative links checked)`);
}

main();
