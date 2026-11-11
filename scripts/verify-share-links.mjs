#!/usr/bin/env node
// Public downloads must work anonymously and match the maintained source.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { createPublicLibraryPlan } from "./export-free-library.mjs";
import { readComponentCatalog, readComponentData } from "./component-data.mjs";

assert.ok(process.argv.slice(2).every((arg) => arg === "--site"), "Usage: npm run verify:links [-- --site]");
const raw = "https://raw.githubusercontent.com/michellesijiama";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = createPublicLibraryPlan();
const { studioModels } = readComponentData("src/lib/model-registry.ts");
const checks = [...files].map(([path, bytes]) => ({
  url: `${raw}/atomicmotion-free/main/${path}`, checksum: hash(bytes),
}));
for (const model of studioModels) {
  for (const path of new Set([
    ...[model.blend, model.gif, model.still, model.image, model.license].filter(Boolean).map((asset) => `public${asset}`),
    `scenes/${model.id}/README.md`,
  ])) checks.push({ url: `${raw}/atomicmotion-ui/main/${path}`, checksum: hash(readFileSync(path)) });
}
if (process.argv.includes("--site")) {
  for (const path of ["/", "/3d-studio", ...readComponentCatalog().map(({ id }) => `/components/${id}`), ...studioModels.map(({ id }) => `/3d-studio/${id}`)]) {
    checks.push({ url: `https://atomicmotion.dev${path}` });
  }
}

const failures = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < checks.length) {
    const { url, checksum } = checks[next++];
    try {
      // A raw branch URL can keep an older CDN response briefly after a push.
      // Version the audit request by expected content without changing shared URLs.
      const requestUrl = new URL(url);
      if (checksum) requestUrl.searchParams.set("verify", checksum);
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        response = await fetch(requestUrl, { signal: AbortSignal.timeout(20000) });
        if (response.status !== 429 && response.status < 500) break;
        await response.arrayBuffer();
        await delay(500 * (attempt + 1));
      }
      assert.equal(response.status, 200, `HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.ok(bytes.length, "Empty download");
      if (checksum) assert.equal(hash(bytes), checksum, "Published content differs from this checkout; synchronize the public repository");
    } catch (error) {
      failures.push(`${url}: ${error.message.split("\n")[0]}`);
    }
  }
}));
if (failures.length) {
  console.error(`verify-share-links: FAILED (${failures.length}/${checks.length})\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`verify-share-links: OK (${checks.length} anonymous public URLs, published file hashes and scene downloads)`);
}
