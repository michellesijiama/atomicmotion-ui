"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BlossomLightProps = {
  /** 0–100. Where the light starts. Until the slider is touched it keeps
   *  climbing and falling on its own; after that it stays where it is put. */
  defaultBrightness?: number;
  /** The line under the number. */
  label?: string;
  /** 0–100, cool daylight to candle amber. */
  defaultWarmth?: number;
  /**
   * The wall behind everything: leaf shadow on white plaster ships with the
   * component at this path; point it anywhere else you like.
   */
  src?: string;
  /** Accepted for the gallery card; this control has no motion of its own. */
  loop?: boolean;
  className?: string;
};

const SKIN = {
  ink: "#1D1D1F",
  /** Secondary text. Darker than Apple's own #86868B, which only reaches
   *  3.3:1 on this paper; this clears 4.5:1 at the card's 11px. */
  muted: "#636366",
  /**
   * Apple's high-contrast system blue rather than the everyday #007AFF, which
   * only manages 3.5:1 on this paper. This one clears WCAG AA for normal text
   * on the chip (6.6:1) and on the page (7.6:1).
   */
  blue: "#0040DD",
  /** The paper the shadow falls on — matched to the photograph's own ground,
   *  so the light line is a change of light, not a change of material. */
  paper: "#F4F0E7",
  /** The spill on the wall, at the cool and warm ends of the lamp. */
  glowCool: "#DCE8FF",
  glowWarm: "#FFD9A6",
  /** The tone track, end to end. Deep enough that the track reads against
   *  the frosted card (~3:1 at the cool end) and a black thumb reads against
   *  either end at 4.8:1 or better — the pale pair it replaced put a white
   *  thumb on it at 1.3:1. */
  cool: "#5F7EC6",
  warm: "#D97C16",
};

// Reads the host's Manrope if it exposes one (the gallery does, via next/font),
// falls back to an installed Manrope, then to the system stack.
const FONT = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";



/** Lines in the pill, over its 200px. The first is the pill's rounded foot
 *  itself, 30px deep, so the grid starts at the edge instead of above it;
 *  the rest are 6px bars with 4px between. */
const LINE_COUNT = 18;

/** The panel's true size. It is scaled down to fit whatever it is put in. */
const PANEL = 420;

/** sun.max, eight unit rays at 45°, pinned to three places so Node and the
 *  browser serialise the same numbers. */
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  return { dx: r3(Math.cos(a)), dy: r3(Math.sin(a)) };
});

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Where Adaptive takes the light: the level outside, as a fraction. */
const OUTSIDE = 0.62;
/** And the tone it picks: overcast daylight, on the cool side. */
const OUTSIDE_TONE = 0.3;
/** How long the shown value takes to settle on where it has been sent, in
 *  ms. Every change goes through this — a drag, an arrow key, the cycle — so
 *  the light never jumps, it always glides. */
const SETTLE_TAU = 150;

/**
 * A brightness slider whose fill is a shadow rather than a bar: blossom
 * shadow on paper, revealed from the foot of the pill by a soft
 * line of light that climbs on its own — as if the sun were finding the pill
 * and the shadow growing up it. Drag or arrow it and the light stays where
 * you put it.
 */
export function BlossomLight({
  defaultBrightness = 72,
  defaultWarmth = 30,
  label = "Brightness",
  src = "/textures/wall-shadow.jpg",
  className,
}: BlossomLightProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const hostRef = React.useRef<HTMLDivElement>(null);
  const wallRef = React.useRef<HTMLDivElement>(null);
  const windId = `wind-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [still, setStill] = React.useState(false);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const readoutRef = React.useRef<HTMLParagraphElement>(null);

  /** Where the light has been sent, and where it is right now. */
  const target = React.useRef(clamp01(defaultBrightness / 100));
  const shown = React.useRef(clamp01(defaultBrightness / 100));
  /** Whether the light follows the day on its own. Off the moment the
   *  brightness is touched, back on from the Daylight toggle. */
  const [daylight, setDaylight] = React.useState(true);
  const daylightRef = React.useRef(true);
  const reduced = React.useRef(false);

  const warmth = React.useRef(clamp01(defaultWarmth / 100));
  const warmthRef = React.useRef<HTMLDivElement>(null);

  const writeWarmth = React.useCallback((value: number) => {
    const stage = stageRef.current;
    if (stage) stage.style.setProperty("--q-w", value.toFixed(4));
    // 2700K is candle, 6500K is daylight; the track runs from one to the other.
    const kelvin = Math.round((6500 - value * 3800) / 100) * 100;
    const track = warmthRef.current;
    if (track) {
      track.setAttribute("aria-valuenow", String(Math.round(value * 100)));
      track.setAttribute("aria-valuetext", `${kelvin} kelvin`);
    }
  }, []);

  /**
   * The touch-point that stands in for the mouse over the panel, so it reads
   * as a phone screen. Driven straight from pointer events, no state: one
   * transform write per move. Hidden on real touch devices, where there is
   * already a finger.
   */
  const touchRef = React.useRef<HTMLDivElement>(null);
  const coarse = React.useRef(false);

  const moveTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    const dot = touchRef.current;
    if (!dot || coarse.current) return;
    const el = event.currentTarget;
    const box = el.getBoundingClientRect();
    // A host may scale this component (the gallery does); the dot is laid out
    // in the component's own pixels, so map the pointer back through that.
    const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
    const x = (event.clientX - box.left) / scale;
    const y = (event.clientY - box.top) / scale;
    dot.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(var(--q-press, 1))`;
    dot.style.opacity = "1";
  };
  const hideTouch = () => {
    if (touchRef.current) touchRef.current.style.opacity = "0";
  };
  const pressTouch = (down: boolean) => {
    touchRef.current?.style.setProperty("--q-press", down ? "0.8" : "1");
  };



  /** The number, the fill and the announced value all come off one write, so
   *  they cannot drift apart mid-drag. */
  const writeBrightness = React.useCallback((value: number) => {
    const stage = stageRef.current;
    if (stage) {
      stage.style.setProperty("--q-b", value.toFixed(4));
      // The pill fills line by line: the level snaps to whole lines here so
      // the bars step rather than slide, while everything else stays smooth.
      stage.style.setProperty("--q-lines", (Math.round(value * LINE_COUNT) / LINE_COUNT).toFixed(4));
      // Below a third the wall goes dark under the pill and black type loses
      // its ground, so the readout and the sun turn white there.
      stage.style.setProperty("--q-fg", value < 0.35 ? "#FFFFFF" : SKIN.ink);
      // Below the same third the cards go dark too: the tone card to a dark
      // frost with white type, and the Adaptive card deeper, since against a
      // wall that dark its dusk tint had fallen to 1.8:1 — the card's edge
      // was gone. Deeper black clears 3:1; brighter would have meant white.
      stage.style.setProperty("--q-card", value < 0.35 ? "rgba(28,28,32,0.78)" : "rgba(244,240,231,0.72)");
      stage.style.setProperty("--q-dusk", value < 0.35 ? "0.22" : "1");
    }
    const percent = Math.round(value * 100);
    if (readoutRef.current) readoutRef.current.textContent = `${percent}%`;
    const slider = sliderRef.current;
    if (slider) {
      slider.setAttribute("aria-valuenow", String(percent));
      slider.setAttribute("aria-valuetext", `${percent}%`);
    }
  }, []);

  /** Sends the light somewhere. With motion reduced it is simply there. */
  const send = React.useCallback(
    (value: number) => {
      target.current = clamp01(value);
      if (reduced.current) {
        shown.current = target.current;
        writeBrightness(shown.current);
      }
    },
    [writeBrightness]
  );

  // Scale the panel to the space it has, so the whole thing is always in
  // view without scrolling.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.min(1, (host.clientWidth - 24) / PANEL, (host.clientHeight - 24) / PANEL);
      fit.style.transform = `scale(${Math.max(0.3, scale).toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const setDaylightMode = React.useCallback(
    (on: boolean) => {
      daylightRef.current = on;
      setDaylight(on);
      if (on) {
        send(OUTSIDE);
        warmth.current = OUTSIDE_TONE;
        writeWarmth(OUTSIDE_TONE);
      }
    },
    [send, writeWarmth]
  );

  React.useEffect(() => {
    writeBrightness(shown.current);
    writeWarmth(warmth.current);

    reduced.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    coarse.current =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    setStill(reduced.current);
    if (reduced.current) return;

    let raf = 0;
    let last = performance.now();

    const t0 = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - last, 80);
      last = now;

      // The wall itself leans a little with the wind, on two slow beats that
      // never line up.
      const wall = wallRef.current;
      if (wall) {
        const t = (now - t0) / 1000;
        wall.style.transform = `translate(${(Math.sin(t * 0.23) * 12).toFixed(2)}px, ${(Math.sin(t * 0.14 + 1.7) * 7).toFixed(2)}px) rotate(${(Math.sin(t * 0.11 + 0.6) * 0.5).toFixed(3)}deg) scale(${(1.1 + Math.sin(t * 0.09) * 0.02).toFixed(4)})`;
      }

      // Ease the shown value onto the target. An exponential only ever
      // approaches, so snap the last fraction rather than hover under it.
      let next = shown.current + (target.current - shown.current) * (1 - Math.exp(-dt / SETTLE_TAU));
      if (Math.abs(target.current - next) < 0.0005) next = target.current;
      if (next !== shown.current) {
        shown.current = next;
        writeBrightness(next);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [writeBrightness, writeWarmth]);

  /** Vertical: the head of the pill is full light, the foot is none. */
  const setFromPointer = React.useCallback(
    (clientY: number) => {
      const slider = sliderRef.current;
      if (!slider) return;
      const box = slider.getBoundingClientRect();
      if (box.height === 0) return;
      setDaylightMode(false);
      send(1 - (clientY - box.top) / box.height);
    },
    [send, setDaylightMode]
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
    setDaylightMode(false);
    send(target.current + step);
  };

  /** Horizontal: cool at the left, warm at the right. */
  const setWarmthFromPointer = React.useCallback(
    (clientX: number) => {
      const track = warmthRef.current;
      if (!track) return;
      const box = track.getBoundingClientRect();
      if (box.width === 0) return;
      warmth.current = clamp01((clientX - box.left) / box.width);
      writeWarmth(warmth.current);
    },
    [writeWarmth]
  );

  const onWarmthDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setWarmthFromPointer(event.clientX);
  };
  const onWarmthMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setWarmthFromPointer(event.clientX);
  };
  const onWarmthUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const onWarmthKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 0.05
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -0.05
          : event.key === "Home"
            ? -1
            : event.key === "End"
              ? 1
              : null;
    if (step === null) return;
    event.preventDefault();
    warmth.current = clamp01(warmth.current + step);
    writeWarmth(warmth.current);
  };

  const startPercent = Math.round(clamp01(defaultBrightness / 100) * 100);
  const startWarmth = Math.round(clamp01(defaultWarmth / 100) * 100);
  const startKelvin = Math.round((6500 - clamp01(defaultWarmth / 100) * 3800) / 100) * 100;
  const startLines = Math.round(clamp01(defaultBrightness / 100) * LINE_COUNT) / LINE_COUNT;

  /** A frosted card: the wallpaper shows through it, faintly. */
  const card: React.CSSProperties = {
    backgroundColor: "var(--q-card)",
    transition: "background-color 200ms ease",
    backdropFilter: "blur(14px) saturate(1.3)",
    WebkitBackdropFilter: "blur(14px) saturate(1.3)",
  };

  return (
    <div
      ref={hostRef}
      className={cn("flex h-full min-h-[420px] w-full items-center justify-center", className)}
      style={{ fontFamily: FONT }}
    >
      <div
        ref={fitRef}
        className="relative shrink-0"
        style={{ width: PANEL, height: PANEL, transformOrigin: "50% 50%" }}
      >
      {/* The panel: a square of wall, the controls in the middle of it. */}
      <div
        ref={stageRef}
        className="absolute inset-0 isolate overflow-hidden rounded-[36px]"
        onPointerMove={moveTouch}
        onPointerEnter={moveTouch}
        onPointerLeave={hideTouch}
        onPointerDown={() => pressTouch(true)}
        onPointerUp={() => pressTouch(false)}
        onPointerCancel={() => pressTouch(false)}
        style={
          {
            color: SKIN.ink,
            cursor: "none",
            backgroundColor: SKIN.paper,
            "--q-b": clamp01(defaultBrightness / 100).toFixed(4),
            "--q-lines": startLines.toFixed(4),
            "--q-fg": clamp01(defaultBrightness / 100) < 0.35 ? "#FFFFFF" : SKIN.ink,
            "--q-card": clamp01(defaultBrightness / 100) < 0.35 ? "rgba(28,28,32,0.78)" : "rgba(244,240,231,0.72)",
            "--q-dusk": clamp01(defaultBrightness / 100) < 0.35 ? "0.22" : "1",
            "--q-w": clamp01(defaultWarmth / 100).toFixed(4),
          } as React.CSSProperties
        }
      >
        {/*
          The wallpaper: blossom shadow on the wall. Brightness is exactly
          that — the whole picture dims and lifts, the way a room does.
          Warmth cross-fades a second copy of the same picture pushed to
          amber, so the shadow goes from blue to gold without passing through
          anything else on the way. Plain img on purpose — this file is
          copied into projects that are not Next.
        */}
        {/*
          Wind. A turbulence field displaces the wallpaper and drifts slowly,
          so the leaf shadows ripple the way they do when the tree outside
          moves. It lives on the same element as the dimming, one filter.
        */}
        <svg className="absolute h-0 w-0" aria-hidden="true">
          <defs>
            <filter id={windId} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="4" result="noise">
                {!still && (
                  <animate
                    attributeName="baseFrequency"
                    values="0.006 0.009;0.012 0.005;0.007 0.011;0.006 0.009"
                    dur="10s"
                    repeatCount="indefinite"
                  />
                )}
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <div
          ref={wallRef}
          className="pointer-events-none absolute inset-0"
          style={{
            transform: "scale(1.1)",
            filter: `url(#${windId}) brightness(calc(0.66 + var(--q-b) * 0.34)) saturate(calc(1.12 - var(--q-b) * 0.12))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-bottom select-none"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-bottom select-none"
            style={{
              filter: "sepia(0.92) saturate(1.3) hue-rotate(-4deg) brightness(1.03)",
              // Squared, so the middle of the slider is still mostly blue and
              // the two never sit half-mixed as grey.
              opacity: "calc(var(--q-w) * var(--q-w))",
            }}
          />
        </div>
        {/* Turning the light down is dusk, not grey: a blue-violet wash that
            deepens as the brightness falls, on top of the dimming above. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: "#2E3260",
            mixBlendMode: "multiply",
            opacity: "calc((1 - var(--q-b)) * 0.5)",
          }}
        />

        {/* The controls, dead centre. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-start gap-[10px]">
            <div className="flex flex-col items-center">
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
                className="relative h-[200px] w-[72px] overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={
                  {
                    backgroundColor: "rgba(255,255,255,0.22)",
                    backdropFilter: "blur(14px) saturate(1.3)",
                    WebkitBackdropFilter: "blur(14px) saturate(1.3)",
                    touchAction: "none",
                    "--tw-ring-color": SKIN.blue,
                    "--tw-ring-offset-color": SKIN.paper,
                  } as React.CSSProperties
                }
              >
                {/* Every line is drawn edge to edge and square-ended; the pill's
                    own curve clips them, so the stack fills the shape. Lit
                    lines are white, the rest sit grey in the glass, and each
                    lights when the level reaches it. */}
                <div className="absolute inset-0 flex flex-col-reverse justify-between">
                  {Array.from({ length: LINE_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className={i === 0 ? "relative h-[30px] w-full" : "relative h-[6px] w-full"}
                      style={{ backgroundColor: "rgba(0,0,0,0.13)" }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.95)",
                          opacity: `clamp(0, calc(var(--q-lines) * ${LINE_COUNT} - ${i}), 1)`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute bottom-[14px] left-1/2 w-[22px] -translate-x-1/2 transition-colors duration-200"
                  fill="none"
                  stroke="var(--q-fg)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4.2" />
                  {SUN_RAYS.map((r, i) => (
                    <line key={i} x1={12 + r.dx * 7} y1={12 + r.dy * 7} x2={12 + r.dx * 9.6} y2={12 + r.dy * 9.6} />
                  ))}
                </svg>
                <p
                  ref={readoutRef}
                  className="pointer-events-none absolute inset-x-0 top-[16px] text-center text-[16px] font-semibold leading-none tracking-[-0.02em] tabular-nums transition-colors duration-200"
                  style={{ color: "var(--q-fg)" }}
                >
                  {startPercent}%
                </p>
              </div>
            </div>

            <div className="relative h-[200px] w-[168px]">
              {/* Adjust Tone. Folds away while Adaptive is deciding the tone. */}
              <div
                className="relative overflow-hidden rounded-[22px] transition-[height,opacity,margin] duration-300 ease-out"
                style={{ ...card, height: daylight ? 0 : 95, opacity: daylight ? 0 : 1, marginBottom: daylight ? 0 : 10 }}
                aria-hidden={daylight}
              >
              <div className="relative h-[95px] p-3.5">
                <p className="text-[13px] font-semibold leading-none transition-colors duration-200" style={{ color: "var(--q-fg)" }}>
                  Adjust Tone
                </p>
                <div
                  ref={warmthRef}
                  role="slider"
                  tabIndex={daylight ? -1 : 0}
                  aria-label="Tone"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={startWarmth}
                  aria-valuetext={`${startKelvin} kelvin`}
                  aria-orientation="horizontal"
                  onPointerDown={onWarmthDown}
                  onPointerMove={onWarmthMove}
                  onPointerUp={onWarmthUp}
                  onPointerCancel={onWarmthUp}
                  onKeyDown={onWarmthKey}
                  className="absolute inset-x-3.5 bottom-3.5 h-[24px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={
                    {
                      background: `linear-gradient(90deg, ${SKIN.cool}, ${SKIN.warm})`,
                      touchAction: "none",
                      "--tw-ring-color": SKIN.blue,
                      "--tw-ring-offset-color": SKIN.paper,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="pointer-events-none absolute top-1/2 h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: "calc(10px + var(--q-w) * (100% - 20px))",
                      backgroundColor: SKIN.ink,
                    }}
                  />
                </div>
              </div>
              </div>

              {/* The dark card wears a dusk sky — mauve, peach, sand, lavender —
                  laid over black at a low opacity, so it stays dark and still
                  carries the room's tone. White on it stays well past 4.5:1. */}
              <div
                className="relative overflow-hidden rounded-[22px] p-3.5 transition-[height] duration-300 ease-out"
                style={{ height: daylight ? 200 : 95, backgroundColor: "#141416" }}
              >
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(201,169,184,0.46) 0%, rgba(233,201,180,0.42) 34%, rgba(231,211,166,0.40) 60%, rgba(185,175,194,0.46) 100%)",
                    opacity: "var(--q-dusk)",
                  }}
                />
                <div className="flex items-center gap-1.5">
                  {/* Sun behind cloud. */}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[15px] w-[15px]"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="8.5" r="3.2" />
                    <path d="M9 2.5v1.4M3 8.5h1.4M4.8 4.3l1 1M13.2 4.3l-1 1" />
                    <path d="M8.5 19.5h9.2a3.3 3.3 0 0 0 .4-6.57 4.6 4.6 0 0 0-8.8-1.1A3.85 3.85 0 0 0 8.5 19.5z" />
                  </svg>
                  <p className="text-[13px] font-semibold leading-none text-white">Adaptive</p>
                </div>
                <p className="mt-1.5 text-[12px] leading-none" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Follows the weather
                </p>
                <div
                  className="mt-3 transition-opacity duration-300"
                  style={{ opacity: daylight ? 1 : 0 }}
                  aria-hidden={!daylight}
                >
                  <div className="-mx-3.5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
                  {(
                    [
                      ["cloud", "18° Overcast"],
                      ["sun", "Daylight"],
                      ["sunset", "19:42"],
                    ] as const
                  ).map(([icon, text]) => (
                    <div key={icon} className="flex h-[26px] items-center gap-2 text-[12px] leading-none text-white">
                      <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] shrink-0" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.85 }}>
                        {icon === "cloud" && <path d="M7 18.5h9.5a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.5 9.2 4.7 4.7 0 0 0 7 18.5z" />}
                        {icon === "sun" && <><circle cx="12" cy="12" r="4" /><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" /></>}
                        {icon === "sunset" && <><path d="M4 17h16M6 20h12" /><path d="M7 13a5 5 0 0 1 10 0" /><path d="M12 3v3M4.5 8l1.5 1.5M19.5 8 18 9.5" /></>}
                      </svg>
                      <span>{text}</span>
                    </div>
                  ))}
                  <div className="-mx-3.5 h-px" style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={daylight}
                  aria-label="Adaptive mode"
                  onClick={() => setDaylightMode(!daylight)}
                  className="absolute bottom-3.5 right-3.5 h-[26px] w-[44px] rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={
                    {
                      backgroundColor: daylight ? SKIN.blue : "rgba(255,255,255,0.18)",
                      "--tw-ring-color": "#FFFFFF",
                      "--tw-ring-offset-color": "#141416",
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="absolute top-[3px] h-[20px] w-[20px] rounded-full transition-[left] duration-200"
                    style={{
                      left: daylight ? "21px" : "3px",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={touchRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 h-9 w-9 rounded-full"
          style={{
            opacity: 0,
            backgroundColor: "rgba(60,60,67,0.28)",
            transition: "opacity 150ms ease, transform 60ms ease-out",
          }}
        />
      </div>
      </div>
    </div>
  );
}
