import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("src/components/scroll-scrubbed-video/scroll-scrubbed-video.tsx"),
  index: read("src/components/scroll-scrubbed-video/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
  packageJson: read("package.json"),
  localVideo: existsSync("public/videos/pinterest-floral-scroll.mp4"),
};
const cursorSnippet = files.component.slice(
  files.component.indexOf('aria-label="Scroll cursor label"'),
  files.component.indexOf("</motion.div>", files.component.indexOf('aria-label="Scroll cursor label"')),
);
const captionLinesMatch = files.component.match(/const CAPTION_LINES = \[([\s\S]*?)\];/);
const captionLineCount = captionLinesMatch
  ? (captionLinesMatch[1].match(/^\s*"/gm) || []).length
  : 0;

const checks = [
  ["component file exists", files.component.length > 0],
  ["component exports ScrollScrubbedVideo", files.component.includes("export function ScrollScrubbedVideo")],
  ["component is a client component", files.component.startsWith('"use client";')],
  ["component renders a video element", files.component.includes("<video")],
  ["downloaded Pinterest video exists", files.localVideo],
  ["component uses downloaded local Pinterest video", files.component.includes('"/videos/pinterest-floral-scroll.mp4"')],
  ["component no longer uses Pixabay video source", !files.component.includes("cdn.pixabay.com/video/2024/12/29/249475_large.mp4")],
  ["component no longer uses Getty video source", !files.component.includes("gehry.getty.edu/video/chapter-1/getty_desktop_CH1_720.mp4")],
  ["component maps scroll to video time", files.component.includes("currentTime") && files.component.includes("duration") && files.component.includes("scrollYProgress")],
  ["component uses scroll container for scrub", files.component.includes('aria-label="Scroll-controlled video playback"') && files.component.includes("overflow-y-auto")],
  ["component hides internal scrollbar", files.component.includes("[scrollbar-width:none]") && files.component.includes("[&::-webkit-scrollbar]:hidden")],
  ["component has reduced motion fallback", files.component.includes("useReducedMotion") && files.component.includes("prefers-reduced-motion")],
  ["component supports loop preview", files.component.includes("loop = false") && files.component.includes("requestAnimationFrame")],
  ["component removes dark stage background", files.component.includes("bg-transparent") && !files.component.includes("overflow-hidden bg-black") && !files.component.includes("linear-gradient(90deg,rgba(0,0,0")],
  ["component keeps video visually smaller than stage", files.component.includes("videoFrameRef") && files.component.includes("h-[76%]") && files.component.includes("aspect-[9/16]") && files.component.includes("max-w-[76%]")],
  ["component uses exactly three animated captions", captionLineCount === 3],
  ["component places captions in top middle and bottom positions", files.component.includes("CAPTION_PLACEMENTS") && files.component.includes("top-8") && files.component.includes("top-1/2") && files.component.includes("bottom-7") && files.component.includes("captionPlacement")],
  ["component animates changing narrative captions without period", files.component.includes("CAPTION_LINES") && files.component.includes("activeCaptionIndex") && files.component.includes("setActiveCaptionIndex") && files.component.includes("AnimatePresence") && files.component.includes("motion.div") && files.component.includes("guided by the wheel under your hand") && files.component.includes("A quiet bloom opens in slow motion") && !files.component.includes("guided by the wheel under your hand.") && !files.component.includes("A quiet bloom opens in slow motion.") && !files.component.includes("Floral Current") && !files.component.includes("Bloom") && !files.component.includes("by scroll") && !files.component.includes("padStart(2") && !files.component.includes("scaleX: progress")],
  ["component removes caption shadow and blur effects", !files.component.includes("text-shadow") && !files.component.includes("filter: \"blur")],
  ["component shows scroll text beside default cursor", !files.component.includes("cursor-none") && files.component.includes("cursor.visible") && files.component.includes("setCursor") && files.component.includes("onPointerEnter") && files.component.includes("onPointerMove") && files.component.includes("onPointerLeave") && cursorSnippet.includes("Scroll cursor label") && cursorSnippet.includes("scroll") && !cursorSnippet.includes("rounded-full") && !cursorSnippet.includes("border") && !cursorSnippet.includes("bg-")],
  ["component removes top video chrome", !files.component.includes("Scroll down") && !files.component.includes("Scroll up") && !files.component.includes("[ Menu ]") && !files.component.includes("<header")],
  ["index re-exports component", files.index.includes("ScrollScrubbedVideo")],
  ["component map imports component", files.map.includes("@/components/scroll-scrubbed-video")],
  ["component map exposes route id", files.map.includes('"scroll-scrubbed-video"')],
  ["registry replaces 007 placeholder", files.registry.includes('id: "scroll-scrubbed-video"') && files.registry.includes('index: "007"')],
  ["registry names component", files.registry.includes('title: "Scroll-Scrubbed Video"')],
  ["registry uses Getty Gehry inspiration", files.registry.includes('inspiredBy: { label: "Getty × Gehry"')],
  ["package exposes verification script", files.packageJson.includes('"test:scroll-scrubbed-video"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("scroll-scrubbed video checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`scroll-scrubbed video checks passed (${checks.length}/${checks.length}).`);
