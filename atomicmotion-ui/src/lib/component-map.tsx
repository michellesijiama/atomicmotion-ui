import type { ComponentType } from "react";

import { CodexSidebarReveal } from "@/components/codex-sidebar-reveal";
import { EmojiSketch } from "@/components/emoji-sketch";
import { ExpandedNavigation } from "@/components/expanded-navigation";
import { FilterDropdownReveal } from "@/components/filter-dropdown-reveal";
import { GeminiLive } from "@/components/gemini-live";
import { GeometricLogoReveal } from "@/components/geometric-logo-reveal";
import { ScrollScrubbedTypography } from "@/components/scroll-scrubbed-typography";
import { ScrollScrubbedVideo } from "@/components/scroll-scrubbed-video";

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

function ScrollScrubbedTypographyPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedTypography loop={loop} className={loop ? "px-16" : undefined} />;
}

function ScrollScrubbedVideoPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedVideo loop={loop} />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
  "expanded-navigation": ExpandedNavigationPreview,
  "filter-dropdown-reveal": FilterDropdownRevealPreview,
  "scroll-scrubbed-typography": ScrollScrubbedTypographyPreview,
  "codex-sidebar-reveal": CodexSidebarRevealPreview,
  "gemini-live": GeminiLivePreview,
  "geometric-logo-reveal": GeometricLogoRevealPreview,
  "scroll-scrubbed-video": ScrollScrubbedVideoPreview,
};
