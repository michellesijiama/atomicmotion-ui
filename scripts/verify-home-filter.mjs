import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  home: read("src/app/page.tsx"),
  sitePage: read("src/components/website/site-page.tsx"),
  gallery: read("src/components/website/home-component-browser.tsx"),
  registry: read("src/lib/component-registry.ts"),
};
const pageIndex = files.home.indexOf("<SitePage>");
const introIndex = files.sitePage.indexOf("<GalleryIntro />");
const componentBrowserIndex = files.home.indexOf(
  "<HomeComponentBrowser components={homeComponents} />"
);

const checks = [
  ["gallery follows the homepage intro", pageIndex >= 0 && componentBrowserIndex > pageIndex && introIndex >= 0 && files.sitePage.indexOf("{children}") > introIndex],
  ["homepage renders the complete gallery", files.gallery.includes("sortedComponents.map") && !files.gallery.includes("activeFilter")],
  ["components declare creation dates", files.registry.includes("createdAt: \"2026-06-25\"") && files.registry.includes("createdAt: \"2026-06-22\"")],
  ["gallery sorts by newest creation date", files.gallery.includes("b.createdAt.localeCompare(a.createdAt)") && files.gallery.includes("b.index.localeCompare(a.index)")],
  ["gallery cards use a stable grid", files.gallery.includes('<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("home gallery checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`home gallery checks passed (${checks.length}/${checks.length}).`);
