"use client";

import * as React from "react";

// Every preview is authored against this fixed "desktop" canvas. The card then
// scales the whole canvas down to whatever width the card currently is, so the
// composition and typography always match the detail page — just smaller.
const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 760;
// Zoom relative to the card width. 1 = the full 960px canvas spans the card;
// >1 zooms in, cropping the canvas's empty outer margins so the actual content
// reads larger. Tuned so centered content fills the card without clipping.
const FIT = 1.35;

type PreviewStageProps = {
  children: React.ReactNode;
};

export function PreviewStage({ children }: PreviewStageProps) {
  const safeAreaRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = safeAreaRef.current;
    if (!el) return;

    const update = () => {
      setScale((el.clientWidth / DESIGN_WIDTH) * FIT);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={safeAreaRef} className="absolute inset-4 overflow-hidden rounded-[12px]">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale ?? 0})`,
          // Stay hidden until the first measurement so the full-size canvas
          // never flashes before it's scaled to fit.
          visibility: scale === null ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}
