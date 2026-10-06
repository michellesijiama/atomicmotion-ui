import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { componentContract, importSpecifiers, renderIndex } from "../scripts/lib/component-source.mjs";
import { readSource } from "../scripts/lib/registry.mjs";

function source(t, code) {
  const dir = mkdtempSync(join(tmpdir(), "atomicmotion-source-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "example.tsx");
  writeFileSync(file, code);
  return file;
}

test("imports ignore strings and comments, include dynamic and scoped packages", (t) => {
  const file = source(t, `// import Hidden from '@/private';
    const note = 'from "imaginary"';
    import { motion } from 'framer-motion';
    import '@scope/package/styles';
    export { thing } from './local';
    const loader = () => import('three/examples/jsm/loaders/GLTFLoader.js');`);
  assert.deepEqual(importSpecifiers(readSource(file)), ["framer-motion", "@scope/package/styles", "./local", "three/examples/jsm/loaders/GLTFLoader.js"]);
});

test("contracts expose source defaults, named presets and public types", (t) => {
  const file = source(t, `export type ExampleProps = { text?: string; onChange: (value: string) => void };
    export type PublicData = { id: string };
    export const PRESETS = ['default'];
    export function Example({ text = 'Ready', onChange }: ExampleProps) { return null; }`);
  const contract = componentContract(file);
  assert.equal(contract.component, "Example");
  assert.deepEqual(contract.values, ["PRESETS", "Example"]);
  assert.deepEqual(contract.types, ["ExampleProps", "PublicData"]);
  assert.equal(contract.props[0].default, "'Ready'");
  assert.equal(contract.props[1].required, true);
  assert.equal(renderIndex(contract, "example"), `export { PRESETS, Example } from "./example";\nexport type { ExampleProps, PublicData } from "./example";\n`);
});

test("contracts support aliases, no-prop functions and reject absent exports", (t) => {
  let file = source(t, `export interface ExampleProps { loop?: boolean; } export function Example({ loop: replay = false }: ExampleProps) { return null; }`);
  assert.equal(componentContract(file).props[0].default, "false");
  file = source(t, "export function Example() { return null; }");
  assert.deepEqual(componentContract(file).props, []);
  file = source(t, "function Private() { return null; }");
  assert.throws(() => componentContract(file), /missing named component export/);
});

// Exercise the structure guard with genuinely broken consumer folders.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const guard = fileURLToPath(new URL("../scripts/verify-component-structure.mjs", import.meta.url));
function catalogue(t, code = "export type ExampleProps = { loop?: boolean }; export function Example({ loop = false }: ExampleProps) { return null; }") {
  const dir = mkdtempSync(join(tmpdir(), "atomicmotion-catalogue-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const put = (path, text = "") => { const file = join(dir, path); mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, text); };
  put("src/lib/component-registry.ts", `const COMPONENTS_WITH_PREVIEW_VIDEO = new Set([]); export const componentRegistry = { example: createComponentMeta({ id: 'example', title: 'Example', description: 'Example', category: 'Tool', codePath: 'components/tool/example/example.tsx' }) };`);
  put("components/tool/example/example.tsx", code);
  put("components/tool/example/index.ts", renderIndex(componentContract(join(dir, "components/tool/example/example.tsx")), "example"));
  put("components/tool/example/README.md", "# Example");
  const run = () => spawnSync(process.execPath, [guard], { cwd: dir, encoding: "utf8" });
  return { put, run };
}
test("structure accepts complete standalone folders and ignores comment imports", (t) => {
  const result = catalogue(t, `// import Hidden from '@/private';\nexport function Example() { return null; }`).run();
  assert.equal(result.status, 0, result.stderr);
});
test("structure rejects dynamic private imports and framework imports", (t) => {
  for (const specifier of ["@/hidden", "./hidden", "next/link", "styled-jsx/css"]) {
    const result = catalogue(t, `const load = () => import('${specifier}'); export function Example() { return null; }`).run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /private, relative or framework module/);
  }
});
test("structure rejects styled-jsx even without a framework import", (t) => {
  const result = catalogue(t, "export function Example() { return <style jsx>{'div { color: red }'}</style>; }").run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires Next.js styled-jsx/);
});
test("structure rejects lost public types and incomplete catalogue folders", (t) => {
  const fixture = catalogue(t);
  fixture.put("components/tool/example/index.ts", `export { Example } from "./example";\n`);
  let result = fixture.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /stale or missing public exports/);
  fixture.put("components/tool/unfinished/unfinished.tsx", "export function Unfinished() { return null; }");
  result = fixture.run();
  assert.match(result.stderr, /unregistered catalogue folder/);
});

import { renderCatalogue, renderReadme } from "../scripts/generate-component-readmes.mjs";
const scriptPath = (name) => fileURLToPath(new URL(`../scripts/${name}`, import.meta.url));
function docsFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "atomicmotion-docs-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const put = (path, content = "") => { const file = join(dir, path); mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, content); };
  const run = (name) => spawnSync(process.execPath, [scriptPath(name)], { cwd: dir, encoding: "utf8" });
  return { dir, put, run };
}
test("README guard rejects a stale root catalogue while folder docs are current", (t) => {
  const fixture = docsFixture(t);
  fixture.put("package.json", '{"dependencies":{},"devDependencies":{}}');
  fixture.put("src/lib/component-offers.ts", "export function getComponentOffer() { return undefined; }");
  fixture.put("src/lib/component-registry.ts", `const COMPONENTS_WITH_PREVIEW_VIDEO = new Set([]); export const componentRegistry = { example: createComponentMeta({ id: 'example', title: 'Example', description: 'Example', category: 'Tool', codePath: 'components/tool/example/example.tsx' }) };`);
  fixture.put("components/tool/example/example.tsx", "export function Example() { return null; }");
  const entry = { id: "example", title: "Example", description: "Example", category: "Tool", codePath: "components/tool/example/example.tsx", dependencies: [], requiredAssets: [], ...componentContract(join(fixture.dir, "components/tool/example/example.tsx")) };
  fixture.put("components/tool/example/README.md", renderReadme(entry));
  fixture.put("README.md", `<!-- component-catalogue:start -->\n${renderCatalogue([entry])}\n<!-- component-catalogue:end -->`);
  let result = fixture.run("verify-component-readmes.mjs");
  assert.equal(result.status, 0, result.stderr);
  fixture.put("README.md", "<!-- component-catalogue:start -->\nstale\n<!-- component-catalogue:end -->");
  result = fixture.run("verify-component-readmes.mjs");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /stale component catalogue/);
});
test("documentation guard includes the integration guide and catalogue overview", (t) => {
  const fixture = docsFixture(t);
  for (const path of ["ASSETS.md", "CONTRIBUTING.md", "components/README.md", "archive/README.md", "public/emoji/README.md"]) fixture.put(path, "# Documentation");
  const targets = Array.from({ length: 15 }, (_, i) => `docs/target-${i}.md`);
  for (const path of targets) fixture.put(path, "# Target");
  fixture.put("README.md", targets.map((path) => `[Target](${path})`).join("\n"));
  let result = fixture.run("verify-doc-links.mjs");
  assert.equal(result.status, 0, result.stderr);
  fixture.put("docs/COPY-PASTE.md", "[Missing source](../components/tool/missing/missing.tsx)");
  fixture.put("components/README.md", "[Missing category](missing/)");
  result = fixture.run("verify-doc-links.mjs");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /docs\/COPY-PASTE.md: broken link/);
  assert.match(result.stderr, /components\/README.md: broken link/);
});
