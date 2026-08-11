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
  "src/components/sunlit-book-page/sunlit-book-page.tsx",
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
  siteHeader: readIfExists("src/components/website/site-header.tsx"),
  componentCard: readIfExists("src/components/website/component-card.tsx"),
  componentMap: readIfExists("src/lib/component-map.tsx"),
  componentRegistry: readIfExists("src/lib/component-registry.ts"),
  // The gallery grid moved out of page.tsx into its own client component when
  // the category filter landed, and the shared button classes moved into
  // styles.ts, so the home/CTA checks below read those files instead.
  homeBrowser: readIfExists("src/components/website/home-component-browser.tsx"),
  websiteStyles: readIfExists("src/components/website/styles.ts"),
  previewStage: readIfExists("src/components/website/preview-stage.tsx"),
};

// Every registry id must have a preview in the component map, otherwise the
// gallery card silently falls back to a static poster.
const registryIds = [...files.componentRegistry.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);

const checks = [
  ["test script is wired", files.packageJson.includes("verify-jitter-design-system.mjs")],
  ["page background token is Jitter white", files.globals.includes("--jitter-bg: #ffffff")],
  ["ink token is Jitter ink", files.globals.includes("--jitter-ink: #0e1011")],
  ["green status token exists", files.globals.includes("--jitter-green: #15bc64")],
  ["purple status token exists", files.globals.includes("--jitter-purple: #7a40ed")],
  ["blue status token exists", files.globals.includes("--jitter-blue: #1377e4")],
  ["orange status token exists", files.globals.includes("--jitter-orange: #ff8316")],
  ["layout uses Jitter shell background", files.layout.includes("bg-[var(--jitter-bg)]")],
  ["home page is a gallery", files.homeBrowser.includes("ComponentCard") && files.page.includes("componentList")],
  ["home page does not render live preview", !files.page.includes("ComponentPlate")],
  ["home page keeps minimal copy", files.page.includes("Open-sourced interaction inspirations designed for") && !files.page.includes("ready for AI-assisted reuse")],
  ["home page removes footer repo copy", !files.page.includes("Public GitHub repo") && !files.page.includes("npx shadcn-style copy-paste architecture")],
  ["home page uses visual grid", files.homeBrowser.includes("grid-cols-1") && files.homeBrowser.includes("sm:grid-cols-2")],
  ["component card links to detail pages", files.componentCard.includes("next/link") && files.componentCard.includes("/components/${component.id}")],
  ["component card renders animated previews", files.componentCard.includes("componentMap") && files.componentCard.includes("pointer-events-none")],
  // Scaling used to be a hard-coded `scale-[0.52]` on the card; PreviewStage now
  // measures the card and scales the fixed design canvas to fit.
  ["component card preview is prominent", files.componentCard.includes("aspect-[4/5]") && files.previewStage.includes("DESIGN_WIDTH")],
  ["component card avoids long descriptions", !files.componentCard.includes("component.description")],
  ["component card renders title without index", files.componentCard.includes("component.title") && !files.componentCard.includes("component.index")],
  ["component card uses hover category and status tags", files.componentCard.includes("component.category") && files.componentCard.includes("component.status")],
  ["component actions owns copy buttons", files.componentActions.includes("Copy link") && files.componentActions.includes("Copy for AI")],
  ["component actions uses black CTA", files.componentActions.includes("actionPrimaryClass") && files.websiteStyles.includes("bg-[var(--jitter-ink)]")],
  ["component map covers every registry id", registryIds.length > 0 && registryIds.every((id) => files.componentMap.includes(`"${id}"`))],
  ["detail route exists", files.detailPage.length > 0 && files.detailLayout.length > 0],
  ["detail route has static params", files.detailPage.includes("generateStaticParams")],
  ["detail route handles 404", files.detailPage.includes("notFound")],
  ["detail route renders actions and preview", files.detailPage.includes("SiteHeader") && files.siteHeader.includes("ComponentActions") && files.detailPage.includes("Preview")],
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
  ["component registry does not list removed component paths", !removedComponentPaths.some((path) => files.componentRegistry.includes(path))],
  ["component registry does not expose raw file metadata", !files.componentRegistry.includes("downloadHref") && !files.componentRegistry.includes("downloadLabel")],
  ["removed component files are absent", removedComponentPaths.every((path) => !existsSync(path))],
  ["every registry component folder exists", registryIds.length > 0 && registryIds.every((id) => existsSync(`src/components/${id}`))],
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
