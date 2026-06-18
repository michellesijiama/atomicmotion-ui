import fs from "node:fs";

const files = {
  actions: fs.readFileSync("src/components/website/component-actions.tsx", "utf8"),
  card: fs.readFileSync("src/components/website/component-card.tsx", "utf8"),
  registry: fs.readFileSync("src/lib/component-registry.ts", "utf8"),
  clipboard: fs.existsSync("src/lib/clipboard.ts")
    ? fs.readFileSync("src/lib/clipboard.ts", "utf8")
    : "",
};

const checks = [
  ["clipboard helper exists", files.clipboard.includes("writeClipboardText")],
  ["actions import clipboard helper", files.actions.includes("@/lib/clipboard")],
  ["actions expose Copy link", files.actions.includes("Copy link")],
  ["actions copy component codeHref", files.actions.includes("component.codeHref")],
  ["card is client component", files.card.startsWith('"use client";')],
  ["card imports clipboard helper", files.card.includes("@/lib/clipboard")],
  ["card has copy-link icon", files.card.includes("Link2")],
  ["card click prevents navigation", files.card.includes("preventDefault()")],
  ["placeholder cards skip copy overlay", files.card.includes("if (!Preview)")],
  ['GitHub links use stable main branch', files.registry.includes('REPO_BRANCH = "main"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error(
    failures.map(([name]) => `github install flow missing: ${name}`).join("\n"),
  );
  process.exit(1);
}

console.log("github install flow checks passed");
