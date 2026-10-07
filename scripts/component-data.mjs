import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// These are trusted, data-only project modules. Share their actual values
// with tooling so the public component catalog cannot drift.
export function readComponentData(filename) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  });
  vm.runInNewContext(outputText, { exports, process: { env: {
    NEXT_PUBLIC_FREE_REPO_NAME: process.env.NEXT_PUBLIC_FREE_REPO_NAME,
  } } }, { filename });
  return exports;
}

export function readComponentCatalog() {
  const { componentList } = readComponentData("src/lib/component-registry.ts");
  return componentList;
}
