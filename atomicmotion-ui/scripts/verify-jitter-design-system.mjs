import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readIfExists(path) {
  return existsSync(path) ? read(path) : "";
}

const removedComponentPaths = [
  "src/components/ui/magnet-button.tsx",
  "src/components/ui/fluid-tabs.tsx",
  "src/components/ui/elastic-drag.tsx",
  "src/components/ui/noisy-analog-card.tsx",
  "src/components/ui/window-leaf-shadow.tsx",
  "src/components/website/noisy-card-playground.tsx",
  "src/components/website/site-index.tsx",
];

const files = {
  packageJson: read("package.json"),
  globals: read("src/styles/globals.css"),
  layout: read("src/app/layout.tsx"),
  page: read("src/app/page.tsx"),
  detailPage: readIfExists("src/app/components/[id]/page.tsx"),
  detailLayout: readIfExists("src/app/components/[id]/layout.tsx"),
  componentPlate: read("src/components/website/component-plate.tsx"),
  componentActions: readIfExists("src/components/website/component-actions.tsx"),
  componentCard: readIfExists("src/components/website/component-card.tsx"),
  componentMap: readIfExists("src/lib/component-map.tsx"),
  componentRegistry: readIfExists("src/lib/component-registry.ts"),
  sunlitBookPage: readIfExists("src/components/ui/sunlit-book-page.tsx"),
};

const checks = [
  ["test script is wired", files.packageJson.includes("verify-jitter-design-system.mjs")],
  ["page background token is Jitter white", files.globals.includes("--jitter-bg: #ffffff")],
  ["ink token is Jitter ink", files.globals.includes("--jitter-ink: #0e1011")],
  ["green status token exists", files.globals.includes("--jitter-green: #15bc64")],
  ["purple status token exists", files.globals.includes("--jitter-purple: #7a40ed")],
  ["blue status token exists", files.globals.includes("--jitter-blue: #1377e4")],
  ["orange status token exists", files.globals.includes("--jitter-orange: #ff8316")],
  ["layout uses Jitter shell background", files.layout.includes("bg-[var(--jitter-bg)]")],
  ["home page is a gallery", files.page.includes("ComponentCard") && files.page.includes("componentList")],
  ["home page does not render live preview", !files.page.includes("SunlitBookPage") && !files.page.includes("ComponentPlate")],
  ["home page keeps minimal copy", files.page.includes("Copy-paste micro-interactions for React.") && !files.page.includes("ready for AI-assisted reuse")],
  ["home page removes footer repo copy", !files.page.includes("Public GitHub repo") && !files.page.includes("npx shadcn-style copy-paste architecture")],
  ["home page uses visual grid", files.page.includes("grid-cols-1") && files.page.includes("sm:grid-cols-2")],
  ["component card links to detail pages", files.componentCard.includes("next/link") && files.componentCard.includes("/components/${component.id}")],
  ["component card renders animated previews", files.componentCard.includes("componentMap") && files.componentCard.includes("pointer-events-none")],
  ["component card preview is prominent", files.componentCard.includes("aspect-[3/2]") && files.componentCard.includes("scale-[0.52]")],
  ["component card avoids long descriptions", !files.componentCard.includes("component.description")],
  ["component card renders title without index", files.componentCard.includes("component.title") && !files.componentCard.includes("component.index")],
  ["component card keeps subtle preview frame", files.componentCard.includes("ring-1 ring-black/5")],
  ["component card uses hover category and status tags", files.componentCard.includes("component.category") && files.componentCard.includes("component.status")],
  ["component actions owns copy buttons", files.componentActions.includes("View code") && files.componentActions.includes("Copy for AI")],
  ["component actions uses black CTA", files.componentActions.includes("bg-[var(--jitter-ink)]")],
  ["component map renders sunlit book page", files.componentMap.includes('"sunlit-book-page"') && files.componentMap.includes("SunlitBookPage")],
  ["detail route exists", files.detailPage.length > 0 && files.detailLayout.length > 0],
  ["detail route has static params", files.detailPage.includes("generateStaticParams")],
  ["detail route handles 404", files.detailPage.includes("notFound")],
  ["detail route renders actions and preview", files.detailPage.includes("ComponentActions") && files.detailPage.includes("ComponentPlate")],
  ["detail route avoids metadata footer", !files.detailPage.includes("{component.category}") && !files.detailPage.includes("{component.codePath}")],
  ["component plate only frames previews", !files.componentPlate.includes("View code") && !files.componentPlate.includes("Copy for AI")],
  ["component plate does not render raw file action", !files.componentPlate.includes("Raw file")],
  ["component registry exists", files.componentRegistry.length > 0],
  ["component registry exports list and lookup", files.componentRegistry.includes("componentList") && files.componentRegistry.includes("getComponentById")],
  ["component registry defines repo owner", files.componentRegistry.includes("REPO_OWNER")],
  ["component registry defines repo name", files.componentRegistry.includes("REPO_NAME")],
  ["component registry defines repo branch", files.componentRegistry.includes("REPO_BRANCH")],
  ["component registry defines repo project root", files.componentRegistry.includes("REPO_PROJECT_ROOT")],
  ["component registry prefixes GitHub links with project root", files.componentRegistry.includes("`${REPO_PROJECT_ROOT}/${meta.codePath}`")],
  ["component registry includes AI prompts", files.componentRegistry.includes("aiPrompt")],
  ["component registry includes dependency hint", files.componentRegistry.includes("framer-motion, lucide-react, clsx, tailwind-merge")],
  ["component registry keeps only sunlit book page", files.componentRegistry.includes("sunlitBookPage") && !files.componentRegistry.includes("magnetButton")],
  [
    "component registry lists only sunlit book source path",
    files.componentRegistry.includes("src/components/ui/sunlit-book-page.tsx") &&
      !removedComponentPaths.some((path) => files.componentRegistry.includes(path)),
  ],
  ["component registry does not expose raw file metadata", !files.componentRegistry.includes("downloadHref") && !files.componentRegistry.includes("downloadLabel")],
  ["removed component files are absent", removedComponentPaths.every((path) => !existsSync(path))],
  ["sunlit book page component exists", files.sunlitBookPage.length > 0],
  ["sunlit book page exports component", files.sunlitBookPage.includes("export function SunlitBookPage")],
  ["sunlit book page exposes scene props", ["windIntensity", "leafDensity", "interactive"].every((prop) => files.sunlitBookPage.includes(prop))],
  ["sunlit book page renders centered text", files.sunlitBookPage.includes("max-w-xl") && files.sunlitBookPage.includes("text-[var(--jitter-ink)]/70")],
  ["sunlit book page avoids yellow book chrome", !files.sunlitBookPage.includes("#f9e8bf") && !files.sunlitBookPage.includes("#faeac3")],
  ["sunlit book page uses transparent site background", files.sunlitBookPage.includes("bg-transparent")],
  ["sunlit book page avoids clipping branch shadows", files.sunlitBookPage.includes("overflow-visible") && files.sunlitBookPage.includes("-inset-[18%]")],
  ["sunlit book page includes serif reading content", files.sunlitBookPage.includes("font-serif") && files.sunlitBookPage.includes("PlaceholderText")],
  ["sunlit book page includes leaf shadow animation", files.sunlitBookPage.includes("@keyframes sunlit-book-sway-a") && files.sunlitBookPage.includes("LeafShadow")],
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
