#!/usr/bin/env node
// Confirms every repo-relative link and image src in public documentation
// points at a file that actually exists. Catches doc rot from a folder move
// (e.g. flattening atomicmotion-ui/ into root, or the components/ category
// restructure) that the TypeScript build won't catch on its own — these are
// the links on the repo's public landing page, so a 404 here is public.
//
// Scans plain text for markdown links/images and <img src="..."> tags
// instead of using a markdown parser, so this script has no dependency and
// can run under plain Node. Run from the repo root.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { posix } from "node:path";

function markdownFilesIn(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `${directory}/${entry.name}`);
}

function componentReadmes() {
  if (!existsSync("components")) return [];
  const files = [];
  for (const category of readdirSync("components", { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryPath = `components/${category.name}`;
    for (const component of readdirSync(categoryPath, { withFileTypes: true })) {
      if (!component.isDirectory()) continue;
      const readme = `${categoryPath}/${component.name}/README.md`;
      if (existsSync(readme)) files.push(readme);
    }
  }
  return files;
}

const DOC_FILES = [
  "README.md",
  "ASSETS.md",
  "CONTRIBUTING.md",
  "public/emoji/README.md",
  ...markdownFilesIn("docs"),
  ...markdownFilesIn("licenses"),
  ...componentReadmes(),
];

const MIN_EXPECTED_LINKS = 15;
const EXTERNAL_TARGET = /^(?:[a-z][a-z\d+.-]*:|#)/i;

// Strips a trailing #fragment (e.g. "README.md#local-development" isn't
// itself checkable, but "docs/foo.md#section" should check "docs/foo.md").
function stripFragment(target) {
  const hashIndex = target.indexOf("#");
  return hashIndex === -1 ? target : target.slice(0, hashIndex);
}

function findLinkTargets(text, docFile) {
  const targets = [];

  // Markdown links and images: [text](target) / ![alt](target)
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    targets.push({ target: match[1], repoRootRelative: false });
  }

  // HTML image tags: <img ... src="target" ...>
  for (const match of text.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/g)) {
    targets.push({ target: match[1], repoRootRelative: false });
  }

  // Legal notices mention covered source files as plain text rather than
  // links. Check those attribution paths without treating every example path
  // in general documentation as a live link.
  if (docFile.startsWith("licenses/")) {
    for (const match of text.matchAll(
      /(?:^|[\s`(])((?:components|public)\/[A-Za-z0-9._/-]+)/gm
    )) {
      targets.push({ target: match[1], repoRootRelative: true });
    }
  }

  return targets;
}

function resolveTarget(docFile, rawTarget, repoRootRelative) {
  if (repoRootRelative || rawTarget.startsWith("/")) {
    return posix.normalize(rawTarget.replace(/^\//, ""));
  }
  return posix.normalize(posix.join(posix.dirname(docFile), rawTarget));
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
    const targets = findLinkTargets(text, docFile);

    const seen = new Set();
    for (const { target: rawTarget, repoRootRelative } of targets) {
      const targetWithoutFragment = stripFragment(rawTarget);
      if (!targetWithoutFragment || EXTERNAL_TARGET.test(rawTarget)) continue;

      const dedupeKey = `${repoRootRelative}:${rawTarget}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      if (targetWithoutFragment.includes("atomicmotion-ui/")) {
        violations.push(`${docFile}: stale pre-flatten target "${rawTarget}"`);
        continue;
      }

      const target = resolveTarget(
        docFile,
        targetWithoutFragment,
        repoRootRelative
      );

      totalChecked += 1;
      if (target.startsWith("../") || !existsSync(target)) {
        violations.push(`${docFile}: broken link target "${rawTarget}" (resolved: ${target})`);
      }
    }
  }

  if (totalChecked < MIN_EXPECTED_LINKS) {
    violations.push(
      `checked only ${totalChecked} repo-relative links; expected at least ${MIN_EXPECTED_LINKS}`
    );
  }

  if (violations.length > 0) {
    console.error(`verify-doc-links: FAILED (${totalChecked} repo-relative links checked)\n`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log(`verify-doc-links: OK (${totalChecked} repo-relative links checked)`);
}

main();
