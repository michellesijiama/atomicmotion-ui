#!/usr/bin/env node
// Static checks for Doodle Calendar: a white phone holding one August in a
// single blue ink — every day a button that swaps its circle for a pencil
// doodle of that day's weather, traced at runtime from OpenMoji line drawings
// with perfect-freehand — flat, with no shadows anywhere, and the gallery
// wiring agrees on the id.
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("components/data-visualization/doodle-calendar/doodle-calendar.tsx"),
  index: read("components/data-visualization/doodle-calendar/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
  packageJson: read("package.json"),
  emojiReadme: read("public/emoji/README.md"),
};

const registryEntry =
  files.registry.split(/(?=\n\s+id: ")/).find((block) => block.includes('id: "doodle-calendar"')) ?? "";

const c = files.component;

const checks = [
  ["component exists", c.length > 0],
  ["component exports DoodleCalendar", c.includes("export function DoodleCalendar")],
  ["component exports its props type", c.includes("export type DoodleCalendarProps")],
  ["component is a client component", c.startsWith('"use client"')],
  ["component does not import private modules", !/from\s+["']@\//.test(c)],
  ["component does not use lucide", !c.includes("lucide-react")],
  ["component uses framer-motion for UI motion", c.includes('from "framer-motion"') && c.includes("AnimatePresence") && c.includes("whileTap")],
  ["component sketches with perfect-freehand", c.includes('from "perfect-freehand"') && c.includes("getStroke(")],
  ["component is deterministic on the server", !c.includes("Math.random")],
  ["no shadows: no box-shadow", !c.includes("boxShadow") && !c.includes("box-shadow")],
  ["no shadows: no drop-shadow", !c.includes("drop-shadow") && !c.includes("dropShadow")],
  ["no shadows: no text-shadow", !c.includes("textShadow") && !c.includes("text-shadow")],
  ["no shadows: no shadow utility classes", !c.includes("shadow-")],
  ["weekday labels are English", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].every((d) => c.includes(`"${d}"`))],
  ["full weekday names are English", ["Monday", "Friday", "Sunday"].every((d) => c.includes(`"${d}"`))],
  ["month is August 2026", c.includes('"August"') && c.includes("YEAR = 2026") && c.includes("FIRST_COLUMN = 5")],
  ["31 days of deterministic weather", c.includes("DAYS_IN_MONTH = 31") && c.includes("const FORECAST")],
  ["footer counts days sketched", c.includes("sketched")],
  ["palette is one bluish ink on lilac-grey paper", c.includes('const INK = "#2F2BD6"') && c.includes('const PAPER = "#E4E4EA"')],
  ["phone is white", c.includes('background: "#FFFFFF"')],
  ["phone scales to fit its host", c.includes("ResizeObserver") && c.includes("Math.min(1,") && c.includes("Math.max(0.3")],
  ["doodles are traced from OpenMoji line drawings", c.includes("/emoji/") && c.includes("getPointAtLength") && c.includes('"#line"')],
  ["only bundled OpenMoji glyphs are used", ["2600", "2601", "26A1", "1F343", "1F308"].every((h) => c.includes(`"${h}"`))],
  ["every glyph is fetched and parsed once", c.includes("const traceCache")],
  ["DOM parsing is kicked off from an effect, never during render", c.includes("DOMParser") && /React\.useEffect\(\(\) => \{\s*let cancelled = false;\s*ALL_HEXES\.forEach\(\(hex\) => \{\s*loadTrace\(hex\)/.test(c)],
  ["failed fetch falls back to the plain circle", c.includes('"failed"')],
  ["every day is a button", c.includes('type="button"') && c.includes("aria-pressed")],
  ["day buttons are labelled", c.includes("aria-label={`${info.weekday}, ${MONTH_NAME} ${info.day} —")],
  ["days sit in a grid", c.includes('role="grid"') && c.includes('role="row"') && c.includes('role="gridcell"')],
  ["arrow keys move by a day and a week", c.includes("ArrowLeft") && c.includes("ArrowRight") && c.includes("ArrowUp: -7") && c.includes("ArrowDown: 7")],
  ["focus ring is an outline in ink", c.includes(":focus-visible") && c.includes("outline: 2px solid")],
  ["loop stops at first interaction", c.includes("interacted") && c.includes("onPointerDownCapture") && c.includes("onKeyDownCapture")],
  ["loop wraps round the month", c.includes("% DAYS_IN_MONTH")],
  ["exposes onSelect", c.includes("onSelect?:")],
  ["motion respects reduced motion", c.includes('reducedMotion="user"') && c.includes("useReducedMotion")],
  ["fonts are Manrope and Geist Mono", c.includes("--font-manrope") && c.includes("--font-geist-mono")],
  ["index re-exports component and props", files.index.includes("DoodleCalendar") && files.index.includes("DoodleCalendarProps")],
  ["component map imports component", files.map.includes("@components/data-visualization/doodle-calendar")],
  ["component map exposes route", files.map.includes('"doodle-calendar"')],
  ["registry registers Doodle Calendar", registryEntry.includes('id: "doodle-calendar"')],
  ["registry names component", registryEntry.includes('title: "Doodle Calendar"')],
  ["registry files it under Data Visualization", registryEntry.includes('category: "Data Visualization"')],
  ["registry points to component source", registryEntry.includes("components/data-visualization/doodle-calendar/doodle-calendar.tsx")],
  ["registry lists the OpenMoji SVGs as required, CC BY-SA 4.0", registryEntry.includes("public/emoji/*.svg") && registryEntry.includes("CC BY-SA 4.0")],
  ["registry credits OpenMoji", registryEntry.includes("OpenMoji (openmoji.org)")],
  ["emoji assets README credits the component", files.emojiReadme.includes("doodle-calendar")],
  ["package exposes verification script", files.packageJson.includes('"test:doodle-calendar"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("doodle calendar checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`doodle calendar checks passed (${checks.length}/${checks.length}).`);
