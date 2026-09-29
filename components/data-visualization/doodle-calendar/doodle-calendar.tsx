"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Doodle Calendar — every picture in this file is drawn in blue ballpoint, in
// code: each scene is a short list of shapes with a tone, and a seeded pen
// hatches them on a <canvas> with dense, wobbly, mostly vertical strokes. No
// images, no gradients, no shadows, so the folder is self-contained — copy it
// anywhere and it works.

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

// One ballpoint blue on one grey sheet. Every tone in the file is this ink at
// some alpha, so nothing can drift toward violet.
const INK = "#0A5BD9";
const INK_RGB = "10 91 217";
const ink = (a: number) => `rgb(${INK_RGB} / ${a})`;
/** The page behind the calendar, and the lighter card an opened day is drawn on. */
const PAPER = "#E6E7EA";
const CARD = "#F2F3F5";
/** Today's disc, mid-morph: the dark hatched circle seen from a distance. */
const DISC_TODAY = "#4A86E2";

const FONT_SANS = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";
const FONT_MONO =
  "var(--font-geist-mono, 'Geist Mono'), 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const FONT_SERIF = "var(--font-instrument-serif, 'Instrument Serif'), Georgia, serif";

/* ───────────────────────────── layout tokens ───────────────────────────── */

// A real iPhone is about 1 : 2.06 outside and 1 : 2.17 across the glass. Everything
// hangs off these: the heading, the weekday labels, the seven columns and the card
// share PAD, and the space between circles is GAP in both directions.
const PHONE_W = 300;
const PHONE_H = 618;
const BEZEL = 9;
const PHONE_RADIUS = 51;
const SCREEN_RADIUS = 42;
const SCREEN_W = PHONE_W - BEZEL * 2;
const SCREEN_H = PHONE_H - BEZEL * 2;

const PAD = 16;
const GAP = 3;
const CELL = (SCREEN_W - PAD * 2 - GAP * 6) / 7;

const HEAD_SIZE = 50;
const HEAD_LINE = 48;
const WEEKDAY_H = 14;
const WEEKDAY_GAP = 9;
/** Gap between the last row and the bottom of the glass — the grid sits low, like a desk calendar. */
const GRID_BOTTOM = 36;

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

// The month and its grid are one composition low on the glass, with the top of the
// screen left as quiet paper. When a day opens, the heading rides up above the card.
const GRID_H = WEEKDAY_H + WEEKDAY_GAP + WEEKS * CELL + (WEEKS - 1) * GAP;
const HEAD_BLOCK = HEAD_LINE * 2 + 2;
const HEAD_GAP = 30;
const HEAD_TOP_CLOSED = SCREEN_H - GRID_BOTTOM - GRID_H - HEAD_GAP - HEAD_BLOCK;
const HEAD_TOP_OPEN = 46;

// The card: a drawing over one date, one title and one sentence, ending well above the
// home indicator.
const CARD_X = 10;
const CARD_BOTTOM = 24;
const ART_W = SCREEN_W - CARD_X * 2;
/** The drawing is made on a 360 × 240 sheet and shown covering this box. */
const ART_H = 232;
const TEXT_H = 188;
const CARD_W = ART_W;
const CARD_H = ART_H + TEXT_H;
const CARD_TOP = SCREEN_H - CARD_BOTTOM - CARD_H;
const CARD_RADIUS = 30;

/* ───────────────────────────── the pen ─────────────────────────────
 * A scene is data: layers in a 360 × 240 sheet, each an SVG path with a tone
 * from 0 (bare paper) to 1 (black-blue). The pen turns a layer into strokes:
 *   • hatching — vertical lines swept across the shape, spaced by tone (wide
 *     when light, tight when dark), broken into runs with gaps, wobbling, each
 *     with its own pressure; dark tones get a second, offset pass on top;
 *   • a loose contour, sometimes gone over twice;
 *   • marks — extra pen strokes for windows, faces, steam, grass ticks.
 * A `knockout` layer is paper: whatever was drawn behind it is left out (that is
 * worked out up front from a raster of its Path2D, so the lines simply stop).
 * Everything random comes from a seeded generator, so a scene is always the same
 * drawing — on the server, on the client, every time.
 */

type Pt = readonly [number, number];

/** A pen stroke that is not a fill: a path drawn as a line, or (with `tex`) part of the texture that arrives with the hatching. */
type Mark = string | { d: string; w?: number; a?: number; tex?: boolean };

type Layer = {
  /** An SVG path in sheet units. Empty for a layer that is only marks. */
  d: string;
  /** 0 bare paper … 1 densest hatching. */
  tone: number;
  /** Paper first: hides everything drawn behind it. */
  knockout?: boolean;
  /** A pen contour round the shape. Default true. */
  outline?: boolean;
  /** Lean of the hatching in degrees from vertical, e.g. ±8. */
  angle?: number;
  /** The tone changes across the shape: from `tone` on one side to `to` on the other. */
  ramp?: { to: number; dir: "up" | "down" | "left" | "right" };
  marks?: readonly Mark[];
};

/** How a sheet is drawn: spacing, pressure and wobble, in the sheet's own units. */
type PenStyle = {
  /** Hatch spacing at tone 0 and tone 1. */
  spLight: number;
  spDark: number;
  /** Pen width at light and dark tones. */
  wMin: number;
  wMax: number;
  /** Contour width. */
  ow: number;
  /** Wobble of a hatch line and of a contour. */
  amp: number;
  /** Longest run of a hatch line before the pen lifts, relative to a big sheet. */
  run: number;
  /** How far a contour goes before the pen changes pressure. */
  piece: number;
  /** About how many times the pen lifts while going once round a contour. */
  lifts: number;
  /** Raster units per sheet unit for the knockout mask. */
  mask: number;
};

const PEN_ART: PenStyle = { spLight: 7, spDark: 1.75, wMin: 0.5, wMax: 1.05, ow: 1.15, amp: 1, run: 1, piece: 26, lifts: 5, mask: 2 };
const PEN_CELL: PenStyle = { spLight: 4.6, spDark: 1.5, wMin: 0.55, wMax: 0.95, ow: 0.85, amp: 0.42, run: 0.42, piece: 70, lifts: 1, mask: 8 };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Smooth value noise on 0…1: n lattice points, cosine-blended. */
function smoothNoise(rnd: () => number, n: number) {
  const v = Array.from({ length: n + 2 }, () => rnd() * 2 - 1);
  return (t: number) => {
    const x = clamp01(t) * n;
    const i = Math.min(n, Math.floor(x));
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    return v[i] * (1 - s) + v[i + 1] * s;
  };
}

/* ── paths: parse, move, flatten ── */

type Cmd = { c: "M" | "L" | "C" | "Q" | "Z"; v: number[] };
const ARGC: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, Z: 0 };

/** Reads M L H V C Q Z, upper or lower case, into absolute M L C Q Z. */
function parsePath(d: string): Cmd[] {
  const tokens = d.match(/[MmLlHhVvCcQqZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: Cmd[] = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        out.push({ c: "Z", v: [] });
        x = sx;
        y = sy;
      }
      continue;
    }
    const up = cmd.toUpperCase();
    const n = ARGC[up];
    if (!n) {
      i++;
      continue;
    }
    const rel = cmd !== up;
    const a = tokens.slice(i, i + n).map(Number);
    i += n;
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    if (up === "M") {
      x = a[0] + ox;
      y = a[1] + oy;
      sx = x;
      sy = y;
      out.push({ c: "M", v: [x, y] });
      cmd = rel ? "l" : "L";
    } else if (up === "L") {
      x = a[0] + ox;
      y = a[1] + oy;
      out.push({ c: "L", v: [x, y] });
    } else if (up === "H") {
      x = a[0] + ox;
      out.push({ c: "L", v: [x, y] });
    } else if (up === "V") {
      y = a[0] + oy;
      out.push({ c: "L", v: [x, y] });
    } else if (up === "C") {
      out.push({ c: "C", v: [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy, a[4] + ox, a[5] + oy] });
      x = a[4] + ox;
      y = a[5] + oy;
    } else if (up === "Q") {
      out.push({ c: "Q", v: [a[0] + ox, a[1] + oy, a[2] + ox, a[3] + oy] });
      x = a[2] + ox;
      y = a[3] + oy;
    }
  }
  return out;
}

const fmt = (n: number) => `${+n.toFixed(1)}`;

function writePath(cmds: readonly Cmd[]): string {
  return cmds.map(({ c, v }) => (c === "Z" ? "Z" : `${c}${v.map(fmt).join(" ")}`)).join("");
}

type Mat = readonly [number, number, number, number, number, number];

/** Move, turn and scale a path: rotate `r` degrees and scale `s` about the origin, flip across x if asked, then shift. */
function matrix(x: number, y: number, s = 1, r = 0, flip = false): Mat {
  const a = (r * Math.PI) / 180;
  const cos = Math.cos(a) * s;
  const sin = Math.sin(a) * s;
  const fx = flip ? -1 : 1;
  return [cos * fx, sin * fx, -sin, cos, x, y];
}

function movePath(d: string, m: Mat): string {
  return writePath(
    parsePath(d).map(({ c, v }) => {
      const o: number[] = [];
      for (let i = 0; i < v.length; i += 2) {
        o.push(m[0] * v[i] + m[2] * v[i + 1] + m[4], m[1] * v[i] + m[3] * v[i + 1] + m[5]);
      }
      return { c, v: o };
    }),
  );
}

const moveMark = (mk: Mark, m: Mat): Mark => (typeof mk === "string" ? movePath(mk, m) : { ...mk, d: movePath(mk.d, m) });

/** A group of layers made once at its own origin and set down anywhere, at any size and lean. */
function put(layers: readonly Layer[], x: number, y: number, s = 1, r = 0, flip = false): Layer[] {
  const m = matrix(x, y, s, r, flip);
  return layers.map((l) => ({ ...l, d: l.d ? movePath(l.d, m) : "", marks: l.marks?.map((mk) => moveMark(mk, m)) }));
}

type Sub = { p: number[]; closed: boolean };

function flatten(d: string, step: number): Sub[] {
  const subs: Sub[] = [];
  let cur: Sub | null = null;
  let px = 0;
  let py = 0;
  for (const { c, v } of parsePath(d)) {
    if (c === "M") {
      cur = { p: [v[0], v[1]], closed: false };
      subs.push(cur);
      px = v[0];
      py = v[1];
    } else if (!cur) {
      continue;
    } else if (c === "L") {
      cur.p.push(v[0], v[1]);
      px = v[0];
      py = v[1];
    } else if (c === "C") {
      const n = Math.min(36, Math.max(4, Math.ceil((Math.hypot(v[0] - px, v[1] - py) + Math.hypot(v[2] - v[0], v[3] - v[1]) + Math.hypot(v[4] - v[2], v[5] - v[3])) / step)));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        cur.p.push(
          u * u * u * px + 3 * u * u * t * v[0] + 3 * u * t * t * v[2] + t * t * t * v[4],
          u * u * u * py + 3 * u * u * t * v[1] + 3 * u * t * t * v[3] + t * t * t * v[5],
        );
      }
      px = v[4];
      py = v[5];
    } else if (c === "Q") {
      const n = Math.min(30, Math.max(3, Math.ceil((Math.hypot(v[0] - px, v[1] - py) + Math.hypot(v[2] - v[0], v[3] - v[1])) / step)));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        const u = 1 - t;
        cur.p.push(u * u * px + 2 * u * t * v[0] + t * t * v[2], u * u * py + 2 * u * t * v[1] + t * t * v[3]);
      }
      px = v[2];
      py = v[3];
    } else {
      cur.closed = true;
      const n = cur.p.length;
      if (n > 4 && Math.hypot(cur.p[n - 2] - cur.p[0], cur.p[n - 1] - cur.p[1]) < 0.01) cur.p.length = n - 2;
      px = cur.p[0];
      py = cur.p[1];
    }
  }
  return subs;
}

/** Points along a polyline every `ds`, and its length. A closed one comes back round to where it started. */
function resample(p: number[], closed: boolean, ds: number): { pts: number[]; len: number } {
  const q = closed ? [...p, p[0], p[1]] : p;
  const seg: number[] = [0];
  for (let i = 2; i < q.length; i += 2) seg.push(seg[seg.length - 1] + Math.hypot(q[i] - q[i - 2], q[i + 1] - q[i - 1]));
  const len = seg[seg.length - 1];
  const n = Math.max(2, Math.round(len / ds));
  const pts: number[] = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (len * k) / n;
    while (j < seg.length - 2 && seg[j + 1] < s) j++;
    const span = seg[j + 1] - seg[j] || 1;
    const f = (s - seg[j]) / span;
    pts.push(q[j * 2] + (q[j * 2 + 2] - q[j * 2]) * f, q[j * 2 + 1] + (q[j * 2 + 3] - q[j * 2 + 1]) * f);
  }
  return { pts, len };
}

/* ── strokes ── */

/** One piece of pen line: a run of points, how wide, how dark. */
type Op = {
  p: number[];
  w: number;
  a: number;
  /** How deep the ink is: 1 is the pen's own blue, less is the same blue pressed darker. */
  c?: number;
  x: number;
  /** For contours: how far along the whole trace it starts, and how long it is. */
  s: number;
  l: number;
};

type Composition = {
  /** Contours and line marks, in the order the pen goes round them. */
  outline: Op[];
  /** Hatching and texture, sorted for a sweep from left to right. */
  hatch: Op[];
  /** Total length of the contour trace. */
  total: number;
  /** The x-range of the sweep. */
  kmin: number;
  kmax: number;
};

const pathLen = (p: number[]) => {
  let l = 0;
  for (let i = 2; i < p.length; i += 2) l += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
  return l;
};

/** Which parts of which layers are hidden by paper laid on top later. Uses each knockout's Path2D. */
function buildMasks(layers: readonly Layer[], w: number, h: number, res: number): ((x: number, y: number) => boolean)[] {
  const none = () => false;
  const out: ((x: number, y: number) => boolean)[] = layers.map(() => none);
  if (!layers.some((l) => l.knockout)) return out;
  const cv = document.createElement("canvas");
  const W = Math.ceil(w * res);
  const H = Math.ceil(h * res);
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return out;
  ctx.scale(res, res);
  ctx.fillStyle = "#000";
  let snap: Uint8Array | null = null;
  let dirty = false;
  for (let j = layers.length - 1; j >= 0; j--) {
    if (dirty) {
      const data = ctx.getImageData(0, 0, W, H).data;
      const a = new Uint8Array(W * H);
      for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
      snap = a;
      dirty = false;
    }
    if (snap) {
      const m = snap;
      out[j] = (x, y) => {
        const ix = Math.floor(x * res);
        const iy = Math.floor(y * res);
        return ix >= 0 && iy >= 0 && ix < W && iy < H && m[iy * W + ix] > 96;
      };
    }
    if (layers[j].knockout && layers[j].d) {
      ctx.fill(new Path2D(layers[j].d), "evenodd");
      dirty = true;
    }
  }
  return out;
}

/** Pen pressure along a stroke: cut it into pieces, each a touch lighter or heavier than the last. */
function pieces(out: Op[], p: number[], w: number, a: number, rnd: () => number, key: number, pieceLen: number) {
  const n = p.length / 2;
  const len = pathLen(p);
  if (n < 3 || len < pieceLen * 1.5) {
    out.push({ p, w, a, x: key, s: 0, l: len });
    return;
  }
  let start = 0;
  let acc = 0;
  let target = pieceLen * (0.7 + rnd() * 0.7);
  let first = true;
  for (let i = 1; i < n; i++) {
    acc += Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
    const last = i === n - 1;
    if (acc >= target || last) {
      const seg = p.slice(start * 2, i * 2 + 2);
      const heavy = first ? 1.06 : 0.82 + rnd() * 0.24;
      out.push({ p: seg, w: w * (0.86 + rnd() * 0.26), a: Math.min(0.96, a * heavy * (last ? 0.9 : 1)), x: key, s: 0, l: pathLen(seg) });
      start = i;
      acc = 0;
      target = pieceLen * (0.7 + rnd() * 0.8);
      first = false;
    }
  }
}

/** Every stroke of one layer's fill: vertical lines swept over its shape. */
function hatchLayer(
  layer: Layer,
  subs: Sub[],
  st: PenStyle,
  rnd: () => number,
  hidden: (x: number, y: number) => boolean,
  hasMask: boolean,
  out: Op[],
  bounds: { h: number },
) {
  const t0 = clamp01(layer.tone);
  const t1 = layer.ramp ? clamp01(layer.ramp.to) : t0;
  const tmax = Math.max(t0, t1);
  if (tmax < 0.03 || !subs.length) return;
  const spacing = (t: number) => lerp(st.spLight, st.spDark, Math.pow(clamp01(t), 0.85));

  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (const s of subs) {
    for (let i = 0; i < s.p.length; i += 2) {
      bx0 = Math.min(bx0, s.p[i]);
      bx1 = Math.max(bx1, s.p[i]);
      by0 = Math.min(by0, s.p[i + 1]);
      by1 = Math.max(by1, s.p[i + 1]);
    }
  }
  const theta = ((layer.angle ?? 0) * Math.PI) / 180;
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const toLocal = (x: number, y: number): Pt => [(x - cx) * cos + (y - cy) * sin, -(x - cx) * sin + (y - cy) * cos];
  const toWorld = (x: number, y: number): Pt => [x * cos - y * sin + cx, x * sin + y * cos + cy];

  const local = subs.map((s) => {
    const q: number[] = [];
    for (let i = 0; i < s.p.length; i += 2) {
      const [x, y] = toLocal(s.p[i], s.p[i + 1]);
      q.push(x, y);
    }
    return q;
  });
  let lx0 = Infinity;
  let lx1 = -Infinity;
  for (const q of local) {
    for (let i = 0; i < q.length; i += 2) {
      lx0 = Math.min(lx0, q[i]);
      lx1 = Math.max(lx1, q[i]);
    }
  }

  const crossings = (x: number) => {
    const ys: number[] = [];
    for (const q of local) {
      const n = q.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const xa = q[i * 2];
        const xb = q[j * 2];
        if ((xa <= x && x < xb) || (xb <= x && x < xa)) ys.push(q[i * 2 + 1] + ((q[j * 2 + 1] - q[i * 2 + 1]) * (x - xa)) / (xb - xa));
      }
    }
    return ys.sort((a, b) => a - b);
  };

  const rampU = (wx: number, wy: number) => {
    if (!layer.ramp) return 0;
    const d = layer.ramp.dir;
    const u = d === "down" || d === "up" ? (wy - by0) / Math.max(1, by1 - by0) : (wx - bx0) / Math.max(1, bx1 - bx0);
    return clamp01(d === "up" || d === "left" ? 1 - u : u);
  };

  const passes: { sp: number; k: number; da: number }[] = [{ sp: 1, k: 1, da: 0 }];
  if (tmax > 0.5) passes.push({ sp: 1.22, k: clamp01(0.3 + (tmax - 0.5) * 1.5), da: (rnd() * 2 - 1) * 0.05 });
  if (tmax > 0.82) passes.push({ sp: 1.9, k: 0.55, da: (rnd() * 2 - 1) * 0.09 });

  const minRun = (6 + 10 * tmax) * st.run;
  const maxRun = (14 + 46 * tmax) * st.run;
  // The hand drifts: neighbouring lines lean the same way, and the lean changes slowly across the shape.
  const drift = smoothNoise(rnd, 3);

  const emit = (ps: { da: number }, x: number, ya: number, yb: number, tl: number, lean: number) => {
    // Cut out whatever is hidden behind later paper.
    const pushRun = (a: number, b: number) => {
      if (b - a < 1.1) return;
      const len = b - a;
      const nodes = Math.max(2, Math.round(len / (7 + rnd() * 5)) + 1);
      const amp = st.amp * (0.22 + 0.3 * rnd());
      const slant = (rnd() * 2 - 1) * 0.012 + ps.da + lean;
      const dx0 = (rnd() * 2 - 1) * 0.3;
      const p: number[] = [];
      for (let i = 0; i < nodes; i++) {
        const yy = a + (len * i) / (nodes - 1);
        const [wx, wy] = toWorld(x + dx0 + slant * (yy - a) + (rnd() * 2 - 1) * amp, yy);
        p.push(wx, wy);
      }
      const w = lerp(st.wMin, st.wMax, tl) * (0.78 + 0.44 * rnd());
      const al = Math.min(0.95, lerp(0.5, 0.88, tl) * (0.72 + 0.34 * rnd()));
      const key = p[0] + 0.12 * (p[1] - bounds.h / 2) + (rnd() - 0.5) * 9;
      const depth = 1 - 0.42 * clamp01((tl - 0.35) / 0.6) * (0.75 + 0.5 * rnd());
      if (nodes >= 5 && rnd() < 0.55) {
        const c = 2 + Math.floor(rnd() * (nodes - 4));
        out.push({ p: p.slice(0, c * 2 + 2), w, a: al * (0.95 + rnd() * 0.1), c: depth, x: key, s: 0, l: 0 });
        out.push({ p: p.slice(c * 2), w: w * (0.78 + rnd() * 0.2), a: al * (0.58 + rnd() * 0.26), c: depth, x: key + 0.01, s: 0, l: 0 });
      } else {
        out.push({ p, w, a: al, c: depth, x: key, s: 0, l: 0 });
      }
    };
    if (!hasMask) {
      pushRun(ya, yb);
      return;
    }
    const n = Math.max(1, Math.ceil((yb - ya) / 1.5));
    let from: number | null = null;
    for (let i = 0; i <= n; i++) {
      const yy = ya + ((yb - ya) * i) / n;
      const [wx, wy] = toWorld(x, yy);
      if (!hidden(wx, wy)) {
        if (from === null) from = yy;
      } else if (from !== null) {
        pushRun(from, yy - (yb - ya) / n);
        from = null;
      }
    }
    if (from !== null) pushRun(from, yb);
  };

  for (const ps of passes) {
    const sp = spacing(tmax) * ps.sp;
    for (let x = lx0 + rnd() * sp; x < lx1 + sp * 0.5; x += sp * (0.5 + 1.0 * rnd() * rnd() + 0.3 * rnd())) {
      const ys = crossings(x);
      const lean = drift((x - lx0) / Math.max(1, lx1 - lx0)) * 0.1 + (rnd() * 2 - 1) * 0.018;
      for (let k = 0; k + 1 < ys.length; k += 2) {
        let y = ys[k] - (rnd() * 2.6 - 1.1);
        const yEnd = ys[k + 1] + (rnd() * 2.6 - 1.1);
        if (yEnd - y < 1) continue;
        let first = true;
        while (y < yEnd - 0.6) {
          let run = lerp(minRun, maxRun, Math.pow(rnd(), 0.75));
          // Lines don't all start on the edge: the first stroke of each is cut short at random.
          if (first) run *= 0.25 + rnd() * 0.75;
          first = false;
          const end = Math.min(yEnd, y + run);
          const [mx, my] = toWorld(x, (y + end) / 2);
          const tl = clamp01(lerp(t0, t1, rampU(mx, my)) + (rnd() - 0.5) * 0.1);
          const ratio = tl < 0.03 ? 0 : Math.min(1, spacing(tmax) / spacing(tl));
          if (rnd() < ratio * ps.k) emit(ps, x, y, end, tl, lean);
          y = end + (0.5 + rnd() * 3.2 * (1.25 - tmax)) * Math.min(1, st.run + 0.4);
        }
      }
    }
  }
}

/** A loose pen contour round one sub-path — drawn in one or two goes, sometimes gone over. */
function contourSub(
  sub: Sub,
  st: PenStyle,
  rnd: () => number,
  hidden: (x: number, y: number) => boolean,
  hasMask: boolean,
  out: Op[],
  boldness = 1,
) {
  const { pts, len } = resample(sub.p, sub.closed, 2);
  if (len < 3) return;
  const n = pts.length / 2;
  const nrm = (i: number): Pt => {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const dx = pts[b * 2] - pts[a * 2];
    const dy = pts[b * 2 + 1] - pts[a * 2 + 1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };

  const go = (from: number, count: number, dir: number, amp: number, bias: number, w: number, a: number, cutChance: number) => {
    const lo = smoothNoise(rnd, Math.max(2, Math.round(len / 30)));
    const hi = smoothNoise(rnd, Math.max(6, Math.round(len / 6)));
    let cur: number[] = [];
    const flush = () => {
      if (cur.length >= 4) pieces(out, cur, w * (0.9 + rnd() * 0.2) * boldness, a, rnd, 0, st.piece + rnd() * st.piece * 0.7);
      cur = [];
    };
    for (let k = 0; k < count; k++) {
      let i = from + dir * k;
      if (sub.closed) i = ((i % (n - 1)) + (n - 1)) % (n - 1);
      else i = Math.min(n - 1, Math.max(0, i));
      const t = k / Math.max(1, count - 1);
      const off = amp * (0.85 * lo(t) + 0.22 * hi(t)) + bias;
      const [nx, ny] = nrm(i);
      const x = pts[i * 2] + nx * off;
      const y = pts[i * 2 + 1] + ny * off;
      if (hasMask && hidden(x, y)) {
        flush();
        continue;
      }
      cur.push(x, y);
      if (rnd() < cutChance) flush();
    }
    flush();
  };

  const closed = sub.closed;
  const from = closed ? Math.floor(rnd() * (n - 1)) : 0;
  const dir = closed ? (rnd() < 0.5 ? 1 : -1) : rnd() < 0.2 ? -1 : 1;
  const count = closed ? n + Math.round(2 + rnd() * 4) : n;
  const startFrom = !closed && dir < 0 ? n - 1 : from;
  go(startFrom, count, dir, st.amp * (0.85 + rnd() * 0.3), 0, st.ow, 0.74 + rnd() * 0.2, (st.lifts / Math.max(30, len)) * (len < 60 ? 0.6 : 1));
  if (len > 24 && rnd() < (closed ? 0.6 : 0.3)) {
    const span = Math.max(8, Math.round(n * (0.25 + rnd() * 0.3)));
    const f2 = closed ? Math.floor(rnd() * (n - 1)) : Math.floor(rnd() * Math.max(1, n - span));
    go(f2, span, 1, st.amp * 1.15, (rnd() < 0.5 ? -1 : 1) * st.amp * 0.5, st.ow * 0.75, 0.4 + rnd() * 0.2, 0);
  }
}

/** Little strokes and dots: a mark. Lines go in the contour trace; texture arrives with the hatching. */
function markOps(mk: Mark, st: PenStyle, rnd: () => number, hidden: (x: number, y: number) => boolean, hasMask: boolean, line: Op[], tex: Op[], bounds: { h: number }) {
  const m = typeof mk === "string" ? { d: mk } : mk;
  const wScale = m.w ?? 1;
  const aBase = m.a ?? 0.85;
  const isTex = (typeof mk === "object" && mk.tex) === true;
  for (const sub of flatten(m.d, 1.5)) {
    if (sub.p.length < 4) {
      // A dot.
      const [x, y] = sub.p;
      if (hasMask && hidden(x, y)) continue;
      const r = st.ow * (0.62 + rnd() * 0.5) * wScale;
      tex.push({ p: [x, y, x + 0.05, y + 0.05], w: r * 1.5, a: Math.min(0.95, aBase * (0.75 + rnd() * 0.3)), x: x + (rnd() - 0.5) * 6, s: 0, l: 0 });
      continue;
    }
    const { pts, len } = resample(sub.p, sub.closed, 1.6);
    const n = pts.length / 2;
    const lo = smoothNoise(rnd, Math.max(2, Math.round(len / 22)));
    let cur: number[] = [];
    const target = isTex ? tex : line;
    const flush = () => {
      if (cur.length >= 4) {
        const key = cur[0] + 0.12 * (cur[1] - bounds.h / 2);
        pieces(target, cur, st.ow * 0.85 * wScale * (0.85 + rnd() * 0.3), aBase * (0.85 + rnd() * 0.2), rnd, isTex ? key + (rnd() - 0.5) * 6 : 0, 24);
      }
      cur = [];
    };
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      const dx = pts[b * 2] - pts[a * 2];
      const dy = pts[b * 2 + 1] - pts[a * 2 + 1];
      const l = Math.hypot(dx, dy) || 1;
      const off = st.amp * 0.55 * lo(i / Math.max(1, n - 1));
      const x = pts[i * 2] - (dy / l) * off;
      const y = pts[i * 2 + 1] + (dx / l) * off;
      if (hasMask && hidden(x, y)) {
        flush();
        continue;
      }
      cur.push(x, y);
    }
    flush();
  }
}

/** Turn a scene into pen strokes. Same layers and seed in, same drawing out. */
function compose(layers: readonly Layer[], st: PenStyle, seed: number, dw: number, dh: number): Composition {
  const masks = buildMasks(layers, dw, dh, st.mask);
  const outline: Op[] = [];
  const hatch: Op[] = [];
  const bounds = { h: dh };
  layers.forEach((layer, li) => {
    const rnd = mulberry32(seed * 7919 + li * 104729 + 17);
    const hidden = masks[li];
    const hasMask = layers.slice(li + 1).some((l) => l.knockout);
    const subs = layer.d ? flatten(layer.d, 2) : [];
    hatchLayer(layer, subs, st, rnd, hidden, hasMask, hatch, bounds);
    if (layer.outline !== false) for (const s of subs) contourSub(s, st, rnd, hidden, hasMask, outline);
    for (const mk of layer.marks ?? []) markOps(mk, st, rnd, hidden, hasMask, outline, hatch, bounds);
  });
  hatch.sort((a, b) => a.x - b.x);
  let total = 0;
  for (const o of outline) {
    o.l = pathLen(o.p);
    o.s = total;
    total += o.l;
  }
  return { outline, hatch, total, kmin: hatch.length ? hatch[0].x : 0, kmax: hatch.length ? hatch[hatch.length - 1].x : 1 };
}

/* ── painting ── */

/** Where the sheet sits on the canvas: a scale and an offset in canvas pixels. */
type View = { k: number; ox: number; oy: number };

/** Show the whole sheet, or (cover) fill the box and crop the sides. */
function viewFor(cw: number, ch: number, dw: number, dh: number, cover: boolean): View {
  const k = cover ? Math.max(cw / dw, ch / dh) : Math.min(cw / dw, ch / dh);
  return { k, ox: (cw - dw * k) / 2, oy: (ch - dh * k) / 2 };
}

const INK_CH = INK_RGB.split(" ").map(Number);
const penColor = (a: number, c = 1) => `rgba(${Math.round(INK_CH[0] * c)},${Math.round(INK_CH[1] * c)},${Math.round(INK_CH[2] * c)},${a.toFixed(2)})`;

function beginPen(ctx: CanvasRenderingContext2D, v: View) {
  ctx.setTransform(v.k, 0, 0, v.k, v.ox, v.oy);
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function stroke(ctx: CanvasRenderingContext2D, p: number[], w: number, a: number, c: number | undefined, upTo = Infinity) {
  ctx.lineWidth = w;
  ctx.strokeStyle = penColor(a, c);
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  let run = 0;
  for (let i = 2; i < p.length; i += 2) {
    const seg = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
    if (run + seg > upTo) {
      const f = (upTo - run) / (seg || 1);
      ctx.lineTo(p[i - 2] + (p[i] - p[i - 2]) * f, p[i - 1] + (p[i + 1] - p[i - 1]) * f);
      ctx.stroke();
      return;
    }
    ctx.lineTo(p[i], p[i + 1]);
    run += seg;
  }
  ctx.stroke();
}

/** The contours (and line marks), traced as far as `upTo` sheet units along. */
function paintOutline(ctx: CanvasRenderingContext2D, c: Composition, upTo: number) {
  for (const o of c.outline) {
    if (o.s >= upTo) break;
    stroke(ctx, o.p, o.w, o.a, o.c, upTo - o.s);
  }
}

/** Hatch strokes from index `from` while they start left of `limit`. Returns the next index. */
function paintHatch(ctx: CanvasRenderingContext2D, c: Composition, from: number, limit: number) {
  let i = from;
  for (; i < c.hatch.length && c.hatch[i].x <= limit; i++) {
    const o = c.hatch[i];
    stroke(ctx, o.p, o.w, o.a, o.c);
  }
  return i;
}

function paintAll(ctx: CanvasRenderingContext2D, c: Composition, v: View, clip?: Path2D) {
  beginPen(ctx, v);
  if (clip) ctx.clip(clip);
  paintOutline(ctx, c, Infinity);
  paintHatch(ctx, c, 0, Infinity);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ───────────────────────────── shapes for the scenes ─────────────────────────────
 * Small helpers that write path strings, so a scene reads as a list of things:
 * an oval here, a scalloped canopy there, a limb from one point to another.
 */

const P = (x: number, y: number) => `${fmt(x)} ${fmt(y)}`;
const RAD = Math.PI / 180;

/** A smooth curve through the points (Catmull-Rom as cubic Béziers) — closed for a blob, open for a stroke. */
function smooth(pts: readonly Pt[], closed = true): string {
  const n = pts.length;
  if (n < 2) return "";
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  let d = `M${P(pts[0][0], pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += `C${P(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${P(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${P(p2[0], p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}

/** Straight edges. */
const poly = (pts: readonly Pt[], closed = true) => `M${pts.map((p) => P(p[0], p[1])).join("L")}${closed ? "Z" : ""}`;
const line = (x1: number, y1: number, x2: number, y2: number) => `M${P(x1, y1)}L${P(x2, y2)}`;
const box = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

function oval(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const k = 0.5523;
  const c = Math.cos(rot * RAD);
  const s = Math.sin(rot * RAD);
  const T = (x: number, y: number) => P(cx + x * c - y * s, cy + x * s + y * c);
  return `M${T(rx, 0)}C${T(rx, k * ry)} ${T(k * rx, ry)} ${T(0, ry)}C${T(-k * rx, ry)} ${T(-rx, k * ry)} ${T(-rx, 0)}C${T(-rx, -k * ry)} ${T(-k * rx, -ry)} ${T(0, -ry)}C${T(k * rx, -ry)} ${T(rx, -k * ry)} ${T(rx, 0)}Z`;
}
const circ = (cx: number, cy: number, r: number) => oval(cx, cy, r, r);

/** A rounded rectangle. */
function rbox(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${P(x + q, y)}H${fmt(x + w - q)}Q${P(x + w, y)} ${P(x + w, y + q)}V${fmt(y + h - q)}Q${P(x + w, y + h)} ${P(x + w - q, y + h)}H${fmt(x + q)}Q${P(x, y + h)} ${P(x, y + h - q)}V${fmt(y + q)}Q${P(x, y)} ${P(x + q, y)}Z`;
}

/** A capsule from one point to another, its width tapering from w0 to w1 — an arm, a leg, a stem, a rail. */
function limb(x1: number, y1: number, x2: number, y2: number, w0: number, w1 = w0): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const nx = -uy;
  const ny = ux;
  const a = w0 / 2;
  const b = w1 / 2;
  return smooth([
    [x1 + nx * a, y1 + ny * a],
    [x1 - ux * a * 0.9, y1 - uy * a * 0.9],
    [x1 - nx * a, y1 - ny * a],
    [x2 - nx * b, y2 - ny * b],
    [x2 + ux * b * 0.9, y2 + uy * b * 0.9],
    [x2 + nx * b, y2 + ny * b],
  ]);
}

/** A straight-sided strip from one point to another (a plank, a ladder rail, a book's edge). */
function band(x1: number, y1: number, x2: number, y2: number, w0: number, w1 = w0): string {
  const l = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / l) / 2;
  const ny = ((x2 - x1) / l) / 2;
  return poly([[x1 + nx * w0, y1 + ny * w0], [x2 + nx * w1, y2 + ny * w1], [x2 - nx * w1, y2 - ny * w1], [x1 - nx * w0, y1 - ny * w0]]);
}

/** A scalloped, bumpy ellipse: a cloud, a canopy, a bush, a puff of hair. */
function puff(cx: number, cy: number, rx: number, ry: number, n = 8, seed = 1, bulge = 0.34): string {
  const r = mulberry32(seed * 977 + 3);
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = ((i + (r() - 0.5) * 0.36) / n) * Math.PI * 2 - Math.PI / 2;
    const k = 0.9 + r() * 0.16;
    return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)];
  });
  let d = `M${P(pts[0][0], pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const k = 1 + bulge * (0.75 + r() * 0.5);
    d += `Q${P(cx + (mx - cx) * k, cy + (my - cy) * k)} ${P(q[0], q[1])}`;
  }
  return d + "Z";
}

/** A leaf, petal or flame: pointed at both ends, `w` fat at the belly. */
function leaf(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const l = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / l) * w;
  const ny = ((x2 - x1) / l) * w;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M${P(x1, y1)}Q${P(mx + nx, my + ny)} ${P(x2, y2)}Q${P(mx - nx, my - ny)} ${P(x1, y1)}Z`;
}

/** A lumpy oval of hills, a mound, a bank: a smooth blob with a flat-ish bottom. */
const mound = (cx: number, baseY: number, w: number, h: number, seed = 1) => {
  const r = mulberry32(seed * 53 + 5);
  return smooth([
    [cx - w / 2, baseY],
    [cx - w * 0.32, baseY - h * (0.6 + r() * 0.1)],
    [cx - w * 0.05, baseY - h * (0.95 + r() * 0.05)],
    [cx + w * 0.26, baseY - h * (0.7 + r() * 0.15)],
    [cx + w / 2, baseY],
  ], false) + "Z";
};

/* marks */

/** Grass: little tufts of curved ticks standing on a line. */
function grass(x0: number, x1: number, y: number, n: number, h: number, seed = 1, lean = 2): Mark {
  const r = mulberry32(seed * 313 + 11);
  let d = "";
  let x = x0;
  const step = (x1 - x0) / Math.max(1, n / 3);
  while (x < x1) {
    const blades = 2 + Math.floor(r() * 3);
    const base = y + (r() - 0.5) * 3;
    for (let b = 0; b < blades; b++) {
      const hh = h * (0.4 + r() * 0.8);
      const l = (b - (blades - 1) / 2) * lean * (0.6 + r() * 0.8) + (r() - 0.5) * lean;
      d += `M${P(x + b * 0.9, base)}Q${P(x + b * 0.9 + l * 0.2, base - hh * 0.6)} ${P(x + b * 0.9 + l, base - hh)}`;
    }
    x += step * (0.4 + r() * 1.2);
  }
  return { d, tex: true, w: 0.85, a: 0.8 };
}

/** Stipple: n dots scattered in an ellipse. */
function stip(cx: number, cy: number, rx: number, ry: number, n: number, seed = 1, a = 0.75): Mark {
  const r = mulberry32(seed * 419 + 23);
  let d = "";
  for (let i = 0; i < n; i++) {
    const t = r() * Math.PI * 2;
    const k = Math.sqrt(r());
    d += `M${P(cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k)}`;
  }
  return { d, tex: true, a };
}

/** Vertical streaks: rain, or the light in a window. */
function streaks(x0: number, x1: number, y0: number, y1: number, n: number, len: number, seed = 1, lean = 0): Mark {
  const r = mulberry32(seed * 251 + 29);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const l = len * (0.5 + r() * 0.8);
    d += `M${P(x, y)}L${P(x + lean * l, y + l)}`;
  }
  return { d, tex: true, w: 0.9, a: 0.75 };
}

/** A spiral, as a path to draw. */
function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, a0 = 0): string {
  const n = Math.ceil(turns * 14);
  const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = a0 * RAD + turns * Math.PI * 2 * t;
    const r = lerp(r0, r1, t);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  return smooth(pts, false);
}

/** A path of Béziers through points, as an open stroke. */
const stroke2 = (pts: readonly Pt[]) => smooth(pts, false);

/** A wavy line from x0 to x1. */
function wavy(x0: number, x1: number, y: number, amp: number, wl: number, phase = 0): string {
  const n = Math.max(3, Math.round(((x1 - x0) / wl) * 4));
  return smooth(Array.from({ length: n + 1 }, (_, i): Pt => [x0 + ((x1 - x0) * i) / n, y + amp * Math.sin(phase + (i / 4) * Math.PI * 2)]), false);
}

/** A bare-paper strip that follows a wave (cut out of hatching: a ripple, a highlight). */
function waveStrip(x0: number, x1: number, y: number, amp: number, wl: number, th: number, phase = 0): string {
  const n = Math.max(3, Math.round(((x1 - x0) / wl) * 5));
  const at = (i: number, dy: number): Pt => [x0 + ((x1 - x0) * i) / n, y + dy + amp * Math.sin(phase + (i / 5) * Math.PI * 2)];
  const top = Array.from({ length: n + 1 }, (_, i) => at(i, -th / 2 * Math.sin((i / n) * Math.PI) - 0.3));
  const bot = Array.from({ length: n + 1 }, (_, i) => at(n - i, th / 2 * Math.sin(((n - i) / n) * Math.PI) + 0.3));
  return smooth(top, false) + "L" + smooth(bot, false).slice(1) + "Z";
}

/** A star, or a sparkle. */
function star(cx: number, cy: number, R: number, r: number, n = 5, rot = -90): string {
  return poly(Array.from({ length: n * 2 }, (_, i): Pt => {
    const a = (rot + (i * 180) / n) * RAD;
    const k = i % 2 ? r : R;
    return [cx + k * Math.cos(a), cy + k * Math.sin(a)];
  }));
}

/* a person, a scene's smallest actor. Built 100 tall with its feet at the origin, set down with put(). */

type Pose = {
  /** Where the hands go, from the feet, in a 100-tall person. */
  lHand: Pt;
  rHand: Pt;
  /** Feet spread, and lean of the body. */
  stride?: number;
  lean?: number;
  tone?: number;
  /** The head: dark (a silhouette), or a bare face with hair. */
  face?: boolean;
  hair?: number;
  hat?: boolean;
};

function person(o: Pose): Layer[] {
  const tone = o.tone ?? 0.92;
  const st = o.stride ?? 8;
  const lean = o.lean ?? 0;
  const sx = lean * 0.6;
  const hx = lean;
  const layers: Layer[] = [];
  // legs, then the body, then the head, then the arms over it
  layers.push({ d: limb(-4 - st * 0.2, -47, -6 - st, -3, 10, 8), tone, outline: true });
  layers.push({ d: limb(4 + st * 0.2, -47, 6 + st, -3, 10, 8), tone, outline: true });
  layers.push({ d: oval(-7 - st, -1.5, 7, 2.6), tone, outline: false });
  layers.push({ d: oval(7 + st, -1.5, 7, 2.6), tone, outline: false });
  layers.push({ d: limb(sx * 0.4, -46, sx, -78, 22, 21), tone, angle: 4 });
  const head: Pt = [hx, -90];
  if (o.face) {
    layers.push({ d: circ(head[0], head[1], 8.4), tone: 0, knockout: true, outline: true });
    layers.push({ d: oval(head[0], head[1] - 3.6, 8.9, 6.6), tone: o.hair ?? 0.9, outline: false });
  } else {
    layers.push({ d: circ(head[0], head[1], 8.4), tone, outline: true });
  }
  if (o.hat) layers.push({ d: poly([[hx - 8, -95], [hx + 8, -95], [hx, -114]]), tone: 0.55, outline: true });
  layers.push({ d: limb(sx - 8, -76, o.lHand[0], o.lHand[1], 8, 6.6), tone, outline: true });
  layers.push({ d: limb(sx + 8, -76, o.rHand[0], o.rHand[1], 8, 6.6), tone, outline: true });
  return layers;
}

/** A lemon: an oval that comes to a small nub at each end. */
function lemon(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const c = Math.cos(rot * RAD);
  const s = Math.sin(rot * RAD);
  const pts: Pt[] = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const tip = Math.pow(Math.abs(Math.cos(a)), 14);
    const x = rx * Math.cos(a) * (1 + 0.1 * tip);
    const y = ry * Math.sin(a) * (1 - 0.32 * tip);
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
  return smooth(pts);
}

/** Joined subpaths, so one layer can hold a row of shapes. */
const many = (...ds: string[]) => ds.join("");

/** Dots along a line of points — a trail. */
function trail(pts: readonly Pt[], every = 7, seed = 1): Mark {
  const r = mulberry32(seed * 37 + 1);
  let d = "";
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0);
    let s = every - carry;
    while (s <= l) {
      d += `M${P(x0 + ((x1 - x0) * s) / l, y0 + ((y1 - y0) * s) / l)}`;
      s += every * (0.85 + r() * 0.3);
    }
    carry = l - (s - every);
  }
  return { d, tex: true, a: 0.8 };
}

/** A little turf: short grass ticks and a few loose strokes along a line — the ground is suggested, not filled. */
function turf(x0: number, x1: number, y: number, seed = 1, density = 1): Layer {
  const r = mulberry32(seed * 71 + 9);
  let d = "";
  const n = Math.round(4 * density);
  for (let i = 0; i < n; i++) {
    const a = x0 + r() * (x1 - x0) * 0.7;
    const b = Math.min(x1, a + 24 + r() * 60);
    const yy = y + (r() - 0.3) * 6;
    d += `M${P(a, yy)}Q${P((a + b) / 2, yy + (r() - 0.5) * 3)} ${P(b, yy + (r() - 0.5) * 2)}`;
  }
  return { d: "", tone: 0, marks: [{ d, w: 0.75, a: 0.6 }, grass(x0, x1, y, Math.round(26 * density), 6, seed + 3)] };
}

/* ───────────────────────────── the fourteen pages ─────────────────────────────
 * Each scene is a list of layers, back to front. Most of every sheet is bare
 * paper: the hatching goes on the subject, darker on its shadow side and bare
 * where the light lands, and the ground is only a few ticks and strokes.
 * The sheet is 360 × 240; the card shows the middle of it (about x 40 → 320).
 */

/* 1 — Market Morning: a tiny person carrying a giant lemon */
function sceneMarket(): Layer[] {
  const crate = (x: number, y: number, w: number, seed: number): Layer[] => [
    { d: box(x, y, w, 44), tone: 0.1, ramp: { to: 0.46, dir: "right" }, marks: [line(x + 3, y + 15, x + w - 3, y + 16), line(x + 3, y + 30, x + w - 3, y + 29)] },
    ...[0, 1, 2, 3].map((k): Layer => ({ d: lemon(x + 12 + k * ((w - 24) / 3), y - 1 + (k % 2) * 3, 11, 8, k * 20 - 20), tone: 0.1, ramp: { to: 0.6, dir: "right" }, marks: [stip(x + 12 + k * ((w - 24) / 3), y, 6, 4, 5, seed + k)] })),
  ];
  return [
    ...crate(48, 168, 76, 1),
    ...crate(244, 170, 74, 2),
    turf(40, 330, 216, 4, 0.8),
    { d: oval(186, 219, 46, 5), tone: 0.5, outline: false },
    // the lemon: pale where the light lands, dark on the far side
    { d: lemon(186, 84, 88, 46, -12), tone: 0.08, ramp: { to: 0.9, dir: "right" }, angle: -5 },
    { d: lemon(186, 84, 88, 46, -12), tone: 0.3, ramp: { to: 0, dir: "up" }, outline: false, angle: 4 },
    { d: leaf(214, 50, 244, 26, 11), tone: 0.9, marks: [line(216, 48, 240, 30)] },
    { d: "", tone: 0, marks: [stip(190, 90, 76, 32, 120, 6, 0.7)] },
    // the person underneath, arms up
    ...put(person({ lHand: [-13, -104], rHand: [13, -104], stride: 9, lean: 1, face: true, hair: 0.9 }), 186, 220, 0.9),
    { d: lemon(96, 228, 13, 8, -10), tone: 0.1, ramp: { to: 0.6, dir: "right" } },
    { d: lemon(276, 230, 12, 7, 12), tone: 0.1, ramp: { to: 0.6, dir: "right" } },
  ];
}

/* 2 — Lazy Sunday: the pillow won */
function scenePillow(): Layer[] {
  const pillow = smooth([[76, 104], [116, 66], [180, 54], [246, 68], [282, 102], [288, 146], [258, 178], [190, 186], [118, 182], [82, 156]]);
  const blanket = smooth([[58, 166], [108, 146], [168, 154], [232, 148], [292, 158], [304, 196], [258, 216], [160, 220], [84, 216], [52, 194]]);
  return [
    { d: box(62, 22, 50, 66), tone: 0, marks: [line(87, 22, 87, 88), line(62, 55, 112, 55)] },
    { d: pillow, tone: 0.02, ramp: { to: 0.34, dir: "right" }, marks: [{ d: stroke2([[84, 106], [98, 118], [90, 136]]), a: 0.6 }, { d: stroke2([[280, 106], [262, 120], [272, 140]]), a: 0.6 }, { d: stroke2([[112, 74], [128, 84]]), a: 0.55 }] },
    { d: oval(172, 118, 46, 30, -6), tone: 0.3, ramp: { to: 0.06, dir: "left" }, outline: false },
    { d: puff(164, 92, 30, 20, 8, 3), tone: 0.92, angle: 4 },
    { d: circ(166, 108, 24), tone: 0, knockout: true, marks: [
      { d: stroke2([[154, 108], [158, 111], [163, 108]]), w: 0.9 },
      { d: stroke2([[172, 108], [176, 111], [181, 108]]), w: 0.9 },
      { d: stroke2([[162, 120], [168, 123], [174, 120]]), w: 0.9 },
      { d: stroke2([[168, 111], [166, 116], [170, 116]]), w: 0.7 },
      stip(150, 114, 4, 3, 5, 8, 0.55),
    ] },
    { d: puff(150, 96, 12, 16, 5, 9), tone: 0.9, outline: false },
    { d: blanket, tone: 0.1, ramp: { to: 0.66, dir: "right" }, angle: -4, marks: [{ d: stroke2([[104, 174], [136, 190], [124, 210]]), a: 0.8 }, { d: stroke2([[196, 172], [226, 190], [212, 212]]), a: 0.8 }, { d: stroke2([[262, 176], [280, 192]]), a: 0.7 }] },
    { d: smooth([[62, 160], [120, 146], [180, 154], [232, 148], [292, 156], [292, 168], [232, 162], [180, 170], [120, 164], [64, 174]]), tone: 0, knockout: true },
    { d: "", tone: 0, marks: [
      { d: `M${P(226, 58)}L${P(250, 58)}L${P(228, 82)}L${P(252, 82)}`, w: 1.25, a: 0.9 },
      { d: `M${P(260, 34)}L${P(278, 34)}L${P(262, 52)}L${P(280, 52)}`, w: 1.15, a: 0.85 },
      { d: `M${P(288, 14)}L${P(300, 14)}L${P(289, 26)}L${P(301, 26)}`, w: 1.05, a: 0.8 },
    ] },
    turf(50, 320, 226, 7, 0.7),
  ];
}

/* 3 — Monday Fog: a cloud-headed person with coffee */
function sceneFog(): Layer[] {
  const coat = smooth([[138, 112], [176, 104], [216, 112], [230, 156], [236, 200], [176, 208], [120, 200], [124, 156]]);
  const win = (x: number, y: number): Mark => ({ d: box(x, y, 9, 12), w: 0.85, a: 0.7 });
  return [
    // a building, a loose sketch, and a lamp half lost in the fog
    { d: box(46, 96, 64, 122), tone: 0.05, ramp: { to: 0.24, dir: "right" }, marks: [...[104, 128, 152, 176].flatMap((y) => [56, 76, 94].map((x) => win(x, y)))] },
    { d: limb(282, 220, 282, 104, 4), tone: 0.34, ramp: { to: 0.08, dir: "down" } },
    { d: circ(282, 96, 8), tone: 0, marks: [line(266, 86, 260, 82), line(298, 86, 304, 82), line(282, 78, 282, 72)] },
    // the bank of fog: paper, over the feet
    { d: smooth([[20, 170], [90, 158], [190, 164], [270, 156], [350, 168], [350, 196], [270, 202], [180, 198], [90, 202], [20, 196]]), tone: 0, knockout: true, outline: false },
    // the person
    { d: limb(150, 196, 148, 228, 18), tone: 0.94 },
    { d: limb(204, 196, 208, 228, 18), tone: 0.94 },
    { d: oval(142, 230, 14, 4.4), tone: 0.9 },
    { d: oval(214, 230, 14, 4.4), tone: 0.9 },
    { d: limb(132, 122, 124, 186, 14, 12), tone: 0.9 },
    { d: coat, tone: 0.5, ramp: { to: 0.92, dir: "right" }, angle: 3 },
    { d: poly([[166, 106], [176, 142], [190, 106]]), tone: 0, knockout: true },
    { d: line(176, 142, 176, 204), tone: 0, outline: true },
    { d: limb(214, 122, 230, 152, 14, 12), tone: 0.9 },
    { d: limb(230, 152, 206, 148, 11, 9), tone: 0.9 },
    { d: poly([[176, 134], [204, 134], [200, 164], [180, 164]]), tone: 0, knockout: true, marks: [{ d: stroke2([[204, 140], [214, 142], [212, 154], [202, 156]]), w: 1.1 }] },
    { d: oval(190, 134, 14, 3.4), tone: 0.95 },
    { d: circ(204, 150, 6), tone: 0.9 },
    { d: "", tone: 0, marks: [{ d: stroke2([[186, 128], [178, 118], [188, 108], [180, 98]]), a: 0.8 }, { d: stroke2([[196, 128], [204, 118], [194, 108], [200, 98]]), a: 0.7 }] },
    // the cloud on top
    { d: puff(176, 66, 64, 40, 10, 11, 0.42), tone: 0.04, ramp: { to: 0.42, dir: "right" }, angle: -3, marks: [{ d: stroke2([[126, 74], [134, 66], [146, 68]]), a: 0.7 }, { d: stroke2([[200, 50], [212, 46], [224, 54]]), a: 0.7 }, { d: stroke2([[150, 44], [160, 38], [172, 40]]), a: 0.7 }] },
    { d: "", tone: 0, marks: [
      { d: stroke2([[152, 78], [160, 81], [168, 78]]), w: 1.1 },
      { d: stroke2([[186, 78], [194, 81], [202, 78]]), w: 1.1 },
      { d: stroke2([[172, 92], [180, 91], [188, 92]]), w: 0.9 },
    ] },
    { d: smooth([[80, 218], [150, 210], [240, 216], [310, 210], [330, 226], [300, 246], [200, 250], [110, 246], [70, 234]]), tone: 0, knockout: true, outline: false },
    { d: "", tone: 0, marks: [streaks(140, 220, 234, 246, 6, 8, 4)] },
  ];
}

/* 4 — Bees in the Lavender */
function lavender(x: number, base: number, top: number, lean: number, tone: number, seed: number, size = 1): Layer[] {
  const tx = x + lean;
  const spikeH = (base - top) * 0.44;
  const cy = top + spikeH / 2;
  const w = 5.6 * size;
  const stemTop = top + spikeH - 4;
  const blade = (dx: number, h: number, bend: number): Mark => ({ d: stroke2([[x, base], [x + dx * 0.4 + bend, base - h * 0.55], [x + dx, base - h]]), w: 0.9, a: 0.85 });
  return [
    { d: "", tone: 0, marks: [
      { d: stroke2([[x, base], [x + lean * 0.3, base - (base - top) * 0.35], [tx, stemTop]]), w: 1.1, a: 0.9 },
      blade(-16 * size, 44 * size, 3), blade(14 * size, 38 * size, -3), blade(-6 * size, 30 * size, 2),
    ] },
    { d: puff(tx, cy, w, spikeH / 2, 9, seed, 0.5), tone: tone * 0.5, ramp: { to: tone, dir: "right" }, angle: lean * 0.5 },
  ];
}

function bee(): Layer[] {
  return [
    { d: oval(-4, -18, 8, 16, -22), tone: 0.04, knockout: true, marks: [line(-6, -30, -4, -8)] },
    { d: oval(11, -17, 8, 15, 24), tone: 0.04, knockout: true, marks: [line(13, -28, 10, -6)] },
    { d: oval(0, 0, 22, 14.5), tone: 0.8 },
    { d: band(-8, -14, -8, 14, 5.5), tone: 0, knockout: true },
    { d: band(4, -14, 4, 14, 5.5), tone: 0, knockout: true },
    { d: circ(-24, -1, 9.5), tone: 0.85 },
    { d: poly([[21, -3], [31, 1], [21, 4]]), tone: 0.9 },
    { d: circ(-27, -3, 1.6), tone: 0, knockout: true, outline: false },
    { d: "", tone: 0, marks: [{ d: stroke2([[-28, -9], [-33, -19], [-28, -25]]), w: 0.9 }, { d: stroke2([[-23, -10], [-21, -21], [-15, -26]]), w: 0.9 }, line(-8, 14, -10, 21), line(2, 14, 2, 22), line(10, 12, 13, 19)] },
  ];
}

function sceneLavender(): Layer[] {
  const back = [58, 96, 142, 196, 246, 292].flatMap((x, i) => lavender(x, 196, 86 + (i % 3) * 8, (i % 2 ? 4 : -4), 0.4, 10 + i, 0.78));
  const front = [72, 124, 240, 288].flatMap((x, i) => lavender(x, 232, 40 + ((i * 17) % 34), (i % 2 ? -7 : 8), 0.95, 30 + i, 1.05));
  return [
    ...back,
    turf(40, 330, 200, 4, 0.8),
    ...front,
    ...lavender(184, 232, 30, 2, 0.95, 50, 1.2),
    ...put(bee(), 150, 130, 1.5, -8),
    ...put(bee(), 250, 84, 0.72, 14, true),
    ...put(bee(), 92, 58, 0.62, -12),
    { d: "", tone: 0, marks: [trail([[176, 138], [196, 156], [220, 146], [226, 120], [208, 106]], 6, 3)] },
    turf(40, 330, 234, 9, 1),
  ];
}

/* 5 — Laps at the Lido: a swimmer between two lane ropes, seen from above */
function sceneLido(): Layer[] {
  const floats = (y: number, seed: number): Layer[] => {
    const even: string[] = [];
    const odd: string[] = [];
    for (let i = 0; i < 27; i++) (i % 2 ? odd : even).push(circ(6 + i * 13.4, y + Math.sin(i * 0.7 + seed) * 1.2, 4.4));
    return [
      { d: "", tone: 0, marks: [{ d: wavy(0, 360, y, 1.2, 40, seed), w: 0.7, a: 0.55 }] },
      { d: many(...odd), tone: 0, knockout: true },
      { d: many(...even), tone: 0.95 },
    ];
  };
  const foam = (x: number, y: number, r: number, seed: number): Layer => ({ d: puff(x, y, r, r * 0.8, 7, seed, 0.5), tone: 0, knockout: true, marks: [stip(x, y, r * 0.6, r * 0.5, 5, seed, 0.6)] });
  const ripples: Mark[] = [];
  const rr = mulberry32(5);
  for (let i = 0; i < 16; i++) {
    const y = 40 + rr() * 168;
    const x0 = 20 + rr() * 240;
    ripples.push({ d: wavy(x0, x0 + 40 + rr() * 60, y, 2.2, 22, rr() * 6), w: 0.75, a: 0.55 });
  }
  return [
    // the water: a light shadow along the lane and ripples, nothing more
    { d: box(0, 100, 360, 56), tone: 0.1, ramp: { to: 0.28, dir: "down" }, outline: false, angle: 2 },
    { d: "", tone: 0, marks: [...ripples, line(0, 30, 360, 30), line(0, 214, 360, 214), ...Array.from({ length: 14 }, (_, i) => line(i * 26 + 10, 214, i * 26 + 10, 232)), ...Array.from({ length: 14 }, (_, i) => line(i * 26 + 18, 8, i * 26 + 18, 30))] },
    ...floats(80, 1),
    ...floats(160, 3),
    // the swimmer, mid-stroke: paper limbs shaded underneath, a dark cap and suit
    foam(62, 112, 17, 21),
    { d: limb(124, 111, 74, 102, 12, 8), tone: 0.14, ramp: { to: 0.6, dir: "down" } },
    { d: limb(124, 127, 78, 140, 12, 8), tone: 0.14, ramp: { to: 0.6, dir: "down" } },
    { d: limb(206, 106, 190, 78, 11, 9), tone: 0.14, ramp: { to: 0.6, dir: "right" } },
    { d: limb(190, 78, 218, 66, 9, 7), tone: 0.14, ramp: { to: 0.6, dir: "down" } },
    foam(228, 64, 14, 22),
    { d: limb(216, 128, 288, 138, 11, 8), tone: 0.14, ramp: { to: 0.6, dir: "down" } },
    { d: limb(122, 118, 232, 118, 26, 24), tone: 0.1, ramp: { to: 0.6, dir: "down" } },
    { d: oval(156, 118, 24, 13), tone: 0.92 },
    { d: circ(248, 118, 12), tone: 0.96 },
    { d: "", tone: 0, marks: [{ d: stroke2([[236, 134], [206, 148], [168, 154], [126, 154]]), a: 0.65 }, { d: stroke2([[240, 102], [214, 92], [178, 90]]), a: 0.55 }, trail([[264, 118], [282, 122], [302, 128]], 5, 2)] },
  ];
}

/* 6 — Overthinking: a figure on a ladder into a giant head of spirals */
function sceneHead(): Layer[] {
  const head = smooth([
    [150, 216], [146, 178], [112, 152], [98, 110], [108, 62], [150, 30], [206, 26], [250, 50], [270, 92], [272, 124], [284, 142], [298, 158], [282, 166], [280, 182], [272, 196], [248, 206], [230, 198], [216, 178], [218, 216],
  ]);
  const rung = (t: number) => {
    const a: Pt = [70 + 48 * t, 216 - 152 * t];
    const b: Pt = [96 + 48 * t, 220 - 152 * t];
    return line(a[0], a[1], b[0], b[1]);
  };
  return [
    turf(40, 330, 216, 3, 0.8),
    { d: head, tone: 0.04, ramp: { to: 0.36, dir: "right" }, angle: 4 },
    { d: puff(184, 78, 82, 50, 10, 4, 0.3), tone: 0.2, ramp: { to: 0.04, dir: "down" }, outline: true },
    // the thoughts
    { d: "", tone: 0, marks: [
      { d: spiral(166, 82, 1.5, 32, 3.4), w: 1.25, a: 0.9 },
      { d: spiral(228, 66, 1, 18, 2.8, 90), w: 1.15, a: 0.88 },
      { d: spiral(140, 118, 1, 14, 2.4, 200), w: 1.1, a: 0.85 },
      { d: spiral(216, 106, 1, 22, 3.2, 40), w: 1.2, a: 0.88 },
      { d: stroke2([[186, 120], [200, 132], [184, 138], [196, 124], [212, 134]]), w: 1, a: 0.8 },
    ] },
    // the face
    { d: "", tone: 0, marks: [
      { d: stroke2([[252, 116], [258, 120], [264, 116]]), w: 1.05 },
      { d: stroke2([[248, 108], [258, 104], [266, 108]]), w: 1 },
      { d: stroke2([[262, 130], [264, 142], [272, 144]]), w: 0.9 },
      { d: stroke2([[254, 174], [264, 172], [272, 176]]), w: 1 },
      { d: oval(138, 128, 7, 11, 10), w: 0.9, a: 0.8 },
    ] },
    // the ladder
    { d: limb(70, 216, 120, 62, 5), tone: 0.8, outline: true },
    { d: limb(98, 222, 148, 68, 5), tone: 0.8, outline: true },
    { d: "", tone: 0, marks: [0.1, 0.24, 0.38, 0.52, 0.66, 0.8, 0.94].map((t) => ({ d: rung(t), w: 1.1, a: 0.9 })) },
    // the climber
    ...put(person({ lHand: [-6, -108], rHand: [8, -94], stride: 5, lean: -3, face: false }), 134, 96, 0.44, -14),
  ];
}

/* 7 — Coffee with an Old Friend: two cups leaning together, on one saucer */
function cup(): Layer[] {
  return [
    { d: many(oval(46, -42, 17, 24), oval(46, -42, 8.5, 15)), tone: 0.55, outline: true },
    { d: `M-40 -80C-40 -28 -22 0 0 0C22 0 40 -28 40 -80Z`, tone: 0.1, ramp: { to: 0.84, dir: "right" }, angle: 3 },
    { d: oval(0, -80, 40, 9), tone: 0, knockout: true },
    { d: oval(0, -79, 32, 6), tone: 0.95, outline: false },
  ];
}
function sceneCups(): Layer[] {
  return [
    { d: oval(184, 211, 138, 10), tone: 0.05, ramp: { to: 0.4, dir: "right" }, marks: [{ d: oval(184, 211, 112, 6.5), w: 0.7, a: 0.6 }] },
    ...put(cup(), 130, 208, 0.84, 12, true),
    ...put(cup(), 236, 208, 0.84, -12),
    { d: "", tone: 0, marks: [
      { d: stroke2([[130, 132], [122, 112], [146, 98], [170, 84], [182, 62], [180, 44]]), w: 1.15, a: 0.85 },
      { d: stroke2([[142, 130], [136, 114], [156, 104], [176, 92], [186, 72], [190, 56]]), w: 0.9, a: 0.6 },
      { d: stroke2([[240, 132], [248, 112], [222, 98], [196, 84], [184, 62], [186, 44]]), w: 1.15, a: 0.85 },
      { d: stroke2([[228, 130], [234, 114], [212, 104], [190, 92], [180, 72], [176, 56]]), w: 0.9, a: 0.6 },
      { d: stroke2([[183, 44], [176, 34], [186, 26], [194, 32]]), w: 1, a: 0.8 },
    ] },
    { d: circ(184, 215, 6.5), tone: 0.3, marks: [stip(184, 215, 4, 4, 4, 3, 0.9)] },
    turf(40, 330, 232, 4, 0.7),
  ];
}

/* 8 — Moonrise over the Roofs: a cat on the ridge before the moon */
function catSitting(): Layer[] {
  return [
    { d: limb(12, -5, 26, -6, 4.4, 3.6), tone: 0.97, outline: false },
    { d: limb(26, -6, 32, -20, 3.6, 3), tone: 0.97, outline: false },
    { d: limb(32, -20, 26, -30, 3, 2.4), tone: 0.97, outline: false },
    { d: smooth([[-14, 0], [-16, -16], [-8, -26], [6, -24], [14, -12], [14, 0]]), tone: 0.97 },
    { d: circ(-7, -34, 10), tone: 0.97 },
    { d: poly([[-16, -39], [-16, -54], [-8, -42]]), tone: 0.97 },
    { d: poly([[-4, -42], [2, -54], [3, -37]]), tone: 0.97 },
  ];
}
function sceneMoon(): Layer[] {
  const house = (x: number, w: number, wall: number, peak: number, tone: number, chim?: number): Layer[] => {
    const l: Layer[] = [{ d: poly([[x, 246], [x, wall], [x + w / 2, peak], [x + w, wall], [x + w, 246]]), tone, ramp: { to: tone * 0.55, dir: "left" }, angle: 2 }];
    if (chim !== undefined) l.push({ d: box(x + chim, peak + 8, 9, 22), tone, outline: true });
    return l;
  };
  const win = (x: number, y: number): Layer => ({ d: box(x, y, 9, 12), tone: 0, knockout: true, marks: [line(x + 4.5, y, x + 4.5, y + 12)] });
  const sparkle = (x: number, y: number, r: number): Mark => ({ d: `M${P(x - r, y)}L${P(x + r, y)}M${P(x, y - r)}L${P(x, y + r)}`, w: 0.8, a: 0.8 });
  return [
    // the sky is paper: a light ring round the moon and a few stars
    { d: circ(196, 100, 70), tone: 0.14, outline: false, angle: -3 },
    { d: circ(196, 100, 46), tone: 0, knockout: true, outline: true, marks: [{ d: stroke2([[170, 82], [178, 76]]), a: 0.5 }] },
    { d: puff(228, 116, 9, 6, 6, 2), tone: 0.16 },
    { d: circ(168, 122, 4), tone: 0.18 },
    { d: "", tone: 0, marks: [sparkle(64, 34, 4), sparkle(104, 66, 3), sparkle(80, 104, 3.4), sparkle(312, 38, 4), sparkle(282, 78, 3), sparkle(322, 118, 3.4), sparkle(128, 22, 3), sparkle(254, 20, 3.4), sparkle(56, 142, 3), { d: stroke2([[110, 40], [160, 34], [196, 46]]), w: 0.8, a: 0.55 }, { d: stroke2([[240, 60], [280, 52], [318, 60]]), w: 0.8, a: 0.55 }] },
    ...house(52, 62, 194, 166, 0.5),
    ...house(132, 52, 196, 174, 0.55),
    ...house(248, 70, 192, 162, 0.5, 44),
    ...house(20, 92, 204, 168, 0.94, 66),
    ...house(146, 100, 204, 152, 0.96),
    ...house(240, 86, 200, 166, 0.94, 12),
    ...house(310, 60, 206, 178, 0.94),
    win(36, 208), win(62, 222), win(172, 196), win(204, 196), win(258, 214), win(284, 226),
    ...put(catSitting(), 200, 156, 1.32),
  ];
}

/* 9 — Reading in the Park: an open book for a tent */
function sceneBook(): Layer[] {
  const ax = 166;
  const ay = 46;
  const lb = 74;
  const rb = 258;
  const by = 206;
  const pageLines = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): Mark[] =>
    [-2.6, 0, 2.6].map((o) => ({ d: line(x0 + nx * o, y0 + ny * o, x1 + nx * o, y1 + ny * o), w: 0.6, a: 0.7 }));
  return [
    // sun and birds
    { d: circ(78, 52, 15), tone: 0, marks: Array.from({ length: 10 }, (_, i): Mark => {
      const a = (i / 10) * Math.PI * 2;
      return line(78 + Math.cos(a) * 21, 52 + Math.sin(a) * 21, 78 + Math.cos(a) * 30, 52 + Math.sin(a) * 30);
    }) },
    { d: "", tone: 0, marks: [{ d: stroke2([[250, 40], [256, 35], [262, 41]]), w: 0.95 }, { d: stroke2([[276, 56], [281, 52], [287, 57]]), w: 0.9 }] },
    { d: mound(110, 198, 260, 34, 1), tone: 0.04, ramp: { to: 0.16, dir: "right" } },
    { d: puff(58, 170, 22, 16, 6, 5), tone: 0.08, ramp: { to: 0.28, dir: "right" } },
    // the tree
    { d: limb(282, 218, 278, 120, 16, 9), tone: 0.8 },
    { d: puff(284, 98, 50, 46, 9, 2, 0.4), tone: 0.12, ramp: { to: 0.92, dir: "right" }, angle: -3 },
    { d: puff(268, 84, 20, 16, 6, 8, 0.36), tone: 0.14, knockout: true },
    turf(40, 330, 208, 9, 1.1),
    { d: oval(168, 210, 100, 6), tone: 0.36, outline: false },
    // the tent: two covers, two blocks of pages, and the shade between
    { d: poly([[ax, ay + 24], [lb + 22, by], [rb - 22, by]]), tone: 0.74, ramp: { to: 0.4, dir: "down" }, outline: false },
    { d: band(ax, ay, lb, by, 14), tone: 0.92, angle: 8 },
    { d: band(ax, ay, rb, by, 14), tone: 0.92, angle: -8 },
    { d: band(ax + 9, ay + 6, lb + 10, by - 2, 9), tone: 0, knockout: true, marks: pageLines(ax + 9, ay + 6, lb + 10, by - 2, 0.87, 0.5) },
    { d: band(ax - 9, ay + 6, rb - 10, by - 2, 9), tone: 0, knockout: true, marks: pageLines(ax - 9, ay + 6, rb - 10, by - 2, -0.87, 0.5) },
    // a title on the cover
    { d: poly([[128, 118], [150, 82], [158, 88], [136, 124]]), tone: 0, knockout: true, marks: [line(133, 116, 149, 92), line(137, 118, 152, 95)] },
    // the reader inside, with a small book
    { d: limb(124, 194, 174, 196, 22, 20), tone: 0, knockout: true },
    { d: limb(174, 196, 230, 200, 14, 11), tone: 0, knockout: true },
    { d: circ(114, 188, 10), tone: 0, knockout: true, marks: [{ d: stroke2([[110, 190], [113, 192], [116, 190]]), w: 0.8 }] },
    { d: puff(112, 182, 10, 6, 5, 4), tone: 0.9, outline: false },
    { d: poly([[128, 180], [148, 176], [150, 190], [130, 194]]), tone: 0.12, marks: [line(139, 178, 140, 192)] },
    { d: oval(230, 200, 5, 4), tone: 0, knockout: true },
    // the flag and a ribbon
    { d: line(ax, ay - 2, ax, ay - 26), tone: 0 },
    { d: poly([[ax, ay - 26], [ax + 24, ay - 18], [ax, ay - 10]]), tone: 0.8 },
    { d: limb(238, 208, 246, 226, 3.4), tone: 0.8 },
    // daisies in the front
    ...[46, 300, 128, 214].flatMap((x, i): Layer[] => [{ d: circ(x, 226 + (i % 2) * 6, 4.2), tone: 0, knockout: true, marks: [stip(x, 226 + (i % 2) * 6, 1.4, 1.4, 2, i, 0.9)] }]),
    turf(40, 330, 236, 11, 0.8),
  ];
}

/* 10 — Rain Indoors: a small cloud, a big umbrella */
function sceneRain(): Layer[] {
  const canopy = `M108 128Q176 40 244 128Q228 116 210 128Q193 114 176 128Q159 114 142 128Q125 116 108 128Z`;
  return [
    { d: "", tone: 0, marks: [line(30, 200, 340, 200), line(30, 205, 340, 205)] },
    turf(40, 330, 226, 3, 0.7),
    // a window, with its own sky
    { d: box(52, 34, 58, 96), tone: 0.03, ramp: { to: 0.14, dir: "down" }, marks: [line(81, 34, 81, 130), line(52, 82, 110, 82), line(46, 130, 116, 130)] },
    { d: limb(298, 200, 298, 112, 4), tone: 0.6 },
    { d: poly([[282, 112], [314, 112], [306, 86], [290, 86]]), tone: 0.55, outline: true },
    { d: oval(298, 202, 14, 4), tone: 0.7 },
    // cloud and rain
    { d: puff(176, 34, 66, 26, 10, 2, 0.4), tone: 0.1, ramp: { to: 0.66, dir: "right" }, angle: 2 },
    { d: "", tone: 0, marks: [streaks(102, 250, 56, 190, 62, 17, 3), streaks(102, 250, 56, 190, 30, 24, 8)] },
    // the umbrella and its owner
    { d: limb(176, 126, 176, 176, 3.4), tone: 0.7, outline: false },
    ...put(person({ lHand: [4, -72], rHand: [-2, -72], stride: 6, face: true }), 176, 208, 0.7),
    { d: canopy, tone: 0.84, ramp: { to: 0.5, dir: "right" }, knockout: true, angle: 4 },
    { d: leaf(176, 128, 148, 84, 9), tone: 0, knockout: true },
    { d: leaf(176, 128, 204, 84, 9), tone: 0, knockout: true },
    { d: leaf(176, 128, 176, 68, 7), tone: 0.1, knockout: true },
    { d: circ(176, 62, 2.6), tone: 0.9 },
    // puddles
    { d: oval(112, 216, 28, 5.6), tone: 0, knockout: true, marks: [{ d: oval(112, 216, 14, 2.8), w: 0.7, a: 0.7 }] },
    { d: oval(248, 224, 24, 5), tone: 0, knockout: true, marks: [{ d: oval(248, 224, 12, 2.4), w: 0.7, a: 0.7 }] },
    { d: "", tone: 0, marks: [stroke2([[100, 206], [98, 200]]), stroke2([[124, 208], [128, 202]]), stroke2([[240, 216], [238, 210]])] },
  ];
}

/* 11 — Butterflies in the Garden */
function butterfly(): Layer[] {
  const spot = (x: number, y: number, r: number): Layer => ({ d: circ(x, y, r), tone: 0, knockout: true });
  return [
    { d: oval(-20, -12, 22, 14, -34), tone: 0.8, ramp: { to: 0.4, dir: "right" }, angle: -10 },
    { d: oval(20, -12, 22, 14, 34), tone: 0.8, ramp: { to: 0.4, dir: "left" }, angle: 10 },
    { d: oval(-13, 13, 14, 10, 28), tone: 0.44, angle: -6 },
    { d: oval(13, 13, 14, 10, -28), tone: 0.44, angle: 6 },
    spot(-24, -16, 4), spot(24, -16, 4), spot(-14, -4, 2.4), spot(14, -4, 2.4), spot(-13, 14, 2.6), spot(13, 14, 2.6),
    { d: limb(0, -14, 0, 16, 4.4, 3), tone: 0.96 },
    { d: "", tone: 0, marks: [{ d: stroke2([[-1, -14], [-6, -24], [-12, -26]]), w: 0.9 }, { d: stroke2([[1, -14], [6, -24], [12, -26]]), w: 0.9 }] },
  ];
}
function sceneGarden(): Layer[] {
  const daisy = (cx: number, cy: number, R: number, n: number, seed: number): Layer[] => [
    ...Array.from({ length: n }, (_, k): Layer => {
      const a = (k / n) * Math.PI * 2 + seed;
      return { d: leaf(cx + Math.cos(a) * R * 0.22, cy + Math.sin(a) * R * 0.22, cx + Math.cos(a) * R, cy + Math.sin(a) * R, R * 0.2), tone: k % 3 === 0 ? 0.22 : 0.06, knockout: true };
    }),
    { d: circ(cx, cy, R * 0.32), tone: 0.92, marks: [stip(cx, cy, R * 0.2, R * 0.2, 7, seed, 0.9)] },
  ];
  return [
    { d: puff(92, 156, 56, 36, 9, 3), tone: 0.02, ramp: { to: 0.13, dir: "right" } },
    { d: puff(292, 160, 50, 34, 9, 6), tone: 0.02, ramp: { to: 0.13, dir: "right" } },
    turf(40, 330, 220, 5, 1.2),
    // the big daisy
    { d: limb(108, 140, 112, 230, 6, 7), tone: 0.72 },
    { d: leaf(112, 196, 66, 174, 10), tone: 0.55 },
    { d: leaf(112, 176, 154, 160, 9), tone: 0.55 },
    ...daisy(108, 96, 48, 13, 0.1),
    // tulips
    { d: limb(240, 150, 236, 230, 5), tone: 0.7 },
    { d: leaf(238, 200, 268, 176, 8), tone: 0.55 },
    { d: leaf(240, 148, 220, 96, 15), tone: 0.42 },
    { d: leaf(240, 148, 262, 98, 15), tone: 0.6 },
    { d: leaf(240, 150, 240, 84, 13), tone: 0.88, angle: 4 },
    { d: limb(176, 172, 174, 232, 4), tone: 0.6 },
    { d: leaf(175, 210, 150, 194, 6), tone: 0.5 },
    { d: circ(176, 164, 10), tone: 0.6, ramp: { to: 0.9, dir: "right" } },
    ...put(butterfly(), 178, 64, 1.5, -10),
    ...put(butterfly(), 288, 136, 0.86, 18),
    ...put(butterfly(), 74, 200, 0.6, -20),
    { d: "", tone: 0, marks: [trail([[190, 76], [214, 96], [222, 118]], 6, 2)] },
  ];
}

/* 12 — Long Table Supper */
function sceneSupper(): Layer[] {
  const candles = [92, 182, 272];
  const bulb = (t: number): Pt => {
    const u = 1 - t;
    return [u * u * 20 + 2 * u * t * 180 + t * t * 340, u * u * 24 + 2 * u * t * 96 + t * t * 24];
  };
  const bulbs = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92].map(bulb);
  const guest = (x: number, y: number, hair: number, tone: number): Layer[] => [
    { d: smooth([[x - 30, 160], [x - 26, y + 28], [x, y + 16], [x + 26, y + 28], [x + 30, 160]]), tone: tone * 0.16, ramp: { to: tone * 0.85, dir: "right" } },
    { d: circ(x, y, 12), tone: 0, knockout: true, marks: [{ d: stroke2([[x - 5, y + 1], [x - 3, y + 2.4], [x - 1, y + 1]]), w: 0.8 }, { d: stroke2([[x + 1, y + 1], [x + 3, y + 2.4], [x + 5, y + 1]]), w: 0.8 }, { d: stroke2([[x - 3, y + 7], [x, y + 8.4], [x + 3, y + 7]]), w: 0.8 }] },
    { d: oval(x, y - 6, 13, 8.6), tone: hair, outline: false },
  ];
  const rays = (x: number, y: number): Mark => {
    let d = "";
    for (let i = 0; i < 9; i++) {
      const a = (-160 + i * 17) * RAD;
      d += `M${P(x + Math.cos(a) * 12, y + Math.sin(a) * 12)}L${P(x + Math.cos(a) * 19, y + Math.sin(a) * 19)}`;
    }
    return { d, w: 0.8, a: 0.7 };
  };
  return [
    { d: "", tone: 0, marks: [{ d: stroke2([[20, 24], [100, 60], [180, 70], [260, 60], [340, 24]]), w: 0.9, a: 0.85 }] },
    ...bulbs.flatMap(([x, y]): Layer[] => [{ d: circ(x, y + 6, 3.8), tone: 0.1, marks: [rays(x, y + 6)] }]),
    ...guest(56, 100, 0.9, 0.84),
    ...guest(126, 96, 0.5, 0.9),
    ...guest(232, 98, 0.92, 0.86),
    ...guest(306, 102, 0.6, 0.9),
    { d: poly([[0, 154], [360, 154], [360, 172], [0, 172]]), tone: 0, outline: true },
    { d: poly([[0, 172], [360, 172], [350, 232], [10, 232]]), tone: 0.28, ramp: { to: 0.02, dir: "down" }, marks: [{ d: stroke2([[40, 176], [46, 200], [40, 228]]), a: 0.6 }, { d: stroke2([[140, 176], [150, 204], [140, 230]]), a: 0.6 }, { d: stroke2([[230, 176], [222, 204], [232, 230]]), a: 0.6 }, { d: stroke2([[320, 176], [328, 204], [320, 228]]), a: 0.6 }] },
    ...[54, 134, 226, 306].map((x): Layer => ({ d: oval(x, 163, 24, 5), tone: 0, knockout: true, marks: [{ d: oval(x, 163, 13, 2.6), w: 0.7, a: 0.6 }] })),
    ...candles.flatMap((x): Layer[] => [
      { d: rbox(x - 5, 118, 10, 44, 2), tone: 0.05, ramp: { to: 0.3, dir: "right" }, knockout: true, marks: [rays(x, 108)] },
      { d: leaf(x, 118, x, 96, 6), tone: 0, knockout: true },
      { d: "", tone: 0, marks: [{ d: stroke2([[x, 116], [x, 106]]), w: 0.9 }] },
    ]),
    turf(40, 330, 240, 5, 0.5),
  ];
}

/* 13 — A Small Victory: a flag, on the summit of the inbox */
function sceneVictory(): Layer[] {
  const rays: Mark[] = Array.from({ length: 15 }, (_, i): Mark => {
    const a = (-170 + i * 12) * RAD;
    const r0 = 52 + (i % 3) * 5;
    const r1 = r0 + 22 + (i % 2) * 12;
    return { d: line(182 + Math.cos(a) * r0, 92 + Math.sin(a) * r0, 182 + Math.cos(a) * r1, 92 + Math.sin(a) * r1), w: 0.9, a: 0.7 };
  });
  const conf = (seed: number): Mark => {
    const r = mulberry32(seed);
    let d = "";
    for (let i = 0; i < 14; i++) {
      const x = 60 + r() * 240;
      const y = 8 + r() * 80;
      const a = r() * Math.PI;
      d += `M${P(x, y)}L${P(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5)}`;
    }
    return { d, w: 1.1, a: 0.85 };
  };
  return [
    { d: "", tone: 0, marks: [...rays, conf(5)] },
    // the hill: paper on the lit side, hatched grass on the far side
    { d: mound(182, 236, 340, 120, 3), tone: 0.05, ramp: { to: 0.78, dir: "right" }, angle: -4 },
    { d: mound(72, 238, 170, 46, 5), tone: 0.03, ramp: { to: 0.4, dir: "right" } },
    { d: "", tone: 0, marks: [grass(120, 250, 130, 30, 7, 3), grass(60, 130, 176, 12, 6, 6), grass(250, 320, 186, 12, 6, 9)] },
    // a small flag, cut like an envelope
    { d: limb(226, 128, 226, 66, 2.4), tone: 0.8, outline: false },
    { d: poly([[226, 64], [262, 64], [262, 86], [226, 86]]), tone: 0.06, ramp: { to: 0.3, dir: "right" }, marks: [{ d: `M${P(226, 64)}L${P(244, 77)}L${P(262, 64)}`, w: 1, a: 0.9 }] },
    ...put(person({ lHand: [-20, -116], rHand: [20, -116], stride: 6, face: true, hair: 0.92, tone: 0.82 }), 176, 128, 0.62),
    { d: star(96, 54, 14, 5.6), tone: 0.1, ramp: { to: 0.5, dir: "right" }, angle: -6 },
    { d: star(298, 46, 11, 4.6), tone: 0.1, ramp: { to: 0.5, dir: "right" }, angle: 6 },
    turf(60, 320, 238, 8, 0.5),
  ];
}

/* 14 — Birthday: one candle, very large */
function sceneBirthday(): Layer[] {
  const flags = Array.from({ length: 8 }, (_, i): Layer => {
    const t = (i + 0.7) / 8.4;
    const u = 1 - t;
    const x = u * u * 8 + 2 * u * t * 180 + t * t * 352;
    const y = u * u * 4 + 2 * u * t * 44 + t * t * 4;
    return { d: poly([[x - 14, y], [x + 14, y + 1], [x, y + 30]]), tone: [0.6, 0, 0.26][i % 3], ramp: i % 3 === 1 ? undefined : { to: 0.1, dir: "right" }, angle: i * 3 - 10 };
  });
  const drips = (x0: number, x1: number, y: number, seed: number): string => {
    const r = mulberry32(seed);
    const n = Math.round((x1 - x0) / 16);
    let d = `M${P(x0, y)}H${fmt(x1)}`;
    for (let i = n; i > 0; i--) {
      const xa = x0 + ((x1 - x0) * i) / n;
      const xb = x0 + ((x1 - x0) * (i - 1)) / n;
      d += `Q${P(xa - 1, y + 8 + r() * 10)} ${P((xa + xb) / 2, y + 6 + r() * 6)}Q${P(xb + 1, y + 2)} ${P(xb, y)}`;
    }
    return d + "Z";
  };
  return [
    { d: "", tone: 0, marks: [{ d: stroke2([[0, 6], [60, 26], [180, 48], [300, 26], [360, 6]]), w: 0.9, a: 0.85 }] },
    ...flags,
    { d: oval(62, 112, 19, 25, -6), tone: 0.06, ramp: { to: 0.7, dir: "right" }, marks: [{ d: stroke2([[62, 137], [70, 168], [64, 194]]), w: 0.8, a: 0.8 }] },
    { d: oval(30, 134, 15, 20, 8), tone: 0.05, ramp: { to: 0.5, dir: "right" }, marks: [{ d: stroke2([[30, 154], [38, 176], [66, 196]]), w: 0.8, a: 0.8 }] },
    // the friend, peeking
    { d: puff(286, 172, 18, 17, 7, 3), tone: 0.9, outline: true },
    { d: circ(286, 176, 15), tone: 0, knockout: true, marks: [{ d: circ(281, 175, 1.5), w: 1, a: 0.9 }, { d: circ(291, 175, 1.5), w: 1, a: 0.9 }, { d: stroke2([[277, 169], [282, 167], [286, 169]]), w: 0.8 }, { d: stroke2([[288, 169], [292, 167], [296, 169]]), w: 0.8 }] },
    { d: puff(286, 164, 16, 9, 6, 6), tone: 0.92, outline: false },
    { d: poly([[274, 158], [298, 158], [286, 122]]), tone: 0.14, ramp: { to: 0.6, dir: "right" }, angle: 10, marks: [line(278, 148, 294, 148), line(281, 138, 291, 138)] },
    { d: circ(286, 120, 4.6), tone: 0, knockout: true },
    // table
    { d: poly([[6, 190], [354, 190], [346, 244], [14, 244]]), tone: 0.26, ramp: { to: 0.02, dir: "down" }, outline: true, marks: [{ d: stroke2([[50, 196], [56, 216], [50, 240]]), a: 0.6 }, { d: stroke2([[300, 196], [294, 218], [302, 240]]), a: 0.6 }] },
    { d: oval(180, 192, 100, 9), tone: 0, knockout: true },
    // the cake
    { d: rbox(96, 152, 168, 40, 8), tone: 0.1, ramp: { to: 0.52, dir: "right" } },
    { d: drips(94, 266, 152, 3), tone: 0, knockout: true },
    { d: rbox(124, 120, 112, 34, 7), tone: 0.12, ramp: { to: 0.56, dir: "right" } },
    { d: drips(122, 238, 120, 5), tone: 0, knockout: true },
    ...[112, 144, 178, 212, 246].map((x): Layer => ({ d: circ(x, 186, 4.4), tone: 0.9, outline: true })),
    { d: rbox(172, 40, 16, 84, 3), tone: 0.86, angle: 3 },
    ...[54, 76, 98].map((y): Layer => ({ d: poly([[172, y + 10], [188, y], [188, y + 8], [172, y + 18]]), tone: 0, knockout: true, outline: false })),
    { d: leaf(180, 42, 180, 6, 11), tone: 0, knockout: true, marks: [{ d: leaf(180, 40, 180, 20, 4), w: 0.8, a: 0.8 }] },
    { d: line(180, 42, 180, 36), tone: 0 },
  ];
}

/* ───────────────── the small circles: each day's scene, boiled down to one to three shapes, on a 40 × 40 disc ───────────────── */

const MOTIF_BUILDERS: readonly (() => Layer[])[] = [
  // 1 lemon
  () => [
    { d: lemon(20, 21, 15, 9.5, -16), tone: 0.86, ramp: { to: 0.5, dir: "up" } },
    { d: oval(15, 17, 5.4, 1.8, -20), tone: 0, knockout: true, outline: false },
    { d: leaf(24, 12, 30, 6, 2.6), tone: 0.95 },
  ],
  // 2 pillow, head, blanket
  () => [
    { d: smooth([[4, 19], [10, 11], [22, 9], [32, 12], [36, 21], [33, 28], [20, 30], [8, 28]]), tone: 0.28 },
    { d: circ(15, 18, 5.6), tone: 0, knockout: true, marks: [stroke2([[12.6, 18.4], [14, 19.4], [15.4, 18.4]])] },
    { d: puff(14, 14.4, 6, 3.2, 5, 2), tone: 0.95, outline: false },
    { d: smooth([[6, 26], [17, 22], [30, 23], [37, 27], [34, 34], [18, 36], [7, 33]]), tone: 0.92 },
  ],
  // 3 cloud-head
  () => [
    { d: limb(20, 22, 20, 36, 12, 15), tone: 0.95 },
    { d: puff(20, 15, 11, 8, 7, 3), tone: 0.28, knockout: true },
    { d: oval(28, 27, 2.4, 3), tone: 0, knockout: true },
  ],
  // 4 lavender and a bee
  () => [
    { d: puff(12, 18, 3.4, 12, 8, 1, 0.5), tone: 0.95 },
    { d: puff(21, 14, 3.6, 13, 8, 2, 0.5), tone: 0.95 },
    { d: oval(28, 27, 6, 4), tone: 0.95, marks: [line(26, 23, 30, 22)] },
  ],
  // 5 swimmer
  () => [
    { d: many(waveStrip(0, 40, 13, 1.6, 20, 3, 0), waveStrip(0, 40, 29, 1.6, 20, 3, 2)), tone: 0.7 },
    { d: limb(9, 21, 27, 21, 5.4, 4.4), tone: 0.95 },
    { d: circ(30, 21, 3.4), tone: 0.95 },
  ],
  // 6 head with a spiral
  () => [
    { d: smooth([[9, 34], [8, 20], [14, 9], [26, 8], [33, 16], [31, 24], [35, 28], [29, 30], [30, 36]]), tone: 0.42 },
    { d: "", tone: 0, marks: [{ d: spiral(20, 18, 0.8, 7, 2.6), w: 1.2, a: 0.95 }] },
    { d: limb(6, 36, 10, 14, 2.4), tone: 0.9 },
  ],
  // 7 two cups
  () => {
    const c: Layer[] = [
      { d: `M-9 -12C-9 -2 -5 3 0 3C5 3 9 -2 9 -12Z`, tone: 0.9 },
      { d: oval(0, -12, 9, 2.2), tone: 0, knockout: true },
    ];
    return [...put(c, 12, 33, 1, 9), ...put(c, 28, 33, 1, -9)];
  },
  // 8 moon and roofs
  () => [
    { d: circ(20, 17, 11.5), tone: 0, knockout: true },
    { d: poly([[0, 40], [0, 30], [7, 24], [13, 30], [16, 30], [22, 24], [28, 30], [33, 26], [40, 32], [40, 40]]), tone: 0.95 },
    { d: circ(21, 22.4, 2.6), tone: 0.95, outline: false },
  ],
  // 9 tent
  () => [
    { d: poly([[20, 6], [6, 33], [34, 33]]), tone: 0.95 },
    { d: poly([[20, 15], [13, 30], [27, 30]]), tone: 0, knockout: true },
    { d: oval(19, 28, 4.2, 1.6), tone: 0.9, outline: false },
  ],
  // 10 umbrella
  () => [
    { d: puff(20, 8, 10, 5.4, 6, 4), tone: 0.6, knockout: true },
    { d: `M6 24Q20 8 34 24Q30 21 27 24Q23 20 20 24Q17 20 13 24Q9 21 6 24Z`, tone: 0.9 },
    { d: limb(20, 24, 20, 36, 1.8), tone: 0.9 },
    { d: "", tone: 0, marks: [line(11, 30, 10, 35), line(29, 29, 28, 34)] },
  ],
  // 11 butterfly
  () => [
    { d: oval(12.5, 16, 8, 6.2, -34), tone: 0.9 },
    { d: oval(27.5, 16, 8, 6.2, 34), tone: 0.9 },
    { d: oval(14, 26, 5.6, 4.4, 26), tone: 0.55 },
    { d: oval(26, 26, 5.6, 4.4, -26), tone: 0.55 },
    { d: circ(11, 15, 1.7), tone: 0, knockout: true },
    { d: circ(29, 15, 1.7), tone: 0, knockout: true },
    { d: limb(20, 12, 20, 30, 2.4), tone: 0.97 },
  ],
  // 12 candles
  () => [
    { d: box(8, 18, 5, 15), tone: 0.95 },
    { d: box(17.5, 12, 5, 21), tone: 0.95 },
    { d: box(27, 16, 5, 17), tone: 0.95 },
    { d: leaf(10.5, 17, 10.5, 9, 2.2), tone: 0, knockout: true },
    { d: leaf(20, 11, 20, 2, 2.4), tone: 0, knockout: true },
    { d: leaf(29.5, 15, 29.5, 7, 2.2), tone: 0, knockout: true },
    { d: box(2, 32, 36, 6), tone: 0.8 },
  ],
  // 13 star
  () => [
    { d: star(20, 21, 15, 6.4), tone: 0.9, angle: 4 },
    { d: circ(20, 21, 2.4), tone: 0, knockout: true },
  ],
  // 14 cake and candle
  () => [
    { d: rbox(7, 26, 26, 9, 2), tone: 0.55 },
    { d: rbox(12, 19, 16, 8, 2), tone: 0.6 },
    { d: rbox(18.4, 6, 3.4, 14, 1), tone: 0.95 },
    { d: leaf(20, 6, 20, -1, 2.8), tone: 0, knockout: true },
  ],
];

const motifLayers = (i: number): Layer[] => MOTIF_BUILDERS[i]();

/** The little disc for a day: a loose pen circle, the motif hatched inside it and nothing else. Today's is the negative: a dark disc with the motif left bare. */
function cellLayers(i: number, inverted: boolean): Layer[] {
  const motif = motifLayers(i);
  if (!inverted) return [{ d: circ(20, 20, 19.2), tone: 0 }, ...motif];
  return [
    { d: circ(20, 20, 19.2), tone: 0.98 },
    ...motif.map((l): Layer => ({ ...l, tone: 0, knockout: true, ramp: undefined })),
  ];
}

type Scene = {
  kind: MomentKind;
  title: string;
  sentence: string;
  layers: () => Layer[];
};

const SCENES: readonly Scene[] = [
  { kind: "activity", title: "Market Morning", sentence: "One lemon, one mission, and a walk home that suddenly took all morning.", layers: sceneMarket },
  { kind: "mood", title: "Lazy Sunday", sentence: "By noon the pillow had won, and nobody was going to argue.", layers: scenePillow },
  { kind: "mood", title: "Monday Fog", sentence: "Head in the clouds, hands around coffee — the week will load shortly.", layers: sceneFog },
  { kind: "nature", title: "Bees in the Lavender", sentence: "Tall humming stalks, busy commuters, and not a single meeting between them.", layers: sceneLavender },
  { kind: "activity", title: "Laps at the Lido", sentence: "Forty lengths, one lane, and a rare hour of thinking about nothing.", layers: sceneLido },
  { kind: "mood", title: "Overthinking", sentence: "One small thought went up the ladder and came back as a spiral.", layers: sceneHead },
  { kind: "activity", title: "Coffee with an Old Friend", sentence: "Two cups, one long catch-up, and steam that finished each other's sentences.", layers: sceneCups },
  { kind: "nature", title: "Moonrise over the Roofs", sentence: "The moon came up slowly, as if it, too, had nowhere else to be.", layers: sceneMoon },
  { kind: "activity", title: "Reading in the Park", sentence: "A good chapter is the best tent: shady, quiet, and slightly enormous.", layers: sceneBook },
  { kind: "mood", title: "Rain Indoors", sentence: "Some days carry their own cloud; the trick is remembering the umbrella.", layers: sceneRain },
  { kind: "nature", title: "Butterflies in the Garden", sentence: "The flowers did the showing off; the butterflies just stopped by to judge.", layers: sceneGarden },
  { kind: "activity", title: "Long Table Supper", sentence: "The table kept getting longer as more friends kept turning up.", layers: sceneSupper },
  { kind: "mood", title: "A Small Victory", sentence: "It was only the inbox, but it felt like the summit.", layers: sceneVictory },
  { kind: "activity", title: "Birthday", sentence: "One enormous candle, one careful wish, and a friend peeking to check.", layers: sceneBirthday },
];

const CALENDAR_DAYS: readonly CalendarDay[] = SCENES.map((s, i) => ({
  day: i + 1,
  weekday: WEEKDAYS_LONG[(FIRST_COLUMN + i) % 7],
  kind: s.kind,
  title: s.title,
  sentence: s.sentence,
}));

/** The scene for a day, or undefined for days that have not happened (or have no page). */
const sceneOf = (day: number): Scene | undefined => SCENES[day - 1];



/* ───────────────────────────── drawing on the canvases ───────────────────────────── */

const DRAW_DELAY_MS = 560;
const OUTLINE_MS = 450;
const HATCH_MS = 700;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

/** Backing-store scale: a little finer than the screen so the pen stays crisp under the gallery's zoom. */
const penRes = () => Math.min(3.5, Math.max(1, window.devicePixelRatio || 1) * 1.25);

const compositions = new Map<string, Composition>();
function sceneComposition(i: number): Composition {
  const key = `s${i}`;
  let c = compositions.get(key);
  if (!c) {
    c = compose(SCENES[i].layers(), PEN_ART, 1000 + i * 37, 360, 240);
    compositions.set(key, c);
  }
  return c;
}
function cellComposition(i: number, inverted: boolean): Composition {
  const key = `c${i}${inverted ? "i" : ""}`;
  let c = compositions.get(key);
  if (!c) {
    c = compose(cellLayers(i, inverted), PEN_CELL, 500 + i * 13 + (inverted ? 7 : 0), 40, 40);
    compositions.set(key, c);
  }
  return c;
}

/** Finished drawings, one per scene and size, kept so a reopened card can show or re-show one cheaply. */
const bitmaps = new Map<string, HTMLCanvasElement>();
function sceneBitmap(i: number, w: number, h: number): HTMLCanvasElement {
  const key = `${i}:${w}x${h}`;
  let b = bitmaps.get(key);
  if (!b) {
    b = document.createElement("canvas");
    b.width = w;
    b.height = h;
    const ctx = b.getContext("2d");
    if (ctx) paintAll(ctx, sceneComposition(i), viewFor(w, h, 360, 240, true));
    bitmaps.set(key, b);
  }
  return b;
}

/**
 * The opened day's drawing. It waits for the card to land, then the pen traces the
 * contours stroke by stroke and sweeps the hatching in from the left. Reduced
 * motion gets the finished drawing at once.
 */
function ArtCanvas({ index, reduced }: { index: number; reduced: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const res = penRes();
    cv.width = Math.round(ART_W * res);
    cv.height = Math.round(ART_H * res);
    if (reduced) {
      ctx.drawImage(sceneBitmap(index, cv.width, cv.height), 0, 0);
      return;
    }
    const comp = sceneComposition(index);
    const view = viewFor(cv.width, cv.height, 360, 240, true);
    let raf = 0;
    let t0 = 0;
    let next = 0;
    let contoursDone = false;
    const tick = (now: number) => {
      const e = now - t0;
      if (e < OUTLINE_MS) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        beginPen(ctx, view);
        paintOutline(ctx, comp, comp.total * easeInOut(e / OUTLINE_MS));
      } else {
        if (!contoursDone) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, cv.width, cv.height);
          beginPen(ctx, view);
          paintOutline(ctx, comp, Infinity);
          contoursDone = true;
        }
        const q = Math.min(1, (e - OUTLINE_MS) / HATCH_MS);
        beginPen(ctx, view);
        next = paintHatch(ctx, comp, next, lerp(comp.kmin - 2, comp.kmax + 1, easeOut(q)));
        if (q >= 1) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const done = document.createElement("canvas");
          done.width = cv.width;
          done.height = cv.height;
          done.getContext("2d")?.drawImage(cv, 0, 0);
          bitmaps.set(`${index}:${cv.width}x${cv.height}`, done);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    }, DRAW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [index, reduced]);
  return <canvas ref={ref} aria-hidden="true" style={{ display: "block", width: ART_W, height: ART_H }} />;
}

/** One day's little disc, drawn once: a hatched circle, a pen edge, the motif on top. */
function CellPen({ index, inverted }: { index: number; inverted: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const res = Math.min(4, Math.max(2, (window.devicePixelRatio || 1) * 1.4));
    cv.width = Math.round(CELL * res);
    cv.height = Math.round(CELL * res);
    paintAll(ctx, cellComposition(index, inverted), viewFor(cv.width, cv.height, 40, 40, false), new Path2D(circ(20, 20, 21)));
  }, [index, inverted]);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 size-full" />;
}

/* ───────────────────────────── the component ───────────────────────────── */

const HOLD_MS = 3800;
const PAUSE_MS = 700;
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

  // Work the pictures out ahead of time, one at a time while the page is idle, so a
  // tap never waits for the pen to plan a drawing.
  React.useEffect(() => {
    let i = 0;
    let timer = 0;
    const step = () => {
      if (i >= today) return;
      sceneComposition(i);
      i += 1;
      timer = window.setTimeout(step, 40);
    };
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [today]);

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
            {/* The white iPhone: a thin bezel with a hairline outline, nothing behind it. */}
            <div
              className="absolute inset-0"
              style={{ background: "#FFFFFF", borderRadius: PHONE_RADIUS, border: "1px solid rgba(10, 60, 140, 0.10)" }}
            />

            {/* The screen: one sheet of grey paper. */}
            <div
              className="absolute overflow-hidden"
              style={{ inset: BEZEL, borderRadius: SCREEN_RADIUS, background: PAPER, color: INK }}
            >
              {/* The month: the heading and the grid share one left edge, PAD from the screen. */}
              <motion.h2
                className="absolute m-0"
                initial={false}
                animate={{ y: openDay === null ? HEAD_TOP_CLOSED - HEAD_TOP_OPEN : 0 }}
                transition={LAYOUT}
                style={{
                  left: PAD,
                  top: HEAD_TOP_OPEN,
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
                <span style={{ display: "block", color: ink(0.38), marginTop: 2, marginLeft: "-0.045em" }}>{YEAR}</span>
              </motion.h2>

              {/* The weekday row and the grid sit low on the glass: one column template, so labels stand exactly over their circles. */}
              <motion.div
                className="absolute"
                style={{ left: PAD, right: PAD, bottom: GRID_BOTTOM, zIndex: 2 }}
                animate={{ opacity: openDay === null ? 1 : 0 }}
                transition={openDay === null ? { duration: 0.22 } : { duration: 0.28 }}
                inert={openDay !== null}
              >
                <div role="grid" aria-label={`${MONTH_NAME} ${YEAR}`} onKeyDown={onGridKeyDown}>
                  <div
                    role="row"
                    className="grid"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: GAP, height: WEEKDAY_H, marginBottom: WEEKDAY_GAP }}
                  >
                    {WEEKDAYS_SHORT.map((w, i) => (
                      <div
                        key={w}
                        role="columnheader"
                        className="text-center"
                        style={{ fontSize: 9, lineHeight: `${WEEKDAY_H}px`, letterSpacing: "0.01em", color: ink(0.55) }}
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
                                inverted={state === "today"}
                                isToday={state === "today"}
                                isOpen={openDay === day}
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
                style={{ bottom: 8, width: 100, height: 4, borderRadius: 2, background: ink(0.32), zIndex: 1 }}
                aria-hidden="true"
              />

              {/* Tap outside the card to put it away. */}
              {scene ? <div className="absolute inset-0" style={{ zIndex: 3 }} onClick={close} aria-hidden="true" /> : null}

              {/* The card's paper: the very circle that was tapped, grown into a page. */}
              {scene && openDay !== null ? (
                <motion.div
                  layoutId="dc-card"
                  className="absolute"
                  initial={{ backgroundColor: openIsToday ? DISC_TODAY : CARD }}
                  animate={{ backgroundColor: CARD }}
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
                      <ArtCanvas key={openDay} index={openDay - 1} reduced={reduced} />
                      <button
                        ref={closeRef}
                        type="button"
                        className="dc-close absolute grid cursor-pointer place-items-center rounded-full p-0"
                        style={{ top: 12, right: 12, width: 28, height: 28, background: CARD, color: INK, border: `1px solid ${ink(0.3)}` }}
                        aria-label="Close"
                        onClick={close}
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                          <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {/* The date and the caption: a small editorial block under the drawing. */}
                    <div className="absolute inset-x-0 bottom-0 flex flex-col" style={{ top: ART_H, padding: "10px 20px 16px" }}>
                      <div className="flex items-end justify-between" style={{ height: 44 }}>
                        <div
                          style={{
                            fontFamily: FONT_SANS,
                            fontWeight: 800,
                            fontSize: 48,
                            lineHeight: "44px",
                            letterSpacing: "-0.05em",
                            color: INK,
                          }}
                          aria-hidden="true"
                        >
                          {info.day}
                        </div>
                        <div style={{ fontSize: 10.5, lineHeight: "15px", letterSpacing: "0.1em", paddingBottom: 3, color: INK }}>
                          {info.weekday.slice(0, 3).toUpperCase()} · AUG {info.day}
                        </div>
                      </div>
                      <h3
                        id={titleId}
                        className="m-0"
                        style={{
                          fontFamily: FONT_SERIF,
                          fontWeight: 400,
                          fontSize: 26,
                          lineHeight: "28px",
                          letterSpacing: "-0.005em",
                          color: INK,
                          marginTop: 6,
                        }}
                      >
                        {info.title}
                      </h3>
                      <p
                        className="m-0"
                        style={{ fontFamily: FONT_SANS, fontWeight: 500, fontSize: 12.5, lineHeight: "17.5px", color: ink(0.7), marginTop: 5 }}
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
  inverted: boolean;
  isToday: boolean;
  isOpen: boolean;
  tabbable: boolean;
  onFocus: () => void;
  onOpen: () => void;
  register: (el: HTMLButtonElement | null) => void;
};

const DayCell = React.memo(function DayCell({ day, info, inverted, isToday, isOpen, tabbable, onFocus, onOpen, register }: DayCellProps) {
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
          style={{ background: CARD, borderRadius: CELL / 2, zIndex: 2 }}
          aria-hidden="true"
        />
      )}
      {/* The pen drawing on the disc. */}
      <span className="pointer-events-none absolute inset-0 block" style={{ zIndex: 3 }} aria-hidden="true">
        <CellPen index={day - 1} inverted={inverted} />
      </span>
    </motion.button>
  );
});
