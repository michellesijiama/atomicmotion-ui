import type { ComponentType } from "react";

import { CodexSidebarReveal } from "@components/navigation/codex-sidebar-reveal";
import { EmojiSketch } from "@components/tool/emoji-sketch";
import { SoftMenuReveal } from "@components/navigation/soft-menu-reveal";
import { FilterDropdownReveal } from "@components/navigation/filter-dropdown-reveal";
import { GeminiLive } from "@components/ai/gemini-live";
import { GeometricLogoReveal } from "@components/typography/geometric-logo-reveal";
import { GradientGummyBear } from "@components/3d/gradient-gummy-bear";
import { ShowreelSphere } from "@components/3d/showreel-sphere";
import { ScrollScrubbedTypography } from "@components/typography/scroll-scrubbed-typography";
import { ScrollPhaseCursor } from "@components/cursor/scroll-phase-cursor";
import { VoiceBloom } from "@components/ai/voice-bloom";
import { CoffeeGauge } from "@components/data/coffee-gauge";

function EmojiSketchPreview({ loop }: { loop?: boolean }) {
  return <EmojiSketch loop={loop} />;
}

function SoftMenuRevealPreview({ loop }: { loop?: boolean }) {
  return <SoftMenuReveal loop={loop} />;
}

function FilterDropdownRevealPreview({ loop }: { loop?: boolean }) {
  return <FilterDropdownReveal loop={loop} />;
}

function CodexSidebarRevealPreview({ loop }: { loop?: boolean }) {
  return <CodexSidebarReveal loop={loop} />;
}

function GeminiLivePreview({ loop }: { loop?: boolean }) {
  return <GeminiLive loop={loop} />;
}

function GeometricLogoRevealPreview({ loop }: { loop?: boolean }) {
  return <GeometricLogoReveal loop={loop} />;
}

function GradientGummyBearPreview({ loop }: { loop?: boolean }) {
  return <GradientGummyBear loop={loop} />;
}

function ShowreelSpherePreview({ loop }: { loop?: boolean }) {
  return <ShowreelSphere loop={loop} />;
}

function ScrollScrubbedTypographyPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedTypography loop={loop} className={loop ? "px-16" : undefined} />;
}

function ScrollPhaseCursorPreview({ loop }: { loop?: boolean }) {
  return <ScrollPhaseCursor loop={loop} />;
}

function VoiceBloomPreview({ loop }: { loop?: boolean }) {
  return <VoiceBloom loop={loop} />;
}

function CoffeeGaugePreview({ loop }: { loop?: boolean }) {
  // The card is a compact 336px at true size, which lands tiny inside the
  // 960px preview canvas. Scale it up for the gallery only — enough to read,
  // not so much that it crowds the tile.
  return (
    <CoffeeGauge loop={loop} className={loop ? "scale-[1.55]" : undefined} />
  );
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
  "soft-menu-reveal": SoftMenuRevealPreview,
  "filter-dropdown-reveal": FilterDropdownRevealPreview,
  "scroll-scrubbed-typography": ScrollScrubbedTypographyPreview,
  "codex-sidebar-reveal": CodexSidebarRevealPreview,
  "gemini-live": GeminiLivePreview,
  "geometric-logo-reveal": GeometricLogoRevealPreview,
  "gradient-gummy-bear": GradientGummyBearPreview,
  "scroll-phase-cursor": ScrollPhaseCursorPreview,
  "voice-bloom": VoiceBloomPreview,
  "showreel-sphere": ShowreelSpherePreview,
  "coffee-gauge": CoffeeGaugePreview,
};
