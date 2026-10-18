"use client";

/*
 * UI Walkthrough: a looping, scripted product walkthrough for a portfolio case study. Words sit on
 * the left, an iPhone on the right, and each step of the script pushes the camera in, taps a
 * control, drags a before and after slider or labels a part of the screen.
 *
 * Make it yours
 * 1. Draw your screen on a 280 x 600 canvas as a function of `ctx`, and pass it as `children`.
 * 2. Put data-walk="<id>" on anything the script taps or points at.
 * 3. Write your own `steps`, one per chapter, and read their progress in your screen by name.
 *
 *   <UIWalkthrough
 *     steps={[
 *       { title: "Plan your day", caption: "Everything due today in one list", duration: 3.4 },
 *       { title: "Add a task", caption: "One tap from anywhere", duration: 4, focus: { y: 540, zoom: 1.4 }, tap: "add" },
 *     ]}
 *   >
 *     {(ctx) => <MyScreen added={ctx.tapped("add")} squeeze={ctx.press("add")} />}
 *   </UIWalkthrough>
 *
 * Everything under "Demo content" at the end of this file is the example screen and script. Replace
 * or delete it; nothing above it needs to change.
 */

import * as React from "react";

import { cubicBezier, useReducedMotion } from "framer-motion";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------------- */
/* Types                                                                      */
/* ------------------------------------------------------------------------- */

export type WalkthroughStep = {
  /** A name your screen can read this step's progress by, with ctx.progress("<id>", …). */
  id?: string;
  title: string;
  caption?: string;
  /** Seconds this step holds the screen. Keep it above 1.5s so the camera can land. */
  duration: number;
  /** Push the camera in: the y on your 280 x 600 screen to centre, and how far to zoom. Omit to show the whole phone. */
  focus?: { y: number; zoom: number };
  /** The data-walk id of the control a finger taps in this step. */
  tap?: string;
  /** Seconds into the step when the tap lands. Defaults to 1.6, just after the camera settles. */
  tapAt?: number;
  /** A before and after: this older screen is laid over yours and a finger drags a divider across it. */
  compare?: (ctx: WalkthroughContext) => React.ReactNode;
  /** Ring a data-walk element and run a short line from it to a small label beside the phone. Pair it
   *  with `focus` to push in on the element first; the line waits for the camera to settle. */
  callout?: { target: string; label: string };
};

/** A step, by its index in the script, its id, or the data-walk id it taps. */
export type WalkthroughStepRef = number | string;

export type WalkthroughContext = {
  /** The index of the step on screen. */
  step: number;
  /** Seconds into that step (negative during the intro). */
  time: number;
  /** Eased 0–1 progress through a window of a step: 0 before that step, 1 once it has passed. */
  progress: (step: WalkthroughStepRef, start: number, duration: number) => number;
  /** Eased 0–1 progress of a step's tap, which then stays on, so a toggled state persists. */
  tapped: (step: WalkthroughStepRef) => number;
  /** How hard a data-walk control is being pressed right now, 0–1, for a press scale. */
  press: (id: string) => number;
  /** Entrance style for layer `n` of your screen as the phone lands, staggered top to bottom. */
  enter: (layer: number) => React.CSSProperties;
};

export type UIWalkthroughProps = {
  /** The script: one entry per chapter, played in order and looped. Defaults to the demo script. */
  steps?: WalkthroughStep[];
  /** Your screen, drawn on a 280 x 600 canvas. Mark what the script taps or points at with data-walk="<id>". Defaults to the demo feed. */
  children?: (ctx: WalkthroughContext) => React.ReactNode;
  /** Words beside the phone ("split"), above it ("stacked"), or whichever suits the space it is given ("auto"). */
  layout?: "auto" | "split" | "stacked";
  /** Accepted for the gallery card. The walkthrough always plays. */
  loop?: boolean;
  className?: string;
};

/* ------------------------------------------------------------------------- */
/* Look and layout                                                            */
/* ------------------------------------------------------------------------- */

/** Dark mode: a near-black stage with white titles, a near-black screen, and white kept for icons. */
const THEME = {
  stage: "#18181a",
  title: "#ffffff",
  caption: "#9a9a9f",
  screen: "#0d0e10",
  icon: "#ffffff",
  hairline: "inset 0 0 0 1px rgba(255,255,255,.07)",
  label: "#26272b",
};
const FONT = "var(--font-poppins, Poppins), Poppins, ui-sans-serif, system-ui, sans-serif";

/** The screen canvas your UI is drawn on. */
const PHONE_W = 280;
const PHONE_H = 600;

/** The words' column in the wide layout, and the gap the phone keeps from it however far the camera pushes in. */
const COPY_LEFT = 88;
const COPY_W = 320;
const COPY_GAP = 40;

/** Each layout's true stage size, phone centre and words box. The stage is scaled down to fit its host. */
const LAYOUTS = {
  split: {
    w: 960,
    h: 680,
    phone: { x: 660, y: 340 },
    viewTop: 0,
    copy: { left: COPY_LEFT, top: "50%", width: COPY_W, transform: "translateY(-50%)" },
  },
  stacked: {
    w: 600,
    h: 820,
    phone: { x: 300, y: 484 },
    // A push-in would slide the phone up under the words, so it is clipped below them.
    viewTop: 168,
    copy: { left: 48, right: 48, top: 60, textAlign: "center" },
  },
} satisfies Record<string, { w: number; h: number; phone: { x: number; y: number }; viewTop: number; copy: React.CSSProperties }>;
type Layout = (typeof LAYOUTS)[keyof typeof LAYOUTS];

/** The stacked viewport's soft top edge, where a pushed-in phone slides under the words. */
const VIEW_MASK = "linear-gradient(to bottom, transparent 0, #000 36px)";

/** The iPhone around the screen: a black titanium band and a thin bezel, just outside the canvas. */
const SCREEN_RADIUS = 44;
const BEZEL = 7;
const BAND = 4;
const TITANIUM = "linear-gradient(145deg, #4a4a4f 0%, #1b1b1e 26%, #3a3a3e 52%, #141416 76%, #2f2f33 100%)";

/* ------------------------------------------------------------------------- */
/* Timing                                                                     */
/* ------------------------------------------------------------------------- */

/** Seconds: the phone landing, the fade before the loop, one camera move, the default tap, a tap's state change. */
const INTRO = 1.4;
const OUTRO = 1.1;
const CAMERA = 1.3;
const TAP_AT = 1.6;
const TAP_LENGTH = 0.6;
/** Where the clock starts: the first step, settled, so the first paint is never empty. */
const REST = INTRO + 1.6;

/** A slow, even ease in and a long soft settle, so no move starts or stops abruptly. */
const cameraEase = cubicBezier(0.65, 0, 0.25, 1);
const outEase = cubicBezier(0.22, 1, 0.36, 1);
const fadeEase = cubicBezier(0.37, 0, 0.63, 1);

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** [time, value] keyframes. */
type Keys = readonly (readonly [number, number])[];

/** The value of a keyframe track at `t`, eased between neighbouring keys. */
function sample(keys: Keys, t: number, ease: (p: number) => number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t < t1) {
      const [t0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * ease(clamp01((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

/* ------------------------------------------------------------------------- */
/* The walkthrough                                                            */
/* ------------------------------------------------------------------------- */

type Box = { x: number; y: number; w: number; h: number };

export function UIWalkthrough({ steps = defaultWalkthroughSteps, children, layout = "auto", className }: UIWalkthroughProps) {
  const reduced = useReducedMotion() ?? false;
  const { t: clock, hostRef, fitRef, stage } = useStage(layout);
  const timeline = React.useMemo(() => buildTimeline(steps, stage), [steps, stage]);
  const t = clock % timeline.total;
  const screenRef = React.useRef<HTMLDivElement>(null);
  const ctx = makeContext(steps, timeline, t, reduced);
  const current = steps[ctx.step];
  const duration = current?.duration ?? 1;

  // Where this step's tapped control and callout target sit on the screen canvas. Measured once
  // per step; dividing by the rendered width undoes both the fit scale and the camera zoom.
  const [tapBox, setTapBox] = React.useState<Box | null>(null);
  const [calloutBox, setCalloutBox] = React.useState<Box | null>(null);
  React.useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    setTapBox(measure(screen, current?.tap));
    setCalloutBox(measure(screen, current?.callout?.target));
  }, [ctx.step, current?.tap, current?.callout?.target]);

  // Camera: its framing rules are applied once, in buildTimeline.
  const zoom = reduced ? 1 : sample(timeline.zoom, t, cameraEase);
  const land = reduced ? 1 : outEase(clamp01(t / 1.3));
  const lift = (reduced ? 0 : sample(timeline.shift, t, cameraEase)) + (1 - land) * 40;
  const phoneOpacity = reduced ? 1 : fadeEase(clamp01(t / 0.7));
  const outro = 1 - fadeEase(clamp01((t - (timeline.total - OUTRO)) / (OUTRO - 0.15)));
  /** A point on the screen canvas, in stage coordinates, as the camera has it right now. */
  const onStage = (x: number, y: number) => ({ x: stage.phone.x + (x - PHONE_W / 2) * zoom, y: stage.phone.y + (y - PHONE_H / 2) * zoom + lift });

  // How far the step's words have left, for the pieces that leave with them.
  const wordsOut = 1 - fadeEase(clamp01((ctx.time - (duration - 0.6)) / 0.5));

  const tapT = current?.tap ? ctx.time - (current.tapAt ?? TAP_AT) : -Infinity;
  const calloutAt = current?.focus ? CAMERA : 0.6;
  const callout = current?.callout && calloutBox ? Math.min(reduced ? 1 : outEase(clamp01((ctx.time - calloutAt) / 1)), wordsOut) : 0;

  return (
    <div ref={hostRef} className={cn("relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden", className)}>
      <div ref={fitRef} style={{ width: stage.w, height: stage.h, flex: "none", transformOrigin: "center" }}>
        <div style={{ position: "relative", width: stage.w, height: stage.h, borderRadius: 32, overflow: "hidden", background: THEME.stage, fontFamily: FONT }}>
          <div style={{ position: "absolute", inset: 0, opacity: outro }}>
            {/* Words */}
            <div style={{ position: "absolute", ...stage.copy }}>
              {current ? (
                <div key={ctx.step}>
                  <div aria-label={current.title} style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-0.02em", color: THEME.title }}>
                    <RisingWords text={current.title} time={ctx.time} start={0.2} end={duration} reduced={reduced} />
                  </div>
                  {current.caption ? (
                    <div aria-label={current.caption} style={{ marginTop: 12, maxWidth: 280, marginInline: stage === LAYOUTS.stacked ? "auto" : undefined, fontSize: 16, lineHeight: 1.5, color: THEME.caption }}>
                      <RisingWords text={current.caption} time={ctx.time} start={0.55} end={duration} reduced={reduced} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Camera and phone, in a viewport that keeps them clear of the words */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                top: stage.viewTop,
                overflow: stage.viewTop ? "hidden" : undefined,
                maskImage: stage.viewTop ? VIEW_MASK : undefined,
                WebkitMaskImage: stage.viewTop ? VIEW_MASK : undefined,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: stage.phone.x,
                  top: stage.phone.y - stage.viewTop,
                  width: PHONE_W,
                  height: PHONE_H,
                  opacity: phoneOpacity,
                  transform: `translate(-50%, -50%) translateY(${lift.toFixed(2)}px) scale(${zoom.toFixed(4)})`,
                  transformOrigin: "center",
                  // Composited on the GPU, so the camera never waits on layout.
                  willChange: "transform, opacity",
                }}
              >
                <IPhoneFrame />
                <div ref={screenRef} style={{ position: "absolute", inset: 0, borderRadius: SCREEN_RADIUS, overflow: "hidden", background: THEME.screen }}>
                  {children ? children(ctx) : <DemoFeed ctx={ctx} />}
                  {current?.compare ? <BeforeAfter before={current.compare(ctx)} time={ctx.time} duration={duration} wordsOut={wordsOut} reduced={reduced} /> : null}
                  {callout > 0 && calloutBox ? <CalloutRing box={calloutBox} progress={callout} /> : null}
                  <DynamicIsland />
                  {tapBox && !reduced ? <TapFinger box={tapBox} t={tapT} /> : null}
                </div>
              </div>
            </div>

            {callout > 0 && calloutBox && current?.callout ? (
              <CalloutLabel box={calloutBox} label={current.callout.label} progress={callout} stage={stage} zoom={zoom} onStage={onStage} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A data-walk element's box on the screen canvas, or null when it isn't on screen. */
function measure(screen: HTMLElement, id?: string): Box | null {
  const target = id ? screen.querySelector<HTMLElement>(`[data-walk="${id}"]`) : null;
  if (!target) return null;
  const s = screen.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const unit = s.width / PHONE_W;
  return { x: (r.left - s.left) / unit, y: (r.top - s.top) / unit, w: r.width / unit, h: r.height / unit };
}

/* ------------------------------------------------------------------------- */
/* Words                                                                      */
/* ------------------------------------------------------------------------- */

const riseEase = cubicBezier(0.215, 0.61, 0.355, 1);
const exitEase = cubicBezier(0.45, 0, 0.55, 1);

/** The Lumen film's word-by-word type. Each word rises from behind its own mask, sharpening out of a
 *  slight blur, 0.07s after the one before; at `end` every word lifts out of its mask again, with a
 *  stagger capped so a long caption leaves as quickly as a short title. Times are seconds into the step. */
function RisingWords({ text, time, start, end, reduced }: { text: string; time: number; start: number; end: number; reduced: boolean }) {
  const words = text.split(/\s+/);
  return words.map((word, index) => {
    const elapsed = time - start - index * 0.07;
    const rise = riseEase(clamp01(elapsed / 0.75));
    const leave = exitEase(clamp01((time - end + 0.5 - Math.min(0.08, index * 0.02)) / 0.42));
    const y = reduced ? 0 : (1 - rise) * 0.65 - 1.05 * leave;
    return (
      <React.Fragment key={index}>
        {/* The mask: room below for descenders, so only the rise is clipped. */}
        <span aria-hidden="true" style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.16em", marginBottom: "-0.16em" }}>
          <span
            style={{
              display: "inline-block",
              opacity: riseEase(clamp01(elapsed / 0.28)) * (1 - leave),
              transform: `translate3d(0, ${y.toFixed(3)}em, 0)`,
              filter: reduced || rise >= 1 ? undefined : `blur(${((1 - rise) * 2).toFixed(2)}px)`,
              willChange: "transform, opacity",
            }}
          >
            {word}
          </span>
        </span>
        {index < words.length - 1 ? " " : null}
      </React.Fragment>
    );
  });
}

/* ------------------------------------------------------------------------- */
/* Pieces on and around the phone                                             */
/* ------------------------------------------------------------------------- */

function IPhoneFrame() {
  const edge = BEZEL + BAND;
  const button = (side: "left" | "right", top: number, height: number): React.CSSProperties => ({
    position: "absolute",
    [side]: -edge - 2.5,
    top,
    width: 3.5,
    height,
    borderRadius: 2,
    background: TITANIUM,
  });
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <span style={button("left", 108, 22)} />
      <span style={button("left", 148, 44)} />
      <span style={button("left", 202, 44)} />
      <span style={button("right", 168, 70)} />
      <span style={{ position: "absolute", inset: -edge, borderRadius: SCREEN_RADIUS + edge, background: TITANIUM, boxShadow: "0 30px 60px -20px rgba(0,0,0,.6)" }} />
      <span style={{ position: "absolute", inset: -BEZEL, borderRadius: SCREEN_RADIUS + BEZEL, background: "#050506" }} />
    </div>
  );
}

/** The pill at the top of the screen, with its camera. */
function DynamicIsland() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "50%", top: 10, width: 84, height: 24, marginLeft: -42, borderRadius: 12, background: "#000000", pointerEvents: "none" }}
    >
      <span style={{ position: "absolute", right: 9, top: 8, width: 8, height: 8, borderRadius: "50%", background: "#111a24", boxShadow: "inset 0 0 0 1.5px #1c2733" }} />
    </div>
  );
}

const FINGER_SIZE = 34;

/** A touch like the ones in Apple's product demos: a soft, finger-sized grey dot. It glides in from
 *  just below and right the way a thumb comes in, squeezes while it presses, and fades as it lifts.
 *  Grey reads on both the dark screen and light controls. */
function Finger({ x, y, arrive, press, leave }: { x: number; y: number; arrive: number; press: number; leave: number }) {
  if (arrive <= 0 || leave >= 1) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: x + (1 - arrive) * 14,
        top: y + (1 - arrive) * 24,
        width: FINGER_SIZE,
        height: FINGER_SIZE,
        borderRadius: "50%",
        pointerEvents: "none",
        background: "rgba(150,150,156,.55)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7), 0 3px 12px rgba(0,0,0,.35)",
        transform: `translate(-50%, -50%) scale(${((1.14 - 0.14 * arrive) * (1 - 0.16 * press)).toFixed(3)})`,
        opacity: arrive * (1 - leave),
      }}
    />
  );
}

/** A tap: the finger arrives just before the press, presses, and lifts just after. `t` is seconds from the press. */
function TapFinger({ box, t }: { box: Box; t: number }) {
  return (
    <Finger
      x={box.x + box.w / 2}
      y={box.y + box.h / 2}
      arrive={outEase(clamp01((t + 0.55) / 0.38))}
      press={sample([[-0.1, 0], [0, 1], [0.18, 0]], t, fadeEase)}
      leave={fadeEase(clamp01((t - 0.24) / 0.3))}
    />
  );
}

/** Before and after. The older screen fades in over the right of a divider; a finger lands on the
 *  handle, drags it once from left to right (never to either edge) and lets go; the divider then
 *  rests where it stopped and leaves with the step's words, so nothing jumps when the finger lifts. */
function BeforeAfter({ before, time, duration, wordsOut, reduced }: { before: React.ReactNode; time: number; duration: number; wordsOut: number; reduced: boolean }) {
  const from = PHONE_W * 0.2;
  const to = PHONE_W * 0.8;
  const dragStart = 1;
  const dragEnd = duration - 1.3;
  const shown = reduced ? 1 : Math.min(fadeEase(clamp01(time / 0.4)), wordsOut);
  const x = reduced ? PHONE_W / 2 : sample([[dragStart, from], [dragEnd, to]], time, cameraEase);
  if (shown <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: shown }}>
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${x.toFixed(2)}px)` }}>{before}</div>
      <span style={{ position: "absolute", left: x - 1, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,.9)" }} />
      <span
        style={{
          position: "absolute",
          left: x,
          top: PHONE_H / 2,
          width: 30,
          height: 30,
          marginLeft: -15,
          marginTop: -15,
          borderRadius: "50%",
          background: THEME.screen,
          boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.9)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke={THEME.icon} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {reduced ? null : (
        <Finger
          x={x}
          y={PHONE_H / 2}
          arrive={outEase(clamp01((time - (dragStart - 0.55)) / 0.38))}
          // Held down for the whole drag, released as it stops.
          press={Math.min(fadeEase(clamp01((time - (dragStart - 0.12)) / 0.12)), 1 - fadeEase(clamp01((time - dragEnd) / 0.18)))}
          leave={fadeEase(clamp01((time - dragEnd - 0.2) / 0.3))}
        />
      )}
    </div>
  );
}

/** The ring around a callout's element, on the screen. */
function CalloutRing({ box, progress }: { box: Box; progress: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: box.x - 6,
        top: box.y - 6,
        width: box.w + 12,
        height: box.h + 12,
        borderRadius: Math.min(box.w, box.h) / 2 + 6,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.9)",
        opacity: progress,
        transform: `scale(${(1.25 - 0.25 * progress).toFixed(3)})`,
      }}
    />
  );
}

/** A short line from the callout's element out past the phone, ending in a small label. It runs to
 *  whichever side of the phone the element is nearer, level with it. */
function CalloutLabel({
  box,
  label,
  progress,
  stage,
  zoom,
  onStage,
}: {
  box: Box;
  label: string;
  progress: number;
  stage: Layout;
  zoom: number;
  onStage: (x: number, y: number) => { x: number; y: number };
}) {
  const left = box.x + box.w / 2 < PHONE_W / 2;
  const start = onStage(left ? box.x - 6 : box.x + box.w + 6, box.y + box.h / 2);
  const edge = (PHONE_W / 2 + BEZEL + BAND) * zoom;
  // Keep the label on the stage even where the phone leaves little room beside it (the stacked
  // layout); its width is estimated from the text.
  const labelW = label.length * 6.4 + 26;
  const end = left ? Math.max(stage.phone.x - edge - 28, labelW + 12) : Math.min(stage.phone.x + edge + 28, stage.w - labelW - 12);
  const shown = clamp01((progress - 0.7) / 0.3);
  return (
    <>
      <svg aria-hidden="true" width={stage.w} height={stage.h} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
        <line x1={start.x} y1={start.y} x2={lerp(start.x, end, progress)} y2={start.y} stroke="rgba(255,255,255,.85)" strokeWidth={1.5} />
        <circle cx={start.x} cy={start.y} r={3} fill={THEME.icon} />
      </svg>
      <div
        style={{
          position: "absolute",
          top: start.y,
          ...(left ? { right: stage.w - end } : { left: end }),
          transform: `translateY(-50%) translateX(${((1 - shown) * (left ? 8 : -8)).toFixed(2)}px)`,
          opacity: shown,
          padding: "6px 12px",
          borderRadius: 999,
          background: THEME.label,
          boxShadow: THEME.hairline,
          color: THEME.title,
          fontSize: 12,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Engine: the script's clock, camera and progress                            */
/* ------------------------------------------------------------------------- */

type Timeline = { starts: number[]; total: number; zoom: Keys; shift: Keys };

/** How close a pushed-in phone's top or bottom may come to the stage edge, and how far past it still
 *  counts as an awkward near-miss crop. An edge in between is moved back to EDGE_ROOM inside. */
const EDGE_ROOM = 56;
const EDGE_NEAR_MISS = 120;

/** The camera for one focus, after the framing rules:
 *  - in the wide layout, it never pushes in so far that the phone crowds the words;
 *  - the phone's top and bottom either sit well inside the stage or well past its edge, never just
 *    touching it, and a bottom near the edge is lifted to leave room below.
 *  The camera never moves sideways, so a push-in can't slide the phone over the words. */
function frame(focus: WalkthroughStep["focus"], stage: Layout) {
  if (!focus) return { zoom: 1, shift: 0 };
  const maxZoom = stage === LAYOUTS.split ? (stage.phone.x - (COPY_LEFT + COPY_W + COPY_GAP)) / (PHONE_W / 2 + BEZEL + BAND) : Infinity;
  const zoom = Math.min(focus.zoom, maxZoom);
  // Scaling about the phone's centre, this shift puts focus.y on the stage's centre line.
  let shift = (PHONE_H / 2 - focus.y) * zoom;
  const half = (PHONE_H / 2 + BEZEL + BAND) * zoom;
  const bottom = stage.phone.y + half + shift;
  const top = stage.phone.y - half + shift;
  if (bottom > stage.h - EDGE_ROOM && bottom < stage.h + EDGE_NEAR_MISS) shift -= bottom - (stage.h - EDGE_ROOM);
  else if (top < stage.viewTop + EDGE_ROOM && top > stage.viewTop - EDGE_NEAR_MISS) shift += stage.viewTop + EDGE_ROOM - top;
  return { zoom, shift };
}

/** Turn the script into step start times and the camera's zoom and vertical-shift tracks. */
function buildTimeline(steps: WalkthroughStep[], stage: Layout): Timeline {
  const starts: number[] = [];
  let at = INTRO;
  for (const step of steps) {
    starts.push(at);
    at += step.duration;
  }
  const zoom: [number, number][] = [[0, 1]];
  const shift: [number, number][] = [[0, 0]];
  let z = 1;
  let y = 0;
  steps.forEach((step, i) => {
    const { zoom: nextZ, shift: nextY } = frame(step.focus, stage);
    if (nextZ === z && nextY === y) return;
    zoom.push([starts[i], z], [starts[i] + CAMERA, nextZ]);
    shift.push([starts[i], y], [starts[i] + CAMERA, nextY]);
    z = nextZ;
    y = nextY;
  });
  // A script that ends pushed in pulls back to the whole phone while it fades out.
  if (z !== 1 || y !== 0) {
    zoom.push([at, z], [at + OUTRO * 0.8, 1]);
    shift.push([at, y], [at + OUTRO * 0.8, 0]);
  }
  return { starts, total: at + OUTRO, zoom, shift };
}

/** Everything a screen needs to know about the clock at `t`. */
function makeContext(steps: WalkthroughStep[], timeline: Timeline, t: number, reduced: boolean): WalkthroughContext {
  let step = 0;
  for (let i = 0; i < steps.length; i++) if (t >= timeline.starts[i]) step = i;
  const time = t - timeline.starts[step];
  const indexOf = (ref: WalkthroughStepRef) => (typeof ref === "number" ? ref : steps.findIndex((s) => s.id === ref || s.tap === ref));
  const tapAtOf = (index: number) => steps[index]?.tapAt ?? TAP_AT;
  const progress = (ref: WalkthroughStepRef, start: number, duration: number) => {
    const index = indexOf(ref);
    if (index < 0 || index > step) return 0;
    if (index < step) return 1;
    return cameraEase(clamp01((time - start) / duration));
  };
  return {
    step,
    time,
    progress,
    tapped: (ref) => progress(ref, tapAtOf(indexOf(ref)), TAP_LENGTH),
    press: (id) => (steps[step]?.tap === id ? sample([[-0.16, 0], [0, 1], [0.22, 0]], time - tapAtOf(step), fadeEase) : 0),
    enter: (layer) => {
      if (reduced) return {};
      const p = outEase(clamp01((t - 0.45 - layer * 0.12) / 0.8));
      return { opacity: p, transform: `translateY(${((1 - p) * 12).toFixed(2)}px)` };
    },
  };
}

/** The stage: picks the layout for the space the host has (a narrow or portrait box stacks the words
 *  on top), scales it down so the whole thing is always in view, and runs the clock, in seconds
 *  since mount, paused while the stage is off screen. The clock starts on a settled frame so the
 *  first paint (and the server render) is never empty. */
function useStage(layout: "auto" | "split" | "stacked") {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const [auto, setAuto] = React.useState<"split" | "stacked">("split");
  const [t, setT] = React.useState(REST);

  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      const pick = layout !== "auto" ? layout : width < 640 || (height > 0 && width / height < 1.1) ? "stacked" : "split";
      setAuto(pick);
      const stage = LAYOUTS[pick];
      // A little breathing room, so the stage's rounded corners never touch the host's edge.
      const byHeight = height > 0 ? (height - 32) / stage.h : Infinity;
      const scale = Math.min(1, (width - 32) / stage.w, byHeight);
      fit.style.transform = `scale(${Math.max(0.2, scale).toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [layout]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      // Cap the step so a background tab doesn't jump the film forward.
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setT((value) => value + dt);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(host);
    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  return { t, hostRef, fitRef, stage: LAYOUTS[layout === "auto" ? auto : layout] };
}

/* ------------------------------------------------------------------------- */
/* Demo content: an example screen and script. Replace them with your own.    */
/* ------------------------------------------------------------------------- */

const DEMO = {
  card: "#1a1b1e",
  cardRaised: "#232428",
  skeleton: "#26272b",
  tabOn: "#8e8f94",
  tabOff: "#3a3b40",
};
/** One post: a 328px card, its meta row and three lines, then a gap that hides the next card at rest. */
const POST_H = 470;
/** Where the demo script points the camera: the tabs, the second post's action row, and a framing
 *  for the avatar callout that leaves the avatar, and so its label, below the words. */
const TABS_Y = 106;
const ACTIONS_Y = 492;
const AVATAR_FRAME_Y = ACTIONS_Y - 120;

const ICONS = {
  star: "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z",
  comment: "M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z",
  heart:
    "M12 20.5s-7.5-4.4-9.3-9.1C1.5 8.2 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.7 4.5 6.9-1.8 4.7-9.3 9.1-9.3 9.1z",
};

/** A white line icon, or a solid one when `filled`. */
function Icon({ path, filled = false, style }: { path: string; filled?: boolean; style?: React.CSSProperties }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", overflow: "visible", ...style }}>
      <path d={path} fill={filled ? THEME.icon : "none"} stroke={THEME.icon} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

const bar = (left: number, top: number, width: number, height = 7): React.CSSProperties => ({
  position: "absolute",
  left,
  top,
  width,
  height,
  borderRadius: height / 2,
  background: DEMO.skeleton,
});

/** A post's picture, as a flat placeholder block. */
function Card({ fill, style }: { fill: string; style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: fill, boxShadow: THEME.hairline, ...style }} />;
}

/** One post. The second one carries the data-walk ids the demo script taps and points at. */
function Post({ top, card, heart, ctx }: { top: number; card: React.ReactNode; heart?: { liked: number; press: number }; ctx: WalkthroughContext }) {
  const liked = heart?.liked ?? 0;
  // A quick pop as the heart fills, squeezed while it is pressed.
  const heartScale = (1 + 0.35 * Math.sin(Math.PI * liked)) * (1 - 0.15 * (heart?.press ?? 0));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: POST_H }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 328, ...ctx.enter(2) }}>{card}</div>
      <div style={{ position: "absolute", inset: 0, ...ctx.enter(3) }}>
        <div data-walk={heart ? "avatar" : undefined} style={{ ...bar(5, 339, 32, 32), borderRadius: "50%" }} />
        <div style={bar(45, 352, 50, 6)} />
        <Icon path={ICONS.star} style={{ position: "absolute", left: 156, top: 346 }} />
        <Icon path={ICONS.comment} style={{ position: "absolute", left: 185, top: 346 }} />
        <div data-walk={heart ? "like" : undefined} style={{ position: "absolute", left: 216, top: 346, width: 18, height: 18, transform: `scale(${heartScale.toFixed(3)})` }}>
          <Icon path={ICONS.heart} style={{ position: "absolute", inset: 0 }} />
          <Icon path={ICONS.heart} filled style={{ position: "absolute", inset: 0, opacity: liked }} />
        </div>
        <div style={bar(5, 385, 50)} />
        <div style={bar(60, 385, 50)} />
        <div style={bar(5, 398, 225)} />
        <div style={bar(5, 411, 178)} />
      </div>
    </div>
  );
}

/** The demo screen: a skeleton feed with two tabs and two posts. It reads the script by name, so its
 *  steps can be reordered freely. */
function DemoFeed({ ctx }: { ctx: WalkthroughContext }) {
  const forYou = ctx.tapped("for-you");
  const forYouPress = ctx.press("for-you");
  const scroll = ctx.progress("scroll", 0.5, 1.9) * POST_H;
  const mask = "linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 56px), transparent 100%)";
  return (
    <>
      {/* Menu */}
      <div style={{ position: "absolute", left: 20, top: 52, display: "grid", gap: 4, ...ctx.enter(0) }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: "block", width: 14, height: 1.5, borderRadius: 1, background: THEME.icon }} />
        ))}
      </div>
      {/* Two tabs, with placeholder bars for their names */}
      <div style={{ position: "absolute", left: 14, top: 90, width: 252, height: 32, ...ctx.enter(1) }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 124,
            height: 32,
            borderRadius: 16,
            background: DEMO.cardRaised,
            boxShadow: THEME.hairline,
            transform: `translateX(${(forYou * 128).toFixed(2)}px)`,
          }}
        />
        {([52, 40] as const).map((width, i) => {
          const active = i === 0 ? 1 - forYou : forYou;
          return (
            <div
              key={i}
              data-walk={i === 1 ? "for-you" : undefined}
              style={{
                position: "absolute",
                top: 0,
                left: i * 128,
                width: 124,
                height: 32,
                display: "grid",
                placeItems: "center",
                transform: i === 1 ? `scale(${(1 - 0.05 * forYouPress).toFixed(3)})` : undefined,
              }}
            >
              <span style={{ width, height: 6, borderRadius: 3, background: active > 0.5 ? DEMO.tabOn : DEMO.tabOff }} />
            </div>
          );
        })}
      </div>
      {/* Feed */}
      <div style={{ position: "absolute", left: 11, right: 11, top: 122, bottom: 0, overflow: "hidden", maskImage: mask, WebkitMaskImage: mask }}>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${(-scroll).toFixed(2)}px)` }}>
          <Post
            top={15}
            ctx={ctx}
            card={
              <>
                <Card fill={DEMO.card} />
                <Card fill={DEMO.cardRaised} style={{ opacity: forYou }} />
              </>
            }
          />
          <Post top={15 + POST_H} ctx={ctx} card={<Card fill={DEMO.card} />} heart={{ liked: ctx.tapped("like"), press: ctx.press("like") }} />
        </div>
      </div>
    </>
  );
}

/** The demo's "before": the same moment in an older, boxier, busier version of the feed. */
function DemoFeedBefore() {
  const dim = "#3a3b40";
  const block = (left: number, top: number, width: number, height: number, background = dim, radius = 2): React.CSSProperties => ({
    position: "absolute",
    left,
    top,
    width,
    height,
    borderRadius: radius,
    background,
  });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#141518" }}>
      {/* A solid app bar with a title block */}
      <div style={block(0, 0, PHONE_W, 86, "#1d1e21", 0)} />
      <span style={block(20, 56, 70, 8)} />
      <span style={block(244, 52, 16, 16, dim, 3)} />
      {/* Underlined tabs */}
      <span style={block(44, 102, 52, 6)} />
      <span style={block(184, 102, 40, 6, "#6e6f74")} />
      <span style={block(140, 118, 140, 2, "#6e6f74", 0)} />
      <span style={block(0, 120, PHONE_W, 1, "#26272b", 0)} />
      {/* A smaller, square card and denser lines */}
      <div style={block(11, 137, 258, 250, "#2a2b2f", 4)} />
      <span style={block(16, 400, 30, 30, dim, 4)} />
      <span style={block(54, 412, 60, 6)} />
      {[168, 192, 216].map((left) => (
        <span key={left} style={block(left, 408, 14, 14, dim, 3)} />
      ))}
      {[240, 220, 236, 180, 210].map((width, i) => (
        <div key={i} style={block(16, 446 + i * 12, width, 6, "#2a2b2f")} />
      ))}
      <div style={block(11, 516, 258, 120, "#2a2b2f", 4)} />
    </div>
  );
}

/** The demo script, written for the demo feed. Copy it as a starting point for your own. */
export const defaultWalkthroughSteps: WalkthroughStep[] = [
  { id: "intro", title: "Introduce your app", caption: "One line on what it does and who it is for", duration: 3.4 },
  { id: "switch", title: "Show a key interaction", caption: "Name the control and what tapping it changes", duration: 4.2, focus: { y: TABS_Y, zoom: 1.4 }, tap: "for-you" },
  { id: "scroll", title: "Walk through a flow", caption: "Say what happens as the screen moves on", duration: 3.6 },
  { id: "like", title: "Highlight a detail", caption: "Point out the small touch you are proud of", duration: 4.2, focus: { y: ACTIONS_Y, zoom: 1.4 }, tap: "like" },
  { id: "compare", title: "Show the before and after", caption: "Slide from the old screen to the new one", duration: 4.6, compare: () => <DemoFeedBefore /> },
  { id: "explain", title: "Explain one element", caption: "Point to a part and say why it is there", duration: 4.6, focus: { y: AVATAR_FRAME_Y, zoom: 1.4 }, callout: { target: "avatar", label: "Name this part" } },
  { id: "outro", title: "Close with the outcome", caption: "Sum up what people get from it", duration: 3 },
];
