#!/usr/bin/env node
// Static checks for Doodle Calendar: a quiet grey-white August journal with vivid
// pencil scenes, a selectable week strip and full-page swipe navigation. Every
// scene is seeded (no Math.random), drawn with depth planes and no shadows, and
// the gallery wiring agrees on the id.
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
const num = (name) => Number((c.match(new RegExp(`const ${name} = (\\d+)`)) ?? [])[1]);
const sceneRows = [...c.matchAll(/kind: "(\w+)", title: "([^"]+)", sentence: "([^"]+)"/g)].map((m) => ({ kind: m[1], title: m[2], sentence: m[3] }));
const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const checks = [
  ["component exists", c.length > 0],
  ["component exports DoodleCalendar", c.includes("export function DoodleCalendar")],
  ["component exports its props type", c.includes("export type DoodleCalendarProps")],
  ["component is a client component", c.startsWith('"use client"')],
  ["component does not import private modules", !/from\s+["']@\//.test(c)],
  ["navigation icons come from the existing Lucide dependency rather than inline SVG", c.includes("lucide-react") && !c.includes("<svg")],
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
  ["scenes avoid people, faces and character art", !/function (person|catSitting|bee|butterfly)\(/.test(c) && !/Birthday|bunting|Victory|Overthinking/i.test(c)],
  ["opened illustration is rendered complete without a drawing animation", c.includes("ctx.drawImage(sceneBitmap(index, cv.width, cv.height), 0, 0)") && !c.slice(c.indexOf("function ArtCanvas"), c.indexOf("function CellPen")).includes("requestAnimationFrame")],
  ["finished drawings are cached per scene", c.includes("const bitmaps = new Map") && c.includes("function sceneBitmap(")],
  ["canvas work stays out of render: drawn in effects", c.includes("React.useEffect") && !/document\.createElement\("canvas"\)/.test(c.slice(c.indexOf("export function DoodleCalendar"), c.indexOf("const DayCell")))],
  ["drawings use the supplied vivid illustration palette one colour per layer", c.includes("const WATERCOLOR = {") && c.includes("#99ACE7") && c.includes("#82C277") && c.includes("#F3C947") && c.includes("#ED9ABB") && c.includes("#562621") && c.includes("WATERCOLOR[layer.hue ?? \"blue\"]")],
  ["default type uses a high-contrast tea red rather than black", c.includes('const TEXT = "#743B45"') && c.includes('const TEXT_RGB = "116 59 69"')],
  ["weekday labels are at least 16px", Number((c.match(/const WEEKDAY_SIZE = (\d+)/) ?? [])[1]) >= 16],
  ["days to come are full-size empty rings using the active theme", c.includes('className="block size-full rounded-full"') && c.includes('border: `1.25px solid ${activeText}`') && !c.includes("const DOT_HUES")],
  ["completed days are standalone illustrations without circular containers", c.includes("return MOTIF_BUILDERS[i](false)") && !c.includes("const CELL_RING")],
  ["no home indicator on the glass", !/home indicator/i.test(c)],
  ["fourteen opened days have stable Matisse-inspired paper, ink and accent themes", c.includes("const DAY_THEMES: readonly DayTheme[]") && (c.match(/paper: "#[0-9A-F]{6}", ink: "#[0-9A-F]{6}", inkRgb: "[0-9 ]+", accent: "#[0-9A-F]{6}"/g) ?? []).length === 14],
  ["closed calendar stays blush while every opened day resolves its own theme", c.includes('const PAPER = "#EBCFCB"') && c.includes("DAY_THEMES[openDay - 1]") && c.includes("activeTheme?.paper ?? PAPER") && !c.includes("backgroundImage")],
  ["Garden Gate uses a vivid garden-green, deep-brown and sunflower-yellow theme", c.includes('{ paper: "#75C899", ink: "#562621"') && c.includes('accent: "#FFCB45"')],
  ["detail and thumbnail canvases preserve dense vivid multi-colour layers", c.includes('function ArtCanvas({ index }') && !c.slice(c.indexOf("function ArtCanvas"), c.indexOf("type EntryScene")).includes('globalCompositeOperation = "source-in"') && c.includes('filter: "saturate(1.55) contrast(1.22)"') && c.includes("spLight: 3.35")],
  ["text-driven placeholder art uses the selected day’s cut-paper accent", c.includes('function EntryPromptCanvas({ prompt, ink, accent }') && c.includes("activeTheme?.accent") && c.includes("accentEllipse")],
  ["opened date lives inside one connected previous-date-next capsule", c.includes('height: 34, overflow: "hidden", borderRadius: 999') && c.includes('min-w-[94px]') && c.includes('`${MONTH_NAME} ${openDay}`') && c.includes('openDay === today ? "Today"')],
  ["large month heading is hidden while a detail is open", c.includes('aria-hidden={openDay !== null}') && c.includes('opacity: openDay === null ? 1 : 0') && c.includes("{YEAR}")],
  ["date, title and entry share the same left inset", c.includes("const PAD = 22") && c.includes('padding: "10px 12px 16px"') && num("CARD_X") + 12 === num("PAD")],
  ["detail includes a writable daily-entry input", c.includes('aria-label="Write about this day"') && c.includes("setEntries") && c.includes("coffee, a city walk")],
  ["entry keywords drive local coffee, city, food and note illustration placeholders", c.includes('type EntryScene = "coffee" | "city" | "food" | "note"') && c.includes("function entryScene(") && c.includes("function EntryPromptCanvas(") && c.includes("Coffee Moment") && c.includes("City Notes") && c.includes("Today’s Table")],
  ["entry input does not trigger swipe or calendar keyboard navigation", c.includes('onPointerDown={(event) => event.stopPropagation()}') && c.includes('onKeyDown={(event) => event.stopPropagation()}') && c.includes("target instanceof HTMLTextAreaElement")],
  ["detail view has a centred previous, Today, next navigation group", c.includes('import { ChevronLeft, ChevronRight } from "lucide-react"') && c.includes('aria-label="Previous completed date"') && c.includes('aria-label="Next completed date"') && c.includes("goToToday") && c.includes("Today selected")],
  ["detail view supports horizontal swipe navigation", c.includes('drag="x"') && c.includes("onDragEnd") && c.includes("navigateOpenDay") && c.includes("gesture.offset.x")],
  ["detail transitions use directional spring motion without delaying the image", c.includes("direction * 34") && c.includes('type: "spring"') && !c.includes("delay: 0.26")],
  ["no kind tag on the card", !c.includes("OUTING") && !c.includes("KIND_LABEL") && !/Outing"/.test(c)],
  ["phone is tall like an iPhone (ratio ≥ 2.0)", num("PHONE_H") / num("PHONE_W") >= 2.0 && num("PHONE_W") === 300],
  ["watercolour UI has no outer white bezel", num("BEZEL") === 0 && c.includes("const SCREEN_RADIUS = 51")],
  ["self-contained: no perfect-freehand", !c.includes("perfect-freehand") && !c.includes("getStroke")],
  ["self-contained: no OpenMoji or emoji fetching", !c.includes("/emoji/") && !c.includes("openmoji") && !c.includes("fetch(")],
  ["no shadows: no box-shadow", !c.includes("boxShadow") && !c.includes("box-shadow")],
  ["no shadows: no drop-shadow", !c.includes("drop-shadow") && !c.includes("dropShadow")],
  ["no shadows: no text-shadow", !c.includes("textShadow") && !c.includes("text-shadow")],
  ["no shadows: no shadow utility classes", !c.includes("shadow-")],
  ["no generated gradients or SVG filters", !c.includes("linearGradient") && !c.includes("radialGradient") && !c.includes("linear-gradient") && !c.includes("<filter")],
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
  ["closed month heading stays light Manrope with the year below", c.includes("MONTH_NAME}") && c.includes("fontWeight: 300") && c.includes("{YEAR}")],
  ["outer white shell and hairline are removed", !c.includes('background: "#FFFFFF"') && !c.includes('border: "1px solid rgba(10, 60, 140, 0.10)"')],
  ["phone scales to fit its host", c.includes("ResizeObserver") && c.includes("Math.min(1,") && c.includes("Math.max(0.3")],
  ["layout morph corrects for the phone's scale", c.includes("transformPagePoint")],
  ["detail view avoids a filled card or shared-layout expansion", !c.includes('layoutId="dc-card"') && c.includes("LayoutGroup")],
  ["card is a modal dialog labelled by its title", c.includes('role="dialog"') && c.includes('aria-modal="true"') && c.includes("aria-labelledby={titleId}")],
  ["all visible type uses Manrope", c.includes("--font-manrope") && !c.includes("FONT_MONO") && !c.includes("FONT_SERIF")],
  ["card closes by Escape or tapping outside, with no close button", !c.includes('aria-label="Close"') && c.includes('"Escape"') && c.includes("onClick={close}")],
  ["duplicate date row is removed from the card", !c.includes("info.weekday.slice(0, 3).toUpperCase()")],
  ["focus goes to the dialog and back to the day", c.includes("dialogRef.current?.focus") && c.includes("returnFocusRef")],
  ["only past days and today are buttons", c.includes('type="button"') && c.includes('state === "future"') && c.includes('aria-hidden="true"') && c.includes('className="block size-full rounded-full"')],
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
  ["registry keeps Doodle Calendar self-contained", !registryEntry.includes("requiredAssets") && !registryEntry.includes("doodle-calendar-garden-gate-bg-v2.png")],
  ["registry description records the Matisse-inspired palette and text-driven drawings", /Matisse-inspired colour families/i.test(registryEntry) && /text-driven/i.test(registryEntry) && /coffee, city or food/i.test(registryEntry)],
  ["OpenMoji docs no longer mention the calendar", !files.emojiReadme.includes("doodle-calendar")],
  ["package exposes verification script", files.packageJson.includes('"test:doodle-calendar"')],
  ["current typography uses Poppins", c.includes("--font-poppins") && !c.includes("FONT_MONO") && !c.includes("FONT_SERIF")],
  ["current pagination travels a full card and follows the finger", c.includes("PAGE_TRAVEL = SCREEN_W + 14") && c.includes("direction * PAGE_TRAVEL") && c.includes('mode="popLayout"') && c.includes("dragMomentum={false}")],
  ["current paper is one quiet grey-white across all fourteen days", c.includes('const PAPER = "#F1F0EB"') && (c.match(/paper: PAPER, ink:/g) ?? []).length === 14],
  ["current detail header returns to the month grid", c.includes("CalendarDays") && c.includes('aria-label={`Back to ${MONTH_NAME} ${YEAR} month view`}') && c.includes('onClick={close}') && c.includes("{MONTH_NAME} {YEAR}")],
  ["current detail header includes a selectable seven-day strip", c.includes('aria-label="Choose a completed date"') && c.includes("detailWeek.map") && c.includes('aria-current={selected ? "date" : undefined}') && c.includes("goToOpenDay(day)")],
];

const supersededChecks = new Set([
  "fourteen opened days have stable Matisse-inspired paper, ink and accent themes",
  "closed calendar stays blush while every opened day resolves its own theme",
  "Garden Gate uses a vivid garden-green, deep-brown and sunflower-yellow theme",
  "detail transitions use directional spring motion without delaying the image",
  "closed month heading stays light Manrope with the year below",
  "all visible type uses Manrope",
  "opened date lives inside one connected previous-date-next capsule",
  "detail view has a centred previous, Today, next navigation group",
]);
const activeChecks = checks.filter(([label]) => !supersededChecks.has(label));
const failures = activeChecks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("doodle calendar checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`doodle calendar checks passed (${activeChecks.length}/${activeChecks.length}).`);
