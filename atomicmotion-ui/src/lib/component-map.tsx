import type { ComponentType } from "react";

import { EmojiSketch } from "@/components/emoji-sketch";
import { ExpandedNavigation } from "@/components/expanded-navigation";

function EmojiSketchPreview({ loop }: { loop?: boolean }) {
  return <EmojiSketch loop={loop} />;
}

function ExpandedNavigationPreview() {
  return <ExpandedNavigation />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
  "expanded-navigation": ExpandedNavigationPreview,
};
