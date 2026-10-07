#!/usr/bin/env node
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createPublicLibraryPackage } from "./lib/public-library-package.mjs";

const scratch = mkdtempSync(join(tmpdir(), "atomicmotion-free-lock-"));
try {
  writeFileSync(join(scratch, "package.json"), `${JSON.stringify(createPublicLibraryPackage(), null, 2)}\n`);
  const result = spawnSync("npm", ["install", "--package-lock-only", "--ignore-scripts"], { cwd: scratch, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error("Public dependency lock generation failed");
  copyFileSync(join(scratch, "package-lock.json"), "scripts/public-library/package-lock.json");
  console.log("Updated the public verification dependency lock.");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
