import type { ComponentType } from "react";

import { GeminiLive } from "@components/ai/gemini-live";
import { VoiceBloom } from "@components/ai/voice-bloom";
import { GradientGummyBear } from "@components/3d/gradient-gummy-bear";
import { ShowreelSphere } from "@components/3d/showreel-sphere";
import { BlossomLight } from "@components/control/blossom-light";
import { ScrollPhaseCursor } from "@components/cursor/scroll-phase-cursor";
import { CoffeeGauge } from "@components/data-visualization/coffee-gauge";
import { DoodleCalendar } from "@components/data-visualization/doodle-calendar";
import { HalftoneBloom } from "@components/data-visualization/halftone-bloom";
import { StampTracker } from "@components/data-visualization/stamp-tracker";
import { GradientEventCard } from "@components/gradient/gradient-event-card";
import { JardinOpening } from "@components/immersive/jardin-opening";
import { CodexSidebarReveal } from "@components/navigation/codex-sidebar-reveal";
import { FilterDropdownReveal } from "@components/navigation/filter-dropdown-reveal";
import { SoftMenuReveal } from "@components/navigation/soft-menu-reveal";
import { BeadClub } from "@components/play/bead-club";
import { EmojiSketch } from "@components/play/emoji-sketch";
import { PocketPiggy } from "@components/play/pocket-piggy";
import { StickerPeel } from "@components/play/sticker-peel";
import { UIWalkthrough } from "@components/template/ui-walkthrough";
import { GeometricLogoReveal } from "@components/typography/geometric-logo-reveal";
import { ScrollScrubbedTypography } from "@components/typography/scroll-scrubbed-typography";

// Only components whose gallery tile needs adapting get a wrapper; the rest
// are mapped directly and receive `loop` unchanged.

function JardinOpeningPreview({ loop }: { loop?: boolean }) {
  // Counter the gallery stage's zoom so the landscape iPad fits inside the card.
  return <JardinOpening loop={loop} className={loop ? "scale-[0.72]" : undefined} />;
}

function UIWalkthroughPreview({ loop }: { loop?: boolean }) {
  return <UIWalkthrough loop={loop} layout={loop ? "split" : "auto"} className={loop ? "mx-auto max-w-[700px]" : undefined} />;
}

function ScrollScrubbedTypographyPreview({ loop }: { loop?: boolean }) {
  return <ScrollScrubbedTypography loop={loop} className={loop ? "px-16" : undefined} />;
}

function CoffeeGaugePreview({ loop }: { loop?: boolean }) {
  // The card is a compact 336px at true size, which lands tiny inside the
  // 960px preview canvas. Scale it up for the gallery only — enough to read,
  // not so much that it crowds the tile.
  return (
    <CoffeeGauge loop={loop} className={loop ? "scale-[1.55]" : undefined} />
  );
}

function DoodleCalendarPreview({ loop }: { loop?: boolean }) {
  // Website previews start fresh; the reusable diary can still opt into persistence.
  return <DoodleCalendar loop={loop ?? false} persist={false} />;
}

export const componentMap: Record<string, ComponentType<{ loop?: boolean }>> = {
  "sticker-peel": StickerPeel, // scales itself to the tile and stacks the notebook over the phone when narrow
  "bead-club": BeadClub,
  "ui-walkthrough": UIWalkthroughPreview,
  "jardin-opening": JardinOpeningPreview,
  "emoji-sketch": EmojiSketch,
  "soft-menu-reveal": SoftMenuReveal,
  "filter-dropdown-reveal": FilterDropdownReveal,
  "scroll-scrubbed-typography": ScrollScrubbedTypographyPreview,
  "codex-sidebar-reveal": CodexSidebarReveal,
  "gemini-live": GeminiLive,
  "geometric-logo-reveal": GeometricLogoReveal,
  "gradient-gummy-bear": GradientGummyBear,
  "scroll-phase-cursor": ScrollPhaseCursor,
  "voice-bloom": VoiceBloom,
  "showreel-sphere": ShowreelSphere,
  "coffee-gauge": CoffeeGaugePreview,
  "halftone-bloom": HalftoneBloom,
  "blossom-light": BlossomLight, // scales itself to whatever it is put in
  "gradient-event-card": GradientEventCard,
  "stamp-tracker": StampTracker, // the portrait phone scales itself down to fit the tile whole
  "doodle-calendar": DoodleCalendarPreview,
  "pocket-piggy": PocketPiggy, // the deck scales itself to the tile; the piggy wanders on its own
};
