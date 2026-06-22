import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  softMenu: read("src/components/expanded-navigation/expanded-navigation.tsx"),
  filterDropdown: read("src/components/filter-dropdown-reveal/filter-dropdown-reveal.tsx"),
  filterDropdownIndex: read("src/components/filter-dropdown-reveal/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
};

const checks = [
  ["soft menu keeps original atelier brand", files.softMenu.includes("Atelier°")],
  ["soft menu keeps original menu rows", files.softMenu.includes("MENU_ROWS") && files.softMenu.includes("Work")],
  ["soft menu keeps original contact footer", files.softMenu.includes("hello@atomicmotion.dev")],
  ["soft menu keeps frosted panel height reveal", files.softMenu.includes("height: open ? 340 : 56")],
  ["soft menu does not contain MAD filter groups", !files.softMenu.includes("FILTER_GROUPS")],
  ["registry keeps Soft Menu Reveal inspired by Jitter", files.registry.includes('inspiredBy: { label: "Jitter"')],
  ["filter dropdown component exists", files.filterDropdown.length > 0],
  ["filter dropdown defines filter groups", files.filterDropdown.includes("FILTER_GROUPS")],
  ["filter dropdown includes typology options", files.filterDropdown.includes("Adaptive Reuse")],
  ["filter dropdown removes top category words", !["All", "Architecture", "Art"].some((word) => files.filterDropdown.includes(`"${word}"`))],
  ["filter dropdown uses two-column panel layout", files.filterDropdown.includes("grid-cols-2")],
  ["filter dropdown panel opens under active trigger", files.filterDropdown.includes("top-[calc(100%+12px)]")],
  ["filter dropdown uses MAD-style gray overlay", files.filterDropdown.includes("rgba(1,1,1,0.4)")],
  ["filter dropdown imports framer motion", files.filterDropdown.includes('from "framer-motion"')],
  ["filter dropdown uses motion panel", files.filterDropdown.includes("<motion.div")],
  ["filter dropdown uses bell curve easing", files.filterDropdown.includes("bellCurveEase") && files.filterDropdown.includes("[0.45, 0, 0.55, 1]")],
  ["filter dropdown reveal duration is smooth", files.filterDropdown.includes("duration: 0.48")],
  ["filter dropdown reveal uses translate and opacity only", !files.filterDropdown.includes("scaleY")],
  ["filter dropdown keeps panel mounted", !files.filterDropdown.includes("AnimatePresence")],
  ["filter dropdown avoids nested text stagger", !files.filterDropdown.includes("staggerChildren")],
  ["filter dropdown uses y panel reveal", files.filterDropdown.includes("y: isActive ? 0 : 20")],
  ["filter dropdown uses clipped option text reveal", files.filterDropdown.includes("<motion.span") && files.filterDropdown.includes('y: isActive ? 0 : "115%"')],
  ["filter dropdown staggers option text with short custom delay", files.filterDropdown.includes("optionIndex") && files.filterDropdown.includes("0.1 + optionIndex * 0.018")],
  ["filter dropdown avoids transition-all on panel", !files.filterDropdown.includes("transition-all duration-300")],
  ["filter dropdown index re-exports component", files.filterDropdownIndex.includes("FilterDropdownReveal")],
  ["component map exposes new filter dropdown route", files.map.includes('"filter-dropdown-reveal"')],
  ["registry registers new filter dropdown", files.registry.includes('id: "filter-dropdown-reveal"')],
  ["registry credits MAD on new component", files.registry.includes('inspiredBy: { label: "MAD"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("expanded navigation MAD checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`expanded navigation split checks passed (${checks.length}/${checks.length}).`);
