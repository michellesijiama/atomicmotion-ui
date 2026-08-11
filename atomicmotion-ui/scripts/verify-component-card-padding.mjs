import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const componentCard = read("src/components/website/component-card.tsx");
// The safe area moved out of the card and into PreviewStage, which owns the
// inset and the measure-and-scale logic for every live preview.
const previewStage = read("src/components/website/preview-stage.tsx");

const checks = [
  ["component card exists", componentCard.length > 0],
  // The card gray is a design-system token (`bg-card` -> --color-card), not the
  // hard-coded #f2f2f4 it started as.
  ["card preview shell remains clipped and rounded", componentCard.includes("relative aspect-[4/5] overflow-hidden rounded-[15px] bg-card")],
  ["homepage previews use a 16px safe area", previewStage.includes('className="absolute inset-4 overflow-hidden rounded-[12px]"')],
  ["interactive preview renders inside safe area", componentCard.includes("<PreviewStage>") && componentCard.includes("<Preview loop />")],
  // Heavy WebGL components opt out of a live preview and show a poster instead.
  ["static poster fills the preview shell", componentCard.includes("component.previewVideo") && componentCard.includes("component.previewImage") && componentCard.includes("size-full object-cover")],
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
