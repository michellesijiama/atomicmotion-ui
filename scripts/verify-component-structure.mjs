#!/usr/bin/env node
// Asserts that every registry entry's codePath is exactly
// components/<category>/<id>/<id>.tsx, that the file exists, and that the
// folder holds only the expected files. This is what keeps the category
// metadata and the folder tree from drifting apart: change a component's
// category without moving its folder and this fails.
import { existsSync, readdirSync, readFileSync } from "node:fs";

import { componentContract, renderIndex } from "./lib/component-source.mjs";
import { readRegistry } from "./lib/registry.mjs";

const { entries } = readRegistry();

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const violations = [];

for (const { id, category, codePath, title } of entries) {
  const expected = `components/${slug(category)}/${id}/${id}.tsx`;
  if (codePath !== expected) violations.push(`[${id}] codePath is ${codePath}, expected ${expected}`);
  if (!existsSync(codePath)) violations.push(`[${id}] file does not exist: ${codePath}`);
  if (title && slug(title) !== id) violations.push(`[${id}] id does not match title "${title}" (expected ${slug(title)})`);
  if (existsSync(codePath)) {
    const componentSource = readFileSync(codePath, "utf8");
    try {
      const contract = componentContract(codePath);
      for (const specifier of contract.imports) {
        if (specifier.startsWith(".") || specifier.startsWith("@/") || /^(next(?:\/|$)|styled-jsx(?:\/|$)|node:)/.test(specifier)) {
          violations.push(`[${id}] component requires a private, relative or framework module: ${specifier}`);
        }
      }
      if (/<style\s+jsx\b/.test(componentSource)) violations.push(`[${id}] requires Next.js styled-jsx`);
      const indexPath = codePath.replace(`${id}.tsx`, "index.ts");
      if (!existsSync(indexPath) || readFileSync(indexPath, "utf8") !== renderIndex(contract, id)) violations.push(`[${id}] stale or missing public exports — run npm run generate:readmes`);
    } catch (error) {
      violations.push(`[${id}] ${error.message}`);
    }
  }

  const dir = `components/${slug(category)}/${id}`;
  if (existsSync(dir)) {
    const extra = readdirSync(dir).filter((f) => ![`${id}.tsx`, "index.ts", "README.md"].includes(f));
    if (extra.length) violations.push(`[${id}] unexpected files in ${dir}: ${extra.join(", ")}`);
  }
}

// Only registered component folders belong in the supported catalogue.
const expectedDirs = new Set(entries.map(({ codePath }) => codePath.slice(0, codePath.lastIndexOf("/"))));
for (const category of readdirSync("components", { withFileTypes: true })) {
  if (!category.isDirectory()) continue;
  for (const folder of readdirSync(`components/${category.name}`, { withFileTypes: true })) {
    if (folder.isDirectory() && !expectedDirs.has(`components/${category.name}/${folder.name}`)) violations.push(`unregistered catalogue folder: components/${category.name}/${folder.name}; move incomplete examples to archive/`);
  }
}

if (violations.length) {
  console.error(`verify-component-structure: FAILED (${entries.length} entries)\n`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`verify-component-structure: OK (${entries.length} entries checked)`);
