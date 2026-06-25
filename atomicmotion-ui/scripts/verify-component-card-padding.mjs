import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const componentCard = read("src/components/website/component-card.tsx");

const checks = [
  ["component card exists", componentCard.length > 0],
  ["card preview shell remains clipped and rounded", componentCard.includes("relative aspect-[4/5] overflow-hidden rounded-[15px] bg-[#f2f2f4]")],
  ["homepage previews use a 16px safe area", componentCard.includes('const previewSafeAreaClassName = "absolute inset-4 overflow-hidden rounded-[12px]"')],
  ["interactive preview renders inside safe area", componentCard.includes("<div className={previewSafeAreaClassName}>\n          <div className=\"absolute left-1/2 top-1/2")],
  ["coming soon placeholder renders inside safe area", componentCard.includes("<div className={previewSafeAreaClassName}>\n            <div className=\"flex size-full")],
  ["hover badges also respect 16px inset", componentCard.includes("absolute left-4 top-4 z-20")],
  ["old 15px badge inset removed", !componentCard.includes("left-[15px]") && !componentCard.includes("top-[15px]")],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("component card padding checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`component card padding checks passed (${checks.length}/${checks.length}).`);
