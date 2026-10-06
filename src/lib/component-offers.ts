export type ComponentOffer = {
  priceInCents: number;
  exportName: string;
  dependencies: string[];
  includes: string[];
};

// A small, curated paid collection. Everything else remains free.
const offers: Record<string, ComponentOffer> = {
  "voice-bloom": {
    priceInCents: 500,
    exportName: "VoiceBloom",
    dependencies: ["framer-motion", "lucide-react"],
    includes: ["Microphone-to-response animation", "Streaming text and response controls", "React + TypeScript source", "Responsive layout and reduced-motion support"],
  },
  "gradient-event-card": {
    priceInCents: 500,
    exportName: "GradientEventCard",
    dependencies: ["clsx", "framer-motion", "tailwind-merge"],
    includes: ["Swipeable card deck with spring transitions", "Animated gradient artwork", "React + TypeScript source", "Custom events and selection callbacks"],
  },
  "stamp-tracker": {
    priceInCents: 800,
    exportName: "StampTracker",
    dependencies: ["clsx", "framer-motion", "tailwind-merge"],
    includes: ["Interactive habit cards and stamp animations", "Day, week and month views", "React + TypeScript source", "Responsive layout and reduced-motion support"],
  },
};

export function getComponentOffer(id: string): ComponentOffer | undefined {
  return Object.hasOwn(offers, id) ? offers[id] : undefined;
}

export function formatComponentPrice(offer: ComponentOffer) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(offer.priceInCents / 100);
}
