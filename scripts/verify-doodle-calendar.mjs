#!/usr/bin/env node
// Static checks for Doodle Calendar: a grey Apple-style UI holding one August in blue
// ballpoint — past days are tiny pen-drawn landscape motifs on <canvas>, the future
// is dots, and tapping a day swells its circle into a nature sketch that draws
// itself (a shared-layout morph, then contours, then hatching). Every scene is
// landscape, drawn in a refined ballpoint technique with depth planes. Fully
// self-contained, seeded (no Math.random), with no shadows, and the gallery wiring
// agrees on the id.
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
const num = (name) => Number((c.match(new RegExp(`const ${name} = (\\d+)`)) ?? [])[1]);
const sceneRows = [...c.matchAll(/kind: "(\w+)", title: "([^"]+)", sentence: "([^"]+)"/g)].map((m) => ({ kind: m[1], title: m[2], sentence: m[3] }));
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
  ["component is deterministic: no Math.random", !c.includes("Math.random")],
  ["component uses a seeded PRNG (mulberry32)", c.includes("function mulberry32(") && c.includes("0x6d2b79f5")],
  ["pictures are drawn on a canvas", c.includes("<canvas") && c.includes('getContext("2d")')],
  ["scenes are Path2D layers with tone, knockout and marks", c.includes("new Path2D(") && c.includes("knockout?: boolean") && c.includes("tone: number") && c.includes("marks?:")],
  ["every layer can carry a depth (aerial perspective): 0 near … 1 far", c.includes("depth?: number") && c.includes("function depthMod(") && c.includes("dm.sp") && c.includes("dm.w") && c.includes("dm.a")],
  ["hatching is fine vertical pen lines in bursts, with cross-passes in the darks", c.includes("function hatchLayer(") && c.includes("passes.push") && c.includes("band = {")],
  ["contours are tapered variable-width ribbons, cut at corners", c.includes("function contourSub(") && c.includes("function fillOp(") && c.includes("pressure(")],
  ["foliage is built from scalloped clumps: canopy(), clumps() and canopyLayers() exist", c.includes("function canopy(") && c.includes("function clumps(") && c.includes("function canopyLayers(") && c.includes("function scallop(")],
  ["the sketch toolkit has trunks, hills, water, reflections, pines and a house in perspective", ["function trunkLayers(", "function ridge(", "function lakeLayer(", "function reflect(", "function pineLayers(", "function house("].every((f) => c.includes(f))],
  ["scenes have no people, faces, cats or props", !/function (person|catSitting|bee|butterfly|lemon|cup)\(/.test(c) && !/Birthday|Coffee|Cake|bunting|Supper|Lido|Market|Victory|Overthinking/i.test(c)],
  ["opened illustration is rendered complete without a drawing animation", c.includes("ctx.drawImage(sceneBitmap(index, cv.width, cv.height), 0, 0)") && !c.slice(c.indexOf("function ArtCanvas"), c.indexOf("function CellPen")).includes("requestAnimationFrame")],
  ["finished drawings are cached per scene", c.includes("const bitmaps = new Map") && c.includes("function sceneBitmap(")],
  ["canvas work stays out of render: drawn in effects", c.includes("React.useEffect") && !/document\.createElement\("canvas"\)/.test(c.slice(c.indexOf("export function DoodleCalendar"), c.indexOf("const DayCell")))],
  ["ink is ballpoint blue and the old violet is gone", c.includes('const INK = "#0A5BD9"') && !/2F2BD6/i.test(c) && !c.includes("6B67E6") && !c.includes("A9A7F0")],
  ["paper is a neutral grey, the card a lighter grey", c.includes('const PAPER = "#E6E7EA"') && c.includes('const CARD = "#F2F3F5"')],
  ["no kind tag on the card", !c.includes("OUTING") && !c.includes("KIND_LABEL") && !/Outing"/.test(c)],
  ["phone is tall like an iPhone (ratio ≥ 2.0)", num("PHONE_H") / num("PHONE_W") >= 2.0 && num("PHONE_W") === 300],
  ["grey UI has no outer white bezel", num("BEZEL") === 0 && c.includes("const SCREEN_RADIUS = 51")],
  ["self-contained: no perfect-freehand", !c.includes("perfect-freehand") && !c.includes("getStroke")],
  ["self-contained: no OpenMoji or emoji fetching", !c.includes("/emoji/") && !c.includes("openmoji") && !c.includes("fetch(")],
  ["no shadows: no box-shadow", !c.includes("boxShadow") && !c.includes("box-shadow")],
  ["no shadows: no drop-shadow", !c.includes("drop-shadow") && !c.includes("dropShadow")],
  ["no shadows: no text-shadow", !c.includes("textShadow") && !c.includes("text-shadow")],
  ["no shadows: no shadow utility classes", !c.includes("shadow-")],
  ["no gradients or filters", !c.includes("linearGradient") && !c.includes("radialGradient") && !c.includes("linear-gradient") && !c.includes("<filter")],
  ["no status bar text", !c.includes("9:41")],
  ["no weather icons left in the component", !/weather|sunny|rainbow|thunder|openmoji/i.test(c)],
  ["weekday labels are English", weekdayShort.every((d) => c.includes(`"${d}"`))],
  ["full weekday names are English", ["Monday", "Friday", "Sunday"].every((d) => c.includes(`"${d}"`))],
  ["month is August 2026", c.includes('"August"') && c.includes("YEAR = 2026") && c.includes("FIRST_COLUMN = 5")],
  ["today defaults to Friday the 14th", /today: todayProp = 14/.test(c)],
  ["fourteen scenes, each with a kind, title and sentence", sceneRows.length === 14],
  ["titles are at most four words, sentences at most fourteen", sceneRows.length === 14 && sceneRows.every((r) => r.title.split(/\s+/).length <= 4 && r.sentence.split(/\s+/).length <= 14)],
  ["the days cover several kinds of place", new Set(sceneRows.map((r) => r.kind)).size >= 5 && !c.includes('kind: "mood"') && !c.includes('kind: "activity"')],
  ["the titles are the nature diary", ["Morning Fog", "The Old Oak", "Cottage and Poplars", "Lavender Rows", "Still Lake", "Pine Ridge", "Sunflowers", "River Bend", "Birch Path", "Storm Coming In", "The Garden Gate", "Cliffs and Sea", "Orchard After Rain", "Moonrise"].every((t, i) => sceneRows[i]?.title === t)],
  ["month heading is Manrope 800 and swaps the year for the selected date", c.includes("MONTH_NAME}") && c.includes("fontWeight: 800") && c.includes("{openDay ?? YEAR}")],
  ["outer white shell and hairline are removed", !c.includes('background: "#FFFFFF"') && !c.includes('border: "1px solid rgba(10, 60, 140, 0.10)"')],
  ["phone scales to fit its host", c.includes("ResizeObserver") && c.includes("Math.min(1,") && c.includes("Math.max(0.3")],
  ["layout morph corrects for the phone's scale", c.includes("transformPagePoint")],
  ["circle morphs into the card with shared layout", c.includes("layoutId=") && c.includes("LayoutGroup")],
  ["card is a modal dialog labelled by its title", c.includes('role="dialog"') && c.includes('aria-modal="true"') && c.includes("aria-labelledby={titleId}")],
  ["all visible type uses Manrope", c.includes("--font-manrope") && !c.includes("FONT_MONO") && !c.includes("FONT_SERIF")],
  ["card closes by Escape or tapping outside, with no close button", !c.includes('aria-label="Close"') && c.includes('"Escape"') && c.includes("onClick={close}")],
  ["duplicate date row is removed from the card", !c.includes("info.weekday.slice(0, 3).toUpperCase()")],
  ["focus goes to the dialog and back to the day", c.includes("dialogRef.current?.focus") && c.includes("returnFocusRef")],
  ["only past days and today are buttons", c.includes('type="button"') && c.includes('state === "future"') && c.includes("aria-hidden=\"true\" className=\"block rounded-full\"")],
  ["days sit in a grid", c.includes('role="grid"') && c.includes('role="row"') && c.includes('role="gridcell"') && c.includes('role="columnheader"')],
  ["weekday row and day rows share one column template", (c.match(/gridTemplateColumns: "repeat\(7, 1fr\)"/g) ?? []).length >= 2],
  ["arrow keys, Home and End move between open days", c.includes("ArrowLeft") && c.includes("ArrowRight") && c.includes("ArrowUp: -7") && c.includes("ArrowDown: 7") && c.includes('"Home"') && c.includes('"End"')],
  ["keyboard is clamped to the days that can be opened", c.includes("Math.min(today, Math.max(1,")],
  ["focus ring is an outline in ink", c.includes(":focus-visible") && c.includes("outline: 2px solid")],
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
  ["registry description says nature and ballpoint", /nature/i.test(registryEntry) && /ballpoint/i.test(registryEntry) && !/birthday|coffee|mood, an outing/i.test(registryEntry)],
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
