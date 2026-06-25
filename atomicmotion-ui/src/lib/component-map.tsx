import type { ComponentType } from "react";

import { CodexSidebarReveal } from "@/components/codex-sidebar-reveal";
import { EmojiSketch } from "@/components/emoji-sketch";
import { ExpandedNavigation } from "@/components/expanded-navigation";
import { FilterDropdownReveal } from "@/components/filter-dropdown-reveal";
import { ScrollScrubbedTypography } from "@/components/scroll-scrubbed-typography";

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

function ScrollScrubbedTypographyPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedTypography loop={loop} className={loop ? "px-16" : undefined} />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
  "expanded-navigation": ExpandedNavigationPreview,
  "filter-dropdown-reveal": FilterDropdownRevealPreview,
  "scroll-scrubbed-typography": ScrollScrubbedTypographyPreview,
  "codex-sidebar-reveal": CodexSidebarRevealPreview,
};
