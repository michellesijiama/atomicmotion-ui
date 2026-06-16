import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const files = {
  packageJson: read("package.json"),
  globals: read("src/styles/globals.css"),
  layout: read("src/app/layout.tsx"),
  page: read("src/app/page.tsx"),
  siteIndex: read("src/components/website/site-index.tsx"),
  componentPlate: read("src/components/website/component-plate.tsx"),
  noisyPlayground: read("src/components/website/noisy-card-playground.tsx"),
};

const checks = [
  ["test script is wired", files.packageJson.includes("verify-jitter-design-system.mjs")],
  ["page background token is Jitter neutral", files.globals.includes("--jitter-bg: #f5f5f5")],
  ["ink token is Jitter ink", files.globals.includes("--jitter-ink: #0e1011")],
  ["green status token exists", files.globals.includes("--jitter-green: #15bc64")],
  ["purple status token exists", files.globals.includes("--jitter-purple: #7a40ed")],
  ["blue status token exists", files.globals.includes("--jitter-blue: #1377e4")],
  ["orange status token exists", files.globals.includes("--jitter-orange: #ff8316")],
  ["layout uses Jitter shell background", files.layout.includes("bg-[var(--jitter-bg)]")],
  ["site index uses archive language", files.siteIndex.includes("Entire Archive")],
  ["site index shows all status tags", ["FREE", "PRO", "RE-MADE", "NEW"].every((tag) => files.siteIndex.includes(tag))],
  ["component plate accepts status metadata", files.componentPlate.includes("statusClassName")],
  ["component plate accepts code path metadata", files.componentPlate.includes("codePath")],
  ["component plate accepts code link metadata", files.componentPlate.includes("codeHref")],
  ["component plate accepts download metadata", files.componentPlate.includes("downloadHref")],
  ["component plate renders view code action", files.componentPlate.includes("View code")],
  ["component plate renders download action", files.componentPlate.includes("Download component")],
  ["page maps Magnet Button to FREE", files.page.includes('status="FREE"')],
  ["page maps Fluid Tabs to PRO", files.page.includes('status="PRO"')],
  ["page maps Elastic Drag to RE-MADE", files.page.includes('status="RE-MADE"')],
  ["page maps Noisy Analog Card to NEW", files.page.includes('status="NEW"')],
  [
    "page lists every source component path",
    [
      "src/components/ui/magnet-button.tsx",
      "src/components/ui/fluid-tabs.tsx",
      "src/components/ui/elastic-drag.tsx",
      "src/components/ui/noisy-analog-card.tsx",
    ].every((path) => files.page.includes(path)),
  ],
  [
    "page lists every download label",
    [
      "Download magnet-button.tsx",
      "Download fluid-tabs.tsx",
      "Download elastic-drag.tsx",
      "Download noisy-analog-card.tsx",
    ].every((label) => files.page.includes(label)),
  ],
  ["noisy playground uses Jitter accent swatches", ["#15bc64", "#7a40ed", "#1377e4", "#ff8316"].every((color) => files.noisyPlayground.includes(color))],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("Jitter design-system checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`Jitter design-system checks passed (${checks.length}/${checks.length}).`);
