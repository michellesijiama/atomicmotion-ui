"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SunlitBookPageProps = {
  windIntensity?: number;
  leafDensity?: 1 | 2 | 3;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Baseline "wind" so the light/shadow keeps drifting on its own, no hover required.
const AMBIENT_WIND = 0.6;

function LeafShadow({
  x,
  y,
  scale = 1,
  rotate = 0,
  opacity = 1,
  sway = "a",
}: {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  sway?: "a" | "b" | "c";
}) {
  const leaves = [
    [-20, -46, -42, 18, 8],
    [12, -34, 34, 17, 7],
    [-10, -14, -26, 16, 7],
    [19, 4, 32, 15, 7],
    [-14, 24, -18, 17, 8],
  ];

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      <g className={`sunlit-book-leaf sunlit-book-leaf-${sway}`}>
        <path
          d="M0 -58 C-9 -28 -8 12 4 60"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
          opacity="0.38"
        />
        {leaves.map(([leafX, leafY, leafRotate, rx, ry]) => (
          <ellipse
            key={`${leafX}-${leafY}`}
            cx={leafX}
            cy={leafY}
            rx={rx}
            ry={ry}
            fill="currentColor"
            transform={`rotate(${leafRotate} ${leafX} ${leafY})`}
          />
        ))}
      </g>
    </g>
  );
}

function PlaceholderText() {
  const rows = [
    "The afternoon light moved softly across the page, carrying the shape of leaves from the tree above.",
    "For a moment the book felt less like an object and more like a small place to sit inside.",
    "A narrow shadow crossed the margin, then slipped away with the wind.",
    "The paper kept the warmth of the sun while the ink stayed quiet and sharp.",
    "Every line seemed slower there, held between shade, light, and the turn of a page.",
  ];

  return (
    <div className="grid gap-3 text-[13px] leading-7 text-[var(--jitter-ink)]/70 sm:text-sm">
      {rows.map((row) => (
        <p key={row}>{row}</p>
      ))}
    </div>
  );
}

function AmbientSunShadow() {
  return (
    <div
      className="sunlit-book-ambient pointer-events-none absolute -inset-[28%] z-0 overflow-visible"
      aria-hidden="true"
    >
      <div className="sunlit-book-shadow-field absolute -right-[18%] -top-[12%] h-[124%] w-[78%] rotate-[14deg] rounded-[48%] bg-[radial-gradient(ellipse_at_center,rgba(14,16,17,0.105)_0%,rgba(14,16,17,0.065)_36%,rgba(14,16,17,0.028)_58%,transparent_76%)] blur-[38px] mix-blend-multiply" />
      <div className="sunlit-book-shadow-band absolute -right-[8%] top-[4%] h-[92%] w-[68%] rotate-[18deg] bg-[linear-gradient(105deg,transparent_0%,rgba(14,16,17,0.026)_18%,rgba(14,16,17,0.078)_42%,rgba(14,16,17,0.038)_58%,transparent_78%)] blur-[26px] mix-blend-multiply" />
      <div className="sunlit-book-paper-grain absolute -right-[12%] top-[2%] h-[105%] w-[72%] rotate-[14deg] opacity-15 mix-blend-multiply blur-[1px]" />
    </div>
  );
}

export function SunlitBookPage({
  windIntensity = 0.54,
  leafDensity = 3,
  interactive = true,
  className,
  children,
}: SunlitBookPageProps) {
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

      event.currentTarget.style.setProperty("--sunlit-x", `${(x * 100).toFixed(1)}%`);
      event.currentTarget.style.setProperty("--sunlit-y", `${(y * 100).toFixed(1)}%`);
      event.currentTarget.style.setProperty("--sunlit-cursor-wind", "1");
    },
    [interactive],
  );

  const handlePointerLeave = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--sunlit-x", "74%");
    event.currentTarget.style.setProperty("--sunlit-y", "14%");
    // Fall back to the ambient baseline, not 0 — the light/shadow keeps drifting on its own.
    event.currentTarget.style.setProperty("--sunlit-cursor-wind", String(AMBIENT_WIND));
  }, []);

  const density = clamp(leafDensity, 1, 3);
  const visualStyle = {
    "--sunlit-wind": clamp(windIntensity, 0, 1),
    "--sunlit-cursor-wind": AMBIENT_WIND,
    "--sunlit-x": "74%",
    "--sunlit-y": "14%",
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate h-full min-h-full w-full overflow-visible bg-transparent font-[family-name:var(--am-reader-font)] text-[var(--jitter-ink)]",
        className,
      )}
      style={visualStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <style>
        {`
          @keyframes sunlit-book-sway-a {
            0%, 100% { transform: translate3d(-2px, 0, 0) rotate(-0.5deg); }
            40% { transform: translate3d(calc(5px + var(--sunlit-cursor-wind) * 5px), -2px, 0) rotate(calc(0.8deg + var(--sunlit-cursor-wind) * .7deg)); }
            72% { transform: translate3d(calc(-4px - var(--sunlit-cursor-wind) * 3px), 1px, 0) rotate(-0.25deg); }
          }

          @keyframes sunlit-book-sway-b {
            0%, 100% { transform: translate3d(1px, 1px, 0) rotate(0.35deg); }
            46% { transform: translate3d(calc(-6px - var(--sunlit-cursor-wind) * 4px), 2px, 0) rotate(calc(-0.7deg - var(--sunlit-cursor-wind) * .6deg)); }
            78% { transform: translate3d(3px, -1px, 0) rotate(0.2deg); }
          }

          @keyframes sunlit-book-sway-c {
            0%, 100% { transform: translate3d(0, -1px, 0) rotate(-0.2deg); }
            50% { transform: translate3d(calc(3px + var(--sunlit-cursor-wind) * 3px), 2px, 0) rotate(0.5deg); }
            82% { transform: translate3d(-2px, -2px, 0) rotate(calc(-0.55deg - var(--sunlit-cursor-wind) * .5deg)); }
          }

          .sunlit-book-leaf {
            animation-duration: calc(9s - var(--sunlit-wind) * 2s);
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
            transform-box: fill-box;
            transform-origin: center;
            will-change: transform;
          }

          .sunlit-book-leaf-a { animation-name: sunlit-book-sway-a; animation-delay: -2.2s; }
          .sunlit-book-leaf-b { animation-name: sunlit-book-sway-b; animation-delay: -5.4s; animation-duration: calc(11s - var(--sunlit-wind) * 2s); }
          .sunlit-book-leaf-c { animation-name: sunlit-book-sway-c; animation-delay: -7.1s; animation-duration: calc(12.6s - var(--sunlit-wind) * 2s); }

          @keyframes sunlit-book-drift {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
            33% { transform: translate3d(13px, 7px, 0) rotate(0.6deg); }
            66% { transform: translate3d(-9px, -5px, 0) rotate(-0.5deg); }
          }

          .sunlit-book-canopy {
            animation: sunlit-book-drift calc(20s - var(--sunlit-wind) * 4s) ease-in-out infinite;
            transform-origin: 60% 30%;
            will-change: transform;
          }

          @keyframes sunlit-book-ambient-drift {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
            45% { transform: translate3d(-14px, 8px, 0) rotate(0.5deg); }
            72% { transform: translate3d(10px, -6px, 0) rotate(-0.4deg); }
          }

          .sunlit-book-ambient {
            animation: sunlit-book-ambient-drift calc(26s - var(--sunlit-wind) * 4s) ease-in-out infinite;
            will-change: transform;
          }

          .sunlit-book-paper-grain {
            background-image:
              radial-gradient(circle at 18% 14%, rgba(14,16,17,0.05) 0 1px, transparent 1.4px),
              radial-gradient(circle at 52% 38%, rgba(14,16,17,0.036) 0 1px, transparent 1.6px),
              radial-gradient(circle at 78% 62%, rgba(14,16,17,0.04) 0 1px, transparent 1.5px);
            background-size: 18px 18px, 23px 23px, 29px 29px;
          }

          .sunlit-book-shadow-field,
          .sunlit-book-shadow-band,
          .sunlit-book-paper-grain {
            -webkit-mask-image: radial-gradient(ellipse at center, #000 0%, #000 52%, transparent 78%);
            mask-image: radial-gradient(ellipse at center, #000 0%, #000 52%, transparent 78%);
          }

          .sunlit-book-scroll {
            scrollbar-width: none;
          }

          .sunlit-book-scroll::-webkit-scrollbar {
            display: none;
          }

          @media (prefers-reduced-motion: reduce) {
            .sunlit-book-leaf,
            .sunlit-book-canopy,
            .sunlit-book-ambient { animation: none; }
          }
        `}
      </style>

      <AmbientSunShadow />

      <svg
        aria-hidden="true"
        className="sunlit-book-canopy pointer-events-none absolute -inset-[18%] z-[1] h-[136%] w-[136%] text-[var(--jitter-ink)]/55 opacity-[.14] mix-blend-multiply blur-[10px]"
        viewBox="0 0 1200 780"
        preserveAspectRatio="none"
      >
        <LeafShadow x={735} y={160} rotate={-24} scale={3.1} opacity={0.9} sway="a" />
        <LeafShadow x={930} y={290} rotate={16} scale={2.55} opacity={0.72} sway="b" />
        {density > 1 ? (
          <>
            <LeafShadow x={515} y={475} rotate={-42} scale={2.4} opacity={0.58} sway="c" />
            <LeafShadow x={1085} y={90} rotate={-12} scale={2.05} opacity={0.5} sway="a" />
          </>
        ) : null}
        {density > 2 ? (
          <>
            <LeafShadow x={160} y={220} rotate={22} scale={2.2} opacity={0.38} sway="b" />
            <LeafShadow x={820} y={650} rotate={-8} scale={2.1} opacity={0.46} sway="c" />
          </>
        ) : null}
      </svg>

      <div className="sunlit-book-scroll relative z-10 mx-auto max-h-[72vh] max-w-xl overflow-y-auto px-8 py-16 sm:py-20">
        {children ?? <PlaceholderText />}
      </div>
    </div>
  );
}
