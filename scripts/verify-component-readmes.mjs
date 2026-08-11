#!/usr/bin/env node
// Fails if any component README on disk differs from what the generator would
// write right now. It imports renderReadme from the generator rather than
// reimplementing the template: a second copy could drift, and then a green
// check would mean nothing. Change a description in the registry without
// running `npm run generate:readmes` and this fails, naming the stale file.
import { existsSync, readFileSync } from "node:fs";
import {
  readRegistryEntries,
  readmePath,
  renderReadme,
} from "./generate-component-readmes.mjs";

function firstDiffLine(expected, actual) {
  const e = expected.split("\n");
  const a = actual.split("\n");
  for (let i = 0; i < Math.max(e.length, a.length); i += 1) {
    if (e[i] !== a[i]) {
      return `line ${i + 1}: expected ${JSON.stringify(e[i] ?? "<end of file>")}, found ${JSON.stringify(a[i] ?? "<end of file>")}`;
    }
  }
  return "content differs";
}

function main() {
  let entries;
  try {
    entries = readRegistryEntries();
  } catch (error) {
    console.error(`verify-component-readmes: FAILED\n\n  - ${error.message}`);
    process.exit(1);
  }

  const violations = [];

  for (const entry of entries) {
    const path = readmePath(entry);
    const expected = renderReadme(entry);

    if (!existsSync(path)) {
      violations.push(`${path}: missing — run \`npm run generate:readmes\``);
      continue;
    }

    const actual = readFileSync(path, "utf8");
    if (actual !== expected) {
      violations.push(
        `${path}: stale — run \`npm run generate:readmes\` (${firstDiffLine(expected, actual)})`
      );
    }
  }

  if (violations.length > 0) {
    console.error(
      `verify-component-readmes: FAILED (${entries.length} READMEs checked)\n`
    );
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log(`verify-component-readmes: OK (${entries.length} READMEs checked)`);
}

main();
