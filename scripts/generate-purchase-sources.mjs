#!/usr/bin/env node
// Bundle only the curated delivery files at build time. The generated JSON
// is imported exclusively by a server route, never by a client component.
import { readFileSync, writeFileSync } from "node:fs";
import { readComponentCatalog } from "./component-data.mjs";

const paid = readComponentCatalog().filter(({ offer }) => offer);
const sources = Object.fromEntries(paid.map(({ id, codePath }) => {
  if (!codePath.startsWith("components/") || codePath.includes("..")) {
    throw new Error(`Invalid source path for ${id}`);
  }
  return [id, readFileSync(codePath, "utf8")];
}));

writeFileSync("src/lib/component-sources.generated.json", JSON.stringify({
  license: readFileSync("LICENSE", "utf8"),
  sources,
}));
console.log(`generate-purchase-sources: bundled ${paid.length} original components and their license for server delivery`);
