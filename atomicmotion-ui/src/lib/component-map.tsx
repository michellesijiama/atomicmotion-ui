import type { ComponentType } from "react";

import { EmojiSketch } from "@/components/emoji-sketch";

function EmojiSketchPreview({ loop }: { loop?: boolean }) {
  return <EmojiSketch loop={loop} />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "emoji-sketch": EmojiSketchPreview,
};
