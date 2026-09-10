"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BlossomLightProps = {
  /** 0–100. Where the light starts; the slider owns it from then on. */
  defaultBrightness?: number;
  /** The line under the number. */
  label?: string;
  /**
   * Set by the gallery card: works the light on its own, so a tile nobody is
   * touching still shows what the control does.
   */
  loop?: boolean;
  className?: string;
};

const SKIN = {
  /** Apple's near-black and secondary gray. */
  ink: "#1D1D1F",
  muted: "#86868B",
  glow: "#FFF2D4",
  /** The window: warm daylight, and the deep slate the silhouette is cut from. */
  sky: "#F8EFC4",
  bough: "#3A4059",
  /** The part of the window the light has not reached yet. Cooler and deeper
   *  than the lit sky, so it reads as dusk rather than as an empty trough. */
  veil: "#C0BEC6",
  shadow: "#2C2C32",
};

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Node and the browser are not required to round Math.cos identically, and
 * React diffs the serialised attribute — so anything trigonometric that
 * reaches the DOM is pinned to three places first.
 */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Eight unit rays at 45°, the way sun.max is drawn. */
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return { dx: r3(Math.cos(a)), dy: r3(Math.sin(a)) };
});

/** Five petals to a blossom. */
const PETALS = Array.from({ length: 5 }, (_, i) => {
  const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
  return { dx: r3(Math.cos(a) * 2.5), dy: r3(Math.sin(a) * 2.5) };
});

/**
 * The bough inside the window, hand-placed rather than grown: at 116px across
 * a recursive generator only ever makes mush, and this wants to read as one
 * deliberate branch the way the reference posters do. First path is the main
 * limb, the second the perch, the rest are offshoots.
 */
const BOUGH: [string, number][] = [
  ["M -8 34 C 20 52 40 84 52 122 C 60 148 64 174 66 196", 3.2],
  ["M 24 186 C 46 180 74 181 100 187", 1.9],
  ["M 44 96 C 60 100 76 96 92 84", 2],
  ["M 56 140 C 46 148 34 152 20 150", 1.8],
  ["M 30 70 C 34 80 34 90 30 100", 1.5],
];

/** [x, y, scale] — each opens into a five-petal rosette. */
const BLOSSOMS: [number, number, number][] = [
  [6, 40, 1.2],
  [20, 58, 1.4],
  [30, 76, 1.1],
  [30, 100, 1.2],
  [44, 96, 1.5],
  [62, 99, 1.2],
  [78, 92, 1.35],
  [92, 84, 1.1],
  [52, 122, 1.3],
  [36, 132, 1.15],
  [20, 150, 1.3],
  [66, 196, 1],
  [78, 198, 1.2],
  [96, 188, 1.05],
];

/** Perched, long-tailed, facing left. */
function Bird({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 13.6 6.4 L 25.4 1.4 L 26.2 3.7 L 15.4 9.4 Z" />
      <ellipse cx="10.2" cy="7" rx="5.6" ry="3.9" transform="rotate(-10 10.2 7)" />
      <circle cx="4.9" cy="3.9" r="2.8" />
      <path d="M 2.6 3.3 L -1.4 4.6 L 2.6 5.7 Z" />
      <path
        d="M 8.9 10.3 L 8.5 13.1 M 11.9 10.4 L 12.5 13.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </g>
  );
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * A brightness slider whose fill is a window rather than a bar: warm daylight
 * with a blossoming bough standing in it, and a veil over whatever the light
 * has not reached yet. The level is not a bar filling up, it is a sunrise —
 * raising the brightness walks the light up the branch.
 *
 * The light it sets is the light in the room, so the window throws a real
 * shadow on the wall behind it. Turning the brightness up draws that shadow
 * tighter and darker, which is what makes the control visibly govern the
 * thing that drew it.
 */
export function BlossomLight({
  defaultBrightness = 38,
  label = "Brightness",
  loop,
  className,
}: BlossomLightProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const readoutRef = React.useRef<HTMLParagraphElement>(null);

  const brightness = React.useRef(clamp01(defaultBrightness / 100));
  /** Once the slider has been touched the light stops breathing on its own. */
  const touched = React.useRef(false);

  /** The number, the track and the announced value all come off one write, so
   *  they cannot drift apart mid-drag. */
  const writeBrightness = React.useCallback((value: number) => {
    const stage = stageRef.current;
    if (stage) stage.style.setProperty("--q-b", value.toFixed(4));
    const percent = Math.round(value * 100);
    if (readoutRef.current) readoutRef.current.textContent = `${percent}%`;
    const slider = sliderRef.current;
    if (slider) {
      slider.setAttribute("aria-valuenow", String(percent));
      slider.setAttribute("aria-valuetext", `${percent}%`);
    }
  }, []);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    writeBrightness(brightness.current);

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      stage.style.setProperty("--q-hx", "-0.5");
      return;
    }

    let raf = 0;
    const mountedAt = performance.now();

    const frame = (now: number) => {
      const t = (now - mountedAt) / 1000;
      // The light drifts rather than sits, so the shadow is never quite the
      // same shape twice. It stays off to one side: straight overhead, a cast
      // shadow has no direction to read.
      stage.style.setProperty("--q-hx", (Math.sin(t * 0.16) * 0.28 - 0.5).toFixed(4));
      if (loop && !touched.current) {
        brightness.current = 0.5 + 0.34 * Math.sin(t * 0.4);
        writeBrightness(brightness.current);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [loop, writeBrightness]);

  /** Vertical: the head of the window is full light, the foot is none. */
  const setFromPointer = React.useCallback(
    (clientY: number) => {
      const slider = sliderRef.current;
      if (!slider) return;
      const box = slider.getBoundingClientRect();
      if (box.height === 0) return;
      touched.current = true;
      brightness.current = clamp01(1 - (clientY - box.top) / box.height);
      writeBrightness(brightness.current);
    },
    [writeBrightness]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setFromPointer(event.clientY);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowUp" || event.key === "ArrowRight"
        ? 0.05
        : event.key === "ArrowDown" || event.key === "ArrowLeft"
          ? -0.05
          : event.key === "Home"
            ? -1
            : event.key === "End"
              ? 1
              : null;
    if (step === null) return;
    event.preventDefault();
    touched.current = true;
    brightness.current = clamp01(brightness.current + step);
    writeBrightness(brightness.current);
  };

  const startPercent = Math.round(clamp01(defaultBrightness / 100) * 100);

  return (
    <div
      className={cn("flex w-full items-center justify-center p-12", className)}
      style={{ fontFamily: SYSTEM_FONT }}
    >
      <div
        ref={stageRef}
        className="relative isolate"
        style={
          {
            color: SKIN.ink,
            "--q-b": clamp01(defaultBrightness / 100).toFixed(4),
            "--q-hx": "-0.5",
          } as React.CSSProperties
        }
      >
        {/* Light spilling out onto the wall. No panel and no edges: the only
            thing the brightness lights is the air around the window. */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: "-75%",
            right: "-75%",
            top: "-35%",
            bottom: "-35%",
            background: `radial-gradient(50% 50% at 50% 50%, ${SKIN.glow}, rgba(255,242,212,0) 72%)`,
            transform: "translateX(calc(var(--q-hx) * 10%))",
            opacity: "calc(0.1 + var(--q-b) * 0.8)",
          }}
        />

        <div className="relative flex flex-col items-center">
          <div className="relative">
            {/* What the window throws on the wall behind it. The lean follows
                the light, and a stronger light draws a tighter, darker edge —
                a dim lamp has a wide penumbra, a bright one barely any. */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                backgroundColor: SKIN.shadow,
                transformOrigin: "50% 100%",
                transform: [
                  "translate(calc(var(--q-hx) * -9%), 5%)",
                  "skewX(calc(var(--q-hx) * -15deg))",
                  "scaleY(1.05)",
                ].join(" "),
                filter: "blur(calc(15px - var(--q-b) * 6px))",
                opacity: "calc(0.13 + var(--q-b) * 0.2)",
              }}
            />

            <div
              ref={sliderRef}
              role="slider"
              tabIndex={0}
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={startPercent}
              aria-valuetext={`${startPercent}%`}
              aria-orientation="vertical"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              className="relative h-[240px] w-[116px] cursor-ns-resize overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={
                {
                  backgroundColor: SKIN.sky,
                  touchAction: "none",
                  "--tw-ring-color": SKIN.bough,
                  "--tw-ring-offset-color": SKIN.glow,
                } as React.CSSProperties
              }
            >
              <svg
                viewBox="0 0 116 240"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <g
                  fill="none"
                  stroke={SKIN.bough}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {BOUGH.map(([d, width], i) => (
                    <path key={i} d={d} strokeWidth={width} />
                  ))}
                </g>
                <g fill={SKIN.bough} color={SKIN.bough}>
                  {BLOSSOMS.map(([bx, by, bs], i) => (
                    <g key={i}>
                      {PETALS.map((petal, j) => (
                        <circle
                          key={j}
                          cx={bx + petal.dx * bs}
                          cy={by + petal.dy * bs}
                          r={2.1 * bs}
                        />
                      ))}
                      <circle cx={bx} cy={by} r={1.9 * bs} />
                    </g>
                  ))}
                  <Bird x={34} y={173} s={0.66} />
                </g>
                <g
                  fill="none"
                  stroke={SKIN.bough}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <circle cx="58" cy="215" r="5.6" />
                  {SUN_RAYS.map((ray, i) => (
                    <line
                      key={i}
                      x1={58 + ray.dx * 8.2}
                      y1={215 + ray.dy * 8.2}
                      x2={58 + ray.dx * 10.9}
                      y2={215 + ray.dy * 10.9}
                    />
                  ))}
                </g>
              </svg>
              {/* Everything above the light line is still in shadow — the same
                  bough, unlit, rather than an empty trough. */}
              <div
                className="absolute inset-x-0 top-0"
                style={{
                  height: "calc((1 - var(--q-b)) * 100%)",
                  backgroundColor: SKIN.veil,
                  opacity: 0.85,
                }}
              />
            </div>
          </div>

          <p
            ref={readoutRef}
            className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
          >
            {startPercent}%
          </p>
          <p className="mt-2 text-[13px] leading-none" style={{ color: SKIN.muted }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
