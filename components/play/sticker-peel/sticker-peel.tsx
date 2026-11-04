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
  { u: 0.163, v: 0.756, rot: -8 },
  { u: 0.362, v: 0.744, rot: 6 },
  { u: 0.237, v: 0.644, rot: -5 },
  { u: 0.65, v: 0.644, rot: 7 },
  { u: 0.885, v: 0.5, rot: -6 },
  { u: 0.75, v: 0.89, rot: 9 },
  { u: 0.94, v: 0.878, rot: -10 },
  { u: 0.104, v: 0.878, rot: 4 },
];

/** The autoplay order: [sticker index, spot index]. */
const DEMO: [number, number][] = [
  [3, 1],
  [0, 0],
  [1, 7],
  [2, 2],
  [4, 4],
  [5, 3],
  [6, 5],
  [7, 6],
];

const POS_SPRING = { stiffness: 700, damping: 42, mass: 0.7 };
const EASE_OUT = [0.2, 0.8, 0.25, 1] as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* -------------------------------------------------------------------------- */
/* Sticker artwork (original, 100 x 100 viewBox)                              */
/* -------------------------------------------------------------------------- */

type StickerDef = {
  id: string;
  label: string;
  /** The largest x + y the artwork (and its white border) reaches. The paper curl starts here. */
  maxSum: number;
  art: (uid: string) => React.ReactNode;
};

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
        <line key={a} x1={38} y1={32} x2={38 + 20 * Math.cos((a * Math.PI) / 180)} y2={32 + 20 * Math.sin((a * Math.PI) / 180)} stroke="#fafafa" strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <path d="M0 70 Q40 52 90 64 T160 60 V110 H0 Z" fill="#5d8c45" />
      <path d="M0 80 Q50 66 110 76 T160 74 V110 H0 Z" fill="#79a74f" />
      <path d="M60 110 Q72 90 100 80 Q112 77 122 76 L138 78 Q108 88 100 110 Z" fill="#8d8f8b" />
      <path d="M72 110 Q82 92 104 84" fill="none" stroke="#b9bab5" strokeWidth={1.4} />
      <path d="M10 100 L60 86" stroke="#6b5a3c" strokeWidth={1.2} strokeDasharray="1.5 4" />
    </>
  );
}

/** A turquoise beach: sky, bright shallow water, foam and sand. */
function BeachPhoto({ uid }: { uid: string }) {
  return (
    <>
      <rect width={160} height={110} fill={`url(#${uid}-g-turq)`} />
      <rect width={160} height={26} fill="#cfeaf7" />
      <ellipse cx={110} cy={12} rx={30} ry={7} fill="#fff" opacity={0.8} />
      <path d="M0 26 H160 V34 H0 Z" fill="#5aa7d8" opacity={0.7} />
      <path d="M0 70 Q30 62 60 70 T120 68 T160 66 V110 H0 Z" fill="#ecd6aa" />
      <path d="M0 68 Q30 60 60 68 T120 66 T160 64" fill="none" stroke="#fff" strokeWidth={3} opacity={0.9} />
      <path d="M0 58 Q40 52 80 58 T160 54" fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.6} />
      {GLINTS.slice(0, 24).map((g, i) => (
        <ellipse key={i} cx={g.x} cy={36 + (g.y % 22)} rx={g.rx} ry={0.6} fill="#fff" opacity={g.o * 0.7} />
      ))}
    </>
  );
}

const heartPath =
  "M50 86 C20 64 9 46 9 32 C9 19 19 12 30 12 C39 12 46 17 50 25 C54 17 61 12 70 12 C81 12 91 19 91 32 C91 46 80 64 50 86 Z";

/** A small pastel heart stamped with LOVE YOU. */
function LoveHeart({ cx, cy, s, fill, stroke, text }: { cx: number; cy: number; s: number; fill: string; stroke: string; text: boolean }) {
  return (
    <g transform={`translate(${cx - 50 * s} ${cy - 50 * s}) scale(${s})`}>
      <path d={heartPath} fill={fill} stroke={stroke} strokeWidth={3 / s} strokeLinejoin="round" />
      <path d="M22 30 Q23 22 31 20" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.6} />
      {text ? (
        <text textAnchor="middle" fontSize={15} fontWeight={800} fill="#fff" style={{ fontFamily: "system-ui, sans-serif", letterSpacing: 0.5 }}>
          <tspan x={50} y={44}>LOVE</tspan>
          <tspan x={50} y={61}>YOU</tspan>
        </text>
      ) : (
        <text x={50} y={54} textAnchor="middle" fontSize={20} fontStyle="italic" fill="#fff" style={{ fontFamily: "Georgia, serif" }}>
          Love
        </text>
      )}
    </g>
  );
}

const sparkle = (x: number, y: number, r: number, key: number) => (
  <path key={key} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`} fill="#fff" />
);

const PLUM = "#5a3446";
const SW = 1.5;

/** A tiny drawn four-point sparkle with an ink outline. */
const sp4 = (x: number, y: number, r: number, key: string, fill = "#fffaf0") => (
  <path
    key={key}
    d={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`}
    fill={fill}
    stroke={PLUM}
    strokeWidth={1}
    strokeLinejoin="round"
  />
);

const miniHeart = (x: number, y: number, s: number, fill: string, key: string) => (
  <path
    key={key}
    transform={`translate(${x - 50 * s} ${y - 50 * s}) scale(${s})`}
    d="M50 86 C20 64 9 46 9 32 C9 19 19 12 30 12 C39 12 46 17 50 25 C54 17 61 12 70 12 C81 12 91 19 91 32 C91 46 80 64 50 86 Z"
    fill={fill}
    stroke={PLUM}
    strokeWidth={SW / s}
    strokeLinejoin="round"
  />
);

const monsteraLeaf = (x: number, y: number, rot: number, key: string, u: string) => (
  <g key={key} transform={`translate(${x} ${y}) rotate(${rot})`}>
    <path
      d="M0 0 C-17 -4 -22 -24 -9 -35 C-3 -40 5 -38 11 -33 C22 -22 17 -5 0 0 Z"
      fill={`url(#${u}-w-sage)`}
      stroke={PLUM}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
    <path d="M0 -1 C-1 -12 -1 -22 -1 -33" fill="none" stroke={PLUM} strokeWidth={1} strokeLinecap="round" />
    <path d="M-9 -22 L-3 -20 M8 -24 L2 -22 M-12 -12 L-4 -12 M11 -13 L3 -13" fill="none" stroke={PLUM} strokeWidth={0.9} strokeLinecap="round" />
  </g>
);

const STICKERS: StickerDef[] = [
  {
    id: "latte",
    label: "Latte cup",
    maxSum: 176,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx={50} cy={82} rx={36} ry={7} fill={`url(#${u}-w-cream)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M76 50 Q93 49 91 62 Q89 74 72 70 L73 63 Q83 64 84 61 Q85 56 76 57 Z" fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M22 46 H78 Q78 78 50 80 Q22 78 22 46 Z" fill={`url(#${u}-w-cream)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M24 60 Q50 68 77 60" fill="none" stroke="#f4a3bb" strokeWidth={5} opacity={0.8} />
        <ellipse cx={50} cy={46} rx={28} ry={6.5} fill="#d7a07f" stroke={PLUM} strokeWidth={SW} />
        {miniHeart(50, 46, 0.2, "#fff4e6", "lh")}
        <path d="M40 36 Q35 30 40 25 Q45 20 40 15" fill="none" stroke={PLUM} strokeWidth={1.1} />
        {miniHeart(58, 26, 0.24, "#f28aa8", "h1")}
        {miniHeart(44, 12, 0.18, "#f7b6c8", "h2")}
        {sp4(84, 28, 5.5, "s1")}
        {sp4(16, 40, 4, "s2")}
      </g>
    ),
  },
  {
    id: "laptop",
    label: "Smiling laptop",
    maxSum: 172,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <rect x={18} y={20} width={64} height={46} rx={5} fill={`url(#${u}-w-cream)`} stroke={PLUM} strokeWidth={SW} />
        <rect x={23} y={25} width={54} height={36} rx={3} fill={`url(#${u}-w-blue)`} stroke={PLUM} strokeWidth={1.1} />
        <circle cx={42} cy={40} r={2} fill={PLUM} />
        <circle cx={58} cy={40} r={2} fill={PLUM} />
        <path d="M44 48 Q50 54 56 48" fill="none" stroke={PLUM} strokeWidth={1.4} />
        <circle cx={37} cy={46} r={2.6} fill="#f6a5bb" opacity={0.7} />
        <circle cx={63} cy={46} r={2.6} fill="#f6a5bb" opacity={0.7} />
        <rect x={25} y={27} width={11} height={11} rx={1} fill="#ffd3df" stroke={PLUM} strokeWidth={0.9} transform="rotate(-8 30 32)" />
        <rect x={65} y={28} width={11} height={11} rx={1} fill="#fff1c4" stroke={PLUM} strokeWidth={0.9} transform="rotate(7 70 33)" />
        <path d="M10 67 H90 L85 77 Q84 79 81 79 H19 Q16 79 15 77 Z" fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M42 70 H58" stroke={PLUM} strokeWidth={1.1} />
        {sp4(88, 18, 5.5, "s1")}
        {sp4(12, 28, 4, "s2")}
      </g>
    ),
  },
  {
    id: "cat",
    label: "Sleepy cat",
    maxSum: 178,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M12 74 Q14 62 50 62 Q86 62 88 74 Q90 88 50 90 Q10 88 12 74 Z" fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M80 70 Q96 66 92 52 Q90 44 82 46" fill="none" stroke={PLUM} strokeWidth={9} />
        <path d="M80 70 Q96 66 92 52 Q90 44 82 46" fill="none" stroke="#f5ebe6" strokeWidth={6.4} />
        <ellipse cx={54} cy={60} rx={30} ry={19} fill="#f5ebe6" stroke={PLUM} strokeWidth={SW} />
        <path d="M60 46 Q66 56 62 70 M72 48 Q77 57 75 68" fill="none" stroke="#e1c4b6" strokeWidth={3} />
        <path d="M22 50 L19 34 L31 42 Z" fill="#f5ebe6" stroke={PLUM} strokeWidth={SW} />
        <path d="M42 44 L46 30 L52 46 Z" fill="#f5ebe6" stroke={PLUM} strokeWidth={SW} />
        <ellipse cx={34} cy={56} rx={15} ry={13} fill="#f5ebe6" stroke={PLUM} strokeWidth={SW} />
        <path d="M22 54 Q26 58 30 54 M38 54 Q42 58 46 54" fill="none" stroke={PLUM} strokeWidth={1.3} />
        <path d="M32 61 Q34 63 36 61" fill="none" stroke={PLUM} strokeWidth={1.1} />
        <circle cx={22} cy={60} r={2.6} fill="#f6a5bb" opacity={0.75} />
        <circle cx={46} cy={60} r={2.6} fill="#f6a5bb" opacity={0.75} />
        <text x={58} y={30} fontSize={10} fontWeight={700} fill={PLUM} style={{ fontFamily: "Georgia, serif" }}>z</text>
        <text x={68} y={20} fontSize={7} fontWeight={700} fill={PLUM} style={{ fontFamily: "Georgia, serif" }}>z</text>
        {sp4(14, 22, 5, "s1")}
        {sp4(86, 30, 4, "s2")}
      </g>
    ),
  },
  {
    id: "clock",
    label: "Alarm clock",
    maxSum: 174,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M32 82 L26 92 M68 82 L74 92" fill="none" stroke={PLUM} strokeWidth={3} />
        <circle cx={27} cy={24} r={11} fill={`url(#${u}-w-rose)`} stroke={PLUM} strokeWidth={SW} />
        <circle cx={73} cy={24} r={11} fill={`url(#${u}-w-rose)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M40 18 Q50 10 60 18" fill="none" stroke={PLUM} strokeWidth={SW} />
        <circle cx={50} cy={57} r={32} fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <circle cx={50} cy={57} r={25} fill={`url(#${u}-w-cream)`} stroke={PLUM} strokeWidth={1.1} />
        {[0, 90, 180, 270].map((a) => (
          <circle key={a} cx={50 + 20 * Math.sin((a * Math.PI) / 180)} cy={57 - 20 * Math.cos((a * Math.PI) / 180)} r={1.6} fill={PLUM} />
        ))}
        <path d="M50 57 V42 M50 57 L60 63" fill="none" stroke={PLUM} strokeWidth={2.2} />
        <circle cx={50} cy={57} r={2.4} fill="#e66e90" stroke={PLUM} strokeWidth={1} />
        {miniHeart(50, 70, 0.14, "#f28aa8", "ch")}
        {sp4(88, 50, 5, "s1")}
        {sp4(12, 54, 4, "s2")}
      </g>
    ),
  },
  {
    id: "plant",
    label: "Potted plant",
    maxSum: 172,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        {monsteraLeaf(50, 60, -58, "l1", u)}
        {monsteraLeaf(50, 60, 58, "l2", u)}
        {monsteraLeaf(50, 60, -22, "l3", u)}
        {monsteraLeaf(50, 60, 24, "l4", u)}
        <path d="M32 68 H68 L63 91 Q62 93 60 93 H40 Q38 93 37 91 Z" fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <rect x={29} y={61} width={42} height={9} rx={3} fill={`url(#${u}-w-rose)`} stroke={PLUM} strokeWidth={SW} />
        {miniHeart(50, 80, 0.16, "#fff4e6", "ph")}
        {sp4(86, 22, 5, "s1")}
        {sp4(14, 30, 4, "s2")}
      </g>
    ),
  },
  {
    id: "todo",
    label: "To-do note pad",
    maxSum: 184,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <g transform="rotate(-4 46 50)">
          <rect x={16} y={14} width={58} height={72} rx={4} fill={`url(#${u}-w-cream)`} stroke={PLUM} strokeWidth={SW} />
          <rect x={16} y={14} width={58} height={11} rx={4} fill={`url(#${u}-w-rose)`} stroke={PLUM} strokeWidth={SW} />
          {[28, 45, 62].map((x) => (
            <circle key={x} cx={x} cy={19.5} r={1.8} fill="#fff4e6" stroke={PLUM} strokeWidth={0.9} />
          ))}
          {[36, 52, 68].map((y, i) => (
            <g key={y}>
              <rect x={22} y={y - 4.5} width={9} height={9} rx={2} fill="#fff" stroke={PLUM} strokeWidth={1.1} />
              {i < 2 ? <path d={`M23.5 ${y} L26 ${y + 2.6} L30 ${y - 3.4}`} fill="none" stroke="#e66e90" strokeWidth={1.8} /> : null}
              <path d={`M36 ${y} H67`} stroke={PLUM} strokeWidth={1.1} strokeDasharray={i < 2 ? "0" : "3 2.4"} opacity={0.75} />
            </g>
          ))}
        </g>
        <g transform="rotate(24 80 56)">
          <rect x={76} y={26} width={9} height={44} fill="#ffe9a8" stroke={PLUM} strokeWidth={SW} />
          <rect x={76} y={20} width={9} height={7} rx={2} fill="#f7a1b8" stroke={PLUM} strokeWidth={SW} />
          <path d="M76 70 L80.5 82 L85 70 Z" fill="#f5dcc0" stroke={PLUM} strokeWidth={SW} />
          <path d="M79.2 78 L80.5 82 L81.8 78 Z" fill={PLUM} />
        </g>
        {sp4(10, 24, 4, "s1")}
        {sp4(90, 14, 4.5, "s2")}
      </g>
    ),
  },
  {
    id: "toast",
    label: "Jam toast",
    maxSum: 176,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <path
          d="M22 86 V48 Q9 46 11 32 Q13 17 30 19 Q40 11 52 15 Q66 11 76 19 Q92 18 90 33 Q90 46 78 48 V86 Z"
          fill={`url(#${u}-w-crust)`}
          stroke={PLUM}
          strokeWidth={SW}
        />
        <path d="M28 82 V46 Q17 44 18 34 Q20 24 32 25 Q41 18 52 21 Q64 18 71 25 Q84 25 83 34 Q83 43 72 46 V82 Z" fill={`url(#${u}-w-cream)`} stroke="#d9a76d" strokeWidth={1} />
        <path
          d="M30 40 Q28 30 42 30 Q52 24 62 31 Q76 30 72 42 Q73 52 68 55 Q66 62 62 55 Q58 64 54 56 Q48 62 45 54 Q36 54 30 40 Z"
          fill={`url(#${u}-w-jam)`}
          stroke={PLUM}
          strokeWidth={SW}
        />
        <path d="M38 36 Q42 33 48 34" fill="none" stroke="#fff" strokeWidth={2} opacity={0.7} />
        <circle cx={44} cy={44} r={1.8} fill="#fff" opacity={0.7} />
        <rect x={38} y={64} width={14} height={9} rx={2} fill="#fff1b8" stroke={PLUM} strokeWidth={1.1} transform="rotate(-6 45 68)" />
        {sp4(84, 62, 5, "s1")}
        {sp4(14, 70, 4, "s2")}
      </g>
    ),
  },
  {
    id: "lamp",
    label: "Ribbon desk lamp",
    maxSum: 176,
    art: (u) => (
      <g strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx={50} cy={87} rx={21} ry={6} fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <rect x={46.5} y={52} width={7} height={34} rx={2} fill={`url(#${u}-w-cream)`} stroke={PLUM} strokeWidth={SW} />
        <ellipse cx={50} cy={70} rx={8} ry={5} fill={`url(#${u}-w-rose)`} stroke={PLUM} strokeWidth={1.1} />
        <path d="M32 18 Q50 10 68 18 L83 52 Q79 56 74 52 Q70 58 64 52 Q58 58 52 52 Q46 58 40 52 Q34 58 28 52 Q22 56 17 52 Z" fill={`url(#${u}-w-pink)`} stroke={PLUM} strokeWidth={SW} />
        <path d="M32 18 Q50 24 68 18 L72 26 Q50 32 28 26 Z" fill={`url(#${u}-w-blue)`} stroke={PLUM} strokeWidth={1.1} />
        <path d="M36 36 Q38 44 34 50 M50 34 Q50 44 50 50 M64 36 Q62 44 66 50" fill="none" stroke={PLUM} strokeWidth={0.9} opacity={0.6} />
        <path d="M50 66 L40 60 Q38 66 42 70 Z M50 66 L60 60 Q62 66 58 70 Z" fill={`url(#${u}-w-blue)`} stroke={PLUM} strokeWidth={1.1} />
        <circle cx={50} cy={66} r={2.6} fill="#e66e90" stroke={PLUM} strokeWidth={1} />
        {[[24, 56], [50, 58], [76, 56]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} Q${x - 3} ${y + 5} ${x} ${y + 8} Q${x + 3} ${y + 5} ${x} ${y} Z`} fill="#e66e90" stroke={PLUM} strokeWidth={1} />
        ))}
        {sp4(86, 24, 5.5, "s1")}
        {sp4(12, 32, 4.5, "s2")}
      </g>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/* Shared SVG filters                                                         */
/* -------------------------------------------------------------------------- */

const GLITTER = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 17 + ((i * i) % 11) * 3) % 40,
  y: (i * 29 + ((i * 5) % 13) * 2) % 40,
  r: 0.36 + (i % 4) * 0.2,
  o: 0.6 + (i % 5) * 0.1,
  pink: i % 4 === 0,
}));

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
          <stop offset="0" stopColor="#33508f" />
          <stop offset="0.55" stopColor="#7c7cbc" />
          <stop offset="1" stopColor="#eaa6bd" />
        </linearGradient>
        <linearGradient id={`${uid}-g-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aebfd1" />
          <stop offset="1" stopColor="#e6ecf1" />
        </linearGradient>
        <linearGradient id={`${uid}-g-turq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" stopColor="#1fb3c8" />
          <stop offset="0.7" stopColor="#8fe6d8" />
        </linearGradient>
        {/* Watercolour fills for the washi stickers */}
        {(
          [
            ["pink", "#ffd9e4", "#f19bb7"],
            ["rose", "#f9aec3", "#e46b8e"],
            ["blue", "#e4f0ff", "#a6cbf0"],
            ["cream", "#fffaf0", "#f5e3c6"],
            ["sage", "#e0efdc", "#9fc99d"],
            ["crust", "#f7d9a4", "#e3a967"],
            ["jam", "#ffa9bd", "#e8577f"],
          ] as const
        ).map(([name, from, to]) => (
          <linearGradient key={name} id={`${uid}-w-${name}`} x1="0.1" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        ))}
        {/* Fine glitter speckle */}
        <pattern id={`${uid}-p-glit`} width="40" height="40" patternUnits="userSpaceOnUse">
          {GLITTER.map((g, i) => (
            <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.pink ? "#fff1c2" : "#ffffff"} opacity={g.o} />
          ))}
        </pattern>
        <linearGradient id={`${uid}-g-shim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* The washi look: a thin frosted margin with a faint rim and paper fibres */}
        <filter id={`${uid}-die`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#ffffff" floodOpacity="0.62" result="frostFill" />
          <feComposite in="frostFill" in2="grown" operator="in" result="frost" />
          <feMorphology in="grown" operator="erode" radius="0.6" result="inner" />
          <feComposite in="grown" in2="inner" operator="out" result="edge" />
          <feFlood floodColor="#ffffff" floodOpacity="0.95" result="rimFill" />
          <feComposite in="rimFill" in2="edge" operator="in" result="rim" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.5  0 0 0 0 0.56  0.55 0 0 0 -0.17" result="fibreRaw" />
          <feComposite in="fibreRaw" in2="grown" operator="in" result="fibre" />
          <feMerge>
            <feMergeNode in="frost" />
            <feMergeNode in="rim" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="fibre" />
          </feMerge>
        </filter>
        {tint("silh", "#ffffff", 1, 0)}
        {tint("back", "#fcf3f7", 0.7, 0)}
        {tint("tight", "#3a2030", 0.9, 1.3)}
        {tint("soft", "#3a2030", 0.9, 5)}
        <filter id={`${uid}-ghost`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#6f7aa8" floodOpacity="0.13" result="tintFill" />
          <feComposite in="tintFill" in2="grown" operator="in" result="fill" />
          <feMorphology in="grown" operator="erode" radius="1.1" result="inner" />
          <feComposite in="grown" in2="inner" operator="out" result="edge" />
          <feFlood floodColor="#6f7aa8" floodOpacity="0.5" result="tintEdge" />
          <feComposite in="tintEdge" in2="edge" operator="in" result="line" />
          <feMerge>
            <feMergeNode in="fill" />
            <feMergeNode in="line" />
          </feMerge>
        </filter>
        <filter id={`${uid}-fold`} x="-60" y="-60" width="220" height="220" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${uid}-flap`} {...FILTER_BOX}>
          <feDropShadow dx="-1" dy="-1.6" stdDeviation="2" floodColor="#1c1238" floodOpacity="0.38" />
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
      <g filter={`url(#${uid}-ghost)`}>{def.art(uid)}</g>
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
  const { def, uid, home, z, interactive, hidden, reduce, label, bounds, apiRef, toLogical, onDrop, onHeld, onRaise, onKey, onDouble } = props;
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
  const tightO = useTransform(lift, (l) => 0.45 - 0.32 * l);
  const castY = useTransform(lift, (l) => l * 20);
  const castS = useTransform(lift, (l) => 1 + l * 0.1);
  const castO = useTransform(lift, (l) => l * 0.42);

  const [lifted, setLifted] = React.useState(false);

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

  const art = def.art(uid);
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
      className="absolute left-0 top-0 cursor-grab rounded-[26px] outline-none focus-visible:ring-4 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:cursor-grabbing"
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
      }}
    >
      {/* Shadows stay in world axes: counter-rotate, offset, rotate back. */}
      <motion.span className="pointer-events-none absolute inset-0" style={{ rotate: negRotate, y: castY, scale: castS, opacity: castO }}>
        <motion.span className="absolute inset-0 block" style={{ rotate }}>
          <svg viewBox="0 0 100 100" width={S} height={S} className="overflow-visible" aria-hidden="true">
            <g filter={`url(#${uid}-soft)`}>{art}</g>
          </svg>
        </motion.span>
      </motion.span>
      <motion.span className="pointer-events-none absolute inset-0" style={{ opacity: tightO }}>
        <svg viewBox="0 0 100 100" width={S} height={S} className="overflow-visible" aria-hidden="true">
          <g filter={`url(#${uid}-tight)`} transform="translate(0 1.2)">
            {art}
          </g>
        </svg>
      </motion.span>
      <motion.span
        className="pointer-events-none absolute inset-[-6px] rounded-full border-2 border-white"
        style={{ opacity: ringO, scale: ringS }}
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
            <g filter={`url(#${uid}-silh)`}>{art}</g>
          </mask>
          <linearGradient id={`${sid}-holo`} gradientUnits="userSpaceOnUse" x1={-20} y1={-20} x2={120} y2={120}>
            <stop offset="0.28" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.4" stopColor="#ffc9e0" stopOpacity={0.4} />
            <stop offset="0.48" stopColor="#fff" stopOpacity={0.6} />
            <stop offset="0.56" stopColor="#c9e2ff" stopOpacity={0.4} />
            <stop offset="0.66" stopColor="#fff0d2" stopOpacity={0.3} />
            <stop offset="0.76" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${sid}-shade`} gradientUnits="userSpaceOnUse" x1={40} y1={40} x2={125} y2={125}>
            <stop offset="0" stopColor="#7a5870" stopOpacity={0.3} />
            <stop offset="0.3" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.7" stopColor="#fff" stopOpacity={0.1} />
            <stop offset="1" stopColor="#8a6a80" stopOpacity={0.26} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${sid}-cm)`}>
          <g filter={`url(#${uid}-die)`}>{art}</g>
          <g mask={`url(#${sid}-mk)`}>
            <rect x={-15} y={-15} width={130} height={130} fill={`url(#${uid}-p-glit)`} />
            {[
              [30, 30, 3.6],
              [72, 44, 3],
              [54, 76, 3.2],
            ].map(([x, y, r], i) => (
              <path
                key={i}
                className="sp-tw"
                style={{ animationDelay: `${(i * 0.9 + (def.id.length % 4) * 0.35).toFixed(2)}s` }}
                d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`}
                fill="#fff"
              />
            ))}
            <rect className="sp-shim" x={-70} y={-20} width={36} height={140} fill={`url(#${uid}-g-shim)`} style={{ animationDelay: `${((def.id.length * 0.7) % 3).toFixed(2)}s` }} />
            <g>
              <motion.rect
                ref={sheen}
                x={-30}
                y={-30}
                width={160}
                height={160}
                fill={`url(#${sid}-holo)`}
                style={{ opacity: shO, mixBlendMode: "soft-light" }}
              />
            </g>
            <path ref={foldLine} d="M0 0" stroke="#1c1238" strokeOpacity={0.4} strokeWidth={9} fill="none" filter={`url(#${uid}-fold)`} />
          </g>
        </g>
        <g ref={flapWrap} display="none" filter={`url(#${uid}-flap)`}>
          <g ref={flapG}>
            <g clipPath={`url(#${sid}-cf)`}>
              <g filter={`url(#${uid}-back)`}>{art}</g>
              <g mask={`url(#${sid}-mk)`}>
                <rect x={-30} y={-30} width={170} height={170} fill={`url(#${sid}-shade)`} />
              </g>
            </g>
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
const INK = "#4b5068";

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
      <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" width={w} height={h} style={{ display: "block", boxShadow: "0 1px 3px rgba(40,40,60,.3)" }} aria-hidden="true">
        {children}
      </svg>
      {pinPos ? <span className="absolute size-[22px] rounded-full" style={{ ...pinPos, background: "rgba(176,152,170,.88)" }} /> : null}
    </div>
  );
}

function PageHeader({ x, date, day, tone, topic, items }: { x: number; date: string; day: number; tone: "blue" | "pink"; topic: string; items: string[] }) {
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  const ring = tone === "blue" ? "#c5d3f4" : "#f6b3bb";
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
    <svg className="absolute" style={{ left: x, top: y }} width={size} height={size} viewBox="0 0 60 60" fill="none" stroke="#E8708F" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Array.from({ length: 5 }, (_, k) => {
        const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
        return <ellipse key={k} cx={30 + 15 * Math.cos(a)} cy={30 + 15 * Math.sin(a)} rx={9} ry={10.5} transform={`rotate(${(k * 72) % 360} ${30 + 15 * Math.cos(a)} ${30 + 15 * Math.sin(a)})`} />;
      })}
      <circle cx={30} cy={30} r={3} fill="#E8708F" />
    </svg>
  );
}

function Journal({ uid, h }: { uid: string; h: number }) {
  const ruled = Array.from({ length: Math.floor((h - 34 - 140) / 21) + 1 }, (_, i) => 140 + i * 21);
  const ruledLeft = Array.from({ length: Math.floor((h - 34 - 316) / 21) + 1 }, (_, i) => 316 + i * 21);
  return (
    <div className="absolute left-0 top-0 overflow-hidden bg-white" style={{ width: J_W, height: h }}>
      {/* page edges and gutter */}
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 1px #d4d5dc" }} />
      <div className="absolute inset-y-0 w-px bg-[#c4c5cf]" style={{ left: J_W / 2 }} />
      <div className="absolute inset-y-0" style={{ left: J_W / 2 - 16, width: 32, background: "linear-gradient(90deg, transparent, rgba(60,60,90,.07) 50%, transparent)" }} />

      {/* ---- left page ---- */}
      <PageHeader x={0} date="24 . 11 . 4" day={2} tone="blue" topic="slow day, sea & small things" items={["buy a new film roll", "call halmeoni ~ 할머니", "finish the book (p.96)"]} />
      <Photo x={26} y={148} w={146} h={104} rot={-3} pin="tl">
        <SeaPhoto uid={uid} />
      </Photo>
      <Hand x={190} y={150} size={14}>today felt like a long</Hand>
      <Hand x={190} y={170} size={14}>walk by the sea. the water</Hand>
      <Hand x={190} y={190} size={14}>sparkled all afternoon!</Hand>
      <Hand x={190} y={210} size={14}>빛나는 바다 ~ ♡</Hand>
      <DoodleFlower x={246} y={236} size={56} />
      <Hand x={26} y={268} size={13}>tiny wish: more days</Hand>
      <Hand x={26} y={286} size={13}>like this one ~</Hand>
      {ruledLeft.map((y) => (
        <div key={y} className="absolute h-px bg-[#e9e6ee]" style={{ left: 22, width: 294, top: y }} />
      ))}
      <svg className="absolute" style={{ left: 176, top: h - 68 }} width={142} height={44} viewBox="0 0 142 44" aria-hidden="true">
        <LoveHeart cx={22} cy={22} s={0.42} fill="#9DB5EE" stroke="#7b94d6" text />
        <LoveHeart cx={71} cy={22} s={0.42} fill="#9FE0C0" stroke="#74c4a0" text />
        <LoveHeart cx={120} cy={22} s={0.42} fill="#F7BFC6" stroke="#e89aa6" text={false} />
      </svg>
      <div className="absolute h-px bg-[#c9cad3]" style={{ left: 22, width: 294, top: h - 14 }} />

      {/* ---- right page ---- */}
      <PageHeader x={J_W / 2} date="24 . 11 . 5" day={3} tone="pink" topic="작은 행복 모으기" items={["water the plants", "swim on saturday!", ""]} />
      <div className="absolute h-px bg-[#c9cad3]" style={{ left: J_W / 2 + 22, width: 294, top: h - 14 }} />
      {ruled.map((y) => (
        <div key={y} className="absolute h-px bg-[#e4e5ea]" style={{ left: J_W / 2 + 22, width: 294, top: y }} />
      ))}
      <Photo x={J_W / 2 + 26} y={146} w={158} h={108} rot={1.5}>
        <HillPhoto uid={uid} />
      </Photo>
      <Hand x={J_W / 2 + 202} y={150} size={14}>the road felt endless,</Hand>
      <Hand x={J_W / 2 + 202} y={171} size={14}>green on both sides.</Hand>
      <Hand x={J_W / 2 + 202} y={192} size={14}>i could have stayed</Hand>
      <Hand x={J_W / 2 + 202} y={213} size={14}>for ever ~</Hand>
      <Hand x={J_W / 2 + 26} y={276} size={14}>그래서 오늘도 좋았다</Hand>
      <Hand x={J_W / 2 + 26} y={297} size={14}>next time, bring a hat!</Hand>
      <svg className="absolute" style={{ left: J_W / 2 + 252, top: 262 }} width={54} height={50} viewBox="0 0 60 56" fill="none" stroke="#1f1f24" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
        <ellipse cx={20} cy={17} rx={9} ry={11} />
        <ellipse cx={42} cy={17} rx={9} ry={11} />
        <circle cx={22} cy={19} r={3.2} fill="#1f1f24" />
        <circle cx={40} cy={19} r={3.2} fill="#1f1f24" />
        <path d="M18 40 Q31 52 44 40" />
      </svg>
      <Photo x={J_W / 2 + 182} y={h - 128} w={130} h={96} rot={-4} pin="tr">
        <BeachPhoto uid={uid} />
      </Photo>
      <div
        className="absolute"
        style={{
          left: J_W / 2 + 28,
          top: h - 104,
          width: 118,
          height: 72,
          transform: "rotate(3deg)",
          background: `conic-gradient(#f7bfce 25%, #cfe3f7 0 50%, #f7bfce 0 75%, #cfe3f7 0) 0 0 / 24px 24px`,
          boxShadow: "0 1px 3px rgba(40,40,60,.25)",
        }}
      >
        <div className="absolute inset-[9px] bg-white/80 px-2 pt-[6px]" style={{ fontFamily: HAND, fontSize: 12, lineHeight: 1.25, color: INK }}>
          1. nap by the sea
          <br />
          2. buy postcards
          <br />
          3. call mom ~
        </div>
      </div>
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
            style={{ left: glass.x - ipad.x, top: glass.y - ipad.y, width: glass.w, height: glass.h, background: "#e9eaf0" }}
          >
            {/* Toolbar */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-[#e3e4ea] bg-[#f6f6f8] px-3" style={{ height: TOOLBAR }}>
              <PenLine className="size-[13px] text-slate-400" strokeWidth={2} aria-hidden="true" />
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
                  "flex size-[20px] items-center justify-center rounded-[6px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-500",
                  panelOpen ? "bg-violet-100 text-violet-600" : "text-slate-500 hover:bg-slate-200/70",
                )}
              >
                <Sticker className="size-[13px]" strokeWidth={2.2} aria-hidden="true" />
              </button>
              <Undo2 className="size-[13px] text-slate-400" strokeWidth={2} aria-hidden="true" />
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-slate-400">Daily Journal</span>
              {!loop ? (
                <button
                  type="button"
                  onClick={reset}
                  disabled={!anyPlaced}
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-[2px] text-[11px] font-semibold text-slate-700 shadow-[0_1px_4px_rgba(30,40,70,.2)] outline-none transition-opacity hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40"
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
              className="absolute border-l border-[#dcd9ee]"
              style={{
                left: panel.x - glass.x,
                top: panel.y - glass.y,
                width: panel.w,
                height: panel.h,
                background: "linear-gradient(180deg,#f8f6ff 0%,#ece8fb 100%)",
                transform: panelOpen ? "translateX(0)" : `translateX(${PANEL_W + 4}px)`,
                transition: slide,
              }}
            >
              <div className="absolute left-4 right-4 top-[14px] flex items-end justify-between">
                <div>
                  <p className="text-[17px] font-extrabold leading-none tracking-tight text-slate-900">Stickers</p>
                  <p className="mt-1 text-[10px] font-medium text-violet-600">Work &amp; Life pack</p>
                </div>
                <span className="rounded-full bg-violet-600 px-2 py-[2px] text-[10px] font-bold text-white">{onPanel} left</span>
              </div>
              <div
                className="absolute left-[8px] right-[8px] rounded-[20px]"
                style={{
                  top: 64,
                  height: panel.h - 64 - 52,
                  backgroundColor: "rgba(255,255,255,.78)",
                  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(120,110,170,.22) 1px, transparent 1.4px)",
                  backgroundSize: "16px 16px",
                  boxShadow: "inset 0 0 0 1px rgba(120,110,170,.14), inset 0 2px 6px rgba(120,110,170,.12)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex h-[40px] items-center justify-around border-t border-violet-200/70 bg-white/70">
                <Smile className="size-[18px] text-violet-600" strokeWidth={2.4} aria-hidden="true" />
                <Heart className="size-[18px] text-slate-400" strokeWidth={2.2} aria-hidden="true" />
                <Star className="size-[18px] text-slate-400" strokeWidth={2.2} aria-hidden="true" />
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(115deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,0) 28%)" }}
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
