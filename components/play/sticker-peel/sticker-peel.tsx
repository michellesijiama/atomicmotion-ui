"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import {
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
import { Heart, PenLine, RotateCcw, Smile, Star, Sticker, Undo2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

/** Rounded so server and browser print identical numbers. */
const r2 = (n: number) => Math.round(n * 100) / 100;

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One sticker stuck on the journal page, with its position as a fraction of the page. */
export type StickerPeelPlacement = {
  id: string;
  label: string;
  /** Horizontal centre, 0 (left edge of the spread) to 1 (right edge). */
  x: number;
  /** Vertical centre, 0 (top of the pages) to 1 (bottom). */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
};

export type StickerPeelProps = {
  /** Plays a hands-free demo for the gallery card: stickers peel out of the in-app sticker panel one by one,
   *  get slapped onto the journal, hold, then peel back and repeat. Pointer input is
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
const S = 84;
/** Scale of a sticker sitting in the panel's grid, in the hand, and stuck on the page. */
const PANEL_S = 1.05;
const CARRY_S = 1.45;
const PLACED_S = 1.3;

type Rect = { x: number; y: number; w: number; h: number };

type Geometry = {
  W: number;
  H: number;
  ipad: Rect;
  /** The iPad's glass, toolbar included. */
  glass: Rect;
  /** The part of the glass the journal lives in (everything but the toolbar and an open panel). */
  area: Rect;
  /** The journal pages themselves, scaled to fit the area: where stickers can be stuck. */
  paper: Rect;
  /** How much the 676 x 450 journal is scaled to fit. */
  jScale: number;
  /** Height of the journal in its own units (it stretches to fill the glass). */
  jH: number;
  /** The sticker panel, docked on the right of the glass. */
  panel: Rect;
  slots: { x: number; y: number }[];
};

/** The journal spread is drawn 676 units wide; its height stretches to fill the glass. */
const J_W = 676;
const J_H_MIN = 450;
const TOOLBAR = 26;
const PANEL_W = 200;
const MARGIN = 14;

function geometry(open: boolean): Geometry {
  const ipad = { x: 10, y: 10, w: 900, h: 640 };
  const glass = { x: ipad.x + 22, y: ipad.y + 22, w: 856, h: 596 };
  const area = { x: glass.x, y: glass.y + TOOLBAR, w: glass.w - (open ? PANEL_W : 0), h: glass.h - TOOLBAR };
  // Fit the spread to the area's width, then give the pages as much height as the area has.
  let jScale = (area.w - 2 * MARGIN) / J_W;
  let jH = (area.h - 2 * MARGIN) / jScale;
  if (jH < J_H_MIN) {
    jH = J_H_MIN;
    jScale = (area.h - 2 * MARGIN) / J_H_MIN;
  }
  const paper = { x: area.x + (area.w - J_W * jScale) / 2, y: area.y + MARGIN, w: J_W * jScale, h: jH * jScale };
  const panel = { x: glass.x + glass.w - PANEL_W, y: glass.y + TOOLBAR, w: PANEL_W, h: glass.h - TOOLBAR };
  // A closed panel slides off the glass; its stickers slide with it.
  const dx = open ? 0 : PANEL_W + 30;
  const rowPitch = (panel.h - 64 - 52 - 16) / 4;
  const slots = Array.from({ length: 8 }, (_, i) => ({
    x: panel.x + (i % 2 === 0 ? 52 : 148) + dx,
    y: panel.y + 64 + 8 + rowPitch * (Math.floor(i / 2) + 0.5),
  }));
  return { W: 920, H: 660, ipad, glass, area, paper, jScale, jH, panel, slots };
}

/** Pleasant places to stick things, as fractions of the journal, with a rotation. */
const SPOTS: { u: number; v: number; rot: number }[] = [
  { u: 0.17, v: 0.7, rot: -7 },
  { u: 0.4, v: 0.76, rot: 5 },
  { u: 0.64, v: 0.66, rot: -5 },
  { u: 0.86, v: 0.62, rot: 7 },
  { u: 0.78, v: 0.88, rot: -4 },
  { u: 0.2, v: 0.9, rot: 4 },
  { u: 0.52, v: 0.92, rot: -6 },
  { u: 0.9, v: 0.84, rot: 8 },
];

/** The autoplay order: [sticker index, spot index]. Five stickers, well spaced, no overlaps. */
const DEMO: [number, number][] = [
  [0, 1],
  [2, 0],
  [1, 2],
  [4, 3],
  [6, 4],
];

const POS_SPRING = { stiffness: 700, damping: 42, mass: 0.7 };
const EASE_OUT = [0.2, 0.8, 0.25, 1] as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* -------------------------------------------------------------------------- */
/* Sticker artwork (original, 100 x 100 viewBox)                              */
/* -------------------------------------------------------------------------- */

/* ---- Painted "photos": no images, just gradients and shapes (viewBox 0 0 160 110) ---- */

const GLINTS = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 97 + ((i * i) % 31) * 3) % 160,
  y: (i * 61 + ((i * i * 7) % 23)) % 110,
  rx: 0.8 + (i % 4) * 0.7,
  o: 0.35 + (i % 5) * 0.14,
}));

/** Deep-blue sea, sparkling in the sun. */
function SeaPhoto({ uid }: { uid: string }) {
  return (
    <>
      <rect width={160} height={110} fill={`url(#${uid}-g-sea)`} />
      {GLINTS.map((g, i) => (
        <g key={i}>
          <circle cx={g.x} cy={g.y} r={g.rx * 1.7} fill="#cfe6ff" opacity={g.o * 0.16} />
          {i % 9 === 0 ? sparkle(g.x, g.y, g.rx * 1.9, i) : <circle cx={g.x} cy={g.y} r={g.rx * 0.45} fill="#fff" opacity={g.o} />}
        </g>
      ))}
    </>
  );
}

/** A green hill road under a cloudy sky, with a wind turbine. */
function HillPhoto({ uid }: { uid: string }) {
  return (
    <>
      <rect width={160} height={110} fill={`url(#${uid}-g-sky)`} />
      <ellipse cx={30} cy={22} rx={34} ry={10} fill="#fff" opacity={0.75} />
      <ellipse cx={118} cy={16} rx={40} ry={11} fill="#e3e8ee" opacity={0.9} />
      <ellipse cx={92} cy={34} rx={30} ry={8} fill="#fff" opacity={0.55} />
      <line x1={38} y1={32} x2={38} y2={72} stroke="#f7f7f7" strokeWidth={2.2} />
      {[-90, 30, 150].map((a) => (
        <line key={a} x1={38} y1={32} x2={r2(38 + 20 * Math.cos((a * Math.PI) / 180))} y2={r2(32 + 20 * Math.sin((a * Math.PI) / 180))} stroke="#fafafa" strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <path d="M0 70 Q40 52 90 64 T160 60 V110 H0 Z" fill="#88a283" />
      <path d="M0 80 Q50 66 110 76 T160 74 V110 H0 Z" fill="#a5b895" />
      <path d="M60 110 Q72 90 100 80 Q112 77 122 76 L138 78 Q108 88 100 110 Z" fill="#b2aaa6" />
      <path d="M72 110 Q82 92 104 84" fill="none" stroke="#b9bab5" strokeWidth={1.4} />
      <path d="M10 100 L60 86" stroke="#6b5a3c" strokeWidth={1.2} strokeDasharray="1.5 4" />
    </>
  );
}

const sparkle = (x: number, y: number, r: number, key: number) => (
  <path key={key} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`} fill="#fff" />
);

/** The restrained washi palette. */
const C = {
  blush: "#F5D5DE",
  dusty: "#E3A1B5",
  rose: "#C9607E",
  wine: "#8C2F4E",
  blue: "#BCD4EA",
  sky: "#E2ECF6",
  cream: "#F7F0E4",
  porcelain: "#FBFAF7",
  sage: "#B9C4B0",
  ink: "#5B3A47",
};
const PLUM = C.ink;
const SW = 1;

/** One wash of watercolour: a filled shape, with an optional deeper glaze pooled on its lower side. */
type Part = { d: string; c: string; g?: string; line?: boolean };

type StickerDef = {
  id: string;
  label: string;
  /** The largest x + y the artwork (and its frosted margin) reaches. The paper curl starts here. */
  maxSum: number;
  /** Pigment layer: soft, bled, a little off-register. */
  parts: Part[];
  /** Extra pen work: details, hatching and sparkles. Each part also gets its own outline. */
  ink: React.ReactNode;
};

const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const scallop = (x1: number, x2: number, y: number, n: number, depth: number) => {
  const w = (x2 - x1) / n;
  let d = `M${x1} ${y}`;
  for (let i = 0; i < n; i += 1) d += `Q${(x1 + w * (i + 0.5)).toFixed(1)} ${y + depth * 2} ${(x1 + w * (i + 1)).toFixed(1)} ${y}`;
  return d;
};
/** A closed ruffle band: straight top edge, scalloped bottom edge. */
const ruffle = (x1: number, x2: number, top: number, n: number, depth: number, hem: number) =>
  `M${x1} ${top}H${x2}V${hem}${scallop(x2, x1, hem, n, depth).replace(/^M\S+ \S+/, "")}Z`;

const leaf = (x: number, y: number, deg: number, len: number) => {
  const a = (deg * Math.PI) / 180;
  const pt = (px: number, py: number) => `${(x + px * Math.cos(a) - py * Math.sin(a)).toFixed(1)} ${(y + px * Math.sin(a) + py * Math.cos(a)).toFixed(1)}`;
  return {
    part: { d: `M${pt(0, 0)}Q${pt(len * 0.5, -len * 0.32)} ${pt(len, 0)}Q${pt(len * 0.5, len * 0.32)} ${pt(0, 0)}Z`, c: C.sage } as Part,
    vein: `M${pt(len * 0.08, 0)}L${pt(len * 0.85, 0)}`,
  };
};

/** A bow as wash parts: two loops, two tails and a knot. */
const bow = (x: number, y: number, s: number, c: string): Part[] => [
  { d: `M${x} ${y}C${x - 10 * s} ${y - 14 * s} ${x - 24 * s} ${y - 8 * s} ${x - 22 * s} ${y + 4 * s}C${x - 20 * s} ${y + 14 * s} ${x - 8 * s} ${y + 8 * s} ${x} ${y}Z`, c },
  { d: `M${x} ${y}C${x + 10 * s} ${y - 14 * s} ${x + 24 * s} ${y - 8 * s} ${x + 22 * s} ${y + 4 * s}C${x + 20 * s} ${y + 14 * s} ${x + 8 * s} ${y + 8 * s} ${x} ${y}Z`, c },
  { d: `M${x - 1} ${y + 1}L${x - 9 * s} ${y + 17 * s}L${x - 4 * s} ${y + 14 * s}L${x + 1} ${y + 3}Z`, c },
  { d: `M${x + 1} ${y + 1}L${x + 9 * s} ${y + 17 * s}L${x + 4 * s} ${y + 14 * s}L${x - 1} ${y + 3}Z`, c },
  { d: circ(x, y, 2.6 * s), c },
];

/** Pen lines for a small rose seen from above. */
const roseInk = (x: number, y: number, r: number, key: string) => (
  <g key={key} fill="none" stroke={PLUM} strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={`M${x - r * 0.15} ${y + r * 0.05}Q${x - r * 0.1} ${y - r * 0.45} ${x + r * 0.4} ${y - r * 0.2}Q${x + r * 0.55} ${y + r * 0.3} ${x} ${y + r * 0.5}`} />
    <path d={`M${x - r * 0.7} ${y - r * 0.1}Q${x - r * 0.6} ${y + r * 0.6} ${x + r * 0.1} ${y + r * 0.75}`} />
  </g>
);

/** A tiny drawn four-point sparkle. */
const sp4 = (x: number, y: number, r: number, key: string) => (
  <path
    key={key}
    d={`M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`}
    fill="none"
    stroke={PLUM}
    strokeWidth={0.9}
    strokeLinejoin="round"
  />
);

const pen = { fill: "none", stroke: PLUM, strokeWidth: 0.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const hatch = (x: number, y: number, n: number, dx: number, len: number) =>
  Array.from({ length: n }, (_, i) => `M${x + i * dx} ${y}l${len * 0.5} ${len}`).join("");

const roseLeaf = (x: number, y: number, deg: number, len: number) => leaf(x, y, deg, len);

const STICKERS: StickerDef[] = (() => {
  const l1 = roseLeaf(40, 66, 150, 9);
  const l2 = roseLeaf(60, 70, 30, 9);
  const teacup: StickerDef = {
    id: "teacup",
    label: "Rose teacup",
    maxSum: 178,
    parts: [
      { d: ell(50, 82, 35, 7), c: C.cream, g: C.blush },
      { d: "M76 48Q94 46 91 61Q88 74 72 70L73 64Q83 65 84 61Q85 56 76 57Z", c: C.blush },
      { d: "M23 42H77Q77 72 50 78Q23 72 23 42Z", c: C.sky, g: C.blue },
      { d: ell(50, 42, 27, 5.5), c: C.dusty },
      { d: circ(34, 60, 5.6), c: C.dusty, g: C.rose },
      { d: circ(53, 66, 5), c: C.rose },
      { d: circ(66, 58, 4.6), c: C.dusty, g: C.rose },
      l1.part,
      l2.part,
      { d: "M56 28q-5-4-2-8q3-4 8-1q5-3 8 1q3 4-2 8l-6 6z", c: C.blush },
    ],
    ink: (
      <g {...pen}>
        <path d={ell(50, 82, 24, 3.4)} strokeWidth={0.6} />
        <path d="M26 46Q50 52 74 46" strokeWidth={0.7} />
        <path d={hatch(62, 56, 4, 3, 7)} strokeWidth={0.6} />
        <path d="M40 36q-5-6 0-11q5-5 0-10M50 34q-4-5 0-9" strokeWidth={0.8} />
        <path d={l1.vein + l2.vein} strokeWidth={0.6} />
        {roseInk(34, 60, 5.6, "r1")}
        {roseInk(53, 66, 5, "r2")}
        {roseInk(66, 58, 4.6, "r3")}
        {[22, 78].map((x) => (
          <circle key={x} cx={x} cy={82} r={0.9} fill={C.blue} />
        ))}
        {sp4(86, 26, 5, "s1")}
        {sp4(14, 40, 4, "s2")}
      </g>
    ),
  };

  const laptop: StickerDef = {
    id: "laptop",
    label: "Lace laptop",
    maxSum: 176,
    parts: [
      { d: "M16 18H80Q84 18 84 22V62Q84 66 80 66H20Q16 66 16 62V22Q16 18 20 18Z", c: C.cream },
      { d: "M21 23H79V61H21Z", c: C.sky, g: C.blue },
      { d: "M24 26h11v11H24z", c: C.blush },
      { d: "M66 28h10v10H66z", c: C.cream },
      { d: "M10 67H90L85 77Q84 79 81 79H19Q16 79 15 77Z", c: C.dusty, g: C.rose },
      { d: ruffle(16, 84, 78, 9, 3, 80), c: C.cream },
      { d: circ(36, 47, 3), c: C.dusty },
      { d: circ(64, 47, 3), c: C.dusty },
      ...bow(17, 19, 0.5, C.rose),
    ],
    ink: (
      <g {...pen}>
        <path d="M43 42q0-3 3-3M54 39q3 0 3 3" strokeWidth={1} />
        <path d="M45 50Q50 55 55 50" strokeWidth={1} />
        <path d="M24 70h60" strokeDasharray="0.1 3.2" strokeWidth={1.2} />
        <path d="M42 74h16" strokeWidth={0.7} />
        <path d="M26 33h8M26 30h6M68 33h6" strokeWidth={0.5} />
        {sp4(90, 12, 5, "s1")}
        {sp4(9, 34, 4, "s2")}
      </g>
    ),
  };

  const cat: StickerDef = {
    id: "cat",
    label: "Sleepy cat",
    maxSum: 178,
    parts: [
      { d: "M10 72Q12 64 50 64Q88 64 90 72Q92 86 50 88Q8 86 10 72Z", c: C.dusty, g: C.rose },
      { d: "M80 70Q98 66 93 50Q91 44 83 47Q88 52 88 58Q86 64 78 66Z", c: C.cream },
      { d: ell(54, 60, 29, 18), c: C.cream, g: C.blush },
      { d: ell(31, 55, 15, 13), c: C.cream, g: C.blush },
      { d: "M20 48L18 33L30 41Z", c: C.blush },
      { d: "M40 44L46 31L51 46Z", c: C.blush },
      { d: circ(22, 60, 2.8), c: C.dusty },
      { d: circ(41, 60, 2.8), c: C.dusty },
      ...bow(38, 66, 0.45, C.rose),
    ],
    ink: (
      <g {...pen}>
        <path d={scallop(12, 88, 86, 8, 3)} strokeWidth={0.7} />
        <path d="M60 46Q66 56 62 70M72 48Q77 57 75 68" strokeWidth={0.7} />
        <path d="M24 54q3 3 6 0M37 54q3 3 6 0" strokeWidth={1} />
        <path d="M32 59.5q1.5 1.5 3 0" strokeWidth={0.8} />
        <path d="M14 57l-8-2M14 60l-8 2M48 57l8-2M48 60l8 2" strokeWidth={0.6} />
        <text x={60} y={30} fontSize={9} fill={PLUM} stroke="none" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>z</text>
        <text x={69} y={21} fontSize={6.5} fill={PLUM} stroke="none" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>z</text>
        {sp4(14, 24, 5, "s1")}
        {sp4(86, 32, 4, "s2")}
      </g>
    ),
  };

  const clock: StickerDef = {
    id: "clock",
    label: "Ribbon alarm clock",
    maxSum: 176,
    parts: [
      { d: circ(26, 25, 10), c: C.rose },
      { d: circ(74, 25, 10), c: C.rose },
      { d: circ(50, 57, 31), c: C.dusty, g: C.rose },
      { d: circ(50, 57, 24), c: C.cream },
      ...bow(50, 14, 0.55, C.blue),
    ],
    ink: (
      <g {...pen}>
        <path d="M32 84L27 93M68 84L73 93" strokeWidth={2.4} />
        <path d="M18 22q8-6 16 0M66 22q8-6 16 0" strokeWidth={0.6} />
        <path d={circ(50, 57, 27.5)} strokeDasharray="1 2.2" strokeWidth={0.6} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return <path key={i} d={`M${r2(50 + 20.5 * Math.sin(a))} ${r2(57 - 20.5 * Math.cos(a))}L${r2(50 + 22.5 * Math.sin(a))} ${r2(57 - 22.5 * Math.cos(a))}`} strokeWidth={0.8} />;
        })}
        <path d="M50 57V41M50 57L60 63" strokeWidth={1.3} />
        <circle cx={50} cy={57} r={2} fill={C.rose} />
        {sp4(90, 52, 5, "s1")}
        {sp4(10, 56, 4, "s2")}
      </g>
    ),
  };

  const sl = [leaf(46, 62, -150, 11), leaf(54, 56, -30, 11), leaf(48, 76, 200, 9)];
  const pottedRose: StickerDef = {
    id: "rose",
    label: "Potted rose",
    maxSum: 176,
    parts: [
      { d: "M32 70H68L63 92Q62 94 60 94H40Q38 94 37 92Z", c: C.sky, g: C.blue },
      { d: "M29 62H71Q73 62 72 66L71 71H29L28 66Q27 62 29 62Z", c: C.blush },
      ...sl.map((s) => s.part),
      { d: circ(36, 34, 9), c: C.dusty, g: C.rose },
      { d: circ(62, 27, 10), c: C.rose },
      { d: circ(78, 48, 5), c: C.blush },
    ],
    ink: (
      <g {...pen}>
        <path d="M48 62Q40 50 37 42M52 62Q58 46 62 36M54 62Q70 58 77 52" strokeWidth={0.9} />
        <path d={sl.map((s) => s.vein).join("")} strokeWidth={0.6} />
        {roseInk(36, 34, 9, "r1")}
        {roseInk(62, 27, 10, "r2")}
        <path d="M76 46q2 2 4 0" strokeWidth={0.6} />
        {[40, 50, 60].map((x) => (
          <circle key={x} cx={x} cy={82} r={1.1} fill={C.dusty} strokeWidth={0.5} />
        ))}
        <path d="M31 66H69" strokeWidth={0.5} />
        {sp4(88, 20, 5, "s1")}
        {sp4(12, 28, 4, "s2")}
      </g>
    ),
  };

  const planner: StickerDef = {
    id: "planner",
    label: "Rose planner",
    maxSum: 184,
    parts: [
      { d: "M16 12H72Q75 12 75 15V84Q75 87 72 87H19Q16 87 16 84Z", c: C.cream },
      { d: "M16 12H75V26H16Z", c: C.blush, g: C.dusty },
      { d: "M80 26L88 24L93 70L85 72Z", c: C.sky },
      { d: "M80 26L88 24L88.8 31L80.8 33Z", c: C.dusty },
      { d: "M85 72L93 70L88 86Z", c: C.cream },
      { d: "M52 86V97L56 93L60 97V86Z", c: C.rose },
      { d: circ(56, 88, 5), c: C.dusty, g: C.rose },
    ],
    ink: (
      <g {...pen}>
        {[26, 38, 50, 62].map((x) => (
          <ellipse key={x} cx={x} cy={12} rx={2.2} ry={3} strokeWidth={0.8} fill={C.porcelain} />
        ))}
        <path d={scallop(16, 75, 26, 8, 2)} strokeWidth={0.7} />
        {[38, 52, 66].map((y, i) => (
          <g key={y}>
            <rect x={22} y={y - 4} width={8} height={8} rx={1.5} strokeWidth={0.8} />
            {i < 2 ? <path d={`M23.5 ${y}L26 ${y + 2.4}L29.5 ${y - 3}`} stroke={C.rose} strokeWidth={1.2} /> : null}
            <path d={`M35 ${y}H68`} strokeWidth={0.6} strokeDasharray={i < 2 ? undefined : "3 2.4"} />
          </g>
        ))}
        <path d="M86 86L88 90" strokeWidth={1.2} />
        {roseInk(56, 88, 5, "r1")}
        {sp4(10, 40, 4, "s1")}
        {sp4(90, 10, 5, "s2")}
      </g>
    ),
  };

  const toast: StickerDef = {
    id: "toast",
    label: "Jam toast plate",
    maxSum: 178,
    parts: [
      { d: ell(50, 85, 38, 9), c: C.sky, g: C.blue },
      { d: ell(50, 83, 29, 6), c: C.cream },
      { d: "M24 78V44Q11 42 13 29Q15 15 31 17Q41 9 53 13Q66 9 76 17Q91 16 89 31Q89 44 76 46V78Z", c: C.cream, g: C.dusty },
      { d: "M30 38Q28 28 42 28Q52 22 62 29Q76 28 72 40Q73 50 68 53Q66 60 62 53Q58 62 54 54Q48 60 45 52Q36 52 30 38Z", c: C.dusty, g: C.rose },
      { d: "M60 62h13v8H60z", c: C.cream },
      { d: circ(22, 86, 1.8), c: C.blue },
      { d: circ(78, 86, 1.8), c: C.blue },
    ],
    ink: (
      <g {...pen}>
        <path d="M30 76V42Q20 40 20 32Q22 24 33 25Q42 18 53 21Q64 18 71 25Q82 25 82 33Q82 41 71 43V76" strokeWidth={0.6} />
        {[[40, 62], [52, 68], [44, 72], [30, 56]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={0.7} fill={PLUM} />
        ))}
        <path d="M38 34Q42 31 48 32" strokeWidth={0.6} stroke={C.porcelain} />
        <path d={ell(50, 83, 29, 6)} strokeWidth={0.5} />
        {[[34, 86], [66, 86], [50, 90]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={1.3} fill={C.blue} strokeWidth={0.5} />
          </g>
        ))}
        {sp4(88, 62, 5, "s1")}
        {sp4(12, 66, 4, "s2")}
      </g>
    ),
  };

  const lampStem = "M46 52Q42 60 46 66Q40 72 44 80L40 86H60L56 80Q60 72 54 66Q58 60 54 52Z";
  const drops = [24, 40, 60, 76].map((x) => `M${x} 56q-3 5 0 9q3-4 0-9z`);
  const lamp: StickerDef = {
    id: "lamp",
    label: "Ruffle lamp",
    maxSum: 176,
    parts: [
      { d: ell(50, 89, 20, 5), c: C.sky },
      { d: lampStem, c: C.sky, g: C.blue },
      { d: "M30 16Q50 8 70 16L84 48H16Z", c: C.blush, g: C.dusty },
      { d: ruffle(14, 86, 46, 7, 5, 50), c: C.dusty, g: C.rose },
      { d: "M31 17Q50 24 69 17L72 26Q50 33 28 26Z", c: C.blue },
      ...bow(50, 30, 0.5, C.blue),
      ...drops.map((d) => ({ d, c: C.wine })),
      { d: circ(50, 70, 3.6), c: C.dusty },
    ],
    ink: (
      <g {...pen}>
        <path d="M36 20L28 46M50 22V46M64 20L72 46" strokeWidth={0.6} />
        {[24, 40, 60, 76].map((x) => (
          <path key={x} d={`M${x} 53v3`} strokeWidth={0.6} />
        ))}
        {roseInk(50, 70, 3.6, "r1")}
        {sp4(88, 22, 5.5, "s1")}
        {sp4(11, 32, 4.5, "s2")}
      </g>
    ),
  };
  return [teacup, laptop, cat, clock, pottedRose, planner, toast, lamp];
})();

/** The sticker's pigment layer, as plain shapes. */
const washShapes = (def: StickerDef) => def.parts.map((p, i) => <path key={i} d={p.d} fill={p.c} />);
/** Deeper glazes, faded in from the top of each shape by the shared glaze mask. */
const glazeShapes = (def: StickerDef, uid: string) =>
  def.parts.flatMap((p, i) => (p.g ? [<path key={i} d={p.d} fill={p.g} mask={`url(#${uid}-glaze)`} />] : []));
/** Pen outlines plus detail strokes. */
const inkShapes = (def: StickerDef) => (
  <>
    <g fill="none" stroke={PLUM} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {def.parts.map((p, i) => (p.line === false ? null : <path key={i} d={p.d} />))}
    </g>
    {def.ink}
  </>
);
/** Everything, unfiltered: what silhouettes, masks and shadows are cut from. */
const allShapes = (def: StickerDef) => (
  <>
    {washShapes(def)}
    {inkShapes(def)}
  </>
);

/** A CSS mask image in the shape of the sticker plus its margin, for the frosted-film layer. */
const marginMask = (def: StickerDef) => {
  const paths = def.parts.map((p) => `<path d='${p.d}'/>`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='#000' stroke='#000' stroke-width='5' stroke-linejoin='round'>${paths}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

/* -------------------------------------------------------------------------- */
/* Shared SVG filters                                                         */
/* -------------------------------------------------------------------------- */

/** A deterministic scatter of fine grains: white, pale pink, pale blue and champagne. */
const GLITTER = (() => {
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const colours = ["#ffffff", "#ffffff", "#ffd8e6", "#d4e8ff", "#fff1c9"];
  return Array.from({ length: 190 }, () => ({
    x: rnd() * 64,
    y: rnd() * 64,
    r: 0.28 + rnd() * 0.5,
    o: 0.4 + rnd() * 0.6,
    c: colours[Math.floor(rnd() * colours.length)],
  }));
})();

const TWINKLES: [number, number, number][] = [
  [28, 30, 3],
  [70, 42, 2.6],
  [52, 74, 2.8],
  [82, 20, 2.2],
  [20, 66, 2.2],
];
const twinkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}L${x + r * 0.26} ${y - r * 0.26}L${x + r} ${y}L${x + r * 0.26} ${y + r * 0.26}L${x} ${y + r}L${x - r * 0.26} ${y + r * 0.26}L${x - r} ${y}L${x - r * 0.26} ${y - r * 0.26}Z`;

const WASHI_CSS =
  "@keyframes sp-shim{0%{transform:translateX(0) skewX(-20deg)}55%,100%{transform:translateX(190px) skewX(-20deg)}}@keyframes sp-tw{0%,100%{opacity:.15}50%{opacity:.95}}.sp-shim{animation:sp-shim 5.2s ease-in-out infinite}.sp-tw{animation:sp-tw 2.8s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.sp-shim{animation:none}.sp-tw{animation:none;opacity:.6}}";

const FILTER_BOX = { x: -15, y: -15, width: 130, height: 130, filterUnits: "userSpaceOnUse" } as const;

/** Blur then threshold the artwork's alpha: a rounded silhouette a couple of units wider. */
const GROW = (
  <>
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
    <feComponentTransfer in="blur" result="grown">
      <feFuncA type="linear" slope="16" intercept="-1.6" />
    </feComponentTransfer>
  </>
);

function SharedFilters({ uid }: { uid: string }) {
  const tint = (id: string, color: string, opacity: number, blur: number) => (
    <filter id={`${uid}-${id}`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
      {GROW}
      <feFlood floodColor={color} floodOpacity={opacity} result="flood" />
      <feComposite in="flood" in2="grown" operator="in" result="fill" />
      {blur > 0 ? <feGaussianBlur in="fill" stdDeviation={blur} /> : null}
    </filter>
  );
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <style>{WASHI_CSS}</style>
      <defs>
        <linearGradient id={`${uid}-g-sea`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#4a6492" />
          <stop offset="0.55" stopColor="#8c92bd" />
          <stop offset="1" stopColor={C.dusty} />
        </linearGradient>
        <linearGradient id={`${uid}-g-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9c9d8" />
          <stop offset="1" stopColor={C.sky} />
        </linearGradient>
        <linearGradient id={`${uid}-g-turq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" stopColor="#7fb3cc" />
          <stop offset="0.7" stopColor="#bfe0dd" />
        </linearGradient>
        {/* Glazes fade in from the top of a shape, pooling pigment on its lower side. */}
        <linearGradient id={`${uid}-glaze-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id={`${uid}-glaze`} maskContentUnits="objectBoundingBox">
          <rect x={-0.1} y={-0.1} width={1.2} height={1.2} fill={`url(#${uid}-glaze-g)`} />
        </mask>
        {/* Fine iridescent glitter */}
        <pattern id={`${uid}-p-glit`} width="64" height="64" patternUnits="userSpaceOnUse">
          {GLITTER.map((g, i) => (
            <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.c} opacity={g.o} />
          ))}
        </pattern>
        <linearGradient id={`${uid}-g-shim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* Watercolour: bled, wobbling edges, granulation, pooled rim, soft bloom */}
        <filter id={`${uid}-wash`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="6" result="bleedN" />
          <feDisplacementMap in="SourceGraphic" in2="bleedN" scale="4" xChannelSelector="R" yChannelSelector="G" result="bled" />
          <feGaussianBlur in="bled" stdDeviation="0.7" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3" result="grainN" />
          <feColorMatrix in="grainN" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0.64" result="grainA" />
          <feComposite in="soft" in2="grainA" operator="in" result="grainy" />
          <feColorMatrix in="grainy" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="wash" />
          <feMorphology in="soft" operator="erode" radius="1.1" result="core" />
          <feComposite in="soft" in2="core" operator="out" result="rim" />
          <feGaussianBlur in="rim" stdDeviation="0.8" result="rimSoft" />
          <feFlood floodColor="#b25a76" floodOpacity="0.4" result="rimC" />
          <feComposite in="rimC" in2="rimSoft" operator="in" result="pool" />
          <feMerge>
            <feMergeNode in="wash" />
            <feMergeNode in="pool" />
          </feMerge>
        </filter>
        {/* Glazes are wetter: blurred and bleeding further */}
        <filter id={`${uid}-glazef`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="12" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="1.4" result="b" />
          <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.62 0" />
        </filter>
        {/* Pen: crisp, with a slight hand wobble */}
        <filter id={`${uid}-pen`} {...FILTER_BOX}>
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* The frosted film margin: pale, irregular, with a hairline rim */}
        <filter id={`${uid}-film`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="edgeN" />
          <feDisplacementMap in="grown" in2="edgeN" scale="2" xChannelSelector="R" yChannelSelector="G" result="wob" />
          <feFlood floodColor="#efe7ee" floodOpacity="0.3" result="frostFill" />
          <feComposite in="frostFill" in2="wob" operator="in" result="frost" />
          <feMorphology in="wob" operator="erode" radius="0.6" result="inner" />
          <feComposite in="wob" in2="inner" operator="out" result="edge" />
          <feFlood floodColor="#ffffff" floodOpacity="0.8" result="rimFill" />
          <feComposite in="rimFill" in2="edge" operator="in" result="rim" />
          <feMerge>
            <feMergeNode in="frost" />
            <feMergeNode in="rim" />
          </feMerge>
        </filter>
        {/* Long washi fibres, plus a few short ones */}
        <filter id={`${uid}-fibre`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="3" result="h" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06 0.8" numOctaves="2" seed="8" result="v" />
          <feColorMatrix in="h" type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.97  1.7 0 0 0 -0.8" result="ha" />
          <feColorMatrix in="v" type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.46  0 0 0 0 0.52  1.4 0 0 0 -0.72" result="va" />
          <feMerge>
            <feMergeNode in="ha" />
            <feMergeNode in="va" />
          </feMerge>
        </filter>
        {tint("silh", "#ffffff", 1, 0)}
        {tint("tight", "#3a2030", 0.9, 1.3)}
        {tint("soft", "#7a5a68", 0.9, 6.5)}
        {/* The back of the paper: pale, fibrous, with the ink faintly visible through it */}
        <filter id={`${uid}-back`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#fbf3f6" floodOpacity="0.66" result="paperFill" />
          <feComposite in="paperFill" in2="grown" operator="in" result="paper" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.26 0" result="through" />
          <feMerge>
            <feMergeNode in="paper" />
            <feMergeNode in="through" />
          </feMerge>
        </filter>
        {/* The glossy imprint a sticker leaves on the release sheet */}
        <filter id={`${uid}-ghost`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#ffffff" floodOpacity="0.2" result="tintFill" />
          <feComposite in="tintFill" in2="grown" operator="in" result="fill" />
          <feMorphology in="grown" operator="erode" radius="0.5" result="inner" />
          <feComposite in="grown" in2="inner" operator="out" result="edge" />
          <feFlood floodColor="#a98fa6" floodOpacity="0.3" result="tintEdge" />
          <feComposite in="tintEdge" in2="edge" operator="in" result="line" />
          <feMerge>
            <feMergeNode in="fill" />
            <feMergeNode in="line" />
          </feMerge>
        </filter>
        <filter id={`${uid}-bloom`} x="-30" y="-30" width="160" height="160" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id={`${uid}-fold`} x="-60" y="-60" width="220" height="220" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${uid}-flap`} {...FILTER_BOX}>
          <feDropShadow dx="-1" dy="-1.6" stdDeviation="2" floodColor="#3a2030" floodOpacity="0.3" />
        </filter>
      </defs>
    </svg>
  );
}

function Ghost({ def, uid, visible }: { def: StickerDef; uid: string; visible: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={S * PANEL_S}
      height={S * PANEL_S}
      aria-hidden="true"
      className="pointer-events-none absolute overflow-visible transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0, left: 0, top: 0 }}
    >
      <g filter={`url(#${uid}-ghost)`}>{allShapes(def)}</g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* One sticker                                                                */
/* -------------------------------------------------------------------------- */

type Home = { x: number; y: number; rot: number; s: number; placed: boolean };
type FlyOpts = { /** Curl the corner and wait for it before lifting. */ peel?: boolean; /** Arc flight in ms. 0 means a spring. */ flight?: number; delay?: number };
type ItemApi = { flyTo: (target: Home, kind: "slap" | "home", opts?: FlyOpts) => Promise<void> };

const homeKey = (h: Home) => `${h.placed ? 1 : 0}|${Math.round(h.x)}|${Math.round(h.y)}|${Math.round(h.rot)}`;

type StickerItemProps = {
  def: StickerDef;
  uid: string;
  home: Home;
  z: number;
  interactive: boolean;
  hidden: boolean;
  dof: boolean;
  reduce: boolean;
  label: string;
  bounds: { W: number; H: number };
  apiRef: React.Ref<ItemApi>;
  toLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onDrop: (moved: boolean, x: number, y: number) => void;
  onHeld: (held: boolean) => void;
  onRaise: () => void;
  onKey: (e: React.KeyboardEvent) => void;
  onDouble: () => void;
};

function StickerItem(props: StickerItemProps) {
  const { def, uid, home, z, interactive, hidden, dof, reduce, label, bounds, apiRef, toLogical, onDrop, onHeld, onRaise, onKey, onDouble } = props;
  const sid = `${uid}-${def.id}`;

  const rx = useMotionValue(home.x);
  const ry = useMotionValue(home.y);
  const sx = useSpring(rx, POS_SPRING);
  const sy = useSpring(ry, POS_SPRING);
  const rotBase = useMotionValue(home.rot);
  const sc = useMotionValue(home.s);
  const qx = useMotionValue(1);
  const qy = useMotionValue(1);
  const lift = useMotionValue(0);
  const curl = useMotionValue(0);
  const ringO = useMotionValue(0);
  const ringS = useMotionValue(1);
  const fade = useMotionValue(1);
  const shX = useMotionValue(0);
  const shY = useMotionValue(0);
  const shO = useMotionValue(0);

  const velocity = useVelocity(sx);
  const tiltTarget = useTransform(velocity, (v) => clamp(v * 0.02, -16, 16));
  const tilt = useSpring(tiltTarget, { stiffness: 260, damping: 16 });
  const x = useTransform(sx, (v) => v - S / 2);
  const y = useTransform(sy, (v) => v - S / 2);
  const rotate = useTransform([rotBase, tilt], (v: number[]) => v[0] + v[1]);
  const scaleX = useTransform([sc, qx], (v: number[]) => v[0] * v[1]);
  const scaleY = useTransform([sc, qy], (v: number[]) => v[0] * v[1]);
  const negRotate = useTransform(rotate, (r) => -r);
  const tightO = useTransform(lift, (l) => 0.14 + 0.1 * l);
  const castY = useTransform(lift, (l) => l * 9);
  const castS = useTransform(lift, (l) => 1 + l * 0.04);
  const castO = useTransform(lift, (l) => l * 0.2);

  const [lifted, setLifted] = React.useState(false);
  const all = React.useMemo(() => allShapes(def), [def]);
  const frostMask = React.useMemo(() => marginMask(def), [def]);
  const paintG = React.useRef<SVGGElement>(null);
  useMotionValueEvent(lift, "change", (v) => paintG.current?.setAttribute("opacity", (0.97 + 0.03 * v).toFixed(3)));

  const anims = React.useRef<AnimationPlaybackControls[]>([]);
  const timers = React.useRef<Set<number>>(new Set());
  const token = React.useRef(0);
  const busy = React.useRef(false);
  const handled = React.useRef(homeKey(home));
  const drag = React.useRef<null | {
    id: number;
    phase: "curl" | "drag";
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
  const foldLine = React.useRef<SVGPathElement>(null);
  const sheen = React.useRef<SVGRectElement>(null);

  const applyCurl = (v: number) => {
    const wrap = flapWrap.current;
    if (!wrap || !mainClip.current || !flapClip.current || !flapG.current || !foldLine.current) return;
    if (v < 0.012) {
      wrap.setAttribute("display", "none");
      foldLine.current.setAttribute("display", "none");
      mainClip.current.setAttribute("d", "M-80 -80 H200 V200 H-80 Z");
      return;
    }
    const D = def.maxSum + 8 - v * 50;
    wrap.setAttribute("display", "inline");
    foldLine.current.setAttribute("display", "inline");
    mainClip.current.setAttribute("d", `M-80 -80 L${D + 80} -80 L-80 ${D + 80} Z`);
    flapClip.current.setAttribute("d", `M${D + 80} -80 L-80 ${D + 80} L340 340 Z`);
    flapG.current.setAttribute("transform", `matrix(0 -1 -1 0 ${D} ${D})`);
    foldLine.current.setAttribute("d", `M${D + 57} -60 L-60 ${D + 57}`);
  };
  useMotionValueEvent(curl, "change", applyCurl);
  React.useLayoutEffect(() => {
    applyCurl(curl.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySheen = () => {
    sheen.current?.setAttribute("transform", `translate(${shX.get().toFixed(1)} ${shY.get().toFixed(1)})`);
  };
  useMotionValueEvent(shX, "change", applySheen);
  useMotionValueEvent(shY, "change", applySheen);

  /* ---- motion recipes ---- */
  const slap = (t: Home) => {
    play(lift, 0, { type: "spring", stiffness: 900, damping: 40 });
    play(curl, 0, { duration: 0.09, ease: "easeIn" });
    play(sc, t.s, { type: "spring", stiffness: 520, damping: 11 });
    qx.set(1.12);
    qy.set(0.84);
    play(qx, 1, { type: "spring", stiffness: 420, damping: 9 });
    play(qy, 1, { type: "spring", stiffness: 420, damping: 9 });
    play(rotBase, t.rot, { type: "spring", stiffness: 260, damping: 14 });
    play(shO, 0, { duration: 0.3 });
    ringO.set(0.6);
    ringS.set(0.7);
    play(ringS, 1.6, { duration: 0.45, ease: "easeOut" });
    play(ringO, 0, { duration: 0.45, ease: "easeOut" });
  };
  const settleHome = (t: Home) => {
    play(lift, 0, { type: "spring", stiffness: 300, damping: 28 });
    play(curl, 0, { duration: 0.22, ease: "easeOut" });
    play(sc, t.s, { type: "spring", stiffness: 380, damping: 16 });
    play(rotBase, t.rot, { type: "spring", stiffness: 260, damping: 18 });
    play(shO, 0, { duration: 0.3 });
    qx.set(1.04);
    qy.set(0.96);
    play(qx, 1, { type: "spring", stiffness: 380, damping: 12 });
    play(qy, 1, { type: "spring", stiffness: 380, damping: 12 });
  };
  const jumpTo = (t: Home) => {
    rx.jump(t.x);
    sx.jump(t.x);
    ry.jump(t.y);
    sy.jump(t.y);
    rotBase.jump(t.rot);
    sc.jump(t.s);
    lift.jump(0);
    curl.jump(0);
    qx.jump(1);
    qy.jump(1);
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
    };
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
      play(curl, 1, { duration: 0.24, ease: EASE_OUT });
      play(sc, home.s * 1.05, { duration: 0.24 });
      await wait(260);
      if (!live()) return;
    }
    play(lift, 1, { type: "spring", stiffness: 300, damping: 22 });
    play(sc, CARRY_S, { type: "spring", stiffness: 300, damping: 20 });
    play(curl, 0.3, { type: "spring", stiffness: 200, damping: 18 });
    const flight = o.flight ?? 0;
    if (flight > 0) {
      const x0 = rx.get();
      const y0 = ry.get();
      const peak = Math.min(y0, t.y) - 70 - Math.abs(t.x - x0) * 0.08;
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

  React.useImperativeHandle(apiRef, () => ({ flyTo }));

  // Home moved without a scripted flight (keyboard nudge, rotation): spring along.
  const key = homeKey(home);
  React.useEffect(() => {
    if (handled.current === key || drag.current) return;
    handled.current = key;
    token.current += 1;
    stopAnims();
    if (reduce) {
      jumpTo(home);
      return;
    }
    play(rx, home.x, { type: "spring", stiffness: 340, damping: 26 });
    play(ry, home.y, { type: "spring", stiffness: 340, damping: 26 });
    play(rotBase, home.rot, { type: "spring", stiffness: 300, damping: 20 });
    play(sc, home.s, { type: "spring", stiffness: 340, damping: 22 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /* ---- pointer ---- */
  const liftNow = () => {
    const d = drag.current;
    if (!d || d.phase === "drag") return;
    window.clearTimeout(d.timer);
    d.phase = "drag";
    onHeld(true);
    if (reduce) {
      lift.set(1);
      curl.set(0);
      sc.set(CARRY_S);
    } else {
      play(lift, 1, { type: "spring", stiffness: 280, damping: 20 });
      play(sc, CARRY_S, { type: "spring", stiffness: 300, damping: 16 });
      play(curl, 0.3, { type: "spring", stiffness: 180, damping: 14 });
    }
    play(shO, 0.8, { duration: 0.2 });
    rx.set(d.last.x - d.off.x);
    ry.set(d.last.y - d.off.y);
  };

  const release = () => {
    const d = drag.current;
    if (!d) return;
    window.clearTimeout(d.timer);
    drag.current = null;
    if (d.phase === "curl") {
      // A tap: the corner lifts a little and settles back.
      busy.current = false;
      setLifted(false);
      play(curl, 0, { duration: 0.22, ease: "easeOut" });
      play(sc, home.s, { type: "spring", stiffness: 400, damping: 22 });
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
    play(curl, home.placed ? 0.6 : 1, { duration: 0.2, ease: EASE_OUT });
    play(sc, home.s * 1.06, { duration: 0.2 });
    drag.current.timer = window.setTimeout(liftNow, 150);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    const p = toLogical(e.clientX, e.clientY);
    shX.set((((p.x - (rx.get() - S / 2)) / S) * 100 - 50) * 1.3);
    shY.set((((p.y - (ry.get() - S / 2)) / S) * 100 - 50) * 1.3);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.last = p;
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.start.x, p.y - d.start.y));
    if (d.phase === "curl" && d.moved > 7) liftNow();
    if (d.phase === "drag") {
      rx.set(clamp(p.x - d.off.x, -10, bounds.W + 10));
      ry.set(clamp(p.y - d.off.y, -10, bounds.H + 10));
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
    if (!interactive || busy.current || drag.current || e.pointerType === "touch") return;
    stopAnims();
    play(lift, 0.3, { type: "spring", stiffness: 300, damping: 22 });
    play(sc, home.s * 1.05, { type: "spring", stiffness: 300, damping: 20 });
    play(shO, 1, { duration: 0.2 });
  };
  const onLeave = () => {
    if (busy.current || drag.current) return;
    stopAnims();
    play(lift, 0, { type: "spring", stiffness: 300, damping: 26 });
    play(sc, home.s, { type: "spring", stiffness: 300, damping: 22 });
    play(shO, 0, { duration: 0.2 });
  };

  // A closed sticker panel takes its stickers with it.
  React.useEffect(() => {
    if (reduce) fade.jump(hidden ? 0 : 1);
    else animate(fade, hidden ? 0 : 1, { duration: 0.25 });
  }, [hidden, reduce, fade]);

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-hidden={hidden || undefined}
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
      className="absolute left-0 top-0 cursor-grab rounded-[26px] outline-none focus-visible:ring-4 focus-visible:ring-[#C9607E] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:cursor-grabbing"
      style={{
        width: S,
        height: S,
        x,
        y,
        rotate,
        scaleX,
        scaleY,
        opacity: fade,
        zIndex: lifted ? 5000 : z,
        touchAction: "none",
        pointerEvents: interactive ? "auto" : "none",
        willChange: "transform",
        filter: dof && !lifted && !reduce ? "blur(2px) saturate(0.9)" : "none",
        transition: reduce ? undefined : "filter .25s ease-out",
      }}
    >
      {/* Shadows stay in world axes: counter-rotate, offset, rotate back. */}
      <motion.span className="pointer-events-none absolute inset-0" style={{ rotate: negRotate, y: castY, scale: castS, opacity: castO }}>
        <motion.span className="absolute inset-0 block" style={{ rotate }}>
          <svg viewBox="0 0 100 100" width={S} height={S} className="overflow-visible" aria-hidden="true">
            <g filter={`url(#${uid}-soft)`}>{all}</g>
          </svg>
        </motion.span>
      </motion.span>
      <motion.span className="pointer-events-none absolute inset-0" style={{ opacity: tightO }}>
        <svg viewBox="0 0 100 100" width={S} height={S} className="overflow-visible" aria-hidden="true">
          <g filter={`url(#${uid}-tight)`} transform="translate(0 0.8)">
            {all}
          </g>
        </svg>
      </motion.span>
      <motion.span
        className="pointer-events-none absolute inset-[-6px] rounded-full border-2 border-white/70"
        style={{ opacity: ringO, scale: ringS }}
      />
      {/* The film margin frosts whatever is beneath it */}
      <span
        className="pointer-events-none absolute left-0 top-0"
        style={{
          width: 100,
          height: 100,
          transform: `scale(${S / 100})`,
          transformOrigin: "0 0",
          backdropFilter: "blur(1.8px)",
          WebkitBackdropFilter: "blur(1.8px)",
          WebkitMaskImage: frostMask,
          maskImage: frostMask,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      />
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
          <linearGradient id={`${sid}-holo`} gradientUnits="userSpaceOnUse" x1={-20} y1={-20} x2={120} y2={120}>
            <stop offset="0.28" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.4" stopColor="#f5d5de" stopOpacity={0.45} />
            <stop offset="0.48" stopColor="#fff" stopOpacity={0.6} />
            <stop offset="0.56" stopColor="#bcd4ea" stopOpacity={0.45} />
            <stop offset="0.66" stopColor="#fff1c9" stopOpacity={0.3} />
            <stop offset="0.76" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${sid}-shade`} gradientUnits="userSpaceOnUse" x1={40} y1={40} x2={125} y2={125}>
            <stop offset="0" stopColor="#7a5870" stopOpacity={0.26} />
            <stop offset="0.3" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.7" stopColor="#fff" stopOpacity={0.1} />
            <stop offset="1" stopColor="#8a6a80" stopOpacity={0.22} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${sid}-cm)`}>
          <g filter={`url(#${uid}-film)`}>{all}</g>
          <g ref={paintG} opacity={0.97}>
            {/* The wash sits a hair off-register from the pen, as printed washi does */}
            <g transform="translate(0.7 0.5)">
              <g filter={`url(#${uid}-wash)`}>{washShapes(def)}</g>
              <g filter={`url(#${uid}-glazef)`}>{glazeShapes(def, uid)}</g>
            </g>
            <g filter={`url(#${uid}-pen)`}>{inkShapes(def)}</g>
          </g>
          <g mask={`url(#${sid}-mk)`}>
            <rect x={-15} y={-15} width={130} height={130} fill={`url(#${uid}-p-glit)`} />
            <rect x={-15} y={-15} width={130} height={130} filter={`url(#${uid}-fibre)`} opacity={0.32} />
            <motion.rect
              ref={sheen}
              x={-30}
              y={-30}
              width={160}
              height={160}
              fill={`url(#${sid}-holo)`}
              style={{ opacity: shO, mixBlendMode: "soft-light" }}
            />
            <path ref={foldLine} d="M0 0" stroke="#3a2030" strokeOpacity={0.35} strokeWidth={9} fill="none" filter={`url(#${uid}-fold)`} />
          </g>
        </g>
        <g ref={flapWrap} display="none" filter={`url(#${uid}-flap)`}>
          <g ref={flapG}>
            <g clipPath={`url(#${sid}-cf)`}>
              <g filter={`url(#${uid}-back)`}>{all}</g>
              <g mask={`url(#${sid}-mk)`}>
                <rect x={-15} y={-15} width={130} height={130} filter={`url(#${uid}-fibre)`} opacity={0.3} />
                <rect x={-30} y={-30} width={170} height={170} fill={`url(#${sid}-shade)`} />
              </g>
            </g>
          </g>
        </g>
      </svg>
      {/* Moving shimmer and twinkles live in their own small layer, so the paper above is only painted once */}
      <svg viewBox="0 0 100 100" width={S} height={S} className="pointer-events-none absolute left-0 top-0 overflow-visible" aria-hidden="true">
        <defs>
          <mask id={`${sid}-mk2`} maskUnits="userSpaceOnUse" x={-15} y={-15} width={130} height={130}>
            <g filter={`url(#${uid}-silh)`}>{all}</g>
          </mask>
        </defs>
        <g clipPath={`url(#${sid}-cm)`}>
          <g mask={`url(#${sid}-mk2)`}>
            <rect className="sp-shim" x={-70} y={-20} width={36} height={140} fill={`url(#${uid}-g-shim)`} style={{ animationDelay: `${((def.id.length * 0.7) % 3).toFixed(2)}s` }} />
            {TWINKLES.map(([tx, ty, tr], i) => (
              <g key={i} className="sp-tw" style={{ animationDelay: `${(i * 0.7 + (def.id.length % 4) * 0.35).toFixed(2)}s` }}>
                <path d={twinkle(tx, ty, tr * 1.9)} fill="#fff" opacity={0.45} filter={`url(#${uid}-bloom)`} />
                <path d={twinkle(tx, ty, tr)} fill="#fff" />
              </g>
            ))}
          </g>
        </g>
      </svg>
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* The journal spread                                                         */
/* -------------------------------------------------------------------------- */

const HAND = 'var(--font-caveat, "Gaegu", "Nanum Pen Script", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive)';
const SERIF = 'var(--font-instrument-serif, Georgia, "Times New Roman", serif)';
const INK = C.ink;

function Hand({ x, y, size = 14, w, children, rotate = 0, className }: { x: number; y: number; size?: number; w?: number; children: React.ReactNode; rotate?: number; className?: string }) {
  return (
    <p
      className={cn("absolute m-0 whitespace-nowrap", className)}
      style={{ left: x, top: y, width: w, fontFamily: HAND, fontSize: size, lineHeight: 1, color: INK, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      {children}
    </p>
  );
}

function Photo({ x, y, w, h, rot, children, pin }: { x: number; y: number; w: number; h: number; rot: number; children: React.ReactNode; pin?: "tl" | "tr" | "br" }) {
  const pinPos = pin === "tl" ? { left: -11, top: -11 } : pin === "tr" ? { right: -11, top: -11 } : pin === "br" ? { right: -11, bottom: -11 } : null;
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)` }}>
      <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" width={w} height={h} style={{ display: "block", boxShadow: "0 1px 3px rgba(91,58,71,.25)", filter: "saturate(.8) sepia(.08)" }} aria-hidden="true">
        {children}
      </svg>
      {pinPos ? <span className="absolute size-[22px] rounded-full" style={{ ...pinPos, background: "rgba(176,152,170,.88)" }} /> : null}
    </div>
  );
}

function PageHeader({ x, date, day, tone, topic, items }: { x: number; date: string; day: number; tone: "blue" | "pink"; topic: string; items: string[] }) {
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  const ring = tone === "blue" ? C.blue : C.dusty;
  return (
    <>
      <p className="absolute m-0" style={{ left: x + 24, top: 13, fontFamily: SERIF, fontSize: 10, color: "#8b8e9c", lineHeight: 1 }}>
        date
      </p>
      <Hand x={x + 52} y={11} size={15}>
        {date}
      </Hand>
      <div className="absolute flex items-center gap-[4px]" style={{ left: x + 187, top: 9, fontFamily: SERIF, fontSize: 10, color: "#8b8e9c" }}>
        {letters.map((l, i) => (
          <span key={i} className="flex size-[15px] items-center justify-center rounded-full" style={i === day ? { background: ring, color: "#4b5068" } : undefined}>
            {l}
          </span>
        ))}
      </div>
      <div className="absolute h-px bg-[#c9cad3]" style={{ left: x + 22, width: 294, top: 31 }} />
      <p className="absolute m-0" style={{ left: x + 24, top: 41, fontFamily: SERIF, fontSize: 10, color: "#8b8e9c", lineHeight: 1 }}>
        topic
      </p>
      <Hand x={x + 52} y={38} size={15}>
        {topic}
      </Hand>
      <div className="absolute h-px bg-[#c9cad3]" style={{ left: x + 22, width: 294, top: 59 }} />
      {items.map((t, i) => (
        <React.Fragment key={i}>
          <span className="absolute size-[7px] rounded-full border border-[#9a9cab]" style={{ left: x + 26, top: 73 + i * 22 }} />
          <Hand x={x + 42} y={67 + i * 22} size={14}>
            {t}
          </Hand>
        </React.Fragment>
      ))}
      <div className="absolute h-px bg-[#c9cad3]" style={{ left: x + 22, width: 294, top: 133 }} />
    </>
  );
}

function DoodleFlower({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg className="absolute" style={{ left: x, top: y }} width={size} height={size} viewBox="0 0 60 60" fill="none" stroke={C.rose} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Array.from({ length: 5 }, (_, k) => {
        const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
        return <ellipse key={k} cx={r2(30 + 15 * Math.cos(a))} cy={r2(30 + 15 * Math.sin(a))} rx={9} ry={10.5} transform={`rotate(${(k * 72) % 360} ${r2(30 + 15 * Math.cos(a))} ${r2(30 + 15 * Math.sin(a))})`} />;
      })}
      <circle cx={30} cy={30} r={3} fill={C.rose} />
    </svg>
  );
}

function Journal({ uid, h }: { uid: string; h: number }) {
  const ruled = Array.from({ length: Math.floor((h - 34 - 140) / 21) + 1 }, (_, i) => 140 + i * 21);
  const ruledLeft = Array.from({ length: Math.floor((h - 34 - 316) / 21) + 1 }, (_, i) => 316 + i * 21);
  return (
    <div className="absolute left-0 top-0 overflow-hidden" style={{ width: J_W, height: h, background: C.porcelain }}>
      {/* page edges and gutter */}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px #ddd6da" }} />
      <div className="absolute inset-y-0 w-px bg-[#d3c9cf]" style={{ left: J_W / 2 }} />
      <div className="absolute inset-y-0" style={{ left: J_W / 2 - 16, width: 32, background: "linear-gradient(90deg, transparent, rgba(91,58,71,.06) 50%, transparent)" }} />

      {/* ---- left page ---- */}
      <PageHeader x={0} date="24 . 11 . 4" day={2} tone="blue" topic="slow day, sea & small things" items={["buy a new film roll", "call halmeoni ~ 할머니", "finish the book (p.96)"]} />
      <Photo x={26} y={150} w={146} h={104} rot={-3} pin="tl">
        <SeaPhoto uid={uid} />
      </Photo>
      <Hand x={190} y={152} size={14}>today felt like a long</Hand>
      <Hand x={190} y={173} size={14}>walk by the sea. the water</Hand>
      <Hand x={190} y={194} size={14}>sparkled all afternoon</Hand>
      <DoodleFlower x={250} y={232} size={50} />
      <Hand x={26} y={274} size={13}>tiny wish: more days</Hand>
      <Hand x={26} y={292} size={13}>like this one ~</Hand>
      {ruledLeft.map((y) => (
        <div key={y} className="absolute h-px" style={{ left: 22, width: 294, top: y, background: "#eee7ea" }} />
      ))}
      <div className="absolute h-px bg-[#d3c9cf]" style={{ left: 22, width: 294, top: h - 14 }} />

      {/* ---- right page ---- */}
      <PageHeader x={J_W / 2} date="24 . 11 . 5" day={3} tone="pink" topic="작은 행복 모으기" items={["water the plants", "swim on saturday!", ""]} />
      <div className="absolute h-px bg-[#d3c9cf]" style={{ left: J_W / 2 + 22, width: 294, top: h - 14 }} />
      {ruled.map((y) => (
        <div key={y} className="absolute h-px" style={{ left: J_W / 2 + 22, width: 294, top: y, background: "#eee7ea" }} />
      ))}
      <Photo x={J_W / 2 + 26} y={148} w={158} h={108} rot={1.5}>
        <HillPhoto uid={uid} />
      </Photo>
      <Hand x={J_W / 2 + 202} y={152} size={14}>the road felt endless,</Hand>
      <Hand x={J_W / 2 + 202} y={173} size={14}>green on both sides.</Hand>
      <Hand x={J_W / 2 + 202} y={194} size={14}>i could have stayed</Hand>
      <Hand x={J_W / 2 + 26} y={278} size={14}>그래서 오늘도 좋았다</Hand>
      <Hand x={J_W / 2 + 26} y={299} size={14}>next time, bring a hat!</Hand>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The scene                                                                  */
/* -------------------------------------------------------------------------- */

type ItemState = { placed: boolean; u: number; v: number; rot: number; z: number };

const INITIAL_ITEMS: ItemState[] = STICKERS.map(() => ({ placed: false, u: 0.5, v: 0.5, rot: 0, z: 0 }));

/**
 * A landscape iPad runs a scrapbook journal app: a two-page spread, and a docked sticker panel
 * holding a pack of washi-paper stickers.
 * Press a sticker to curl its corner and peel it off the glass, carry it over
 * the journal and let go to slap it down. Drop it anywhere else and it springs
 * back to its slot in the panel.
 *
 * Keyboard: Enter or Space on a panel sticker sticks it at the next free spot.
 * On the journal, arrow keys nudge (Shift for bigger steps), `[` and `]`
 * rotate, and Delete or Backspace sends it back to the panel. Double-click does
 * the same.
 */
export function StickerPeel({ loop = false, onChange, className }: StickerPeelProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = `sp${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hostRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);

  const [view, setView] = React.useState({ scale: 1, ready: false });
  const [open, setOpen] = React.useState(true);
  const panelOpen = loop || open;
  const [items, setItems] = React.useState<ItemState[]>(INITIAL_ITEMS);
  const [held, setHeld] = React.useState<Set<number>>(() => new Set());
  const [status, setStatus] = React.useState("");

  const geo = React.useMemo(() => geometry(panelOpen), [panelOpen]);
  const [rng] = React.useState(() => Math.random);
  const zRef = React.useRef(0);
  const apis = React.useRef<(ItemApi | null)[]>([]);

  // Scale the whole landscape iPad to the space it has.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const g = geometry(true);
      const w = Math.max(1, host.clientWidth - 16);
      const h = Math.max(1, host.clientHeight - 16);
      // The gallery card crops the sides of its stage, so the loop stays narrower.
      const scale = clamp(Math.min(w / g.W, h / g.H), 0.2, loop ? 0.76 : 1.4);
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
    const k = rect.width / geo.W;
    return { x: (cx - rect.left) / k, y: (cy - rect.top) / k };
  };

  const { paper, area, slots } = geo;
  const marginU = (S * PLACED_S * 0.42) / paper.w;
  const marginV = (S * PLACED_S * 0.42) / paper.h;
  const toUV = (x: number, y: number) => ({
    u: clamp((x - paper.x) / paper.w, marginU, 1 - marginU),
    v: clamp((y - paper.y) / paper.h, marginV, 1 - marginV),
  });
  const overJournal = (x: number, y: number) =>
    x > area.x - 6 && x < area.x + area.w + 6 && y > area.y - 6 && y < area.y + area.h + 6;

  const homeOf = (it: ItemState, i: number): Home =>
    it.placed
      ? { x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h, rot: it.rot, s: PLACED_S, placed: true }
      : { x: slots[i].x, y: slots[i].y, rot: 0, s: PANEL_S, placed: false };

  const place = (i: number, u: number, v: number, rot: number, opts?: FlyOpts) => {
    zRef.current += 1;
    const z = 10 + zRef.current;
    setItems((prev) => prev.map((it, k) => (k === i ? { placed: true, u, v, rot, z } : it)));
    const target: Home = { x: paper.x + u * paper.w, y: paper.y + v * paper.h, rot, s: PLACED_S, placed: true };
    void apis.current[i]?.flyTo(target, "slap", opts);
  };
  const sendBack = (i: number, opts?: FlyOpts) => {
    setItems((prev) => prev.map((it, k) => (k === i ? { ...it, placed: false } : it)));
    void apis.current[i]?.flyTo(homeOf({ ...items[i], placed: false }, i), "home", opts);
  };
  const nextSpot = () => {
    const taken = items.filter((it) => it.placed).map((it) => ({ x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h }));
    for (const s of SPOTS) {
      const px = paper.x + s.u * paper.w;
      const py = paper.y + s.v * paper.h;
      if (taken.every((t) => Math.hypot(t.x - px, t.y - py) > 62)) return s;
    }
    const n = taken.length;
    const base = SPOTS[n % SPOTS.length];
    return { u: clamp(base.u + 0.04 * Math.floor(n / SPOTS.length), 0.1, 0.9), v: clamp(base.v + 0.04 * Math.floor(n / SPOTS.length), 0.1, 0.9), rot: -base.rot };
  };

  const reset = () => {
    let n = 0;
    items.forEach((it, i) => {
      if (!it.placed) return;
      void apis.current[i]?.flyTo(homeOf({ ...it, placed: false }, i), "home", { peel: true, flight: 520, delay: n * 70 });
      n += 1;
    });
    setItems((prev) => prev.map((it) => ({ ...it, placed: false })));
    setStatus("All stickers are back in the sticker panel");
  };

  const onDrop = (i: number, moved: boolean, x: number, y: number) => {
    const it = items[i];
    if (overJournal(x, y)) {
      if (it.placed && !moved) {
        place(i, it.u, it.v, it.rot);
        return;
      }
      const { u, v } = toUV(x, y);
      place(i, u, v, (rng() * 2 - 1) * 12);
      setStatus(`${STICKERS[i].label} stuck on the journal`);
    } else {
      sendBack(i);
      setStatus(`${STICKERS[i].label} is back in the sticker panel`);
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
        setStatus(`${STICKERS[i].label} stuck on the journal`);
      }
      return;
    }
    if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      sendBack(i, { peel: true, flight: 520 });
      setStatus(`${STICKERS[i].label} is back in the sticker panel`);
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
      items.flatMap((it, i) => (it.placed ? [{ id: STICKERS[i].id, label: STICKERS[i].label, x: it.u, y: it.v, rotation: it.rot }] : [])),
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

  const dof = !loop && held.size > 0;
  const anyPlaced = items.some((it) => it.placed);
  const onPanel = items.filter((it) => !it.placed).length;
  const interactive = !loop;
  const { ipad, glass, panel } = geo;
  const slide = reduce ? undefined : "transform .35s cubic-bezier(.3,.8,.3,1), left .35s cubic-bezier(.3,.8,.3,1), top .35s cubic-bezier(.3,.8,.3,1)";

  return (
    <div
      ref={hostRef}
      className={cn("relative flex h-full min-h-[clamp(260px,62vw,640px)] w-full select-none items-center justify-center overflow-hidden", className)}
    >
      <SharedFilters uid={uid} />
      <div
        ref={stageRef}
        className="relative shrink-0"
        style={{
          width: geo.W,
          height: geo.H,
          transform: `scale(${view.scale})`,
          transformOrigin: "50% 50%",
          visibility: view.ready ? "visible" : "hidden",
        }}
      >
        <span className="sr-only" aria-live="polite">
          {status}
        </span>

        {/* iPad */}
        <div
          className="absolute rounded-[40px]"
          style={{
            left: ipad.x,
            top: ipad.y,
            width: ipad.w,
            height: ipad.h,
            background: "linear-gradient(145deg,#f1f2f5 0%,#cfd2d9 50%,#b9bdc7 100%)",
            boxShadow: "0 30px 50px -18px rgba(30,30,60,.5), 0 8px 16px rgba(30,30,60,.2), inset 0 1px 0 rgba(255,255,255,.9)",
          }}
        >
          <span className="absolute -right-[2px] top-[80px] h-[48px] w-[3px] rounded-r-[2px] bg-[#b4b8c2]" />
          <span className="absolute -top-[2px] right-[100px] h-[3px] w-[44px] rounded-t-[2px] bg-[#b4b8c2]" />
          <div className="absolute inset-[3px] rounded-[37px] bg-[#0c0d11]" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
            <span className="absolute left-1/2 top-[8px] size-[6px] -translate-x-1/2 rounded-full bg-[#1d2230]" style={{ boxShadow: "inset 0 0 0 1px #2b3144" }} />
          </div>
          <div
            className="absolute overflow-hidden rounded-[14px]"
            style={{ left: glass.x - ipad.x, top: glass.y - ipad.y, width: glass.w, height: glass.h, background: "#efe8ec" }}
          >
            {/* Everything on the glass shares one depth-of-field layer: it softens while a sticker is carried */}
            <div
              className="absolute"
              style={{
                inset: -10,
                filter: dof && !reduce ? "blur(3px) saturate(0.9)" : "none",
                transition: reduce ? undefined : "filter .25s ease-out",
              }}
            >
              <div className="absolute" style={{ inset: 10 }}>
            {/* Toolbar */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-[#e6dde2] bg-[#f8f4f6] px-3" style={{ height: TOOLBAR }}>
              <PenLine className="size-[13px] text-[#b49aa6]" strokeWidth={2} aria-hidden="true" />
              <button
                type="button"
                aria-label="Sticker panel"
                aria-expanded={panelOpen}
                aria-controls={`${uid}-panel`}
                disabled={loop}
                onClick={() => {
                  setOpen(!panelOpen);
                  setStatus(panelOpen ? "Sticker panel closed" : "Sticker panel open");
                }}
                className={cn(
                  "flex size-[20px] items-center justify-center rounded-[6px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#C9607E]",
                  panelOpen ? "bg-[#F5D5DE] text-[#8C2F4E]" : "text-[#8a6b78] hover:bg-[#f1e4ea]",
                )}
              >
                <Sticker className="size-[13px]" strokeWidth={2.2} aria-hidden="true" />
              </button>
              <Undo2 className="size-[13px] text-slate-400" strokeWidth={2} aria-hidden="true" />
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-[#b49aa6]">Daily Journal</span>
              {!loop ? (
                <button
                  type="button"
                  onClick={reset}
                  disabled={!anyPlaced}
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-[2px] text-[11px] font-semibold text-[#5B3A47] shadow-[0_1px_4px_rgba(91,58,71,.2)] outline-none transition-opacity hover:bg-[#fbf3f6] focus-visible:ring-2 focus-visible:ring-[#C9607E] disabled:opacity-40"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  Reset
                </button>
              ) : null}
            </div>

            {/* The journal, scaled to whatever room the panel leaves */}
            <div
              className="absolute"
              style={{
                left: geo.paper.x - glass.x,
                top: geo.paper.y - glass.y,
                width: J_W,
                height: geo.jH,
                transform: `scale(${geo.jScale})`,
                transformOrigin: "0 0",
                transition: slide,
                boxShadow: "0 6px 20px rgba(40,40,70,.18)",
              }}
            >
              <Journal uid={uid} h={geo.jH} />
            </div>

            {/* Sticker panel */}
            <div
              id={`${uid}-panel`}
              role="region"
              aria-label="Sticker panel"
              className="absolute border-l border-[#e6d6dd]"
              style={{
                left: panel.x - glass.x,
                top: panel.y - glass.y,
                width: panel.w,
                height: panel.h,
                background: "linear-gradient(180deg,#f8eff2 0%,#f1e3e9 100%)",
                transform: panelOpen ? "translateX(0)" : `translateX(${PANEL_W + 4}px)`,
                transition: slide,
              }}
            >
              <div className="absolute left-4 right-4 top-[14px] flex items-end justify-between">
                <div>
                  <p className="text-[17px] font-extrabold leading-none tracking-tight text-[#5B3A47]">Stickers</p>
                  <p className="mt-1 text-[10px] font-medium text-[#C9607E]">Work &amp; Life pack</p>
                </div>
                <span className="rounded-full bg-[#C9607E] px-2 py-[2px] text-[10px] font-bold text-white">{onPanel} left</span>
              </div>
              <div
                className="absolute left-[8px] right-[8px] rounded-[20px]"
                style={{
                  top: 64,
                  height: panel.h - 64 - 52,
                  backgroundColor: "rgba(236,222,230,.72)",
                  backgroundImage:
                    "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 44%, transparent 56%), radial-gradient(circle at 1px 1px, rgba(140,110,130,.16) 1px, transparent 1.4px)",
                  backgroundSize: "100% 100%, 16px 16px",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7), inset 0 0 0 2px rgba(140,110,130,.1), inset 0 6px 14px rgba(255,255,255,.35)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex h-[40px] items-center justify-around border-t border-[#ecd9e0] bg-white/60">
                <Smile className="size-[18px] text-[#C9607E]" strokeWidth={2.4} aria-hidden="true" />
                <Heart className="size-[18px] text-[#c9b3bd]" strokeWidth={2.2} aria-hidden="true" />
                <Star className="size-[18px] text-[#c9b3bd]" strokeWidth={2.2} aria-hidden="true" />
              </div>
            </div>

              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(115deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,0) 28%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "#fbf3f6", opacity: dof ? (reduce ? 0.18 : 0.26) : 0, transition: reduce ? undefined : "opacity .25s ease-out" }}
            />
          </div>
        </div>

        {/* Ghosts: the die-cut slot a sticker left behind */}
        {STICKERS.map((def, i) => (
          <div
            key={`g-${def.id}`}
            className="pointer-events-none absolute"
            style={{ left: slots[i].x - (S * PANEL_S) / 2, top: slots[i].y - (S * PANEL_S) / 2, width: S * PANEL_S, height: S * PANEL_S, zIndex: 1 }}
          >
            <Ghost def={def} uid={uid} visible={panelOpen && (items[i].placed || held.has(i))} />
          </div>
        ))}

        {/* Stickers live in their own top layer, so they can leave the panel's clipped glass */}
        {STICKERS.map((def, i) => {
          const it = items[i];
          const hidden = !it.placed && !panelOpen;
          const label = it.placed
            ? `${def.label} sticker on the journal. Arrow keys move it, brackets rotate it, Delete returns it to the sticker panel.`
            : `${def.label} sticker in the sticker panel. Press Enter to stick it on the journal, or drag it there.`;
          return (
            <StickerItem
              key={def.id}
              def={def}
              uid={uid}
              home={homeOf(it, i)}
              z={it.placed ? it.z : 2}
              interactive={interactive && !hidden}
              hidden={hidden}
              dof={dof}
              reduce={reduce}
              label={label}
              bounds={{ W: geo.W, H: geo.H }}
              apiRef={(api) => {
                apis.current[i] = api;
              }}
              toLogical={toLogical}
              onDrop={(moved, x, y) => onDrop(i, moved, x, y)}
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
                const z = 10 + zRef.current;
                setItems((prev) => prev.map((p, k) => (k === i ? { ...p, z } : p)));
              }}
              onKey={(e) => onKey(i, e)}
              onDouble={() => {
                if (it.placed) {
                  sendBack(i, { peel: true, flight: 520 });
                  setStatus(`${def.label} is back in the sticker panel`);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
