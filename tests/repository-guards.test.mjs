import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "atomicmotion-guards-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const put = (path, content = "") => {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  const run = (script) => spawnSync(process.execPath, [join(root, "scripts", script)], { cwd: dir, encoding: "utf8" });
  return { dir, put, run };
}

const entry = `{ id: 'example', title: 'Example', description: 'A \\"quoted\\" example', category: 'Tool', codePath: 'components/tool/example/example.tsx' }`;
function registryFixture(t, metadata = entry, map = "'example': Example", videoIds = "") {
  const f = fixture(t);
  f.put("src/lib/component-registry.ts", `const COMPONENTS_WITH_PREVIEW_VIDEO = new Set([${videoIds}]); export const componentRegistry = { example: createComponentMeta(${metadata}) } satisfies Record<string, unknown>;`);
  f.put("src/lib/component-map.tsx", `export const componentMap = { ${map} };`);
  f.put("components/tool/example/example.tsx", "export default function Example() { return null; }");
  f.put("public/previews/example.png", "poster");
  return f;
}
function pass(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
function fail(result, pattern) {
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, pattern);
}

test("registry accepts single quotes and compact formatting", (t) => {
  pass(registryFixture(t).run("verify-registry-paths.mjs"));
});
test("missing field cannot borrow codePath from the next entry", (t) => {
  const metadata = entry.replace(", codePath: 'components/tool/example/example.tsx'", "");
  const f = registryFixture(t);
  f.put("src/lib/component-registry.ts", `const COMPONENTS_WITH_PREVIEW_VIDEO = new Set([]); const componentRegistry = { first: createComponentMeta(${metadata}), second: createComponentMeta(${entry.replace("id: 'example'", "id: 'second'")}) };`);
  fail(f.run("verify-registry-paths.mjs"), /missing or nonliteral codePath/);
});
test("registry rejects duplicate ids", (t) => {
  const f = registryFixture(t);
  f.put("src/lib/component-registry.ts", `const COMPONENTS_WITH_PREVIEW_VIDEO = new Set([]); const componentRegistry = { first: createComponentMeta(${entry}), second: createComponentMeta(${entry}) };`);
  fail(f.run("verify-registry-paths.mjs"), /duplicate component id/);
});
test("registry rejects syntax errors", (t) => {
  const f = registryFixture(t);
  f.put("src/lib/component-registry.ts", "export const componentRegistry = { broken: ;");
  fail(f.run("verify-registry-paths.mjs"), /src\/lib\/component-registry.ts/);
});
test("registry rejects absent renderer and stale renderer", (t) => {
  fail(registryFixture(t, entry, "'other': Example").run("verify-registry-paths.mjs"), /renderer has no registry entry[\s\S]*registry entry has no renderer/);
});
test("registry rejects missing poster and preview video", (t) => {
  const f = registryFixture(t, entry, undefined, "'example'");
  rmSync(join(f.dir, "public/previews/example.png"));
  fail(f.run("verify-registry-paths.mjs"), /previewImage[\s\S]*previewVideo/);
});
test("registry rejects missing required runtime assets", (t) => {
  const metadata = entry.replace(/ }$/, ", requiredAssets: [{ path: 'public/models/missing.glb', license: 'CC0', credit: 'Author' }] }");
  fail(registryFixture(t, metadata).run("verify-registry-paths.mjs"), /requiredAsset: file does not exist/);
});
test("registry validates asset directory file counts", (t) => {
  const metadata = entry.replace(/ }$/, ", requiredAssets: [{ path: 'public/paintings/ (2 .jpg files)', license: 'CC0', credit: 'Author' }] }");
  const f = registryFixture(t, metadata);
  f.put("public/paintings/one.jpg", "painting");
  fail(f.run("verify-registry-paths.mjs"), /expected 2 .jpg files, found 1/);
  f.put("public/paintings/two.jpg", "painting");
  pass(f.run("verify-registry-paths.mjs"));
});
test("registry rejects traversal and unknown preview ids", (t) => {
  const f = registryFixture(t, entry.replace("components/tool/example/example.tsx", "../outside.tsx"));
  fail(f.run("verify-registry-paths.mjs"), /unsafe repo-relative path/);
  fail(registryFixture(t, entry, undefined, "'missing'").run("verify-registry-paths.mjs"), /unknown or nonliteral component id/);
});

function surfaceFixture(t) {
  const f = fixture(t);
  f.put("ASSETS.md", "| Path | Source |\n| --- | --- |\n| `public/emoji/*.svg` | Test |\n| `public/{next,vercel}.svg` | Test |\n| `public/models/known.glb` | Test |\n");
  execFileSync("git", ["init", "-q"], { cwd: f.dir });
  f.stage = () => execFileSync("git", ["add", "-A"], { cwd: f.dir });
  return f;
}
test("surface validates documented globs and brace alternatives", (t) => {
  const f = surfaceFixture(t);
  for (const path of ["public/emoji/test.svg", "public/next.svg", "public/vercel.svg", "public/models/known.glb"]) f.put(path, "asset");
  f.stage();
  pass(f.run("verify-public-surface.mjs"));
});
test("surface rejects same basename from an undocumented directory", (t) => {
  const f = surfaceFixture(t);
  f.put("public/other/known.glb", "asset");
  f.stage();
  fail(f.run("verify-public-surface.mjs"), /asset not listed.*public\/other\/known.glb/);
});
test("surface rejects undocumented SVGs", (t) => {
  const f = surfaceFixture(t);
  f.put("public/unknown.svg", "asset");
  f.stage();
  fail(f.run("verify-public-surface.mjs"), /asset not listed/);
});
test("surface checks Unicode paths and paths containing newlines", (t) => {
  const f = surfaceFixture(t);
  f.put("素材/超大\n文件.bin", Buffer.alloc(3 * 1024 * 1024 + 1));
  f.stage();
  fail(f.run("verify-public-surface.mjs"), /file exceeds 3MB/);
});
test("surface rejects tracked environment secrets", (t) => {
  const f = surfaceFixture(t);
  f.put(".env.local", "TEST_SECRET=fixture");
  f.stage();
  fail(f.run("verify-public-surface.mjs"), /denylisted path tracked: .env.local/);
});
test("surface rejects missing tracked files", (t) => {
  const f = surfaceFixture(t);
  f.put("missing.txt", "tracked");
  f.stage();
  rmSync(join(f.dir, "missing.txt"));
  fail(f.run("verify-public-surface.mjs"), /tracked file is missing/);
});

test("surface rejects an empty provenance document", (t) => {
  const f = surfaceFixture(t);
  f.put("public/models/known.glb", "asset");
  f.put("ASSETS.md", "");
  f.stage();
  fail(f.run("verify-public-surface.mjs"), /asset not listed/);
});

test("registry requires complete literal inspiration attribution", (t) => {
  const metadata = entry.replace(/ }$/, ", inspiredBy: { label: 'Source' } }");
  fail(registryFixture(t, metadata).run("verify-registry-paths.mjs"), /inspiredBy: missing or nonliteral href/);
  pass(registryFixture(t, metadata.replace("label: 'Source'", "label: 'Source', href: 'https://example.com'" )).run("verify-registry-paths.mjs"));
});
