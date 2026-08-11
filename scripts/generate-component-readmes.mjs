#!/usr/bin/env node
// Generates components/<category>/<id>/README.md for every registry entry, so
// each folder explains itself on GitHub without anyone hand-maintaining nine
// files that would drift the moment a description changes.
//
// `renderReadme` is exported and is the ONLY place the template lives:
// scripts/verify-component-readmes.mjs imports it and diffs the rendered
// output against disk. A second copy of the template would let the checker
// pass while the docs are stale, which is the failure this exists to prevent.
//
// Registry parsing mirrors scripts/verify-component-structure.mjs — same
// split, same field regexes — so the two agree on what an entry is.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REGISTRY_PATH = "src/lib/component-registry.ts";
const REPO_SLUG = "michellesijiama/atomicmotion-ui";
const REPO_BRANCH = "main";
const SITE = "https://atomicmotion.dev";

// Imports that are already there in any React project — listing them as
// things to install would be noise.
const IMPLICIT_PACKAGES = new Set(["react", "react-dom"]);

export const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Maps a module specifier to the npm package you would install for it:
 * "three/examples/jsm/loaders/GLTFLoader.js" -> "three",
 * "@scope/pkg/sub" -> "@scope/pkg".
 */
export function packageNameFor(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * Derives a component's real dependency list by reading its own source, so a
 * copy-paste user installs what the file actually imports. Hardcoding one
 * list for every component is how the READMEs ended up telling gummy-bear
 * users to install framer-motion (which it does not use) and not three
 * (which it does).
 */
export function dependenciesFor(codePath) {
  const src = readFileSync(codePath, "utf8");
  const specifiers = [
    // `import … from "x"` / `export … from "x"` (the `from` covers both)
    ...[...src.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]),
    // bare side-effect imports: `import "x";`
    ...[...src.matchAll(/^\s*import\s+["']([^"']+)["']/gm)].map((m) => m[1]),
  ];

  const packages = new Set();
  for (const specifier of specifiers) {
    // Relative imports live inside the folder; "@/" imports are banned
    // outright (scripts/verify-component-structure.mjs enforces that).
    if (specifier.startsWith(".") || specifier.startsWith("@/")) continue;
    const pkg = packageNameFor(specifier);
    if (IMPLICIT_PACKAGES.has(pkg)) continue;
    packages.add(pkg);
  }

  return [...packages].sort();
}

/**
 * Parses the registry into { id, title, description, category, codePath }.
 * Uses the same block split as verify-component-structure.mjs.
 */
export function readRegistryEntries(registryPath = REGISTRY_PATH) {
  const src = readFileSync(registryPath, "utf8");
  const blocks = src
    .split(/(?=\n\s+id: ")/)
    .filter((b) => /\n?\s+id: "/.test(b) && b.includes("codePath"));

  if (blocks.length === 0) {
    throw new Error(
      `parsed zero entries from ${registryPath} — regex is out of sync with the registry`
    );
  }

  return blocks.map((b) => {
    const requiredAssetsSource = b.match(
      /requiredAssets:\s*\[([\s\S]*?)\n\s*\],/
    )?.[1];
    const requiredAssets = requiredAssetsSource
      ? [...requiredAssetsSource.matchAll(/\{([\s\S]*?)\}/g)].map((match) => {
          const asset = match[1];
          const readString = (field) =>
            asset.match(
              new RegExp(`${field}:\\s*\\n?\\s*(["'])((?:\\\\.|(?!\\1)[\\s\\S])*)\\1`)
            )?.[2];
          return {
            path: readString("path"),
            license: readString("license"),
            credit: readString("credit"),
          };
        })
      : [];
    const entry = {
      id: b.match(/id: "([^"]+)"/)?.[1],
      title: b.match(/title: "([^"]+)"/)?.[1],
      // description is wrapped onto its own line by the formatter
      description: b.match(/description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/)?.[1],
      category: b.match(/category: "([^"]+)"/)?.[1],
      codePath: b.match(/codePath:\s*\n?\s*"([^"]+)"/)?.[1],
      requiredAssets,
    };
    for (const [key, value] of Object.entries(entry).filter(
      ([key]) => key !== "requiredAssets"
    )) {
      if (!value) {
        throw new Error(`[${entry.id ?? "?"}] registry entry is missing ${key}`);
      }
    }
    for (const [index, asset] of requiredAssets.entries()) {
      for (const [key, value] of Object.entries(asset)) {
        if (!value) {
          throw new Error(
            `[${entry.id}] requiredAssets[${index}] is missing ${key}`
          );
        }
      }
    }
    entry.dependencies = dependenciesFor(entry.codePath);
    return entry;
  });
}

/** Absolute path on disk for an entry's README. */
export function readmePath(entry) {
  return `components/${slug(entry.category)}/${entry.id}/README.md`;
}

/**
 * The single source of truth for README content. Both the generator and
 * scripts/verify-component-readmes.mjs call this.
 */
export function renderReadme(entry) {
  const previewUrl = `https://raw.githubusercontent.com/${REPO_SLUG}/${REPO_BRANCH}/public/previews/${entry.id}.png`;
  const dependencies =
    entry.dependencies.length > 0
      ? entry.dependencies.join(", ")
      : "None beyond React";
  const usageNotes =
    entry.requiredAssets.length === 0
      ? [
          `This component is self-contained — the entire component is \`${entry.id}.tsx\`.`,
          "Copy this folder into your project and adjust the styling.",
        ]
      : [
          "## Required assets",
          "",
          "The component code is one file, but it also loads these files at runtime:",
          "",
          ...entry.requiredAssets.map(
            (asset) =>
              `- \`${asset.path}\` — ${asset.license}. ${asset.credit}`
          ),
          "",
          "Copy the component and every required asset, preserving the attribution above.",
        ];

  return [
    `# ${entry.title}`,
    "",
    entry.description,
    "",
    `![${entry.title} preview](${previewUrl})`,
    "",
    `- **Category:** ${entry.category}`,
    `- **Demo:** ${SITE}/components/${entry.id}`,
    `- **Dependencies:** ${dependencies}`,
    "",
    ...usageNotes,
    "",
    "<!-- Generated by scripts/generate-component-readmes.mjs. Do not edit by hand. -->",
    "",
  ].join("\n");
}

function main() {
  const entries = readRegistryEntries();
  for (const entry of entries) {
    const path = readmePath(entry);
    writeFileSync(path, renderReadme(entry));
    console.log(`wrote ${path}`);
  }
  console.log(`generate-component-readmes: wrote ${entries.length} README files`);
}

// Only write files when executed directly; importing this module must be
// side-effect free so the verifier can render without touching disk.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
