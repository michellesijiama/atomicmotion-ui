import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readIfExists(path) {
  return existsSync(path) ? read(path) : "";
}

const files = {
  packageJson: read("package.json"),
  globals: read("src/styles/globals.css"),
  layout: read("src/app/layout.tsx"),
  page: read("src/app/page.tsx"),
  siteIndex: read("src/components/website/site-index.tsx"),
  componentPlate: read("src/components/website/component-plate.tsx"),
  noisyPlayground: read("src/components/website/noisy-card-playground.tsx"),
  componentRegistry: readIfExists("src/lib/component-registry.ts"),
  windowLeafShadow: readIfExists("src/components/ui/window-leaf-shadow.tsx"),
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
  ["component plate accepts AI prompt metadata", files.componentPlate.includes("aiPrompt")],
  ["component plate renders view code action", files.componentPlate.includes("View code")],
  ["component plate renders copy for AI action", files.componentPlate.includes("Copy for AI")],
  ["component plate renders copied state", files.componentPlate.includes("Copied")],
  ["component plate renders AI prompt fallback", files.componentPlate.includes("AI prompt is below")],
  ["component plate renders raw file action", files.componentPlate.includes("Raw file")],
  ["component registry maps Magnet Button to FREE", files.componentRegistry.includes('status: "FREE"')],
  ["component registry maps Fluid Tabs to PRO", files.componentRegistry.includes('status: "PRO"')],
  ["component registry maps Elastic Drag to RE-MADE", files.componentRegistry.includes('status: "RE-MADE"')],
  ["component registry maps Noisy Analog Card to NEW", files.componentRegistry.includes('status: "NEW"')],
  ["page imports component registry", files.page.includes("componentRegistry")],
  ["component registry exists", files.componentRegistry.length > 0],
  ["component registry exports metadata", files.componentRegistry.includes("componentRegistry")],
  ["component registry defines repo owner", files.componentRegistry.includes("REPO_OWNER")],
  ["component registry defines repo name", files.componentRegistry.includes("REPO_NAME")],
  ["component registry defines repo branch", files.componentRegistry.includes("REPO_BRANCH")],
  ["component registry defines repo project root", files.componentRegistry.includes("REPO_PROJECT_ROOT")],
  ["component registry prefixes GitHub links with project root", files.componentRegistry.includes("`${REPO_PROJECT_ROOT}/${meta.codePath}`")],
  ["component registry includes AI prompts", files.componentRegistry.includes("aiPrompt")],
  ["component registry includes dependency hint", files.componentRegistry.includes("framer-motion, lucide-react, clsx, tailwind-merge")],
  [
    "component registry lists every source component path",
    [
      "src/components/ui/magnet-button.tsx",
      "src/components/ui/fluid-tabs.tsx",
      "src/components/ui/elastic-drag.tsx",
      "src/components/ui/noisy-analog-card.tsx",
    ].every((path) => files.componentRegistry.includes(path)),
  ],
  [
    "component registry generates download labels",
    files.componentRegistry.includes("downloadLabel") &&
      files.componentRegistry.includes("Open raw ${fileName} on GitHub"),
  ],
  ["noisy playground uses Jitter accent swatches", ["#15bc64", "#7a40ed", "#1377e4", "#ff8316"].every((color) => files.noisyPlayground.includes(color))],
  ["window leaf shadow component exists", files.windowLeafShadow.length > 0],
  ["window leaf shadow exports component", files.windowLeafShadow.includes("export function WindowLeafShadow")],
  ["window leaf shadow exports tone type", files.windowLeafShadow.includes("export type WindowLeafShadowTone")],
  ["window leaf shadow exposes grain prop", files.windowLeafShadow.includes("grain = 0.12")],
  ["window leaf shadow exposes blur prop", files.windowLeafShadow.includes("blur = 9")],
  ["window leaf shadow defaults to mist tone", files.windowLeafShadow.includes('tone = "mist"')],
  ["window leaf shadow exposes shade opacity prop", files.windowLeafShadow.includes("shadeOpacity = 0")],
  ["window leaf shadow exposes shadow opacity prop", files.windowLeafShadow.includes("shadowOpacity = 0.52")],
  ["window leaf shadow exposes interaction prop", files.windowLeafShadow.includes("interactive = true")],
  ["window leaf shadow exposes wind prop", files.windowLeafShadow.includes("wind = true")],
  ["window leaf shadow responds to pointer movement", files.windowLeafShadow.includes("onPointerMove") && files.windowLeafShadow.includes("--window-leaf-near-x")],
  ["window leaf shadow moves leaf clusters independently", files.windowLeafShadow.includes("motion=\"near\"") && files.windowLeafShadow.includes("motion=\"far\"")],
  ["window leaf shadow includes autonomous wind keyframes", files.windowLeafShadow.includes("@keyframes window-leaf-sway-a") && files.windowLeafShadow.includes("--window-cursor-wind")],
  ["window leaf shadow avoids standalone branch line", !files.windowLeafShadow.includes("M-40 500") && !files.windowLeafShadow.includes('strokeWidth="28"')],
  ["window leaf shadow draws SVG leaves", files.windowLeafShadow.includes("<ellipse") && files.windowLeafShadow.includes("<path")],
  ["window leaf shadow includes shade bands", files.windowLeafShadow.includes("--window-shade-opacity") && files.windowLeafShadow.includes("repeating-linear-gradient")],
  ["window leaf shadow uses SVG turbulence grain", files.windowLeafShadow.includes("feTurbulence")],
  ["window leaf shadow avoids external image URLs", !/url\([\"']?https?:\/\//.test(files.windowLeafShadow)],
  ["component registry includes window leaf shadow", files.componentRegistry.includes("windowLeafShadow")],
  ["component registry lists window leaf source path", files.componentRegistry.includes("src/components/ui/window-leaf-shadow.tsx")],
  ["page imports window leaf shadow", files.page.includes("WindowLeafShadow")],
  ["page preview removes window leaf overlay copy", !files.page.includes("svg leaves") && !files.page.includes("shade light")],
  ["site index lists window leaf shadow", files.siteIndex.includes("Window Leaf Shadow")],
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
