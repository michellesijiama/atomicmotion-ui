import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  home: read("src/app/page.tsx"),
  filter: read("src/components/website/home-component-browser.tsx"),
  registry: read("src/lib/component-registry.ts"),
};

const checks = [
  ["home filter component exists", files.filter.length > 0],
  ["home imports filter browser", files.home.includes("HomeComponentBrowser")],
  ["filter sits below intro text", files.home.includes("<RotatingWord") && files.home.includes("<HomeComponentBrowser components={componentList} />") && files.home.includes("mt-10")],
  ["filter uses framer motion", files.filter.includes('from "framer-motion"') && files.filter.includes("AnimatePresence")],
  // The filter bar lost its enclosing pill: it is now a rule-topped strip whose
  // individual buttons carry the rounded border.
  ["filter bar is a rule-topped strip", files.filter.includes("border-t border-black/15")],
  ["filter buttons keep the rico-style rounded border", files.filter.includes("rounded-full border border-black/15")],
  // The active pill uses the ink token, not a hard-coded blue, so it tracks
  // the design system instead of a literal.
  ["filter has animated active pill", files.filter.includes('layoutId="home-active-filter"') && files.filter.includes("bg-[var(--jitter-ink)]")],
  ["filter buttons are pill shaped", files.filter.includes("h-10") && files.filter.includes("rounded-full")],
  ["filter drives card visibility by category", files.filter.includes("activeFilter === \"all\"") && files.filter.includes("component.category === activeFilter")],
  ["components declare creation dates", files.registry.includes("createdAt: \"2026-06-25\"") && files.registry.includes("createdAt: \"2026-06-22\"")],
  ["all filter sorts by newest creation date", files.filter.includes("function sortByCreatedDate") && files.filter.includes("b.createdAt.localeCompare(a.createdAt)") && files.filter.includes("const sortedComponents")],
  ["filtered cards animate layout", files.filter.includes("<AnimatePresence mode=\"popLayout\">") && files.filter.includes("<motion.div")],
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
