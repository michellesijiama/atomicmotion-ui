"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type ScrollPhaseCursorProps = {
  loop?: boolean;
  className?: string;
};

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Slide = {
  id: string;
  movement: string;
  ratio: string;
  dimensions: string;
};

const SLIDES: Slide[] = [
  { id: "Slide 2-01", movement: "Carousel", ratio: "16 : 10", dimensions: "1280 × 800" },
  { id: "Slide 2-02", movement: "Dissolve", ratio: "16 : 10", dimensions: "1280 × 800" },
  { id: "Slide 2-03", movement: "Push", ratio: "16 : 10", dimensions: "1280 × 800" },
  { id: "Slide 2-04", movement: "Hold", ratio: "16 : 10", dimensions: "1280 × 800" },
  { id: "Slide 2-05", movement: "Return", ratio: "16 : 10", dimensions: "1280 × 800" },
];

function SlidePlate({ slide }: { slide: Slide }) {
  return (
    <article className="relative w-full shrink-0 overflow-hidden rounded-[12px] bg-gradient-to-b from-black/[0.075] to-black/[0.028] ring-1 ring-inset ring-black/[0.06] [aspect-ratio:16/10]">
      <div className="absolute inset-y-0 left-[47%] w-px bg-black/[0.06]" />

      <div className="absolute right-[4%] top-[6%] flex gap-[6%] text-right font-[var(--font-manrope)] text-[clamp(8px,0.85cqw,10px)] leading-[1.5]">
        {[
          ["Movement", slide.movement],
          ["Aspect ratio", slide.ratio],
          ["Dimensions", slide.dimensions],
        ].map(([label, value]) => (
          <div key={label} className="whitespace-nowrap text-left">
            <p className="text-[#8b8b86]">{label}</p>
            <p className="text-[#adada8]">{value}</p>
          </div>
        ))}
      </div>

      <p className="absolute left-[4%] top-[6%] font-[var(--font-manrope)] text-[clamp(20px,3.1cqw,42px)] font-light tracking-[-0.02em] text-[#a6a6a1]">
        {slide.id}
      </p>

      <p className="absolute bottom-[6%] left-[4%] font-mono text-[clamp(9px,1.1cqw,14px)] uppercase tracking-[0.1em] text-[#a6a6a1]">
        Atomic<span className="align-super text-[0.6em]">®</span>
      </p>
    </article>
  );
}

export function ScrollPhaseCursor({ loop = false, className }: ScrollPhaseCursorProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = React.useState(0);
  const [cursor, setCursor] = React.useState({ x: 0, y: 0, visible: false });

  const syncProgress = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const range = element.scrollHeight - element.clientHeight;
    setProgress(range > 0 ? element.scrollTop / range : 0);
  }, []);

  React.useEffect(() => {
    if (!loop || reduceMotion) return;
    const element = scrollRef.current;
    if (!element) return;
    let frame = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const duration = 16000;
      const cycle = ((now - start) % duration) / duration;
      const eased = cycle < 0.82 ? cycle / 0.82 : 1 - (cycle - 0.82) / 0.18;
      element.scrollTop = eased * (element.scrollHeight - element.clientHeight);
      syncProgress();
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [loop, reduceMotion, syncProgress]);

  const updateCursor = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top, visible: true });
  };

  return (
    <div className={cn("flex h-full min-h-[420px] w-full items-center justify-center", className)}>
      <div
        ref={surfaceRef}
        className={cn(
          "relative overflow-hidden [container-type:inline-size]",
          loop ? "h-[min(58vh,520px)] w-[min(76vw,620px)]" : "h-[min(72vh,720px)] w-[min(92vw,1040px)]",
          !loop && "scroll-phase-surface",
        )}
        onPointerMove={loop ? undefined : updateCursor}
        onPointerEnter={loop ? undefined : updateCursor}
        onPointerLeave={loop ? undefined : () => setCursor((value) => ({ ...value, visible: false }))}
      >
        <div
          ref={scrollRef}
          onScroll={syncProgress}
          className={cn(
            "relative z-10 h-full overflow-y-auto overflow-x-hidden",
            // Smooth behavior would restart on every frame of the loop and pin
            // the preview at zero, so the autoplay track scrolls natively.
            loop ? "pointer-events-none" : "scroll-smooth",
          )}
        >
          <div className="flex flex-col gap-[4cqw] py-[6cqw] pl-[14cqw] pr-[5cqw]">
            {SLIDES.map((slide) => (
              <SlidePlate key={slide.id} slide={slide} />
            ))}
          </div>
        </div>

        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute z-30 size-[120px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150",
            loop ? "left-[68%] top-[56%] opacity-100" : cursor.visible ? "opacity-100" : "opacity-0",
          )}
          style={loop ? undefined : { left: cursor.x, top: cursor.y }}
        >
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1.5" />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--jitter-ink)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.32em] text-[#4a4a46]">
            <span className="translate-x-[0.16em]">Scroll</span>
          </span>
        </div>
      </div>

      <style jsx>{`
        div::-webkit-scrollbar { width: 0; height: 0; }
        @media (pointer: fine) { .scroll-phase-surface, .scroll-phase-surface * { cursor: none; } }
      `}</style>
    </div>
  );
}
