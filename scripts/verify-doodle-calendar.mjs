#!/usr/bin/env node
// Static checks for Doodle Calendar: a white phone holding one August in a
// single blue ink — past days are paper-cut motifs, the future is dots, and
// tapping a day swells its circle into a magazine-style illustrated page
// (a shared-layout morph). Fully self-contained, flat, with no shadows and no
// strokes anywhere, and the gallery wiring agrees on the id.
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
  assets: read("ASSETS.md"),
};

const registryEntry =
  files.registry.split(/(?=\n\s+id: ")/).find((block) => block.includes('id: "doodle-calendar"')) ?? "";

const c = files.component;
const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const checks = [
  ["component exists", c.length > 0],
  ["component exports DoodleCalendar", c.includes("export function DoodleCalendar")],
  ["component exports its props type", c.includes("export type DoodleCalendarProps")],
  ["component is a client component", c.startsWith('"use client"')],
  ["component does not import private modules", !/from\s+["']@\//.test(c)],
  ["component does not use lucide", !c.includes("lucide-react")],
  ["component inlines cn", c.includes("function cn(")],
  ["component uses framer-motion", c.includes('from "framer-motion"') && c.includes("AnimatePresence") && c.includes("whileTap")],
  ["component is deterministic on the server", !c.includes("Math.random")],
  ["self-contained: no perfect-freehand", !c.includes("perfect-freehand") && !c.includes("getStroke")],
  ["self-contained: no OpenMoji or emoji fetching", !c.includes("/emoji/") && !c.includes("openmoji") && !c.includes("fetch(")],
  ["no shadows: no box-shadow", !c.includes("boxShadow") && !c.includes("box-shadow")],
  ["no shadows: no drop-shadow", !c.includes("drop-shadow") && !c.includes("dropShadow")],
  ["no shadows: no text-shadow", !c.includes("textShadow") && !c.includes("text-shadow")],
  ["no shadows: no shadow utility classes", !c.includes("shadow-")],
  ["no strokes: no strokeWidth", !c.includes("strokeWidth") && !c.includes("stroke-width")],
  ["no strokes: no stroke attribute", !/\bstroke\s*=/.test(c) && !/\bstroke:/.test(c)],
  ["no gradients or filters", !c.includes("linearGradient") && !c.includes("radialGradient") && !c.includes("linear-gradient") && !c.includes("<filter")],
  ["no status bar text", !c.includes("9:41")],
  ["no weather left in the component", !/weather|sunny|rainbow|thunder|openmoji/i.test(c.replace(/Rain Indoors|A good chapter[^"]*/g, ""))],
  ["weekday labels are English", weekdayShort.every((d) => c.includes(`"${d}"`))],
  ["full weekday names are English", ["Monday", "Friday", "Sunday"].every((d) => c.includes(`"${d}"`))],
  ["month is August 2026", c.includes('"August"') && c.includes("YEAR = 2026") && c.includes("FIRST_COLUMN = 5")],
  ["today defaults to Friday the 14th", /today: todayProp = 14/.test(c)],
  ["fourteen scenes, each with a kind, title and sentence", (c.match(/kind: "(mood|activity|nature)", title:/g) ?? []).length === 14],
  ["all three kinds of day appear", ['kind: "mood"', 'kind: "activity"', 'kind: "nature"'].every((k) => c.includes(k))],
  ["month heading is Manrope 800 and the header never swaps", c.includes("MONTH_NAME}") && c.includes("fontWeight: 800") && !c.includes("SWAP")],
  ["palette is one blue in four strengths on paper", ['INK = "#2F2BD6"', 'MID = "#6B67E6"', 'LIGHT = "#A9A7F0"', 'PALE = "#D3D2F6"', 'PAPER = "#E4E4EA"'].every((k) => c.includes(`const ${k}`))],
  ["phone is white", c.includes('background: "#FFFFFF"')],
  ["phone scales to fit its host", c.includes("ResizeObserver") && c.includes("Math.min(1,") && c.includes("Math.max(0.3")],
  ["layout morph corrects for the phone's scale", c.includes("transformPagePoint")],
  ["circle morphs into the card with shared layout", c.includes("layoutId=") && c.includes("LayoutGroup")],
  ["card is a modal dialog labelled by its title", c.includes('role="dialog"') && c.includes('aria-modal="true"') && c.includes("aria-labelledby={titleId}")],
  ["title is set in Instrument Serif", c.includes("--font-instrument-serif") && c.includes("Instrument Serif")],
  ["fonts are Manrope, Instrument Serif and Geist Mono", c.includes("--font-manrope") && c.includes("--font-geist-mono")],
  ["card closes by button, Escape or tapping outside", c.includes('aria-label="Close"') && c.includes('"Escape"') && c.includes("onClick={close}")],
  ["focus goes to the close button and back to the day", c.includes("closeRef.current?.focus") && c.includes("returnFocusRef")],
  ["only past days and today are buttons", c.includes('type="button"') && c.includes('state === "future"') && c.includes("aria-hidden=\"true\" className=\"block rounded-full\"")],
  ["days sit in a grid", c.includes('role="grid"') && c.includes('role="row"') && c.includes('role="gridcell"') && c.includes('role="columnheader"')],
  ["weekday row and day rows share one column template", (c.match(/gridTemplateColumns: "repeat\(7, 1fr\)"/g) ?? []).length >= 2],
  ["arrow keys, Home and End move between open days", c.includes("ArrowLeft") && c.includes("ArrowRight") && c.includes("ArrowUp: -7") && c.includes("ArrowDown: 7") && c.includes('"Home"') && c.includes('"End"')],
  ["keyboard is clamped to the days that can be opened", c.includes("Math.min(today, Math.max(1,")],
  ["focus ring is an outline in ink", c.includes(":focus-visible") && c.includes("outline: 2px solid")],
  ["pieces of each scene are laid down with a stagger", c.includes("function Piece(") && c.includes("REVEAL_STEP") && c.includes("function Idle(")],
  ["loop stops at first interaction", c.includes("interacted") && c.includes("onPointerDownCapture") && c.includes("onKeyDownCapture")],
  ["loop opens today, then day 1, 2, 3", c.includes("[today, ...Array.from({ length: today - 1 }")],
  ["exposes onSelect", c.includes("onSelect?:")],
  ["motion respects reduced motion", c.includes('reducedMotion="user"') && c.includes("useReducedMotion")],
  ["index re-exports component and props", files.index.includes("DoodleCalendar") && files.index.includes("DoodleCalendarProps")],
  ["component map imports component", files.map.includes("@components/data-visualization/doodle-calendar")],
  ["component map exposes route", files.map.includes('"doodle-calendar"')],
  ["registry registers Doodle Calendar", registryEntry.includes('id: "doodle-calendar"')],
  ["registry names component", registryEntry.includes('title: "Doodle Calendar"')],
  ["registry files it under Data Visualization", registryEntry.includes('category: "Data Visualization"')],
  ["registry points to component source", registryEntry.includes("components/data-visualization/doodle-calendar/doodle-calendar.tsx")],
  ["registry lists no required assets", !registryEntry.includes("requiredAssets")],
  ["OpenMoji docs no longer mention the calendar", !files.emojiReadme.includes("doodle-calendar") && !files.assets.includes("Doodle Calendar")],
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
