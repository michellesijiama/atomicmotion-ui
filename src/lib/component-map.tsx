import type { ComponentType } from "react";

import { CodexSidebarReveal } from "@components/navigation/codex-sidebar-reveal";
import { EmojiSketch } from "@components/tool/emoji-sketch";
import { ExpandedNavigation } from "@components/navigation/expanded-navigation";
import { FilterDropdownReveal } from "@components/navigation/filter-dropdown-reveal";
import { GeminiLive } from "@components/ai/gemini-live";
import { GeometricLogoReveal } from "@components/typography/geometric-logo-reveal";
import { GradientAura } from "@components/3d/gradient-aura";
import { ScrollScrubbedTypography } from "@components/typography/scroll-scrubbed-typography";
import { ScrollPhaseCursor } from "@components/cursor/scroll-phase-cursor";

function EmojiSketchPreview({ loop }: { loop?: boolean }) {
  return <EmojiSketch loop={loop} />;
}

function ExpandedNavigationPreview({ loop }: { loop?: boolean }) {
  return <ExpandedNavigation loop={loop} />;
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

function GradientAuraPreview({ loop }: { loop?: boolean }) {
  return <GradientAura loop={loop} />;
}

function ScrollScrubbedTypographyPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedTypography loop={loop} className={loop ? "px-16" : undefined} />;
}

function ScrollPhaseCursorPreview({ loop }: { loop?: boolean }) {
  return <ScrollPhaseCursor loop={loop} />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
  "expanded-navigation": ExpandedNavigationPreview,
  "filter-dropdown-reveal": FilterDropdownRevealPreview,
  "scroll-scrubbed-typography": ScrollScrubbedTypographyPreview,
  "codex-sidebar-reveal": CodexSidebarRevealPreview,
  "gemini-live": GeminiLivePreview,
  "geometric-logo-reveal": GeometricLogoRevealPreview,
  "gradient-aura": GradientAuraPreview,
  "scroll-phase-cursor": ScrollPhaseCursorPreview,
};
