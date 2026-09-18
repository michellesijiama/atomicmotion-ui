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
    "component uses framer-motion",
    files.component.includes('from "framer-motion"') &&
      files.component.includes("AnimatePresence") &&
      files.component.includes("whileHover") &&
      files.component.includes("pathLength"),
  ],
  ["component does not use lucide", !files.component.includes('from "lucide-react"')],
  ["component mounts no canvas", !files.component.includes("<canvas")],
  ["component is deterministic on the server", !files.component.includes("Math.random")],
  ["share button is glass", files.component.includes("backdropFilter") && files.component.includes("WebkitBackdropFilter")],
  ["grain is a static filter", files.component.includes("feTurbulence") && files.component.includes("mixBlendMode")],
  ["picture fades into ink", files.component.includes("linear-gradient(to bottom, transparent")],
  ["title is serif", files.component.includes("--font-instrument-serif")],
  ["date is a <time with dateTime", files.component.includes("<time") && files.component.includes("dateTime={date.dateTime}")],
  ["CTA is aria-pressed", files.component.includes("aria-pressed={signedUp}")],
  ["share has aria-label", files.component.includes('aria-label="Share event"')],
  ["component accepts a real photo", files.component.includes("image?: string") && files.component.includes("imageAlt?: string")],
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
