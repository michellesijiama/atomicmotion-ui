import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const files = {
  globals: read("src/styles/globals.css"),
  styles: read("src/components/website/styles.ts"),
  registry: read("src/lib/component-registry.ts"),
  map: read("src/lib/component-map.tsx"),
  component: existsSync(
    "src/components/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx",
  )
    ? read("src/components/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx")
    : "",
  index: existsSync("src/components/scroll-scrubbed-typography/index.ts")
    ? read("src/components/scroll-scrubbed-typography/index.ts")
    : "",
};

const expandedIndex = files.registry.indexOf("expandedNavigation");
const scrollIndex = files.registry.indexOf("scrollScrubbedTypography");

const checks = [
  ["component is registered after Soft Menu Reveal", expandedIndex > -1 && scrollIndex > expandedIndex],
  [
    "registry uses requested title without compression",
    files.registry.includes('title: "Scroll-Scrubbed Typography"') &&
      !files.registry.includes('title: "Scroll-Scrubbed Typography Compression"'),
  ],
  [
    "registry description has no trailing period",
    files.registry.includes(
      '"A sticky editorial title that stretches tall, then compresses as scroll progress scrubs its vertical scale"',
    ) &&
      !files.registry.includes(
        '"A sticky editorial title that stretches tall, then compresses as scroll progress scrubs its vertical scale."',
      ),
  ],
  ["registry uses Getty Gehry inspiration", files.registry.includes('inspiredBy: { label: "Getty × Gehry"')],
  ["component map imports preview", files.map.includes("ScrollScrubbedTypography")],
  ["component map exposes route id", files.map.includes('"scroll-scrubbed-typography"')],
  [
    "home card preview adds horizontal breathing room",
    files.map.includes('className={loop ? "px-16" : undefined}'),
  ],
  ["component file exists", files.component.length > 0],
  ["component exports named component", files.component.includes("export function ScrollScrubbedTypography")],
  [
    "visible title removes typography",
    files.component.includes('const TITLE_LINES = ["Scroll-Scrubbed", "Compression"]') &&
      files.component.includes('aria-label="Scroll-Scrubbed Compression"') &&
      !files.component.includes('const TITLE_LINES = ["Scroll-Scrubbed", "Typography", "Compression"]') &&
      !["Sailing the", "sea of sound"].some((word) => files.component.includes(word)),
  ],
  [
    "visible title uses fit-safe typography sizing",
    files.component.includes("text-[clamp(42px,8vw,92px)]") &&
      files.component.includes("tracking-[-0.075em]"),
  ],
  [
    "home card loop title uses smaller fit-safe typography",
    files.component.includes('? "text-[clamp(34px,6.2vw,70px)] leading-[0.66] tracking-[-0.055em]"') &&
      files.component.includes(': "text-[clamp(42px,8vw,92px)] leading-[0.74] tracking-[-0.075em]"'),
  ],
  ["component uses scroll progress", files.component.includes("useScroll") && files.component.includes("useTransform")],
  ["scroll container is positioned for useScroll", files.component.includes('"relative h-full overflow-y-auto')],
  ["component has reduced motion fallback", files.component.includes("useReducedMotion")],
  [
    "detail page shows scroll down cursor only on green surface hover",
    files.component.includes("Scroll down") &&
      files.component.includes("surfaceRef") &&
      files.component.includes("getBoundingClientRect") &&
      files.component.includes('addEventListener("pointermove"') &&
      files.component.includes("onPointerMove") &&
      files.component.includes("onPointerEnter") &&
      files.component.includes("onPointerLeave") &&
      files.component.includes("pointer-events-none fixed") &&
      !files.component.includes("scroll-scrubbed-cursor-page") &&
      !files.component.includes("cursor-none") &&
      !files.component.includes('addEventListener("mousemove"'),
  ],
  [
    "scroll down cursor has no drop shadow",
    files.component.includes("Scroll down") && !files.component.includes("shadow-["),
  ],
  [
    "component removes Getty-style chrome labels",
    !["Chapter I", "Ship in the Box", "Sound", "[Menu]"].some((label) =>
      files.component.includes(label),
    ),
  ],
  [
    "green demo surface has explicit max dimensions",
    files.component.includes("max-h-[620px]") &&
      files.component.includes("max-w-[760px]") &&
      files.component.includes("w-[min(86vw,760px)]"),
  ],
  [
    "loop preview narrows the green surface for horizontal padding",
    files.component.includes("? \"w-[min(68vw,620px)] max-w-[620px]\"") &&
      files.component.includes(": \"w-[min(86vw,760px)] max-w-[760px]\""),
  ],
  [
    "green demo surface is centered in the preview area",
    files.component.includes("items-center justify-center") &&
      !files.component.includes("w-full items-start justify-center"),
  ],
  [
    "component keeps the scroll experience on one green surface",
    !files.component.includes("<section") && !files.component.includes("place-items-center bg-black"),
  ],
  [
    "component keeps the description on the green surface under the typography",
    files.component.includes("A sticky title compresses against the top edge as scroll") &&
      files.component.includes("progress scrubs its vertical scale") &&
      files.component.includes("scrubs its vertical scale") &&
      files.component.includes('aria-label="Scroll-Scrubbed Typography description"') &&
      files.component.includes("mt-28") &&
      files.component.indexOf('aria-label="Scroll-Scrubbed Compression"') <
        files.component.indexOf('aria-label="Scroll-Scrubbed Typography description"') &&
      files.component.indexOf("</motion.div>") <
        files.component.indexOf('aria-label="Scroll-Scrubbed Typography description"') &&
      !files.component.includes("scrubs its vertical scale."),
  ],
  ["nav background token is transparent", files.globals.includes("--am-nav-bg: transparent")],
  ["nav hover background token exists", files.globals.includes("--am-nav-hover-bg:")],
  [
    "top navigation fill is tokenized",
    files.styles.includes("bg-[var(--am-nav-bg)]") &&
      files.styles.includes("hover:bg-[var(--am-nav-hover-bg)]") &&
      !files.styles.includes("bg-[#f5f5f5]"),
  ],
  ["index re-exports component", files.index.includes("ScrollScrubbedTypography")],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("scroll-scrubbed typography checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`scroll-scrubbed typography checks passed (${checks.length}/${checks.length}).`);
