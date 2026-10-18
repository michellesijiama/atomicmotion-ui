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
  /** Seconds into the step when the press lands. Defaults to 1.2, just after the camera settles. */
  tapAt?: number;
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

/** Each layout's true stage size, phone centre and copy box. The stage is scaled down to fit
 *  whatever it is put in. */
const LAYOUTS = {
  split: {
    w: 960,
    h: 680,
    phone: { x: 660, y: 340 },
    viewTop: 0,
    copy: { left: 88, top: "50%", width: 360, transform: "translateY(-50%)" },
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
const INTRO = 1.1;
const OUTRO = 0.9;
const CAMERA = 0.9;
const TAP_AT = 1.2;
const TAP_LENGTH = 0.45;
const RIPPLE_LENGTH = 0.55;

/** The Lumen film's camera curve: zero speed at both ends, an early peak, a long soft settle. */
const cameraEase = cubicBezier(0.42, 0, 0.16, 1);
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
      const p = outEase(clamp01((t - 0.3 - layer * 0.09) / 0.6));
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

const SKELETON = "#ececee";
const LIKED = "#f65866";
/** One post: a 328px card, its meta row and three lines, then a gap that hides the next card at rest. */
const POST_H = 470;
/** Phone-local y of the tabs and of the second post's action row, for the default script's camera. */
const TABS_Y = 106;
const ACTIONS_Y = 492;

type Palette = { top: string; mid: string; bottom: string; arc: string };
const PALETTES: Record<"following" | "forYou" | "next", Palette> = {
  following: { top: "#f65866", mid: "#f9a0a6", bottom: "#efbca6", arc: "#f7877a" },
  forYou: { top: "#8f7cf0", mid: "#c3b5f7", bottom: "#f3c9b9", arc: "#a993f2" },
  next: { top: "#ff9a52", mid: "#ffc58f", bottom: "#f8dcc0", arc: "#ffae6b" },
};

const ICONS = {
  star: "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z",
  comment: "M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z",
  heart:
    "M12 20.5s-7.5-4.4-9.3-9.1C1.5 8.2 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.7 4.5 6.9-1.8 4.7-9.3 9.1-9.3 9.1z",
};

function Icon({ path, fill, style }: { path: string; fill: string; style?: React.CSSProperties }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", ...style }}>
      <path d={path} fill={fill} />
    </svg>
  );
}

function Card({ palette, style }: { palette: Palette; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 16,
        overflow: "hidden",
        background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.mid} 52%, ${palette.bottom} 100%)`,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 62,
          width: 420,
          height: 420,
          marginLeft: -210,
          borderRadius: "50%",
          background: "rgba(255,255,255,.22)",
          border: "1px solid rgba(255,255,255,.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 168,
          width: 380,
          height: 380,
          marginLeft: -190,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${palette.arc} 0%, ${palette.bottom} 60%)`,
          opacity: 0.85,
        }}
      />
    </div>
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
        <div style={{ position: "absolute", left: 5, top: 339, width: 32, height: 32, borderRadius: "50%", background: SKELETON }} />
        <div style={{ ...bar(45, 352, 50), height: 6 }} />
        <Icon path={ICONS.star} fill={SKELETON} style={{ position: "absolute", left: 156, top: 346 }} />
        <Icon path={ICONS.comment} fill={SKELETON} style={{ position: "absolute", left: 185, top: 346 }} />
        <div data-walk={heart ? "like" : undefined} style={{ position: "absolute", left: 216, top: 346, width: 18, height: 18, transform: `scale(${heartScale.toFixed(3)})` }}>
          <Icon path={ICONS.heart} fill={SKELETON} style={{ position: "absolute", inset: 0 }} />
          <Icon path={ICONS.heart} fill={LIKED} style={{ position: "absolute", inset: 0, opacity: liked }} />
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
  const scroll = ctx.progress(2, 0.5, 1.4) * POST_H;
  const mask = fade ? "linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 56px), transparent 100%)" : undefined;
  return (
    <>
      {/* Menu */}
      <div style={{ position: "absolute", left: 20, top: 52, display: "grid", gap: 4, ...ctx.enter(0) }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: "block", width: 14, height: 1.5, borderRadius: 1, background: "#f4f4f5" }} />
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
            background: "#ffffff",
            boxShadow: "0 2px 6px rgba(0,0,0,.06)",
            transform: `translateX(${(forYou * 128).toFixed(2)}px)`,
          }}
        />
        {(["Following", "For you"] as const).map((label, i) => {
          const active = i === 0 ? 1 - forYou : forYou;
          return (
            <div
              key={label}
              data-walk={i === 1 ? "for-you" : undefined}
              style={{
                position: "absolute",
                top: 0,
                left: i * 128,
                width: 124,
                height: 32,
                display: "grid",
                placeItems: "center",
                fontSize: 12.5,
                color: active > 0.5 ? "#2c2c2e" : "#5a5a5e",
                transform: i === 1 ? `scale(${(1 - 0.05 * forYouPress).toFixed(3)})` : undefined,
              }}
            >
              {label}
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
                <Card palette={PALETTES.following} />
                <Card palette={PALETTES.forYou} style={{ opacity: forYou }} />
              </>
            }
          />
          <Post top={15 + POST_H} ctx={ctx} card={<Card palette={PALETTES.next} />} heart={{ liked: ctx.tapped(3), press: ctx.press("like") }} />
        </div>
      </div>
    </>
  );
}

/** The default script, written for the skeleton feed. Copy it as a starting point for your own. */
export const defaultWalkthroughSteps: WalkthroughStep[] = [
  { title: "A calmer feed", caption: "Everything you follow in one quiet column", duration: 3 },
  { title: "Switch feeds", caption: "Following and For you sit one tap apart", duration: 3.4, focus: { y: TABS_Y, zoom: 1.6 }, tap: "for-you" },
  { title: "Scroll at your pace", caption: "Each post gets the whole screen", duration: 3 },
  { title: "Save what you love", caption: "One tap keeps it for later", duration: 3.4, focus: { y: ACTIONS_Y, zoom: 1.6 }, tap: "like" },
  { title: "Ready when you are", caption: "Your feed waits right where you left it", duration: 2.2 },
];

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

  // Where the tapped control sits on the phone canvas, for the ripple. Measured per step;
  // dividing by the rendered width undoes both the fit scale and the camera zoom.
  const [rippleAt, setRippleAt] = React.useState<{ x: number; y: number } | null>(null);
  React.useLayoutEffect(() => {
    const phone = phoneRef.current;
    const target = current?.tap ? phone?.querySelector<HTMLElement>(`[data-walk="${current.tap}"]`) : null;
    if (!phone || !target) return setRippleAt(null);
    const p = phone.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    const unit = p.width / PHONE_W;
    setRippleAt({ x: (r.left + r.width / 2 - p.left) / unit, y: (r.top + r.height / 2 - p.top) / unit });
  }, [ctx.step, current?.tap]);

  const zoom = reduced ? 1 : sample(timeline.zoom, t, cameraEase);
  const shift = reduced ? 0 : sample(timeline.shift, t, cameraEase);
  const land = reduced ? 1 : outEase(clamp01(t / 0.9));
  const phoneOpacity = reduced ? 1 : fadeEase(clamp01(t / 0.5));
  const outro = 1 - fadeEase(clamp01((t - (timeline.total - OUTRO)) / (OUTRO - 0.15)));

  // The step's words rise in after the camera starts, and leave just before the next step.
  const duration = current?.duration ?? 1;
  const wordsIn = (delay: number) => outEase(clamp01((ctx.time - 0.15 - delay) / 0.5));
  const wordsOut = 1 - fadeEase(clamp01((ctx.time - (duration - 0.45)) / 0.35));
  const words = (delay: number): React.CSSProperties => {
    const p = wordsIn(delay);
    return { opacity: Math.min(p, wordsOut), transform: reduced ? undefined : `translateY(${((1 - p) * 14).toFixed(2)}px)` };
  };

  const rippleT = current?.tap ? ctx.time - (current.tapAt ?? TAP_AT) : -1;
  const ripple = !reduced && rippleAt && rippleT >= 0 && rippleT <= RIPPLE_LENGTH ? rippleT / RIPPLE_LENGTH : null;

  return (
    <div ref={hostRef} className={cn("relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden", className)}>
      <div ref={fitRef} style={{ width: stage.w, height: stage.h, flex: "none", transformOrigin: "center" }}>
        <div
          style={{ position: "relative", width: stage.w, height: stage.h, borderRadius: 32, overflow: "hidden", background: "#cacacc", fontFamily: FONT }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: outro }}>
            {/* Copy */}
            <div style={{ position: "absolute", ...stage.copy }}>
              {current ? (
                <div key={ctx.step}>
                  <div style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-0.02em", color: "#1d1d1f", ...words(0) }}>{current.title}</div>
                  {current.caption ? (
                    <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.5, color: "#5f5f64", ...words(0.1) }}>{current.caption}</div>
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
                }}
              >
                <div
                  ref={phoneRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 44,
                    overflow: "hidden",
                    background: "#d9dadc",
                    border: "1px solid rgba(255,255,255,.55)",
                  }}
                >
                  {children ? children(ctx) : <SkeletonFeed ctx={ctx} fade={fade} />}
                  {ripple !== null && rippleAt ? (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: rippleAt.x,
                        top: rippleAt.y,
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.45)",
                        border: "1.5px solid rgba(255,255,255,.8)",
                        transform: `translate(-50%, -50%) scale(${(0.4 + outEase(ripple) * 1.2).toFixed(3)})`,
                        opacity: 0.9 * (1 - ripple),
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
