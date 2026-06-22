import type { ComponentType } from "react";

import { EmojiSketch } from "@/components/emoji-sketch";
import { ExpandedNavigation } from "@/components/expanded-navigation";
import { ScrollScrubbedTypography } from "@/components/scroll-scrubbed-typography";

function EmojiSketchPreview({ loop }: { loop?: boolean }) {
  return <EmojiSketch loop={loop} />;
}

function ExpandedNavigationPreview({ loop }: { loop?: boolean }) {
  return <ExpandedNavigation loop={loop} />;
}

function ScrollScrubbedTypographyPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedTypography loop={loop} className={loop ? "px-16" : undefined} />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
  "expanded-navigation": ExpandedNavigationPreview,
  "scroll-scrubbed-typography": ScrollScrubbedTypographyPreview,
};
