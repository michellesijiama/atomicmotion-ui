#!/usr/bin/env node
// Static checks for Frosted Event Card: the picture is a static SVG bloom
// under a static grain filter that fades into ink, the share button is real
// glass, the CTA and date badge are accessible, and the gallery wiring
// agrees on the id.
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("components/card/frosted-event-card/frosted-event-card.tsx"),
  index: read("components/card/frosted-event-card/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
  packageJson: read("package.json"),
};

const registryEntry =
  files.registry.split(/(?=\n\s+id: ")/).find((block) => block.includes('id: "frosted-event-card"')) ?? "";

const checks = [
  ["component exists", files.component.length > 0],
  ["component exports FrostedEventCard", files.component.includes("export function FrostedEventCard")],
  ["component is a client component", files.component.startsWith('"use client"')],
  ["component does not import private modules", !/from\s+["']@\//.test(files.component)],
  [
    "component uses framer-motion for the ring",
    files.component.includes('from "framer-motion"') &&
      files.component.includes("useMotionValue") &&
      files.component.includes("useTransform") &&
      files.component.includes("whileTap"),
  ],
  ["component does not use lucide", !files.component.includes('from "lucide-react"')],
  ["component draws into 2D canvases, one GL context", files.component.includes("<canvas") && files.component.includes('getContext("webgl"')],
  ["component is deterministic on the server", !files.component.includes("Math.random")],
  ["share button is glass", files.component.includes("backdropFilter") && files.component.includes("WebkitBackdropFilter")],
  ["title is serif", files.component.includes("--font-instrument-serif")],
  ["type glows like the poster's labels", files.component.includes("textShadow")],
  ["no date badge and no sign-up pill", !files.component.includes("<time") && !files.component.includes("aria-pressed")],
  ["share has aria-label", files.component.includes('aria-label="Share event"')],
  ["light is a fragment shader", files.component.includes("gl_FragColor") && files.component.includes("FRAGMENT_SHADER")],
  ["the gradient is made of circles", files.component.includes("float disc(") && files.component.includes("vec3 ramp(")],
  ["the field is read through a seven-stop ramp", files.component.includes("uniform vec3 u_ramp[7]")],
  ["shapes are painted in four accents, halo to core", files.component.includes("uniform vec3 u_accent[4]") && files.component.includes("void paint(")],
  ["rings, arcs and segments are heat, not ink", files.component.includes("float ring(") && files.component.includes("float segment(") && !files.component.includes("const vec3 INK")],
  ["each shape has its own blur", files.component.includes("float soft")],
  ["grain is fixed to the pixel", files.component.includes("hash(gl_FragCoord.xy")],
  ["no sparkles, no fog", !files.component.includes("bokeh") && !files.component.includes("float haze(")],
  ["one GL context serves every card", files.component.includes("class AuraRenderer") && files.component.includes("let renderer:")],
  ["every card keeps moving", files.component.includes("live seed=") && files.component.includes("cancelAnimationFrame")],
  ["shader failure is survived", files.component.includes("renderer = null")],
  [
    "ring has eight ink patterns",
    ['"waves"', '"ovals"', '"stack"', '"orbit"', '"hourglass"', '"sphere"', '"coil"', '"streaks"'].every((pattern) => files.component.includes(pattern)),
  ],
  ["each card has its own field and accents", files.component.includes("MOODS[mood]") && files.component.includes("accents: [")],
  ["palettes come from painters, two of them loud", ["monet:", "matisse:", "rothko:", "hockney:", "hilma:", "delaunay:", "frankenthaler:", "okeeffe:"].every((k) => files.component.includes(k))],
  ["pale fields set the type in ink", files.component.includes("ink?: string") && files.component.includes('color: ink ?? "#fff"')],
  ["swipe settles on a long ease-out, not a spring", files.component.includes('const SNAP = { type: "tween"')],
  ["side cards dim through an overlay, not a filter", files.component.includes("opacity: shade") && !files.component.includes("brightness(")],
  ["frame is a landscape phone", files.component.includes("FRAME_W") && files.component.includes("perspective")],
  ["ring is swiped with a pan gesture", files.component.includes("onPanStart") && files.component.includes("onPanEnd")],
  ["release turns exactly one page, or snaps back", files.component.includes("info.velocity.x") && files.component.includes("settle(from + dir * STEP)")],
  ["ring answers wheel and arrow keys", files.component.includes("onWheel") && files.component.includes('"ArrowRight"')],
  ["ring wraps", files.component.includes("const wrap = ")],
  ["side cards turn away", files.component.includes("rotateY")],
  ["side cards are decorative", files.component.includes("aria-hidden={front ? undefined : true}")],
  ["frame is a carousel to assistive tech", files.component.includes('aria-roledescription="carousel"')],
  ["no shadow behind the cards", !files.component.includes("0 30px 60px")],
  ["loop stops at first interaction", files.component.includes("interacted")],
  ["motion respects reduced motion", files.component.includes('reducedMotion="user"')],
  ["index re-exports component", files.index.includes("FrostedEventCard")],
  ["component map imports component", files.map.includes("@components/card/frosted-event-card")],
  ["component map exposes route", files.map.includes('"frosted-event-card"')],
  ["registry registers Frosted Event Card", registryEntry.includes('id: "frosted-event-card"')],
  ["registry names component", registryEntry.includes('title: "Frosted Event Card"')],
  ["registry files it under Card", registryEntry.includes('category: "Card"')],
  ["registry points to component source", registryEntry.includes("components/card/frosted-event-card/frosted-event-card.tsx")],
  ["registry claims no runtime assets", !registryEntry.includes("requiredAssets")],
  ["package exposes verification script", files.packageJson.includes('"test:frosted-event-card"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("frosted event card checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`frosted event card checks passed (${checks.length}/${checks.length}).`);
