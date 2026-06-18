import fs from "node:fs";

const files = {
  actions: fs.readFileSync("src/components/website/component-actions.tsx", "utf8"),
  card: fs.readFileSync("src/components/website/component-card.tsx", "utf8"),
  map: fs.readFileSync("src/lib/component-map.tsx", "utf8"),
};

const checks = [
  ["card tracks hover state", files.card.includes("isHovered")],
  ["card handles keyboard focus", files.card.includes("onFocus") && files.card.includes("onBlur")],
  ["card renders category tag", files.card.includes("component.category")],
  ["card renders status tag", files.card.includes("component.status")],
  ["card uses gray glass pill styling", files.card.includes("bg-gray-500/40")],
  ["card uses white hover chrome text", files.card.includes("text-white")],
  ["card keeps blur effect", files.card.includes("backdrop-blur-sm")],
  ["card removes View UI hover label", !files.card.includes("View UI")],
  ["card removes View UI icon import", !files.card.includes("ArrowUpRight")],
  ["actions use clipboard copy icon", files.actions.includes("ClipboardCopy")],
  ["copy button moves to bottom overlay", files.card.includes("bottom-3")],
  ["placeholder cards skip hover chrome", files.card.includes("if (!Preview)")],
  ["preview accepts isHovered prop", files.map.includes("isHovered?: boolean")],
  ["preview intensifies wind on hover", files.map.includes("windIntensity={isHovered ?")],
  ["card hover shadow removed", !files.card.includes("group-hover:shadow")],
  ["focus hover shadow removed", !files.card.includes("group-focus-within:shadow")],
  ["hover chrome strokes removed", !files.card.includes("ring-black/10")],
  ["hover chrome shadows removed", !files.card.includes("shadow-sm")],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error(failures.map(([name]) => `rico hover missing: ${name}`).join("\n"));
  process.exit(1);
}

console.log("rico hover checks passed");
