"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type AnimationPlaybackControls,
  type ValueAnimationTransition,
  type MotionValue,
} from "framer-motion";
import { ArrowLeft, Dices, File, Folder, Moon, Sun, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

/** Rounded so server and browser print identical numbers. */
const r2 = (n: number) => Math.round(n * 100) / 100;

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One sticker stuck on the notepad, with its position as a fraction of the page. */
export type StickerPeelPlacement = {
  id: string;
  label: string;
  /** Horizontal centre, 0 (left edge of the notepad) to 1 (right edge). */
  x: number;
  /** Vertical centre, 0 (top of the notepad) to 1 (bottom). */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
};

export type StickerPeelProps = {
  /** Plays a hands-free demo for the gallery card: stickers peel out of the tray one by one,
   *  get slapped onto the notepad, hold, then peel back and repeat. Pointer input is
   *  switched off while it plays. */
  loop?: boolean;
  /** Called after the set of stuck stickers or their positions change. */
  onChange?: (stickers: StickerPeelPlacement[]) => void;
  className?: string;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Side of a sticker's square box, in scene units. */
const S = 92;
/** Scale of a sticker resting in the tray, and how much bigger it is in the hand than on the page. */
const DOCK_S = 0.6;
const CARRY_S = 1.06;

type Rect = { x: number; y: number; w: number; h: number };

type Geometry = {
  W: number;
  H: number;
  /** The rounded surface everything sits on. */
  surface: Rect;
  /** The notepad: where stickers can be stuck, and what their positions are fractions of. */
  paper: Rect;
  /** The centre line of the sticker tray. */
  dockY: number;
  /** Top of the bottom nav. */
  navY: number;
  /** Top of the top bar. */
  barY: number;
  /** Sticker spacing along the tray. */
  dockStep: number;
  /** Scale of a sticker stuck on the notepad. */
  placedScale: number;
  /** How much the printed journal page is enlarged to fill the notepad. */
  pageScale: number;
};

const PAPER_W = 340;
const PAPER_H = 420;
/** How much the sticker under the pointer grows, how far that reaches, and how far it pushes the rest aside. */
const DOCK_PEAK = 2;
const DOCK_REACH = 72;
const DOCK_SPREAD = 44;

function geometry(W: number, H: number, pageScale: number, dockStep: number, placedScale: number): Geometry {
  const surface = { x: 10, y: 10, w: W - 20, h: H - 20 };
  const navY = surface.y + surface.h - 58;
  const midX = surface.x + surface.w / 2;
  const barY = surface.y + 16;
  const top = barY + 50;
  const paper = { x: midX - (PAPER_W * pageScale) / 2, y: top, w: PAPER_W * pageScale, h: PAPER_H * pageScale };
  return { W, H, surface, paper, dockY: navY - 52, navY, barY, dockStep, placedScale, pageScale };
}

/** The wide stage, and the same composition stood upright at 3:4 for portrait hosts. */
const LANDSCAPE = geometry(920, 660, 1, 60, 1);
const PORTRAIT = geometry(645, 860, 1.42, 56, 1.3);

/** Pleasant places to stick things, as fractions of the notepad, with a rotation. */
const SPOTS: { u: number; v: number; rot: number }[] = [
  { u: 0.2, v: 0.3, rot: -7 },
  { u: 0.76, v: 0.34, rot: 5 },
  { u: 0.3, v: 0.62, rot: 6 },
  { u: 0.72, v: 0.66, rot: -4 },
  { u: 0.5, v: 0.46, rot: -5 },
  { u: 0.2, v: 0.86, rot: 4 },
  { u: 0.78, v: 0.88, rot: -6 },
  { u: 0.5, v: 0.8, rot: 7 },
];

/** The autoplay order: [piece index, spot index]. */
const DEMO: [number, number][] = [
  [0, 0],
  [1, 4],
  [5, 2],
  [6, 6],
];

/** How far the corner peels at full curl, in x + y units. */
const PEEL_REACH = 92;
/** How much of the sticker stays curled while it is carried. */
const CARRY_CURL = 0.52;
/** Soft paper overshoots a little as it curls away, and lags as it smooths back down. */
const CURL_SPRING = { type: "spring", stiffness: 170, damping: 15 } as const;
const SMOOTH_SPRING = { type: "spring", stiffness: 210, damping: 24 } as const;
const POS_SPRING = { stiffness: 520, damping: 44, mass: 0.7 };
/** The tray's magnifier easing in and out, with no overshoot. */
const PEEK_SPRING = { type: "spring", stiffness: 300, damping: 34 } as const;
const EASE_OUT = [0.2, 0.8, 0.25, 1] as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* -------------------------------------------------------------------------- */
/* Sticker artwork (original, 100 x 100 viewBox)                              */
/* -------------------------------------------------------------------------- */

/** Pastel watercolour washes with one thin ink line. */
const C = {
  mint: "#DCE8CF",
  sage: "#B8D2A6",
  butter: "#FCF4C4",
  lilac: "#D8CBE6",
  peach: "#F7DFD3",
  pink: "#F1C3D8",
  rose: "#E08FA8",
  sky: "#BCDDF0",
  cream: "#FFFBEA",
};
const INK = "#3F4A46";

/** One wash of colour. Each gets the thin ink outline. */
type Part = { d: string; c: string };

type StickerDef = {
  id: string;
  label: string;
  /** The largest x + y the artwork reaches. The paper curl starts just past it. */
  maxSum: number;
  /** The colour washes. */
  parts: Part[];
  /** A wash that isn't a plain shape, such as the pastel around a die-cut word. */
  halo?: React.ReactNode;
  /** Painted in thick oils instead of watercolour and pen. */
  oil?: boolean;
  /** Lettering and pen details on top. */
  ink?: React.ReactNode;
};

const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const box = (x: number, y: number, w: number, h: number) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + s}C${x - 1.4 * s} ${y + 0.1 * s} ${x - 0.9 * s} ${y - 0.9 * s} ${x} ${y - 0.25 * s}C${x + 0.9 * s} ${y - 0.9 * s} ${x + 1.4 * s} ${y + 0.1 * s} ${x} ${y + s}Z`;
const leaf = (x: number, y: number, deg: number, len: number) => {
  const a = (deg * Math.PI) / 180;
  const pt = (px: number, py: number) => `${r2(x + px * Math.cos(a) - py * Math.sin(a))} ${r2(y + px * Math.sin(a) + py * Math.cos(a))}`;
  return `M${pt(0, 0)}Q${pt(len * 0.5, -len * 0.34)} ${pt(len, 0)}Q${pt(len * 0.5, len * 0.34)} ${pt(0, 0)}Z`;
};

const star = (cx: number, cy: number, big: number, small: number) =>
  `M${Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 - 90) * Math.PI) / 180;
    const r = i % 2 === 0 ? big : small;
    return `${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`;
  }).join("L")}Z`;

const pen = { fill: "none", stroke: INK, strokeWidth: 0.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const SCRIPT = "'Snell Roundhand','Apple Chancery','Segoe Script','Bradley Hand',cursive";
const HAND = "'Bradley Hand','Chalkboard SE','Segoe Print','Comic Sans MS',cursive";

/** Dreamy oil colours. */
const O = {
  ground: "#8FAEE8",
  deep: "#6F8FE0",
  blush: "#FBD9E4",
  pink: "#F5A9C3",
  white: "#FFF7F5",
  gold: "#F2D48A",
  mint: "#9FE0C8",
  coral: "#F27C73",
  butter: "#FFE9A8",
  violet: "#7C6FD8",
  rose: "#E88BA8",
  cobalt: "#4A5BD0",
  leaf: "#4DB394",
};
const dab = (x: number, y: number, r: number, c: string): Part => ({ d: circ(x, y, r), c });
/** A leaping pony with a flowing tail, facing right or left. */
const PONY =
  "M-12 -2C-8 -7 2 -7 7 -6C9 -9 11 -13 14 -14L15.5 -16.5L16.4 -13.6C18 -12.5 20 -10 20.5 -8.5C19.8 -7.4 18.6 -7.6 17 -8.4C15.5 -8.8 14 -8.4 13 -6C12 -3 11.6 0 10 2C12 4 14 5 16.5 5.5L16 7.4C12 7.6 9 6 6.5 3.8C2 5 -3 5 -7 3.6C-9 6 -12 8.5 -16 9.8L-17 8C-14.5 6 -12.6 3.6 -12 1C-14 -1 -18 -5 -22 -3C-25 -1.6 -27 -3 -28 -5C-26 -3.6 -24 -7 -20 -6.6C-17 -6.2 -14 -4 -12 -2Z";
const pony = (x: number, y: number, s: number, dir: 1 | -1, c: string): Part => ({
  d: PONY.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, px, py) => `${r2(x + Number(px) * s * dir)} ${r2(y + Number(py) * s)}`),
  c,
});
/** A small swallow in flight. */
const bird = (x: number, y: number, s: number, c: string): Part => ({
  d: `M${x - 6 * s} ${y + s}Q${x - s} ${y - s} ${x + s} ${y + s}Q${x + 2 * s} ${y - 3 * s} ${x + 7 * s} ${y - 5 * s}Q${x + 6 * s} ${y + s} ${x + 2 * s} ${y + 2.5 * s}L${x - s} ${y + 5 * s}L${x - s} ${y + 2 * s}Z`,
  c,
});
/** Five round petals and a bright eye. */
const blossom = (x: number, y: number, r: number, c: string, eye: string): Part[] => [
  ...[0, 72, 144, 216, 288].map((deg) => dab(r2(x + r * 0.62 * Math.cos(((deg - 90) * Math.PI) / 180)), r2(y + r * 0.62 * Math.sin(((deg - 90) * Math.PI) / 180)), r2(r * 0.62), c)),
  dab(x, y, r2(r * 0.36), eye),
];
/** A garland of jewel-bright dabs along a curve. */
const GARLAND = [O.coral, O.cobalt, O.mint, O.butter, O.pink];
const garland = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number, r: number): Part[] =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return dab(r2(u * u * x0 + 2 * u * t * cx + t * t * x1), r2(u * u * y0 + 2 * u * t * cy + t * t * y1), r, GARLAND[i % GARLAND.length]);
  });
/** The faint diamond lattice behind the painting, as hair-thin strokes of paler blue. */
const lattice = (x: number, y: number, w: number, h: number, step: number): Part => {
  const t = 0.32;
  let d = "";
  for (let c = -h + step; c < w; c += step) {
    const ox = Math.max(c, 0);
    const oy = Math.max(-c, 0);
    const len = Math.min(w - ox, h - oy);
    const down = [x + ox, y + oy, x + ox + len, y + oy + len];
    const up = [x + w - ox, y + oy, x + w - ox - len, y + oy + len];
    d += `M${r2(down[0])} ${r2(down[1])}L${r2(down[2])} ${r2(down[3])}L${r2(down[2] + t)} ${r2(down[3])}L${r2(down[0] + t)} ${r2(down[1])}Z`;
    d += `M${r2(up[0])} ${r2(up[1])}L${r2(up[2])} ${r2(up[3])}L${r2(up[2] + t)} ${r2(up[3])}L${r2(up[0] + t)} ${r2(up[1])}Z`;
  }
  return { d, c: "#BDD0F4" };
};
/** A fine line of coloured pen over the paint. */
const Fine = ({ d, c, w = 0.55 }: { d: string; c: string; w?: number }) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);
/** Four-point glints of white paint, each with a small soft glow. */
const Glints = ({ at }: { at: [number, number, number][] }) => (
  <>
    {at.map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r * 0.8} fill={O.white} opacity={0.3} />
    ))}
    <path
      fill={O.white}
      d={at.map(([x, y, r]) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`).join("")}
    />
  </>
);

/** Small handwriting. */
function Hand({ x, y, size = 6, script, spaced, children }: { x: number; y: number; size?: number; script?: boolean; spaced?: boolean; children: string }) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor="middle" fill={INK} style={{ fontFamily: script ? SCRIPT : HAND, letterSpacing: spaced ? 1 : undefined }}>
      {children}
    </text>
  );
}

/** A die-cut word: a pastel wash that hugs the outlined lettering. */
const word = (text: string, y: number, size: number, halo: string) => {
  const type = { x: 50, y, fontSize: size, textAnchor: "middle", strokeLinejoin: "round", style: { fontFamily: SCRIPT, fontWeight: 700 } } as const;
  return {
    parts: [],
    halo: (
      <text {...type} fill={halo} stroke={halo} strokeWidth={size * 0.62}>
        {text}
      </text>
    ),
    ink: (
      <text {...type} fill={C.cream} stroke={INK} strokeWidth={0.4}>
        {text}
      </text>
    ),
  };
};

const STICKERS: StickerDef[] = [
  {
    id: "tiny-joys",
    label: "Tiny joys",
    maxSum: 172,
    parts: [
      { d: box(6, 22, 44, 56), c: C.sky },
      { d: "M6 78V56L50 42V78Z", c: C.peach },
      { d: ell(27, 54, 15, 11), c: C.cream },
      { d: "M17 40H37Q37 58 27 58Q17 58 17 40Z", c: C.pink },
      { d: ell(27, 40, 10, 3), c: C.cream },
      { d: box(50, 22, 44, 56), c: C.butter },
    ],
    ink: (
      <>
        <Hand x={72} y={34} size={8} script>tiny joys</Hand>
        <Hand x={72} y={46} size={5}>morning light</Hand>
        <Hand x={72} y={56} size={5}>warm socks</Hand>
        <Hand x={72} y={66} size={5}>a long nap</Hand>
      </>
    ),
  },
  {
    id: "go-slow",
    label: "Go slow",
    maxSum: 150,
    ...word("Go Slow", 60, 27, C.peach),
  },
  {
    id: "pencil",
    label: "Write it down",
    maxSum: 146,
    parts: [],
    ink: (
      <g transform="rotate(-16 50 50)">
        <path d="M4 50L18 43V57Z" fill={C.peach} fillOpacity={0.8} stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
        <path d="M4 50L9 47.5V52.5Z" fill={INK} />
        <path d={box(18, 43, 62, 14)} fill={C.sky} fillOpacity={0.8} stroke={INK} strokeWidth={0.7} />
        <path d="M80 43H84Q86 40 89 42Q93 40 95 44Q97 50 95 56Q93 60 89 58Q86 60 84 57H80Z" fill={C.pink} fillOpacity={0.8} stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
        <Hand x={49} y={52.5} size={7.5} script>write it down</Hand>
      </g>
    ),
  },
  {
    id: "smile-cloud",
    label: "Smile cloud",
    maxSum: 158,
    parts: [{ d: "M22 66Q4 64 8 48Q6 32 24 34Q30 20 50 24Q70 18 78 34Q96 34 92 50Q96 66 78 66Q66 76 50 70Q32 78 22 66Z", c: C.mint }],
    ink: (
      <>
        <Hand x={50} y={46} size={7.5}>what made</Hand>
        <Hand x={50} y={56} size={7.5}>you smile?</Hand>
      </>
    ),
  },
  {
    id: "wander",
    label: "Wander",
    maxSum: 172,
    parts: [
      { d: box(20, 8, 60, 84), c: C.sky },
      { d: "M34 26Q30 16 42 18Q48 10 56 18Q68 16 66 26Q70 34 58 32Q48 38 42 32Q30 36 34 26Z", c: C.cream },
      { d: "M20 54Q40 38 60 50T80 46V92H20Z", c: C.sage },
      { d: "M42 92Q46 70 60 49L65 51Q56 72 64 92Z", c: C.peach },
      { d: circ(32, 62, 3.4), c: C.pink },
      { d: circ(72, 66, 3), c: C.butter },
    ],
    ink: <Hand x={33} y={86} size={8} script>wander</Hand>,
  },
  {
    id: "one-thing",
    label: "One thing at a time",
    maxSum: 150,
    parts: [
      { d: box(32, 18, 42, 62), c: C.cream },
      { d: box(28, 14, 42, 62), c: C.butter },
    ],
    ink: (
      <>
        <Hand x={49} y={30} size={9} spaced>ONE</Hand>
        <Hand x={49} y={43} size={9} spaced>THING</Hand>
        <Hand x={49} y={56} size={9} spaced>AT A</Hand>
        <Hand x={49} y={69} size={9} spaced>TIME</Hand>
      </>
    ),
  },
  {
    id: "stay-soft",
    label: "Stay soft",
    maxSum: 150,
    ...word("Stay Soft", 60, 25, C.mint),
  },
  {
    id: "small-wonders",
    label: "Small wonders",
    maxSum: 172,
    parts: [
      { d: box(24, 8, 52, 84), c: C.lilac },
      { d: box(24, 8, 52, 22), c: C.mint },
      { d: heart(52, 52, 15), c: C.rose },
      { d: heart(48, 52, 15), c: C.cream },
    ],
    ink: (
      <>
        <path d="M24 30q6 4 13 0t13 0t13 0t13 0" {...pen} />
        <Hand x={50} y={84} size={7} script>small wonders</Hand>
      </>
    ),
  },
  {
    id: "say-hi",
    label: "Just say hi",
    maxSum: 172,
    parts: [
      { d: box(24, 8, 52, 84), c: C.mint },
      { d: box(38, 20, 28, 46), c: C.butter },
      { d: "M38 66V42Q38 32 48 34Q58 36 56 48V66Z", c: C.cream },
      { d: "M24 92V70Q32 62 42 68Q52 60 60 68Q70 62 76 70V92Z", c: C.sage },
    ],
    ink: (
      <>
        <circle cx={44} cy={44} r={1} fill={INK} />
        <circle cx={51} cy={44} r={1} fill={INK} />
        <path d="M46 47q1.5 1.5 3 0" {...pen} />
        <Hand x={50} y={84} size={7}>just say hi</Hand>
      </>
    ),
  },
  {
    id: "read-slowly",
    label: "Read slowly",
    maxSum: 164,
    parts: [
      { d: box(12, 24, 38, 52), c: C.lilac },
      { d: box(50, 24, 38, 52), c: C.peach },
      { d: heart(31, 54, 9), c: C.sky },
    ],
    ink: (
      <>
        <path d="M17 29h28v42h-28z" {...pen} strokeWidth={0.5} strokeDasharray="1.5 1.5" />
        <Hand x={69} y={42} size={8} script>read</Hand>
        <Hand x={69} y={58} size={8} script>slowly</Hand>
      </>
    ),
  },
  {
    id: "breathe",
    label: "Breathe",
    maxSum: 150,
    ...word("Breathe", 60, 28, C.pink),
  },
  {
    id: "come-home",
    label: "Come home",
    maxSum: 170,
    parts: [{ d: "M8 42L50 14L92 42V84H8Z", c: C.sky }],
    ink: (
      <>
        <Hand x={34} y={50} size={7}>come</Hand>
        <Hand x={68} y={56} size={7}>home</Hand>
        <Hand x={50} y={74} size={7.5} script>to yourself</Hand>
      </>
    ),
  },
  {
    id: "tea-first",
    label: "Tea first",
    maxSum: 168,
    parts: [
      { d: box(18, 14, 64, 72), c: C.peach },
      { d: "M62 44Q74 42 72 52Q70 60 60 58Z", c: C.cream },
      { d: "M34 40H66Q66 64 50 66Q34 64 34 40Z", c: C.sky },
      { d: ell(50, 40, 16, 3.6), c: C.cream },
      { d: ell(50, 68, 22, 3), c: C.mint },
    ],
    ink: (
      <>
        <path d="M44 32q-3-4 0-7t0-7M54 32q-3-4 0-7t0-7" {...pen} />
        <Hand x={50} y={80} size={7.5} script>tea first</Hand>
      </>
    ),
  },
  {
    id: "write-back",
    label: "Write back",
    maxSum: 170,
    parts: [
      { d: box(10, 28, 80, 50), c: C.cream },
      { d: "M10 28L50 56L90 28Z", c: C.pink },
      { d: heart(50, 54, 7), c: C.rose },
    ],
    ink: (
      <>
        <path d="M10 78L36 46M90 78L64 46" {...pen} strokeWidth={0.5} />
        <Hand x={50} y={73} size={6.5}>write back</Hand>
      </>
    ),
  },
  {
    id: "rest",
    label: "Rest is good",
    maxSum: 170,
    parts: [
      { d: box(22, 10, 56, 80), c: C.lilac },
      { d: "M58 24A18 18 0 1 0 58 58A14 14 0 1 1 58 24Z", c: C.butter },
    ],
    ink: (
      <>
        <path d="M62 22l1 3l3 1l-3 1l-1 3l-1-3l-3-1l3-1zM68 50l.8 2.2l2.2.8l-2.2.8l-.8 2.2l-.8-2.2l-2.2-.8l2.2-.8z" fill={C.cream} stroke={INK} strokeWidth={0.5} />
        <Hand x={50} y={80} size={7.5} script>rest is good</Hand>
      </>
    ),
  },
  {
    id: "sprig",
    label: "Little sprig",
    maxSum: 160,
    parts: [
      { d: leaf(52, 66, 200, 26), c: C.sage },
      { d: leaf(50, 52, -24, 26), c: C.sage },
      { d: leaf(50, 76, 28, 22), c: C.mint },
      ...[0, 72, 144, 216, 288].map((deg) => ({ d: leaf(50, 26, deg - 90, 15), c: C.pink })),
      { d: circ(50, 26, 4), c: C.butter },
    ],
    ink: <path d="M50 30Q46 60 52 94" {...pen} />,
  },
  {
    id: "good-morning",
    label: "Good morning",
    maxSum: 158,
    parts: [
      {
        d: `M${Array.from({ length: 24 }, (_, i) => {
          const a = (i * 15 * Math.PI) / 180;
          const r = i % 2 === 0 ? 40 : 31;
          return `${r2(50 + r * Math.cos(a))} ${r2(50 + r * Math.sin(a))}`;
        }).join("L")}Z`,
        c: C.butter,
      },
    ],
    ink: (
      <>
        <Hand x={50} y={48} size={8} script>good</Hand>
        <Hand x={50} y={59} size={8} script>morning</Hand>
      </>
    ),
  },
  {
    id: "handle-gently",
    label: "Handle gently",
    maxSum: 150,
    parts: [
      { d: "M10 34H70L92 50L70 66H10Z", c: C.peach },
      { d: circ(74, 50, 3.4), c: C.cream },
    ],
    ink: (
      <>
        <path d="M76 48Q90 36 94 22" {...pen} />
        <Hand x={40} y={47} size={7.5} script>handle</Hand>
        <Hand x={40} y={58} size={7.5} script>gently</Hand>
      </>
    ),
  },
  {
    id: "no-rush",
    label: "No rush",
    maxSum: 166,
    parts: [
      { d: "M8 72Q30 78 60 72Q78 68 84 50Q88 42 92 48Q96 60 86 72Q74 84 40 84H14Q6 80 8 72Z", c: C.mint },
      { d: circ(46, 50, 25), c: C.pink },
    ],
    ink: (
      <>
        <path d="M46 50q5-4 8 1t-4 9t-12-4t3-14t16 1t6 14" {...pen} />
        <path d="M88 46l-2-10M93 47l2-10" {...pen} />
        <Hand x={46} y={80} size={6.5}>no rush</Hand>
      </>
    ),
  },
  {
    id: "let-it-be",
    label: "Let it be easy",
    maxSum: 150,
    parts: [
      { d: box(32, 18, 42, 62), c: C.cream },
      { d: box(28, 14, 42, 62), c: C.peach },
    ],
    ink: (
      <>
        <Hand x={49} y={34} size={9} spaced>LET</Hand>
        <Hand x={49} y={49} size={9} spaced>IT BE</Hand>
        <Hand x={49} y={64} size={9} spaced>EASY</Hand>
      </>
    ),
  },
  {
    id: "candle",
    label: "Light a candle",
    maxSum: 172,
    parts: [
      { d: ell(50, 86, 26, 6), c: C.sky },
      { d: "M36 42H64V84Q50 90 36 84Z", c: C.cream },
      { d: ell(50, 42, 14, 3.4), c: C.butter },
      { d: "M50 34Q41 24 50 10Q59 24 50 34Z", c: C.peach },
    ],
    ink: (
      <>
        <path d="M50 40V34" {...pen} />
        <Hand x={50} y={66} size={6.5}>glow</Hand>
      </>
    ),
  },
  {
    id: "toast",
    label: "Warm toast",
    maxSum: 168,
    parts: [
      { d: "M20 40Q12 22 30 20Q40 12 50 18Q60 12 70 20Q88 22 80 40V84H20Z", c: C.peach },
      { d: "M27 40Q21 28 34 27Q42 21 50 25Q58 21 66 27Q79 28 73 40V77H27Z", c: C.cream },
      { d: box(38, 34, 24, 16), c: C.butter },
    ],
    ink: (
      <>
        <path d="M43 56v2M57 56v2M45 62q5 4 10 0" {...pen} />
        <Hand x={50} y={73} size={6}>warm toast</Hand>
      </>
    ),
  },
  {
    id: "one-more",
    label: "One more",
    maxSum: 156,
    parts: [
      { d: circ(50, 50, 38), c: C.peach },
      { d: circ(32, 36, 5), c: C.rose },
      { d: circ(62, 28, 4), c: C.rose },
      { d: circ(72, 56, 5), c: C.rose },
      { d: circ(30, 66, 4), c: C.rose },
      { d: circ(54, 74, 4.6), c: C.rose },
    ],
    ink: <Hand x={50} y={54} size={8} script>one more</Hand>,
  },
  {
    id: "be-kind",
    label: "Be kind",
    maxSum: 162,
    parts: [{ d: "M50 84Q10 54 18 30Q30 8 50 30Q70 8 82 30Q90 54 50 84Z", c: C.pink }],
    ink: (
      <>
        <path d="M30 28q4-6 9-5" {...pen} />
        <Hand x={50} y={50} size={9} script>be kind</Hand>
      </>
    ),
  },
  {
    id: "got-this",
    label: "You got this",
    maxSum: 156,
    parts: [{ d: star(50, 52, 46, 24), c: C.butter }],
    ink: <Hand x={50} y={55} size={6.5}>you got this</Hand>,
  },
  {
    id: "good-day",
    label: "Good day",
    maxSum: 176,
    parts: [
      { d: "M8 70A42 42 0 0 1 92 70Z", c: C.pink },
      { d: "M16 70A34 34 0 0 1 84 70Z", c: C.butter },
      { d: "M24 70A26 26 0 0 1 76 70Z", c: C.mint },
      { d: "M32 70A18 18 0 0 1 68 70Z", c: C.sky },
      { d: ell(20, 72, 16, 8), c: C.cream },
      { d: ell(80, 72, 16, 8), c: C.cream },
    ],
    ink: <Hand x={50} y={90} size={8} script>good day</Hand>,
  },
  {
    id: "mushroom",
    label: "Little mushroom",
    maxSum: 164,
    parts: [
      { d: leaf(30, 86, -120, 20), c: C.sage },
      { d: leaf(70, 86, -60, 20), c: C.sage },
      { d: "M38 56Q37 76 34 86H66Q63 76 62 56Z", c: C.cream },
      { d: "M14 54Q16 18 50 16Q84 18 86 54Q50 62 14 54Z", c: C.pink },
      { d: circ(34, 38, 6), c: C.cream },
      { d: circ(58, 28, 5), c: C.cream },
      { d: circ(68, 44, 4), c: C.cream },
    ],
    ink: <path d="M45 68v2M55 68v2M46 75q4 3 8 0" {...pen} />,
  },
  {
    id: "rainy-day",
    label: "Rainy day",
    maxSum: 160,
    parts: [
      { d: "M12 48Q16 14 50 14Q84 14 88 48Q79 40 69 48Q60 40 50 48Q40 40 31 48Q21 40 12 48Z", c: C.sky },
      { d: leaf(26, 58, 90, 12), c: C.sky },
      { d: leaf(74, 58, 90, 12), c: C.sky },
      { d: leaf(36, 74, 90, 10), c: C.sky },
    ],
    ink: <path d="M50 14V10M50 48V78Q50 86 58 86Q64 86 64 80M31 48Q38 26 50 14Q62 26 69 48" {...pen} />,
  },
  {
    id: "sea-shell",
    label: "Sea shell",
    maxSum: 158,
    parts: [
      { d: "M40 88H60L56 76H44Z", c: C.pink },
      { d: "M50 82L14 44Q22 16 50 12Q78 16 86 44Z", c: C.peach },
    ],
    ink: <path d="M50 78V18M50 78L35 20M50 78L65 20M50 78L24 32M50 78L76 32" {...pen} />,
  },
  {
    id: "bee-happy",
    label: "Bee happy",
    maxSum: 170,
    parts: [
      { d: leaf(46, 42, -125, 28), c: C.sky },
      { d: leaf(54, 42, -55, 28), c: C.sky },
      { d: ell(50, 56, 28, 18), c: C.butter },
      { d: "M38 40Q34 56 38 72L46 74Q42 56 46 38Z", c: C.lilac },
      { d: "M54 38Q58 56 54 74L62 72Q66 56 62 40Z", c: C.lilac },
    ],
    ink: (
      <>
        <path d="M71 52v1.5M72 60q3 1 5-1M22 56l-6 0M78 44q4-8 9-8" {...pen} />
        <Hand x={50} y={90} size={7.5} script>bee happy</Hand>
      </>
    ),
  },
  {
    id: "carousel",
    label: "Little carousel",
    oil: true,
    maxSum: 166,
    parts: [
      { d: circ(50, 50, 46), c: O.ground },
      { d: circ(50, 52, 34), c: O.deep },
      { d: "M26 72Q50 66 74 72V81Q74 88 50 88Q26 88 26 81Z", c: O.pink },
      { d: ell(50, 72, 24, 4.6), c: O.blush },
      { d: box(44, 38, 12, 34), c: O.blush },
      { d: ell(50, 38, 28, 3.6), c: O.blush },
      { d: "M22 37Q21 29 30 27H70Q79 29 78 37Q71 34 64 37Q57 34 50 37Q43 34 36 37Q29 34 22 37Z", c: O.white },
      { d: "M27 28Q40 23 50 10Q60 23 73 28Q50 32 27 28Z", c: O.pink },
      { d: "M43 29Q46 21 50 10Q54 21 57 29Z", c: O.mint },
      dab(50, 9, 2.8, O.gold),
      pony(36, 54, 0.52, 1, O.white),
      pony(64, 58, 0.52, -1, O.white),
      ...blossom(33, 31.5, 2, O.coral, O.butter),
      ...blossom(50, 32, 2.2, O.mint, O.cobalt),
      ...blossom(67, 31.5, 2, O.butter, O.coral),
      ...blossom(50, 80, 3.6, O.butter, O.cobalt),
      ...blossom(36, 79, 2.2, O.coral, O.butter),
      ...blossom(64, 79, 2.2, O.coral, O.butter),
    ],
    ink: (
      <>
        <Fine d="M34 38V62M66 38V66" c={O.gold} w={0.8} />
        <Fine d="M22 37Q29 34 36 37Q43 34 50 37Q57 34 64 37Q71 34 78 37" c={O.rose} />
        <Fine d="M26 76Q50 82 74 76" c={O.gold} w={0.7} />
        <Fine d="M26 72V81Q26 88 50 88Q74 88 74 81V72" c={O.rose} />
        <Fine d="M47 46Q50 50 53 46M47 58Q50 62 53 58" c={O.leaf} />
        <Glints at={[[12, 40, 4], [88, 44, 3], [80, 16, 3.4], [18, 74, 3], [30, 18, 2.2]]} />
      </>
    ),
  },
  {
    id: "star-pony",
    label: "Star pony",
    oil: true,
    maxSum: 174,
    parts: [
      { d: box(3, 14, 94, 72), c: O.blush },
      { d: "M9 20H40Q50 28 60 20H91V80H60Q50 72 40 80H9Z", c: O.ground },
      lattice(12, 23, 76, 54, 12),
      pony(50, 52, 1.32, 1, O.white),
      { d: "M38 46Q48 51 58 46L57 55Q48 62 39 55Z", c: O.mint },
      { d: "M39 45Q48 49 57 45L56 52Q48 58 40 52Z", c: O.pink },
      { d: "M66 32L65 26L68 28.4L70.4 25L72.8 28.4L76 26L75 32Z", c: O.gold },
      dab(70.4, 29.6, 1, O.coral),
      ...garland(62, 37, 60, 45, 66, 47, 5, 1.1),
      ...garland(36, 45, 28, 48, 24, 46, 4, 0.9),
      bird(22, 33, 1, O.white),
      bird(82, 45, 0.8, O.white),
      { d: leaf(16, 76, -70, 10), c: O.mint },
      { d: leaf(84, 76, -110, 10), c: O.mint },
      ...blossom(19, 66, 3.4, O.coral, O.butter),
      ...blossom(28, 72, 2.6, O.pink, O.coral),
      ...blossom(84, 32, 3.2, O.pink, O.butter),
      ...blossom(83, 66, 3.4, O.butter, O.coral),
      ...blossom(72, 72, 2.4, O.cobalt, O.butter),
    ],
    ink: (
      <>
        <Fine d="M9 20H40Q50 28 60 20H91V80H60Q50 72 40 80H9Z" c={O.rose} w={0.8} />
        <Fine d="M60 29Q56 34 58 40M63 28Q60 31 61 36" c={O.rose} />
        <Fine d="M19 70V78M28 75V79M83 70V78M72 75V79" c={O.leaf} />
        <Fine d="M84 36Q86 42 84 48" c={O.leaf} />
        <Glints at={[[16, 28, 3], [32, 27, 2.2], [76, 22, 2.2], [60, 72, 2.4]]} />
      </>
    ),
  },
  {
    id: "painted-crown",
    label: "Painted crown",
    oil: true,
    maxSum: 150,
    parts: [
      { d: ell(50, 50, 46, 36), c: O.blush },
      { d: ell(50, 50, 41, 31), c: O.ground },
      { d: "M24 64L18 36L35 48L50 26L65 48L82 36L76 64Z", c: O.gold },
      { d: "M24 62H76L74 71H26Z", c: O.pink },
      dab(18, 35, 3, O.coral),
      dab(50, 25, 3.6, O.coral),
      dab(82, 35, 3, O.coral),
      ...blossom(50, 50, 6, O.pink, O.butter),
      ...garland(30, 66.5, 50, 66.5, 70, 66.5, 7, 1.5),
      dab(33, 54, 2, O.cobalt),
      dab(67, 54, 2, O.cobalt),
    ],
    ink: (
      <>
        <Fine d={ell(50, 50, 41, 31)} c={O.rose} w={0.8} />
        <Fine d="M24 62H76" c={O.coral} />
        <Fine d="M24 64L18 36L35 48L50 26L65 48L82 36L76 64" c={O.coral} w={0.45} />
        <Glints at={[[28, 28, 3], [72, 26, 3.4], [84, 58, 2.4], [18, 56, 2]]} />
      </>
    ),
  },
  {
    id: "dove",
    label: "White dove",
    oil: true,
    maxSum: 170,
    parts: [
      { d: box(10, 12, 80, 76), c: O.blush },
      { d: box(15, 17, 70, 66), c: O.ground },
      lattice(15, 17, 70, 66, 11),
      { d: "M20 58Q34 46 47 50L72 25Q72 41 60 54Q70 54 82 49Q73 65 54 63L37 76Q38 66 42 61Q30 63 20 58Z", c: O.white },
      { d: "M20 58L15 60L21 55Z", c: O.gold },
      bird(30, 30, 0.9, O.white),
      ...blossom(26, 76, 3.2, O.pink, O.coral),
      ...blossom(72, 74, 3.4, O.butter, O.coral),
      ...blossom(60, 76, 2.2, O.coral, O.butter),
    ],
    ink: (
      <>
        <Fine d={box(15, 17, 70, 66)} c={O.rose} w={0.8} />
        <Fine d="M49 54Q56 46 66 34M53 57Q60 52 70 42" c={O.rose} w={0.4} />
        <Fine d="M26 80V83M72 79V83M60 79V83" c={O.leaf} />
        <Glints at={[[50, 28, 3], [78, 60, 2.4], [42, 78, 2.2], [22, 44, 2]]} />
      </>
    ),
  },
  {
    id: "moon-garden",
    label: "Moon garden",
    oil: true,
    maxSum: 172,
    parts: [
      { d: "M22 94V28Q22 5 50 5Q78 5 78 28V94Z", c: O.blush },
      { d: "M27 89V29Q27 10 50 10Q73 10 73 29V89Z", c: O.ground },
      lattice(30, 30, 40, 56, 10),
      dab(57, 27, 10, O.butter),
      dab(52.5, 24.5, 9, O.ground),
      { d: leaf(40, 86, -105, 28), c: O.mint },
      { d: leaf(58, 86, -76, 24), c: O.mint },
      ...blossom(38, 48, 5, O.pink, O.butter),
      ...blossom(62, 54, 4.6, O.coral, O.butter),
      ...blossom(50, 66, 3.8, O.cobalt, O.butter),
      ...blossom(35, 68, 3, O.butter, O.coral),
      ...blossom(66, 72, 3, O.pink, O.coral),
    ],
    ink: (
      <>
        <Fine d="M27 89V29Q27 10 50 10Q73 10 73 29V89Z" c={O.rose} w={0.8} />
        <Fine d="M38 53Q40 70 42 88M62 59Q60 74 58 88M50 70V88M35 71Q37 80 40 88M66 75Q64 82 60 88" c={O.leaf} />
        <Glints at={[[36, 22, 3], [44, 32, 1.8], [66, 40, 2.4], [52, 44, 1.6]]} />
      </>
    ),
  },
  {
    id: "peony",
    label: "Oil peony",
    oil: true,
    maxSum: 160,
    parts: [
      { d: leaf(26, 72, 205, 24), c: O.mint },
      { d: leaf(74, 74, 25, 24), c: O.mint },
      { d: leaf(42, 84, 115, 16), c: O.leaf },
      ...[0, 60, 120, 180, 240, 300].map((deg) => dab(r2(50 + 23 * Math.cos((deg * Math.PI) / 180)), r2(48 + 23 * Math.sin((deg * Math.PI) / 180)), 18, O.pink)),
      ...[30, 90, 150, 210, 270, 330].map((deg) => dab(r2(50 + 15 * Math.cos((deg * Math.PI) / 180)), r2(48 + 15 * Math.sin((deg * Math.PI) / 180)), 13, O.blush)),
      ...[0, 72, 144, 216, 288].map((deg) => dab(r2(50 + 7 * Math.cos((deg * Math.PI) / 180)), r2(48 + 7 * Math.sin((deg * Math.PI) / 180)), 7, O.white)),
      dab(50, 48, 3.6, O.butter),
      dab(50, 48, 1.8, O.coral),
    ],
    ink: (
      <>
        <Fine d="M30 30Q38 24 44 30M70 30Q62 24 56 30M26 54Q32 62 38 60M74 54Q68 62 62 60M42 72Q50 76 58 72" c={O.rose} />
        <Fine d="M43 41Q50 37 57 41M42 54Q50 59 58 54" c={O.coral} w={0.4} />
        <Fine d="M26 72Q18 70 8 66M74 74Q82 74 94 80M42 84Q40 88 36 98" c={O.leaf} w={0.5} />
        <Glints at={[[16, 22, 3.2], [84, 24, 2.6], [88, 56, 2]]} />
      </>
    ),
  },
  {
    id: "swan",
    label: "Pale swan",
    oil: true,
    maxSum: 170,
    parts: [
      { d: ell(50, 50, 46, 42), c: O.blush },
      { d: ell(50, 50, 41, 37), c: O.ground },
      { d: ell(50, 76, 34, 9), c: O.deep },
      { d: "M24 60Q32 80 58 77Q76 74 78 56Q66 64 56 60Q47 54 49 44Q51 34 59 34Q66 34 64 28Q56 22 47 28Q37 36 41 52Q32 60 24 60Z", c: O.white },
      { d: "M63 29L72 32L62 34Z", c: O.gold },
      { d: "M54 22L53 17L55.5 19L57 16L59 19L61 17L60 23Z", c: O.gold },
      ...blossom(26, 76, 3, O.pink, O.butter),
      ...blossom(76, 78, 2.6, O.coral, O.butter),
    ],
    ink: (
      <>
        <Fine d={ell(50, 50, 41, 37)} c={O.rose} w={0.8} />
        <Fine d="M38 66Q50 72 66 62M42 62Q52 66 62 60" c={O.rose} w={0.4} />
        <Glints at={[[26, 32, 3], [76, 38, 2.4], [38, 22, 2], [82, 58, 2]]} />
      </>
    ),
  },
  {
    id: "bouquet",
    label: "Painted bouquet",
    oil: true,
    maxSum: 166,
    parts: [
      { d: leaf(46, 56, 200, 22), c: O.mint },
      { d: leaf(54, 56, -20, 22), c: O.mint },
      { d: leaf(50, 42, -130, 22), c: O.leaf },
      ...blossom(50, 26, 9, O.pink, O.butter),
      ...blossom(30, 38, 7, O.coral, O.butter),
      ...blossom(70, 38, 7, O.butter, O.coral),
      ...blossom(50, 48, 6, O.cobalt, O.butter),
      { d: "M38 62H62L66 86Q50 94 34 86Z", c: O.ground },
      ...garland(38, 72, 50, 77, 62, 72, 6, 1.3),
    ],
    ink: (
      <>
        <Fine d="M38 62H62L66 86Q50 94 34 86Z" c={O.rose} w={0.8} />
        <Fine d="M50 34V62M34 44L44 62M66 44L56 62" c={O.leaf} />
        <Glints at={[[18, 22, 3], [84, 22, 2.6], [78, 62, 2.2]]} />
      </>
    ),
  },
  {
    id: "butterfly",
    label: "Pink butterfly",
    oil: true,
    maxSum: 150,
    parts: [
      { d: "M48 50Q26 8 10 24Q2 46 46 58Z", c: O.pink },
      { d: "M52 50Q74 8 90 24Q98 46 54 58Z", c: O.pink },
      { d: "M47 56Q16 58 24 82Q38 90 49 62Z", c: O.blush },
      { d: "M53 56Q84 58 76 82Q62 90 51 62Z", c: O.blush },
      { d: ell(50, 54, 2.6, 16), c: O.violet },
      dab(24, 32, 4, O.butter),
      dab(76, 32, 4, O.butter),
      dab(34, 72, 3, O.coral),
      dab(66, 72, 3, O.coral),
      ...garland(14, 30, 26, 46, 42, 52, 4, 1.1),
      ...garland(86, 30, 74, 46, 58, 52, 4, 1.1),
    ],
    ink: (
      <>
        <Fine d="M48 38Q42 24 38 22M52 38Q58 24 62 22" c={O.cobalt} w={0.5} />
        <Fine d="M46 52Q30 34 18 26M54 52Q70 34 82 26M47 60Q36 66 30 78M53 60Q64 66 70 78" c={O.rose} w={0.45} />
        <Glints at={[[12, 56, 2.6], [88, 58, 2.4], [50, 88, 2.4]]} />
      </>
    ),
  },
  {
    id: "balloon",
    label: "Dream balloon",
    oil: true,
    maxSum: 158,
    parts: [
      { d: "M50 6Q84 6 84 38Q84 58 58 72H42Q16 58 16 38Q16 6 50 6Z", c: O.pink },
      { d: "M50 6Q68 16 68 38Q68 58 54 72H46Q32 58 32 38Q32 16 50 6Z", c: O.white },
      { d: "M50 6Q58 16 58 38Q58 58 51 72H49Q42 58 42 38Q42 16 50 6Z", c: O.ground },
      ...garland(18, 46, 50, 58, 82, 46, 9, 1.5),
      { d: box(42, 83, 16, 11), c: O.gold },
    ],
    ink: (
      <>
        <Fine d="M43 72L44 83M57 72L56 83" c={O.gold} w={0.7} />
        <Fine d="M42 88H58" c={O.coral} />
        <Fine d="M50 6Q84 6 84 38Q84 58 58 72H42Q16 58 16 38Q16 6 50 6Z" c={O.rose} />
        <Glints at={[[14, 72, 3], [86, 74, 2.6], [76, 12, 2.4], [22, 14, 2.2]]} />
      </>
    ),
  },
];

/** The sticker collections, each its own tray. */
const COLLECTIONS = [
  { name: "Cosy days", cover: "tea-first", ids: ["tiny-joys", "tea-first", "read-slowly", "toast", "write-back", "candle", "pencil", "one-more", "come-home", "rest"] },
  { name: "Soft words", cover: "smile-cloud", ids: ["go-slow", "stay-soft", "be-kind", "breathe", "one-thing", "got-this", "let-it-be", "handle-gently", "good-day", "smile-cloud"] },
  { name: "Outside", cover: "wander", ids: ["wander", "sprig", "good-morning", "mushroom", "no-rush", "rainy-day", "small-wonders", "sea-shell", "say-hi", "bee-happy"] },
  { name: "Oil paintings", cover: "carousel", ids: ["carousel", "star-pony", "painted-crown", "swan", "dove", "bouquet", "moon-garden", "butterfly", "peony", "balloon"] },
];

/** Every sticker is its own thing in the tray, each with a slight tilt. */
const TILTS = [-5, 3, -2, 5, -3, 2];
const PIECES = COLLECTIONS.flatMap(({ ids }, collection) =>
  ids.map((id, order) => ({ def: STICKERS.find((d) => d.id === id) as StickerDef, id, collection, order, rot: TILTS[order % TILTS.length] })),
);

const washShapes = (def: StickerDef) => (
  <>
    {def.halo}
    {def.parts.map((p, i) => (
      <path key={i} d={p.d} fill={p.c} />
    ))}
  </>
);
/** Ink outlines plus lettering. */
const inkShapes = (def: StickerDef) => (
  <>
    <g {...pen}>
      {def.parts.map((p, i) => (
        <path key={i} d={p.d} />
      ))}
    </g>
    {def.ink}
  </>
);
/** Everything, unfiltered: what the die-cut outline and masks are grown from. */
const allShapes = (def: StickerDef) => (
  <>
    {washShapes(def)}
    {inkShapes(def)}
  </>
);

/** The artwork as it is printed on the sticker. */
const printShapes = (def: StickerDef, uid: string) => def.oil ? (
  <>
    <g filter={`url(#${uid}-oil)`}>{washShapes(def)}</g>
    <g filter={`url(#${uid}-pen)`}>{def.ink}</g>
  </>
) : (
  <>
    {/* See-through washes, a hair off-register from the pen: the page shows through */}
    <g transform="translate(0.7 0.5)" opacity={0.8} filter={`url(#${uid}-wash)`}>
      {washShapes(def)}
    </g>
    <g filter={`url(#${uid}-pen)`}>{inkShapes(def)}</g>
  </>
);

/* -------------------------------------------------------------------------- */
/* Shared SVG filters                                                         */
/* -------------------------------------------------------------------------- */

const FILTER_BOX = { x: -15, y: -15, width: 130, height: 130, filterUnits: "userSpaceOnUse" } as const;

/** Fatten the artwork, then round it off: the die-cut line a real sticker is cut along. */
const GROW = (
  <>
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="fat" />
    <feGaussianBlur in="fat" stdDeviation="0.6" result="blur" />
    <feComponentTransfer in="blur" result="grown">
      <feFuncA type="linear" slope="12" intercept="-5.5" />
    </feComponentTransfer>
  </>
);

function SharedFilters({ uid }: { uid: string }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        {/* Watercolour: bled, wobbling edges, granulation, pooled rim */}
        <filter id={`${uid}-wash`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="6" result="bleedN" />
          <feDisplacementMap in="SourceGraphic" in2="bleedN" scale="3" xChannelSelector="R" yChannelSelector="G" result="bled" />
          <feGaussianBlur in="bled" stdDeviation="0.5" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3" result="grainN" />
          <feColorMatrix in="grainN" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0.5" result="grainA" />
          <feComposite in="soft" in2="grainA" operator="in" result="wash" />
          <feMorphology in="soft" operator="erode" radius="1.1" result="core" />
          <feComposite in="soft" in2="core" operator="out" result="rim" />
          <feGaussianBlur in="rim" stdDeviation="0.7" result="rimSoft" />
          <feComposite in="soft" in2="rimSoft" operator="in" result="pool" />
          <feMerge>
            <feMergeNode in="wash" />
            <feMergeNode in="pool" />
          </feMerge>
        </filter>
        {/* Dreamy oil: soft hand-painted edges, pale paint blooming into the blue, a fine canvas tooth */}
        <filter id={`${uid}-oil`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="drag" />
          <feDisplacementMap in="SourceGraphic" in2="drag" scale="2" xChannelSelector="R" yChannelSelector="G" result="paint" />
          <feGaussianBlur in="paint" stdDeviation="0.2" result="wet" />
          <feColorMatrix in="paint" type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.97  2.2 2.2 2.2 0 -5.6" result="pale" />
          <feGaussianBlur in="pale" stdDeviation="1.5" result="glow" />
          <feComposite in="glow" in2="wet" operator="in" result="bloom" />
          <feMerge result="soft">
            <feMergeNode in="wet" />
            <feMergeNode in="bloom" />
          </feMerge>
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="11" result="tooth" />
          <feDiffuseLighting in="tooth" surfaceScale="0.12" diffuseConstant="1.05" lightingColor="#ffffff" result="light">
            <feDistantLight azimuth="235" elevation="72" />
          </feDiffuseLighting>
          <feComposite in="soft" in2="light" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="lit" />
          <feComposite in="lit" in2="soft" operator="in" />
        </filter>
        {/* Pen: crisp, with a slight hand wobble */}
        <filter id={`${uid}-pen`} {...FILTER_BOX}>
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* The clear film it is printed on, with the hairline of the kiss cut */}
        <filter id={`${uid}-film`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#ffffff" floodOpacity="0.32" result="whiteFill" />
          <feComposite in="whiteFill" in2="grown" operator="in" result="white" />
          <feMorphology in="grown" operator="erode" radius="0.6" result="inner" />
          <feComposite in="grown" in2="inner" operator="out" result="edge" />
          <feFlood floodColor="#0e1011" floodOpacity="0.14" result="rimFill" />
          <feComposite in="rimFill" in2="edge" operator="in" result="rim" />
          <feMerge>
            <feMergeNode in="white" />
            <feMergeNode in="rim" />
          </feMerge>
        </filter>
        <filter id={`${uid}-silh`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#ffffff" result="flood" />
          <feComposite in="flood" in2="grown" operator="in" />
        </filter>
        {/* The back of the sticker: plain matte paper */}
        <filter id={`${uid}-back`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#f3f2ef" result="paperFill" />
          <feComposite in="paperFill" in2="grown" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* One sticker                                                                */
/* -------------------------------------------------------------------------- */

type Home = { x: number; y: number; rot: number; s: number; placed: boolean };
type FlyOpts = { /** Curl the corner and wait for it before lifting. */ peel?: boolean; /** Arc flight in ms. 0 means a spring. */ flight?: number; delay?: number };
type ItemApi = {
  flyTo: (target: Home, kind: "slap" | "home", opts?: FlyOpts) => Promise<void>;
  /** Falls into the bin, then a fresh copy appears at `next`. */
  throwAway: (bin: { x: number; y: number }, next: Home) => Promise<void>;
};

const homeKey = (h: Home) => `${h.placed ? 1 : 0}|${Math.round(h.x)}|${Math.round(h.y)}|${Math.round(h.rot)}|${Math.round(h.s * 100)}`;

type StickerItemProps = {
  def: StickerDef;
  uid: string;
  home: Home;
  z: number;
  interactive: boolean;
  /** Hidden with the tray closed. */
  hidden: boolean;
  /** Its place in the tray, which staggers the tray opening. */
  order: number;
  /** Where the tray is being looked at, and how strongly. */
  peekX: MotionValue<number>;
  peek: MotionValue<number>;
  reduce: boolean;
  label: string;
  bounds: { W: number; H: number };
  placedScale: number;
  apiRef: React.Ref<ItemApi>;
  toLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onDrop: (moved: boolean, x: number, y: number) => void;
  onCarry: (x: number, y: number) => void;
  onHeld: (held: boolean) => void;
  /** The sticker has left the tray and is being carried. */
  onLift: () => void;
  /** A sideways drag that started in the tray runs along it instead of peeling. */
  onScrub: (x: number) => void;
  onScrubEnd: () => void;
  /** Keyboard focus reached this sticker in the tray, or left it. */
  onKeyed: (keyed: boolean) => void;
  onRaise: () => void;
  onKey: (e: React.KeyboardEvent) => void;
  onDouble: () => void;
};

function StickerItem(props: StickerItemProps) {
  const { def, uid, home, z, interactive, hidden, order, peekX, peek, reduce, label, bounds, placedScale, apiRef, toLogical, onDrop, onCarry, onHeld, onLift, onScrub, onScrubEnd, onKeyed, onRaise, onKey, onDouble } = props;
  const sid = `${uid}-${def.id}`;

  const rx = useMotionValue(home.x);
  const ry = useMotionValue(home.y);
  const sx = useSpring(rx, POS_SPRING);
  const sy = useSpring(ry, POS_SPRING);
  const rotBase = useMotionValue(home.rot);
  const sc = useMotionValue(home.s);
  const qx = useMotionValue(1);
  const qy = useMotionValue(1);
  const curl = useMotionValue(0);
  const fade = useMotionValue(hidden ? 0 : 1);
  const rise = useMotionValue(hidden ? 20 : 0);
  /** 1 while it sits in the tray and takes part in the magnifier. */
  const inDock = useMotionValue(home.placed ? 0 : 1);
  const zv = useMotionValue(z);

  const velocity = useVelocity(sx);
  const velocityY = useVelocity(sy);
  // Soft paper flutters: moving fast lifts the peeled corner further, and it wobbles as it settles.
  const flutterTarget = useTransform([velocity, velocityY], (v: number[]) => clamp(Math.hypot(v[0], v[1]) * 0.0007, 0, 0.42));
  const flutter = useSpring(flutterTarget, { stiffness: 130, damping: 8 });
  const peelAmount = useTransform([curl, flutter], (v: number[]) => v[0] + v[1] * Math.min(1, v[0] * 6));
  const tiltTarget = useTransform(velocity, (v) => clamp(v * 0.012, -8, 8));
  const tilt = useSpring(tiltTarget, { stiffness: 200, damping: 24 });
  // The magnifier: closeness to the pointer grows a sticker, straightens it and pushes its neighbours aside.
  const lensInputs = [sx, peekX, peek, inDock];
  const near = useTransform(lensInputs, (v: number[]) => v[2] * v[3] * Math.exp(-(((v[0] - v[1]) / DOCK_REACH) ** 2)));
  const mag = useTransform(near, (n) => 1 + (DOCK_PEAK - 1) * n);
  const x = useTransform(lensInputs, (v: number[]) => v[0] - S / 2 + Math.tanh((v[0] - v[1]) / DOCK_REACH) * DOCK_SPREAD * v[2] * v[3]);
  // The bottom edge stays on the tray's baseline as it grows.
  const y = useTransform([sy, near, rise], (v: number[]) => v[0] - S / 2 - (v[1] * (DOCK_PEAK - 1) * DOCK_S * S) / 2 + v[2]);
  const rotate = useTransform([rotBase, tilt, near], (v: number[]) => v[0] * (1 - v[2]) + v[1]);
  const scaleX = useTransform([sc, qx, mag], (v: number[]) => v[0] * v[1] * v[2]);
  const scaleY = useTransform([sc, qy, mag], (v: number[]) => v[0] * v[1] * v[2]);
  const zIndex = useTransform([zv, near], (v: number[]) => v[0] + Math.round(v[1] * 50));

  const [lifted, setLifted] = React.useState(false);
  const all = React.useMemo(() => allShapes(def), [def]);

  const anims = React.useRef<AnimationPlaybackControls[]>([]);
  const timers = React.useRef<Set<number>>(new Set());
  const token = React.useRef(0);
  const busy = React.useRef(false);
  const handled = React.useRef(homeKey(home));
  const drag = React.useRef<null | {
    id: number;
    phase: "curl" | "drag" | "scrub";
    off: { x: number; y: number };
    start: { x: number; y: number };
    last: { x: number; y: number };
    moved: number;
    timer: number;
  }>(null);

  const stopAnims = () => {
    for (const a of anims.current) a.stop();
    anims.current = [];
  };
  const play = (mv: MotionValue<number>, to: number | number[], opts: ValueAnimationTransition<number>) => {
    const c = animate(mv, to as number, opts);
    anims.current.push(c);
    return c;
  };
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        timers.current.delete(id);
        resolve();
      }, ms);
      timers.current.add(id);
    });

  React.useEffect(() => {
    const t = timers.current;
    return () => {
      token.current += 1;
      for (const a of anims.current) a.stop();
      for (const id of t) window.clearTimeout(id);
      t.clear();
    };
  }, []);

  /* ---- the paper curl, drawn straight into the SVG ---- */
  const mainClip = React.useRef<SVGPathElement>(null);
  const flapClip = React.useRef<SVGPathElement>(null);
  const flapWrap = React.useRef<SVGGElement>(null);
  const flapG = React.useRef<SVGGElement>(null);

  const liftGrad = React.useRef<SVGLinearGradientElement>(null);
  const rollGrad = React.useRef<SVGLinearGradientElement>(null);

  const applyCurl = (v: number) => {
    const wrap = flapWrap.current;
    if (!wrap || !mainClip.current || !flapClip.current || !flapG.current || !liftGrad.current || !rollGrad.current) return;
    if (v < 0.012) {
      wrap.setAttribute("display", "none");
      mainClip.current.setAttribute("d", "M-80 -80 H200 V200 H-80 Z");
      return;
    }
    const D = def.maxSum + 14 - v * PEEL_REACH;
    wrap.setAttribute("display", "inline");
    mainClip.current.setAttribute("d", `M-80 -80 L${D + 80} -80 L-80 ${D + 80} Z`);
    flapClip.current.setAttribute("d", `M${D + 80} -80 L-80 ${D + 80} L340 340 Z`);
    // The flap folds back over itself, foreshortened because it rolls up instead of lying flat.
    const fold = (1 + clamp(0.5 + v * 0.3, 0.5, 0.86)) / 2;
    flapG.current.setAttribute("transform", `matrix(${1 - fold} ${-fold} ${-fold} ${1 - fold} ${fold * D} ${fold * D})`);
    const mid = D / 2;
    const reach = (def.maxSum - D) / 2 + 2;
    for (const [grad, far] of [[liftGrad.current, mid - 7], [rollGrad.current, mid + reach]] as const) {
      grad.setAttribute("x1", `${mid}`);
      grad.setAttribute("y1", `${mid}`);
      grad.setAttribute("x2", `${far}`);
      grad.setAttribute("y2", `${far}`);
    }
  };
  useMotionValueEvent(peelAmount, "change", applyCurl);
  React.useLayoutEffect(() => {
    applyCurl(peelAmount.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Leave the tray exactly where the magnifier has it, so taking a sticker doesn't jump. */
  const leaveDock = () => {
    if (inDock.get() === 0) return { x: rx.get(), y: ry.get() };
    const at = { x: x.get() + S / 2, y: y.get() + S / 2 };
    const m = mag.get();
    inDock.set(0);
    rise.jump(0);
    rx.jump(at.x);
    sx.jump(at.x);
    ry.jump(at.y);
    sy.jump(at.y);
    sc.jump(sc.get() * m);
    return at;
  };

  /* ---- motion recipes ---- */
  const slap = (t: Home) => {
    play(curl, 0, SMOOTH_SPRING);
    play(sc, t.s, { type: "spring", stiffness: 420, damping: 28 });
    qx.set(1.04);
    qy.set(0.96);
    play(qx, 1, { type: "spring", stiffness: 340, damping: 24 });
    play(qy, 1, { type: "spring", stiffness: 340, damping: 24 });
    play(rotBase, t.rot, { type: "spring", stiffness: 240, damping: 26 });
  };
  const settleHome = (t: Home) => {
    play(curl, 0, SMOOTH_SPRING);
    play(sc, t.s, { type: "spring", stiffness: 300, damping: 30 });
    play(rotBase, t.rot, { type: "spring", stiffness: 240, damping: 28 });
  };
  const jumpTo = (t: Home) => {
    rx.jump(t.x);
    sx.jump(t.x);
    ry.jump(t.y);
    sy.jump(t.y);
    rotBase.jump(t.rot);
    sc.jump(t.s);
    curl.jump(0);
    qx.jump(1);
    qy.jump(1);
  };

  const throwAway = async (bin: { x: number; y: number }, t: Home) => {
    const tok = ++token.current;
    stopAnims();
    handled.current = homeKey(t);
    busy.current = true;
    setLifted(true);
    onHeld(true);
    leaveDock();
    rx.set(bin.x);
    ry.set(bin.y);
    play(curl, 0, { duration: 0.2 });
    play(sc, 0.1, { duration: reduce ? 0 : 0.26, ease: "easeIn" });
    play(fade, 0, { duration: reduce ? 0.12 : 0.22, delay: reduce ? 0 : 0.08 });
    await wait(reduce ? 130 : 320);
    if (tok !== token.current) return;
    jumpTo(t);
    inDock.set(1);
    busy.current = false;
    setLifted(false);
    onHeld(false);
    rise.jump(reduce ? 0 : 20);
    play(fade, 1, { duration: 0.24 });
    play(rise, 0, { type: "spring", stiffness: 320, damping: 30 });
  };

  const flyTo = async (t: Home, kind: "slap" | "home", o: FlyOpts = {}) => {
    const tok = ++token.current;
    const live = () => tok === token.current;
    stopAnims();
    handled.current = homeKey(t);
    busy.current = true;
    setLifted(true);
    if (o.delay) {
      await wait(o.delay);
      if (!live()) return;
    }
    onHeld(true);
    const finish = () => {
      busy.current = false;
      setLifted(false);
      onHeld(false);
      if (!t.placed) inDock.set(1);
    };
    leaveDock();
    if (reduce) {
      play(fade, 0, { duration: 0.12 });
      await wait(130);
      if (!live()) return;
      jumpTo(t);
      play(fade, 1, { duration: 0.2 });
      await wait(220);
      if (live()) finish();
      return;
    }
    if (o.peel) {
      play(curl, 1, CURL_SPRING);
      play(sc, home.s * 1.05, { duration: 0.24 });
      await wait(260);
      if (!live()) return;
    }
    play(sc, CARRY_S * placedScale, { type: "spring", stiffness: 260, damping: 28 });
    play(curl, CARRY_CURL, CURL_SPRING);
    const flight = o.flight ?? 0;
    if (flight > 0) {
      const x0 = rx.get();
      const y0 = ry.get();
      const peak = Math.min(y0, t.y) - 36 - Math.abs(t.x - x0) * 0.05;
      const dur = flight / 1000;
      play(rx, t.x, { duration: dur, ease: [0.45, 0.05, 0.25, 1] });
      play(ry, [y0, peak, t.y], { duration: dur, times: [0, 0.5, 1], ease: ["easeOut", "easeIn"] });
      play(rotBase, t.rot, { duration: dur, ease: "easeInOut" });
      await wait(flight + 50);
    } else {
      play(rx, t.x, { type: "spring", stiffness: 260, damping: 24 });
      play(ry, t.y, { type: "spring", stiffness: 260, damping: 24 });
      await wait(kind === "slap" ? 80 : 380);
    }
    if (!live()) return;
    if (kind === "slap") slap(t);
    else settleHome(t);
    await wait(430);
    if (live()) finish();
  };

  React.useImperativeHandle(apiRef, () => ({ flyTo, throwAway }));

  // Home moved without a scripted flight (keyboard nudge, rotation): spring along.
  const key = homeKey(home);
  React.useEffect(() => {
    if (handled.current === key || drag.current) return;
    handled.current = key;
    if (busy.current && !home.placed) return;
    token.current += 1;
    stopAnims();
    if (reduce) {
      jumpTo(home);
      return;
    }
    play(rx, home.x, { type: "spring", stiffness: 300, damping: 30 });
    play(ry, home.y, { type: "spring", stiffness: 300, damping: 30 });
    play(rotBase, home.rot, { type: "spring", stiffness: 260, damping: 28 });
    play(sc, home.s, { type: "spring", stiffness: 300, damping: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /* ---- pointer ---- */
  const liftNow = () => {
    const d = drag.current;
    if (!d || d.phase === "drag") return;
    window.clearTimeout(d.timer);
    d.phase = "drag";
    const at = leaveDock();
    d.off = { x: d.start.x - at.x, y: d.start.y - at.y };
    onLift();
    if (reduce) {
      curl.set(0);
      sc.set(CARRY_S * placedScale);
    } else {
      play(sc, CARRY_S * placedScale, { type: "spring", stiffness: 300, damping: 28 });
      play(curl, CARRY_CURL, CURL_SPRING);
    }
    rx.set(d.last.x - d.off.x);
    ry.set(d.last.y - d.off.y);
  };

  const release = () => {
    const d = drag.current;
    if (!d) return;
    window.clearTimeout(d.timer);
    drag.current = null;
    if (d.phase === "scrub") {
      onScrubEnd();
      return;
    }
    if (d.phase === "curl") {
      // A tap: the corner lifts a little and settles back.
      play(curl, 0, SMOOTH_SPRING);
      play(sc, home.s, { type: "spring", stiffness: 400, damping: 32 });
      void wait(240).then(() => {
        if (drag.current) return;
        busy.current = false;
        setLifted(false);
        onHeld(false);
      });
      return;
    }
    onDrop(d.moved > 5, rx.get(), ry.get());
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    token.current += 1;
    stopAnims();
    const p = toLogical(e.clientX, e.clientY);
    busy.current = true;
    setLifted(true);
    onHeld(true);
    onRaise();
    drag.current = {
      id: e.pointerId,
      phase: "curl",
      off: { x: p.x - rx.get(), y: p.y - ry.get() },
      start: p,
      last: p,
      moved: 0,
      timer: 0,
    };
    if (reduce) {
      liftNow();
      return;
    }
    if (!home.placed) onScrub(rx.get());
    play(curl, home.placed ? 0.7 : 1, CURL_SPRING);
    play(sc, home.s * 1.04, { duration: 0.2 });
    drag.current.timer = window.setTimeout(liftNow, 150);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    const p = toLogical(e.clientX, e.clientY);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.last = p;
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.start.x, p.y - d.start.y));
    if (d.phase === "curl" && d.moved > 7) {
      if (!home.placed && Math.abs(p.x - d.start.x) > Math.abs(p.y - d.start.y)) {
        window.clearTimeout(d.timer);
        d.phase = "scrub";
        stopAnims();
        play(curl, 0, SMOOTH_SPRING);
        play(sc, home.s, { type: "spring", stiffness: 400, damping: 32 });
        busy.current = false;
        setLifted(false);
        onHeld(false);
      } else liftNow();
    }
    if (d.phase === "scrub") onScrub(p.x);
    if (d.phase === "drag") {
      rx.set(clamp(p.x - d.off.x, -10, bounds.W + 10));
      ry.set(clamp(p.y - d.off.y, -10, bounds.H + 10));
      onCarry(rx.get(), ry.get());
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    release();
  };

  const onPointerCancel = () => {
    const d = drag.current;
    if (!d) return;
    if (d.phase === "drag") {
      window.clearTimeout(d.timer);
      drag.current = null;
      onDrop(true, -999, -999);
    } else release();
  };

  const onEnter = (e: React.PointerEvent) => {
    if (!interactive || !home.placed || busy.current || drag.current || e.pointerType === "touch") return;
    stopAnims();
    play(sc, home.s * 1.05, { type: "spring", stiffness: 300, damping: 20 });
  };
  const onLeave = () => {
    if (!home.placed || busy.current || drag.current) return;
    stopAnims();
    play(sc, home.s, { type: "spring", stiffness: 300, damping: 22 });
  };

  // The tray opens as a quick ripple along its stickers.
  React.useEffect(() => {
    if (reduce) {
      fade.jump(hidden ? 0 : 1);
      rise.jump(0);
      return;
    }
    const delay = hidden ? 0 : order * 0.012;
    const a = animate(fade, hidden ? 0 : 1, { duration: 0.2, delay });
    const b = animate(rise, hidden ? 20 : 0, { type: "spring", stiffness: 320, damping: 30, delay });
    return () => {
      a.stop();
      b.stop();
    };
  }, [hidden, order, reduce, fade, rise]);

  React.useEffect(() => {
    zv.set(z);
  }, [z, zv]);

  return (
    <motion.button
      type="button"
      aria-label={label}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onKeyDown={onKey}
      onDoubleClick={interactive ? onDouble : undefined}
      onDragStart={(e) => e.preventDefault()}
      onFocus={(e) => {
        if (!home.placed && e.currentTarget.matches(":focus-visible")) onKeyed(true);
      }}
      onBlur={() => onKeyed(false)}
      className="absolute left-0 top-0 cursor-grab rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-text)] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:cursor-grabbing"
      style={{
        width: S,
        height: S,
        x,
        y,
        rotate,
        scaleX,
        scaleY,
        opacity: fade,
        zIndex: lifted ? 5000 : zIndex,
        touchAction: "none",
        pointerEvents: interactive ? "auto" : "none",
        willChange: "transform",
      }}
    >
      <svg viewBox="0 0 100 100" width={S} height={S} className="pointer-events-none relative overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={`${sid}-cm`}>
            <path ref={mainClip} d="M-80 -80 H200 V200 H-80 Z" />
          </clipPath>
          <clipPath id={`${sid}-cf`}>
            <path ref={flapClip} d="M0 0" />
          </clipPath>
          <mask id={`${sid}-mk`} maskUnits="userSpaceOnUse" x={-15} y={-15} width={130} height={130}>
            <g filter={`url(#${uid}-silh)`}>{all}</g>
          </mask>
          {/* The sticker rises gently into the roll */}
          <linearGradient ref={liftGrad} id={`${sid}-lift`} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6c6c74" stopOpacity={0.26} />
            <stop offset="1" stopColor="#6c6c74" stopOpacity={0} />
          </linearGradient>
          {/* Light across the curved back of the paper */}
          <linearGradient ref={rollGrad} id={`${sid}-roll`} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#85858c" stopOpacity={0.5} />
            <stop offset="0.16" stopColor="#b4b4ba" stopOpacity={0.24} />
            <stop offset="0.46" stopColor="#ffffff" stopOpacity={0.75} />
            <stop offset="0.82" stopColor="#ffffff" stopOpacity={0.1} />
            <stop offset="1" stopColor="#c9c9cf" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${sid}-cm)`}>
          <g filter={`url(#${uid}-film)`}>{all}</g>
          {printShapes(def, uid)}
        </g>
        <g ref={flapWrap} display="none">
          <g clipPath={`url(#${sid}-cm)`}>
            <rect x={-30} y={-30} width={160} height={160} fill={`url(#${sid}-lift)`} mask={`url(#${sid}-mk)`} />
          </g>
          <g ref={flapG}>
            <g clipPath={`url(#${sid}-cf)`}>
              <g filter={`url(#${uid}-back)`}>{all}</g>
              <rect x={-30} y={-30} width={260} height={260} fill={`url(#${sid}-roll)`} mask={`url(#${sid}-mk)`} />
            </g>
          </g>
        </g>
      </svg>
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* The notepad                                                                */
/* -------------------------------------------------------------------------- */

const LINE = 28;

const PAPERS = ["Lined", "Grid", "Dotted", "Plain"] as const;
type Paper = (typeof PAPERS)[number];

const paperPattern = (paper: Paper, step = LINE) => {
  const rule = `var(--sp-rule) ${step - 1}px ${step}px`;
  if (paper === "Lined") return { backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${step - 1}px, ${rule})` };
  if (paper === "Grid") return { backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${step - 1}px, ${rule}), repeating-linear-gradient(90deg, transparent 0 ${step - 1}px, ${rule})` };
  if (paper === "Dotted") return { backgroundImage: "radial-gradient(circle, var(--sp-dot) 1px, transparent 1.5px)", backgroundSize: `${step}px ${step}px` };
  return {};
};

const MONO = "ui-monospace,'SF Mono','Courier New',monospace";
const NOTES = ["Hover the tray to see each sticker up close", "Peel one off and carry it over the page", "Press it down anywhere you like"];

/** A page laid out like a printed journal, with room left for stickers. */
function Notepad({ x, y, paper, scale }: { x: number; y: number; paper: Paper; scale: number }) {
  const rule = "border-t border-dotted border-[var(--sp-soft)]";
  return (
    <div
      className="absolute overflow-hidden rounded-[6px] bg-[var(--sp-paper)] px-5 pt-4 text-[var(--sp-text)] transition-colors duration-300"
      style={{ left: x, top: y, width: PAPER_W, height: PAPER_H, transform: `scale(${scale})`, transformOrigin: "0 0", ...paperPattern(paper) }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] leading-5">1</span>
        <span className="text-[15px] leading-5">Stickers</span>
      </div>
      <p className="mt-2 text-[21px] leading-7 tracking-[-0.01em]">My sticker journal</p>

      <div className={cn(rule, "mt-3 flex gap-4 pt-3")}>
        <ol className="w-[104px] shrink-0 space-y-2 text-[7.5px] leading-[10px]" style={{ fontFamily: MONO }}>
          {NOTES.map((note, n) => (
            <li key={note}>
              <span className="font-bold">0{n + 1}</span> | {note}
            </li>
          ))}
        </ol>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <span className="h-[76px] rounded-[2px] border border-dotted border-[var(--sp-soft)]" />
          <span className="h-[76px] rounded-[2px] border border-dotted border-[var(--sp-soft)]" />
        </div>
      </div>

      <p className={cn(rule, "mt-3 pt-3 text-[8px] leading-[12px]")} style={{ fontFamily: MONO }}>
        This page is a small collection of things worth keeping, stick down what made today soft and let the rest go
      </p>

      <div className="relative mt-3 h-[104px]">
        <span className="absolute inset-y-0 left-1/2 border-l border-dotted border-[var(--sp-soft)]" />
        <span className="absolute left-1/2 top-[52px] ml-3 origin-left -translate-y-1/2 -rotate-90 whitespace-nowrap text-[11px]">( Keepsakes )</span>
      </div>

      <p className="absolute inset-x-5 bottom-4 text-[8px] leading-[12px]" style={{ fontFamily: MONO }}>
        Every sticker here is one of a kind, so choose slowly and leave some room to breathe
      </p>
    </div>
  );
}

/** Light liquid glass: a tinted see-through fill, a pale wash from the top and a bright inner edge. */
const GLASS =
  "bg-[image:linear-gradient(180deg,var(--sp-glass-top),transparent_72%)] shadow-[inset_0_1px_1px_var(--sp-glass-rim)] backdrop-blur-[3px]";
const NAV_BUTTON = `flex h-11 items-center justify-center rounded-full ${GLASS} bg-[var(--sp-button)] text-[var(--sp-text)] outline-none transition-colors duration-200 hover:bg-[var(--sp-button-2)] focus-visible:ring-2 focus-visible:ring-[var(--sp-text)] disabled:text-[var(--sp-off)] disabled:hover:bg-[var(--sp-button)]`;
const SEGMENT =
  "relative flex h-9 w-[52px] items-center justify-center rounded-full text-[var(--sp-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--sp-text)]";
const POP_ROW =
  "flex h-11 w-full items-center gap-3 rounded-[8px] px-2 text-left text-[13px] text-[var(--sp-text)] outline-none transition-colors duration-150 hover:bg-[var(--sp-glass)] focus-visible:bg-[var(--sp-glass)] aria-pressed:bg-[var(--sp-glass)]";

const THEMES = {
  light: {
    "--sp-surface": "#fcfcfc",
    "--sp-glass": "rgba(120, 120, 128, 0.14)",
    "--sp-paper": "#ffffff",
    "--sp-line": "#eaeaea",
    "--sp-rule": "#efefef",
    "--sp-dot": "#d9d9d9",
    "--sp-fill": "#f0f0f0",
    "--sp-button": "rgba(120, 120, 124, 0.12)",
    "--sp-button-2": "rgba(120, 120, 124, 0.18)",
    "--sp-solid": "rgba(120, 120, 124, 0.24)",
    "--sp-solid-2": "rgba(120, 120, 124, 0.3)",
    "--sp-thumb": "rgba(255, 255, 255, 0.72)",
    "--sp-glass-top": "rgba(255, 255, 255, 0.16)",
    "--sp-glass-rim": "rgba(255, 255, 255, 0.4)",
    "--sp-text": "#4a4a52",
    "--sp-soft": "#a4a4ac",
    "--sp-off": "#c9c9c9",
    "--sp-tip": "#0e1011",
    "--sp-on-tip": "#ffffff",
  },
  dark: {
    "--sp-surface": "#161618",
    "--sp-glass": "rgba(120, 120, 128, 0.26)",
    "--sp-paper": "#1f1f22",
    "--sp-line": "#2e2e32",
    "--sp-rule": "#2a2a2e",
    "--sp-dot": "#3a3a3f",
    "--sp-fill": "#2a2a2e",
    "--sp-button": "rgba(255, 255, 255, 0.08)",
    "--sp-button-2": "rgba(255, 255, 255, 0.13)",
    "--sp-solid": "rgba(255, 255, 255, 0.16)",
    "--sp-solid-2": "rgba(255, 255, 255, 0.21)",
    "--sp-thumb": "rgba(255, 255, 255, 0.16)",
    "--sp-glass-top": "rgba(255, 255, 255, 0.04)",
    "--sp-glass-rim": "rgba(255, 255, 255, 0.06)",
    "--sp-text": "#f2f2f2",
    "--sp-soft": "#8b8b90",
    "--sp-off": "#55555a",
    "--sp-tip": "#f2f2f2",
    "--sp-on-tip": "#0e1011",
  },
} as const;

/** A small menu that grows out of the button it belongs to. */
function PopMenu({ below, reduce, style, children }: { below?: boolean; reduce: boolean; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <motion.div
      data-sp-pop
      className="absolute w-[180px] rounded-[12px] bg-[var(--sp-glass)] p-1 backdrop-blur-[6px]"
      style={{ transformOrigin: below ? "50% 0%" : "50% 100%", ...style }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: below ? -6 : 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: below ? -6 : 6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* The scene                                                                  */
/* -------------------------------------------------------------------------- */

type ItemState = { placed: boolean; u: number; v: number; rot: number; z: number };

const INITIAL_ITEMS: ItemState[] = PIECES.map(() => ({ placed: false, u: 0.5, v: 0.5, rot: 0, z: 0 }));

/**
 * One notepad on a soft surface, with a tray of watercolour stickers above a bottom
 * nav. The middle button pops up the sticker collections, the top bar changes the
 * paper and switches between light and dark.
 * Hover along the tray, or slide a finger across it, and each sticker in turn grows
 * to full size and shows its name.
 * Press a sticker to curl its corner and peel it off, carry it over
 * the notepad and let go to press it down. Drop it anywhere else and it springs
 * back to the tray.
 *
 * Keyboard: Enter or Space on a tray sticker sticks it at the next free spot.
 * On the notepad, arrow keys nudge (Shift for bigger steps), `[` and `]`
 * rotate, and Delete or Backspace sends it back to the tray. Double-click does
 * the same.
 */
export function StickerPeel({ loop = false, onChange, className }: StickerPeelProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = `sp${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [upright, setUpright] = React.useState(false);
  const GEO = upright ? PORTRAIT : LANDSCAPE;
  const stageRef = React.useRef<HTMLDivElement>(null);

  const [view, setView] = React.useState({ scale: 1, ready: false });
  const [items, setItems] = React.useState<ItemState[]>(INITIAL_ITEMS);
  const [collection, setCollection] = React.useState(0);
  const [pop, setPop] = React.useState<"stickers" | "paper" | null>(null);
  const [paperKind, setPaperKind] = React.useState<Paper>("Plain");
  const [dark, setDark] = React.useState(false);
  const peekX = useMotionValue(0);
  const peek = useMotionValue(0);
  const [tip, setTip] = React.useState<number | null>(null);
  const [named, setNamed] = React.useState(0);
  const peekTimer = React.useRef(0);
  const [held, setHeld] = React.useState<Set<number>>(() => new Set());
  /** Whether a sticker is being carried, and whether it is over the bin. */
  const [carrying, setCarrying] = React.useState<"no" | "yes" | "over-bin">("no");
  const [status, setStatus] = React.useState("");

  const [rng] = React.useState(() => Math.random);
  const zRef = React.useRef(0);
  const apis = React.useRef<(ItemApi | null)[]>([]);

  // Scale the whole stage to the space it has.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const w = Math.max(1, host.clientWidth - 16);
      const h = Math.max(1, host.clientHeight - 16);
      const stand = !loop && h > w * 1.05;
      const stage = stand ? PORTRAIT : LANDSCAPE;
      setUpright(stand);
      // The gallery card crops the sides of its stage, so the loop stays narrower.
      const scale = clamp(Math.min(w / stage.W, h / stage.H), 0.2, loop ? 0.76 : 1.4);
      setView((v) => (Math.abs(v.scale - scale) < 0.002 && v.ready ? v : { scale, ready: true }));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [loop]);

  const toLogical = (cx: number, cy: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { x: cx, y: cy };
    const k = rect.width / GEO.W;
    return { x: (cx - rect.left) / k, y: (cy - rect.top) / k };
  };

  const { paper, placedScale } = GEO;
  /** The middle of the bin at the right of the bottom nav, where stickers get thrown away. */
  const BIN = { x: GEO.W / 2 + 96, y: GEO.navY + 22 };
  const edge = S * placedScale * 0.42;
  const marginU = edge / paper.w;
  const marginV = edge / paper.h;
  const onPaper = (x: number, y: number) => x > paper.x - 6 && x < paper.x + paper.w + 6 && y > paper.y - 6 && y < paper.y + paper.h + 6;
  const toUV = (x: number, y: number) => ({
    u: (clamp(x, paper.x + edge, paper.x + paper.w - edge) - paper.x) / paper.w,
    v: (clamp(y, paper.y + edge, paper.y + paper.h - edge) - paper.y) / paper.h,
  });

  /** A sticker's place in the tray: the row closes up around the ones that have been taken. */
  const slotOf = (i: number, list: ItemState[]): Home => {
    const left = list.flatMap((it, n) => (it.placed || PIECES[n].collection !== PIECES[i].collection ? [] : [n]));
    return { x: GEO.W / 2 + (left.indexOf(i) - (left.length - 1) / 2) * GEO.dockStep, y: GEO.dockY, rot: PIECES[i].rot, s: DOCK_S, placed: false };
  };
  const homeOf = (it: ItemState, i: number): Home =>
    it.placed ? { x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h, rot: it.rot, s: placedScale, placed: true } : slotOf(i, items);

  const peekTo = (to: number) => {
    if (reduce) peek.jump(to);
    else void animate(peek, to, PEEK_SPRING);
  };
  /** Look at the tray at this x: the nearest sticker grows and shows its name. */
  const peekAt = (x: number) => {
    window.clearTimeout(peekTimer.current);
    peekX.set(x);
    peekTo(1);
    let best = -1;
    let gap = Infinity;
    items.forEach((it, i) => {
      if (it.placed || PIECES[i].collection !== collection) return;
      const d = Math.abs(slotOf(i, items).x - x);
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    if (best >= 0) setNamed(best);
    setTip(best >= 0 ? best : null);
  };
  const peekEnd = () => {
    window.clearTimeout(peekTimer.current);
    peekTo(0);
    setTip(null);
  };

  const overBin = (x: number, y: number) => Math.hypot(x - BIN.x, y - BIN.y) < 48;

  const place = (i: number, u: number, v: number, rot: number, opts?: FlyOpts) => {
    peekEnd();
    zRef.current += 1;
    const z = Math.min(999, 10 + zRef.current);
    setItems((prev) => prev.map((it, k) => (k === i ? { placed: true, u, v, rot, z } : it)));
    const target: Home = { x: paper.x + u * paper.w, y: paper.y + v * paper.h, rot, s: placedScale, placed: true };
    void apis.current[i]?.flyTo(target, "slap", opts);
  };
  const sendBack = (i: number, opts?: FlyOpts) => {
    setCollection(PIECES[i].collection);
    const next = items.map((it, k) => (k === i ? { ...it, placed: false } : it));
    setItems(next);
    void apis.current[i]?.flyTo(slotOf(i, next), "home", opts);
  };
  const nextSpot = () => {
    const taken = items.filter((it) => it.placed).map((it) => ({ x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h }));
    for (const s of SPOTS) {
      const px = paper.x + s.u * paper.w;
      const py = paper.y + s.v * paper.h;
      if (taken.every((t) => Math.hypot(t.x - px, t.y - py) > 84)) return s;
    }
    const n = taken.length;
    const base = SPOTS[n % SPOTS.length];
    return { u: clamp(base.u + 0.04 * Math.floor(n / SPOTS.length), 0.1, 0.9), v: clamp(base.v + 0.04 * Math.floor(n / SPOTS.length), 0.1, 0.9), rot: -base.rot };
  };

  /** Stick a random sticker from the open collection. */
  const surprise = () => {
    const left = items.flatMap((it, i) => (it.placed || PIECES[i].collection !== collection ? [] : [i]));
    if (left.length === 0) return;
    const i = left[Math.floor(rng() * left.length)];
    const s = nextSpot();
    place(i, s.u, s.v, s.rot, { peel: true, flight: 560 });
    setStatus(`${PIECES[i].def.label} stuck on the notepad`);
  };

  const clear = () => {
    let n = 0;
    const next = items.map((it) => ({ ...it, placed: false }));
    items.forEach((it, i) => {
      if (!it.placed) return;
      void apis.current[i]?.flyTo(slotOf(i, next), "home", { peel: true, flight: 520, delay: n * 70 });
      n += 1;
    });
    setItems(next);
    setStatus("All stickers are back in the tray");
  };

  const throwAway = (i: number) => {
    setCollection(PIECES[i].collection);
    const next = items.map((it, k) => (k === i ? { ...it, placed: false } : it));
    setItems(next);
    void apis.current[i]?.throwAway(BIN, slotOf(i, next));
    setStatus(`${PIECES[i].def.label} thrown away`);
  };

  const onDrop = (i: number, moved: boolean, x: number, y: number) => {
    const it = items[i];
    setCarrying("no");
    if (overBin(x, y)) {
      throwAway(i);
      return;
    }
    if (onPaper(x, y)) {
      if (it.placed && !moved) {
        place(i, it.u, it.v, it.rot);
        return;
      }
      const { u, v } = toUV(x, y);
      place(i, u, v, (rng() * 2 - 1) * 12);
      setStatus(`${PIECES[i].def.label} stuck on the notepad`);
    } else {
      sendBack(i);
      setStatus(`${PIECES[i].def.label} is back in the tray`);
    }
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    const it = items[i];
    const k = e.key;
    if (!it.placed) {
      if (k === "Enter" || k === " ") {
        e.preventDefault();
        const s = nextSpot();
        place(i, s.u, s.v, s.rot, { peel: true, flight: 560 });
        setStatus(`${PIECES[i].def.label} stuck on the notepad`);
      }
      return;
    }
    if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      sendBack(i, { peel: true, flight: 520 });
      setStatus(`${PIECES[i].def.label} is back in the tray`);
      return;
    }
    const step = e.shiftKey ? 36 : 8;
    let du = 0;
    let dv = 0;
    if (k === "ArrowLeft") du = -step / paper.w;
    else if (k === "ArrowRight") du = step / paper.w;
    else if (k === "ArrowUp") dv = -step / paper.h;
    else if (k === "ArrowDown") dv = step / paper.h;
    if (du || dv) {
      e.preventDefault();
      setItems((prev) =>
        prev.map((p, n) => (n === i ? { ...p, u: clamp(p.u + du, marginU, 1 - marginU), v: clamp(p.v + dv, marginV, 1 - marginV) } : p)),
      );
      return;
    }
    if (k === "[" || k === "]") {
      e.preventDefault();
      const d = (k === "]" ? 1 : -1) * (e.shiftKey ? 15 : 6);
      setItems((prev) => prev.map((p, n) => (n === i ? { ...p, rot: p.rot + d } : p)));
    }
  };

  // Tell the host what is stuck where.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });
  const firstChange = React.useRef(true);
  React.useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    onChangeRef.current?.(
      items.flatMap((it, i) => (it.placed ? [{ id: PIECES[i].id, label: PIECES[i].def.label, x: it.u, y: it.v, rotation: it.rot }] : [])),
    );
  }, [items]);

  // The hands-free demo.
  const demo = React.useRef({ place, sendBack });
  React.useEffect(() => {
    demo.current = { place, sendBack };
  });
  React.useEffect(() => {
    if (!loop || !view.ready) return;
    let dead = false;
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) => {
      timers.push(
        window.setTimeout(() => {
          if (!dead) fn();
        }, ms),
      );
    };
    const cycle = () => {
      let t = 700;
      for (const [idx, spot] of DEMO) {
        const s = SPOTS[spot];
        at(() => demo.current.place(idx, s.u, s.v, s.rot, { peel: true, flight: 620 }), t);
        t += 1250;
      }
      t += 2600;
      for (const [idx] of [...DEMO].reverse()) {
        at(() => demo.current.sendBack(idx, { peel: true, flight: 520 }), t);
        t += 380;
      }
      t += 1800;
      at(cycle, t);
    };
    cycle();
    return () => {
      dead = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [loop, view.ready]);

  const interactive = !loop;
  const { surface, navY, dockY, barY } = GEO;
  const anyPlaced = items.some((it) => it.placed);
  const trayLeft = items.some((it, i) => !it.placed && PIECES[i].collection === collection);

  const onHover = (e: React.PointerEvent) => {
    if (!interactive || pop || e.pointerType === "touch" || held.size > 0) return;
    const p = toLogical(e.clientX, e.clientY);
    if (p.y > dockY - 64 && p.y < dockY + 34 && p.x > surface.x && p.x < surface.x + surface.w) peekAt(p.x);
    else if (tip !== null) peekEnd();
  };

  return (
    <div
      ref={hostRef}
      className={cn("relative flex h-full min-h-[260px] w-full select-none items-center justify-center overflow-hidden", className)}
      onPointerMove={onHover}
      onPointerLeave={peekEnd}
      onPointerDown={(e) => {
        if (pop && !(e.target as Element).closest("[data-sp-pop]")) setPop(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setPop(null);
      }}
    >
      <SharedFilters uid={uid} />
      <div
        ref={stageRef}
        className="relative shrink-0"
        style={{
          width: GEO.W,
          height: GEO.H,
          transform: `scale(${view.scale})`,
          transformOrigin: "50% 50%",
          visibility: view.ready ? "visible" : "hidden",
          ...THEMES[dark ? "dark" : "light"],
        }}
      >
        <span className="sr-only" aria-live="polite">
          {status}
        </span>

        <div
          className="absolute overflow-hidden rounded-[16px] bg-[var(--sp-surface)] transition-colors duration-300"
          style={{ left: surface.x, top: surface.y, width: surface.w, height: surface.h }}
        >
          <Notepad x={paper.x - surface.x} y={paper.y - surface.y} paper={paperKind} scale={GEO.pageScale} />
        </div>

        {/* Top bar */}
        <div
          data-sp-pop
          className={cn("absolute flex h-11 rounded-full p-1 transition-colors duration-300", GLASS, "bg-[var(--sp-button)]")}
          style={{ left: GEO.W / 2 - 54, top: barY, zIndex: 2000 }}
        >
          <motion.span
            className="absolute left-1 top-1 h-9 w-[52px] rounded-full bg-[var(--sp-thumb)]"
            initial={false}
            animate={{ x: pop === "paper" ? 52 : 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
          />
          <button type="button" aria-label="Sticker page" aria-pressed={pop !== "paper"} onClick={() => setPop(null)} disabled={loop} className={SEGMENT}>
            <Folder className="size-4" fill="currentColor" strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Paper"
            aria-pressed={pop === "paper"}
            onClick={() => setPop(pop === "paper" ? null : "paper")}
            disabled={loop}
            className={SEGMENT}
          >
            <File className="size-4" fill="currentColor" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          aria-label="Back to the homepage"
          onClick={() => {
            // Self-contained on purpose, so it carries no router dependency.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = "/";
          }}
          disabled={loop}
          className={cn(NAV_BUTTON, "absolute w-11 disabled:text-[var(--sp-text)]")}
          style={{ top: barY, left: surface.x + 16, zIndex: 2000 }}
        >
          <ArrowLeft className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setDark(!dark)}
          disabled={loop}
          className={cn(NAV_BUTTON, "absolute w-11 disabled:text-[var(--sp-text)]")}
          style={{ top: barY, right: GEO.W - surface.x - surface.w + 16, zIndex: 2000 }}
        >
          {dark ? <Sun className="size-[18px]" strokeWidth={2} aria-hidden="true" /> : <Moon className="size-[18px]" strokeWidth={2} aria-hidden="true" />}
        </button>

        {/* Bottom nav */}
        <div className="absolute inset-x-0 flex justify-center gap-2" style={{ top: navY, zIndex: 2000 }}>
          <button type="button" aria-label="Stick a random sticker" onClick={surprise} disabled={loop || !trayLeft} className={cn(NAV_BUTTON, "w-11")}>
            <Dices className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-sp-pop
            aria-label={`Sticker collections, ${COLLECTIONS[collection].name} selected`}
            aria-expanded={pop === "stickers"}
            onClick={() => setPop(pop === "stickers" ? null : "stickers")}
            disabled={loop}
            className={cn(
              NAV_BUTTON,
              "w-[132px] gap-1.5 bg-[var(--sp-solid)] text-[13px] hover:bg-[var(--sp-solid-2)] disabled:text-[var(--sp-text)] disabled:hover:bg-[var(--sp-solid)]",
            )}
          >
            <svg key={collection} viewBox="0 0 100 100" className="size-7 shrink-0 overflow-visible" aria-hidden="true">
              {printShapes(STICKERS.find((d) => d.id === COLLECTIONS[collection].cover) as StickerDef, uid)}
            </svg>
            {COLLECTIONS[collection].name}
          </button>
          <motion.button
            type="button"
            aria-label="Drag a sticker here to throw it away, or press to clear the notepad"
            onClick={clear}
            disabled={loop || !anyPlaced}
            animate={{ scale: carrying === "over-bin" ? 1.28 : carrying === "yes" ? 1.08 : 1 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 22 }}
            className={cn(NAV_BUTTON, "w-11", carrying !== "no" && "disabled:text-[var(--sp-text)]", carrying === "over-bin" && "bg-[var(--sp-solid)] disabled:hover:bg-[var(--sp-solid)]")}
          >
            <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          </motion.button>
        </div>

        <AnimatePresence>
          {pop === "stickers" ? (
            <PopMenu key="stickers" reduce={reduce} style={{ left: GEO.W / 2 - 90, bottom: GEO.H - navY + 8, zIndex: 2100 }}>
              {COLLECTIONS.map((c, k) => (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={k === collection}
                  className={POP_ROW}
                  onClick={() => {
                    setCollection(k);
                    setPop(null);
                    setStatus(`${c.name} collection`);
                  }}
                >
                  <svg viewBox="0 0 100 100" className="size-8 shrink-0 overflow-visible" aria-hidden="true">
                    {printShapes(STICKERS.find((d) => d.id === c.cover) as StickerDef, uid)}
                  </svg>
                  {c.name}
                </button>
              ))}
            </PopMenu>
          ) : null}
          {pop === "paper" ? (
            <PopMenu key="paper" below reduce={reduce} style={{ left: GEO.W / 2 - 90, top: barY + 52, zIndex: 2100 }}>
              {PAPERS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={kind === paperKind}
                  className={POP_ROW}
                  onClick={() => {
                    setPaperKind(kind);
                    setPop(null);
                  }}
                >
                  <span className="size-8 shrink-0 rounded-[4px] bg-[var(--sp-paper)]" style={paperPattern(kind, 8)} aria-hidden="true" />
                  {kind}
                </button>
              ))}
            </PopMenu>
          ) : null}
        </AnimatePresence>

        {/* The name of the sticker being looked at */}
        <motion.div
          className="pointer-events-none absolute left-0"
          initial={false}
          animate={{ x: homeOf(items[named], named).x, opacity: tip === null ? 0 : 1 }}
          transition={reduce ? { duration: 0 } : { x: { type: "spring", stiffness: 420, damping: 36 }, opacity: { duration: 0.14 } }}
          style={{ top: dockY - 116, zIndex: 4000 }}
        >
          <span aria-hidden="true" className="block -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-[var(--sp-tip)] px-2 py-1 text-[12px] leading-4 text-[var(--sp-on-tip)]">
            {PIECES[named].def.label}
          </span>
        </motion.div>

        {PIECES.map(({ def, id, collection: own, order }, i) => {
          const it = items[i];
          const hidden = !it.placed && !held.has(i) && own !== collection;
          const label = it.placed
            ? `${def.label} sticker on the notepad. Arrow keys move it, brackets rotate it, Delete returns it to the tray, or drag it to the bin to throw it away.`
            : `${def.label} sticker in the tray. Press Enter to stick it on the notepad, or drag it there.`;
          return (
            <StickerItem
              key={id}
              def={def}
              uid={uid}
              home={homeOf(it, i)}
              z={it.placed ? it.z : 1000}
              interactive={interactive && !hidden}
              hidden={hidden}
              order={order}
              peekX={peekX}
              peek={peek}
              reduce={reduce}
              label={label}
              bounds={{ W: GEO.W, H: GEO.H }}
              placedScale={placedScale}
              apiRef={(api) => {
                apis.current[i] = api;
              }}
              toLogical={toLogical}
              onDrop={(moved, x, y) => onDrop(i, moved, x, y)}
              onCarry={(x, y) => setCarrying(overBin(x, y) ? "over-bin" : "yes")}
              onLift={peekEnd}
              onScrub={peekAt}
              onScrubEnd={() => {
                // A finger lifted: leave the name up for a moment.
                peekTimer.current = window.setTimeout(peekEnd, 900);
              }}
              onKeyed={(on) => {
                if (on) peekAt(homeOf(it, i).x);
                else peekEnd();
              }}
              onHeld={(h) =>
                setHeld((prev) => {
                  if (prev.has(i) === h) return prev;
                  const next = new Set(prev);
                  if (h) next.add(i);
                  else next.delete(i);
                  return next;
                })
              }
              onRaise={() => {
                if (!it.placed) return;
                zRef.current += 1;
                const z = Math.min(999, 10 + zRef.current);
                setItems((prev) => prev.map((p, k) => (k === i ? { ...p, z } : p)));
              }}
              onKey={(e) => onKey(i, e)}
              onDouble={() => {
                if (it.placed) {
                  sendBack(i, { peel: true, flight: 520 });
                  setStatus(`${def.label} is back in the tray`);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
