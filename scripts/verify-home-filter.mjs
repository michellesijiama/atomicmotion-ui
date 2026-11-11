import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  home: read("src/app/page.tsx"),
  sitePage: read("src/components/website/site-page.tsx"),
  filter: read("src/components/website/home-component-browser.tsx"),
  registry: read("src/lib/component-registry.ts"),
};
const pageIndex = files.home.indexOf("<SitePage>");
const introIndex = files.sitePage.indexOf("<GalleryIntro />");
const componentBrowserIndex = files.home.indexOf(
  "<HomeComponentBrowser components={homeComponents} />"
);

const checks = [
  ["home filter component exists", files.filter.length > 0],
  ["home imports filter browser", files.home.includes("HomeComponentBrowser")],
  ["filter follows the homepage intro", pageIndex >= 0 && componentBrowserIndex > pageIndex && introIndex >= 0 && files.sitePage.indexOf("{children}") > introIndex],
  ["filter uses framer motion", files.filter.includes('from "framer-motion"') && files.filter.includes("<motion.span")],
  ["filter bar is transparent and centers its buttons", files.filter.includes('className="mx-auto mb-10 max-w-none bg-transparent p-2"') && files.filter.includes("flex flex-wrap justify-center")],
  ["filter buttons keep the rico-style rounded border", files.filter.includes("rounded-full border border-black/15")],
  // The active pill uses the ink token, not a hard-coded blue, so it tracks
  // the design system instead of a literal.
  ["filter has animated active pill", files.filter.includes('"home-active-filter"') && files.filter.includes("bg-[var(--jitter-ink)]")],
  ["filter buttons are pill shaped with a 44px target", files.filter.includes("h-11") && files.filter.includes("rounded-full")],
  ["filter drives card visibility by category", files.filter.includes("activeFilter === \"all\"") && files.filter.includes("component.category === activeFilter")],
  ["components declare creation dates", files.registry.includes("createdAt: \"2026-06-25\"") && files.registry.includes("createdAt: \"2026-06-22\"")],
  ["all filter sorts by newest creation date", files.filter.includes("function sortByCreatedDate") && files.filter.includes("b.createdAt.localeCompare(a.createdAt)") && files.filter.includes("const sortedComponents")],
  ["filtered cards use a stable grid", files.filter.includes('<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">') && !files.filter.includes("AnimatePresence") && !files.filter.includes("<motion.div layout")],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("home filter checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`home filter checks passed (${checks.length}/${checks.length}).`);
