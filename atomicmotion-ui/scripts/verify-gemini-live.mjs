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
  ["component mirrors Gemini sharing chips", files.component.includes("SourceChip") && files.component.includes("Can't share") && files.component.includes("1 shared")],
  ["component removes profile glyph", !files.component.includes("ProfileGlyph") && !files.component.includes("Sijia")],
  ["component renders live control and keyboard controls", files.component.includes("Stop listening") && files.component.includes("Keyboard")],
  ["component removes Gemini sparkle mark", !files.component.includes("GeminiSparkle")],
  ["component removes Gemini gradient tokens", !files.component.includes("geminiGoogleColors") && !files.component.includes("geminiGradient")],
  ["component removes central moving gradient", !files.component.includes("GeminiThinkingOrb") && !files.component.includes("listeningPulses") && !files.component.includes("voiceWaveGradient")],
  ["component adds active listening edge gradient", files.component.includes("edgeWaveFrequencyPaths") && files.component.includes("AnimatedListeningGlow")],
  ["component biases active listening glow toward Google blue", files.component.includes("activeListeningBlue") && files.component.includes("#4285f4") && files.component.includes("#8ab4f8")],
  ["component uses waveform edge animation", files.component.includes("EdgeWave") && files.component.includes("edgeWaveFrequencyPaths") && !files.component.includes("maskComposite")],
  ["component animates glow while listening", files.component.includes("activeListeningPulsePattern") && files.component.includes("repeat: Infinity") && files.component.includes("isListening")],
  ["component uses fluid blue edge gradient", files.component.includes("FluidEdgeGradient") && files.component.includes("activeListeningFluidGradient") && files.component.includes("conic-gradient") && files.component.includes("radial-gradient")],
  ["component glows around all edges", files.component.includes('side="top"') && files.component.includes('side="right"') && files.component.includes('side="bottom"') && files.component.includes('side="left"')],
  ["component keeps listening glow restrictive", files.component.includes("activeListeningRestrictedEdgeGlow") && files.component.includes("strokeLinecap") && !files.component.includes("topRail") && !files.component.includes("blur-2xl")],
  ["component varies waveform frequency", files.component.includes("relaxed") && files.component.includes("active") && files.component.includes("tight") && files.component.includes("strokeWidth")],
  ["component uses blurry waveform glow", files.component.includes("blur(7px) drop-shadow(0 0 26px rgba(66,133,244,0.92))")],
  ["component uses Material 3 dark live surface", !files.component.includes("bg-black") && files.component.includes("rounded-[28px]") && files.component.includes("surfaceContainerLow")],
  ["component removes blue background glow", !files.component.includes("shadow-[0_0_28px") && !files.component.includes("rgba(47,120,255")],
  ["component removes outer panel shadow", !files.component.includes("boxShadow") && !files.component.includes("0 22px 54px rgba(4,8,18,0.28)") && !files.component.includes("0 18px 48px rgba(4,8,18,0.24)")],
  ["component keeps restrained panel edge", files.component.includes("outlineVariant") && files.component.includes("ring-1")],
  ["component keeps Material 3 rounded controls", files.component.includes("rounded-[28px]") && files.component.includes("surfaceContainerHigh")],
  ["component uses compact bottom control buttons", files.component.includes("m3BottomControlButtonClassName") && files.component.includes("h-8 w-[43px]") && files.component.includes("Switch to text mode")],
  ["component adds stop listening tooltip", files.component.includes("Stop listening") && files.component.includes("Start listening")],
  ["component positions tooltip above controls", files.component.includes("bottom-[calc(100%+12px)]") && !files.component.includes("top-[calc(100%+14px)]")],
  ["component right-aligns tooltip to avoid clipping", files.component.includes("right-0") && !files.component.includes("left-1/2 z-20 -translate-x-1/2 whitespace-nowrap")],
  ["component uses lighter listening label weight", files.component.includes("font-normal") && !files.component.includes("text-[24px] font-medium")],
  ["component removes keyboard button stroke", !files.component.includes("border border-white/70")],
  ["component removes bottom control pill stroke", !files.component.includes("shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-1")],
  ["component removes icon button focus stroke", !files.component.includes("focus-visible:ring-2") && !files.component.includes("focus-visible:ring-[var(--m3-primary)]")],
  ["component leaves center area empty", files.component.includes("flex-1 items-center justify-center") && !files.component.includes("GeminiThinkingOrb") && !files.component.includes("listeningPulses")],
  ["component supports loop preview", files.component.includes("loop = false") && files.component.includes("setIsListening")],
  ["component uses wide Gemini Live rectangle aspect", files.component.includes("aspect-[1.95/1]") && files.component.includes("max-w-[920px]") && !files.component.includes("h-[min(78vh,520px)]")],
  ["component uses wide rectangular loop preview", files.component.includes('loop && "h-[300px] w-[585px]"') && !files.component.includes('loop && "h-[560px] w-[430px]"')],
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
