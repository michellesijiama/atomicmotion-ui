#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const catalog = JSON.parse(readFileSync("catalog.json", "utf8"));
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
mkdirSync(".tmp", { recursive: true });
const fixture = mkdtempSync(resolve(".tmp/copy-paste-"));
try {
  const files = [];
  for (const { id, source, dependencies } of catalog.free) {
    const code = readFileSync(source, "utf8");
    const ast = ts.createSourceFile(source, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = new Set();
    function visit(node) {
      const specifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier
        : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(ast) === "require") ? node.arguments[0] : undefined;
      if (specifier) {
        assert.ok(ts.isStringLiteral(specifier), `${id}: imports must use literal package names`);
        const value = specifier.text;
        assert.ok(!value.startsWith(".") && !value.startsWith("@/") && !value.startsWith("next") && !value.startsWith("node:"), `${id}: source must be independent of the gallery`);
        const parts = value.split("/");
        const name = value.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
        assert.ok(Object.hasOwn(manifest.dependencies, name), `${id}: missing runtime dependency ${name}`);
        if (!["react", "react-dom"].includes(name)) imports.add(name);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.deepEqual([...imports].sort(), dependencies, `${id}: dependency instructions must match source imports`);
    const folder = join(fixture, id);
    mkdirSync(folder);
    for (const filename of [`${id}.tsx`, "index.ts"]) {
      cpSync(join(dirname(source), filename), join(folder, filename));
      files.push(join(folder, filename));
    }
    const readme = readFileSync(join(dirname(source), "README.md"), "utf8");
    const snippet = readme.match(/```tsx\n([\s\S]*?)\n```/);
    assert.ok(snippet, `${id}: missing README usage example`);
    const example = join(folder, "demo.tsx");
    writeFileSync(example, snippet[1]);
    files.push(example);
  }
  const program = ts.createProgram(files, {
    noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"], types: ["react", "react-dom"],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => "\n",
  }));
  console.log(`Copy-paste verified: ${catalog.free.length} components, exports and README examples with their declared dependencies.`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
