#!/usr/bin/env node
// Static checks for Glass Tab Menu: it is a real tablist with keyboard
// support, the glass is CSS backdrop blur plus a static SVG grain, nothing
// heavy crept in, and the gallery wiring agrees on the id.
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("components/navigation/glass-tab-menu/glass-tab-menu.tsx"),
  index: read("components/navigation/glass-tab-menu/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
  packageJson: read("package.json"),
};

const registryEntry =
  files.registry.split(/(?=\n\s+id: ")/).find((block) => block.includes('id: "glass-tab-menu"')) ?? "";

const checks = [
  ["component exists", files.component.length > 0],
  ["component exports GlassTabMenu", files.component.includes("export function GlassTabMenu")],
  ["component is a client component", files.component.startsWith('"use client"')],
  ["component does not import private modules", !/from\s+["']@\//.test(files.component)],
  ["component uses framer-motion for the pill and panel", files.component.includes('from "framer-motion"') && files.component.includes("layoutId")],
  ["component does not use lucide", !files.component.includes('from "lucide-react"')],
  ["component mounts no canvas", !files.component.includes("<canvas")],
  ["component is deterministic on the server", !files.component.includes("Math.random")],
  ["component is glass", files.component.includes("backdropFilter") && files.component.includes("WebkitBackdropFilter")],
  ["component grains the glass with a static filter", files.component.includes("feTurbulence") && files.component.includes("mixBlendMode")],
  ["panes have fibrous edges, not strokes", files.component.includes("feDisplacementMap") && !files.component.includes("inset 0 1px 0")],
  ["component fades the list tail", files.component.includes("maskImage") && files.component.includes("WebkitMaskImage")],
  ["bar is a tablist", files.component.includes('role="tablist"') && files.component.includes('role="tab"') && files.component.includes('role="tabpanel"') && files.component.includes("aria-selected")],
  ["tabs take arrow keys and Escape", files.component.includes('"ArrowRight"') && files.component.includes('"ArrowLeft"') && files.component.includes('"ArrowDown"') && files.component.includes('"Escape"')],
  ["panel opens on hover and focus", files.component.includes("onPointerEnter") && files.component.includes("onFocus")],
  ["loop stops at first interaction", files.component.includes("interacted")],
  ["motion respects reduced motion", files.component.includes('reducedMotion="user"')],
  ["shop panel is a list and features panel is a media card", files.component.includes("function ListPanel") && files.component.includes("function MediaPanel")],
  ["media card accepts a real photo", files.component.includes("featureImage") && files.component.includes("featureAlt")],
  ["about tab is gone", !files.component.includes('"about"')],
  ["rows get a sliding hover pill with an arrow", files.component.includes("-row`") && files.component.includes("aria-hidden")],
  ["index re-exports component", files.index.includes("GlassTabMenu")],
  ["component map imports component", files.map.includes("@components/navigation/glass-tab-menu")],
  ["component map exposes route", files.map.includes('"glass-tab-menu"')],
  ["registry registers Glass Tab Menu", registryEntry.includes('id: "glass-tab-menu"')],
  ["registry names component", registryEntry.includes('title: "Glass Tab Menu"')],
  ["registry files it under Navigation", registryEntry.includes('category: "Navigation"')],
  ["registry points to component source", registryEntry.includes("components/navigation/glass-tab-menu/glass-tab-menu.tsx")],
  ["registry claims no runtime assets", !registryEntry.includes("requiredAssets")],
  ["package exposes verification script", files.packageJson.includes('"test:glass-tab-menu"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("glass tab menu checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`glass tab menu checks passed (${checks.length}/${checks.length}).`);
