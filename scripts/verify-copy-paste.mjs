#!/usr/bin/env node
// Compile copies of the public files, not their imports through the gallery.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";
import { readRegistryEntries, usageExample } from "./generate-component-readmes.mjs";
import { renderIndex } from "./lib/component-source.mjs";

mkdirSync(".tmp", { recursive: true });
const fixture = mkdtempSync(resolve(".tmp/copy-paste-"));
try {
  const files = [];
  const entries = readRegistryEntries();
  for (const entry of entries) {
    const folder = join(fixture, entry.id);
    mkdirSync(folder);
    const source = join(folder, `${entry.id}.tsx`);
    const index = join(folder, "index.ts");
    const example = join(folder, "demo.tsx");
    cpSync(entry.codePath, source);
    cpSync(join(dirname(entry.codePath), "index.ts"), index);
    assert.equal(readFileSync(index, "utf8"), renderIndex(entry, entry.id), `${entry.id}: stale public exports`);
    // Compile the exact example consumers see, rather than a separate smoke template.
    const readme = readFileSync(join(dirname(entry.codePath), "README.md"), "utf8");
    const snippet = readme.match(/```tsx\n([\s\S]*?)\n```/);
    assert.ok(snippet, `${entry.id}: missing README usage example`);
    assert.equal(snippet[1], usageExample(entry), `${entry.id}: stale usage example`);
    writeFileSync(example, snippet[1]);
    files.push(source, index, example);
  }
  const program = ts.createProgram(files, {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
    types: ["react", "react-dom"],
    // Intentionally no @/ alias, Next type plugins or next-env.d.ts.
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  }));
  console.log(`verify-copy-paste: OK (${entries.length} isolated components, public entry points and README examples)`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
