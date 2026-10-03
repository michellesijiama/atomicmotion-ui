#!/usr/bin/env node
// Exercise the built server, including real route statuses and response headers.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { readRegistry } from "./lib/registry.mjs";

const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const port = listener.address().port;
await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
let startupError;
server.on("error", (error) => { startupError = error; });
for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs = (logs + chunk).slice(-4000); });
const base = `http://127.0.0.1:${port}`;
const request = (path) => fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(5000) });

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (startupError || server.exitCode !== null) throw new Error(`Server failed to start: ${startupError?.message ?? logs}`);
    try {
      const response = await request("/");
      await response.arrayBuffer();
      ready = true;
      break;
    } catch {
      await delay(100);
    }
  }
  assert.ok(ready, `Server readiness timed out: ${logs}`);
  const { entries, videoIds } = readRegistry();
  const paths = ["/", ...entries.map(({ id }) => `/components/${id}`)];
  for (const path of paths) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin", path);
    assert.equal(response.headers.get("x-powered-by"), null, path);
    assert.match(await response.text(), /AtomicMotion/, path);
  }
  for (const [source, destination] of [["expanded-navigation", "soft-menu-reveal"], ["gradient-aura", "gradient-gummy-bear"]]) {
    const response = await request(`/components/${source}`);
    assert.equal(response.status, 308, source);
    assert.equal(new URL(response.headers.get("location"), base).pathname, `/components/${destination}`);
    await response.arrayBuffer();
  }
  for (const path of ["/components/not-a-component", "/components/__proto__", "/not-a-route"]) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    await response.arrayBuffer();
  }
  for (const path of [...entries.map(({ id }) => `/previews/${id}.png`), ...[...videoIds].map((id) => `/previews/${id}.mp4`), "/models/gummy-bear.glb", "/textures/wall-shadow.jpg"]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.arrayBuffer()).byteLength > 0, path);
  }
  console.log(`verify-server: OK (${paths.length} pages, redirects, 404s, headers and runtime assets)`);
} finally {
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    const timeout = setTimeout(() => server.kill("SIGKILL"), 5000);
    timeout.unref();
    await exited;
    clearTimeout(timeout);
  }
}
