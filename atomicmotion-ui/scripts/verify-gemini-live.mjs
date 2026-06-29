import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const files = {
  component: read("src/components/gemini-live/gemini-live.tsx"),
  index: read("src/components/gemini-live/index.ts"),
  map: read("src/lib/component-map.tsx"),
  registry: read("src/lib/component-registry.ts"),
  packageJson: read("package.json"),
};

const checks = [
  ["component exists", files.component.length > 0],
  ["component exports GeminiLive", files.component.includes("export function GeminiLive")],
  ["component uses framer motion", files.component.includes('from "framer-motion"')],
  ["component does not use lucide icons", !files.component.includes('from "lucide-react"')],
  ["component defines Material 3 color scheme", files.component.includes("m3ColorScheme") && files.component.includes("surfaceContainer") && files.component.includes("onSurface") && files.component.includes("outlineVariant")],
  ["component uses transparent outer background", files.component.includes("bg-transparent") && !files.component.includes("#fef7ff") && !files.component.includes("#f7f2fa")],
  ["component uses Material Symbols icon paths", files.component.includes("MaterialSymbolIcon") && files.component.includes("keyboard") && files.component.includes("more_vert")],
  ["component uses Material 3 icon buttons", files.component.includes("m3IconButtonClassName") && files.component.includes("rounded-full") && files.component.includes("hover:bg-white/8")],
  ["component renders Listening label", files.component.includes("Listening...")],
  ["component removes Gemini source chips", !files.component.includes("Current tab") && !files.component.includes("1 shared") && !files.component.includes("SourceChip")],
  ["component removes profile glyph", !files.component.includes("ProfileGlyph")],
  ["component renders pause and keyboard controls", files.component.includes("Pause") && files.component.includes("Keyboard")],
  ["component removes Gemini sparkle mark", !files.component.includes("GeminiSparkle")],
  ["component removes Gemini gradient tokens", !files.component.includes("geminiGoogleColors") && !files.component.includes("geminiGradient")],
  ["component removes central moving gradient", !files.component.includes("GeminiThinkingOrb") && !files.component.includes("listeningPulses") && !files.component.includes("voiceWaveGradient")],
  ["component uses Material 3 dark live surface", !files.component.includes("bg-black") && files.component.includes("rounded-[28px]") && files.component.includes("surfaceContainerLow")],
  ["component removes blue background glow", !files.component.includes("shadow-[0_0_28px") && !files.component.includes("rgba(47,120,255") && !files.component.includes("rgba(66,133,244,0.24)")],
  ["component keeps restrained panel edge", files.component.includes("outlineVariant") && files.component.includes("0 22px 54px rgba(4,8,18,0.28)")],
  ["component keeps Material 3 rounded controls", files.component.includes("rounded-[28px]") && files.component.includes("surfaceContainerHigh")],
  ["component removes keyboard button stroke", !files.component.includes("border border-white/70")],
  ["component leaves center area empty", files.component.includes("flex-1 items-center justify-center") && !files.component.includes("repeat: Infinity")],
  ["component supports loop preview", files.component.includes("loop = false") && files.component.includes("setIsListening")],
  ["component uses compact vertical loop preview", files.component.includes('loop && "h-[560px] w-[430px]"')],
  ["index re-exports component", files.index.includes("GeminiLive")],
  ["component map imports component", files.map.includes("@/components/gemini-live")],
  ["component map exposes route", files.map.includes('"gemini-live"')],
  ["registry registers Gemini Live", files.registry.includes('id: "gemini-live"')],
  ["registry names component", files.registry.includes('title: "Gemini Live"')],
  ["registry points to component source", files.registry.includes("src/components/gemini-live/gemini-live.tsx")],
  ["package exposes verification script", files.packageJson.includes('"test:gemini-live"')],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error("gemini live checks failed:");
  for (const [label] of failures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`gemini live checks passed (${checks.length}/${checks.length}).`);
