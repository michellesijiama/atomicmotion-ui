#!/usr/bin/env node
// Asserts that every registry entry's codePath is exactly
// components/<category>/<id>/<id>.tsx, that the file exists, and that the
// folder holds only the expected files. This is what keeps the category
// metadata and the folder tree from drifting apart: change a component's
// category without moving its folder and this fails.
import { existsSync, readdirSync, readFileSync } from "node:fs";

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
    if (/\bfrom\s+["']@\//.test(componentSource) || /^\s*import\s+["']@\//m.test(componentSource)) {
      violations.push(`[${id}] component imports a private @/ module: ${codePath}`);
    }
  }

  const dir = `components/${slug(category)}/${id}`;
  if (existsSync(dir)) {
    const extra = readdirSync(dir).filter((f) => ![`${id}.tsx`, "index.ts", "README.md"].includes(f));
    if (extra.length) violations.push(`[${id}] unexpected files in ${dir}: ${extra.join(", ")}`);
  }
}

if (violations.length) {
  console.error(`verify-component-structure: FAILED (${entries.length} entries)\n`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log(`verify-component-structure: OK (${entries.length} entries checked)`);
