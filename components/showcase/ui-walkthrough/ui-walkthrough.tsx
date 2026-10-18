"use client";

import * as React from "react";

import { cubicBezier, useReducedMotion } from "framer-motion";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WalkthroughStep = {
  title: string;
  caption?: string;
  /** Seconds this step holds the screen. Keep it above 1s so the camera can land. */
  duration: number;
  /** Push the camera in: the phone-local y to centre, and how far to zoom. Omit to show the whole phone. */
  focus?: { y: number; zoom: number };
  /** The data-walk id of the control pressed in this step. */
  tap?: string;
  /** Seconds into the step when the press lands. Defaults to 1.6, just after the camera settles. */
  tapAt?: number;
  /** A before and after: this screen sits under a divider that a finger drags across the live one. */
  compare?: (ctx: WalkthroughContext) => React.ReactNode;
  /** Ring a data-walk element and run a short line from it to a small label beside the phone. */
  callout?: { target: string; label: string };
};

export type WalkthroughContext = {
  /** The step on screen. */
  step: number;
  /** Seconds into that step (negative during the intro). */
  time: number;
  /** Eased 0–1 progress of a window inside step `index`: 0 before that step, 1 once it has passed. */
  progress: (index: number, start: number, duration: number) => number;
  /** Eased 0–1 progress of step `index`'s tap, so a tapped state can stay on in later steps. */
  tapped: (index: number) => number;
  /** How hard a data-walk control is being pressed right now, 0–1, for a press scale. */
  press: (id: string) => number;
  /** Entrance style for layer `n` of your screen as the phone lands, staggered top to bottom. */
  enter: (layer: number) => React.CSSProperties;
};

export type UIWalkthroughProps = {
  /** The script: one entry per chapter, played in order and looped. */
  steps?: WalkthroughStep[];
  /** Your screen, drawn on a 280 x 600 phone canvas. Mark tapped controls with data-walk="<id>". Defaults to a skeleton feed. */
  children?: (ctx: WalkthroughContext) => React.ReactNode;
  /** Fade the screen's top and bottom edges as content scrolls under them, instead of a hard crop. */
  fade?: boolean;
  /** Copy beside the phone ("split"), above it ("stacked"), or whichever suits the space it is given ("auto"). */
  layout?: "auto" | "split" | "stacked";
  /** Accepted for the gallery card. The walkthrough always plays. */
  loop?: boolean;
  className?: string;
};

/** The phone canvas your screen is drawn on. */
const PHONE_W = 280;
const PHONE_H = 600;

/** The words' column in the wide layout, and the gap the phone keeps from it however far the camera
 *  pushes in. */
const COPY_W = 320;
const COPY_GAP = 40;

/** Each layout's true stage size, phone centre and copy box. The stage is scaled down to fit
 *  whatever it is put in. */
const LAYOUTS = {
  split: {
    w: 960,
    h: 680,
    phone: { x: 660, y: 340 },
    viewTop: 0,
    copy: { left: 88, top: "50%", width: COPY_W, transform: "translateY(-50%)" },
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

/** The stacked viewport's soft top edge, where a pushed-in phone slides under the words. */
const VIEW_MASK = "linear-gradient(to bottom, transparent 0, #000 36px)";

const FONT = "var(--font-poppins, Poppins), Poppins, ui-sans-serif, system-ui, sans-serif";

/** Seconds: the phone landing, the fade before the loop, one camera move, the default tap time. */
const INTRO = 1.4;
const OUTRO = 1.1;
const CAMERA = 1.3;
const TAP_AT = 1.6;
const TAP_LENGTH = 0.6;

/** The camera curve: a slow, even ease in and a long soft settle, so no move starts or stops abruptly. */
const cameraEase = cubicBezier(0.65, 0, 0.25, 1);
const outEase = cubicBezier(0.22, 1, 0.36, 1);
const fadeEase = cubicBezier(0.37, 0, 0.63, 1);

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

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

type Timeline = { starts: number[]; total: number; zoom: Keys; shift: Keys };

/** Turn the script into step start times and the camera's zoom and vertical-shift tracks.
 *  The camera never moves sideways, so a push-in can't slide the phone over the copy. */
function buildTimeline(steps: WalkthroughStep[]): Timeline {
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
    const nextZ = step.focus?.zoom ?? 1;
    // Scaling about the phone's centre, this shift puts focus.y on the stage's centre line.
    const nextY = step.focus ? (PHONE_H / 2 - step.focus.y) * nextZ : 0;
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
  const tapAtOf = (index: number) => steps[index]?.tapAt ?? TAP_AT;
  const progress = (index: number, start: number, duration: number) => {
    if (index < step) return 1;
    if (index > step) return 0;
    return cameraEase(clamp01((time - start) / duration));
  };
  return {
    step,
    time,
    progress,
    tapped: (index) => progress(index, tapAtOf(index), TAP_LENGTH),
    press: (id) => {
      if (steps[step]?.tap !== id) return 0;
      return sample([[-0.16, 0], [0, 1], [0.22, 0]], time - tapAtOf(step), fadeEase);
    },
    enter: (layer) => {
      if (reduced) return {};
      const p = outEase(clamp01((t - 0.45 - layer * 0.12) / 0.8));
      return { opacity: p, transform: `translateY(${((1 - p) * 12).toFixed(2)}px)` };
    },
  };
}

/** Seconds since mount, looped over `total`, paused while the stage is off screen.
 *  Starts on a settled frame so the first paint (and the server render) is never empty. */
function useLoopClock(total: number, rest: number) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [t, setT] = React.useState(rest);
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    let last = 0;
    let clock = rest;
    const tick = (now: number) => {
      // Cap the step so a background tab doesn't jump the film forward.
      clock = (clock + Math.min(0.1, (now - last) / 1000)) % total;
      last = now;
      setT(clock);
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
  }, [total, rest]);
  return { t, hostRef };
}

/** Pick the layout for the space the host has (a narrow or portrait box stacks the copy on top),
 *  then scale that stage down so the whole thing is always in view. */
function useFit(hostRef: React.RefObject<HTMLDivElement | null>, layout: "auto" | "split" | "stacked") {
  const fitRef = React.useRef<HTMLDivElement>(null);
  const [auto, setAuto] = React.useState<"split" | "stacked">("split");
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
  }, [hostRef, layout]);
  return { fitRef, stage: LAYOUTS[layout === "auto" ? auto : layout] };
}

/* ------------------------------------------------------------------------- */
/* The default screen: a skeleton feed                                        */
/* ------------------------------------------------------------------------- */

/** The stage and the words beside the phone: dark, with white titles and grey captions. */
const STAGE = "#18181a";
const INK = "#ffffff";
const CAPTION = "#9a9a9f";
/** Dark mode: a near-black screen, quiet dark grey cards with a hairline edge, and white kept for icons. */
const SCREEN = "#0d0e10";
const CARD = "#1a1b1e";
const CARD_RAISED = "#232428";
const HAIRLINE = "inset 0 0 0 1px rgba(255,255,255,.07)";
const SKELETON = "#26272b";
const ICON = "#ffffff";
/** One post: a 328px card, its meta row and three lines, then a gap that hides the next card at rest. */
const POST_H = 470;
/** Phone-local y of the tabs and of the second post's action row, for the default script's camera. */
const TABS_Y = 106;
const ACTIONS_Y = 492;

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
      <path d={path} fill={filled ? ICON : "none"} stroke={ICON} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

/** A post's picture, as a flat placeholder block. */
function Card({ fill, style }: { fill: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 16,
        background: fill,
        boxShadow: HAIRLINE,
        ...style,
      }}
    />
  );
}

const bar = (left: number, top: number, width: number): React.CSSProperties => ({
  position: "absolute",
  left,
  top,
  width,
  height: 7,
  borderRadius: 4,
  background: SKELETON,
});

function Post({
  top,
  card,
  heart,
  ctx,
}: {
  top: number;
  card: React.ReactNode;
  heart?: { liked: number; press: number };
  ctx: WalkthroughContext;
}) {
  const liked = heart?.liked ?? 0;
  // A quick pop as the heart fills, squeezed while it is pressed.
  const heartScale = (1 + 0.35 * Math.sin(Math.PI * liked)) * (1 - 0.15 * (heart?.press ?? 0));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: POST_H }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 328, ...ctx.enter(2) }}>{card}</div>
      <div style={{ position: "absolute", inset: 0, ...ctx.enter(3) }}>
        <div data-walk={heart ? "avatar" : undefined} style={{ position: "absolute", left: 5, top: 339, width: 32, height: 32, borderRadius: "50%", background: SKELETON }} />
        <div style={{ ...bar(45, 352, 50), height: 6 }} />
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

function SkeletonFeed({ ctx, fade }: { ctx: WalkthroughContext; fade: boolean }) {
  const forYou = ctx.tapped(1);
  const forYouPress = ctx.press("for-you");
  const scroll = ctx.progress(2, 0.5, 1.9) * POST_H;
  const mask = fade ? "linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 56px), transparent 100%)" : undefined;
  return (
    <>
      {/* Menu */}
      <div style={{ position: "absolute", left: 20, top: 52, display: "grid", gap: 4, ...ctx.enter(0) }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: "block", width: 14, height: 1.5, borderRadius: 1, background: ICON }} />
        ))}
      </div>
      {/* Following / For you */}
      <div style={{ position: "absolute", left: 14, top: 90, width: 252, height: 32, ...ctx.enter(1) }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 124,
            height: 32,
            borderRadius: 16,
            background: CARD_RAISED,
            boxShadow: HAIRLINE,
            transform: `translateX(${(forYou * 128).toFixed(2)}px)`,
          }}
        />
        {/* Placeholder bars stand in for the two tab names. */}
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
              <span style={{ width, height: 6, borderRadius: 3, background: active > 0.5 ? "#8e8f94" : "#3a3b40" }} />
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
                <Card fill={CARD} />
                <Card fill={CARD_RAISED} style={{ opacity: forYou }} />
              </>
            }
          />
          <Post top={15 + POST_H} ctx={ctx} card={<Card fill={CARD} />} heart={{ liked: ctx.tapped(3), press: ctx.press("like") }} />
        </div>
      </div>
    </>
  );
}

/** The same moment in an older, boxier, busier version of the feed, for the before and after. */
function SkeletonFeedBefore() {
  const dim = "#3a3b40";
  const line = (top: number, width: number): React.CSSProperties => ({ position: "absolute", left: 16, top, width, height: 6, borderRadius: 2, background: "#2a2b2f" });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#141518" }}>
      {/* A solid app bar with a title block */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 86, background: "#1d1e21" }} />
      <span style={{ position: "absolute", left: 20, top: 56, width: 70, height: 8, borderRadius: 2, background: dim }} />
      <span style={{ position: "absolute", right: 20, top: 52, width: 16, height: 16, borderRadius: 3, background: dim }} />
      {/* Underlined tabs */}
      <span style={{ position: "absolute", left: 44, top: 102, width: 52, height: 6, borderRadius: 2, background: dim }} />
      <span style={{ position: "absolute", left: 184, top: 102, width: 40, height: 6, borderRadius: 2, background: "#6e6f74" }} />
      <span style={{ position: "absolute", left: 140, top: 118, width: 140, height: 2, background: "#6e6f74" }} />
      <span style={{ position: "absolute", left: 0, top: 120, width: 280, height: 1, background: "#26272b" }} />
      {/* A smaller, square card */}
      <div style={{ position: "absolute", left: 11, right: 11, top: 137, height: 250, borderRadius: 4, background: "#2a2b2f" }} />
      <span style={{ position: "absolute", left: 16, top: 400, width: 30, height: 30, borderRadius: 4, background: dim }} />
      <span style={{ position: "absolute", left: 54, top: 412, width: 60, height: 6, borderRadius: 2, background: dim }} />
      {[168, 192, 216].map((left) => (
        <span key={left} style={{ position: "absolute", left, top: 408, width: 14, height: 14, borderRadius: 3, background: dim }} />
      ))}
      <div style={line(446, 240)} />
      <div style={line(458, 220)} />
      <div style={line(470, 236)} />
      <div style={line(482, 180)} />
      <div style={line(494, 210)} />
      <div style={{ position: "absolute", left: 11, right: 11, top: 516, height: 120, borderRadius: 4, background: "#2a2b2f" }} />
    </div>
  );
}

/** The default script, written for the skeleton feed. Copy it as a starting point for your own. */
export const defaultWalkthroughSteps: WalkthroughStep[] = [
  { title: "Introduce your app", caption: "One line on what it does and who it is for", duration: 3.4 },
  { title: "Show a key interaction", caption: "Name the control and what tapping it changes", duration: 4.2, focus: { y: TABS_Y, zoom: 1.4 }, tap: "for-you" },
  { title: "Walk through a flow", caption: "Say what happens as the screen moves on", duration: 3.6 },
  { title: "Highlight a detail", caption: "Point out the small touch you are proud of", duration: 4.2, focus: { y: ACTIONS_Y, zoom: 1.4 }, tap: "like" },
  { title: "Show the before and after", caption: "Slide from the old screen to the new one", duration: 4.4, compare: () => <SkeletonFeedBefore /> },
  { title: "Explain one element", caption: "Point to a part and say why it is there", duration: 4, callout: { target: "avatar", label: "Name this part" } },
  { title: "Close with the outcome", caption: "Sum up what people get from it", duration: 3 },
];

/** Seconds a touch is on screen before and after its press. */
const TOUCH_LEAD = 0.6;
const TOUCH_TAIL = 0.6;
const TOUCH_SIZE = 34;

/** A touch like the ones in Apple's product demos: a soft, finger-sized grey dot glides in and
 *  settles, squeezes as it presses, then fades away. No ring, no burst. `t` is seconds from the
 *  press (negative while it arrives). Grey reads on both the black screen and white controls. */
function TouchPoint({ at, t }: { at: { x: number; y: number }; t: number }) {
  const arrive = outEase(clamp01((t + 0.55) / 0.38));
  const leave = fadeEase(clamp01((t - 0.24) / 0.3));
  const press = sample([[-0.1, 0], [0, 1], [0.18, 0]], t, fadeEase);
  const scale = (1.14 - 0.14 * arrive) * (1 - 0.16 * press);
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: TOUCH_SIZE,
        height: TOUCH_SIZE,
        borderRadius: "50%",
        pointerEvents: "none",
        // It glides in from just below and right, the way a thumb comes in.
        left: at.x + (1 - arrive) * 14,
        top: at.y + (1 - arrive) * 24,
        background: "rgba(150,150,156,.55)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7), 0 3px 12px rgba(0,0,0,.35)",
        transform: `translate(-50%, -50%) scale(${scale.toFixed(3)})`,
        opacity: arrive * (1 - leave),
      }}
    />
  );
}

/** The iPhone around the screen: a black titanium band, a thin black bezel and the side buttons.
 *  The screen canvas stays 280 x 600, so the frame sits just outside it. */
const SCREEN_RADIUS = 44;
const BEZEL = 7;
const BAND = 4;
/** Black titanium: near-black with a faint sheen along the edge. */
const TITANIUM = "linear-gradient(145deg, #4a4a4f 0%, #1b1b1e 26%, #3a3a3e 52%, #141416 76%, #2f2f33 100%)";

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
      <span
        style={{
          position: "absolute",
          inset: -edge,
          borderRadius: SCREEN_RADIUS + edge,
          background: TITANIUM,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,.6)",
        }}
      />
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

type Box = { x: number; y: number; w: number; h: number };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ------------------------------------------------------------------------- */
/* The stage                                                                  */
/* ------------------------------------------------------------------------- */

export function UIWalkthrough({ steps = defaultWalkthroughSteps, children, fade = true, layout = "auto", className }: UIWalkthroughProps) {
  const reduced = useReducedMotion() ?? false;
  const timeline = React.useMemo(() => buildTimeline(steps), [steps]);
  const { t, hostRef } = useLoopClock(timeline.total, timeline.starts[0] + 1.6);
  const { fitRef, stage } = useFit(hostRef, layout);
  const phoneRef = React.useRef<HTMLDivElement>(null);
  const ctx = makeContext(steps, timeline, t, reduced);
  const current = steps[ctx.step];

  // Where the tapped control sits on the phone canvas, for the touch. Measured per step;
  // dividing by the rendered width undoes both the fit scale and the camera zoom.
  // The callout's element is measured the same way, as a box.
  const [rippleAt, setRippleAt] = React.useState<{ x: number; y: number } | null>(null);
  const [calloutBox, setCalloutBox] = React.useState<Box | null>(null);
  React.useLayoutEffect(() => {
    const phone = phoneRef.current;
    if (!phone) return;
    const p = phone.getBoundingClientRect();
    const unit = p.width / PHONE_W;
    const box = (id?: string): Box | null => {
      const target = id ? phone.querySelector<HTMLElement>(`[data-walk="${id}"]`) : null;
      if (!target) return null;
      const r = target.getBoundingClientRect();
      return { x: (r.left - p.left) / unit, y: (r.top - p.top) / unit, w: r.width / unit, h: r.height / unit };
    };
    const tapBox = box(current?.tap);
    setRippleAt(tapBox ? { x: tapBox.x + tapBox.w / 2, y: tapBox.y + tapBox.h / 2 } : null);
    setCalloutBox(box(current?.callout?.target));
  }, [ctx.step, current?.tap, current?.callout?.target]);

  // The camera never pushes in so far that the phone crowds the words: in the wide layout its
  // frame stays COPY_GAP clear of the words' column. The shift is scaled down with the zoom so the
  // focus point still lands on the centre line.
  const wantZoom = reduced ? 1 : sample(timeline.zoom, t, cameraEase);
  const maxZoom = stage === LAYOUTS.split ? (stage.phone.x - (88 + COPY_W + COPY_GAP)) / (PHONE_W / 2 + BEZEL + BAND) : Infinity;
  const zoom = Math.min(wantZoom, maxZoom);
  const shift = (reduced ? 0 : sample(timeline.shift, t, cameraEase)) * (zoom / wantZoom);
  const land = reduced ? 1 : outEase(clamp01(t / 1.3));
  const phoneOpacity = reduced ? 1 : fadeEase(clamp01(t / 0.7));
  const outro = 1 - fadeEase(clamp01((t - (timeline.total - OUTRO)) / (OUTRO - 0.15)));

  // The step's words rise in after the camera starts, and leave just before the next step.
  const duration = current?.duration ?? 1;
  const wordsIn = (delay: number) => outEase(clamp01((ctx.time - 0.2 - delay) / 0.8));
  const wordsOut = 1 - fadeEase(clamp01((ctx.time - (duration - 0.6)) / 0.5));
  const words = (delay: number): React.CSSProperties => {
    const p = wordsIn(delay);
    return { opacity: Math.min(p, wordsOut), transform: reduced ? undefined : `translateY(${((1 - p) * 14).toFixed(2)}px)` };
  };

  // Before and after: the old screen fades in beside the new one, a finger drags the divider once
  // from left to right (never all the way to either edge), then the old screen fades away.
  // `wipe` is the divider's x on the phone.
  const comparing = current?.compare ? (reduced ? 1 : Math.min(fadeEase(clamp01(ctx.time / 0.4)), 1 - fadeEase(clamp01((ctx.time - (duration - 0.5)) / 0.4)))) : 0;
  const wipe = current?.compare ? (reduced ? PHONE_W / 2 : sample([[0.9, PHONE_W * 0.2], [duration - 0.9, PHONE_W * 0.8]], ctx.time, cameraEase)) : 0;
  const dragging = current?.compare && !reduced ? Math.min(clamp01((ctx.time - 0.5) / 0.3), 1 - clamp01((ctx.time - (duration - 0.9)) / 0.3)) : 0;

  // Callout: the element is ringed and a line draws out from the words to it.
  const callout = current?.callout && calloutBox ? Math.min(reduced ? 1 : outEase(clamp01((ctx.time - 0.6) / 1)), wordsOut) : 0;
  const onStage = (x: number, y: number) => ({
    x: stage.phone.x + (x - PHONE_W / 2) * zoom,
    y: stage.phone.y + (y - PHONE_H / 2) * zoom + shift + (1 - land) * 40,
  });
  // The label sits just outside the phone on the side nearer the element, level with it.
  const calloutLeft = calloutBox ? calloutBox.x + calloutBox.w / 2 < PHONE_W / 2 : true;
  const lineStart = calloutBox ? onStage(calloutLeft ? calloutBox.x - 6 : calloutBox.x + calloutBox.w + 6, calloutBox.y + calloutBox.h / 2) : { x: 0, y: 0 };
  const phoneEdge = (PHONE_W / 2 + BEZEL + BAND) * zoom;
  const lineEnd = { x: calloutLeft ? stage.phone.x - phoneEdge - 28 : stage.phone.x + phoneEdge + 28, y: lineStart.y };

  // Seconds from the press, while the touch is on screen (it arrives just before and leaves just after).
  const touchT = current?.tap ? ctx.time - (current.tapAt ?? TAP_AT) : -Infinity;
  const touch = !reduced && touchT >= -TOUCH_LEAD && touchT <= TOUCH_TAIL ? touchT : null;

  return (
    <div ref={hostRef} className={cn("relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden", className)}>
      <div ref={fitRef} style={{ width: stage.w, height: stage.h, flex: "none", transformOrigin: "center" }}>
        <div
          style={{ position: "relative", width: stage.w, height: stage.h, borderRadius: 32, overflow: "hidden", background: STAGE, fontFamily: FONT }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: outro }}>
            {/* Copy */}
            <div style={{ position: "absolute", ...stage.copy }}>
              {current ? (
                <div key={ctx.step}>
                  <div style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-0.02em", color: INK, ...words(0) }}>{current.title}</div>
                  {current.caption ? (
                    <div style={{ marginTop: 12, maxWidth: 280, fontSize: 16, lineHeight: 1.5, color: CAPTION, ...words(0.1) }}>{current.caption}</div>
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
                  transform: `translate(-50%, -50%) translateY(${(shift + (1 - land) * 40).toFixed(2)}px) scale(${zoom.toFixed(4)})`,
                  transformOrigin: "center",
                  // Composited on the GPU, so the camera moves never wait on layout.
                  willChange: "transform, opacity",
                }}
              >
                <IPhoneFrame />
                <div
                  ref={phoneRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: SCREEN_RADIUS,
                    overflow: "hidden",
                    background: SCREEN,
                  }}
                >
                  {children ? children(ctx) : <SkeletonFeed ctx={ctx} fade={fade} />}
                  {current?.compare && comparing > 0 ? (
                    <div style={{ position: "absolute", inset: 0, opacity: comparing }}>
                      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${wipe.toFixed(2)}px)` }}>{current.compare(ctx)}</div>
                      <span style={{ position: "absolute", left: wipe - 1, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,.9)" }} />
                      <span
                        style={{
                          position: "absolute",
                          left: wipe,
                          top: PHONE_H / 2,
                          width: 30,
                          height: 30,
                          marginLeft: -15,
                          marginTop: -15,
                          borderRadius: "50%",
                          background: SCREEN,
                          boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.9)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke={ICON} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {dragging > 0 ? (
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            left: wipe,
                            top: PHONE_H / 2,
                            width: TOUCH_SIZE,
                            height: TOUCH_SIZE,
                            borderRadius: "50%",
                            background: "rgba(150,150,156,.55)",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7), 0 3px 12px rgba(0,0,0,.35)",
                            transform: "translate(-50%, -50%)",
                            opacity: dragging,
                          }}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {callout > 0 && calloutBox ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: calloutBox.x - 6,
                        top: calloutBox.y - 6,
                        width: calloutBox.w + 12,
                        height: calloutBox.h + 12,
                        borderRadius: Math.min(calloutBox.w, calloutBox.h) / 2 + 6,
                        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.9)",
                        opacity: callout,
                        transform: `scale(${(1.25 - 0.25 * callout).toFixed(3)})`,
                      }}
                    />
                  ) : null}
                  <DynamicIsland />
                  {touch !== null && rippleAt ? <TouchPoint at={rippleAt} t={touch} /> : null}
                </div>
              </div>
            </div>
            {callout > 0 && current?.callout ? (
              <>
                <svg aria-hidden="true" width={stage.w} height={stage.h} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
                  <line x1={lineStart.x} y1={lineStart.y} x2={lerp(lineStart.x, lineEnd.x, callout)} y2={lineEnd.y} stroke="rgba(255,255,255,.85)" strokeWidth={1.5} />
                  <circle cx={lineStart.x} cy={lineStart.y} r={3} fill={ICON} />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    top: lineEnd.y,
                    ...(calloutLeft ? { right: stage.w - lineEnd.x } : { left: lineEnd.x }),
                    transform: `translateY(-50%) translateX(${((1 - clamp01((callout - 0.7) / 0.3)) * (calloutLeft ? 8 : -8)).toFixed(2)}px)`,
                    opacity: clamp01((callout - 0.7) / 0.3),
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "#26272b",
                    boxShadow: HAIRLINE,
                    color: INK,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {current.callout.label}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
