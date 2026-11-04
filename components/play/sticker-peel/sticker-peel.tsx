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
import { Battery, Heart, PenLine, RotateCcw, Smile, Star, Sticker, Undo2 } from "lucide-react";
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
  /** Plays a hands-free demo for the gallery card: stickers peel off the phone one by one,
   *  get slapped onto the iPad journal, hold, then peel back and repeat. Pointer input is
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
/** Scale of a sticker sitting in the phone's grid, in the hand, and stuck on the page. */
const PHONE_S = 0.9;
const CARRY_S = 1.3;
const PLACED_S = 1.15;

type LayoutName = "row" | "col";
type Rect = { x: number; y: number; w: number; h: number };

type Geometry = {
  W: number;
  H: number;
  ipad: Rect;
  /** The iPad's glass, toolbar included. */
  glass: Rect;
  /** The journal pages: where stickers can be stuck. */
  paper: Rect;
  /** How much the 676 x 450 journal is scaled down to fit the glass. */
  jScale: number;
  phone: Rect;
  /** Where the grid panel sits on the phone screen, relative to the screen. */
  panel: { top: number; height: number };
  slots: { x: number; y: number }[];
};

/** The journal spread is drawn at this size, then scaled to the glass. */
const J_W = 676;
const J_H = 450;
const TOOLBAR = 26;

function geometry(layout: LayoutName): Geometry {
  if (layout === "row") {
    const ipad = { x: 0, y: 10, w: 720, h: 520 };
    const glass = { x: ipad.x + 22, y: ipad.y + 22, w: 676, h: 476 };
    const phone = { x: 750, y: 30, w: 230, h: 480 };
    const screen = { x: phone.x + 10, y: phone.y + 10 };
    const slots = Array.from({ length: 8 }, (_, i) => ({
      x: screen.x + (i % 2 === 0 ? 63 : 167),
      y: screen.y + 122 + 82 * Math.floor(i / 2),
    }));
    const paper = { x: glass.x, y: glass.y + TOOLBAR, w: glass.w, h: glass.h - TOOLBAR };
    return { W: 980, H: 540, ipad, glass, paper, jScale: 1, phone, panel: { top: 88, height: 340 }, slots };
  }
  const ipad = { x: 0, y: 0, w: 520, h: 388 };
  const glass = { x: ipad.x + 22, y: ipad.y + 22, w: 476, h: 344 };
  const phone = { x: 110, y: 408, w: 300, h: 410 };
  const screen = { x: phone.x + 10, y: phone.y + 10 };
  const slots = Array.from({ length: 8 }, (_, i) => ({
    x: screen.x + 55 + 85 * (i % 3),
    y: screen.y + 125 + 82 * Math.floor(i / 3),
  }));
  const paper = { x: glass.x, y: glass.y + TOOLBAR, w: glass.w, h: glass.h - TOOLBAR };
  return { W: 520, H: 818, ipad, glass, paper, jScale: glass.w / J_W, phone, panel: { top: 84, height: 252 }, slots };
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

function starPoints(cx: number, cy: number, ro: number, ri: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? ri : ro;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

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

const STICKERS: StickerDef[] = [
  {
    id: "star",
    label: "Glitter star",
    maxSum: 176,
    art: (u) => (
      <g>
        <polygon points={starPoints(50, 53, 41, 18)} fill={`url(#${u}-g-glitter)`} stroke="#E0407E" strokeWidth={3} strokeLinejoin="round" />
        <polygon points={starPoints(50, 53, 41, 18)} fill={`url(#${u}-p-glitter)`} />
        <polygon points={starPoints(46, 49, 20, 9)} fill="#ffc2dc" opacity={0.55} />
        {sparkle(36, 40, 6, 0)}
        {sparkle(64, 62, 4.5, 1)}
        {sparkle(52, 76, 3.5, 2)}
      </g>
    ),
  },
  {
    id: "hearts",
    label: "Love You hearts",
    maxSum: 178,
    art: () => (
      <g>
        <LoveHeart cx={30} cy={36} s={0.5} fill="#9DB5EE" stroke="#7b94d6" text />
        <LoveHeart cx={70} cy={34} s={0.5} fill="#9FE0C0" stroke="#74c4a0" text />
        <LoveHeart cx={50} cy={68} s={0.58} fill="#F7BFC6" stroke="#e89aa6" text={false} />
      </g>
    ),
  },
  {
    id: "flower",
    label: "Doodle flower",
    maxSum: 172,
    art: () => (
      <g>
        {Array.from({ length: 5 }, (_, k) => {
          const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
          return (
            <circle key={k} cx={50 + 21 * Math.cos(a)} cy={50 + 21 * Math.sin(a)} r={15} fill="#fff" stroke="#EF6A5B" strokeWidth={3.2} />
          );
        })}
        <circle cx={50} cy={50} r={17} fill="#fff" />
        <circle cx={50} cy={50} r={4.5} fill="#EF6A5B" />
        <path d="M42 40 Q50 34 58 40" fill="none" stroke="#EF6A5B" strokeWidth={2} strokeLinecap="round" opacity={0.0} />
      </g>
    ),
  },
  {
    id: "bear",
    label: "Teddy bear",
    maxSum: 176,
    art: () => (
      <g>
        <ellipse cx={50} cy={78} rx={24} ry={17} fill="#B8875A" stroke="#8e6240" strokeWidth={2.4} />
        <circle cx={27} cy={72} r={8.5} fill="#B8875A" stroke="#8e6240" strokeWidth={2.4} />
        <circle cx={73} cy={72} r={8.5} fill="#B8875A" stroke="#8e6240" strokeWidth={2.4} />
        <ellipse cx={50} cy={80} rx={13} ry={10} fill="#E8CBA6" />
        <circle cx={28} cy={20} r={11} fill="#B8875A" stroke="#8e6240" strokeWidth={2.4} />
        <circle cx={72} cy={20} r={11} fill="#B8875A" stroke="#8e6240" strokeWidth={2.4} />
        <circle cx={28} cy={20} r={5.5} fill="#E8CBA6" />
        <circle cx={72} cy={20} r={5.5} fill="#E8CBA6" />
        <circle cx={50} cy={42} r={27} fill="#C9976A" stroke="#8e6240" strokeWidth={2.4} />
        <ellipse cx={50} cy={51} rx={12} ry={9} fill="#EBD3B4" />
        <ellipse cx={50} cy={47} rx={4.4} ry={3.2} fill="#4a2f1f" />
        <circle cx={38} cy={37} r={2.8} fill="#3a2418" />
        <circle cx={62} cy={37} r={2.8} fill="#3a2418" />
        <path d="M50 50 V54 M44 56 Q50 60 56 56" fill="none" stroke="#4a2f1f" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M40 66 L50 70 L60 66 L60 74 L50 70 L40 74 Z" fill="#F78FB3" stroke="#d9668f" strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M36 28 Q42 22 50 22" fill="none" stroke="#e6c19a" strokeWidth={3.5} strokeLinecap="round" opacity={0.7} />
      </g>
    ),
  },
  {
    id: "smiley",
    label: "Smiley doodle",
    maxSum: 172,
    art: () => (
      <g>
        <path
          d="M50 13 C72 12 88 28 87 50 C86 73 70 88 49 87 C27 86 12 71 13 49 C14 28 29 14 50 13 Z"
          fill="#FFF4B0"
          stroke="#1f1f24"
          strokeWidth={3.4}
          strokeLinejoin="round"
        />
        <ellipse cx={37} cy={42} rx={8} ry={10} fill="#fff" stroke="#1f1f24" strokeWidth={3} />
        <ellipse cx={63} cy={42} rx={8} ry={10} fill="#fff" stroke="#1f1f24" strokeWidth={3} />
        <circle cx={39} cy={44} r={3.6} fill="#1f1f24" />
        <circle cx={61} cy={44} r={3.6} fill="#1f1f24" />
        <path d="M32 64 Q50 80 68 64" fill="none" stroke="#1f1f24" strokeWidth={3.4} strokeLinecap="round" />
        <circle cx={24} cy={60} r={4.5} fill="#FF9DB2" opacity={0.7} />
        <circle cx={76} cy={60} r={4.5} fill="#FF9DB2" opacity={0.7} />
      </g>
    ),
  },
  {
    id: "photo",
    label: "Mini photo print",
    maxSum: 192,
    art: (u) => (
      <g>
        <rect x={13} y={11} width={74} height={78} rx={3} fill="#fff" stroke="#dcdce3" strokeWidth={1.5} />
        <svg x={19} y={17} width={62} height={52} viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice">
          <BeachPhoto uid={u} />
        </svg>
        <path d="M45 79 Q50 74 55 79 Q60 85 50 88 Q40 85 45 79 Z" fill="#F7BFC6" opacity={0.9} />
      </g>
    ),
  },
  {
    id: "label",
    label: "Put your day in here label",
    maxSum: 186,
    art: () => (
      <g transform="rotate(-5 50 50)">
        <polygon
          points="8,30 12,27 16,31 21,27 26,31 31,27 36,31 41,27 46,31 51,27 56,31 61,27 66,31 71,27 76,31 81,27 86,31 92,28 94,36 90,44 94,52 90,60 93,68 88,72 84,69 79,73 74,69 69,73 64,69 59,73 54,69 49,73 44,69 39,73 34,69 29,73 24,69 19,73 14,70 8,72 11,62 7,54 11,46 7,38"
          fill="#F4F2EF"
          stroke="#cfcac4"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <text
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill="#2b2b33"
          style={{ fontFamily: 'var(--font-instrument-serif, Georgia, "Times New Roman", serif)' }}
        >
          <tspan x={50} y={46}>Put your day</tspan>
          <tspan x={50} y={62}>in here</tspan>
        </text>
      </g>
    ),
  },
  {
    id: "checker",
    label: "Pastel checker note",
    maxSum: 192,
    art: (u) => (
      <g transform="rotate(5 50 50)">
        <rect x={14} y={14} width={72} height={72} rx={3} fill={`url(#${u}-p-chk)`} stroke="#e9a8b8" strokeWidth={1.6} />
        <rect x={24} y={30} width={52} height={40} rx={2} fill="#fff" opacity={0.82} />
        <path d="M29 40 H70 M29 50 H64 M29 60 H58" fill="none" stroke="#7b7f96" strokeWidth={2} strokeLinecap="round" strokeDasharray="5 3" />
        <rect x={34} y={8} width={32} height={11} rx={1.5} fill="#cfe3f7" opacity={0.9} transform="rotate(-3 50 14)" />
      </g>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/* Shared SVG filters                                                         */
/* -------------------------------------------------------------------------- */

const FILTER_BOX = { x: -15, y: -15, width: 130, height: 130, filterUnits: "userSpaceOnUse" } as const;

/** Blur then threshold the artwork's alpha: a rounded silhouette a few units wider. */
const GROW = (
  <>
    <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="blur" />
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
      <defs>
        <linearGradient id={`${uid}-g-sea`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#12386b" />
          <stop offset="1" stopColor="#0a2447" />
        </linearGradient>
        <linearGradient id={`${uid}-g-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aebfd1" />
          <stop offset="1" stopColor="#e6ecf1" />
        </linearGradient>
        <linearGradient id={`${uid}-g-turq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" stopColor="#1fb3c8" />
          <stop offset="0.7" stopColor="#8fe6d8" />
        </linearGradient>
        <linearGradient id={`${uid}-g-glitter`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9ccb" />
          <stop offset="0.5" stopColor="#ff5fa8" />
          <stop offset="1" stopColor="#ff86bd" />
        </linearGradient>
        <pattern id={`${uid}-p-glitter`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#fff" opacity="0.8" />
          <circle cx="6.5" cy="5.5" r="0.8" fill="#ffe3f1" opacity="0.9" />
          <circle cx="4" cy="8" r="0.6" fill="#fff" opacity="0.6" />
        </pattern>
        <pattern id={`${uid}-p-chk`} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#f7bfce" />
          <rect width="12" height="12" fill="#c4ebd0" />
          <rect x="12" y="12" width="12" height="12" fill="#c4ebd0" />
        </pattern>
        {/* The die-cut look: a thick white border behind the artwork. */}
        <filter id={`${uid}-die`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#ffffff" result="white" />
          <feComposite in="white" in2="grown" operator="in" result="border" />
          <feMerge>
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {tint("silh", "#ffffff", 1, 0)}
        {tint("back", "#f6f2fc", 1, 0)}
        {tint("tight", "#231946", 0.9, 1.3)}
        {tint("soft", "#231946", 0.9, 5)}
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
      width={S * PHONE_S}
      height={S * PHONE_S}
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
  const { def, uid, home, z, interactive, reduce, label, bounds, apiRef, toLogical, onDrop, onHeld, onRaise, onKey, onDouble } = props;
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

  const art = def.art(uid);
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
            <stop offset="0.4" stopColor="#7ff5e6" stopOpacity={0.5} />
            <stop offset="0.48" stopColor="#fff" stopOpacity={0.8} />
            <stop offset="0.56" stopColor="#ff8fe0" stopOpacity={0.5} />
            <stop offset="0.66" stopColor="#ffe97a" stopOpacity={0.4} />
            <stop offset="0.76" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${sid}-shade`} gradientUnits="userSpaceOnUse" x1={40} y1={40} x2={125} y2={125}>
            <stop offset="0" stopColor="#5a508c" stopOpacity={0.42} />
            <stop offset="0.3" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.7" stopColor="#fff" stopOpacity={0.1} />
            <stop offset="1" stopColor="#786eaa" stopOpacity={0.38} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${sid}-cm)`}>
          <g filter={`url(#${uid}-die)`}>{art}</g>
          <g mask={`url(#${sid}-mk)`}>
            <g mask={undefined}>
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
      {pinPos ? <span className="absolute size-[22px] rounded-full" style={{ ...pinPos, background: "rgba(128,128,134,.85)" }} /> : null}
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
    <svg className="absolute" style={{ left: x, top: y }} width={size} height={size} viewBox="0 0 60 60" fill="none" stroke="#EF5B4C" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Array.from({ length: 5 }, (_, k) => {
        const a = (k * 2 * Math.PI) / 5 - Math.PI / 2;
        return <ellipse key={k} cx={30 + 15 * Math.cos(a)} cy={30 + 15 * Math.sin(a)} rx={9} ry={10.5} transform={`rotate(${(k * 72) % 360} ${30 + 15 * Math.cos(a)} ${30 + 15 * Math.sin(a)})`} />;
      })}
      <circle cx={30} cy={30} r={3} fill="#EF5B4C" />
    </svg>
  );
}

function Journal({ uid }: { uid: string }) {
  const ruled = Array.from({ length: 15 }, (_, i) => 140 + i * 21);
  return (
    <div className="absolute left-0 top-0 overflow-hidden bg-white" style={{ width: J_W, height: J_H }}>
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
      <svg className="absolute" style={{ left: 176, top: 382 }} width={142} height={44} viewBox="0 0 142 44" aria-hidden="true">
        <LoveHeart cx={22} cy={22} s={0.42} fill="#9DB5EE" stroke="#7b94d6" text />
        <LoveHeart cx={71} cy={22} s={0.42} fill="#9FE0C0" stroke="#74c4a0" text />
        <LoveHeart cx={120} cy={22} s={0.42} fill="#F7BFC6" stroke="#e89aa6" text={false} />
      </svg>
      <div className="absolute h-px bg-[#c9cad3]" style={{ left: 22, width: 294, top: 436 }} />

      {/* ---- right page ---- */}
      <PageHeader x={J_W / 2} date="24 . 11 . 5" day={3} tone="pink" topic="작은 행복 모으기" items={["water the plants", "swim on saturday!", ""]} />
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
      <Photo x={J_W / 2 + 182} y={322} w={130} h={96} rot={-4} pin="tr">
        <BeachPhoto uid={uid} />
      </Photo>
      <div
        className="absolute"
        style={{
          left: J_W / 2 + 28,
          top: 346,
          width: 118,
          height: 72,
          transform: "rotate(3deg)",
          background: `conic-gradient(#f7bfce 25%, #c4ebd0 0 50%, #f7bfce 0 75%, #c4ebd0 0) 0 0 / 24px 24px`,
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
 * A phone holds a pack of die-cut stickers, and an iPad shows a scrapbook journal spread beside it.
 * Press a sticker to curl its corner and peel it off the glass, carry it over
 * the journal and let go to slap it down. Drop it anywhere else and it springs
 * back to its slot on the phone.
 *
 * Keyboard: Enter or Space on a phone sticker sticks it at the next free spot.
 * On the journal, arrow keys nudge (Shift for bigger steps), `[` and `]`
 * rotate, and Delete or Backspace sends it back to the phone. Double-click does
 * the same.
 */
export function StickerPeel({ loop = false, onChange, className }: StickerPeelProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = `sp${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hostRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);

  const [view, setView] = React.useState<{ layout: LayoutName; scale: number; ready: boolean }>({
    layout: "row",
    scale: 1,
    ready: false,
  });
  const [items, setItems] = React.useState<ItemState[]>(INITIAL_ITEMS);
  const [held, setHeld] = React.useState<Set<number>>(() => new Set());
  const [status, setStatus] = React.useState("");

  const geo = React.useMemo(() => geometry(view.layout), [view.layout]);
  const [rng] = React.useState(() => Math.random);
  const zRef = React.useRef(0);
  const apis = React.useRef<(ItemApi | null)[]>([]);

  // Scale the whole scene to the space it has, and pick the layout that fits best.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const w = Math.max(1, host.clientWidth - 16);
      const h = Math.max(1, host.clientHeight - 16);
      const row = geometry("row");
      const col = geometry("col");
      const sRow = Math.min(w / row.W, h / row.H);
      const sCol = Math.min(w / col.W, h / col.H);
      const useCol = loop || sCol > sRow * 1.02;
      const cap = loop ? 0.86 : 1.2;
      const scale = clamp(useCol ? sCol : sRow, 0.2, cap);
      setView((v) => (v.layout === (useCol ? "col" : "row") && Math.abs(v.scale - scale) < 0.002 && v.ready ? v : { layout: useCol ? "col" : "row", scale, ready: true }));
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

  const { paper, ipad, glass, slots } = geo;
  const marginU = (S * PLACED_S * 0.42) / paper.w;
  const marginV = (S * PLACED_S * 0.42) / paper.h;
  const toUV = (x: number, y: number) => ({
    u: clamp((x - paper.x) / paper.w, marginU, 1 - marginU),
    v: clamp((y - paper.y) / paper.h, marginV, 1 - marginV),
  });
  const overNotebook = (x: number, y: number) =>
    x > glass.x - 6 && x < glass.x + glass.w + 6 && y > glass.y - 6 && y < glass.y + glass.h + 6;

  const homeOf = (it: ItemState, i: number): Home =>
    it.placed
      ? { x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h, rot: it.rot, s: PLACED_S, placed: true }
      : { x: slots[i].x, y: slots[i].y, rot: 0, s: PHONE_S, placed: false };

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
    setStatus("All stickers are back on the phone");
  };

  const onDrop = (i: number, moved: boolean, x: number, y: number) => {
    const it = items[i];
    if (overNotebook(x, y)) {
      if (it.placed && !moved) {
        place(i, it.u, it.v, it.rot);
        return;
      }
      const { u, v } = toUV(x, y);
      place(i, u, v, (rng() * 2 - 1) * 12);
      setStatus(`${STICKERS[i].label} stuck on the journal`);
    } else {
      sendBack(i);
      setStatus(`${STICKERS[i].label} is back on the phone`);
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
      setStatus(`${STICKERS[i].label} is back on the phone`);
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
  }, [loop, view.ready, view.layout]);

  const anyPlaced = items.some((it) => it.placed);
  const onPhone = items.filter((it) => !it.placed).length;
  const interactive = !loop;
  const { phone, panel } = geo;

  return (
    <div
      ref={hostRef}
      className={cn("relative flex h-full min-h-[520px] w-full select-none items-center justify-center overflow-hidden", className)}
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
          className="absolute rounded-[36px]"
          style={{
            left: ipad.x,
            top: ipad.y,
            width: ipad.w,
            height: ipad.h,
            background: "linear-gradient(145deg,#f1f2f5 0%,#cfd2d9 50%,#b9bdc7 100%)",
            boxShadow: "0 30px 50px -18px rgba(30,30,60,.5), 0 8px 16px rgba(30,30,60,.2), inset 0 1px 0 rgba(255,255,255,.9)",
          }}
        >
          <span className="absolute -right-[2px] top-[70px] h-[44px] w-[3px] rounded-r-[2px] bg-[#b4b8c2]" />
          <span className="absolute -top-[2px] right-[90px] h-[3px] w-[40px] rounded-t-[2px] bg-[#b4b8c2]" />
          <div className="absolute inset-[3px] rounded-[33px] bg-[#0c0d11]" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
            <span className="absolute left-1/2 top-[8px] size-[6px] -translate-x-1/2 rounded-full bg-[#1d2230]" style={{ boxShadow: "inset 0 0 0 1px #2b3144" }} />
          </div>
          <div
            className="absolute overflow-hidden rounded-[12px] bg-white"
            style={{ left: glass.x - ipad.x, top: glass.y - ipad.y, width: glass.w, height: glass.h }}
          >
            <div className="absolute inset-x-0 top-0 flex items-center gap-3 border-b border-[#e3e4ea] bg-[#f6f6f8] px-3" style={{ height: TOOLBAR }}>
              <PenLine className="size-[13px] text-slate-400" strokeWidth={2} aria-hidden="true" />
              <Sticker className="size-[13px] text-slate-500" strokeWidth={2} aria-hidden="true" />
              <Undo2 className="size-[13px] text-slate-400" strokeWidth={2} aria-hidden="true" />
              <span className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-wide text-slate-400">Daily Journal</span>
            </div>
            <div className="absolute left-0" style={{ top: TOOLBAR, width: J_W, height: J_H, transform: `scale(${geo.jScale})`, transformOrigin: "0 0" }}>
              <Journal uid={uid} />
            </div>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(115deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 30%)" }}
            />
          </div>
        </div>

        {/* Phone */}
        <div
          className="absolute rounded-[46px]"
          style={{
            left: phone.x,
            top: phone.y,
            width: phone.w,
            height: phone.h,
            background: "linear-gradient(145deg,#4a4d5c 0%,#23252e 40%,#16171d 100%)",
            boxShadow:
              "0 28px 44px -16px rgba(20,18,50,.55), 0 6px 14px rgba(20,18,50,.25), inset 0 0 0 1.5px rgba(255,255,255,.18), inset 0 0 0 4px rgba(0,0,0,.5)",
          }}
        >
          <span className="absolute -left-[3px] top-[96px] h-[30px] w-[4px] rounded-l-[3px] bg-[#2b2d37]" />
          <span className="absolute -left-[3px] top-[138px] h-[52px] w-[4px] rounded-l-[3px] bg-[#2b2d37]" />
          <span className="absolute -right-[3px] top-[130px] h-[70px] w-[4px] rounded-r-[3px] bg-[#2b2d37]" />
          <div
            className="absolute inset-[10px] overflow-hidden rounded-[36px]"
            style={{ background: "linear-gradient(180deg,#f8f6ff 0%,#ebe7fb 100%)" }}
          >
            <span className="absolute left-[24px] top-[12px] text-[11px] font-semibold text-slate-800">9:41</span>
            <span className="absolute left-1/2 top-[9px] h-[22px] w-[74px] -translate-x-1/2 rounded-full bg-black" />
            <Battery className="absolute right-[22px] top-[11px] size-[15px] text-slate-800" strokeWidth={2} aria-hidden="true" />
            <div className="absolute left-[20px] right-[20px] top-[40px] flex items-end justify-between">
              <div>
                <p className="text-[20px] font-extrabold leading-none tracking-tight text-slate-900">Stickers</p>
                <p className="mt-1 text-[11px] font-medium text-violet-600">Journal Pack</p>
              </div>
              <span className="rounded-full bg-violet-600 px-2 py-[2px] text-[10px] font-bold text-white">{onPhone} left</span>
            </div>
            <div
              className="absolute left-[10px] right-[10px] rounded-[22px]"
              style={{
                top: panel.top,
                height: panel.height,
                backgroundColor: "rgba(255,255,255,.78)",
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(120,110,170,.22) 1px, transparent 1.4px)",
                backgroundSize: "16px 16px",
                boxShadow: "inset 0 0 0 1px rgba(120,110,170,.14), inset 0 2px 6px rgba(120,110,170,.12)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-around border-t border-violet-200/70 bg-white/85">
              <Smile className="size-5 text-violet-600" strokeWidth={2.4} aria-hidden="true" />
              <Heart className="size-5 text-slate-400" strokeWidth={2.2} aria-hidden="true" />
              <Star className="size-5 text-slate-400" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(115deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 32%)" }}
            />
          </div>
        </div>

        {/* Ghosts: the die-cut slot a sticker left behind */}
        {STICKERS.map((def, i) => (
          <div
            key={`g-${def.id}`}
            className="pointer-events-none absolute"
            style={{ left: slots[i].x - (S * PHONE_S) / 2, top: slots[i].y - (S * PHONE_S) / 2, width: S * PHONE_S, height: S * PHONE_S, zIndex: 1 }}
          >
            <Ghost def={def} uid={uid} visible={items[i].placed || held.has(i)} />
          </div>
        ))}

        {/* Stickers live in their own top layer, so they can leave the phone's glass */}
        {STICKERS.map((def, i) => {
          const it = items[i];
          const label = it.placed
            ? `${def.label} sticker on the journal. Arrow keys move it, brackets rotate it, Delete returns it to the phone.`
            : `${def.label} sticker on the phone. Press Enter to stick it on the journal, or drag it there.`;
          return (
            <StickerItem
              key={`${view.layout}-${def.id}`}
              def={def}
              uid={uid}
              home={homeOf(it, i)}
              z={it.placed ? it.z : 2}
              interactive={interactive}
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
                  setStatus(`${def.label} is back on the phone`);
                }
              }}
            />
          );
        })}

        {!loop ? (
          <button
            type="button"
            onClick={reset}
            disabled={!anyPlaced}
            className="absolute inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-[2px] text-[11px] font-semibold text-slate-700 shadow-[0_2px_8px_rgba(30,40,70,.22)] outline-none transition-opacity hover:bg-white focus-visible:ring-4 focus-visible:ring-sky-500 disabled:opacity-40"
            style={{ left: glass.x + glass.w - 78, top: glass.y + 3, zIndex: 3000 }}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
