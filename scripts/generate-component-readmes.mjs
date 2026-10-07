#!/usr/bin/env node
// Generates components/<category>/<id>/README.md for every registry entry, so
// each folder explains itself on GitHub without anyone hand-maintaining multiple
// files that would drift the moment a description changes.
//
// `renderReadme` is exported and is the ONLY place the template lives:
// scripts/verify-component-readmes.mjs imports it and diffs the rendered
// output against disk. A second copy of the template would let the checker
// pass while the docs are stale, which is the failure this exists to prevent.
//
// Registry parsing is shared with the repository guards.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { componentContract, importSpecifiers, renderIndex } from "./lib/component-source.mjs";
import { readRegistry, readSource } from "./lib/registry.mjs";
import { dirname } from "node:path";

const REGISTRY_PATH = "src/lib/component-registry.ts";
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
  const specifiers = importSpecifiers(readSource(codePath));

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

/** Read validated metadata and derive each component's dependencies. */
export function readRegistryEntries(registryPath = REGISTRY_PATH) {
  return readRegistry(registryPath).entries.map((entry) => ({
    ...entry,
    dependencies: dependenciesFor(entry.codePath),
    ...componentContract(entry.codePath),
  }));
}

/** Absolute path on disk for an entry's README. */
export function readmePath(entry) {
  return `${dirname(entry.codePath)}/README.md`;
}

/**
 * The single source of truth for README content. Both the generator and
 * scripts/verify-component-readmes.mjs call this.
 */
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const cell = (text = "") => text.replace(/\|/g, "\\|").replace(/`/g, "&#96;").replace(/\n/g, " ");
export function usageExample(entry) {
  return [
    '"use client";',
    "",
    `import { ${entry.component} } from "./${entry.id}";`,
    "",
    "export function Demo() {",
    "  return (",
    '    <div className="@container h-[36rem] w-full">',
    `      <${entry.component} />`,
    "    </div>",
    "  );",
    "}",
  ].join("\n");
}

export function renderReadme(entry) {
  const previewUrl = `${SITE}/previews/${entry.id}.png`;
  const dependencies =
    entry.dependencies.length > 0
      ? entry.dependencies.join(", ")
      : "None beyond React";
  const install = entry.dependencies.map((name) => {
    const version = manifest.dependencies[name];
    if (!version) throw new Error(`${entry.id}: declare the runtime dependency ${name} in package.json`);
    return `${name}@${version}`;
  }).join(" ");
  const usageNotes =
    entry.requiredAssets.length === 0
      ? [
          `This component is self-contained — the entire component is \`${entry.id}.tsx\`.`,
          "Copy the source file or this folder into your project. No gallery imports or global theme file are required.",
        ]
      : [
          "## Required assets",
          "",
          "The component code is one file, but it also loads these files at runtime:",
          "",
          ...entry.requiredAssets.map(
            (asset) =>
              `- [${asset.path}](../../../${asset.path.replace(/ \(.*\)$/, "")}) — ${asset.license}. ${asset.credit}`
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
    ...(entry.inspiredBy ? [`- **Inspired by:** [${entry.inspiredBy.label}](${entry.inspiredBy.href})`] : []),
    "",
    "## Setup",
    "",
    "Use React 19, TypeScript and **Tailwind CSS 4**. Class names use v4 features, including container queries; Tailwind v3 is not a drop-in equivalent.",
    "Enable Tailwind in your app stylesheet (`@import \"tailwindcss\";`) and make sure it scans the folder where you copy the component. See [the integration guide](../../../docs/COPY-PASTE.md).",
    "",
    ...(install ? ["Install the compatible dependency ranges tested by this repository:", "", "```bash", `npm install ${install}`, "```", ""] : []),
    ...(entry.dependencies.includes("three") ? ["For TypeScript, also install the matching Three.js declarations:", "", "```bash", `npm install -D @types/three@${manifest.devDependencies["@types/three"]}`, "```", ""] : []),
    "## Usage",
    "",
    "Save this example beside the copied source file, or adjust the relative import to its new location:",
    "",
    "```tsx",
    usageExample(entry),
    "```",
    "",
    "The wrapper provides a bounded preview area. Resize it or pass `className` to fit your app. Leave demo `loop` mode off when you want manual interaction (see defaults below).",
    "",
    "## Props",
    "",
    "| Prop | Type | Default | Notes |",
    "| --- | --- | --- | --- |",
    ...entry.props.map((prop) => `| \`${cell(prop.name)}\` | \`${cell(prop.type)}\` | ${prop.default ? `\`${cell(prop.default)}\`` : prop.required ? "Required" : "—"} | ${cell(prop.description || (prop.name === "className" ? "Additional classes for the root container." : prop.name === "loop" ? "Automatic preview mode." : ""))} |`),
    "",
    `Named export: \`${entry.component}\`. ${entry.types.length ? `Public types: ${entry.types.map((name) => `\`${name}\``).join(", ")}.` : ""}`,
    "- **Source access:** Free and open source.",
    "- **Code license:** MIT (existing source); asset licenses are listed separately.",
    "",
    ...usageNotes,
    "",
    "<!-- Generated by scripts/generate-component-readmes.mjs. Do not edit by hand. -->",
    "",
  ].join("\n");
}

export function renderCatalogue(entries) {
  return [
    "| Preview | Component | Category | Source | Setup |",
    "| --- | --- | --- | --- | --- |",
    ...entries.map((entry) => {
          const access = `[Source](${entry.codePath})`;
      return `| <img src="public/previews/${entry.id}.png" width="160" alt="${cell(entry.title)} preview"> | **${cell(entry.title)}** | ${cell(entry.category)} | ${access} | [README](${readmePath(entry)}) |`;
    }),
  ].join("\n");
}
export const CATALOGUE_BLOCK = /<!-- component-catalogue:start -->[\s\S]*?<!-- component-catalogue:end -->/;

function main() {
  const entries = readRegistryEntries();
  for (const entry of entries) {
    const path = readmePath(entry);
    writeFileSync(path, renderReadme(entry));
    writeFileSync(path.replace("README.md", "index.ts"), renderIndex(entry, entry.id));
    console.log(`wrote ${path}`);
  }
  const rootReadme = readFileSync("README.md", "utf8");
  if (!CATALOGUE_BLOCK.test(rootReadme)) throw new Error("README.md: missing component catalogue markers");
  writeFileSync("README.md", rootReadme.replace(CATALOGUE_BLOCK, `<!-- component-catalogue:start -->\n${renderCatalogue(entries)}\n<!-- component-catalogue:end -->`));
  console.log(`generate-component-readmes: wrote ${entries.length} README files, public exports and root catalogue`);
}

// Only write files when executed directly; importing this module must be
// side-effect free so the verifier can render without touching disk.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
