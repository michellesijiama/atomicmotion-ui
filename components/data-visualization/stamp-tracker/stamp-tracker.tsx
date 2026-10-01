"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion, motionValue, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { AnimationPlaybackControls, MotionValue } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Stamp Tracker — four habits as a deck of tall blocks of risograph colour on a bare black phone
// screen — cocoa, pink, sky and mint, each with its own pattern ink — fanned like a loose stack
// of paper. A Day / Week / Month switch at the top chooses what a card shows: one big stamp for
// today, a row of seven days, or the whole month. Tap a day and a rubber stamp comes down on it,
// leaving the habit's silhouette printed in the pattern ink, rough at the edge and speckled where
// the drum ran dry. The empty middle of each card holds a loose hand-inked line drawing with a
// tiny person in it. Swipe by dragging, with a finger or a two-finger trackpad swipe: the card
// follows the hand and the stack rises behind it.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type HabitId = "coffee" | "move" | "water" | "read";

export type StampTrackerProps = {
  /** Date treated as today; the cards show its month and its week. Defaults to 2026-09-30 so SSR and gallery posters are deterministic. */
  today?: Date;
  /** Gallery card: stamp today on each card in turn and swipe on, until the user interacts. */
  loop?: boolean;
  /** A person stamped or lifted a day. `date` is an ISO date, e.g. "2026-09-14". */
  onChange?: (habit: HabitId, date: string, stamped: boolean) => void;
  className?: string;
};

type View = "day" | "week" | "month";

/* ───────────────────────────── palette & type ───────────────────────────── */

const INK = "#2B2A33";
/** The phone screen the deck sits on: black, with no bezel. */
const SCREEN = "#0B0B0C";
/** The Day / Week / Month switch on it. */
const SWITCH = {
  track: "rgba(255,255,255,0.1)",
  inactive: "rgba(255,255,255,0.62)",
  thumb: "#FFFFFF",
  thumbText: "#0B0B0C",
};
const FONT = "var(--font-poppins, Poppins), Poppins, ui-sans-serif, system-ui, sans-serif";

type Habit = {
  id: HabitId;
  name: string;
  /** The card: a flat block of riso colour, like the blocks on the book cover. */
  card: string;
  /** The card's type and rings: a deep tone of the pattern that reads clearly on the card (4.5:1 or better). */
  text: string;
  /** The stamp: the pattern ink printed on that block — the disc, its rings and the card's type. */
  stamp: string;
  /** Share of past days that start out stamped. */
  seed: number;
};

const HABITS: readonly Habit[] = [
  { id: "coffee", name: "Coffee", card: "#9C7158", text: "#0C0603", stamp: "#EDBC9F", seed: 0.68 },
  { id: "move", name: "Move", card: "#F2B6CB", text: "#285949", stamp: "#4FAE8F", seed: 0.62 },
  { id: "water", name: "Water", card: "#6BAEE5", text: "#113D61", stamp: "#F8DF3E", seed: 0.66 },
  { id: "read", name: "Read", card: "#5DB896", text: "#353178", stamp: "#6560BE", seed: 0.64 },
];

const VIEWS: readonly { id: View; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

/* ───────────────────────────── layout tokens ───────────────────────────── */

/** The phone: a bare rounded screen in iPhone proportions. */
const SURFACE_W = 340;
const SURFACE_H = 736;
const SURFACE_RADIUS = 60;

/** The Day / Week / Month switch, centred near the top. */
const SWITCH_TOP = 64;
const SWITCH_W = 216;
const SWITCH_H = 36;

const CARD_MARGIN = 20;
const CARD_W = SURFACE_W - CARD_MARGIN * 2;
const CARD_H = 504;
/** The deck block (the peeks plus the card) sits centred in the space under the switch. */
const PEEK_TOP = 60;
const DECK_REGION_TOP = SWITCH_TOP + SWITCH_H + 16;
const DECK_REGION_BOTTOM = SURFACE_H - 40;
const DECK_TOP = Math.round((DECK_REGION_TOP + DECK_REGION_BOTTOM - CARD_H - PEEK_TOP) / 2) + PEEK_TOP;
const DECK_BOTTOM = SURFACE_H - DECK_TOP - CARD_H;
const CARD_RADIUS = 36;
const CARD_PAD = 24;
/** The grids reach a little into the card's side padding, so a row runs nearly edge to edge. */
const GRID_BLEED = 4;
/** Where each card sits in the stack. All four show: the three behind are smaller and narrower, pivot about their top edge and tilt a little, so only their rounded tops show above the front card. */
const SLOTS = [
  { y: 0, scale: 1, rotate: 0 },
  { y: -20, scale: 0.88, rotate: -2.2 },
  { y: -38, scale: 0.77, rotate: 2.5 },
  { y: -54, scale: 0.66, rotate: -1.5 },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const DEFAULT_TODAY = new Date(2026, 8, 30);


/** A stamp button's size, and how far a fresh print throws ink. */
const VARIANT = {
  cell: { size: 31, pad: 4, speck: [2, 3], reach: 5, fling: 3, tilt: 20, num: 12 },
  week: { size: 34, pad: 4, speck: [2, 3], reach: 5, fling: 3, tilt: 20, num: 13 },
  day: { size: 150, pad: 12, speck: [3, 5], reach: 9, fling: 8, tilt: 8, num: 0 },
} as const;
type Variant = keyof typeof VARIANT;

/* ───────────────────────────── seeded hashing & dates ───────────────────────────── */

/** FNV-1a over a string, mapped to [0, 1). No Math.random, so server and client agree. */
function hash01(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** A local date as "YYYY-MM-DD". */
function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Habit → the ISO dates that carry a stamp. */
type Stamps = Record<HabitId, ReadonlySet<string>>;

/** One day of a calendar: its ISO date, its day of the month and how to say it aloud. */
type Cell = { iso: string; day: number; spoken: string };

type Calendar = {
  todayIso: string;
  month: { name: string; cells: (Cell | null)[]; todayCol: number };
  week: { range: string; cells: Cell[] };
  day: { weekday: string; label: string };
};

/* ───────────────────────────── the silhouettes ───────────────────────────── */

// Soft block shapes on a 100 × 100 sheet. Every shape is filled and stroked in the same ink
// with round joins, so corners come out rounded; the knock-outs are round dots and pills (the
// stroke eats a little of each, so they are drawn a touch larger than they print).

function Figure({ habit, ink }: { habit: HabitId; ink: string }) {
  return (
    <g fill={ink} stroke={ink} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
      {habit === "coffee" ? (
        <>
          <rect x="36" y="14" width="3" height="6" />
          <rect x="50" y="9" width="3" height="6" />
          <path fillRule="evenodd" d="M28 36H60V65A10 10 0 0 1 50 75H38A10 10 0 0 1 28 65Z M34 51a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z" />
          <path d="M61 45h6a8 8 0 0 1 0 20h-6" fill="none" strokeWidth={6} />
        </>
      ) : null}
      {habit === "move" ? (
        <g transform="rotate(-28 50 50)">
          <path d="M18 50H82" fill="none" strokeWidth={6} />
          <rect x="29" y="34" width="4" height="32" strokeWidth={9} />
          <rect x="67" y="34" width="4" height="32" strokeWidth={9} />
          <rect x="19" y="42" width="2" height="16" strokeWidth={8} />
          <rect x="79" y="42" width="2" height="16" strokeWidth={8} />
        </g>
      ) : null}
      {habit === "water" ? (
        <path
          fillRule="evenodd"
          d="M50 15L64 39L70 52V62L64 72L56 77H44L36 72L30 62V52L36 39Z M33 60a8 8 0 1 0 16 0a8 8 0 1 0 -16 0Z"
        />
      ) : null}
      {habit === "read" ? (
        <>
          <path fillRule="evenodd" d="M19 38L46 44V73L19 67Z M25 51h13a4.5 4.5 0 0 1 0 9h-13a4.5 4.5 0 0 1 0 -9Z" />
          <path fillRule="evenodd" d="M54 44L81 38V67L54 73Z M62 51h13a4.5 4.5 0 0 1 0 9h-13a4.5 4.5 0 0 1 0 -9Z" />
          <circle cx="50" cy="25" r="2.5" />
        </>
      ) : null}
    </g>
  );
}

/**
 * The inked shape: a round disc of flat riso ink with the silhouette in a second ink laid
 * over it. A faint multiplied ghost of the silhouette, a hair out of register, shows where
 * the two passes overprint. `textured` is the id of a shared riso-ink filter.
 */
function Print({ habit, textured }: { habit: Habit; textured?: string }) {
  // The pattern itself in the stamp ink, printed straight onto the card like the houses on the cover —
  // no disc behind it. Grown a little so it fills the day's circle.
  const content = (
    <g transform="translate(50 50) scale(1.18) translate(-50 -50)">
      <Figure habit={habit.id} ink={habit.stamp} />
    </g>
  );
  return textured ? <g filter={`url(#${textured})`}>{content}</g> : content;
}

/* ───────────────────────────── the card's illustration ───────────────────────────── */

// A loose, hand-inked tabletop for each habit, in the card's pattern ink alone: thin wobbly outlines,
// a flat three-quarter view, objects scattered with room between them, one or two of them filled solid
// and the rest left as paper (the card colour), a scatter of tiny marks, and a tiny person getting up
// to something at a much smaller scale. Every outline is drawn point by point with a little seeded
// irregularity, so no circle is a perfect circle and no line is quite straight. Drawn on a 240 × 190 sheet.

type Pt = readonly [number, number];
const f1 = (n: number) => Math.round(n * 10) / 10;

/** A smooth curve through the points (Catmull-Rom as cubic Béziers), open or closed. */
function curve(pts: readonly Pt[], closed: boolean) {
  const n = pts.length;
  const at = (k: number) => (closed ? pts[(k + n) % n] : pts[Math.max(0, Math.min(n - 1, k))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let k = 0; k < segs; k += 1) {
    const p0 = at(k - 1);
    const p1 = at(k);
    const p2 = at(k + 1);
    const p3 = at(k + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** A slightly uneven ellipse. */
function ell(cx: number, cy: number, rx: number, ry: number, seed: string, rot = 0) {
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k += 1) {
    const a = (k / 10) * Math.PI * 2;
    const j = 1 + (hash01(`${seed}:${k}`) - 0.5) * 0.08;
    const x = rx * j * Math.cos(a);
    const y = ry * j * Math.sin(a);
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return curve(pts, true);
}

/** Straight edges that bow a hair off true, like a pen ruled by eye. */
function poly(pts: readonly Pt[], seed: string, closed = true, amt = 1.1) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const segs = closed ? pts.length : pts.length - 1;
  for (let k = 0; k < segs; k += 1) {
    const a = pts[k];
    const b = pts[(k + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const off = (hash01(`${seed}:${k}`) - 0.5) * 2 * amt;
    d += `Q${f1((a[0] + b[0]) / 2 - ((b[1] - a[1]) / len) * off)} ${f1((a[1] + b[1]) / 2 + ((b[0] - a[0]) / len) * off)} ${f1(b[0])} ${f1(b[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** An open line with a little wander in it. */
function line(pts: readonly Pt[], seed: string, amt = 0.7) {
  return curve(
    pts.map((p, k) => (k === 0 || k === pts.length - 1 ? p : ([p[0] + (hash01(`${seed}x${k}`) - 0.5) * 2 * amt, p[1] + (hash01(`${seed}y${k}`) - 0.5) * 2 * amt] as const))),
    false,
  );
}

/** A little drop, point up. */
const drop = (x: number, y: number, h: number) =>
  curve([[x, y], [x + h * 0.3, y + h * 0.5], [x + h * 0.34, y + h * 0.78], [x, y + h], [x - h * 0.34, y + h * 0.78], [x - h * 0.3, y + h * 0.5]], true);

function Scene({ habit, ink, paper }: { habit: HabitId; ink: string; paper: string }) {
  // Each mark is one of: an outline over paper, a solid, or a bare line.
  const O = (d: string, key: string, extra?: React.SVGProps<SVGPathElement>) => <path key={key} d={d} fill={paper} {...extra} />;
  const S = (d: string, key: string, extra?: React.SVGProps<SVGPathElement>) => <path key={key} d={d} fill={ink} {...extra} />;
  const L = (d: string, key: string, extra?: React.SVGProps<SVGPathElement>) => <path key={key} d={d} fill="none" {...extra} />;
  const dot = (x: number, y: number, r = 1.4) => <circle key={`dot-${x}-${y}`} cx={x} cy={y} r={r} fill={ink} stroke="none" />;
  // The tiny person: a dot of a head, a soft bean of a body, thin limbs. `limbs` are open lines.
  const person = (hx: number, hy: number, body: readonly Pt[], limbs: readonly (readonly Pt[])[], seed: string) => (
    <g key={seed}>
      {limbs.map((l, k) => L(line(l, `${seed}l${k}`, 0.3), `${seed}-limb-${k}`))}
      {O(curve(body, true), `${seed}-body`)}
      <ellipse cx={hx} cy={hy} rx={3.7} ry={3.9} fill={ink} />
    </g>
  );

  return (
    <g stroke={ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke">
      {habit === "coffee" ? (
        <>
          {/* A cup on its saucer, coffee a solid ellipse, one curl of steam. */}
          {O(ell(84, 152, 56, 15, "sau"), "sau")}
          {L(ell(84, 153, 33, 8, "sau2"), "sau2", { strokeWidth: 1.4, opacity: 0.7 })}
          {O(curve([[50, 114], [53, 134], [66, 150], [84, 154], [102, 150], [115, 134], [118, 114]], false) + "Z", "cup")}
          {L(line([[117, 122], [133, 120], [138, 134], [127, 146], [111, 146]], "handle"), "handle")}
          {O(ell(84, 114, 34, 9, "rim"), "rim")}
          {S(ell(84, 115.5, 28, 6.4, "cof"), "cof")}
          {L(line([[78, 98], [70, 88], [82, 78], [74, 66], [80, 56]], "st1"), "st1")}
          {L(line([[96, 100], [102, 91], [94, 83]], "st2", 0.4), "st2")}
          {/* A stovetop moka pot, solid below the waist. */}
          {S(poly([[168, 152], [210, 152], [204, 122], [174, 122]], "moka1"), "moka1")}
          {O(poly([[174, 122], [178, 88], [200, 88], [204, 122]], "moka2"), "moka2")}
          {O(curve([[176, 88], [180, 77], [190, 72], [200, 77], [204, 88]], false) + "Z", "lid")}
          {S(ell(190, 69, 3, 2.6, "knob"), "knob")}
          {L(line([[204, 97], [218, 99], [220, 114], [205, 117]], "mh"), "mh")}
          {L(line([[177, 93], [170, 89]], "sp", 0.2), "spout")}
          {L(line([[181, 106], [201, 106]], "band", 0.4), "band", { strokeWidth: 1.4 })}
          {/* A spoon lying across, and two sugar cubes. */}
          {L(line([[130, 179], [156, 173], [178, 169]], "spoonh"), "spoonh")}
          {O(ell(187, 167, 10, 6, "spoon", -0.22), "spoon")}
          {O(poly([[146, 142], [158, 142], [158, 153], [146, 153]], "c1f"), "c1f")}
          {O(poly([[146, 142], [150, 137], [162, 137], [158, 142]], "c1t"), "c1t")}
          {O(poly([[158, 142], [162, 137], [162, 148], [158, 153]], "c1s"), "c1s")}
          {O(poly([[148, 124], [158, 125], [157, 134], [147, 133]], "c2f", true, 0.8), "c2f")}
          {O(poly([[148, 124], [152, 120], [162, 121], [158, 125]], "c2t", true, 0.8), "c2t")}
          {/* The tiny person, sitting on the saucer's rim hugging their knees. */}
          {person(37, 122, [[32, 130], [40, 127], [45, 134], [44, 142], [34, 143], [31, 136]], [[[37, 131], [47, 135], [44, 141]], [[41, 142], [50, 140]]], "pc")}
          {/* A few coffee beans and specks. */}
          {O(ell(30, 178, 5.5, 3.5, "b1", 0.5), "b1")}
          {L(line([[26, 180], [30, 178], [34, 176]], "b1l", 0.2), "b1l", { strokeWidth: 1.2 })}
          {O(ell(48, 183, 5, 3.3, "b2", -0.4), "b2")}
          {L(line([[44, 184], [48, 183], [52, 181]], "b2l", 0.2), "b2l", { strokeWidth: 1.2 })}
          {dot(18, 120)}
          {dot(24, 86, 1.1)}
          {dot(120, 70, 1.2)}
          {dot(214, 140)}
          {dot(226, 60, 1.1)}
          {dot(150, 100, 1.2)}
        </>
      ) : null}

      {habit === "move" ? (
        <>
          {/* A jump rope, looping loose between two handles. */}
          {L(line([[36, 44], [56, 16], [100, 10], [140, 22], [160, 42], [146, 62], [122, 52], [132, 32], [170, 18], [198, 30]], "rope", 1.2), "rope")}
          {O(ell(26, 50, 5.5, 13, "h1", 0.45), "h1")}
          {O(ell(208, 34, 5.5, 13, "h2", -0.4), "h2")}
          {/* One sneaker solid, one outline, laces as little ticks. */}
          {S(curve([[20, 150], [22, 128], [34, 126], [48, 112], [60, 114], [70, 126], [88, 132], [104, 140], [104, 152], [96, 158], [26, 158]], true), "sn1")}
          {L(line([[24, 150], [100, 150]], "sn1s", 0.4), "sn1s", { stroke: paper, strokeWidth: 1.6 })}
          {L("M50 121l9 -3M54 128l9 -3M60 135l8 -3", "sn1l", { stroke: paper, strokeWidth: 1.6 })}
          <g transform="translate(120 -2) rotate(-7 60 140) scale(0.94 0.94)">
            {O(curve([[20, 150], [22, 128], [34, 126], [48, 112], [60, 114], [70, 126], [88, 132], [104, 140], [104, 152], [96, 158], [26, 158]], true), "sn2")}
            {L(line([[24, 150], [100, 150]], "sn2s", 0.4), "sn2s", { strokeWidth: 1.4 })}
            {L("M50 121l9 -3M54 128l9 -3M60 135l8 -3", "sn2l", { strokeWidth: 1.4 })}
          </g>
          {/* A water bottle, filled low. */}
          {O(curve([[204, 98], [222, 98], [225, 130], [222, 138], [204, 138], [201, 130]], true), "bt")}
          {O(poly([[209, 98], [209, 88], [217, 88], [217, 98]], "btn"), "btn")}
          {S(poly([[208, 80], [218, 80], [218, 88], [208, 88]], "cap"), "cap")}
          {S(curve([[202, 120], [213, 117], [224, 120], [222, 137], [204, 137]], true), "water")}
          {/* The tiny person, up on the sneaker, stretching with one leg high. */}
          {person(60, 86, [[56, 94], [64, 93], [66, 102], [62, 108], [56, 108], [54, 100]], [[[58, 108], [58, 112]], [[62, 108], [72, 100], [76, 92]], [[57, 95], [48, 88], [44, 80]], [[63, 95], [72, 88], [74, 80]]], "pm")}
          {dot(14, 90)}
          {dot(100, 80, 1.2)}
          {dot(112, 120)}
          {dot(160, 96, 1.2)}
          {dot(184, 70)}
          {L("M104 170q4 -3 8 0M170 172q4 -3 8 0M60 176q4 -3 8 0", "ticks", { strokeWidth: 1.4 })}
        </>
      ) : null}

      {habit === "water" ? (
        <>
          {/* A tall glass in three-quarter view, water lines, ice. */}
          {O(curve([[50, 44], [53, 90], [58, 148], [66, 155], [80, 158], [94, 155], [102, 148], [107, 90], [110, 44]], false) + "Z", "glass")}
          {O(ell(80, 44, 30, 8, "grim"), "grim")}
          {S(curve([[56, 84], [60, 80], [80, 86], [100, 80], [105, 84], [102, 148], [96, 154], [80, 157], [64, 154], [58, 148]], true), "wtr")}
          {L(line([[60, 100], [68, 96], [76, 100], [84, 96], [92, 100]], "w1"), "w1", { stroke: paper, strokeWidth: 1.6 })}
          {L(line([[62, 122], [70, 118], [78, 122], [86, 118], [94, 122]], "w2"), "w2", { stroke: paper, strokeWidth: 1.6 })}
          {O(poly([[64, 66], [76, 64], [78, 76], [66, 78]], "ice1", true, 0.9), "ice1")}
          {O(poly([[84, 70], [96, 68], [98, 80], [86, 82]], "ice2", true, 0.9), "ice2")}
          {L(line([[67, 69], [72, 68]], "ih1", 0.1), "ih1", { strokeWidth: 1.2 })}
          {/* A carafe, solid, with a lid. */}
          {S(curve([[150, 162], [148, 134], [157, 118], [160, 100], [162, 74], [176, 74], [178, 100], [181, 118], [190, 134], [188, 162], [170, 170]], true), "car")}
          {L(line([[155, 134], [163, 130], [171, 134], [179, 130], [185, 134]], "cw1"), "cw1", { stroke: paper, strokeWidth: 1.6 })}
          {L(line([[153, 150], [161, 146], [169, 150], [177, 146], [185, 150]], "cw2"), "cw2", { stroke: paper, strokeWidth: 1.6 })}
          {O(ell(169, 70, 11, 4.5, "lid"), "lid")}
          {/* Droplets, and a lemon slice. */}
          {O(drop(130, 74, 15), "d1")}
          {S(drop(128, 118, 12), "d2")}
          {O(drop(212, 76, 14), "d3")}
          {O(ell(212, 146, 19, 17, "lem"), "lem")}
          {L(ell(212, 146, 14, 12, "lem2"), "lem2", { strokeWidth: 1.4 })}
          {L("M212 135v22M202 140l20 12M202 152l20 -12", "spokes", { strokeWidth: 1.2 })}
          {/* The tiny person, sitting on the rim, feet dangling. */}
          {person(113, 22, [[108, 30], [116, 28], [120, 36], [117, 43], [108, 43], [106, 36]], [[[110, 43], [118, 58], [116, 66]], [[115, 43], [124, 54], [124, 62]], [[108, 32], [100, 38]]], "pw")}
          {dot(20, 70)}
          {dot(36, 120, 1.1)}
          {dot(138, 150, 1.2)}
          {dot(230, 110)}
          {dot(124, 100, 1.1)}
          {dot(24, 160)}
        </>
      ) : null}

      {habit === "read" ? (
        <>
          {/* An open book in three-quarter view, page lines and a thickness edge. */}
          {O(poly([[40, 164], [120, 170], [200, 164], [200, 170], [120, 177], [40, 170]], "edge"), "edge")}
          {O(curve([[44, 118], [70, 112], [100, 114], [120, 124], [120, 170], [100, 160], [70, 158], [40, 164]], true), "lp")}
          {O(curve([[120, 124], [140, 114], [170, 112], [196, 118], [200, 164], [170, 158], [140, 160], [120, 170]], true), "rp")}
          {L("M52 128c14 -3 30 -2 44 4M50 140c14 -3 30 -2 46 4M50 152c14 -3 30 -2 46 4M132 130c14 -6 30 -7 46 -4M132 142c14 -6 30 -7 46 -4M132 154c14 -6 30 -7 46 -4", "plines", { strokeWidth: 1.3 })}
          {/* A short stack of books, one with a solid spine. */}
          {S(poly([[24, 100], [96, 98], [97, 110], [25, 112]], "bk1", true, 0.8), "bk1")}
          {O(poly([[30, 84], [92, 82], [93, 98], [31, 100]], "bk2", true, 0.8), "bk2")}
          {O(poly([[26, 68], [86, 66], [87, 82], [27, 84]], "bk3", true, 0.8), "bk3")}
          {L("M36 91h18M34 75h20", "bkl", { strokeWidth: 1.3 })}
          {/* A mug, and round glasses. */}
          {O(curve([[118, 50], [120, 76], [128, 82], [142, 82], [150, 76], [152, 50]], false) + "Z", "mug")}
          {O(ell(135, 50, 17, 5, "mugr"), "mugr")}
          {S(ell(135, 51, 13, 3, "mugc"), "mugc")}
          {L(line([[152, 56], [162, 56], [163, 70], [151, 72]], "mugh"), "mugh")}
          {L(line([[130, 40], [134, 32], [130, 24]], "mugs", 0.3), "mugs", { strokeWidth: 1.4 })}
          {O(ell(184, 44, 14, 13, "g1"), "g1")}
          {O(ell(214, 44, 14, 13, "g2"), "g2")}
          {L(line([[198, 42], [200, 40], [200, 40]], "bridge", 0.1), "bridge")}
          {L("M170 40L160 34M228 40l8 -6", "arms", { strokeWidth: 1.6 })}
          {/* The tiny person, flat on their front on the page, feet kicked up, reading a tiny book. */}
          {person(184, 104, [[150, 118], [162, 112], [176, 112], [186, 116], [176, 121], [160, 122]], [[[154, 117], [148, 106], [152, 98]], [[158, 116], [154, 104], [160, 96]], [[178, 112], [184, 110]]], "pr")}
          {O(poly([[188, 108], [200, 105], [201, 113], [189, 116]], "tb", true, 0.5), "tb", { strokeWidth: 1.4 })}
          {dot(14, 130)}
          {dot(100, 40, 1.2)}
          {dot(232, 130)}
          {dot(210, 100, 1.1)}
          {dot(20, 50, 1.1)}
          {dot(100, 184, 1.2)}
        </>
      ) : null}
    </g>
  );
}

/** The scene, drawn through a faint hand-inked wobble so no edge is machine-straight. */
function Illustration({ habit, inkFilter, width }: { habit: Habit; inkFilter: string; width: number }) {
  return (
    <svg aria-hidden viewBox="0 0 240 190" width={width} height={(width * 190) / 240} style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>
      <g filter={`url(#${inkFilter})`}>
        <Scene habit={habit.id} ink={habit.stamp} paper={habit.card} />
      </g>
    </svg>
  );
}

/* ───────────────────────────── a day's stamp button ───────────────────────────── */

type StampButtonProps = {
  variant: Variant;
  habit: Habit;
  cell: Cell;
  stamped: boolean;
  isToday?: boolean;
  disabled?: boolean;
  /** Non-zero while a stamp has just been pressed onto this button. */
  slam: number;
  inkFilter: string;
  reduce: boolean;
  onPress: () => void;
};

function StampButton({ variant, habit, cell, stamped, isToday, disabled, slam, inkFilter, reduce, onPress }: StampButtonProps) {
  const v = VARIANT[variant];
  const big = variant === "day";
  const fresh = slam !== 0 && stamped && !reduce;
  const tilt = (hash01(`${habit.id}:${variant}:tilt:${cell.iso}`) - 0.5) * v.tilt;
  const svgSize = v.size + v.pad;
  const offset = (v.size - svgSize) / 2;
  const ring = disabled ? `${habit.text}4D` : isToday ? habit.text : `${habit.text}CC`;

  return (
    <button
      type="button"
      className="st-stamp"
      aria-pressed={stamped}
      aria-label={`${habit.name}, ${cell.spoken} — ${stamped ? "stamped" : "not stamped"}`}
      aria-current={isToday ? "date" : undefined}
      disabled={disabled}
      onClick={onPress}
      style={{
        position: "relative",
        width: v.size,
        height: v.size,
        padding: 0,
        border: 0,
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        zIndex: 1,
        overflow: "visible",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* The empty ring; it gives way to the stamp and comes back when the stamp lifts. */}
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center rounded-full"
        style={{
          border: `${big ? 2.5 : isToday ? 2 : 1.5}px ${big ? "dashed" : "solid"} ${ring}`,
          opacity: stamped ? 0 : 1,
          transition: `opacity ${stamped ? 120 : 200}ms ease ${stamped ? 0 : 140}ms`,
        }}
      >
        {big ? (
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block", opacity: 0.18 }}>
            <Figure habit={habit.id} ink={habit.stamp} />
          </svg>
        ) : (
          <span style={{ fontWeight: isToday ? 600 : 500, fontSize: v.num, lineHeight: 1, color: habit.text, opacity: disabled ? 0.4 : 1 }}>{cell.day}</span>
        )}
      </span>

      <AnimatePresence initial={false}>
        {stamped ? (
          <motion.svg
            key="imprint"
            aria-hidden
            viewBox="0 0 100 100"
            width={svgSize}
            height={svgSize}
            className="pointer-events-none absolute"
            style={{ left: offset, top: offset, overflow: "visible", rotate: tilt }}
            // Pressed, not hovered: the print comes down fast, squashes a touch on impact, and settles.
            initial={fresh ? { scale: 1.3, opacity: 0 } : { scale: 0.96, opacity: 0 }}
            animate={fresh ? { scale: [1.3, 0.92, 1], opacity: [0, 1, 1] } : { scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0, transition: { duration: reduce ? 0.12 : 0.18 } }}
            transition={fresh ? { duration: 0.28, times: [0, 0.45, 1], ease: [0.3, 0, 0.2, 1] } : { duration: reduce ? 0.12 : 0.2 }}
          >
            <Print habit={habit} textured={inkFilter} />
          </motion.svg>
        ) : null}
      </AnimatePresence>


      {/* A few flecks of ink thrown past the rim on impact. */}
      {fresh
        ? [0, 1, 2, 3, 4].map((i) => {
            const a = hash01(`${habit.id}:fleck:${variant}:${cell.iso}:${i}`) * Math.PI * 2;
            const r = v.size / 2 + 1 + hash01(`${habit.id}:fr:${variant}:${cell.iso}:${i}`) * v.reach;
            const s = v.speck[0] + Math.round(hash01(`${habit.id}:fs:${variant}:${cell.iso}:${i}`) * (v.speck[1] - v.speck[0]));
            return (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 0.9, 0], x: Math.cos(a) * v.fling, y: Math.sin(a) * v.fling }}
                transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
                style={{ width: s, height: s, left: v.size / 2 + Math.cos(a) * r - s / 2, top: v.size / 2 + Math.sin(a) * r - s / 2, background: habit.stamp }}
              />
            );
          })
        : null}
    </button>
  );
}

/* ───────────────────────────── a habit card ───────────────────────────── */

/** A spring with no wobble, like iOS: it just arrives. */
const settleSpring = (duration: number, velocity = 0) => ({ type: "spring", bounce: 0, visualDuration: duration, velocity }) as const;

/** How far a card travels to be off the screen. */
const FLY = CARD_W + CARD_MARGIN + 24;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A place in the stack between two slots (depth 1.5 is halfway from slot 1 to slot 2). */
function pose(depth: number) {
  const d = clamp(depth, 0, 3);
  const i = Math.min(2, Math.floor(d));
  const f = d - i;
  const a = SLOTS[i];
  const b = SLOTS[i + 1];
  return { y: lerp(a.y, b.y, f), scale: lerp(a.scale, b.scale, f), rotate: lerp(a.rotate, b.rotate, f) };
}

/**
 * Where a card is, as a pure function of the swipe. `p` is the swipe's progress: 0 at rest, 1 when the front card
 * has been taken fully off to the left, -1 when the card at the back has been brought fully round to the front.
 * `d` is the card's depth in the stack, `t` is 1 for a card that has just flown off and is gliding back in behind
 * the stack, and `e` is 1 while a card is still below the screen waiting to rise in.
 * The outer layer (o…) holds a card's place in the stack, the inner one (i…) is the card being moved by the hand.
 */
function cardState(p0: number, d: number, t: number, e: number) {
  const p = clamp(p0, -1, 1);
  let oy = 0;
  let os = 1;
  let or = 0;
  let ix = 0;
  let ir = 0;
  let z = 4 - d;
  let opacity = 1;
  let content = 0;
  if (p >= 0) {
    if (d === 0) {
      ix = -p * FLY;
      ir = clamp((ix / CARD_W) * 6, -6, 6);
      content = 1;
      opacity = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1; // fades a little as it goes out
    } else {
      const b = pose(d - p);
      oy = b.y;
      os = b.scale;
      or = b.rotate;
      content = d === 1 ? clamp(p / 0.35, 0, 1) : 0;
    }
  } else {
    const q = -p;
    if (d === 3) {
      if (q < 0.1) {
        // The back card first lets go of its place in the stack (fading, so there's no jump)…
        const b = pose(3);
        oy = b.y;
        os = b.scale;
        or = b.rotate;
        opacity = 1 - q / 0.1;
      } else {
        // …then comes in over the top from the left edge.
        const k = (q - 0.1) / 0.9;
        ix = -(1 - k) * FLY;
        ir = -6 * (1 - k);
        z = 8;
        content = clamp((q - 0.1) / 0.25, 0, 1);
      }
    } else {
      const b = pose(d + q);
      oy = b.y;
      os = b.scale;
      or = b.rotate;
      content = d === 0 ? 1 - q : 0;
    }
  }
  // The card that has just left reappears at the back of the pile: already in its slot, invisible, then it fades in there
  // (a touch smaller and lower, settling up into place) so only its top band shows. It's the lowest card throughout.
  // (A card being brought back round to the front has no use for it.)
  const arriving = p < 0 && d === 3 && -p >= 0.1;
  if (t > 0.002 && !arriving) {
    const b = pose(3);
    oy = b.y + 6 * t;
    os = b.scale * (1 - 0.06 * t);
    or = b.rotate;
    ix = 0;
    ir = 0;
    content = 0;
    opacity = 1 - t;
    z = 0;
  }
  return { oy: oy + e * SURFACE_H, os, or, ix, ir, z, opacity, content };
}

type DeckCardProps = {
  habit: Habit;
  /** 0 is the front card; 1, 2 and 3 peek out behind it. */
  depth: number;
  view: View;
  /** The swipe's progress (-1…1), shared by every card. */
  progress: MotionValue<number>;
  /** 1 while this card is gliding back in behind the stack after flying off. */
  tuck: MotionValue<number>;
  /** 1 while this card is still below the screen, 0 once it has risen into place. */
  enter: MotionValue<number>;
  stamps: Stamps;
  cal: Calendar;
  pressed: { habit: HabitId; iso: string; token: number } | null;
  inkFilters: { day: string; hero: string; line: string; grain: string; fleck: string };
  reduce: boolean;
  onToggle: (habit: HabitId, iso: string) => void;
  draggedRef: React.MutableRefObject<boolean>;
};

/** Swaps a card's contents when the view changes: the old one fades out, the new one rises in. */
const fade = () => ({
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
});

function DeckCard({ habit, depth, view, progress, tuck, enter, stamps, cal, pressed, inkFilters, reduce, onToggle, draggedRef }: DeckCardProps) {
  const front = depth === 0;
  // Where this card is, every frame, comes straight from the swipe's progress: nothing here re-renders while a hand moves.
  const depthMV = useMotionValue(depth);
  React.useLayoutEffect(() => {
    depthMV.set(depth);
  }, [depth, depthMV]);
  const state = useTransform([progress, depthMV, tuck, enter], ([p, d, t, e]) => cardState(p as number, d as number, t as number, e as number));
  const oy = useTransform(state, (v) => v.oy);
  const os = useTransform(state, (v) => v.os);
  const or = useTransform(state, (v) => v.or);
  const ix = useTransform(state, (v) => v.ix);
  const ir = useTransform(state, (v) => v.ir);
  const z = useTransform(state, (v) => v.z);
  const cardOpacity = useTransform(state, (v) => v.opacity);
  const content = useTransform(state, (v) => v.content);

  // The cards rise into place one after another, the front one last.
  React.useEffect(() => {
    const run = animate(enter, 0, { ...settleSpring(0.7), delay: (3 - Math.min(depth, 3)) * 0.09 });
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The illustration presses in as its card comes to the front.
  const illoScale = useMotionValue(1);
  const prevDepth = React.useRef(depth);
  React.useEffect(() => {
    if (prevDepth.current !== 0 && depth === 0 && !reduce) animate(illoScale, [1.04, 1], { duration: 0.22, ease: "easeOut" });
    prevDepth.current = depth;
  }, [depth, reduce, illoScale]);
  const slamFor = (iso: string) => (pressed && pressed.habit === habit.id && pressed.iso === iso ? pressed.token : 0);

  const guarded = (iso: string) => () => {
    if (draggedRef.current) return;
    onToggle(habit.id, iso);
  };

  const subtitle = view === "month" ? cal.month.name : view === "week" ? cal.week.range : cal.day.weekday;

  const button = (variant: Variant, cell: Cell) => (
    <StampButton
      key={cell.iso}
      variant={variant}
      habit={habit}
      cell={cell}
      stamped={stamps[habit.id].has(cell.iso)}
      isToday={cell.iso === cal.todayIso}
      disabled={cell.iso > cal.todayIso}
      slam={slamFor(cell.iso)}
      inkFilter={variant === "day" ? inkFilters.hero : inkFilters.day}
      reduce={reduce}
      onPress={guarded(cell.iso)}
    />
  );

  const labelRow = (cols: number | null) => (
    <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
      {WEEKDAYS.map((w, c) => (
        <span key={w} className="text-center" style={{ fontWeight: c === cols ? 600 : 500, fontSize: 14, lineHeight: "20px" }}>
          <span style={{ display: "inline-block", borderBottom: c === cols ? "2px solid currentColor" : "2px solid transparent", lineHeight: "18px" }}>{w}</span>
        </span>
      ))}
    </div>
  );

  // How much room the grid leaves above it, and so how big the illustration can be (none in Day view, or if it would be cramped).
  const rows = Math.ceil(cal.month.cells.length / 7);
  const gridH = view === "week" ? 20 + 10 + VARIANT.week.size + 2 : 20 + 10 + rows * VARIANT.cell.size + (rows - 1) * 10 + 2;
  const freeH = CARD_H - CARD_PAD * 2 - 60 - gridH;
  const illoW = view === "week" ? 240 : 172;
  const illo = view !== "day" && freeH >= 110 ? { gridH, width: Math.min(illoW, ((freeH - 28) * 240) / 190) } : null;

  const todayWeekCol = cal.week.cells.findIndex((c) => c.iso === cal.todayIso);
  const todayCell = cal.week.cells[todayWeekCol] ?? cal.week.cells[0];

  return (
    // The outer layer holds the card's place in the stack (and fans it); the inner one is the card, moved by the hand.
    <motion.div
      className="absolute inset-x-0 top-0 bottom-0"
      style={{ y: oy, scale: os, rotate: or, opacity: cardOpacity, zIndex: z, transformOrigin: "50% 0%", pointerEvents: front ? "auto" : "none", willChange: "transform" }}
    >
      <motion.div
        role="group"
        aria-roledescription="slide"
        aria-label={`${habit.name}, ${subtitle}`}
        aria-hidden={front ? undefined : true}
        inert={front ? undefined : true}
        className="absolute inset-0 overflow-hidden"
        style={{
          x: ix,
          rotate: ir,
          transformOrigin: "50% 100%",
          willChange: "transform",
          borderRadius: CARD_RADIUS,
          // A flat block of riso colour; its type and stamps are printed in the pattern ink.
          background: habit.card,
          cursor: front ? "grab" : "default",
          color: habit.text,
          padding: CARD_PAD,
        }}
      >
        {/* Printed noise over the block — dark specks where the ink sat heavy, light ones where the drum ran dry. */}
        <svg aria-hidden className="pointer-events-none absolute inset-0" width="100%" height="100%">
          <rect width="100%" height="100%" filter={`url(#${inkFilters.grain})`} style={{ opacity: 0.35, mixBlendMode: "multiply" }} />
          <rect width="100%" height="100%" filter={`url(#${inkFilters.fleck})`} style={{ opacity: 0.4 }} />
        </svg>
        {/* The front card shows its contents and the one behind it fades its in while you swipe; the rest are bare blocks of colour. */}
        <motion.div className="relative flex h-full flex-col" style={{ opacity: content }}>
          {/* The header: the habit, and under it what the card is showing, the same size in grey. */}
                    <div style={{ fontWeight: 600, fontSize: 24, lineHeight: "30px", letterSpacing: "-0.02em" }}>
            <h3 className="m-0" style={{ font: "inherit", letterSpacing: "inherit" }}>
              {habit.name}
            </h3>
            <div className="relative" style={{ height: 30, opacity: 0.8 }}>
              <AnimatePresence initial={false} mode="wait">
                <motion.div key={view} className="absolute inset-x-0 top-0 whitespace-nowrap" {...fade()}>
                  {subtitle}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* The body, low in the card. */}
          <div className="relative flex-1">
            {/* The illustration fills the calm space between the header and the grid. */}
            {illo ? (
              <motion.div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center" style={{ bottom: illo.gridH + (view === "month" ? 8 : 0), scale: illoScale }}>
                <motion.div key={view} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}>
                  <Illustration habit={habit} inkFilter={inkFilters.line} width={illo.width} />
                </motion.div>
              </motion.div>
            ) : null}
            <AnimatePresence initial={false} mode="wait">
              {view === "month" ? (
                <motion.div key="month" className="absolute inset-x-0 bottom-0" style={{ marginInline: -GRID_BLEED, paddingBottom: 2 }} {...fade()}>
                  {labelRow(cal.month.todayCol)}
                  <div className="grid justify-items-center" style={{ marginTop: 10, gridTemplateColumns: "repeat(7, 1fr)", rowGap: 10 }}>
                    {cal.month.cells.map((cell, i) =>
                      cell ? button("cell", cell) : <span key={`blank-${i}`} aria-hidden style={{ width: VARIANT.cell.size, height: VARIANT.cell.size }} />,
                    )}
                  </div>
                </motion.div>
              ) : null}
              {view === "week" ? (
                <motion.div key="week" className="absolute inset-x-0 bottom-0" style={{ marginInline: -GRID_BLEED, paddingBottom: 2 }} {...fade()}>
                  {labelRow(todayWeekCol)}
                  <div className="grid justify-items-center" style={{ marginTop: 10, gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {cal.week.cells.map((cell) => button("week", cell))}
                  </div>
                </motion.div>
              ) : null}
              {view === "day" ? (
                <motion.div key="day" className="absolute inset-x-0 bottom-0 flex flex-col items-center" style={{ paddingBottom: 56 }} {...fade()}>
                  {button("day", todayCell)}
                  <div style={{ marginTop: 18, fontWeight: 400, fontSize: 16, lineHeight: "22px" }}>{cal.day.label}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── the Day / Week / Month switch ───────────────────────────── */

function ViewSwitch({ view, onChange, uid }: { view: View; onChange: (v: View) => void; uid: string }) {
  const tabs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (event: React.KeyboardEvent) => {
    const i = VIEWS.findIndex((v) => v.id === view);
    const next = event.key === "ArrowRight" ? (i + 1) % VIEWS.length : event.key === "ArrowLeft" ? (i + VIEWS.length - 1) % VIEWS.length : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(VIEWS[next].id);
    tabs.current[VIEWS[next].id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="View"
      onKeyDown={onKeyDown}
      className="absolute flex rounded-full"
      style={{ top: SWITCH_TOP, left: "50%", width: SWITCH_W, height: SWITCH_H, marginLeft: -SWITCH_W / 2, padding: 3, background: SWITCH.track, zIndex: 10 }}
    >
      {VIEWS.map((v) => {
        const active = v.id === view;
        return (
          <button
            key={v.id}
            ref={(el) => {
              tabs.current[v.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className="st-tab relative flex-1 rounded-full"
            onClick={() => onChange(v.id)}
            style={{ border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT, fontWeight: 500, fontSize: 13, color: SWITCH.inactive, padding: 0 }}
          >
            {active ? (
              <motion.span
                layoutId={`${uid}-thumb`}
                className="absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                style={{ background: SWITCH.thumb }}
              />
            ) : null}
            <span className="relative" style={{ color: active ? SWITCH.thumbText : SWITCH.inactive, transition: "color 200ms ease" }}>
              {v.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── the deck ───────────────────────────── */

export function StampTracker({ today = DEFAULT_TODAY, loop = false, onChange, className }: StampTrackerProps) {
  const reduce = !!useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const year = today.getFullYear();
  const month = today.getMonth();
  const dom = today.getDate();
  const todayIso = isoOf(today);

  // Everything the cards need to draw this month, this week and today.
  const cal = React.useMemo<Calendar>(() => {
    const spokenOf = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const cellOf = (d: Date): Cell => ({ iso: isoOf(d), day: d.getDate(), spoken: spokenOf(d) });
    const firstCol = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (Cell | null)[] = [];
    // Whole rows only: blanks before the 1st and after the last day, so every row has seven slots.
    for (let slot = 0; slot < Math.ceil((firstCol + days) / 7) * 7; slot += 1) {
      const day = slot - firstCol + 1;
      cells.push(day < 1 || day > days ? null : cellOf(new Date(year, month, day)));
    }
    const col = (today.getDay() + 6) % 7;
    const week = Array.from({ length: 7 }, (_, i) => cellOf(new Date(year, month, dom - col + i)));
    const first = new Date(year, month, dom - col);
    const last = new Date(year, month, dom - col + 6);
    return {
      todayIso,
      month: { name: MONTHS[month], cells, todayCol: (firstCol + dom - 1) % 7 },
      week: { range: `${MONTHS_SHORT[first.getMonth()]} ${first.getDate()} – ${MONTHS_SHORT[last.getMonth()]} ${last.getDate()}`, cells: week },
      day: { weekday: WEEKDAYS_LONG[col], label: `${MONTHS_SHORT[month]} ${dom}` },
    };
  }, [year, month, dom, today, todayIso]);

  // Past days start stamped at each habit's rate: the month so far, and any earlier days of this week.
  const [initial] = React.useState<Stamps>(() => {
    const col = (today.getDay() + 6) % 7;
    const from = Math.min(1, dom - col);
    const out = {} as Record<HabitId, Set<string>>;
    for (const habit of HABITS) {
      const set = new Set<string>();
      for (let d = from; d < dom; d += 1) {
        const iso = isoOf(new Date(year, month, d));
        if (hash01(`${habit.id}:${iso}`) < habit.seed) set.add(iso);
      }
      out[habit.id] = set;
    }
    return out;
  });
  const [stamps, setStamps] = React.useState<Stamps>(initial);
  const [view, setView] = React.useState<View>(loop ? "month" : "week");
  const [front, setFront] = React.useState(0);
  const [pressed, setPressed] = React.useState<{ habit: HabitId; iso: string; token: number } | null>(null);
  const [interacted, setInteracted] = React.useState(false);

  const stampsRef = React.useRef(stamps);
  React.useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);
  const frontRef = React.useRef(0);
  const interactedRef = React.useRef(false);
  const scaleRef = React.useRef(1);
  const animRef = React.useRef<AnimationPlaybackControls | null>(null);
  const pendingRef = React.useRef<{ leaver: number | null } | null>(null);
  const tuckAnims = React.useRef<(AnimationPlaybackControls | null)[]>([]);
  const draggedRef = React.useRef(false);
  const tokenRef = React.useRef(0);
  const clearRef = React.useRef<number | null>(null);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const reduceRef = React.useRef(reduce);
  React.useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  // The swipe is one number: 0 at rest, 1 when the front card has gone off to the left, -1 when the back card has come round.
  const progress = React.useMemo(() => motionValue(0), []);
  const tucks = React.useMemo(() => HABITS.map(() => motionValue(0)), []);
  const enters = React.useMemo(() => HABITS.map(() => motionValue(1)), []);
  const deckRef = React.useRef<HTMLDivElement>(null);
  const deckOpacity = React.useMemo(() => motionValue(1), []);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);

  // Scale the true-size deck down to the space it has, so it is always whole.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.max(0.3, Math.min(1, (host.clientWidth - 24) / SURFACE_W, (host.clientHeight - 24) / SURFACE_H));
      scaleRef.current = scale;
      fit.style.transform = `scale(${scale.toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  React.useEffect(
    () => () => {
      if (clearRef.current !== null) window.clearTimeout(clearRef.current);
    },
    [],
  );

  const setStamped = React.useCallback((id: HabitId, iso: string, on: boolean, byPerson: boolean) => {
    if (stampsRef.current[id].has(iso) === on) return;
    setStamps((prev) => {
      const next = new Set(prev[id]);
      if (on) next.add(iso);
      else next.delete(iso);
      const out = { ...prev, [id]: next };
      stampsRef.current = out;
      return out;
    });
    if (on) {
      tokenRef.current += 1;
      setPressed({ habit: id, iso, token: tokenRef.current });
      if (clearRef.current !== null) window.clearTimeout(clearRef.current);
      clearRef.current = window.setTimeout(() => setPressed(null), 900);
    } else {
      setPressed(null);
    }
    if (byPerson) onChangeRef.current?.(id, iso, on);
  }, []);

  const toggle = React.useCallback(
    (id: HabitId, iso: string) => {
      setStamped(id, iso, !stampsRef.current[id].has(iso), true);
    },
    [setStamped],
  );

  /** The card that has just left is now at the back: it waits there unseen for a moment, then fades in. */
  React.useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    // Every card already sits exactly where the next arrangement wants it, so resetting the swipe is invisible.
    progress.set(0);
    // The card now in front has nothing left to glide in from.
    tuckAnims.current[front]?.stop();
    tucks[front].set(0);
    if (pending.leaver !== null) {
      const t = tucks[pending.leaver];
      tuckAnims.current[pending.leaver]?.stop();
      t.set(1);
      tuckAnims.current[pending.leaver] = animate(t, 0, { duration: 0.26, delay: 0.08, ease: [0.25, 0.1, 0.25, 1], onComplete: () => t.set(0) });
    }
  }, [front, progress, tucks]);

  /** Carry the swipe on to `target` (-1, 0 or 1) from wherever the hand left it, at the hand's speed (progress per second). */
  const settle = React.useCallback(
    (target: -1 | 0 | 1, velocity = 0, done?: () => void) => {
      animRef.current?.stop();
      const n = HABITS.length;
      if (reduceRef.current) {
        progress.set(0);
        if (target !== 0) {
          const next = (frontRef.current + target + n) % n;
          frontRef.current = next;
          pendingRef.current = { leaver: null };
          setFront(next);
          animate(deckOpacity, [0.4, 1], { duration: 0.15 });
        }
        done?.();
        return;
      }
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (target !== 0) {
          const cur = frontRef.current;
          const next = (cur + target + n) % n;
          frontRef.current = next;
          pendingRef.current = { leaver: target === 1 ? cur : null };
          setFront(next);
        }
        done?.();
      };
      const run = animate(progress, target, {
        ...settleSpring(target === 0 ? 0.3 : 0.36, velocity),
        // The spring only creeps the last hair toward its target; call it arrived once it is visually there.
        onUpdate: (v) => {
          if (Math.abs(v - target) < 0.02) {
            run.stop();
            progress.set(target);
            finish();
          }
        },
        onComplete: finish,
      });
      animRef.current = run;
    },
    [progress, deckOpacity],
  );

  /** Decide where a released swipe goes: by how far it got, plus a little for how fast it was going. */
  const release = React.useCallback(
    (velocity: number) => {
      const p = progress.get();
      const projected = p + velocity * 0.12;
      settle(projected > 0.3 ? 1 : projected < -0.3 ? -1 : 0, velocity);
    },
    [progress, settle],
  );

  /** A step by keyboard or the gallery loop: the same motion as a swipe, started by nobody's hand. */
  const advance = React.useCallback(
    (dir: 1 | -1) => new Promise<void>((resolve) => settle(dir, 0, resolve)),
    [settle],
  );

  const touched = React.useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }, []);

  // The hand: a mouse or finger dragging the deck, and a two-finger trackpad swipe (horizontal wheel events). Both feed the
  // same progress number directly, so the cards follow frame by frame and nothing re-renders while it happens.
  const grab = React.useRef({ active: false, moved: false, startX: 0, startP: 0, samples: [] as { t: number; x: number }[] });
  const velocityOf = (samples: { t: number; x: number }[]) => {
    const last = samples[samples.length - 1];
    const first = samples.find((s) => last.t - s.t < 90) ?? samples[0];
    return last && first && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0; // px/s, leftward negative
  };
  const onDeckPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    animRef.current?.stop(); // a new gesture takes over from wherever the motion has got to
    grab.current = { active: true, moved: false, startX: e.clientX, startP: progress.get(), samples: [{ t: performance.now(), x: e.clientX }] };
  };
  const onDeckPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g.active) return;
    const dx = (e.clientX - g.startX) / scaleRef.current;
    if (!g.moved) {
      if (Math.abs(dx) < 4) return;
      g.moved = true;
      draggedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    g.samples.push({ t: performance.now(), x: e.clientX });
    if (g.samples.length > 12) g.samples.shift();
    progress.set(clamp(g.startP - dx / FLY, -1, 1));
  };
  const onDeckPointerUp = () => {
    const g = grab.current;
    if (!g.active) return;
    g.active = false;
    if (!g.moved) return;
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 60);
    // A hand that stopped before letting go is going nowhere.
    const idle = performance.now() - g.samples[g.samples.length - 1].t > 80;
    release(idle ? 0 : -velocityOf(g.samples) / scaleRef.current / FLY);
  };

  React.useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    const w = { active: false, startP: 0, acc: 0, last: 0, v: 0, lock: 0, timer: 0 };
    const finish = () => {
      w.timer = 0;
      w.active = false;
      w.lock = performance.now() + 450; // ignore the momentum tail of this swipe
      release(w.v);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical intent: let the page scroll
      e.preventDefault(); // and don't let a sideways swipe turn into browser back/forward
      touched();
      const now = performance.now();
      if (reduceRef.current || now < w.lock) return;
      if (!w.active) {
        w.active = true;
        w.startP = progress.get();
        w.acc = 0;
        animRef.current?.stop();
      }
      w.v = (e.deltaX / Math.max(8, now - w.last) / scaleRef.current / FLY) * 1000;
      w.last = now;
      w.acc += e.deltaX;
      progress.set(clamp(w.startP + w.acc / scaleRef.current / FLY, -1, 1));
      window.clearTimeout(w.timer);
      w.timer = window.setTimeout(finish, 90);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(w.timer);
    };
  }, [progress, release, touched]);

  // Gallery loop: stamp today on the front card, let the stamp land, swipe to the next card;
  // when every habit is done for today, wipe the stamps back to their seed.
  React.useEffect(() => {
    if (!loop || interacted) return;
    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });
    (async () => {
      await wait(1800);
      while (!cancelled) {
        const id = HABITS[frontRef.current].id;
        if (!stampsRef.current[id].has(todayIso)) {
          setStamped(id, todayIso, true, false);
          await wait(900);
          if (cancelled) return;
        }
        if (HABITS.every((h) => stampsRef.current[h.id].has(todayIso))) {
          await wait(1500);
          if (cancelled) return;
          setStamps(initial);
          stampsRef.current = initial;
          await wait(800);
          continue;
        }
        await advance(1);
        await wait(1700);
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [loop, interacted, initial, setStamped, advance, todayIso]);

  const onDeckKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    void advance(event.key === "ArrowRight" ? 1 : -1);
  };

  const inkFilters = { day: `${uid}-day`, hero: `${uid}-hero`, line: `${uid}-line`, grain: `${uid}-grain`, fleck: `${uid}-fleck` };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={uid}>
        <div
          ref={hostRef}
          className={cn("relative flex size-full min-h-[420px] items-center justify-center overflow-hidden", className)}
          style={{ fontFamily: FONT }}
          onPointerDownCapture={touched}
          onKeyDownCapture={touched}
        >
          <style>
            {`
              .st-stamp { outline: none; border-radius: 50%; }
              .st-stamp:focus-visible { outline: 2px solid ${INK}; outline-offset: 3px; }
              .st-deck { outline: none; }
              .st-deck:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 4px; border-radius: ${CARD_RADIUS}px; }
              .st-tab { outline: none; }
              .st-tab:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 1px; }
            `}
          </style>

          {/* Shared textures: the stamps' ink (fine for the little ones, coarse for the big one) and the cards' paper grain. */}
          <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
            <defs>
              <filter id={inkFilters.day} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="3" result="grain" />
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="warp" />
                <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
                <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  30 0 0 0 -9" result="speck" />
                <feComposite in="rough" in2="speck" operator="in" />
              </filter>
              <filter id={inkFilters.hero} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="warp" />
                <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" result="rough" />
                <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="5" result="grain" />
                <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  30 0 0 0 -9" result="speck" />
                <feComposite in="rough" in2="speck" operator="in" />
              </filter>
              {/* The illustrations: just a hand's wobble and a hint of dryness, so the lines read as inked, not stamped. */}
              <filter id={inkFilters.line} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="warp" />
                <feDisplacementMap in="SourceGraphic" in2="warp" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
                <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="2" result="grain" />
                <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  22 0 0 0 -6.2" result="speck" />
                <feComposite in="rough" in2="speck" operator="in" />
              </filter>
              <filter id={inkFilters.grain} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.16  0 0 0 0 0.2  0 0 0 1.6 -0.35" />
              </filter>
              <filter id={inkFilters.fleck} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" />
                <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -1.25" />
              </filter>
            </defs>
          </svg>

          <div ref={fitRef} className="relative shrink-0" style={{ width: SURFACE_W, height: SURFACE_H, transformOrigin: "50% 50%" }}>
            <div
              role="group"
              aria-label="Stamp tracker"
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: SURFACE_RADIUS,
                background: SCREEN,
                color: INK,
                fontFamily: FONT,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <ViewSwitch view={view} onChange={setView} uid={uid} />

              {/* The deck. The cards behind peek out above the front one. */}
              <motion.div
                role="group"
                aria-roledescription="carousel"
                aria-label="Habits"
                tabIndex={0}
                ref={deckRef}
                className="st-deck absolute"
                onKeyDown={onDeckKeyDown}
                onPointerDown={onDeckPointerDown}
                onPointerMove={onDeckPointerMove}
                onPointerUp={onDeckPointerUp}
                onPointerCancel={onDeckPointerUp}
                style={{ left: CARD_MARGIN, right: CARD_MARGIN, top: DECK_TOP, bottom: DECK_BOTTOM, overscrollBehaviorX: "contain", touchAction: "pan-y", opacity: deckOpacity }}
              >
                {HABITS.map((h, i) => (
                  <DeckCard
                    key={h.id}
                    habit={h}
                    depth={(i - front + HABITS.length) % HABITS.length}
                    view={view}
                    progress={progress}
                    tuck={tucks[i]}
                    enter={enters[i]}
                    stamps={stamps}
                    cal={cal}
                    pressed={pressed}
                    inkFilters={inkFilters}
                    reduce={reduce}
                    onToggle={toggle}
                    draggedRef={draggedRef}
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
