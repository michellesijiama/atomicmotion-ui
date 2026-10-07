#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readComponentCatalog } from "./component-data.mjs";
import { dependenciesFor, readRegistryEntries, renderReadme } from "./generate-component-readmes.mjs";
import { createPublicLibraryPackage } from "./lib/public-library-package.mjs";

const SITE = "https://atomicmotion.dev";
const DEFAULT_OUTPUT = ".artifacts/atomicmotion-free";
const digest = (value) => createHash("sha256").update(value).digest("hex");

function readAllowedFile(filename) {
  if (path.isAbsolute(filename) || filename.split("/").includes("..")) {
    throw new Error(`Unsafe publication path: ${filename}`);
  }
  let current = ".";
  for (const part of filename.split("/")) {
    current = path.join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlinks cannot be published: ${filename}`);
  }
  return readFileSync(filename);
}

function expandAssets(pattern) {
  if (!pattern.includes("*")) return [pattern];
  // Deliberately support one narrow asset glob, not recursive folder copying.
  if (pattern !== "public/emoji/*.svg") throw new Error(`Unsupported asset pattern: ${pattern}`);
  return readdirSync("public/emoji").filter((name) => /^[A-F0-9]+\.svg$/.test(name))
    .sort().map((name) => `public/emoji/${name}`);
}

export function createPublicLibraryPlan() {
  const catalog = readComponentCatalog();
  const free = catalog;
  const assetRules = JSON.parse(readFileSync("scripts/public-library-assets.json", "utf8"));
  const entries = new Map(readRegistryEntries().map((entry) => [entry.id, entry]));
  const files = new Map();
  const addText = (filename, content) => files.set(filename, Buffer.from(content));
  const addFile = (filename) => files.set(filename, readAllowedFile(filename));

  addFile("LICENSE");
  addFile(".nvmrc");
  addText(".gitignore", "node_modules/\n.tmp/\n.env*\n.DS_Store\n*.tsbuildinfo\n");
  const packageJson = createPublicLibraryPackage();
  const publicLock = JSON.parse(readAllowedFile("scripts/public-library/package-lock.json"));
  for (const field of ["dependencies", "devDependencies", "engines"]) {
    if (JSON.stringify(publicLock.packages[""][field]) !== JSON.stringify(packageJson[field])) {
      throw new Error("Public dependency lock is stale; run npm run generate:free-lock.");
    }
  }
  addText("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  files.set("package-lock.json", readAllowedFile("scripts/public-library/package-lock.json"));
  files.set(".github/workflows/ci.yml", readAllowedFile("scripts/public-library/ci.yml"));
  for (const name of ["verify-library.mjs", "verify-copy-paste.mjs", "verify-styles.mjs"]) {
    files.set(`scripts/${name}`, readAllowedFile(`scripts/public-library/${name}`));
  }
  addText("docs/COPY-PASTE.md", readAllowedFile("docs/COPY-PASTE.md").toString()
    .replace("../README.md#components", "../README.md#free-components")
    .replace("all registered sources", "all published free sources")
    .replace("Browser responsive checks separately exercise the gallery's\nroutes, menus and short viewport scrolling.", "The gallery's separate repository also runs browser responsive checks."));
  const assetRows = [];
  const freeCatalog = free.map((component) => {
    const { id, title, description, category, codePath, requiredAssets = [] } = component;
    if (!/^components\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\.tsx$/.test(codePath)
      || path.basename(codePath) !== `${id}.tsx` || path.basename(path.dirname(codePath)) !== id) {
      throw new Error(`Invalid component path: ${id}`);
    }
    const folder = path.posix.dirname(codePath);
    addFile(codePath);
    addFile(`${folder}/index.ts`);
    const indexSource = files.get(`${folder}/index.ts`).toString();
    const entryPointPattern = new RegExp(`^export (?:type )?\\{ [A-Za-z0-9_, ]+ \\} from "\\./${id}";$`);
    if (!indexSource.trim().split("\n").every((line) => entryPointPattern.test(line.trim()))) {
      throw new Error(`Unexpected component entry point: ${id}`);
    }
    const dependencies = dependenciesFor(codePath);
    const declaredFiles = requiredAssets.map(({ path: filename }) => filename)
      .filter((filename) => /^public\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg|glb)$/.test(filename));
    const assets = [...new Set([...(assetRules[id] ?? []).flatMap(expandAssets), ...declaredFiles])];
    for (const asset of requiredAssets) {
      const base = asset.path.replace(/\s*\([^)]*\)$/, "");
      if (!assets.some((filename) => base.endsWith("/") ? filename.startsWith(base) : filename === base)) {
        throw new Error(`Runtime asset is missing from the publication allowlist: ${id}: ${asset.path}`);
      }
    }
    assets.forEach(addFile);
    for (const asset of requiredAssets) assetRows.push(`- **${title}:** ${asset.path} — ${asset.license}. ${asset.credit}`);
    addText(`${folder}/README.md`, renderReadme(entries.get(id)));
    return { id, title, description, category, source: codePath, demo: `${SITE}/components/${id}`, dependencies, assets };
  });
  addText("catalog.json", `${JSON.stringify({ free: freeCatalog }, null, 2)}\n`);
  addText("ASSETS.md", [
    "# Runtime assets", "", "The component code is MIT-licensed. Runtime images and models retain their own terms.", "",
    ...assetRows,
    "- **Emoji Sketch:** local SVGs are OpenMoji v15.0.0, CC BY-SA 4.0. Preserve licenses/OpenMoji-CC-BY-SA-4.0.txt and public/emoji/README.md.",
    "- **Gradient Gummy Bear poster:** self-authored by Sijia Ma, MIT.", "",
    "## Unresolved attribution in existing material", "",
    "Blossom Light's supplied wall-shadow photograph has no recorded photographer, origin or redistribution terms.",
    "Halftone Bloom embeds dots traced from a supplied lunar photograph; its photographer, origin and license have not been recorded.",
    "These existing notices remain unresolved. The MIT code license does not grant rights in third-party artwork.", "",
  ].join("\n"));
  addText("README.md", [
    "# AtomicMotion — Free Components", "",
    "A design library of expressive interfaces and interactions for designers and frontend developers.",
    "", `**[Explore the design library](${SITE})** — every live demo is free.`, "",
    "All 17 gallery components are free and open source. Copy the source and required assets directly from this repository.",
    "", "## Free components", "", "| Component | Category | Source | Demo |", "| --- | --- | --- | --- |",
    ...freeCatalog.map(({ title, category, source, demo }) => `| ${title} | ${category} | [Source](${source}) | [Preview](${demo}) |`),
    "", "## Using a free component", "",
    "1. Open its folder and follow its README for dependencies and required assets.",
    "2. Copy the TSX component into a React + TypeScript project with Tailwind CSS v4.",
    "3. Copy its required runtime assets and retain the listed attribution.",
    "4. Import and render its exported component.",
    "", "See the [integration guide](docs/COPY-PASTE.md) for Tailwind setup and common issues.",
    "", "This is a copy-paste library; it does not include the gallery app or an npm package.",
    "", "## Verify the library", "",
    "Use Node.js 24. The included dependency lock reproduces the versions tested by the design library:",
    "", "```bash", "nvm use", "npm ci", "npm run check", "```", "",
    "Checks verify the free-only publication, compile each component and its README example without Next.js, and audit dependencies. GitHub runs these checks on pushes and pull requests.",
    "The root package is a verification environment, not a published npm package. Install only the packages listed in your chosen component's README in your own app.",
    "Dependency updates are prepared and verified in the complete application repository, then exported here with an updated manifest and lockfile.",
    "", "## License", "",
    "The included source is [MIT-licensed](LICENSE). Runtime assets retain the terms in [ASSETS.md](ASSETS.md).",
    "", "Designed and built by [Sijia Ma](https://www.linkedin.com/in/michellesijiama/).", "",
  ].join("\n"));
  const manifest = {
    version: 1, freeComponents: freeCatalog.map(({ id }) => id),
    files: Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => [name, digest(value)])),
  };
  addText("publication-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  return files;
}

function walk(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === ".git") throw new Error("Git history must never be copied into the public export.");
    if (entry.isSymbolicLink()) throw new Error(`Symlink in publication: ${name}`);
    return entry.isDirectory() ? walk(path.join(directory, entry.name), name) : [name];
  });
}

export function verifyPublicLibrary(directory, expected = createPublicLibraryPlan()) {
  const found = walk(directory).sort();
  const wanted = [...expected.keys()].sort();
  if (JSON.stringify(found) !== JSON.stringify(wanted)) {
    throw new Error("Publication contains missing or unexpected files; application code, secrets and copied Git history are forbidden.");
  }
  for (const [filename, content] of expected) {
    if (digest(readFileSync(path.join(directory, filename))) !== digest(content)) {
      throw new Error(`Publication differs from the approved free source: ${filename}`);
    }
  }
  return { files: found.length, components: JSON.parse(expected.get("catalog.json").toString()).free.length };
}

export function exportFreeLibrary(directory = DEFAULT_OUTPUT) {
  if (existsSync(directory) && readdirSync(directory).length > 0) {
    throw new Error(`Refusing to overwrite a non-empty directory: ${directory}. Choose a new output folder.`);
  }
  const files = createPublicLibraryPlan();
  mkdirSync(directory, { recursive: true });
  for (const [filename, content] of files) {
    const destination = path.join(directory, filename);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, content, { flag: "wx" });
  }
  return verifyPublicLibrary(directory, files);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [mode, directory, ...extra] = process.argv.slice(2);
  if (extra.length || (mode && !["--out", "--verify"].includes(mode)) || (mode && !directory)) {
    throw new Error("Usage: node scripts/export-free-library.mjs [--out directory | --verify directory]");
  }
  const output = directory ?? DEFAULT_OUTPUT;
  const result = mode === "--verify" ? verifyPublicLibrary(output) : exportFreeLibrary(output);
  console.log(`Free library ${mode === "--verify" ? "verified" : "prepared"}: ${result.components} components, ${result.files} files at ${output}`);
}
