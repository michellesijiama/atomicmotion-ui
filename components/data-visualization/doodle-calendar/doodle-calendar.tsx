"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Doodle Calendar — every picture in this file is authored in code as flat
// SVG shapes (no strokes, no gradients, no shadows, no images), so the folder
// is self-contained: copy it anywhere and it works.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** What a day was about: a state of mind, an outing, or a small moment of nature. */
export type MomentKind = "mood" | "activity" | "nature";

export type CalendarDay = {
  /** Day of the month, 1–31. */
  day: number;
  /** Full English weekday, e.g. "Friday". */
  weekday: string;
  kind: MomentKind;
  title: string;
  sentence: string;
};

export type DoodleCalendarProps = {
  /** The day the calendar treats as today (August 2026), 1–31. Days before it are open; days after it are dots. */
  today?: number;
  /** Open the days one after another until someone touches it (the gallery card sets it). */
  loop?: boolean;
  /** A day's page was opened — by a click, the keyboard, or the loop. */
  onSelect?: (day: CalendarDay) => void;
  className?: string;
};

/* ───────────────────────────── palette & type ───────────────────────────── */

// One blue in four strengths on one grey-lilac paper — every colour in the file
// is one of these five, so the phone reads as a single ink on a single sheet.
const INK = "#2F2BD6";
const MID = "#6B67E6";
const LIGHT = "#A9A7F0";
const PALE = "#D3D2F6";
const PAPER = "#E4E4EA";
/** The white of a magazine page — the text half of an opened day. */
const PAGE = "#F6F6FA";

const INK_RGB = "47 43 214";
const ink = (a: number) => `rgb(${INK_RGB} / ${a})`;

/** The five inks, by strength: darkest, mid, light, pale, and the lightest paper. */
type Tones = { d: string; m: string; l: string; p: string; w: string };
const TONES: Tones = { d: INK, m: MID, l: LIGHT, p: PALE, w: PAPER };
/** Today's disc is the same picture printed the other way round: paper on ink. */
const TONES_INVERTED: Tones = { d: PAPER, m: PALE, l: LIGHT, p: MID, w: MID };
const C = TONES;

const FONT_SANS = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";
const FONT_MONO =
  "var(--font-geist-mono, 'Geist Mono'), 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const FONT_SERIF = "var(--font-instrument-serif, 'Instrument Serif'), Georgia, serif";

/* ───────────────────────────── layout tokens ───────────────────────────── */

// Everything hangs off these: the heading, the weekday labels, the seven
// columns and the card all share PAD, and the space between circles is GAP in
// both directions.
const PHONE_W = 340;
const PHONE_H = 608;
const BEZEL = 10;
const PHONE_RADIUS = 54;
const SCREEN_W = PHONE_W - BEZEL * 2;
const SCREEN_H = PHONE_H - BEZEL * 2;
const SCREEN_RADIUS = PHONE_RADIUS - BEZEL;

const PAD = 16;
const GAP = 3;
const CELL = (SCREEN_W - PAD * 2 - GAP * 6) / 7;

const HEAD_TOP = 44;
const HEAD_SIZE = 76;
const HEAD_LINE = 74;
const WEEKDAY_H = 14;

const CARD_X = 12;
const CARD_TOP = 212;
const CARD_W = SCREEN_W - CARD_X * 2;
const CARD_H = SCREEN_H - CARD_TOP - 16;
const CARD_RADIUS = 22;
/** The illustration is drawn on a 360 × 240 sheet and shown at the card's width. */
const ART_W = CARD_W;
const ART_H = Math.round((CARD_W * 240) / 360);

/* ───────────────────────────── the month ───────────────────────────── */

const YEAR = 2026;
const MONTH_NAME = "August";
const DAYS_IN_MONTH = 31;
/** August 1st, 2026 is a Saturday — the sixth column of a Monday-first week. */
const FIRST_COLUMN = 5;
const WEEKS = 6;

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const clampDay = (d: number) => Math.min(DAYS_IN_MONTH, Math.max(1, Math.round(d)));

/* ───────────────────────────── drawing helpers ─────────────────────────────
 * Nothing here draws a line. Ribbons, limbs, leaves and rings are all filled
 * shapes, so the pictures are cut paper rather than pen work.
 */

type Pt = readonly [number, number];

const f = (n: number) => +n.toFixed(1);
const join = (a: readonly Pt[]) => a.map(([x, y]) => `${f(x)} ${f(y)}`).join("L");

const sample = (n: number, fn: (t: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

/** A filled band that follows a run of points, its width fixed or tapering. */
function ribbon(points: readonly Pt[], width: number | ((t: number) => number)): string {
  const n = points.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const h = (typeof width === "number" ? width : width(i / (n - 1))) / 2;
    const nx = (-dy / len) * h;
    const ny = (dx / len) * h;
    left.push([points[i][0] + nx, points[i][1] + ny]);
    right.push([points[i][0] - nx, points[i][1] - ny]);
  }
  return `M${join(left)}L${join(right.reverse())}Z`;
}

const wave = (x0: number, x1: number, y: number, amp: number, wl: number, phase = 0) =>
  sample(Math.ceil((x1 - x0) / 4), (t) => [x0 + (x1 - x0) * t, y + amp * Math.sin(((x1 - x0) * t * Math.PI * 2) / wl + phase)]);

const spiral = (cx: number, cy: number, r0: number, r1: number, turns: number, a0 = 0) =>
  sample(Math.ceil(turns * 28), (t) => {
    const a = a0 + turns * Math.PI * 2 * t;
    const r = r0 + (r1 - r0) * t;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24) =>
  sample(n, (t) => {
    const u = 1 - t;
    const k0 = u * u * u;
    const k1 = 3 * u * u * t;
    const k2 = 3 * u * t * t;
    const k3 = t * t * t;
    return [k0 * p0[0] + k1 * p1[0] + k2 * p2[0] + k3 * p3[0], k0 * p0[1] + k1 * p1[1] + k2 * p2[1] + k3 * p3[1]];
  });

/** A pointed leaf, petal or flame from one end to the other, `w` fat at its belly. */
function leaf(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * w;
  const ny = ((x2 - x1) / len) * w;
  return `M${f(x1)} ${f(y1)}Q${f(mx + nx)} ${f(my + ny)} ${f(x2)} ${f(y2)}Q${f(mx - nx)} ${f(my - ny)} ${f(x1)} ${f(y1)}Z`;
}

function starPath(cx: number, cy: number, R: number, r: number, n = 5, rot = -90): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const rad = i % 2 ? r : R;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return `M${join(pts)}Z`;
}

/** A ring: a disc with a round hole, cut with even-odd fill. */
const ringPath = (cx: number, cy: number, R: number, r: number) =>
  `M${f(cx - R)} ${f(cy)}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0ZM${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0Z`;

/** A little Z for sleepers. */
const zPath = (x: number, y: number, s: number) =>
  `M${f(x)} ${f(y)}h${f(s)}v${f(s * 0.24)}l${f(-s * 0.68)} ${f(s * 0.54)}h${f(s * 0.68)}v${f(s * 0.22)}h${f(-s)}v${f(-s * 0.24)}l${f(s * 0.68)} ${f(-s * 0.54)}h${f(-s * 0.68)}Z`;

/** A capsule of paper from one point to another — an arm, a leg, a rail. */
function Bar({ x1, y1, x2, y2, w, fill, rx }: { x1: number; y1: number; x2: number; y2: number; w: number; fill: string; rx?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <rect
      x={0}
      y={-w / 2}
      width={f(len)}
      height={w}
      rx={rx ?? w / 2}
      fill={fill}
      transform={`translate(${f(x1)} ${f(y1)}) rotate(${f(deg)})`}
    />
  );
}

/** A soft cloud of five shapes, about 54 wide and 34 tall at scale 1. */
function Cloud({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <circle cx={-15} cy={2} r={11} />
      <circle cx={-1} cy={-6} r={15} />
      <circle cx={15} cy={0} r={12} />
      <rect x={-26} y={0} width={52} height={13} rx={6.5} />
    </g>
  );
}

/* ───────────────────────── laying the paper down ─────────────────────────
 * Each scene is a stack of pieces. A Piece slides or pops into place a beat
 * after the last, like cut paper being laid on a table; an Idle then gives one
 * of them a slow, small movement. Both stand still under reduced motion.
 */

const StillContext = React.createContext(false);

type Enter = "rise" | "drop" | "left" | "right" | "pop" | "fade";
const ENTER: Record<Enter, { x?: number; y?: number; scale?: number }> = {
  rise: { y: 18 },
  drop: { y: -18 },
  left: { x: -24 },
  right: { x: 24 },
  pop: { scale: 0.55 },
  fade: {},
};

const REVEAL_DELAY = 0.3;
const REVEAL_STEP = 0.075;

function Piece({
  i,
  enter = "rise",
  ox = 0.5,
  oy = 0.5,
  children,
}: {
  i: number;
  enter?: Enter;
  ox?: number;
  oy?: number;
  children: React.ReactNode;
}) {
  const still = React.useContext(StillContext);
  if (still) return <g>{children}</g>;
  return (
    <motion.g
      initial={{ opacity: 0, ...ENTER[enter] }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ delay: REVEAL_DELAY + i * REVEAL_STEP, duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
      style={{ originX: ox, originY: oy }}
    >
      {children}
    </motion.g>
  );
}

function Idle({
  animate,
  duration = 2.6,
  delay = 1.2,
  ox = 0.5,
  oy = 0.5,
  ease = "easeInOut",
  children,
}: {
  animate: Record<string, number[]>;
  duration?: number;
  delay?: number;
  ox?: number;
  oy?: number;
  ease?: "easeInOut" | "linear";
  children: React.ReactNode;
}) {
  const still = React.useContext(StillContext);
  if (still) return <g>{children}</g>;
  return (
    <motion.g animate={animate} transition={{ duration, delay, repeat: Infinity, ease }} style={{ originX: ox, originY: oy }}>
      {children}
    </motion.g>
  );
}

/* ───────────────────────────── the fourteen pages ─────────────────────────────
 * Each scene is a big picture drawn on a 300 × 240 sheet (with a little bleed
 * either side) and a motif that is a simplified miniature of it, cut for a
 * 40-unit circle. Blue monochrome: ink, mid, light, pale and paper, nothing else.
 */

const BLEED = 30;

/* 1 — Market Morning */
function ArtMarket() {
  return (
    <>
      <Piece i={0} enter="drop">
        {Array.from({ length: 7 }, (_, k) => {
          const x = -BLEED + k * 30;
          const c = k % 2 ? C.w : C.m;
          return (
            <g key={k} fill={c}>
              <rect x={x} y={0} width={30} height={30} />
              <circle cx={x + 15} cy={30} r={15} />
            </g>
          );
        })}
      </Piece>
      <Piece i={1} enter="fade">
        <rect x={-BLEED} y={206} width={360} height={40} fill={C.w} />
      </Piece>
      <Piece i={2} enter="pop">
        <g transform="rotate(-10 150 112)" fill={C.m}>
          <path d="M60 112Q66 101 80 97C112 42 188 42 220 97Q234 101 240 112Q234 123 220 127C188 182 112 182 80 127Q66 123 60 112Z" />
          <ellipse cx={122} cy={88} rx={34} ry={10} transform="rotate(-8 122 88)" fill={C.l} />
          <circle cx={170} cy={78} r={4} fill={C.l} />
          <circle cx={182} cy={92} r={2.6} fill={C.l} />
        </g>
        <Idle animate={{ rotate: [-6, 6, -6] }} ox={0.1} oy={0.9}>
          <path d={leaf(146, 60, 182, 40, 22)} fill={C.d} />
        </Idle>
      </Piece>
      <Piece i={3}>
        <Bar x1={145} y1={204} x2={141} y2={226} w={6.5} fill={C.d} />
        <Bar x1={155} y1={204} x2={162} y2={224} w={6.5} fill={C.d} />
        <rect x={139} y={176} width={22} height={32} rx={10} fill={C.d} />
        <circle cx={150} cy={166} r={9} fill={C.d} />
        <Bar x1={142} y1={186} x2={118} y2={156} w={6.5} fill={C.d} />
        <Bar x1={158} y1={186} x2={182} y2={156} w={6.5} fill={C.d} />
        <circle cx={118} cy={156} r={5} fill={C.d} />
        <circle cx={182} cy={156} r={5} fill={C.d} />
      </Piece>
    </>
  );
}
function MotifMarket({ c }: { c: Tones }) {
  return (
    <>
      <g transform="rotate(-14 20 15)" fill={c.m}>
        <path d="M6 15Q8 13 10 12.6C14 5 26 5 30 12.6Q32 13 34 15Q32 17 30 17.4C26 25 14 25 10 17.4Q8 17 6 15Z" />
        <ellipse cx={16} cy={11.6} rx={5} ry={1.9} fill={c.l} />
      </g>
      <circle cx={20} cy={28.5} r={3.2} fill={c.d} />
      <rect x={16.5} y={31.5} width={7} height={10} rx={3.4} fill={c.d} />
      <Bar x1={17} y1={33.5} x2={12} y2={24.5} w={2.2} fill={c.d} />
      <Bar x1={23} y1={33.5} x2={28} y2={24.5} w={2.2} fill={c.d} />
    </>
  );
}

/* 2 — Lazy Sunday */
function ArtPillow() {
  return (
    <>
      <Piece i={0} enter="fade">
        <rect x={-BLEED} y={196} width={360} height={50} fill={C.p} />
      </Piece>
      <Piece i={1} enter="pop" oy={1}>
        <g fill={C.w}>
          <rect x={42} y={92} width={216} height={104} rx={52} />
          <circle cx={95} cy={96} r={34} />
          <circle cx={168} cy={88} r={42} />
          <circle cx={224} cy={100} r={30} />
        </g>
        <ellipse cx={150} cy={132} rx={58} ry={22} fill={C.p} />
      </Piece>
      <Piece i={2} enter="rise">
        <circle cx={122} cy={110} r={16} fill={C.d} />
        <path d="M112 108Q117 114 122 108Q117 111 112 108Z" fill={C.w} />
        <Bar x1={136} y1={122} x2={172} y2={112} w={9} fill={C.d} />
        <Bar x1={172} y1={112} x2={186} y2={88} w={8} fill={C.d} />
        <circle cx={188} cy={83} r={5.4} fill={C.d} />
        <Bar x1={196} y1={134} x2={216} y2={106} w={10} fill={C.d} />
        <ellipse cx={219} cy={101} rx={6} ry={8} fill={C.d} transform="rotate(30 219 101)" />
      </Piece>
      <Piece i={3} enter="rise" oy={1}>
        <ellipse cx={150} cy={161} rx={104} ry={38} fill={C.p} />
        <ellipse cx={150} cy={157} rx={100} ry={34} fill={C.w} />
        <ellipse cx={104} cy={166} rx={30} ry={7} fill={C.p} />
        <ellipse cx={206} cy={170} rx={26} ry={6} fill={C.p} />
      </Piece>
      <Idle animate={{ y: [0, -7, 0], opacity: [0.7, 1, 0.7] }} duration={3.4}>
        <Piece i={5} enter="fade">
          <path d={zPath(222, 58, 20)} fill={C.w} />
          <path d={zPath(246, 34, 14)} fill={C.w} />
          <path d={zPath(262, 16, 9)} fill={C.w} />
        </Piece>
      </Idle>
    </>
  );
}
function MotifPillow({ c }: { c: Tones }) {
  return (
    <>
      <g fill={c.w}>
        <rect x={4} y={17} width={32} height={19} rx={9.5} />
        <circle cx={13} cy={18} r={7} />
        <circle cx={25} cy={16} r={8.5} />
      </g>
      <circle cx={19} cy={18} r={5.6} fill={c.d} />
      <Bar x1={24} y1={19} x2={31} y2={11} w={2.6} fill={c.d} />
      <ellipse cx={20} cy={29} rx={17} ry={6} fill={c.w} />
      <ellipse cx={20} cy={35} rx={15} ry={2.6} fill={c.p} />
    </>
  );
}

/* 3 — Monday Fog */
function ArtFog() {
  return (
    <>
      <Piece i={0} enter="left">
        <rect x={0} y={46} width={110} height={16} rx={8} fill={C.w} />
        <rect x={200} y={70} width={110} height={16} rx={8} fill={C.w} />
        <rect x={40} y={128} width={64} height={14} rx={7} fill={C.w} />
      </Piece>
      <Piece i={1}>
        <rect x={128} y={92} width={44} height={92} rx={20} fill={C.m} />
        <Bar x1={134} y1={112} x2={118} y2={158} w={11} fill={C.d} />
        <circle cx={117} cy={162} r={5.6} fill={C.l} />
        <rect x={134} y={172} width={14} height={46} rx={6} fill={C.d} />
        <rect x={152} y={172} width={14} height={46} rx={6} fill={C.d} />
      </Piece>
      <Piece i={2} enter="drop">
        <Cloud x={150} y={64} s={2} fill={C.w} />
        <circle cx={132} cy={66} r={6} fill={C.l} />
        <circle cx={170} cy={78} r={4.6} fill={C.l} />
      </Piece>
      <Piece i={3} enter="right">
        <Bar x1={166} y1={112} x2={184} y2={144} w={11} fill={C.d} />
        <path d="M190 130h30l-4 26q-1 6-6 6h-10q-5 0-6-6z" fill={C.w} />
        <path d={ringPath(222, 142, 8, 4.6)} fill={C.w} fillRule="evenodd" />
        <ellipse cx={205} cy={164} rx={19} ry={4} fill={C.m} />
        <circle cx={188} cy={146} r={5.6} fill={C.l} />
      </Piece>
      <Idle animate={{ y: [0, -5, 0], opacity: [1, 0.5, 1] }} duration={2.8}>
        <Piece i={4} enter="fade">
          <path d={ribbon(sample(18, (t) => [200 + 3.6 * Math.sin(t * 7), 124 - 30 * t]), (t) => 6 - 4.5 * t)} fill={C.l} />
          <path d={ribbon(sample(18, (t) => [211 + 3.6 * Math.sin(t * 7 + 1.4), 126 - 24 * t]), (t) => 5 - 3.5 * t)} fill={C.l} />
        </Piece>
      </Idle>
      <Piece i={5} enter="left">
        <rect x={20} y={176} width={150} height={16} rx={8} fill={C.l} />
        <rect x={130} y={198} width={180} height={16} rx={8} fill={C.w} />
      </Piece>
    </>
  );
}
function MotifFog({ c }: { c: Tones }) {
  return (
    <>
      <rect x={14} y={19} width={12} height={20} rx={5} fill={c.m} />
      <g fill={c.w}>
        <circle cx={16} cy={13} r={5} />
        <circle cx={21} cy={10} r={6.4} />
        <circle cx={26.5} cy={13.5} r={5} />
        <rect x={11} y={13} width={20} height={5} rx={2.5} />
      </g>
      <rect x={28} y={20} width={7} height={6} rx={1.4} fill={c.d} />
      <rect x={2} y={27} width={26} height={4} rx={2} fill={c.l} />
      <rect x={14} y={34} width={26} height={4} rx={2} fill={c.l} />
    </>
  );
}

/* 4 — Bees in the Lavender */
const STALKS = [
  { x: 40, top: 86, lean: -8, tone: "m" },
  { x: 92, top: 50, lean: 6, tone: "d" },
  { x: 152, top: 100, lean: -3, tone: "l" },
  { x: 206, top: 58, lean: -6, tone: "d" },
  { x: 262, top: 90, lean: 8, tone: "m" },
] as const;

function Bee({ x, y, s, flip = false }: { x: number; y: number; s: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx={-3} cy={-11} rx={6.4} ry={10} fill={C.w} transform="rotate(-28 -3 -11)" />
      <ellipse cx={7} cy={-11} rx={6.4} ry={10} fill={C.w} transform="rotate(16 7 -11)" />
      <path d="M-15 0l-7 2.4l7 2.4z" fill={C.d} />
      <ellipse cx={0} cy={0} rx={16} ry={11.5} fill={C.d} />
      <ellipse cx={-5} cy={0} rx={2.6} ry={10} fill={C.l} />
      <ellipse cx={3} cy={0} rx={2.6} ry={11} fill={C.l} />
      <circle cx={15} cy={-1} r={7.4} fill={C.d} />
      <circle cx={17.4} cy={-3} r={2} fill={C.w} />
      <Bar x1={15} y1={-7} x2={20} y2={-15} w={1.8} fill={C.d} />
    </g>
  );
}

function ArtLavender() {
  return (
    <>
      <Piece i={0} enter="fade">
        <path d={`M${-BLEED} 206Q90 172 170 200T330 190V246H${-BLEED}Z`} fill={C.l} />
        <path d={`M${-BLEED} 226Q120 206 330 224V246H${-BLEED}Z`} fill={C.m} />
      </Piece>
      {STALKS.map((s, k) => {
        const fill = C[s.tone];
        const stem = bez([s.x, 232], [s.x + s.lean * 0.3, 190], [s.x + s.lean, 140], [s.x + s.lean, s.top + 40]);
        const florets = Array.from({ length: 8 }, (_, j) => {
          const t = j / 7;
          const cx = s.x + s.lean;
          const cy = s.top + 6 + t * 58;
          const rx = 3 + (1 - Math.abs(t - 0.45)) * 3;
          return (
            <g key={j} fill={fill}>
              <ellipse cx={cx - 4} cy={cy} rx={rx} ry={6} transform={`rotate(-24 ${cx - 4} ${cy})`} />
              <ellipse cx={cx + 4} cy={cy + 3} rx={rx} ry={6} transform={`rotate(24 ${cx + 4} ${cy + 3})`} />
            </g>
          );
        });
        return (
          <Piece key={k} i={1 + k} enter="rise" oy={1}>
            <path d={ribbon(stem, (t) => 5 - 2.5 * t)} fill={fill} />
            <path d={leaf(s.x, 232, s.x - 26, 196, 10)} fill={fill} />
            <path d={leaf(s.x, 226, s.x + 24, 194, 9)} fill={fill} />
            {florets}
            <ellipse cx={s.x + s.lean} cy={s.top - 4} rx={3} ry={7} fill={fill} />
          </Piece>
        );
      })}
      <Piece i={7} enter="pop">
        <Idle animate={{ y: [0, -6, 0], x: [0, 3, 0] }} duration={2.4}>
          <Bee x={112} y={122} s={1.35} />
        </Idle>
        <Idle animate={{ y: [0, -5, 0] }} duration={2.9} delay={1.5}>
          <Bee x={222} y={146} s={0.95} flip />
        </Idle>
        <Idle animate={{ y: [0, -4, 0] }} duration={2.2} delay={1.9}>
          <Bee x={64} y={50} s={0.62} />
        </Idle>
      </Piece>
    </>
  );
}
function MotifLavender({ c }: { c: Tones }) {
  return (
    <>
      <g fill={c.m}>
        <rect x={10.2} y={20} width={1.6} height={20} />
        <rect x={19.2} y={16} width={1.6} height={24} />
        <rect x={28.2} y={20} width={1.6} height={20} />
      </g>
      <g fill={c.d}>
        <ellipse cx={11} cy={15} rx={3} ry={9} />
        <ellipse cx={20} cy={11} rx={3.2} ry={10} />
        <ellipse cx={29} cy={15} rx={3} ry={9} />
      </g>
      <ellipse cx={26} cy={27} rx={2.6} ry={3.4} fill={c.w} transform="rotate(-20 26 27)" />
      <ellipse cx={28} cy={29} rx={5.2} ry={3.6} fill={c.d} />
      <ellipse cx={27} cy={29} rx={0.9} ry={3.4} fill={c.l} />
    </>
  );
}

/* 5 — Laps at the Lido */
function ArtLido() {
  const beads = (y: number) =>
    Array.from({ length: 30 }, (_, k) => <circle key={k} cx={-BLEED + 6 + k * 12} cy={y} r={4.4} fill={k % 2 ? C.w : C.d} />);
  return (
    <>
      <Piece i={0} enter="fade">
        <rect x={-BLEED} y={0} width={360} height={22} fill={C.w} />
        <rect x={-BLEED} y={218} width={360} height={28} fill={C.w} />
        {Array.from({ length: 10 }, (_, k) => (
          <g key={k} fill={C.p}>
            <rect x={-BLEED + 6 + k * 36} y={5} width={26} height={12} rx={3} />
            <rect x={-BLEED + 6 + k * 36} y={222} width={26} height={12} rx={3} />
          </g>
        ))}
      </Piece>
      <Piece i={1} enter="left">
        {[
          [51, 0],
          [96, 1.6],
          [144, 3],
          [189, 4.4],
        ].map(([y, ph]) => (
          <path key={y} d={ribbon(wave(-BLEED, 330, y, 4.5, 64, ph), 4.4)} fill={C.p} />
        ))}
      </Piece>
      <Piece i={2} enter="fade">
        {beads(80)}
        {beads(160)}
      </Piece>
      <Piece i={3} enter="right">
        <Idle animate={{ x: [0, 9, 0] }} duration={3.4}>
          <g transform="translate(150 120) scale(1.2)">
            <path d={ribbon(wave(-104, -34, 0, 3.4, 44, 0.6), (t) => 1.5 + 7 * t)} fill={C.w} />
            <circle cx={-72} cy={-15} r={5} fill={C.w} />
            <circle cx={-80} cy={7} r={4} fill={C.w} />
            <circle cx={-66} cy={17} r={3.4} fill={C.w} />
            <circle cx={-94} cy={-9} r={3} fill={C.w} />
            <Bar x1={-30} y1={-4} x2={-62} y2={-12} w={7} fill={C.d} />
            <Bar x1={-30} y1={4} x2={-62} y2={11} w={7} fill={C.d} />
            <Bar x1={24} y1={7} x2={-6} y2={23} w={7} fill={C.d} />
            <rect x={-32} y={-9.5} width={68} height={19} rx={9.5} fill={C.d} />
            <Bar x1={26} y1={-7} x2={66} y2={-19} w={7} fill={C.d} />
            <circle cx={70} cy={-20} r={4.6} fill={C.d} />
            <circle cx={44} cy={0} r={9.5} fill={C.w} />
            <circle cx={47} cy={0} r={2.2} fill={C.m} />
          </g>
        </Idle>
      </Piece>
    </>
  );
}
function MotifLido({ c }: { c: Tones }) {
  return (
    <>
      <path d={ribbon(wave(0, 40, 6, 1.6, 20), 3)} fill={c.p} />
      <path d={ribbon(wave(0, 40, 34, 1.6, 20, 2), 3)} fill={c.p} />
      <rect x={0} y={11.4} width={40} height={2.6} fill={c.w} />
      <rect x={0} y={26} width={40} height={2.6} fill={c.w} />
      <rect x={9} y={17.6} width={17} height={4.8} rx={2.4} fill={c.d} />
      <circle cx={28.5} cy={20} r={3.6} fill={c.w} />
      <Bar x1={24} y1={18.5} x2={35} y2={14.5} w={2.2} fill={c.d} />
      <Bar x1={8} y1={19} x2={3} y2={17} w={2.2} fill={c.d} />
      <circle cx={4} cy={22.5} r={1.4} fill={c.w} />
    </>
  );
}

/* 6 — Overthinking */
function ArtHead() {
  return (
    <>
      <Piece i={0} enter="fade">
        <rect x={-BLEED} y={214} width={360} height={32} fill={C.w} />
      </Piece>
      <Piece i={1} enter="pop" oy={1}>
        <circle cx={182} cy={124} r={90} fill={C.l} />
      </Piece>
      <Piece i={2} enter="pop">
        <Idle animate={{ rotate: [0, 360] }} duration={16} delay={0.8} ease="linear">
          <path d={ribbon(spiral(160, 82, 1, 27, 3), (t) => 3 + 3.4 * t)} fill={C.d} />
        </Idle>
        <path d={ribbon(spiral(214, 84, 1, 20, 2.6, 2), (t) => 2.6 + 2.6 * t)} fill={C.m} />
        <path d={ribbon(spiral(196, 52, 1, 11, 2.2, 4), 3)} fill={C.m} />
      </Piece>
      <Piece i={3} enter="rise">
        <circle cx={150} cy={152} r={14} fill={C.w} />
        <circle cx={206} cy={152} r={14} fill={C.w} />
        <circle cx={144} cy={148} r={5.6} fill={C.d} />
        <circle cx={200} cy={148} r={5.6} fill={C.d} />
        <path d={leaf(128, 134, 162, 124, 5)} fill={C.d} />
        <path d={leaf(228, 134, 194, 124, 5)} fill={C.d} />
        <path d={ribbon(wave(160, 206, 188, 3, 24), 5)} fill={C.d} />
      </Piece>
      <Piece i={4} enter="left" oy={1}>
        <Bar x1={30} y1={216} x2={74} y2={72} w={5} fill={C.m} />
        <Bar x1={56} y1={222} x2={100} y2={78} w={5} fill={C.m} />
        {[0.12, 0.26, 0.4, 0.54, 0.68, 0.82].map((t) => (
          <Bar key={t} x1={30 + 44 * t + 0} y1={216 - 144 * t} x2={56 + 44 * t} y2={222 - 144 * t} w={3.4} fill={C.m} />
        ))}
      </Piece>
      <Piece i={5} enter="pop" oy={1}>
        <Bar x1={76} y1={106} x2={72} y2={96} w={5.4} fill={C.d} />
        <Bar x1={80} y1={106} x2={86} y2={97} w={5.4} fill={C.d} />
        <Bar x1={79} y1={96} x2={83} y2={78} w={10} fill={C.d} />
        <circle cx={85} cy={68} r={7.6} fill={C.d} />
        <Bar x1={83} y1={82} x2={108} y2={80} w={4.6} fill={C.d} />
        <Bar x1={80} y1={86} x2={72} y2={94} w={4.6} fill={C.d} />
      </Piece>
    </>
  );
}
function MotifHead({ c }: { c: Tones }) {
  return (
    <>
      <circle cx={24} cy={24} r={14} fill={c.l} />
      <path d={ribbon(spiral(24, 19, 0.6, 8.4, 2.2), (t) => 1.6 + 1.6 * t)} fill={c.d} />
      <Bar x1={3} y1={40} x2={9} y2={9} w={2} fill={c.m} />
      <Bar x1={9} y1={40} x2={15} y2={9} w={2} fill={c.m} />
      <Bar x1={4.6} y1={30} x2={11} y2={30} w={1.4} fill={c.m} />
      <Bar x1={5.6} y1={22} x2={12} y2={22} w={1.4} fill={c.m} />
    </>
  );
}

/* 7 — Coffee with an Old Friend */
function ArtCups() {
  const body = "M52 92H140C140 152 126 190 96 190C66 190 52 152 52 92Z";
  return (
    <>
      <Piece i={0} enter="fade">
        <rect x={-BLEED} y={196} width={360} height={50} fill={C.w} />
      </Piece>
      <Piece i={1} enter="rise">
        <g transform="rotate(8 96 192)">
          <path d={ringPath(50, 130, 24, 14)} fill={C.d} fillRule="evenodd" />
          <path d={body} fill={C.d} />
          <ellipse cx={96} cy={92} rx={44} ry={9} fill={C.w} />
          <ellipse cx={96} cy={93} rx={37} ry={6} fill={C.l} />
          <circle cx={82} cy={128} r={3.6} fill={C.w} />
          <circle cx={110} cy={128} r={3.6} fill={C.w} />
          <path d="M80 142Q96 158 112 142Q96 149 80 142Z" fill={C.w} />
        </g>
        <ellipse cx={100} cy={194} rx={54} ry={8} fill={C.m} />
      </Piece>
      <Piece i={2} enter="rise">
        <g transform="rotate(-8 204 192)">
          <path d={ringPath(250, 130, 24, 14)} fill={C.m} fillRule="evenodd" />
          <path d={body} fill={C.m} transform="translate(108 0)" />
          <ellipse cx={204} cy={92} rx={44} ry={9} fill={C.w} />
          <ellipse cx={204} cy={93} rx={37} ry={6} fill={C.l} />
          <circle cx={190} cy={128} r={3.6} fill={C.w} />
          <circle cx={218} cy={128} r={3.6} fill={C.w} />
          <path d="M188 142Q204 158 220 142Q204 149 188 142Z" fill={C.w} />
        </g>
        <ellipse cx={200} cy={194} rx={54} ry={8} fill={C.d} />
      </Piece>
      <Idle animate={{ y: [0, -4, 0] }} duration={2.6}>
        <Piece i={3} enter="fade">
          <path d={ribbon(bez([118, 82], [98, 62], [134, 60], [147, 34]), (t) => 8 - 6 * t)} fill={C.m} />
          <path d={ribbon(bez([182, 82], [202, 62], [166, 60], [153, 34]), (t) => 8 - 6 * t)} fill={C.d} />
        </Piece>
      </Idle>
    </>
  );
}
function MotifCups({ c }: { c: Tones }) {
  return (
    <>
      <path d={ribbon(bez([13, 15], [7, 10], [17, 9], [19, 4]), (t) => 3.4 - 2.4 * t)} fill={c.l} />
      <path d={ribbon(bez([27, 15], [33, 10], [23, 9], [21, 4]), (t) => 3.4 - 2.4 * t)} fill={c.l} />
      <g transform="rotate(9 12 34)">
        <path d="M2 16H22C22 29 18 35 12 35C6 35 2 29 2 16Z" fill={c.d} />
        <ellipse cx={12} cy={16} rx={10} ry={2.4} fill={c.w} />
      </g>
      <g transform="rotate(-9 28 34)">
        <path d="M18 16H38C38 29 34 35 28 35C22 35 18 29 18 16Z" fill={c.m} />
        <ellipse cx={28} cy={16} rx={10} ry={2.4} fill={c.w} />
      </g>
      <rect x={0} y={35} width={40} height={5} fill={c.w} />
    </>
  );
}

/* 8 — Moonrise over the Roofs */
const HOUSES: readonly (readonly [number, number, number, number, number?])[] = [
  // x, width, wall top, roof peak, chimney x
  [-34, 70, 194, 160, 6],
  [30, 54, 186, 166],
  [78, 62, 198, 172, 40],
  [132, 70, 190, 150],
  [196, 56, 188, 162, 34],
  [246, 64, 196, 158],
  [306, 70, 190, 164, 30],
  [-104, 70, 190, 156],
];

function ArtMoon() {
  return (
    <>
      <Piece i={0} enter="fade">
        {[[18, 26], [46, 62], [86, 20], [222, 30], [270, 58], [304, 22], [-8, 96], [276, 108]].map(([x, y], k) => (
          <Idle key={k} animate={{ scale: [1, 0.55, 1], opacity: [1, 0.5, 1] }} duration={2.2 + (k % 3) * 0.5} delay={1 + k * 0.3}>
            <path d={starPath(x, y, 5.5, 1.6, 4)} fill={C.w} />
          </Idle>
        ))}
      </Piece>
      <Piece i={1} enter="pop">
        <circle cx={150} cy={122} r={114} fill={C.l} />
      </Piece>
      <Piece i={2} enter="rise">
        <circle cx={150} cy={122} r={92} fill={C.w} />
        <g fill={C.p}>
          <circle cx={116} cy={92} r={17} />
          <circle cx={184} cy={78} r={9} />
          <circle cx={172} cy={138} r={22} />
          <circle cx={108} cy={148} r={8} />
          <circle cx={200} cy={108} r={6} />
        </g>
      </Piece>
      <Piece i={3} enter="rise" oy={1}>
        {HOUSES.map(([x, w, wall, peak, chim], k) => (
          <g key={k} fill={C.d}>
            <path d={`M${x} 246V${wall}L${x + w / 2} ${peak}L${x + w} ${wall}V246Z`} />
            {chim ? <rect x={x + chim - 5} y={peak + 2} width={9} height={22} /> : null}
          </g>
        ))}
        <g fill={C.p}>
          {[[-12, 216], [10, 224], [40, 214], [60, 226], [96, 220], [150, 214], [168, 224], [208, 212], [230, 222], [264, 216], [284, 226]].map(([x, y], k) => (
            <rect key={k} x={x} y={y} width={8} height={10} rx={1.5} />
          ))}
        </g>
      </Piece>
      <Piece i={4} enter="pop" oy={1}>
        <g fill={C.d}>
          <ellipse cx={168} cy={148} rx={8} ry={11} />
          <circle cx={168} cy={133} r={6.6} />
          <path d="M162 130l1-10l6 6zM174 130l-1-10l-6 6z" />
          <path d={ribbon(bez([174, 156], [196, 158], [196, 138], [184, 136]), 3.6)} />
        </g>
      </Piece>
    </>
  );
}
function MotifMoon({ c }: { c: Tones }) {
  return (
    <>
      <circle cx={20} cy={18} r={16} fill={c.l} />
      <circle cx={20} cy={18} r={12.4} fill={c.w} />
      <path d="M0 40V31L6 26L12 31H15L21 22L27 31H30L35 25L40 30V40Z" fill={c.d} />
      <ellipse cx={22} cy={20} rx={1.6} ry={2.6} fill={c.d} />
    </>
  );
}

/* 9 — Reading in the Park */
/** One slope of the open book, seen end-on: cover, block of pages and the lines of the leaves. */
function BookSlope({ side }: { side: 1 | -1 }) {
  const ax = 150;
  const ay = 56;
  const fx = 150 + side * 100;
  const fy = 200;
  const len = Math.hypot(fx - ax, fy - ay);
  const dx = (fx - ax) / len;
  const dy = (fy - ay) / len;
  // Unit normal pointing up and out of the tent.
  const nx = side * Math.abs(dy);
  const ny = -Math.abs(dx);
  const at = (o: number, t = 0): [number, number] => [ax + dx * len * t + nx * o, ay + dy * len * t + ny * o];
  const bar = (o: number, w: number, fill: string, t0 = 0, t1 = 1, rx?: number) => {
    const [x1, y1] = at(o, t0);
    const [x2, y2] = at(o, t1);
    return <Bar x1={x1} y1={y1} x2={x2} y2={y2} w={w} fill={fill} rx={rx} />;
  };
  return (
    <g>
      {bar(2, 20, C.w, 0.02, 0.98, 3)}
      {[-4, 0, 4].map((o) => (
        <React.Fragment key={o}>{bar(o + 2, 1.6, C.p, 0.06, 0.94)}</React.Fragment>
      ))}
      {bar(14, 9, C.m, 0, 1.02, 3)}
    </g>
  );
}

function ArtBook() {
  return (
    <>
      <Piece i={0} enter="fade">
        <path d={`M${-BLEED} 196Q80 184 150 194T330 188V246H${-BLEED}Z`} fill={C.l} />
        <path d={`M${-BLEED} 216Q100 204 330 218V246H${-BLEED}Z`} fill={C.m} />
      </Piece>
      <Piece i={1} enter="rise" oy={1}>
        <Idle animate={{ rotate: [-1.6, 1.6, -1.6] }} duration={3.6} ox={0.5} oy={1}>
          <Bar x1={268} y1={206} x2={268} y2={150} w={7} fill={C.d} />
          <g fill={C.m}>
            <circle cx={268} cy={124} r={27} />
            <circle cx={248} cy={142} r={18} />
            <circle cx={288} cy={140} r={18} />
          </g>
          <circle cx={260} cy={116} r={8} fill={C.l} />
        </Idle>
      </Piece>
      <Piece i={2} enter="pop" oy={1}>
        <path d="M150 84L84 200H216Z" fill={C.l} />
      </Piece>
      <Piece i={3} enter="rise">
        <circle cx={112} cy={184} r={9.5} fill={C.d} />
        <rect x={116} y={180} width={62} height={14} rx={7} fill={C.d} />
        <Bar x1={158} y1={182} x2={168} y2={160} w={6.6} fill={C.d} />
        <Bar x1={168} y1={160} x2={180} y2={182} w={6.6} fill={C.d} />
        <path d="M108 164l12-6l12 6v11l-12-6l-12 6z" fill={C.w} />
        <path d={ribbon(bez([150, 84], [150, 110], [144, 128], [150, 152]), (t) => 6 - 3 * t)} fill={C.d} />
      </Piece>
      <Piece i={4} enter="pop" oy={1}>
        <BookSlope side={-1} />
        <BookSlope side={1} />
        <circle cx={150} cy={52} r={10} fill={C.m} />
      </Piece>
    </>
  );
}
function MotifBook({ c }: { c: Tones }) {
  return (
    <>
      <path d="M0 33Q10 30 20 33T40 31V40H0Z" fill={c.l} />
      <path d="M20 14L11 32H29Z" fill={c.l} />
      <Bar x1={20} y1={10} x2={7} y2={33} w={5} fill={c.w} rx={1} />
      <Bar x1={20} y1={10} x2={33} y2={33} w={5} fill={c.w} rx={1} />
      <Bar x1={18.6} y1={8.6} x2={5.4} y2={31} w={2.6} fill={c.m} rx={1} />
      <Bar x1={21.4} y1={8.6} x2={34.6} y2={31} w={2.6} fill={c.m} rx={1} />
      <circle cx={16} cy={31} r={1.9} fill={c.d} />
      <rect x={17} y={30} width={9} height={2.6} rx={1.3} fill={c.d} />
    </>
  );
}

/* 10 — Rain Indoors */
function ArtRain() {
  const drops: readonly (readonly [number, number, number])[] = [
    [98, 0, 1.9],
    [124, 0.9, 2.3],
    [186, 0.4, 2.1],
    [214, 1.3, 1.8],
    [78, 1.7, 2.4],
    [232, 0.2, 2.2],
  ];
  return (
    <>
      <Piece i={0} enter="fade">
        <rect x={-BLEED} y={190} width={360} height={56} fill={C.w} />
        <rect x={-BLEED} y={186} width={360} height={5} fill={C.l} />
      </Piece>
      <Piece i={1} enter="right">
        <rect x={20} y={40} width={62} height={92} rx={4} fill={C.d} />
        <g fill={C.l}>
          <rect x={26} y={46} width={22} height={38} />
          <rect x={54} y={46} width={22} height={38} />
          <rect x={26} y={90} width={22} height={36} />
          <rect x={54} y={90} width={22} height={36} />
        </g>
        <rect x={16} y={130} width={70} height={7} rx={2} fill={C.m} />
      </Piece>
      <Piece i={2} enter="left">
        <rect x={252} y={112} width={4} height={92} fill={C.d} />
        <path d="M238 112L246 84H262L270 112Z" fill={C.m} />
        <ellipse cx={254} cy={206} rx={14} ry={4} fill={C.d} />
      </Piece>
      <Piece i={3} enter="drop">
        <Cloud x={150} y={36} s={1.7} fill={C.d} />
      </Piece>
      <Piece i={4} enter="fade">
        <ellipse cx={82} cy={214} rx={26} ry={6} fill={C.l} />
        <ellipse cx={222} cy={216} rx={20} ry={5} fill={C.l} />
      </Piece>
      <Piece i={5} enter="rise">
        <rect x={158} y={64} width={3.6} height={104} rx={1.8} fill={C.d} />
        <g fill={C.m}>
          <path d="M92 118A58 58 0 0 1 208 118Z" />
          <circle cx={106.5} cy={118} r={14.5} />
          <circle cx={135.5} cy={118} r={14.5} />
          <circle cx={164.5} cy={118} r={14.5} />
          <circle cx={193.5} cy={118} r={14.5} />
        </g>
        <path d={leaf(150, 118, 150, 66, 8)} fill={C.l} />
        <path d={leaf(150, 118, 118, 94, 6)} fill={C.l} />
        <path d={leaf(150, 118, 182, 94, 6)} fill={C.l} />
        <Bar x1={134} y1={196} x2={134} y2={172} w={8} fill={C.d} />
        <Bar x1={148} y1={196} x2={148} y2={172} w={8} fill={C.d} />
        <rect x={124} y={140} width={34} height={42} rx={13} fill={C.d} />
        <circle cx={141} cy={128} r={11.5} fill={C.d} />
        <Bar x1={152} y1={152} x2={160} y2={146} w={6.6} fill={C.d} />
      </Piece>
      <Piece i={6} enter="fade">
        {drops.map(([x, delay, dur]) => (
          <Idle key={x} animate={{ y: [0, 130], opacity: [0, 1, 1, 0] }} duration={dur} delay={delay + 1} ease="linear">
            <path d={leaf(x, 62, x, 76, 4.2)} fill={C.m} />
          </Idle>
        ))}
      </Piece>
    </>
  );
}
function MotifRain({ c }: { c: Tones }) {
  return (
    <>
      <g fill={c.d}>
        <circle cx={16} cy={7.4} r={3.4} />
        <circle cx={20.6} cy={5.4} r={4.4} />
        <circle cx={25} cy={7.6} r={3.4} />
        <rect x={12} y={7} width={17} height={4.4} rx={2.2} />
      </g>
      <path d="M6 24A14 14 0 0 1 34 24Z" fill={c.m} />
      <rect x={19.4} y={14} width={1.4} height={20} fill={c.d} />
      <circle cx={16} cy={31} r={3} fill={c.d} />
      <rect x={13} y={33.5} width={6} height={8} rx={3} fill={c.d} />
      <path d={leaf(5, 14, 5, 19, 1.8)} fill={c.m} />
      <path d={leaf(35, 15, 35, 20, 1.8)} fill={c.m} />
    </>
  );
}

/* 11 — Butterflies in the Garden */
function Butterfly({ x, y, s, rot = 0, wing, spot }: { x: number; y: number; s: number; rot?: number; wing: string; spot: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g fill={wing}>
        <ellipse cx={-17} cy={-11} rx={17} ry={11} transform="rotate(-38 -17 -11)" />
        <ellipse cx={17} cy={-11} rx={17} ry={11} transform="rotate(38 17 -11)" />
        <ellipse cx={-11} cy={11} rx={10} ry={7.6} transform="rotate(28 -11 11)" />
        <ellipse cx={11} cy={11} rx={10} ry={7.6} transform="rotate(-28 11 11)" />
      </g>
      <g fill={spot}>
        <circle cx={-19} cy={-13} r={3.8} />
        <circle cx={19} cy={-13} r={3.8} />
        <circle cx={-11} cy={11} r={2.4} />
        <circle cx={11} cy={11} r={2.4} />
      </g>
      <ellipse cx={0} cy={0} rx={2.8} ry={12} fill={C.d} />
      <Bar x1={-1} y1={-9} x2={-7} y2={-20} w={1.6} fill={C.d} />
      <Bar x1={1} y1={-9} x2={7} y2={-20} w={1.6} fill={C.d} />
    </g>
  );
}

function Flower({ x, y, R, petals, tone, eye, rot = 0 }: { x: number; y: number; R: number; petals: number; tone: string; eye: string; rot?: number }) {
  return (
    <g>
      <g fill={tone}>
        {Array.from({ length: petals }, (_, k) => {
          const a = ((rot + (360 / petals) * k) * Math.PI) / 180;
          return <path key={k} d={leaf(x, y, x + R * Math.cos(a), y + R * Math.sin(a), R * 0.55)} />;
        })}
      </g>
      <circle cx={x} cy={y} r={R * 0.3} fill={eye} />
    </g>
  );
}

function ArtGarden() {
  return (
    <>
      <Piece i={0} enter="fade">
        <path d={`M${-BLEED} 214Q90 198 170 210T330 204V246H${-BLEED}Z`} fill={C.l} />
      </Piece>
      <Piece i={1} enter="rise" oy={1}>
        <path d={ribbon(bez([98, 108], [90, 150], [104, 200], [96, 240]), 6)} fill={C.d} />
        <path d={ribbon(bez([222, 100], [230, 140], [214, 190], [224, 240]), 5)} fill={C.d} />
        <path d={ribbon(bez([158, 172], [152, 200], [162, 220], [158, 240]), 5)} fill={C.d} />
        <path d={leaf(97, 200, 56, 172, 22)} fill={C.m} />
        <path d={leaf(100, 176, 138, 150, 20)} fill={C.m} />
        <path d={leaf(221, 200, 186, 172, 18)} fill={C.m} />
        <path d={leaf(223, 174, 258, 152, 16)} fill={C.m} />
      </Piece>
      <Piece i={2} enter="pop">
        <Flower x={96} y={98} R={54} petals={9} tone={C.m} eye={C.d} />
        <g fill={C.p}>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <circle key={k} cx={96 + 9 * Math.cos((k * Math.PI) / 3)} cy={98 + 9 * Math.sin((k * Math.PI) / 3)} r={2.4} />
          ))}
        </g>
      </Piece>
      <Piece i={3} enter="pop">
        <Flower x={222} y={92} R={36} petals={7} tone={C.d} eye={C.p} rot={-90} />
      </Piece>
      <Piece i={4} enter="pop" oy={1}>
        <path d="M142 146H174C176 170 169 178 158 180C147 178 140 170 142 146Z" fill={C.m} />
        <path d="M142 146L149 130L158 146L167 130L174 146Z" fill={C.m} />
        <path d="M150 150H166C167 166 163 172 158 173C153 172 149 166 150 150Z" fill={C.l} />
      </Piece>
      <Piece i={5} enter="pop">
        <Idle animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }} duration={2.6}>
          <Butterfly x={152} y={46} s={1.35} rot={-8} wing={C.d} spot={C.w} />
        </Idle>
        <Idle animate={{ y: [0, -5, 0], rotate: [4, -4, 4] }} duration={3.1} delay={1.6}>
          <Butterfly x={262} y={168} s={1.05} rot={14} wing={C.m} spot={C.w} />
        </Idle>
      </Piece>
    </>
  );
}
function MotifGarden({ c }: { c: Tones }) {
  return (
    <>
      <rect x={19} y={22} width={2} height={18} fill={c.l} />
      <g fill={c.m}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <circle key={k} cx={20 + 8 * Math.cos((k * Math.PI) / 3)} cy={20 + 8 * Math.sin((k * Math.PI) / 3)} r={5} />
        ))}
      </g>
      <circle cx={20} cy={20} r={4.4} fill={c.d} />
      <g fill={c.d}>
        <ellipse cx={29} cy={8} rx={3.4} ry={2.4} transform="rotate(-30 29 8)" />
        <ellipse cx={34} cy={8} rx={3.4} ry={2.4} transform="rotate(30 34 8)" />
        <ellipse cx={31.5} cy={9.4} rx={0.9} ry={3} />
      </g>
    </>
  );
}

/* 12 — Long Table Supper */
function ArtSupper() {
  const candles: readonly (readonly [number, number])[] = [
    [70, 100],
    [150, 62],
    [228, 84],
  ];
  return (
    <>
      <Piece i={0} enter="fade">
        {candles.map(([x, top]) => (
          <circle key={x} cx={x} cy={top - 20} r={27} fill={C.l} />
        ))}
      </Piece>
      <Piece i={1} enter="rise" oy={1}>
        <g fill={C.l}>
          {[[24, 124], [108, 116], [192, 110], [266, 122]].map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y} r={12} />
              <rect x={x - 19} y={y + 12} width={38} height={44} rx={17} />
            </g>
          ))}
        </g>
      </Piece>
      <Piece i={2} enter="rise" oy={1}>
        <path d={`M${-BLEED + 4} 152H${330 - 4}L342 170H${-BLEED - 12}Z`} fill={C.p} />
        <rect x={-BLEED - 12} y={170} width={384} height={38} fill={C.w} />
        {Array.from({ length: 22 }, (_, k) => (
          <circle key={k} cx={-BLEED - 12 + 9 + k * 18} cy={208} r={9} fill={C.w} />
        ))}
        <rect x={-BLEED - 12} y={220} width={384} height={26} fill={C.d} />
      </Piece>
      <Piece i={3} enter="pop">
        {[[34, 160], [98, 162], [150, 162], [204, 162], [266, 160]].map(([x, y]) => (
          <g key={x}>
            <ellipse cx={x} cy={y} rx={22} ry={6.4} fill={C.w} />
            <ellipse cx={x} cy={y} rx={13} ry={3.6} fill={C.l} />
          </g>
        ))}
        {[[126, 154], [176, 154], [244, 152]].map(([x, y]) => (
          <path key={x} d={`M${x - 6} ${y - 18}h12l-2 16q-4 4-8 0z`} fill={C.d} />
        ))}
      </Piece>
      {candles.map(([x, top], k) => (
        <Piece key={x} i={4 + k} enter="rise" oy={1}>
          <rect x={x - 5} y={top} width={10} height={156 - top} rx={3} fill={C.d} />
          <circle cx={x - 3} cy={top + 6} r={3.4} fill={C.p} />
          <ellipse cx={x} cy={158} rx={11} ry={3.4} fill={C.d} />
          <Idle animate={{ scaleY: [1, 1.14, 0.94, 1.08, 1], rotate: [0, 3, -3, 2, 0] }} duration={1.5 + k * 0.3} delay={1 + k * 0.2} ox={0.5} oy={1}>
            <path d={leaf(x, top + 2, x, top - 34, 11)} fill={C.w} />
            <path d={leaf(x, top + 1, x, top - 16, 5)} fill={C.p} />
          </Idle>
        </Piece>
      ))}
    </>
  );
}
function MotifSupper({ c }: { c: Tones }) {
  return (
    <>
      <g fill={c.d}>
        <rect x={7} y={19} width={4} height={13} rx={1.4} />
        <rect x={18} y={11} width={4} height={21} rx={1.4} />
        <rect x={29} y={16} width={4} height={16} rx={1.4} />
      </g>
      <g fill={c.w}>
        <path d={leaf(9, 18, 9, 10, 3.2)} />
        <path d={leaf(20, 10, 20, 1.6, 3.6)} />
        <path d={leaf(31, 15, 31, 7, 3.2)} />
      </g>
      <rect x={0} y={31} width={40} height={9} fill={c.w} />
      <ellipse cx={14} cy={31.6} rx={6} ry={1.8} fill={c.l} />
      <ellipse cx={27} cy={31.6} rx={6} ry={1.8} fill={c.l} />
    </>
  );
}

/* 13 — A Small Victory */
function ArtVictory() {
  const confetti: readonly (readonly [number, number, number, string, number])[] = [
    [40, 52, 20, C.d, 0],
    [70, 30, 60, C.m, 1],
    [232, 46, -20, C.d, 1],
    [262, 88, 40, C.l, 0],
    [24, 118, 10, C.m, 0],
    [286, 30, 30, C.m, 0],
    [106, 60, -40, C.l, 1],
    [206, 22, 50, C.l, 0],
    [252, 150, 20, C.d, 1],
    [42, 170, -20, C.l, 1],
  ];
  return (
    <>
      <Piece i={0} enter="fade">
        <rect x={-BLEED} y={206} width={360} height={40} fill={C.w} />
      </Piece>
      <Piece i={1} enter="rise" oy={1}>
        <rect x={92} y={192} width={116} height={16} rx={3} fill={C.d} />
        <rect x={112} y={178} width={76} height={16} rx={3} fill={C.m} />
      </Piece>
      <Piece i={2} enter="pop" oy={0.7}>
        <path d={starPath(150, 132, 82, 38)} fill={C.m} />
        <path d={starPath(150, 132, 52, 24)} fill={C.l} />
      </Piece>
      <Piece i={3} enter="fade">
        {confetti.map(([x, y, r, fill, round], k) =>
          round ? <circle key={k} cx={x} cy={y} r={4.4} fill={fill} /> : <rect key={k} x={x - 4} y={y - 2.4} width={8} height={4.8} rx={1} fill={fill} transform={`rotate(${r} ${x} ${y})`} />,
        )}
      </Piece>
      <Piece i={4} enter="pop" oy={1}>
        <Idle animate={{ y: [0, -7, 0] }} duration={1.3} oy={1}>
          <Bar x1={147} y1={44} x2={143} y2={53} w={5} fill={C.d} />
          <Bar x1={153} y1={44} x2={157} y2={53} w={5} fill={C.d} />
          <rect x={143} y={26} width={14} height={24} rx={6} fill={C.d} />
          <circle cx={150} cy={19} r={7} fill={C.d} />
          <Bar x1={145} y1={31} x2={130} y2={13} w={5} fill={C.d} />
          <Bar x1={155} y1={31} x2={170} y2={13} w={5} fill={C.d} />
        </Idle>
      </Piece>
    </>
  );
}
function MotifVictory({ c }: { c: Tones }) {
  return (
    <>
      <rect x={9} y={33} width={22} height={4} rx={1} fill={c.d} />
      <path d={starPath(20, 24, 15, 7)} fill={c.m} />
      <circle cx={20} cy={5.6} r={2} fill={c.d} />
      <rect x={18.4} y={7} width={3.2} height={5} rx={1.4} fill={c.d} />
      <Bar x1={19} y1={8} x2={15.6} y2={3} w={1.6} fill={c.d} />
      <Bar x1={21} y1={8} x2={24.4} y2={3} w={1.6} fill={c.d} />
    </>
  );
}

/* 14 — Birthday */
function ArtBirthday() {
  const flags = Array.from({ length: 7 }, (_, k) => k);
  const sag = (t: number): Pt => [-BLEED + 280 * t, 2 + 30 * Math.sin(Math.PI * t)];
  return (
    <>
      <Piece i={0} enter="drop">
        <path d={ribbon(sample(30, sag), 2.4)} fill={C.l} />
        {flags.map((k) => {
          const [x, y] = sag((k + 0.5) / 7);
          const tone = [C.p, C.l, C.w][k % 3];
          return <path key={k} d={`M${f(x - 13)} ${f(y)}L${f(x + 13)} ${f(y)}L${f(x)} ${f(y + 26)}Z`} fill={tone} />;
        })}
      </Piece>
      <Piece i={1} enter="fade">
        <rect x={-BLEED} y={208} width={360} height={38} fill={C.d} />
        <ellipse cx={150} cy={209} rx={96} ry={8} fill={C.l} />
      </Piece>
      <Piece i={2} enter="left">
        <circle cx={240} cy={168} r={17} fill={C.p} />
        <path d="M224 158L256 158L240 120Z" fill={C.w} />
        <circle cx={240} cy={117} r={5} fill={C.l} />
        <circle cx={234} cy={165} r={3.2} fill={C.d} />
        <circle cx={247} cy={165} r={3.2} fill={C.d} />
        <ellipse cx={241} cy={176} rx={3.6} ry={2.8} fill={C.d} />
      </Piece>
      <Piece i={3} enter="rise" oy={1}>
        <rect x={76} y={172} width={146} height={38} rx={9} fill={C.w} />
        <rect x={76} y={194} width={146} height={16} fill={C.p} />
        <rect x={104} y={144} width={92} height={32} rx={9} fill={C.w} />
        <g fill={C.l}>
          {Array.from({ length: 8 }, (_, k) => (
            <circle key={k} cx={86 + k * 18.4} cy={174} r={7.4} />
          ))}
          {Array.from({ length: 5 }, (_, k) => (
            <circle key={k} cx={114 + k * 18.4} cy={146} r={6.4} />
          ))}
        </g>
        <circle cx={128} cy={158} r={3} fill={C.m} />
        <circle cx={172} cy={162} r={3} fill={C.m} />
        <circle cx={104} cy={190} r={3} fill={C.m} />
        <circle cx={196} cy={192} r={3} fill={C.m} />
      </Piece>
      <Piece i={4} enter="left">
        <circle cx={222} cy={190} r={5.8} fill={C.p} />
        <circle cx={223} cy={178} r={5.8} fill={C.p} />
      </Piece>
      <Piece i={5} enter="rise" oy={1}>
        <rect x={142} y={78} width={16} height={70} rx={4} fill={C.d} />
        <g fill={C.w}>
          <path d="M142 90L158 82V90L142 98Z" />
          <path d="M142 108L158 100V108L142 116Z" />
          <path d="M142 126L158 118V126L142 134Z" />
        </g>
        <Idle animate={{ scaleY: [1, 1.12, 0.94, 1.08, 1], rotate: [0, 3, -3, 2, 0] }} duration={1.6} ox={0.5} oy={1}>
          <path d={leaf(150, 76, 150, 34, 14)} fill={C.w} />
          <path d={leaf(150, 76, 150, 52, 6)} fill={C.p} />
        </Idle>
      </Piece>
    </>
  );
}
function MotifBirthday({ c }: { c: Tones }) {
  return (
    <>
      <circle cx={20} cy={10} r={8} fill={c.l} />
      <rect x={18.4} y={8} width={3.2} height={16} rx={1.2} fill={c.d} />
      <path d={leaf(20, 9, 20, 2.4, 3.6)} fill={c.w} />
      <rect x={9} y={27} width={22} height={9} rx={2} fill={c.w} />
      <rect x={13} y={21} width={14} height={7} rx={2} fill={c.w} />
      <circle cx={31} cy={22} r={4} fill={c.p} />
    </>
  );
}

/* ───────────────────────────── the month's days ───────────────────────────── */

type Scene = {
  kind: MomentKind;
  title: string;
  sentence: string;
  /** The colour of the page behind the picture — and of the day's circle. */
  bg: string;
  Art: () => React.ReactElement;
  Motif: (p: { c: Tones }) => React.ReactElement;
};

const SCENES: readonly Scene[] = [
  { kind: "activity", title: "Market Morning", sentence: "One lemon, one mission, and a walk home that suddenly took all morning.", bg: PALE, Art: ArtMarket, Motif: MotifMarket },
  { kind: "mood", title: "Lazy Sunday", sentence: "By noon the pillow had won, and nobody was going to argue.", bg: LIGHT, Art: ArtPillow, Motif: MotifPillow },
  { kind: "mood", title: "Monday Fog", sentence: "Head in the clouds, hands around coffee — the week will load shortly.", bg: PALE, Art: ArtFog, Motif: MotifFog },
  { kind: "nature", title: "Bees in the Lavender", sentence: "Tall humming stalks, busy commuters, and not a single meeting between them.", bg: PALE, Art: ArtLavender, Motif: MotifLavender },
  { kind: "activity", title: "Laps at the Lido", sentence: "Forty lengths, one lane, and a rare hour of thinking about nothing.", bg: LIGHT, Art: ArtLido, Motif: MotifLido },
  { kind: "mood", title: "Overthinking", sentence: "One small thought went up the ladder and came back as a spiral.", bg: PALE, Art: ArtHead, Motif: MotifHead },
  { kind: "activity", title: "Coffee with an Old Friend", sentence: "Two cups, one long catch-up, and steam that finished each other's sentences.", bg: PALE, Art: ArtCups, Motif: MotifCups },
  { kind: "nature", title: "Moonrise over the Roofs", sentence: "The moon came up slowly, as if it, too, had nowhere else to be.", bg: MID, Art: ArtMoon, Motif: MotifMoon },
  { kind: "activity", title: "Reading in the Park", sentence: "A good chapter is the best tent: shady, quiet, and slightly enormous.", bg: PALE, Art: ArtBook, Motif: MotifBook },
  { kind: "mood", title: "Rain Indoors", sentence: "Some days carry their own cloud; the trick is remembering the umbrella.", bg: PALE, Art: ArtRain, Motif: MotifRain },
  { kind: "nature", title: "Butterflies in the Garden", sentence: "The flowers did the showing off; the butterflies just stopped by to judge.", bg: PALE, Art: ArtGarden, Motif: MotifGarden },
  { kind: "activity", title: "Long Table Supper", sentence: "The table kept getting longer as more friends kept turning up.", bg: MID, Art: ArtSupper, Motif: MotifSupper },
  { kind: "mood", title: "A Small Victory", sentence: "It was only the inbox, but it felt like the summit.", bg: PALE, Art: ArtVictory, Motif: MotifVictory },
  { kind: "activity", title: "Birthday", sentence: "One enormous candle, one careful wish, and a friend peeking to check.", bg: MID, Art: ArtBirthday, Motif: MotifBirthday },
];

const KIND_LABEL: Record<MomentKind, string> = { mood: "Mood", activity: "Outing", nature: "Nature" };

const CALENDAR_DAYS: readonly CalendarDay[] = SCENES.map((s, i) => ({
  day: i + 1,
  weekday: WEEKDAYS_LONG[(FIRST_COLUMN + i) % 7],
  kind: s.kind,
  title: s.title,
  sentence: s.sentence,
}));

/** The scene for a day, or undefined for days that have not happened (or have no page). */
const sceneOf = (day: number): Scene | undefined => SCENES[day - 1];

/* ───────────────────────────── the component ───────────────────────────── */

const HOLD_MS = 2600;
const PAUSE_MS = 800;
const LAYOUT = { duration: 0.6, ease: [0.22, 1, 0.36, 1] } as const;

type DayState = "past" | "today" | "future";

export function DoodleCalendar({ today: todayProp = 14, loop = false, onSelect, className }: DoodleCalendarProps) {
  const today = Math.min(clampDay(todayProp), SCENES.length);
  const reduced = useReducedMotion() === true;
  const uid = React.useId();

  const [openDay, setOpenDay] = React.useState<number | null>(null);
  const [focusDay, setFocusDay] = React.useState(today);
  const [interacted, setInteracted] = React.useState(false);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef(1);
  const cells = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const openRef = React.useRef<number | null>(null);
  /** Set once a person, not the loop, has opened or touched the card — only then does focus move. */
  const byPersonRef = React.useRef(false);
  const returnFocusRef = React.useRef<number | null>(null);
  const onSelectRef = React.useRef(onSelect);
  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Scale the true-size phone down to the space it has, so it is always whole.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.max(0.3, Math.min(1, (host.clientWidth - 24) / PHONE_W, (host.clientHeight - 24) / PHONE_H));
      scaleRef.current = scale;
      fit.style.transform = `scale(${scale.toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // The phone is drawn under a CSS scale; tell framer's layout measuring about it
  // so the circle-to-card move starts exactly where the circle is.
  const transformPagePoint = React.useCallback((p: { x: number; y: number }) => ({ x: p.x / scaleRef.current, y: p.y / scaleRef.current }), []);

  const open = React.useCallback((day: number) => {
    openRef.current = day;
    setOpenDay(day);
    onSelectRef.current?.(CALENDAR_DAYS[day - 1]);
  }, []);

  const close = React.useCallback(() => {
    if (byPersonRef.current) returnFocusRef.current = openRef.current;
    openRef.current = null;
    setOpenDay(null);
  }, []);

  // A person opened it: put focus on the close button. A person closed it: hand
  // focus back to the day they opened from.
  React.useEffect(() => {
    if (openDay !== null) {
      if (byPersonRef.current) closeRef.current?.focus({ preventScroll: true });
    } else if (returnFocusRef.current !== null) {
      cells.current[returnFocusRef.current]?.focus({ preventScroll: true });
      returnFocusRef.current = null;
      byPersonRef.current = false;
    }
  }, [openDay]);

  React.useEffect(() => {
    if (openDay === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDay, close]);

  // The gallery card: open today's page, then each earlier day in turn, until touched.
  React.useEffect(() => {
    if (!loop || interacted || reduced) return;
    const order = [today, ...Array.from({ length: today - 1 }, (_, i) => i + 1)];
    let i = 0;
    let timer = 0;
    const show = () => {
      open(order[i % order.length]);
      timer = window.setTimeout(() => {
        openRef.current = null;
        setOpenDay(null);
        i += 1;
        timer = window.setTimeout(show, PAUSE_MS);
      }, HOLD_MS);
    };
    timer = window.setTimeout(show, 900);
    return () => window.clearTimeout(timer);
  }, [loop, interacted, reduced, today, open]);

  const touched = () => {
    setInteracted(true);
    if (openRef.current !== null) byPersonRef.current = true;
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: number | null = null;
    if (e.key in step) next = Math.min(today, Math.max(1, focusDay + step[e.key]));
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = today;
    if (next === null) return;
    e.preventDefault();
    setFocusDay(next);
    cells.current[next]?.focus({ preventScroll: true });
  };

  const scene = openDay === null ? undefined : sceneOf(openDay);
  const info = openDay === null ? undefined : CALENDAR_DAYS[openDay - 1];
  const openIsToday = openDay === today;
  const titleId = `${uid}-title`;

  return (
    <MotionConfig reducedMotion="user" transformPagePoint={transformPagePoint}>
      <LayoutGroup id={uid}>
        <div
          ref={hostRef}
          className={cn("relative flex size-full min-h-[420px] items-center justify-center overflow-hidden", className)}
          style={{ fontFamily: FONT_MONO }}
          onPointerDownCapture={touched}
          onKeyDownCapture={touched}
        >
          <style>
            {`
              .dc-cell { outline: none; border-radius: 50%; }
              .dc-cell:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
              .dc-close:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
            `}
          </style>

          <div ref={fitRef} className="relative shrink-0" style={{ width: PHONE_W, height: PHONE_H, transformOrigin: "50% 50%" }}>
            {/* The white iPhone: a bezel with a hairline outline, nothing behind it. */}
            <div
              className="absolute inset-0"
              style={{ background: "#FFFFFF", borderRadius: PHONE_RADIUS, border: "1px solid rgba(20, 20, 60, 0.10)" }}
            />

            {/* The screen: one sheet of paper. */}
            <div
              className="absolute overflow-hidden"
              style={{ inset: BEZEL, borderRadius: SCREEN_RADIUS, background: PAPER, color: INK }}
            >
              {/* The month: the heading and the grid share one left edge, PAD from the screen. */}
              <h2
                className="absolute m-0"
                style={{
                  left: PAD,
                  top: HEAD_TOP,
                  fontFamily: FONT_SANS,
                  fontWeight: 800,
                  fontSize: HEAD_SIZE,
                  lineHeight: `${HEAD_LINE}px`,
                  letterSpacing: "-0.035em",
                  // Manrope's capital A leans in a hair; pull the heading back so the
                  // letter's foot lines up with the circle below it.
                  marginLeft: "-0.03em",
                }}
              >
                {MONTH_NAME}
                <span style={{ display: "block", color: ink(0.38), marginTop: 4, marginLeft: "-0.045em" }}>{YEAR}</span>
              </h2>

              {/* The weekday row and the grid: one column template, so labels sit exactly over their circles. */}
              <motion.div
                className="absolute"
                style={{ left: PAD, right: PAD, top: HEAD_TOP + HEAD_LINE * 2 + 46, zIndex: 2 }}
                animate={{ opacity: openDay === null ? 1 : 0 }}
                transition={openDay === null ? { duration: 0.22 } : { duration: 0.28 }}
                inert={openDay !== null}
              >
                <div role="grid" aria-label={`${MONTH_NAME} ${YEAR}`} onKeyDown={onGridKeyDown}>
                  <div
                    role="row"
                    className="grid"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: GAP, height: WEEKDAY_H, marginBottom: 8 }}
                  >
                    {WEEKDAYS_SHORT.map((w, i) => (
                      <div
                        key={w}
                        role="columnheader"
                        className="text-center"
                        style={{ fontSize: 9.5, lineHeight: `${WEEKDAY_H}px`, letterSpacing: "0.02em", color: ink(0.55) }}
                      >
                        <abbr title={WEEKDAYS_LONG[i]} style={{ textDecoration: "none" }}>
                          {w}
                        </abbr>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col" style={{ rowGap: GAP }}>
                    {Array.from({ length: WEEKS }, (_, row) => (
                      <div key={row} role="row" className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: GAP }}>
                        {Array.from({ length: 7 }, (_, col) => {
                          const day = row * 7 + col - FIRST_COLUMN + 1;
                          if (day < 1 || day > DAYS_IN_MONTH) return <div key={col} role="gridcell" aria-hidden="true" />;
                          const state: DayState = day < today ? "past" : day === today ? "today" : "future";
                          const s = sceneOf(day);
                          if (state === "future" || !s) {
                            return (
                              <div
                                key={col}
                                role="gridcell"
                                aria-label={`${MONTH_NAME} ${day}, still to come`}
                                className="flex items-center justify-center"
                                style={{ aspectRatio: "1 / 1" }}
                              >
                                <span aria-hidden="true" className="block rounded-full" style={{ width: 6, height: 6, background: ink(0.35) }} />
                              </div>
                            );
                          }
                          return (
                            <div key={col} role="gridcell" style={{ aspectRatio: "1 / 1" }}>
                              <DayCell
                                day={day}
                                info={CALENDAR_DAYS[day - 1]}
                                scene={s}
                                inverted={state === "today"}
                                isToday={state === "today"}
                                isOpen={openDay === day}
                                anyOpen={openDay !== null}
                                tabbable={focusDay === day}
                                onFocus={() => setFocusDay(day)}
                                onOpen={() => {
                                  byPersonRef.current = true;
                                  setInteracted(true);
                                  open(day);
                                }}
                                register={(el) => {
                                  cells.current[day] = el;
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Home indicator */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: 8, width: 108, height: 4, borderRadius: 2, background: ink(0.32), zIndex: 1 }}
                aria-hidden="true"
              />

              {/* Tap outside the card to put it away. */}
              {scene ? <div className="absolute inset-0" style={{ zIndex: 3 }} onClick={close} aria-hidden="true" /> : null}

              {/* The card's paper: the very circle that was tapped, grown into a page. */}
              {scene && openDay !== null ? (
                <motion.div
                  layoutId="dc-card"
                  className="absolute"
                  initial={{ backgroundColor: openIsToday ? INK : scene.bg }}
                  animate={{ backgroundColor: scene.bg }}
                  transition={{ layout: LAYOUT, backgroundColor: { duration: 0.4 } }}
                  style={{ left: CARD_X, top: CARD_TOP, width: CARD_W, height: CARD_H, borderRadius: CARD_RADIUS, zIndex: 1 }}
                  aria-hidden="true"
                />
              ) : null}

              <AnimatePresence>
                {scene && info && openDay !== null ? (
                  <motion.div
                    key="card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    className="absolute overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.26, duration: 0.24 } }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    style={{ left: CARD_X, top: CARD_TOP, width: CARD_W, height: CARD_H, borderRadius: CARD_RADIUS, zIndex: 4 }}
                    onKeyDown={(e) => {
                      // One button in here: Tab has nowhere else to go.
                      if (e.key === "Tab") {
                        e.preventDefault();
                        closeRef.current?.focus({ preventScroll: true });
                      }
                    }}
                  >
                    <div className="relative" style={{ width: ART_W, height: ART_H }}>
                      <StillContext.Provider value={reduced}>
                        <svg
                          key={openDay}
                          viewBox={`${-BLEED} 0 360 240`}
                          width={ART_W}
                          height={ART_H}
                          style={{ display: "block" }}
                          aria-hidden="true"
                          focusable="false"
                        >
                          <scene.Art />
                        </svg>
                      </StillContext.Provider>
                      <button
                        ref={closeRef}
                        type="button"
                        className="dc-close absolute grid cursor-pointer place-items-center rounded-full border-0 p-0"
                        style={{ top: 12, right: 12, width: 30, height: 30, background: PAGE, color: INK }}
                        aria-label="Close"
                        onClick={close}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                          <rect x="5.1" y="-0.5" width="1.8" height="13" rx="0.9" fill={INK} transform="rotate(45 6 6)" />
                          <rect x="5.1" y="-0.5" width="1.8" height="13" rx="0.9" fill={INK} transform="rotate(-45 6 6)" />
                        </svg>
                      </button>
                    </div>

                    {/* The date and the caption: a small editorial block on white paper. */}
                    <div
                      className="absolute inset-x-0 bottom-0 flex flex-col"
                      style={{ top: ART_H, background: PAGE, padding: "14px 20px 16px" }}
                    >
                      <div className="flex items-end justify-between" style={{ height: 50 }}>
                        <div
                          style={{
                            fontFamily: FONT_SANS,
                            fontWeight: 800,
                            fontSize: 54,
                            lineHeight: "50px",
                            letterSpacing: "-0.05em",
                            color: INK,
                          }}
                          aria-hidden="true"
                        >
                          {info.day}
                        </div>
                        <div className="text-right" style={{ fontSize: 10.5, lineHeight: "15px", letterSpacing: "0.1em", paddingBottom: 3 }}>
                          <div style={{ color: INK }}>
                            {info.weekday.slice(0, 3).toUpperCase()} · AUG {info.day}
                          </div>
                          <div style={{ color: ink(0.5) }}>{KIND_LABEL[info.kind].toUpperCase()}</div>
                        </div>
                      </div>
                      <h3
                        id={titleId}
                        className="m-0"
                        style={{
                          fontFamily: FONT_SERIF,
                          fontWeight: 400,
                          fontSize: 28,
                          lineHeight: "30px",
                          letterSpacing: "-0.005em",
                          color: INK,
                          marginTop: 8,
                        }}
                      >
                        {info.title}
                      </h3>
                      <p
                        className="m-0"
                        style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 12.5, lineHeight: "17.5px", color: ink(0.68), marginTop: 6 }}
                      >
                        {info.sentence}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

/* ───────────────────────────── one day ───────────────────────────── */

type DayCellProps = {
  day: number;
  info: CalendarDay;
  scene: Scene;
  inverted: boolean;
  isToday: boolean;
  isOpen: boolean;
  anyOpen: boolean;
  tabbable: boolean;
  onFocus: () => void;
  onOpen: () => void;
  register: (el: HTMLButtonElement | null) => void;
};

const DayCell = React.memo(function DayCell({ day, info, scene, inverted, isToday, isOpen, tabbable, onFocus, onOpen, register }: DayCellProps) {
  const tones = inverted ? TONES_INVERTED : TONES;
  const disc = inverted ? INK : scene.bg;
  return (
    <motion.button
      type="button"
      ref={register}
      className="dc-cell relative block size-full cursor-pointer border-0 bg-transparent p-0"
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      aria-current={isToday ? "date" : undefined}
      aria-label={`${info.weekday}, ${MONTH_NAME} ${day} — ${info.title}`}
      onFocus={onFocus}
      onClick={onOpen}
      whileTap={{ scale: 0.94 }}
    >
      {/* The paper disc. It is the shared element: opening a day lifts it out of here and into the card. */}
      {isOpen ? null : (
        <motion.span
          layoutId="dc-card"
          className="absolute inset-0 block"
          transition={{ layout: LAYOUT }}
          style={{ background: disc, borderRadius: CELL / 2, zIndex: 2 }}
          aria-hidden="true"
        />
      )}
      {/* The motif: a few flat pieces of paper, cut to the circle. */}
      <span className="pointer-events-none absolute inset-0 block overflow-hidden rounded-full" style={{ zIndex: 3 }} aria-hidden="true">
        <svg viewBox="0 0 40 40" width="100%" height="100%" style={{ display: "block" }} focusable="false">
          <scene.Motif c={tones} />
        </svg>
      </span>
    </motion.button>
  );
});
