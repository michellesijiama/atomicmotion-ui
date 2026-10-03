#!/usr/bin/env node
// Use the same test discovery locally and in CI, preserving every failure.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
const tests = Object.keys(scripts).filter((name) => name.startsWith("test:")).sort();
if (!tests.length) throw new Error("No test:* scripts found in package.json");
const failures = [];
const npmCommand = process.env.npm_execpath ? process.execPath : "npm";
const npmArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];
for (const name of tests) {
  console.log(`\n::group::npm run ${name}`);
  const result = spawnSync(npmCommand, [...npmArgs, "run", "--silent", name], { stdio: "inherit" });
  if (result.error || result.status !== 0) failures.push(name);
  console.log("::endgroup::");
}
if (failures.length) {
  console.error(`Failed checks: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`All ${tests.length} test scripts passed.`);
}
