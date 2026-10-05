#!/usr/bin/env node
// Static integration checks for the monochrome everyday Japan diary.
// Keep the original calendar interaction checks while retiring the replaced art engine.
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
  ["navigation icons come from the existing Lucide dependency rather than inline SVG", c.includes("lucide-react") && c.includes("<ChevronLeft") && c.includes("<ChevronRight")],
  ["component inlines cn", c.includes("function cn(")],
  ["component uses framer-motion", c.includes('from "framer-motion"') && c.includes("AnimatePresence") && c.includes("whileTap")],
  ["component is deterministic: no Math.random", !c.includes("Math.random")],
  ["weekday labels are at least 16px", Number((c.match(/const WEEKDAY_SIZE = (\d+)/) ?? [])[1]) >= 16],
  ["days to come are full-size empty rings using the active theme", c.includes('className="block size-full rounded-full"') && c.includes('border: `1.25px solid ${activeText}`') && !c.includes("const DOT_HUES")],
  ["no home indicator on the glass", !/home indicator/i.test(c)],
  ["linked cards keep an inset for captions and notes", c.includes('padding: "10px 12px 8px"') && num("CARD_X") === 28],
  ["entry input does not trigger swipe or calendar keyboard navigation", c.includes('onPointerDown={(event) => event.stopPropagation()}') && c.includes('onKeyDown={(event) => event.stopPropagation()}') && c.includes("target instanceof HTMLTextAreaElement")],
  ["detail view supports horizontal swipe navigation", c.includes('drag="x"') && c.includes("onDragEnd") && c.includes("navigateOpenDay") && c.includes("gesture.offset.x")],
  ["no kind tag on the card", !c.includes("OUTING") && !c.includes("KIND_LABEL") && !/Outing"/.test(c)],
  ["phone is tall like an iPhone (ratio ≥ 2.0)", num("PHONE_H") / num("PHONE_W") >= 2.0 && num("PHONE_W") === 300],
  ["watercolour UI has no outer white bezel", num("BEZEL") === 0 && c.includes("const SCREEN_RADIUS = 51")],
  ["self-contained: no perfect-freehand", !c.includes("perfect-freehand") && !c.includes("getStroke")],
  ["self-contained: no OpenMoji or emoji fetching", !c.includes("/emoji/") && !c.includes("openmoji") && !c.includes("fetch(")],
  ["no shadows: no box-shadow", !c.includes("boxShadow") && !c.includes("box-shadow")],
  ["no shadows: no drop-shadow", !c.includes("drop-shadow") && !c.includes("dropShadow")],
  ["no shadows: no text-shadow", !c.includes("textShadow") && !c.includes("text-shadow")],
  ["no shadows: no shadow utility classes", !c.includes("shadow-")],
  ["no status bar text", !c.includes("9:41")],
  ["weekday labels are English", weekdayShort.every((d) => c.includes(`"${d}"`))],
  ["full weekday names are English", ["Monday", "Friday", "Sunday"].every((d) => c.includes(`"${d}"`))],
  ["month is August 2026", c.includes('"August"') && c.includes("YEAR = 2026") && c.includes("FIRST_COLUMN = 5")],
  ["today defaults to Thursday the 13th", /today: todayProp = 13/.test(c)],
  ["fourteen scenes, each with a kind, title and sentence", sceneRows.length === 14],
  ["titles are at most four words, sentences at most fourteen", sceneRows.length === 14 && sceneRows.every((r) => r.title.split(/\s+/).length <= 4 && r.sentence.split(/\s+/).length <= 14)],
  ["phone scales to fit its host", c.includes("ResizeObserver") && c.includes("Math.min(1,") && c.includes("Math.max(0.3")],
  ["layout morph corrects for the phone's scale", c.includes("transformPagePoint")],
  ["detail cards avoid shared-layout expansion", !c.includes('layoutId="dc-card"') && c.includes("LayoutGroup")],
  ["card is a modal dialog labelled by its title", c.includes('role="dialog"') && c.includes('aria-modal="true"') && c.includes("aria-labelledby={titleId}")],
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
  ["OpenMoji docs no longer mention the calendar", !files.emojiReadme.includes("doodle-calendar")],
  ["package exposes verification script", files.packageJson.includes('"test:doodle-calendar"')],
  ["current typography uses Caveat", c.includes("--font-caveat") && !c.includes("FONT_MONO") && !c.includes("FONT_SERIF")],
  ["linked pagination follows the finger and snaps by one card", c.includes("PAGE_TRAVEL = CARD_W + CARD_GAP") && c.includes("x: pageX") && c.includes("animate(pageX") && c.includes("dragMomentum={false}")],
  ["the oversized selected date returns to the month grid", c.includes('`Back to ${MONTH_NAME} ${YEAR} month view`') && c.includes('className="dc-date relative') && c.includes("onClick={close}")],
  ["connected bottom controls keep previous and next arrows around the pencil", c.includes('aria-label="Navigate completed dates"') && c.includes('aria-label="Previous completed date"') && c.includes('aria-label="Next completed date"') && c.includes("left: 52, width: 88, height: 44") && c.includes("bottom: 18, width: 192, height: 44") && !c.includes('aria-label="Choose a completed date"') && !c.includes("detailWeek.map") && !c.includes("Your illustrated day")],
  ["neutral paper and monochrome text", c.includes('const PAPER = "#F0F0F0"') && c.includes('const TEXT = "#242424"')],
  ["fourteen diary dates use daily moments", sceneRows.length === 14 && sceneRows.every((row) => row.kind === "daily")],
  ["seven generated everyday illustration pairs exist", ["coffee", "bento", "exercise", "train", "rain", "home", "shrine"].every((key) => [".webp", "-thumb.webp"].every((suffix) => existsSync(`public/illustrations/doodle-calendar-diary/${key}${suffix}`)))],
  ["artwork uses actual transparent image assets", c.includes("<img") && c.includes('objectFit: "contain"') && !c.includes("<canvas")],
  ["all shipped illustrations preserve transparency", ["coffee", "bento", "exercise", "train", "rain", "home", "shrine"].every((key) => [".webp", "-thumb.webp"].every((suffix) => { const path = `public/illustrations/doodle-calendar-diary/${key}${suffix}`; return existsSync(path) && readFileSync(path).includes(Buffer.from("ALPH")); }))],
  ["registry lists all required image assets", registryEntry.includes("requiredAssets") && (registryEntry.match(/doodle-calendar-diary\/[a-z-]+\.webp/g) ?? []).length === 14],
  ["notes and illustrated thumbnails persist locally", c.includes("localStorage.setItem") && c.includes("localStorage.getItem") && c.includes("image={images[day]}")],
  ["the demo includes entries through Thursday, leaving Friday unwritten", c.includes("SCENES.slice(0, 13)") && c.includes("today: todayProp = 13")],
  ["demo and real generation are clearly separated", c.includes("onGenerateImage?:") && c.includes("prepared demo illustration") && c.includes("Preview sketch") && c.includes("Generate sketch") && c.includes("demoImageFor(note)")],
  ["diary stays on each date when requesting a sketch", c.includes("illustrateEntry(openDay)") && c.includes("[day]: image") && c.includes("const note = entries[day]?.trim()")],
  ["registry describes everyday Japan and demo limitations", /life in Japan/.test(registryEntry) && /prepared sketch/.test(registryEntry) && /optional image-service callback/.test(registryEntry)],
  ["opening grows the tapped day into the card and closing shrinks it back", c.includes("function MorphLayer") && c.includes("gridCellRect(") && c.includes('direction: "open"') && c.includes('direction: "close"') && c.includes("const CARD_RECT")],
  ["month cells recede and return by distance from the opened day", c.includes("Math.hypot(") && c.includes("recedeDelay")],
  ["taps are ignored while a morph is running", c.includes("if (morphRef.current) return;")],
  ["swipe snaps with a spring that keeps the release velocity", c.includes("const PAGE_SPRING") && c.includes("velocity: gesture.velocity.x") && c.includes("releaseVelocityRef")],
  ["pages drift with parallax as the strip moves", c.includes("function Parallax") && c.includes("useTransform(")],
  ["neighbouring artwork is pre-rendered two pages out", c.includes("Math.abs(day - openDay) <= 2")],
  ["the strip stretches a little past the first and last day", c.includes("dragElastic={reduced ? 0 : 0.16}")],

];

const activeChecks = checks;
const failures = activeChecks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("doodle calendar checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`doodle calendar checks passed (${activeChecks.length}/${activeChecks.length}).`);
