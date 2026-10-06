#!/usr/bin/env node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { exportFreeLibrary } from "./export-free-library.mjs";

// Use an OS temporary directory so missing public packages cannot resolve from the gallery's node_modules.
const scratch = mkdtempSync(join(tmpdir(), "atomicmotion-free-deps-"));
try {
  exportFreeLibrary(scratch);
  for (const args of [["ci", "--no-fund"], ["run", "check"]]) {
    const result = spawnSync("npm", args, { cwd: scratch, stdio: "inherit" });
    if (result.error || result.status !== 0) throw new Error(`Independent free-library verification failed: npm ${args.join(" ")}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
