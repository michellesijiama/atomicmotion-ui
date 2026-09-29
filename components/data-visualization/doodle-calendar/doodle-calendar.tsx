"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Doodle Calendar — every picture in this file is drawn in blue ballpoint, in
// code, the way a sketchbook landscape is: each scene is a short list of layers
// (a hill, a canopy of scalloped clumps, a cottage in perspective) with a tone and
// a depth, and a seeded pen draws them on a <canvas> — confident tapering contours
// first, then fine vertical hatching swept in where the shade falls. Far things are
// light and fine, near things dark and bold. No images, no gradients, no shadows,
// so the folder is self-contained — copy it anywhere and it works.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The kind of place a day's page is drawn from. */
export type MomentKind = "meadow" | "woodland" | "garden" | "water" | "hills" | "coast" | "sky";

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
 * A scene is data: layers on a 360 × 240 sheet, back to front. Each layer is an
 * SVG path with a hatching tone (0 bare paper … 1 black-blue), a `depth` (0 near
 * … 1 far) and, if it should be drawn round, a contour weight. The pen turns that
 * into two kinds of stroke, the way a ballpoint sketch is made:
 *   • contours — confident, smooth curves drawn as variable-width ribbons: they
 *     taper at both ends, swell on the shadow side and under a form, thin out or
 *     break on the lit side, and lift at corners so architecture stays crisp;
 *   • hatching — fine vertical (or along-the-form) strokes in small bursts of similar
 *     length and lean, spindle-shaped, spaced by tone (wide when light, tight when
 *     dark), with cross-passes of a slightly different lean in the darks. Bare paper
 *     is where the tone is 0.
 * Aerial perspective is one number: a far layer is lighter, finer, sparser and
 * shorter-stroked; a near layer is darker, heavier and longer-stroked. A layer
 * marked `knockout` is paper — whatever was drawn behind it is left out (worked
 * out from one raster of the knockouts' Path2Ds, so the lines simply stop).
 * Everything random comes from a seeded generator, so a scene is always the same
 * drawing — on the server, on the client, every time.
 */

type Pt = readonly [number, number];

/** A pen stroke that is not a fill: a path drawn as a line, or (with `tex`) part of the texture that arrives with the hatching. */
type Mark =
  | string
  | {
      d: string;
      /** Width multiplier. */
      w?: number;
      /** Ink, 0…1. */
      a?: number;
      /** Texture (grass, dashes, dots): arrives with the hatching rather than with the contours. */
      tex?: boolean;
      /** A blade: fat at the foot, fine at the tip. */
      blade?: boolean;
      /** 0 near … 1 far; defaults to the layer's. */
      depth?: number;
    };

type Layer = {
  /** An SVG path in sheet units. Empty for a layer that is only marks. */
  d: string;
  /** Hatching tone: 0 bare paper … 1 densest. With `toneAt`, the darkest it gets. */
  tone: number;
  /** 0 near … 1 far: how light, fine and sparse the pen is (aerial perspective). Default 0.35. */
  depth?: number;
  /** Paper first: hides everything drawn behind it. */
  knockout?: boolean;
  /** Contour weight: 0 (none, the default) … about 1.2. */
  line?: number;
  /** Where the contour is drawn: everywhere, only the lit (upper-left) side, or only the top edge. */
  side?: "all" | "lit" | "top";
  /** Corners stay sharp: lines overshoot and cross, as in architecture. */
  crisp?: boolean;
  /** Lean of the hatching in degrees from vertical (90 is horizontal), e.g. ±8. */
  angle?: number;
  /** The tone changes across the shape: from `tone` on one side to `to` on the other. */
  ramp?: { to: number; dir: "up" | "down" | "left" | "right" };
  /** Tone as a function of place (sheet units); it is scaled to 0…`tone`. */
  toneAt?: (x: number, y: number) => number;
  /** Stroke-length multiplier (short dashes for water, long lines for grass). */
  run?: number;
  /** Loose hand: lines break at random, not in tidy rows (water, sky). */
  loose?: boolean;
  marks?: readonly Mark[];
};

/** How a sheet is drawn: spacing, pressure and wobble, in the sheet's own units. */
type PenStyle = {
  /** Hatch spacing at tone 0 and tone 1. */
  spLight: number;
  spDark: number;
  /** Hatch width at light and dark tones. */
  wMin: number;
  wMax: number;
  /** Hatch ink at light and dark tones. */
  aMin: number;
  aMax: number;
  /** Contour width at full pressure. */
  ow: number;
  /** Tremor of a contour. */
  tremor: number;
  /** Hatch stroke length, relative to a full sheet. */
  run: number;
  /** How long a contour goes before the pen lifts. */
  reach: number;
  /** Raster units per sheet unit for the knockout mask. */
  mask: number;
};

const PEN_ART: PenStyle = { spLight: 4.5, spDark: 1.1, wMin: 0.42, wMax: 0.86, aMin: 0.56, aMax: 0.96, ow: 0.78, tremor: 0.3, run: 1, reach: 46, mask: 2 };
const PEN_CELL: PenStyle = { spLight: 2.7, spDark: 0.95, wMin: 0.3, wMax: 0.62, aMin: 0.5, aMax: 0.92, ow: 0.55, tremor: 0.1, run: 0.5, reach: 60, mask: 8 };

/** Aerial perspective: what one number, 0 near … 1 far, does to the pen. */
type DepthMod = { sp: number; w: number; a: number; run: number; tone: number; line: number };
function depthMod(depth = 0.35): DepthMod {
  const t = clamp01(depth);
  return {
    sp: 1 + 0.6 * t,
    w: 1.12 - 0.55 * t,
    a: 1 - 0.5 * t,
    run: 1.15 - 0.6 * t,
    tone: 1.06 - 0.45 * t,
    line: 1.12 - 0.5 * t,
  };
}

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

/** One piece of pen: a centre line with a width at every point, and how dark it is. A single point is a dot. */
type Op = {
  p: number[];
  /** Full width at each point. */
  wp: number[];
  a: number;
  /** How deep the ink is: 1 is the pen's own blue, less is the same blue pressed darker. */
  c?: number;
  /** Sweep key: where the hatching arrives, left to right. */
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

/** The light comes from the upper left: a unit vector pointing at it. */
const LIGHT: Pt = [-0.55, -0.835];

type Hidden = (x: number, y: number) => boolean;

/**
 * Which parts of which layers are hidden by paper laid on top later. Every knockout
 * layer is filled once, in order, in a colour that is its rank (red the high byte, green
 * the low); a pixel that holds a higher rank than a layer's own is under later paper.
 * One raster, one read.
 */
function buildMasks(layers: readonly Layer[], w: number, h: number, res: number): { hidden: Hidden[]; any: boolean[] } {
  const none: Hidden = () => false;
  const hidden: Hidden[] = layers.map(() => none);
  const any: boolean[] = layers.map(() => false);
  const total = layers.filter((l) => l.knockout && l.d).length;
  if (!total) return { hidden, any };
  const cv = document.createElement("canvas");
  const W = Math.ceil(w * res);
  const H = Math.ceil(h * res);
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { hidden, any };
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.scale(res, res);
  const upTo: number[] = [];
  let rank = 0;
  layers.forEach((l, j) => {
    if (l.knockout && l.d) {
      rank += 1;
      ctx.fillStyle = `rgb(${rank >> 8},${rank & 255},0)`;
      ctx.fill(new Path2D(l.d), "evenodd");
    }
    upTo[j] = rank;
  });
  const data = ctx.getImageData(0, 0, W, H).data;
  const m = new Uint16Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = (data[i * 4] << 8) | data[i * 4 + 1];
  layers.forEach((_, j) => {
    if (upTo[j] >= total) return;
    const own = upTo[j];
    any[j] = true;
    hidden[j] = (x, y) => {
      const ix = Math.floor(x * res);
      const iy = Math.floor(y * res);
      return ix >= 0 && iy >= 0 && ix < W && iy < H && m[iy * W + ix] > own;
    };
  });
  return { hidden, any };
}

/** Every stroke of one layer's fill: fine lines swept across its shape in small bursts of like length and lean. */
function hatchLayer(layer: Layer, subs: Sub[], st: PenStyle, rnd: () => number, hidden: Hidden, hasMask: boolean, out: Op[], bounds: { h: number }) {
  const dm = depthMod(layer.depth);
  const t0 = clamp01(layer.tone);
  const t1 = layer.ramp ? clamp01(layer.ramp.to) : t0;
  const tmax = clamp01(Math.max(t0, t1) * dm.tone);
  if (tmax < 0.03 || !subs.length) return;
  const spacing = (t: number) => lerp(st.spLight, st.spDark, Math.pow(clamp01(t), 0.55)) * dm.sp;

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
  const toneAt = (wx: number, wy: number) => {
    const base = layer.toneAt ? layer.toneAt(wx, wy) * t0 : lerp(t0, t1, rampU(wx, wy));
    return clamp01(base * dm.tone + (rnd() - 0.5) * 0.03);
  };

  // The main pass, then — in the darks — cross-passes of a slightly different lean.
  const passes: { sp: number; k: number; da: number }[] = [{ sp: 1, k: 1, da: 0 }];
  if (tmax > 0.5) passes.push({ sp: 1.3, k: clamp01(0.35 + (tmax - 0.5) * 1.5), da: (rnd() < 0.5 ? -1 : 1) * (0.025 + rnd() * 0.025) });
  if (tmax > 0.8) passes.push({ sp: 1.9, k: 0.6, da: (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.035) });

  const loose = layer.loose === true;
  const runK = st.run * dm.run * (layer.run ?? 1);
  const minRun = (3.6 + 3.4 * tmax) * runK;
  const maxRun = (7.5 + 10 * tmax) * runK;
  // The hand drifts: the lean changes slowly across the shape.
  const drift = smoothNoise(rnd, 3);

  const emit = (da: number, x: number, ya: number, yb: number, tl: number, lean: number) => {
    const pushRun = (a: number, b: number) => {
      if (b - a < 1.2) return;
      const len = b - a;
      const nodes = Math.max(2, Math.round(len / 5) + 1);
      const slant = (rnd() * 2 - 1) * 0.006 + da + lean;
      const bow = (rnd() * 2 - 1) * Math.min(0.35, len * 0.02);
      const dx0 = (rnd() * 2 - 1) * 0.12;
      const w = lerp(st.wMin, st.wMax, Math.pow(tl, 0.8)) * dm.w * (0.86 + 0.28 * rnd());
      const p: number[] = [];
      const wp: number[] = [];
      for (let i = 0; i < nodes; i++) {
        const f = i / (nodes - 1);
        const yy = a + len * f;
        const [wx, wy] = toWorld(x + dx0 + slant * (yy - a) + bow * Math.sin(Math.PI * f), yy);
        p.push(wx, wy);
        wp.push(w * (0.55 + 0.45 * Math.pow(Math.sin(Math.PI * f), 0.5)));
      }
      const al = Math.min(0.95, lerp(st.aMin, st.aMax, Math.pow(tl, 0.8)) * dm.a * (0.8 + 0.3 * rnd()));
      const key = p[0] + 0.12 * (p[1] - bounds.h / 2) + (rnd() - 0.5) * 9;
      const c = 1 - 0.42 * clamp01((tl - 0.35) / 0.6) * (0.75 + 0.5 * rnd());
      out.push({ p, wp, a: al, c, x: key, s: 0, l: 0 });
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

  passes.forEach((ps, pi) => {
    const sp = spacing(tmax) * ps.sp;
    let x = lx0 + rnd() * sp;
    let col = 0;
    let left = 0;
    let band = { lean: 0, run: 8, phase: 0.5, gap: 1, u: 0.5, spill: 0, off: 0 };
    while (x < lx1 + sp * 0.5) {
      // A burst: a few neighbouring lines that share a length, a lean and a rhythm.
      if (left-- <= 0) {
        left = 5 + Math.floor(rnd() * 9);
        band = {
          lean: drift((x - lx0) / Math.max(1, lx1 - lx0)) * 0.05 + (rnd() * 2 - 1) * 0.012,
          run: lerp(minRun, maxRun, Math.pow(rnd(), 0.8)),
          phase: rnd(),
          gap: 0.3 + rnd() * 0.8,
          u: rnd(),
          spill: rnd(),
          off: Math.floor(rnd() * 4),
        };
      }
      const ys = crossings(x);
      for (let k = 0; k + 1 < ys.length; k += 2) {
        // Now and then a line spills a pixel or two past the edge of the mass.
        const spillTop = rnd() < 0.1 + 0.08 * band.spill ? -(1 + rnd() * 2) : rnd() * 1.1 - 0.4;
        const spillBot = rnd() < 0.1 + 0.08 * band.spill ? -(1 + rnd() * 2) : rnd() * 1.1 - 0.4;
        let y = ys[k] + spillTop;
        const yEnd = ys[k + 1] - spillBot;
        if (yEnd - y < 1.2) continue;
        let first = true;
        while (y < yEnd - 0.8) {
          let run = loose ? lerp(minRun, maxRun, Math.pow(rnd(), 0.6)) * (0.6 + 0.8 * rnd()) : band.run * (0.8 + 0.4 * rnd()) + (rnd() - 0.5) * 2.4;
          if (first) run *= loose ? rnd() : 0.2 + 0.4 * band.phase + 0.4 * rnd();
          first = false;
          const end = Math.min(yEnd, y + Math.max(2.4, run));
          const [mx, my] = toWorld(x, (y + end) / 2);
          const tl = toneAt(mx, my);
          if (tl >= 0.03) {
            if (pi === 0) {
              // Where the tone is lighter the lines are simply further apart: every second, third or fourth line.
              const m = Math.max(1, Math.floor(spacing(tl) / spacing(tmax) + 0.3));
              if ((col + band.off) % m === 0 || rnd() < 0.04) emit(ps.da, x, y, end, tl, band.lean);
            } else if (tl > 0.42 && 0.7 * rnd() + 0.3 * band.u < ps.k * clamp01((tl - 0.35) * 1.8)) {
              emit(ps.da, x, y, end, tl, band.lean);
            }
          }
          y = end + band.gap * (loose ? 0.5 + 3.5 * rnd() * rnd() : 0.6 + 0.8 * rnd());
        }
      }
      x += sp * (loose ? 0.55 + 0.9 * rnd() : 0.94 + 0.12 * rnd());
      col += 1;
    }
  });
}

/** Where along a stroke of length `len` the pen is at `s`: pressure builds quickly, holds, and lifts off slowly. */
const pressure = (s: number, len: number, up: number) => {
  const a = Math.min(1, s / 2.6);
  const b = Math.min(1, (len - s) / up);
  return 0.2 + 0.8 * Math.sin((Math.PI / 2) * Math.min(a, b));
};

/** What a contour is: its weight, how far away it is, where it shows, and how its corners behave. */
type LineSpec = { wt: number; depth?: number; side: "all" | "lit" | "top"; crisp: boolean; a: number };

/**
 * A contour round one sub-path. It is a smooth, confident line drawn as ribbons: cut
 * at corners (where the pen lifts, and overshoots if the corner is architectural),
 * then in strokes that taper at both ends, swell on the shadow side and thin out
 * and break on the lit side. Now and then a thin second pass goes over an edge.
 */
function contourSub(sub: Sub, ls: LineSpec, st: PenStyle, rnd: () => number, hidden: Hidden, hasMask: boolean, out: Op[]) {
  if (sub.p.length < 4 || ls.wt <= 0) return;
  const dm = depthMod(ls.depth);
  const P = sub.p;
  const n0 = P.length / 2;
  let area = 0;
  if (sub.closed) for (let i = 0; i < n0; i++) area += P[i * 2] * P[((i + 1) % n0) * 2 + 1] - P[((i + 1) % n0) * 2] * P[i * 2 + 1];
  const orient = sub.closed ? (area >= 0 ? 1 : -1) : 0;

  // Cut the path at corners.
  const corner = new Array<boolean>(n0).fill(false);
  const vec = (i: number, j: number): Pt => [P[((j + n0) % n0) * 2] - P[((i + n0) % n0) * 2], P[((j + n0) % n0) * 2 + 1] - P[((i + n0) % n0) * 2 + 1]];
  for (let i = 0; i < n0; i++) {
    if (!sub.closed && (i === 0 || i === n0 - 1)) continue;
    const a = vec(i - 1, i);
    const b = vec(i, i + 1);
    const la = Math.hypot(a[0], a[1]);
    const lb = Math.hypot(b[0], b[1]);
    if (la < 0.3 || lb < 0.3) continue;
    if ((a[0] * b[0] + a[1] * b[1]) / (la * lb) < 0.75) corner[i] = true;
  }
  const runs: { pts: number[]; capA: boolean; capB: boolean }[] = [];
  const first = corner.indexOf(true);
  if (sub.closed) {
    if (first < 0) {
      const s = Math.floor(rnd() * n0);
      const pts: number[] = [];
      for (let k = 0; k <= n0 + 3; k++) pts.push(P[((s + k) % n0) * 2], P[((s + k) % n0) * 2 + 1]);
      runs.push({ pts, capA: false, capB: false });
    } else {
      let start = first;
      for (let k = 1; k <= n0; k++) {
        const i = (first + k) % n0;
        if (corner[i]) {
          const pts: number[] = [];
          for (let m = start; ; m = (m + 1) % n0) {
            pts.push(P[m * 2], P[m * 2 + 1]);
            if (m === i) break;
          }
          runs.push({ pts, capA: true, capB: true });
          start = i;
        }
      }
    }
  } else {
    let start = 0;
    for (let i = 1; i < n0; i++) {
      if (corner[i] || i === n0 - 1) {
        runs.push({ pts: P.slice(start * 2, i * 2 + 2), capA: start > 0, capB: i < n0 - 1 });
        start = i;
      }
    }
  }

  for (const run of runs) {
    const { pts, len } = resample(run.pts, false, 1.3);
    if (len < 2.2) continue;
    const n = pts.length / 2;
    // Tangents, outward normals, how much shadow each point is in.
    const tx: number[] = [];
    const ty: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 2);
      const b = Math.min(n - 1, i + 2);
      const dx = pts[b * 2] - pts[a * 2];
      const dy = pts[b * 2 + 1] - pts[a * 2 + 1];
      const l = Math.hypot(dx, dy) || 1;
      tx.push(dx / l);
      ty.push(dy / l);
    }
    const nx = (i: number) => (orient >= 0 ? ty[i] : -ty[i]);
    const ny = (i: number) => (orient >= 0 ? -tx[i] : tx[i]);
    const lit = (i: number) => (orient === 0 ? 0 : nx(i) * LIGHT[0] + ny(i) * LIGHT[1]);
    const lo = smoothNoise(rnd, Math.max(2, Math.round(len / 26)));
    const tremor = smoothNoise(rnd, Math.max(3, Math.round(len / 7)));
    const shadeAt = (i: number) => (orient === 0 ? 0.5 : clamp01(0.5 - 0.5 * lit(i)));
    const showAt = (i: number) => {
      if (orient === 0 || ls.side === "all") return true;
      if (ls.side === "top") return ny(i) < -0.28;
      return lit(i) > 0.02;
    };

    // Which points are drawn, and where the pen lifts.
    const reach = st.reach * dm.run * (0.6 + 0.8 * rnd());
    const stroke: number[][] = [];
    let cur: number[] = [];
    let since = 0;
    const flush = () => {
      if (cur.length >= 3) stroke.push(cur);
      cur = [];
      since = 0;
    };
    let skip = 0;
    const capEnd = run.capA || run.capB;
    for (let i = 0; i < n; i++) {
      if (skip > 0) {
        skip -= 1;
        continue;
      }
      const off = st.tremor * (0.85 * lo(i / Math.max(1, n - 1)) + 0.3 * tremor(i / Math.max(1, n - 1)));
      const x = pts[i * 2] + nx(i) * off;
      const y = pts[i * 2 + 1] + ny(i) * off;
      if (!showAt(i) || (hasMask && hidden(x, y))) {
        flush();
        continue;
      }
      cur.push(i);
      since += 1.3;
      // A lift: more likely on the lit side and on a long stretch; a broken line on the light.
      const hazard = (0.004 + 0.02 * (1 - shadeAt(i))) * 1.3 * (capEnd ? 0.8 : 1);
      if (since > reach * 0.5 && (since > reach || rnd() < hazard * 2)) {
        flush();
        skip = Math.round((0.7 + rnd() * 2.2) / 1.3);
      } else if (rnd() < hazard * 0.5) {
        flush();
        skip = Math.round((0.6 + rnd() * 1.6) / 1.3);
      }
    }
    flush();

    for (const idx of stroke) {
      const pp: number[] = [];
      const wp: number[] = [];
      const sl = (idx.length - 1) * 1.3;
      let shade = 0;
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k];
        const t = k / Math.max(1, idx.length - 1);
        const off = st.tremor * (0.85 * lo(i / Math.max(1, n - 1)) + 0.3 * tremor(i / Math.max(1, n - 1)));
        pp.push(pts[i * 2] + nx(i) * off, pts[i * 2 + 1] + ny(i) * off);
        const light = orient === 0 ? 1 : lerp(0.6, 1.6, Math.pow(shadeAt(i), 1.2));
        shade += shadeAt(i);
        wp.push(st.ow * ls.wt * dm.line * pressure(t * sl, sl, 4.5) * light * (1 + 0.14 * lo(0.5 + 0.5 * Math.sin(i * 0.13))));
      }
      shade /= idx.length;
      // A corner: the pen carries on a hair past it.
      const cap = (atStart: boolean) => {
        const j = atStart ? 0 : idx.length - 1;
        const i = idx[j];
        const dir = atStart ? -1 : 1;
        const l = 0.5 + rnd() * (ls.crisp ? 1.2 : 0.4);
        const px = pp[j * 2] + tx[i] * l * dir;
        const py = pp[j * 2 + 1] + ty[i] * l * dir;
        const w = wp[j] * 0.8;
        if (atStart) {
          pp.unshift(px, py);
          wp.unshift(w);
        } else {
          pp.push(px, py);
          wp.push(w);
        }
      };
      if (run.capA && idx[0] === 0) cap(true);
      if (run.capB && idx[idx.length - 1] === n - 1) cap(false);
      const a = Math.min(0.96, (0.8 + 0.16 * shade) * ls.a * dm.a * (0.92 + 0.1 * rnd()));
      out.push({ p: pp, wp, a, x: 0, s: 0, l: 0 });

      // Sometimes a thin second pass over part of the edge: a sketch accent.
      if (sl > 26 && rnd() < 0.18 * Math.min(1.4, ls.wt + 0.2)) {
        const span = Math.max(6, Math.round(idx.length * (0.3 + rnd() * 0.25)));
        const from = Math.floor(rnd() * Math.max(1, idx.length - span));
        const side = (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.7);
        const q: number[] = [];
        const qw: number[] = [];
        for (let k = 0; k < span && from + k < idx.length; k++) {
          const i = idx[from + k];
          q.push(pts[i * 2] + nx(i) * side, pts[i * 2 + 1] + ny(i) * side);
          qw.push(st.ow * 0.42 * dm.line * pressure(k * 1.3, span * 1.3, 6));
        }
        if (q.length >= 6) out.push({ p: q, wp: qw, a: 0.42 * dm.a, x: 0, s: 0, l: 0 });
      }
    }
  }
}

/** Little strokes and dots: a mark. Lines go in the contour trace; texture arrives with the hatching. */
function markOps(mk: Mark, depth: number | undefined, st: PenStyle, rnd: () => number, hidden: Hidden, hasMask: boolean, line: Op[], tex: Op[], bounds: { h: number }) {
  const m = typeof mk === "string" ? { d: mk } : mk;
  const dm = depthMod(m.depth ?? depth);
  const wScale = m.w ?? 1;
  const aBase = m.a ?? 0.8;
  const isTex = (typeof mk === "object" && mk.tex) === true;
  const blade = typeof mk === "object" && mk.blade === true;
  for (const sub of flatten(m.d, 1.2)) {
    if (sub.p.length < 4) {
      // A dot.
      const [x, y] = sub.p;
      if (hasMask && hidden(x, y)) continue;
      tex.push({ p: [x, y], wp: [st.ow * (0.85 + rnd() * 0.6) * wScale * dm.w * 1.25], a: Math.min(0.95, aBase * dm.a * (0.8 + rnd() * 0.3)), x: x + (rnd() - 0.5) * 6, s: 0, l: 0 });
      continue;
    }
    if (!isTex) {
      contourSub(sub, { wt: 0.85 * wScale, depth: m.depth ?? depth, side: "all", crisp: true, a: aBase }, st, rnd, hidden, hasMask, line);
      continue;
    }
    // Texture: a short stroke, a dash or a blade of grass.
    const { pts, len } = resample(sub.p, sub.closed, 1);
    const n = pts.length / 2;
    const lo = smoothNoise(rnd, Math.max(2, Math.round(len / 10)));
    const p: number[] = [];
    const wp: number[] = [];
    const w0 = st.ow * 0.8 * wScale * dm.w * (0.85 + rnd() * 0.3);
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const x = pts[i * 2];
      const y = pts[i * 2 + 1] + 0.12 * lo(t);
      if (hasMask && hidden(x, y)) {
        if (p.length >= 4) break;
        continue;
      }
      p.push(x, y);
      wp.push(blade ? w0 * (1 - 0.82 * t) : w0 * (0.4 + 0.6 * Math.pow(Math.sin(Math.PI * t), 0.6)));
    }
    if (p.length >= 4) tex.push({ p, wp, a: Math.min(0.95, aBase * dm.a * (0.85 + rnd() * 0.2)), x: p[0] + 0.12 * (p[1] - bounds.h / 2) + (rnd() - 0.5) * 6, s: 0, l: 0 });
  }
}

/** Turn a scene into pen strokes. Same layers and seed in, same drawing out. */
function compose(layers: readonly Layer[], st: PenStyle, seed: number, dw: number, dh: number): Composition {
  const { hidden: masks, any } = buildMasks(layers, dw, dh, st.mask);
  const outline: Op[] = [];
  const hatch: Op[] = [];
  const bounds = { h: dh };
  layers.forEach((layer, li) => {
    const rnd = mulberry32(seed * 7919 + li * 104729 + 17);
    const hidden = masks[li];
    const hasMask = any[li];
    const subs = layer.d ? flatten(layer.d, 1.6) : [];
    hatchLayer(layer, subs, st, rnd, hidden, hasMask, hatch, bounds);
    if ((layer.line ?? 0) > 0) {
      const ls: LineSpec = { wt: layer.line ?? 0, depth: layer.depth, side: layer.side ?? "all", crisp: layer.crisp === true, a: 1 };
      for (const s of subs) contourSub(s, ls, st, rnd, hidden, hasMask, outline);
    }
    for (const mk of layer.marks ?? []) markOps(mk, layer.depth, st, rnd, hidden, hasMask, outline, hatch, bounds);
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
}

/** One stroke, filled as a ribbon along its centre line; `upTo` stops it part-way (the pen still travelling). */
function fillOp(ctx: CanvasRenderingContext2D, o: Op, upTo = Infinity) {
  const { p, wp } = o;
  ctx.fillStyle = penColor(o.a, o.c);
  ctx.beginPath();
  if (wp.length === 1) {
    ctx.arc(p[0], p[1], wp[0] / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const xs: number[] = [p[0]];
  const ys: number[] = [p[1]];
  const ws: number[] = [wp[0]];
  let run = 0;
  for (let i = 1; i < wp.length; i++) {
    const seg = Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
    if (run + seg > upTo) {
      const f = (upTo - run) / (seg || 1);
      xs.push(p[i * 2 - 2] + (p[i * 2] - p[i * 2 - 2]) * f);
      ys.push(p[i * 2 - 1] + (p[i * 2 + 1] - p[i * 2 - 1]) * f);
      ws.push(wp[i - 1] + (wp[i] - wp[i - 1]) * f);
      break;
    }
    xs.push(p[i * 2]);
    ys.push(p[i * 2 + 1]);
    ws.push(wp[i]);
    run += seg;
  }
  const m = xs.length;
  if (m < 2) return;
  const lx: number[] = [];
  const ly: number[] = [];
  const rx: number[] = [];
  const ry: number[] = [];
  for (let i = 0; i < m; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(m - 1, i + 1);
    const dx = xs[b] - xs[a];
    const dy = ys[b] - ys[a];
    const l = Math.hypot(dx, dy) || 1;
    const h = ws[i] / 2;
    lx.push(xs[i] - (dy / l) * h);
    ly.push(ys[i] + (dx / l) * h);
    rx.push(xs[i] + (dy / l) * h);
    ry.push(ys[i] - (dx / l) * h);
  }
  ctx.moveTo(lx[0], ly[0]);
  for (let i = 1; i < m; i++) ctx.lineTo(lx[i], ly[i]);
  for (let i = m - 1; i >= 0; i--) ctx.lineTo(rx[i], ry[i]);
  ctx.closePath();
  ctx.fill();
}

/** The contours (and line marks), traced as far as `upTo` sheet units along. */
function paintOutline(ctx: CanvasRenderingContext2D, c: Composition, upTo: number) {
  for (const o of c.outline) {
    if (o.s >= upTo) break;
    fillOp(ctx, o, upTo - o.s);
  }
}

/** Hatch strokes from index `from` while they start left of `limit`. Returns the next index. */
function paintHatch(ctx: CanvasRenderingContext2D, c: Composition, from: number, limit: number) {
  let i = from;
  for (; i < c.hatch.length && c.hatch[i].x <= limit; i++) fillOp(ctx, c.hatch[i]);
  return i;
}

function paintAll(ctx: CanvasRenderingContext2D, c: Composition, v: View, clip?: Path2D) {
  beginPen(ctx, v);
  if (clip) ctx.clip(clip);
  paintHatch(ctx, c, 0, Infinity);
  paintOutline(ctx, c, Infinity);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ───────────────────────────── shapes for the scenes ─────────────────────────────
 * Small helpers that write path strings and layers, so a scene reads as a list of
 * things: a hill, a canopy of scalloped clumps, a trunk that flares at its roots,
 * a cottage in perspective, a lake with its reflections.
 */

const P = (x: number, y: number) => `${fmt(x)} ${fmt(y)}`;
const RAD = Math.PI / 180;

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Smooth 2-D value noise, −1…1, a pure function of place and seed. */
function noise2(seed: number) {
  const h = (ix: number, iy: number) => {
    let n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 2246822519);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (((n ^ (n >>> 16)) >>> 0) / 4294967296) * 2 - 1;
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h(ix, iy), h(ix + 1, iy), sx), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), sx), sy);
  };
}

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
const stroke2 = (pts: readonly Pt[]) => smooth(pts, false);

function oval(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const k = 0.5523;
  const c = Math.cos(rot * RAD);
  const s = Math.sin(rot * RAD);
  const T = (x: number, y: number) => P(cx + x * c - y * s, cy + x * s + y * c);
  return `M${T(rx, 0)}C${T(rx, k * ry)} ${T(k * rx, ry)} ${T(0, ry)}C${T(-k * rx, ry)} ${T(-rx, k * ry)} ${T(-rx, 0)}C${T(-rx, -k * ry)} ${T(-k * rx, -ry)} ${T(0, -ry)}C${T(k * rx, -ry)} ${T(rx, -k * ry)} ${T(rx, 0)}Z`;
}
const circ = (cx: number, cy: number, r: number) => oval(cx, cy, r, r);

/** A leaf, petal or flame: pointed at both ends, `w` fat at the belly. */
function leaf(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const l = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / l) * w;
  const ny = ((x2 - x1) / l) * w;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M${P(x1, y1)}Q${P(mx + nx, my + ny)} ${P(x2, y2)}Q${P(mx - nx, my - ny)} ${P(x1, y1)}Z`;
}

/** A tapering tube along a curve through the points: a limb, a stem, a trunk. */
function tube(pts: readonly Pt[], w0: number, w1 = w0): string {
  const n = pts.length;
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]);
    R.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  const end = pts[n - 1];
  const prev = pts[n - 2] ?? pts[0];
  const el = Math.hypot(end[0] - prev[0], end[1] - prev[1]) || 1;
  const tip: Pt = [end[0] + ((end[0] - prev[0]) / el) * (w1 / 3), end[1] + ((end[1] - prev[1]) / el) * (w1 / 3)];
  return smooth([...L, tip, ...R.reverse()]);
}

/** A curved limb from one point to another, bowed sideways by `bend`. */
function branch(x1: number, y1: number, x2: number, y2: number, w0: number, w1: number, bend = 0): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const pts: Pt[] = Array.from({ length: 5 }, (_, i) => {
    const t = i / 4;
    const b = Math.sin(Math.PI * t) * bend;
    return [x1 + dx * t + nx * b, y1 + dy * t + ny * b];
  });
  return tube(pts, w0, w1);
}

/** A wavy line from x0 to x1. */
function wavy(x0: number, x1: number, y: number, amp: number, wl: number, phase = 0): string {
  const n = Math.max(3, Math.round(((x1 - x0) / wl) * 4));
  return smooth(Array.from({ length: n + 1 }, (_, i): Pt => [x0 + ((x1 - x0) * i) / n, y + amp * Math.sin(phase + (i / 4) * Math.PI * 2)]), false);
}

/** A bare-paper strip that follows a wave (cut out of hatching: a ripple, a glint). */
function waveStrip(x0: number, x1: number, y: number, amp: number, wl: number, th: number, phase = 0): string {
  const n = Math.max(3, Math.round(((x1 - x0) / wl) * 5));
  const at = (i: number, dy: number): Pt => [x0 + ((x1 - x0) * i) / n, y + dy + amp * Math.sin(phase + (i / 5) * Math.PI * 2)];
  const top = Array.from({ length: n + 1 }, (_, i) => at(i, (-th / 2) * Math.sin((i / n) * Math.PI) - 0.3));
  const bot = Array.from({ length: n + 1 }, (_, i) => at(n - i, (th / 2) * Math.sin(((n - i) / n) * Math.PI) + 0.3));
  return smooth(top, false) + "L" + smooth(bot, false).slice(1) + "Z";
}

/** A path mirrored across a horizontal line: a reflection. */
const mirrorY = (d: string, y0: number) => movePath(d, [1, 0, 0, -1, 0, 2 * y0]);

/* ── silhouettes ── */

/** The crest of a hill or a shore: y wanders about `y` by up to `amp`, in long S-curves, from x0 to x1. */
function crest(x0: number, x1: number, y: number, amp: number, seed: number, wl = 60, tilt = 0): Pt[] {
  const r = mulberry32(seed * 131 + 7);
  const a = smoothNoise(r, Math.max(2, Math.round((x1 - x0) / wl)));
  const b = smoothNoise(r, Math.max(3, Math.round((x1 - x0) / (wl * 0.36))));
  const n = Math.max(4, Math.round((x1 - x0) / 10));
  return Array.from({ length: n + 1 }, (_, i): Pt => {
    const t = i / n;
    return [x0 + (x1 - x0) * t, y + tilt * (t - 0.5) + amp * (0.8 * a(t) + 0.2 * b(t))];
  });
}

/** A scalloped, cloud-like blob: a ring of round bumps meeting in small cusps. */
function scallop(cx: number, cy: number, rx: number, ry: number, seed: number, n = 8, bulge = 0.85, flat = 0): string {
  const r = mulberry32(seed * 977 + 3);
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = ((i + (r() - 0.5) * 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const k = 0.92 + r() * 0.16;
    const sy = Math.sin(a) > 0 ? 1 - flat : 1;
    return [cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a) * sy];
  });
  let d = `M${P(pts[0][0], pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const ox = mx - cx;
    const oy = my - cy;
    const ol = Math.hypot(ox, oy) || 1;
    const b = bulge * l * (0.75 + r() * 0.5);
    d += `Q${P(mx + (ox / ol) * b, my + (oy / ol) * b)} ${P(q[0], q[1])}`;
  }
  return d + "Z";
}

/** A rough-edged polygon: each side is broken into short steps and knocked about, like broken rock. */
function crag(pts: readonly Pt[], seed: number, jag = 2.2, step = 7): string {
  const r = mulberry32(seed * 313 + 7);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(l / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const j = k === 0 ? 0.3 : 1;
      out.push([lerp(a[0], b[0], t) + (r() - 0.5) * jag * 2 * j, lerp(a[1], b[1], t) + (r() - 0.5) * jag * 2 * j]);
    }
  }
  return poly(out);
}

/* ── foliage ── */

type Clump = { cx: number; cy: number; rx: number; ry: number; /** 0 at the back … 1 at the front */ z: number; d: string };

type CanopyOpts = {
  /** Typical clump radius. */
  r?: number;
  /** The outline of the whole, width as a fraction of `w` from the top (0) to the bottom (1). */
  env?: (t: number) => number;
  /** Extra clumps thrown out to the sides, like limbs of leaf. */
  lobes?: number;
  /** Lean of the whole, in units across the height. */
  lean?: number;
};

const oakEnv = (t: number) => (t < 0.5 ? 0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI), 0.6) : 1 - 0.55 * Math.pow((t - 0.5) / 0.5, 1.6));

/**
 * The clumps a canopy is made of: rows from the crown to the underside, each a run of
 * overlapping scalloped puffs, smaller and tighter at the top, bigger and lower at the
 * bottom, the whole outline lumpy and never the same on both sides.
 */
function clumps(cx: number, cy: number, w: number, h: number, seed: number, o: CanopyOpts = {}): Clump[] {
  const r = mulberry32(seed * 2654 + 11);
  const env = o.env ?? oakEnv;
  const r0 = o.r ?? Math.max(4.6, Math.min(16, Math.min(w, h) * 0.165));
  const rows = Math.max(3, Math.round(h / (r0 * 1.12)));
  const wob = smoothNoise(r, 4);
  const out: Clump[] = [];
  const top = cy - h / 2;
  for (let i = 0; i < rows; i++) {
    const t = rows === 1 ? 0.5 : i / (rows - 1);
    const half = (w / 2) * clamp01(env(t) * (1 + 0.16 * wob(t)));
    const rowCx = cx + (o.lean ?? 0) * (0.5 - t) + wob(1 - t) * w * 0.04;
    const size = r0 * (0.8 + 0.32 * t) * (0.85 + 0.3 * r());
    const k = Math.max(1, Math.round((2 * half) / (size * 1.45)));
    for (let j = 0; j < k; j++) {
      const f = k === 1 ? 0.5 : (j + 0.5) / k;
      const x = rowCx - half + f * 2 * half + (r() - 0.5) * size * 0.7;
      const y = top + t * h + (r() - 0.5) * size * 0.55;
      const rx = size * (0.88 + 0.36 * r());
      const ry = rx * (0.8 + 0.14 * r());
      out.push({ cx: x, cy: y, rx, ry, z: t + (r() - 0.5) * 0.12, d: "" });
    }
  }
  for (let i = 0; i < (o.lobes ?? 0); i++) {
    const side = i % 2 ? 1 : -1;
    const t = 0.5 + r() * 0.28;
    const size = r0 * (1 + 0.3 * r());
    out.push({ cx: cx + side * (w * 0.42 + r() * w * 0.08), cy: top + t * h, rx: size * 1.25, ry: size * 0.9, z: t + 0.05, d: "" });
  }
  out.sort((a, b) => a.z - b.z);
  return out.map((c, i) => ({ ...c, d: scallop(c.cx, c.cy, c.rx, c.ry, seed * 41 + i, Math.max(7, Math.min(22, Math.round((Math.PI * (c.rx + c.ry)) / 5.2))), 0.62, 0.12) }));
}

type Canopy = { cx: number; cy: number; w: number; h: number; clumps: Clump[]; rings: number[][]; /** the whole scalloped silhouette */ d: string };

/** Is (x, y) inside the polygon (flat x,y list)? */
function inRing(q: number[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = q.length - 2; i < q.length; j = i, i += 2) {
    if (q[i + 1] > y !== q[j + 1] > y && x < ((q[j] - q[i]) * (y - q[i + 1])) / (q[j + 1] - q[i + 1]) + q[i]) hit = !hit;
  }
  return hit;
}

/** A canopy: its clumps and the one scalloped silhouette they make together. */
function canopy(cx: number, cy: number, w: number, h: number, seed: number, o: CanopyOpts = {}): Canopy {
  const cl = clumps(cx, cy, w, h, seed, o);
  const rings = cl.map((c) => flatten(c.d, 1.2)[0].p);
  const boxes = rings.map((q) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < q.length; i += 2) {
      x0 = Math.min(x0, q[i]);
      x1 = Math.max(x1, q[i]);
      y0 = Math.min(y0, q[i + 1]);
      y1 = Math.max(y1, q[i + 1]);
    }
    return [x0, y0, x1, y1];
  });
  const covered = (x: number, y: number, skip: number) => {
    for (let k = 0; k < rings.length; k++) {
      const b = boxes[k];
      if (k !== skip && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && inRing(rings[k], x, y)) return true;
    }
    return false;
  };
  const edge: number[][] = [];
  rings.forEach((q, k) => {
    for (let i = 0; i < q.length; i += 4) {
      if (covered(q[i], q[i + 1], k)) continue;
      const dx = q[i] - cx;
      const dy = q[i + 1] - cy;
      const l = Math.hypot(dx, dy) || 1;
      if (!covered(q[i] + (dx / l) * 2.5, q[i + 1] + (dy / l) * 2.5, -1)) edge.push([q[i], q[i + 1]]);
    }
  });
  edge.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return { cx, cy, w, h, clumps: cl, rings, d: edge.length > 3 ? poly(edge.map((p): Pt => [p[0], p[1]])) : "" };
}

type CanopyStyle = {
  depth?: number;
  /** How dark the darkest clump underside gets. */
  tone?: number;
  /** Contour weight (1 is the usual). */
  line?: number;
  /** How much of the whole canopy's underside is in shade, 0…1. */
  under?: number;
  /** How dark the sun-side edge of each clump is (0 is bare paper). */
  lit?: number;
  angle?: number;
  seed?: number;
  /** How much each clump's own lit-to-shade gradient counts, and how sharply the underside darkens. */
  local?: number;
  curve?: number;
};

/**
 * Shade a slice of a canopy's clumps (from the back, 0, to the front, 1): bare paper or
 * sparse hatching where the light lands, dense strokes toward the lower right, darkest
 * under the whole crown. There are no closed outlines: the silhouette is one broken pen
 * line, thin on the lit side and heavy underneath, and the clumps show only as short
 * arcs where one leaf-mass passes in front of another.
 */
function canopyLayers(c: Canopy, o: CanopyStyle = {}, from = 0, to = 1): Layer[] {
  const top = c.cy - c.h / 2;
  const under = o.under ?? 0.55;
  const lit = o.lit ?? 0.34;
  const depth = o.depth ?? 0.3;
  const lw = o.line ?? 1;
  const nz = noise2((o.seed ?? 1) * 17 + 3);
  const last = c.clumps.length;
  const inSlice = (k: Clump) => k.z >= from && (k.z < to || to >= 1);
  const layers: Layer[] = [];
  const buckets: string[] = ["", "", "", ""];
  const weights = [0.7, 1.25, 1.6, 2.0];
  c.clumps.forEach((k, i) => {
    if (!inSlice(k)) return;
    layers.push({
      d: k.d,
      tone: o.tone ?? 0.9,
      depth,
      knockout: true,
      angle: o.angle ?? 0,
      toneAt: (x, y) => {
        const u = ((x - k.cx) * -LIGHT[0] + (y - k.cy) * -LIGHT[1]) / Math.max(k.rx, k.ry);
        const local = smoothstep(-0.75, 0.9, u);
        const glob = Math.pow(clamp01((y - top) / c.h), o.curve ?? 1.5);
        const patch = 0.12 * nz(x * 0.16, y * 0.16);
        return clamp01(lit + (1 - lit) * clamp01((o.local ?? 0.8) * local + under * glob + patch - 0.08));
      },
    });
    // the pen line along this clump's edge, wherever a later clump does not cover it
    const q = c.rings[i];
    let area = 0;
    for (let j = 0; j < q.length; j += 2) area += q[j] * q[(j + 3) % q.length] - q[(j + 2) % q.length] * q[j + 1];
    const sgn = area >= 0 ? 1 : -1;
    let run = "";
    let runB = -1;
    let cnt = 0;
    const end = () => {
      if (cnt >= 3 && runB >= 0) buckets[runB] += run;
      run = "";
      runB = -1;
      cnt = 0;
    };
    const n = q.length / 2;
    for (let j = 0; j <= n; j++) {
      const a = (j % n) * 2;
      const p = q[a];
      const pq = q[a + 1];
      let hidden = false;
      let seam = false;
      for (let m = 0; m < last; m++) {
        if (m === i) continue;
        const bx = c.rings[m];
        if (!inRing(bx, p, pq)) continue;
        if (m > i) hidden = true;
        else seam = true;
      }
      const pa = ((j - 1 + n) % n) * 2;
      const pb = ((j + 1) % n) * 2;
      const dx = q[pb] - q[pa];
      const dy = q[pb + 1] - q[pa + 1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = sgn > 0 ? dy / l : -dy / l;
      const ny = sgn > 0 ? -dx / l : dx / l;
      const facing = nx * LIGHT[0] + ny * LIGHT[1];
      let b = -1;
      if (!hidden) {
        if (seam) b = facing > 0.1 ? 0 : -1;
        else b = facing > 0.35 ? 1 : facing > -0.35 ? 2 : 3;
      }
      if (b !== runB) {
        end();
        runB = b;
        if (b >= 0) run = `M${P(p, pq)}`;
        cnt = 1;
        continue;
      }
      if (b >= 0) {
        run += `L${P(p, pq)}`;
        cnt += 1;
      }
    }
    end();
  });
  const marks: Mark[] = buckets.map((d, b): Mark => ({ d, w: (weights[b] * lw) / 0.85, a: 0.9, depth }));
  layers.push({ d: "", tone: 0, depth, marks: marks.filter((m) => typeof m !== "string" && m.d.length > 0) });
  return layers;
}

/** A trunk that flares at its roots, curves and narrows: a filled shape, dark on its right side. */
function trunkLayers(x: number, base: number, top: number, wBase: number, wTop: number, bend: number, seed: number, o: { depth?: number; tone?: number; line?: number; roots?: number } = {}): Layer[] {
  const r = mulberry32(seed * 733 + 5);
  const n = 9;
  const wob = smoothNoise(r, 3);
  const cx = (t: number) => x + bend * (0.55 * Math.sin(Math.PI * t * 0.85) + 0.45 * t) + wob(t) * wBase * 0.16;
  const hw = (t: number) => lerp(wBase, wTop, Math.pow(t, 0.75)) / 2 + (wBase * 0.42 * Math.exp(-t * 11) * (o.roots ?? 1));
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = lerp(base, top, t);
    L.push([cx(t) - hw(t), y]);
    R.push([cx(t) + hw(t), y]);
  }
  const rr = o.roots ?? 1;
  const footL: Pt = [L[0][0] - wBase * 0.3 * rr, base + 0.6];
  const footR: Pt = [R[0][0] + wBase * 0.32 * rr, base + 0.8];
  const d = smooth([footL, [L[0][0] + wBase * 0.15, base + 0.2], ...L.slice(1), ...R.slice(1).reverse(), [R[0][0] - wBase * 0.15, base + 0.3], footR, [x, base + 1.8]]);
  const depth = o.depth ?? 0.2;
  const nz = noise2(seed * 5 + 1);
  const bark: string[] = [];
  for (let i = 0; i < 9; i++) {
    const t = 0.06 + r() * 0.8;
    const y = lerp(base, top, t);
    const x0 = cx(t) - hw(t) * (0.1 + r() * 0.5);
    const l = hw(t) * (0.5 + r() * 0.8);
    bark.push(`M${P(x0, y)}Q${P(x0 + l * 0.5, y - 1 - r() * 2)} ${P(x0 + l, y + (r() - 0.5) * 1.5)}`);
  }
  const lw = o.line ?? 1;
  return [
    {
      d,
      tone: o.tone ?? 0.95,
      depth,
      knockout: true,
      line: 0,
      toneAt: (px, py) => {
        const t = clamp01((base - py) / Math.max(1, base - top));
        const u = (px - (cx(t) - hw(t))) / Math.max(1, hw(t) * 2);
        return clamp01(0.06 + 0.92 * smoothstep(0.2, 0.9, u) + 0.16 * nz(px * 0.3, py * 0.12));
      },
      marks: [
        { d: bark.join(""), w: 0.7, a: 0.7, depth },
        { d: smooth([footL, [L[0][0] + wBase * 0.1, base - 1], ...L.slice(1)], false), w: 0.85 * lw, a: 0.9, depth },
        { d: smooth([footR, [R[0][0] - wBase * 0.1, base - 1], ...R.slice(1)], false), w: 1.5 * lw, a: 0.95, depth },
      ],
    },
  ];
}

/** A cast shadow on the ground: an irregular blob, dense at the tree's foot and letting go toward its far end. */
function castShadow(x0: number, y: number, rx: number, ry: number, seed: number, tone = 0.8, depth = 0.25): Layer {
  const r = mulberry32(seed * 99 + 1);
  const pts: Pt[] = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const k = 0.86 + r() * 0.24;
    return [x0 + rx + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k];
  });
  const nz = noise2(seed * 3 + 2);
  return {
    d: smooth(pts),
    tone,
    depth,
    run: 0.7,
    toneAt: (px, py) => clamp01(1 - 0.72 * ((px - x0) / (rx * 2)) + 0.25 * nz(px * 0.12, py * 0.4) - 0.1),
  };
}

/* ── ground ── */

/** Grass and field: a ground shape hatched in short vertical strokes that thicken toward the viewer and toward shadow. */
function groundLayer(x0: number, x1: number, top: (x: number) => number, bottom: number, o: { far?: number; near?: number; depth?: number; seed?: number; shade?: (x: number, y: number) => number; run?: number; marks?: readonly Mark[]; angle?: number; line?: number } = {}): Layer {
  const n = Math.max(3, Math.round((x1 - x0) / 14));
  const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, top(x0 + ((x1 - x0) * i) / n)]);
  const far = o.far ?? 0.04;
  const near = o.near ?? 0.5;
  const nz = noise2((o.seed ?? 1) * 7 + 9);
  const yMin = Math.min(...pts.map((p) => p[1]));
  return {
    d: `${smooth(pts, false)}L${P(x1, bottom)}L${P(x0, bottom)}Z`,
    tone: Math.max(far, near, 0.05) + 0.5,
    depth: o.depth ?? 0.4,
    angle: o.angle ?? 0,
    run: o.run ?? 0.75,
    line: o.line ?? 0,
    side: "top",
    toneAt: (px, py) => {
      const v = clamp01((py - yMin) / Math.max(1, bottom - yMin));
      const rows = 0.62 + 0.38 * nz(px * 0.05, py * 0.7);
      const patch = 0.06 + 0.94 * smoothstep(-0.12, 0.34, nz(px * 0.022 + 40, py * 0.11 + 7));
      const base = lerp(far, near, Math.pow(v, 1.05)) * rows * patch;
      return clamp01((base + (o.shade ? o.shade(px, py) : 0)) / (Math.max(far, near, 0.05) + 0.5));
    },
    marks: o.marks,
  };
}

/** Grass ticks: tufts of curved blades standing on the ground, thickest at the front. */
function tufts(x0: number, x1: number, y0: number, y1: number, n: number, h: number, seed = 1, depth = 0.3): Mark {
  const r = mulberry32(seed * 313 + 11);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const v = r();
    const y = y0 + (y1 - y0) * v;
    const hh = h * (0.45 + 0.9 * v) * (0.6 + 0.8 * r());
    const blades = 2 + Math.floor(r() * 3);
    const lean = (r() - 0.5) * 5;
    for (let b = 0; b < blades; b++) {
      const bx = x + (b - blades / 2) * (0.9 + v);
      const bh = hh * (0.55 + 0.6 * r());
      const l = lean + (b - (blades - 1) / 2) * (1.1 + r());
      d += `M${P(bx, y)}Q${P(bx + l * 0.15, y - bh * 0.6)} ${P(bx + l * 0.5, y - bh)}`;
    }
  }
  return { d, tex: true, blade: true, a: 0.85, w: 1, depth };
}

/** Stipple: n dots scattered in an ellipse. */
function stip(cx: number, cy: number, rx: number, ry: number, n: number, seed = 1, a = 0.75, depth?: number): Mark {
  const r = mulberry32(seed * 419 + 23);
  let d = "";
  for (let i = 0; i < n; i++) {
    const t = r() * Math.PI * 2;
    const k = Math.sqrt(r());
    d += `M${P(cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k)}`;
  }
  return { d, tex: true, a, depth };
}

/** Short dashes scattered over a box: pebbles, wet earth, ripples. */
function dashes(x0: number, x1: number, y0: number, y1: number, n: number, len: number, seed = 1, o: { a?: number; depth?: number; tilt?: number } = {}): Mark {
  const r = mulberry32(seed * 251 + 29);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const l = len * (0.4 + r() * 1.1);
    const t = (o.tilt ?? 0) + (r() - 0.5) * 0.1;
    d += `M${P(x, y)}Q${P(x + l / 2, y + t * l * 0.5 + (r() - 0.5) * 0.6)} ${P(x + l, y + t * l)}`;
  }
  return { d, tex: true, a: o.a ?? 0.75, depth: o.depth, w: 0.9 };
}

/* ── water ── */

/** A lake: horizontal broken dashes of every length, tight along the shore and open toward the viewer. */
function lakeLayer(x0: number, x1: number, y0: number, y1: number, o: { seed?: number; depth?: number; shore?: "top" | "bottom"; tone?: number; clear?: number } = {}): Layer {
  const nz = noise2((o.seed ?? 1) * 11 + 1);
  const tight = o.shore ?? "top";
  return {
    d: box(x0, y0, x1 - x0, y1 - y0),
    tone: o.tone ?? 0.62,
    depth: o.depth ?? 0.4,
    angle: 90,
    run: 0.5,
    loose: true,
    toneAt: (px, py) => {
      const v = clamp01((py - y0) / Math.max(1, y1 - y0));
      const near = tight === "top" ? 1 - v : v;
      return clamp01((0.14 + 0.46 * Math.pow(near, 1.4) + 0.3 * nz(px * 0.05, py * 0.6) - 0.2) * (o.clear ? smoothstep(y0 + o.clear * 0.4, y0 + o.clear, py) : 1));
    },
  };
}

/** Bare-paper glints across water: long thin strips cut out of whatever is drawn behind. */
function glints(x0: number, x1: number, y0: number, y1: number, n: number, seed = 1): Layer[] {
  const r = mulberry32(seed * 43 + 7);
  return Array.from({ length: n }, (): Layer => {
    const w = 16 + r() * 46;
    const x = x0 + r() * (x1 - x0 - w);
    const y = y0 + r() * (y1 - y0);
    return { d: waveStrip(x, x + w, y, 0.5 + r() * 0.5, 14 + r() * 10, 1.5 + r() * 1.1, r() * 6), tone: 0, knockout: true, depth: 0.3 };
  });
}

/** Reflections: the shapes above a waterline, turned over and hatched in broken vertical strokes. */
function reflect(ds: readonly string[], y0: number, tone: number, depth: number, reach = 46): Layer[] {
  return ds.map((d): Layer => ({ d: mirrorY(d, y0), tone, depth, run: 0.55, angle: 0, toneAt: (_, py) => clamp01(1 - (py - y0) / reach) * 0.9 + 0.1 }));
}

/* ── pines ── */

/** A conifer: a thin trunk and tiers of drooping, ragged branches, each dark under its skirt and light on its upper left. */
function pineLayers(x: number, base: number, h: number, w: number, seed: number, o: { depth?: number; tone?: number; line?: number } = {}): Layer[] {
  const r = mulberry32(seed * 887 + 3);
  const depth = o.depth ?? 0.3;
  const tiers = Math.max(3, Math.round(h / 13));
  const out: Layer[] = [
    { d: box(x - Math.max(1, w * 0.03), base - h * 0.18, Math.max(2, w * 0.06), h * 0.18 + 1), tone: 0.95, depth, line: 0.5 },
  ];
  const top = base - h;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const t1 = (i + 1.55) / tiers;
    const yT = top + t0 * h * 0.88;
    const yB = Math.min(base - h * 0.06, top + t1 * h * 0.88);
    const hw = (w / 2) * (0.22 + 0.78 * Math.pow((t0 + t1) / 2, 0.85));
    const lean = (r() - 0.5) * hw * 0.16;
    const pts: Pt[] = [[x + lean, yT]];
    // left edge, ragged, drooping toward the tip
    const steps = 4;
    for (let k = 1; k <= steps; k++) {
      const f = k / steps;
      pts.push([x + lean - hw * Math.pow(f, 0.92) * (0.94 + r() * 0.12) + hw * 0.08 * (k % 2 ? 1 : 0), lerp(yT, yB - 1.5, Math.pow(f, 1.25)) + (r() - 0.4) * 1.5]);
    }
    // the skirt: pointed tips of branches
    const tips = 3 + Math.floor(hw / 7);
    for (let k = 1; k <= tips; k++) {
      const f = k / (tips + 1);
      const px = x + lean - hw + f * 2 * hw;
      pts.push([px - hw * 0.05, yB - 1 - (r() * 2.5 + 2)]);
      pts.push([px + hw * 0.06, yB + (r() - 0.3) * 1.6]);
    }
    for (let k = steps; k >= 1; k--) {
      const f = k / steps;
      pts.push([x + lean + hw * Math.pow(f, 0.92) * (0.94 + r() * 0.12) - hw * 0.08 * (k % 2 ? 1 : 0), lerp(yT, yB - 1.5, Math.pow(f, 1.25)) + (r() - 0.4) * 1.5]);
    }
    const nz = noise2(seed * 19 + i);
    out.push({
      d: poly(pts),
      tone: o.tone ?? 0.92,
      depth,
      knockout: true,
      line: o.line ?? 0.85,
      side: "all",
      toneAt: (px, py) => {
        const u = clamp01((px - (x + lean - hw)) / (hw * 2));
        const v = clamp01((py - yT) / (yB - yT));
        return clamp01(0.06 + 0.3 * u + 0.66 * Math.pow(v, 1.2) + 0.14 * nz(px * 0.25, py * 0.25) - 0.05);
      },
    });
  }
  return out;
}

/* ── architecture ── */

type HouseOpts = {
  /** Wall width (along the long face), depth (the end), eave height and roof rise. */
  w: number;
  d: number;
  h: number;
  rise: number;
  /** Where the horizon is, and the vanishing points to the left (the long wall) and to the right (the gable end). */
  hz: number;
  vpL: number;
  vpR: number;
  depth?: number;
  seed?: number;
  /** 0…1: how much the roofline sags. */
  sag?: number;
  chimney?: boolean;
  /** Windows on the long face, as positions along the wall (0 at the near corner … 1 at the far end). */
  windows?: readonly number[];
  door?: number;
  roofTone?: number;
  /** Tone of the shaded gable end. */
  endTone?: number;
};

/** A house in two-point perspective: near corner at (x, y). Roofs hatched down their slope, walls mostly bare, windows small and dark. */
function house(x: number, y: number, o: HouseOpts): Layer[] {
  const depth = o.depth ?? 0.4;
  const sag = o.sag ?? 0.5;
  const tL = (len: number) => len / (x - o.vpL);
  const tR = (len: number) => len / (o.vpR - x);
  // a point on the long face: u along it from the near corner, v up it (0…1 of the eave height)
  const F = (u: number, v: number): Pt => {
    const t = tL(o.w * u);
    return [x - o.w * u, o.hz + (1 - t) * (y - o.hz - v * o.h)];
  };
  // a point on the gable end
  const S = (u: number, v: number): Pt => {
    const t = tR(o.d * u);
    return [x + o.d * u, o.hz + (1 - t) * (y - o.hz - v * o.h)];
  };
  // the ridge: above the middle of the gable end, running back parallel to the long face
  const mid = S(0.5, 1);
  const tMid = tR(o.d * 0.5);
  const apex: Pt = [mid[0], mid[1] - o.rise * (1 - tMid)];
  const rw = o.w * (1 - tMid);
  const tRidge = rw / (apex[0] - o.vpL);
  const ridgeEnd: Pt = [apex[0] - rw, o.hz + (apex[1] - o.hz) * (1 - tRidge)];
  // eaves overhang a little
  const eaveNear = F(0, 1);
  const eaveFar = F(1, 1);
  const c0: Pt = [eaveNear[0] + 3, eaveNear[1] + 0.5];
  const c1: Pt = [eaveFar[0] - 3, eaveFar[1] - 0.4];
  const sg = (a: Pt, b: Pt, amt: number, n = 7): Pt[] =>
    Array.from({ length: n + 1 }, (_, i): Pt => {
      const t = i / n;
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + amt * Math.sin(Math.PI * t)];
    });
  const eave = sg(c0, c1, sag * 1.6);
  const ridge = sg(apex, ridgeEnd, sag * 1.2);
  const roofPts: Pt[] = [...eave, ...ridge.slice().reverse()];
  const roofAngle = (Math.atan2(c0[0] - apex[0], c0[1] - apex[1]) * 180) / Math.PI;
  const layers: Layer[] = [];

  // the gable end: in shade, its edge sloping up to the ridge
  const endWall = poly([F(0, 0), S(1, 0), S(1, 1), apex, F(0, 1)]);
  layers.push({
    d: endWall,
    tone: o.endTone ?? 0.62,
    depth,
    knockout: true,
    line: 0.9,
    crisp: true,
    angle: 0,
    ramp: { to: (o.endTone ?? 0.62) * 0.5, dir: "up" },
  });
  // the long face: bare paper, a little shade under the eaves and at the foot
  const front = poly([F(0, 0), F(1, 0), F(1, 1), F(0, 1)]);
  const nz = noise2((o.seed ?? 1) * 13 + 5);
  layers.push({
    d: front,
    tone: 0.5,
    depth,
    knockout: true,
    line: 0.9,
    crisp: true,
    toneAt: (px, py) => {
      const v = clamp01((y - py) / o.h);
      const u = clamp01((x - px) / o.w);
      return clamp01(0.55 * smoothstep(0.82, 1, v) + 0.4 * smoothstep(0.22, 0, v) + 0.1 * nz(px * 0.2, py * 0.2) + 0.12 * (1 - u) - 0.08);
    },
    marks: [dashes(x - o.w, x, y - 3, y + 1, 10, 3, (o.seed ?? 1) + 2, { a: 0.6, depth })],
  });
  // windows and a door: small dark shapes with a bare frame
  const quad = (u0: number, v0: number, u1: number, v1: number, arch = 0): string => {
    const a = F(u0, v0);
    const b = F(u1, v0);
    const c = F(u1, v1);
    const d = F(u0, v1);
    if (!arch) return poly([a, b, c, d]);
    const m = F((u0 + u1) / 2, v1 + arch);
    return `M${P(a[0], a[1])}L${P(b[0], b[1])}L${P(c[0], c[1])}Q${P(m[0] + (c[0] - d[0]) * 0.25, m[1])} ${P(m[0], m[1])}Q${P(m[0] - (c[0] - d[0]) * 0.25, m[1])} ${P(d[0], d[1])}Z`;
  };
  for (const u of o.windows ?? []) {
    const wu = 0.075;
    layers.push({ d: quad(u - wu / 2, 0.32, u + wu / 2, 0.74, 0.1), tone: 0.95, depth, knockout: true, line: 0.75, crisp: true, marks: [line(...F(u, 0.32), ...F(u, 0.84)), line(...F(u - wu / 2, 0.55), ...F(u + wu / 2, 0.55))] });
  }
  if (o.door !== undefined) {
    const u = o.door;
    layers.push({ d: quad(u - 0.055, 0, u + 0.055, 0.66, 0.16), tone: 0.8, depth, knockout: true, line: 0.85, crisp: true });
  }
  // a small window in the gable end
  layers.push({ d: poly([S(0.42, 0.56), S(0.58, 0.56), S(0.58, 0.86), S(0.42, 0.86)]), tone: 0.9, depth, knockout: true, line: 0.65, crisp: true });

  // the roof: hatched down its slope, darker toward the eave
  layers.push({
    d: poly(roofPts),
    tone: o.roofTone ?? 0.78,
    depth,
    knockout: true,
    line: 1,
    crisp: true,
    angle: roofAngle * 0.7,
    run: 1.3,
    toneAt: (px, py) => {
      const u = clamp01((px - Math.min(c1[0], ridgeEnd[0])) / Math.max(1, Math.abs(c0[0] - c1[0])));
      return clamp01(0.62 + 0.3 * u + 0.16 * nz(px * 0.4, py * 0.4) - 0.1);
    },
  });
  // roof edge over the gable end: a thin dark verge
  layers.push({ d: "", tone: 0, marks: [{ d: stroke2([[c0[0], c0[1]], [apex[0], apex[1]]]), w: 1.05, depth }, { d: stroke2([[c0[0] + 1, c0[1] + 2.2], [apex[0] + 0.5, apex[1] + 2.6]]), w: 0.7, a: 0.7, depth }] });
  if (o.chimney) {
    const cu = 0.7;
    const cb = [ridge[Math.round((1 - cu) * 7)][0], ridge[Math.round((1 - cu) * 7)][1]] as Pt;
    const cw = Math.max(3, o.w * 0.06);
    const chH = o.rise * 0.6 + 3;
    layers.push({ d: poly([[cb[0] - cw, cb[1] + 1], [cb[0] - cw, cb[1] - chH], [cb[0] + cw * 0.3, cb[1] - chH - 0.6], [cb[0] + cw * 0.3, cb[1] + 1]]), tone: 0.35, depth, knockout: true, line: 0.85, crisp: true, ramp: { to: 0.9, dir: "right" } });
    layers.push({ d: poly([[cb[0] + cw * 0.3, cb[1] - chH - 0.6], [cb[0] + cw, cb[1] - chH + 0.4], [cb[0] + cw, cb[1] + 1.5], [cb[0] + cw * 0.3, cb[1] + 1]]), tone: 0.9, depth, knockout: true, line: 0.7, crisp: true });
  }
  return layers;
}
/* ── things that stand in a landscape ── */

/** A bank of mist: a long lens of bare paper that swallows whatever is behind it. */
function mist(x0: number, x1: number, y: number, th: number, seed: number, depth = 0.5): Layer {
  const r = mulberry32(seed * 61 + 1);
  const n = Math.max(5, Math.round((x1 - x0) / 24));
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k = Math.pow(Math.sin(Math.PI * t), 0.55);
    const x = x0 + (x1 - x0) * t;
    top.push([x, y - (th / 2) * k * (0.8 + 0.4 * r())]);
    bot.push([x, y + (th / 2) * k * (0.8 + 0.4 * r())]);
  }
  return { d: smooth([...top, ...bot.reverse()]), tone: 0, knockout: true, depth };
}

/** A far line of trees: a run of small overlapping canopies. Returns the layers and each silhouette (for reflections). */
function treeLine(x0: number, x1: number, base: number, h: number, seed: number, depth: number, tone: number, o: { lit?: number; line?: number; under?: number } = {}): { layers: Layer[]; shapes: string[] } {
  const r = mulberry32(seed * 577 + 5);
  const layers: Layer[] = [];
  const shapes: string[] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = (30 + r() * 34) * Math.max(0.6, h / 26);
    const hh = h * (0.72 + 0.5 * r());
    const c = canopy(x + w / 2, base - hh / 2 + 1, w, hh, seed * 31 + i, { r: Math.max(3.2, h * 0.19) });
    layers.push(...canopyLayers(c, { depth, tone, lit: o.lit ?? 0.34, under: o.under ?? 0.5, line: o.line ?? 0.8, seed: seed + i }));
    shapes.push(c.d);
    x += w * (0.5 + 0.32 * r());
    i += 1;
  }
  return { layers, shapes };
}

/** A hedge or a row of bushes: a low, wide, lumpy canopy. */
function hedge(x0: number, x1: number, base: number, h: number, seed: number, depth: number, tone = 0.9, o: { lit?: number; line?: number } = {}): Layer[] {
  const c = canopy((x0 + x1) / 2, base - h / 2, x1 - x0, h, seed, { r: Math.max(3.4, h * 0.3), env: (t) => 0.86 + 0.14 * Math.sin(t * 3.2) - 0.12 * Math.pow(1 - t, 3) });
  return canopyLayers(c, { depth, tone, lit: o.lit ?? 0.38, under: 0.6, line: o.line ?? 0.9, seed });
}

type OakOpts = { x: number; base: number; h: number; w: number; seed: number; depth?: number; lean?: number; tone?: number; lobes?: number; under?: number; lit?: number; line?: number; bend?: number; canopyFrac?: number };

/** An oak: a trunk that flares at its roots and curves up, limbs that vanish into a canopy of scalloped clumps. */
function oakTree(o: OakOpts): Layer[] {
  const depth = o.depth ?? 0.2;
  const ch = o.h * (o.canopyFrac ?? 0.6);
  const cy = o.base - o.h + ch / 2;
  const cx = o.x + (o.lean ?? 0);
  const c = canopy(cx, cy, o.w, ch, o.seed, { lobes: o.lobes ?? 1, lean: (o.lean ?? 0) * 0.4 });
  const st: CanopyStyle = { depth, tone: o.tone ?? 0.92, under: o.under ?? 0.6, lit: o.lit ?? 0.36, line: o.line ?? 1, seed: o.seed };
  const tw = Math.max(4.5, o.w * 0.13);
  const bend = o.bend ?? (o.lean ?? 0) * 0.5;
  const trunkTop = o.base - o.h + ch * 0.55;
  const r = mulberry32(o.seed * 19 + 3);
  const limbs: Layer[] = [];
  for (let i = 0; i < (o.h >= 90 ? 3 : 0); i++) {
    const side = i === 0 ? -1 : i === 1 ? 1 : r() < 0.5 ? -1 : 1;
    const y0 = o.base - o.h * (0.34 + 0.09 * i + 0.05 * r());
    const x0 = o.x + bend * 0.6;
    const tx = cx + side * o.w * (0.1 + 0.16 * r());
    const ty = o.base - o.h + ch * (0.8 + 0.14 * r());
    limbs.push({ d: branch(x0, y0, tx, ty, tw * 0.5, tw * 0.16, side * (0.6 + 1.2 * r())), tone: 0.85, depth, knockout: true, line: 0.8, side: "all", ramp: { to: 0.95, dir: "right" } });
  }
  return [...canopyLayers(c, st, 0, 0.5), ...trunkLayers(o.x, o.base, trunkTop, tw * 1.35, tw * 0.9, bend, o.seed, { depth }), ...limbs, ...canopyLayers(c, st, 0.5, 1)];
}

/** A poplar: a tall flame of leaf on a short trunk. */
function poplar(x: number, base: number, h: number, w: number, seed: number, depth = 0.25, tone = 0.92, lean = 0): Layer[] {
  const env = (t: number) => (t < 0.62 ? 0.14 + 0.86 * Math.pow(Math.sin(((Math.PI / 2) * t) / 0.62), 1.2) : 1 - 0.4 * Math.pow((t - 0.62) / 0.38, 1.5));
  const c = canopy(x + lean / 2, base - h * 0.55, w, h * 0.9, seed, { r: Math.max(4.8, w * 0.36), env, lean, lobes: 0 });
  return [
    ...trunkLayers(x, base, base - h * 0.2, Math.max(3, w * 0.16), Math.max(2.4, w * 0.12), 0, seed, { depth, roots: 0.5 }),
    ...canopyLayers(c, { depth, tone, lit: 0.26, under: 0.55, line: 1, seed, local: 0.85 }),
  ];
}

/** A slender birch: a pale trunk that curves, ringed with short dark marks, and a few fine limbs that leave the page. */
function birchLayers(x: number, base: number, top: number, w: number, bend: number, seed: number, depth = 0.2, o: { limbs?: boolean } = {}): Layer[] {
  const r = mulberry32(seed * 131 + 9);
  const wob = smoothNoise(r, 3);
  const n = 8;
  const cx = (t: number) => x + bend * (0.6 * Math.sin(Math.PI * t * 0.8) + 0.4 * t * t) + wob(t) * w * 0.25;
  const hw = (t: number) => lerp(w, w * 0.55, t) / 2 + w * 0.3 * Math.exp(-t * 14);
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = lerp(base, top, t);
    L.push([cx(t) - hw(t), y]);
    R.push([cx(t) + hw(t), y]);
  }
  const d = smooth([[L[0][0] - w * 0.3, base + 1], ...L, ...R.slice().reverse(), [R[0][0] + w * 0.34, base + 1.4]]);
  const marks: string[] = [];
  const tick: string[] = [];
  const len = base - top;
  for (let y = base - 5; y > top + 3; y -= 4 + r() * 8) {
    const t = clamp01((base - y) / len);
    const half = hw(t);
    const x0 = cx(t) - half * (0.9 - r() * 0.5);
    const l = half * (0.6 + r() * 1.0);
    marks.push(`M${P(x0, y)}Q${P(x0 + l * 0.5, y - 0.9 - r())} ${P(x0 + l, y + (r() - 0.5))}`);
    if (r() < 0.5) tick.push(`M${P(cx(t) + half * 0.2, y + 1.3)}L${P(cx(t) + half * (0.5 + r() * 0.4), y + 1.6)}`);
  }
  const layers: Layer[] = [
    {
      d,
      tone: 0.9,
      depth,
      knockout: true,
      line: 0.95,
      side: "all",
      toneAt: (px, py) => {
        const t = clamp01((base - py) / len);
        const u = (px - (cx(t) - hw(t))) / Math.max(1, hw(t) * 2);
        return clamp01(0.9 * smoothstep(0.62, 1, u) + 0.04);
      },
      marks: [{ d: marks.join(""), w: 1.35, a: 0.95, depth }, { d: tick.join(""), w: 0.8, a: 0.8, depth }],
    },
  ];
  if (o.limbs) {
    let ld = "";
    for (let i = 0; i < 4; i++) {
      const t = 0.62 + 0.09 * i;
      const y = lerp(base, top, t);
      const side = i % 2 ? 1 : -1;
      const x0 = cx(t);
      ld += `M${P(x0, y)}Q${P(x0 + side * 8, y - 6 - r() * 6)} ${P(x0 + side * (14 + r() * 8), y - 14 - r() * 10)}`;
    }
    layers.push({ d: "", tone: 0, depth, marks: [{ d: ld, w: 0.85, a: 0.9, depth }] });
  }
  return layers;
}

/** Reeds and tall grasses: curved blades from a common patch of ground, a few crowned with a dark cattail head. */
function reeds(x: number, base: number, n: number, hMin: number, hMax: number, spread: number, seed: number, depth = 0.05, cattails = 0.2, wide = 1.7): Layer[] {
  const r = mulberry32(seed * 811 + 3);
  let d = "";
  const heads: Layer[] = [];
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * spread;
    const h = lerp(hMin, hMax, Math.pow(r(), 0.7));
    const lean = (bx - x) * 0.18 + (r() - 0.5) * 10;
    const tipX = bx + lean;
    const tipY = base - h;
    d += `M${P(bx, base + r() * 3)}Q${P(bx + lean * 0.15, base - h * 0.55)} ${P(tipX, tipY)}`;
    if (r() < cattails) {
      const hl = 8 + r() * 4;
      const ang = Math.atan2(lean, h * 0.5);
      heads.push({ d: leaf(tipX - Math.sin(ang) * hl * 0.8, tipY + hl * 0.9, tipX, tipY - 1, 1.9), tone: 0.95, depth, knockout: true, line: 0.6, side: "all" });
    }
  }
  return [{ d: "", tone: 0, depth, marks: [{ d, tex: true, blade: true, w: wide, a: 0.92, depth }] }, ...heads];
}

/** A rock: a rounded lump with a lit top-left and a shadowed underside. */
function rockLayer(cx: number, cy: number, rx: number, ry: number, seed: number, depth = 0.2, tone = 0.9): Layer {
  const r = mulberry32(seed * 91 + 3);
  const pts: Pt[] = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const k = 0.84 + r() * 0.3;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? 0.75 : 1)];
  });
  return { d: smooth(pts), tone, depth, knockout: true, line: 0.95, side: "all", toneAt: (px, py) => clamp01(0.12 + 0.95 * smoothstep(-0.5, 0.9, ((px - cx) * -LIGHT[0] + (py - cy) * -LIGHT[1]) / Math.max(rx, ry))) };
}

/** A far ridge with its own faint texture: a hill in one tone, its crest drawn in a broken line. */
function ridge(x0: number, x1: number, y: number, amp: number, seed: number, bottom: number, depth: number, tone: number, o: { wl?: number; tilt?: number; line?: number; angle?: number; run?: number } = {}): Layer {
  const nz = noise2(seed * 5 + 1);
  const c = crest(x0, x1, y, amp, seed, o.wl ?? 70, o.tilt ?? 0);
  const top = Math.min(...c.map((p) => p[1]));
  return {
    d: `${smooth(c, false)}L${P(x1, bottom)}L${P(x0, bottom)}Z`,
    tone,
    depth,
    knockout: true,
    line: o.line ?? 0.8,
    side: "top",
    angle: o.angle ?? 0,
    run: o.run,
    toneAt: (px, py) => clamp01(0.3 + 0.7 * smoothstep(top, bottom, py) + 0.25 * nz(px * 0.03, py * 0.08) - 0.1),
  };
}

/** A sunflower: a slim stem and two broad leaves, two rings of petals round a dark seed head, tipped to face away from the viewer. */
function sunflower(cx: number, cy: number, R: number, rot: number, squash: number, stemBase: number, seed: number, depth = 0.1, bend = 0, leaves = 1): Layer[] {
  const r = mulberry32(seed * 373 + 5);
  const layers: Layer[] = [];
  const stem: Pt[] = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return [lerp(cx, cx + bend, t) - Math.sin(Math.PI * t) * bend * 0.35, lerp(cy, stemBase, t)];
  });
  layers.push({ d: tube(stem, 2.4, 3.6), tone: 0.55, depth, knockout: true, line: 0.85, side: "all", ramp: { to: 0.9, dir: "right" } });
  for (let i = 0; i < (leaves > 0 ? 2 : 0); i++) {
    const t = 0.42 + i * 0.26;
    const sx = lerp(cx, cx + bend, t);
    const sy = lerp(cy, stemBase, t);
    const side = i === 0 ? -1 : 1;
    const l = 34 - i * 8;
    const ex = sx + side * l;
    const ey = sy - 9 + i * 8;
    layers.push({
      d: `M${P(sx, sy)}Q${P(sx + side * l * 0.35, sy - 15 + i * 4)} ${P(ex, ey)}Q${P(sx + side * l * 0.6, sy + 5 + i * 3)} ${P(sx, sy)}Z`,
      tone: 0.7,
      depth,
      knockout: true,
      line: 0.9,
      side: "all",
      angle: side * 34,
      ramp: { to: 0.9, dir: side < 0 ? "left" : "right" },
      marks: [{ d: stroke2([[sx, sy], [sx + side * l * 0.5, sy - 5 + i * 3], [ex - side * 3, ey + 0.5]]), w: 0.75, a: 0.9, depth }],
    });
  }
  const cr = Math.cos(rot * RAD);
  const sr = Math.sin(rot * RAD);
  const at = (a: number, rho: number): Pt => {
    const x = rho * Math.cos(a);
    const y = rho * squash * Math.sin(a);
    return [cx + x * cr - y * sr, cy + x * sr + y * cr];
  };
  const ring = (n: number, r0: number, r1: number, wd: number, off: number, tone: number, sid: number) => {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.sin((a / n) * Math.PI * 2 + off) - Math.sin((b / n) * Math.PI * 2 + off));
    for (const i of order) {
      const a = (i / n) * Math.PI * 2 + off + (r() - 0.5) * 0.12;
      const p0 = at(a, R * r0);
      const p1 = at(a + (r() - 0.5) * 0.08, R * (r1 + (r() - 0.5) * 0.14));
      layers.push({ d: leaf(p0[0], p0[1], p1[0], p1[1], wd * (0.85 + r() * 0.3)), tone, depth, knockout: true, line: 0.7, side: "all", ramp: { to: tone * 1.3, dir: "right" }, angle: (i + sid) % 2 ? 5 : -5, marks: [{ d: line(p0[0], p0[1], lerp(p0[0], p1[0], 0.8), lerp(p0[1], p1[1], 0.8)), w: 0.5, a: 0.55, depth }] });
    }
  };
  ring(17, 0.5, 1.12, 4.1, 0, 0.55, 0);
  ring(13, 0.46, 0.86, 3.2, 0.24, 0.32, 1);
  layers.push({
    d: oval(cx, cy, R * 0.52, R * 0.52 * squash, rot),
    tone: 0.95,
    depth,
    knockout: true,
    line: 1,
    side: "all",
    toneAt: (px, py) => clamp01(0.5 + 0.5 * smoothstep(-0.7, 0.9, ((px - cx) * -LIGHT[0] + (py - cy) * -LIGHT[1]) / (R * 0.5))),
    marks: [stip(cx - R * 0.14, cy - R * 0.12 * squash, R * 0.26, R * 0.22 * squash, 10, seed + 4, 0.95, depth)],
  });
  return layers;
}
/* ───────────────────────────── the fourteen pages ─────────────────────────────
 * Each scene is a list of layers, back to front, at three or more depths: a far
 * line, a middle ground and a near foreground. Most of every sheet is bare paper —
 * sky, mist, light — and the hatching goes where the shade falls. The sheet is
 * 360 × 240; the card shows the middle of it (about x 44 → 315).
 */

/* 1 — Morning Fog: a faint tree line, one dark oak in the right third, mist as bands of paper */
function sceneFog(): Layer[] {
  const far = treeLine(6, 356, 130, 24, 11, 0.96, 0.62);
  const mid = treeLine(6, 210, 150, 30, 12, 0.72, 0.8);
  const post = (x: number, y: number, s: number): Layer => ({ d: poly([[x - 1.3 * s, y], [x - 1.1 * s, y - 15 * s], [x + 1.2 * s, y - 15.6 * s], [x + 1.4 * s, y]]), tone: 0.6, depth: 0.5, line: 0.7, crisp: true, ramp: { to: 0.9, dir: "right" } });
  return [
    ...far.layers,
    mist(0, 360, 128, 20, 1, 0.9),
    ...mid.layers,
    groundLayer(6, 356, (x) => 152 + 4 * Math.sin(x * 0.02), 240, { far: 0.05, near: 0.4, depth: 0.5, seed: 1, marks: [tufts(20, 340, 156, 200, 26, 6, 1, 0.5)] }),
    mist(0, 280, 154, 16, 2, 0.5),
    ...[64, 92, 118, 142].map((x, i) => post(x, 168 + i * 1.6, 0.6 + i * 0.16)),
    { d: "", tone: 0, depth: 0.5, marks: [{ d: stroke2([[58, 155], [92, 157.5], [118, 160], [142, 163], [176, 166]]), w: 0.6, a: 0.75, depth: 0.5 }] },
    castShadow(232, 196, 62, 6, 4, 0.75, 0.2),
    ...oakTree({ x: 236, base: 194, h: 138, w: 96, seed: 5, depth: 0.12, lean: 6, lobes: 2, tone: 0.8, under: 0.7, lit: 0.26, bend: 12 }),
    mist(120, 350, 186, 16, 3, 0.4),
    groundLayer(6, 356, (x) => 198 + 3 * Math.sin(x * 0.03 + 1), 240, { far: 0.2, near: 0.8, depth: 0.1, seed: 4, run: 1.2, marks: [tufts(10, 350, 204, 238, 34, 10, 3, 0.05), stip(120, 222, 60, 8, 14, 3, 0.8, 0.1)] }),
  ];
}

/* 2 — The Old Oak: one large oak in a meadow, long grass and a cast shadow */
function sceneOak(): Layer[] {
  const far = treeLine(6, 356, 148, 22, 21, 0.95, 0.6);
  return [
    ...far.layers,
    ridge(6, 356, 156, 6, 3, 240, 0.85, 0.3, { wl: 90, line: 0.6 }),
    ...hedge(250, 356, 168, 16, 22, 0.7, 0.85),
    groundLayer(6, 356, (x) => 164 + 5 * Math.sin(x * 0.014 + 2), 240, { far: 0.05, near: 0.45, depth: 0.45, seed: 2, shade: (x, y) => (x > 140 && x < 268 && y > 172 && y < 196 ? 0.6 : 0), marks: [tufts(10, 350, 170, 200, 36, 6, 2, 0.4)] }),
    castShadow(150, 190, 72, 8, 6, 0.85, 0.2),
    ...oakTree({ x: 150, base: 186, h: 158, w: 158, seed: 8, depth: 0.1, lean: 8, lobes: 2, tone: 0.8, under: 0.65, lit: 0.22, bend: 14 }),
    groundLayer(6, 356, (x) => 206 + 4 * Math.sin(x * 0.02 + 4), 240, { far: 0.25, near: 0.85, depth: 0.08, seed: 5, run: 1.3, marks: [tufts(10, 350, 210, 238, 46, 11, 4, 0.05), stip(240, 216, 50, 6, 12, 4, 0.8, 0.1)] }),
  ];
}

/* 3 — Cottage and Poplars */
function sceneCottage(): Layer[] {
  const far = treeLine(6, 356, 124, 22, 31, 0.95, 0.6);
  const cot = house(176, 178, { w: 62, d: 36, h: 28, rise: 26, hz: 118, vpL: -360, vpR: 430, depth: 0.35, seed: 3, sag: 1, chimney: true, windows: [0.28, 0.66], door: 0.46 });
  return [
    ...far.layers,
    ridge(6, 356, 122, 8, 4, 240, 0.85, 0.3, { wl: 80, line: 0.6 }),
    ridge(6, 356, 146, 6, 5, 240, 0.65, 0.35, { wl: 70, line: 0.7 }),
    groundLayer(6, 356, (x) => 170 + 3 * Math.sin(x * 0.02), 240, { far: 0.05, near: 0.4, depth: 0.45, seed: 3, marks: [tufts(10, 350, 176, 232, 30, 6, 6, 0.4)] }),
    ...oakTree({ x: 82, base: 178, h: 78, w: 60, seed: 12, depth: 0.5, lobes: 1, tone: 0.85, under: 0.55, lit: 0.34 }),
    ...cot,
    { d: poly([[120, 178], [176, 185], [216, 183], [216, 189], [176, 191], [120, 184]]), tone: 0.8, depth: 0.3, run: 0.6, angle: 0 },
    castShadow(212, 190, 50, 5, 9, 0.7, 0.3),
    ...poplar(246, 188, 150, 30, 33, 0.25, 0.94, 3),
    ...poplar(282, 196, 126, 26, 34, 0.2, 0.94, -3),
    { d: tube([[153, 181], [149, 194], [162, 208], [188, 220], [214, 234], [228, 246]], 6, 36), tone: 0, knockout: true, depth: 0.25, line: 0.65, side: "all", marks: [dashes(140, 230, 196, 238, 12, 3, 5, { depth: 0.25 }), stip(190, 222, 30, 10, 12, 4, 0.8, 0.2)] },
    ...hedge(84, 178, 200, 20, 15, 0.2, 0.95),
    groundLayer(6, 356, (x) => 226 + 3 * Math.sin(x * 0.03), 240, { far: 0.3, near: 0.85, depth: 0.08, seed: 6, run: 1.2, marks: [tufts(10, 350, 228, 238, 30, 9, 8, 0.05)] }),
  ];
}

/* 4 — Lavender Rows: rows of plants converging toward a far farmhouse and a line of trees */
function sceneLavender(): Layer[] {
  const vx = 214;
  const hz = 122;
  const far = treeLine(6, 356, 128, 20, 41, 0.95, 0.6);
  /** One planted row: a long band running to the vanishing point, its edges scalloped in plants that grow toward the viewer. */
  const row = (bx: number, wBottom: number, seed: number): Layer => {
    const r = mulberry32(seed * 7 + 1);
    const L: Pt[] = [];
    const R: Pt[] = [];
    let spikes = "";
    let t = 0.045;
    let k = 0;
    while (t < 1.12) {
      const x = vx + (bx - vx) * t;
      const y = hz + (240 - hz) * t;
      const hw = (wBottom / 2) * t;
      const bump = k % 2 ? 1.34 : 0.92;
      L.push([x - hw * bump * (0.94 + 0.12 * r()), y]);
      R.push([x + hw * bump * (0.94 + 0.12 * r()), y]);
      for (let s = 0; s < 3; s++) {
        const sx = x + (r() - 0.5) * hw * 1.6;
        const sh = (5 + 8 * r()) * t + 1;
        spikes += `M${P(sx, y - hw * 0.2)}L${P(sx + (r() - 0.5) * 1.5 * t, y - hw * 0.2 - sh)}`;
      }
      t *= 1.15;
      k += 1;
    }
    return {
      d: smooth([...L, ...R.reverse()]),
      tone: 0.9,
      depth: 0.55,
      knockout: true,
      line: 0.75,
      side: "all",
      angle: ((-Math.atan((bx - vx) / (240 - hz)) * 180) / Math.PI) * 0.3,
      toneAt: (px, py) => {
        const tt = clamp01((py - hz) / (240 - hz));
        const wv = 0.5 + 0.5 * Math.sin(py * 0.75 + seed);
        return clamp01(0.3 + 0.5 * wv + 0.2 * smoothstep(0.1, 0.9, tt));
      },
      marks: [{ d: spikes, w: 0.8, a: 0.85, depth: 0.5 }],
    };
  };
  const rows = [-20, 42, 104, 166, 228, 290, 352, 414].map((x, i) => row(vx + (x - vx) * 1, 30, 50 + i));
  const farm = house(206, 128, { w: 20, d: 12, h: 9, rise: 7, hz, vpL: -500, vpR: 520, depth: 0.85, seed: 4, sag: 0.4, chimney: true, windows: [0.3, 0.7], door: 0.5 });
  return [
    ...far.layers,
    ridge(6, 356, 126, 6, 42, 240, 0.9, 0.2, { wl: 90, line: 0.6 }),
    ...farm,
    ...poplar(238, 130, 46, 8, 43, 0.85, 0.85),
    ...poplar(246, 130, 38, 7, 44, 0.85, 0.85),
    groundLayer(6, 356, () => 130, 240, { far: 0.02, near: 0.16, depth: 0.5, seed: 4, marks: [dashes(60, 340, 150, 236, 40, 4, 4, { depth: 0.3 })] }),
    ...rows,
    { d: "", tone: 0, depth: 0.1, marks: [tufts(10, 350, 230, 238, 20, 8, 3, 0.05)] },
  ];
}

/* 5 — Still Lake: a far shore of trees with a boathouse, reflections, ripples */
function sceneLake(): Layer[] {
  const wl = 126;
  const shore = treeLine(6, 356, wl, 32, 51, 0.8, 0.85);
  const hills = ridge(6, 356, 104, 10, 52, wl + 4, 0.95, 0.2, { wl: 100, line: 0.5 });
  const boat = house(160, wl + 2, { w: 38, d: 20, h: 15, rise: 13, hz: 100, vpL: -600, vpR: 620, depth: 0.55, seed: 5, sag: 0.6, windows: [0.5], door: 0.22 });
  const wall = poly([[122, wl + 2], [160, wl + 2], [160, wl - 15], [122, wl - 15]]);
  return [
    hills,
    ...shore.layers,
    ...boat,
    lakeLayer(6, 356, wl + 2, 240, { seed: 5, depth: 0.45, shore: "top", tone: 0.55, clear: 44 }),
    ...reflect(shore.shapes, wl, 0.4, 0.75, 30),
    ...reflect([wall], wl + 2, 0.55, 0.6, 22),
    ...glints(20, 340, wl + 8, 200, 14, 5),
    { d: "", tone: 0, depth: 0.5, marks: [dashes(20, 340, wl + 30, 240, 70, 9, 5, { depth: 0.5, a: 0.65 })] },
    { d: "", tone: 0, depth: 0.2, marks: [{ d: wavy(200, 300, 205, 1, 20, 0) + wavy(214, 290, 212, 0.8, 18, 1) + wavy(226, 276, 219, 0.6, 14, 2), w: 0.9, a: 0.8 }] },
    groundLayer(6, 200, (x) => 214 + 12 * Math.sin(x * 0.03 + 1) - (200 - x) * 0.02, 240, { far: 0.3, near: 0.9, depth: 0.08, seed: 6, run: 1.3, marks: [tufts(6, 200, 218, 238, 30, 9, 5, 0.05)] }),
    ...reeds(70, 232, 26, 22, 66, 70, 3, 0.05, 0.25),
    ...reeds(292, 240, 18, 18, 50, 46, 4, 0.05, 0.2),
    rockLayer(262, 226, 16, 8, 3, 0.12),
  ];
}

/* 6 — Pine Ridge: layered ridges, the far ones very faint, with a stand of pines in front */
function sceneRidge(): Layer[] {
  const tiny = (x0: number, x1: number, base: number, n: number, h: number, seed: number, depth: number): Layer[] => {
    const r = mulberry32(seed * 3 + 1);
    return Array.from({ length: n }, (_, i) => pineLayers(x0 + ((x1 - x0) * (i + r() * 0.6)) / n, base + (r() - 0.5) * 6, h * (0.7 + r() * 0.6), h * 0.36, seed + i, { depth, tone: 0.7, line: 0.6 })).flat();
  };
  const pines = [
    pineLayers(218, 202, 132, 50, 61, { depth: 0.12, tone: 0.92 }),
    pineLayers(266, 210, 106, 42, 62, { depth: 0.18, tone: 0.92 }),
    pineLayers(302, 204, 138, 52, 63, { depth: 0.1, tone: 0.95 }),
    pineLayers(190, 198, 82, 34, 64, { depth: 0.3, tone: 0.9 }),
  ];
  return [
    ridge(6, 356, 92, 20, 61, 240, 0.97, 0.16, { wl: 120, line: 0.55, tilt: 16 }),
    ridge(6, 356, 116, 18, 62, 240, 0.85, 0.24, { wl: 100, line: 0.65, tilt: -12 }),
    ...tiny(30, 340, 122, 16, 20, 5, 0.8),
    ridge(6, 356, 146, 16, 63, 240, 0.65, 0.32, { wl: 90, line: 0.75, tilt: 10 }),
    ...tiny(20, 300, 152, 12, 26, 6, 0.6),
    groundLayer(6, 356, (x) => 174 + 10 * Math.sin(x * 0.02 + 1) - (x - 6) * 0.02, 240, { far: 0.12, near: 0.55, depth: 0.35, seed: 6, marks: [tufts(10, 350, 178, 234, 30, 7, 6, 0.3)] }),
    castShadow(198, 208, 90, 6, 7, 0.8, 0.2),
    ...pines[3],
    ...pines[0],
    ...pines[1],
    ...pines[2],
    rockLayer(94, 218, 22, 10, 4, 0.12),
    rockLayer(128, 224, 12, 6, 5, 0.1),
    groundLayer(6, 356, (x) => 218 + 5 * Math.sin(x * 0.03), 240, { far: 0.3, near: 0.85, depth: 0.06, seed: 7, run: 1.2, marks: [tufts(10, 350, 222, 238, 34, 9, 7, 0.05)] }),
  ];
}

/* 7 — Sunflowers: heads in the near foreground, turned this way and that, a pale field and hills behind */
function sceneSunflowers(): Layer[] {
  const r = mulberry32(77);
  let dots = "";
  for (let j = 0; j < 9; j++) {
    const y = 150 + j * j * 0.9 + j * 4;
    const step = 4 + j * 1.1;
    for (let x = 6 + r() * step; x < 356; x += step * (0.85 + 0.3 * r())) dots += `M${P(x, y + (r() - 0.5) * 1.4)}`;
  }
  const far = treeLine(6, 356, 134, 18, 71, 0.95, 0.6);
  return [
    ridge(6, 356, 112, 12, 71, 240, 0.97, 0.16, { wl: 120, line: 0.5, tilt: 8 }),
    ...far.layers,
    ridge(6, 356, 138, 8, 72, 240, 0.85, 0.2, { wl: 90, line: 0.6, tilt: -6 }),
    groundLayer(6, 356, (x) => 144 + 4 * Math.sin(x * 0.02), 240, { far: 0.03, near: 0.24, depth: 0.5, seed: 7, marks: [{ d: dots, tex: true, a: 0.8, depth: 0.5 }] }),
    ...sunflower(216, 158, 14, 6, 0.85, 240, 74, 0.3, -3),
    ...sunflower(102, 120, 25, 26, 0.5, 250, 75, 0.1, -14),
    ...sunflower(258, 108, 24, -28, 0.56, 250, 76, 0.1, 16),
    ...sunflower(170, 84, 33, -12, 0.74, 252, 77, 0.06, 10),
    groundLayer(6, 356, (x) => 224 + 4 * Math.sin(x * 0.03 + 2), 240, { far: 0.35, near: 0.85, depth: 0.06, seed: 8, run: 1.2, marks: [tufts(10, 350, 226, 238, 30, 9, 8, 0.05)] }),
  ];
}

/* 8 — River Bend: reeds up front, a river curving away toward the trees */
function sceneRiver(): Layer[] {
  const hz = 118;
  const cxAt = (y: number) => {
    const pts: Pt[] = [[122, 240], [176, 212], [214, 188], [226, 166], [212, 148], [206, 134], [208, hz]];
    for (let i = 1; i < pts.length; i++) if (y >= pts[i][1]) return lerp(pts[i][0], pts[i - 1][0], (y - pts[i][1]) / (pts[i - 1][1] - pts[i][1]));
    return pts[pts.length - 1][0];
  };
  const wAt = (y: number) => 6 + (y - hz) * 0.9;
  const ys = [hz + 2, 134, 148, 166, 188, 212, 240];
  const L: Pt[] = ys.map((y) => [cxAt(y) - wAt(y) / 2, y]);
  const R: Pt[] = ys.map((y) => [cxAt(y) + wAt(y) / 2, y]);
  const river = `${smooth(L, false)}L${P(R[R.length - 1][0], R[R.length - 1][1])}${smooth(R.slice().reverse(), false).replace(/^M[^C]*/, "")}Z`;
  const nz = noise2(9);
  const far = treeLine(6, 356, hz + 2, 22, 81, 0.92, 0.7);
  return [
    ridge(6, 356, 100, 10, 81, 240, 0.97, 0.16, { wl: 110, line: 0.5 }),
    ...far.layers,
    groundLayer(6, 356, () => hz + 3, 240, { far: 0.04, near: 0.42, depth: 0.5, seed: 8, marks: [tufts(10, 350, 126, 236, 40, 6, 8, 0.4)] }),
    ...oakTree({ x: 288, base: 164, h: 84, w: 66, seed: 82, depth: 0.5, tone: 0.8, lit: 0.26, lobes: 1 }),
    ...hedge(40, 128, 176, 18, 83, 0.45, 0.8),
    { d: river, tone: 0.36, depth: 0.4, knockout: true, angle: 90, run: 0.5, loose: true, line: 0,
      toneAt: (px, py) => {
        const u = Math.abs(px - cxAt(py)) / Math.max(2, wAt(py) / 2);
        return clamp01(0.12 + 0.7 * smoothstep(0.45, 1, u) + 0.25 * nz(px * 0.04, py * 0.5) - 0.08);
      },
      marks: [{ d: smooth(L, false), w: 0.85, a: 0.9, depth: 0.4 }, { d: smooth(R, false), w: 1.1, a: 0.9, depth: 0.4 }] },
    ...glints(130, 260, 160, 226, 7, 8),
    { d: "", tone: 0, depth: 0.4, marks: [dashes(140, 250, 190, 236, 24, 8, 8, { depth: 0.3, a: 0.6 })] },
    groundLayer(6, 356, (x) => 232 + 3 * Math.sin(x * 0.04), 240, { far: 0.5, near: 0.9, depth: 0.06, seed: 9, run: 1.3 }),
    ...reeds(56, 240, 34, 30, 92, 90, 8, 0.05, 0.25),
    ...reeds(316, 242, 24, 26, 78, 64, 9, 0.05, 0.2),
    ...reeds(268, 240, 12, 12, 40, 40, 10, 0.1, 0.1),
  ];
}

/* 9 — Birch Path: slender birches leaning together into an arch over a winding path */
function sceneBirches(): Layer[] {
  const path = smooth([[214, 122], [208, 130], [198, 146], [196, 164], [178, 186], [166, 212], [150, 240], [284, 240], [262, 216], [244, 190], [228, 166], [220, 146], [218, 128]]);
  const back = canopy(206, 106, 190, 66, 91, { r: 9, lobes: 0 });
  const roof = canopy(192, 6, 330, 50, 95, { r: 11, lobes: 0, env: (t) => 0.8 + 0.2 * Math.sin(t * 4) });
  const limb = (x0: number, y0: number, x1: number, y1: number, w: number, bend: number): Layer => ({ d: branch(x0, y0, x1, y1, w, w * 0.3, bend), tone: 0.3, depth: 0.25, knockout: true, line: 0.85, side: "all", ramp: { to: 0.85, dir: "right" }, marks: [{ d: stroke2([[lerp(x0, x1, 0.3), lerp(y0, y1, 0.3) - 0.5], [lerp(x0, x1, 0.32) + 1.5, lerp(y0, y1, 0.32) + 1]]), w: 1.2, a: 0.9 }] });
  return [
    ...canopyLayers(back, { depth: 0.8, tone: 0.7, lit: 0.3, under: 0.5, line: 0.8, seed: 9 }),
    ...treeLine(6, 356, 132, 26, 92, 0.6, 0.85).layers,
    groundLayer(6, 356, (x) => 128 + 2 * Math.sin(x * 0.03), 240, { far: 0.05, near: 0.3, depth: 0.4, seed: 9, marks: [tufts(10, 350, 138, 236, 44, 7, 9, 0.3)] }),
    { d: path, tone: 0, knockout: true, depth: 0.25, line: 0.7, side: "all", marks: [dashes(160, 270, 150, 238, 40, 3, 9, { depth: 0.25 }), stip(214, 222, 40, 12, 14, 3, 0.8, 0.2)] },
    ...birchLayers(150, 190, 40, 6.5, 10, 96, 0.4, { limbs: true }),
    ...birchLayers(236, 192, 42, 6.5, -10, 97, 0.4, { limbs: true }),
    ...birchLayers(118, 216, 22, 10, 20, 93, 0.25, { limbs: false }),
    ...birchLayers(266, 218, 22, 10, -22, 94, 0.25, { limbs: false }),
    ...birchLayers(72, 240, 30, 16, 30, 95, 0.05, { limbs: false }),
    ...birchLayers(308, 242, 30, 15, -32, 98, 0.05, { limbs: false }),
    // the arch: near limbs sweep in to meet over the path
    limb(94, 32, 176, -2, 7, -22),
    limb(284, 32, 206, -2, 7, 22),
    limb(138, 28, 190, 6, 4, -12),
    limb(252, 28, 200, 6, 4, 12),
    ...canopyLayers(roof, { depth: 0.4, tone: 0.6, lit: 0.22, under: 0.7, line: 0.85, seed: 13 }),
    groundLayer(6, 356, (x) => 232 + 3 * Math.sin(x * 0.05), 240, { far: 0.4, near: 0.9, depth: 0.06, seed: 10, run: 1.2, marks: [tufts(10, 350, 228, 238, 24, 8, 10, 0.05)] }),
  ];
}

/* 10 — Storm Coming In: a great cumulus with a hatched underside over flat fields and a tiny barn */
function sceneStorm(): Layer[] {
  const cloudEnv = (t: number) => (t < 0.6 ? 0.22 + 0.78 * Math.pow(Math.sin(((Math.PI / 2) * t) / 0.6), 0.75) : 1 - 0.06 * ((t - 0.6) / 0.4));
  const big = canopy(132, 64, 232, 92, 101, { r: 15, env: cloudEnv, lobes: 0 });
  const small = canopy(292, 50, 96, 44, 102, { r: 9, env: cloudEnv, lobes: 0 });
  const band = (y: number, amp: number, seed: number, bottom: number, depth: number, tone: number, angle: number, run: number): Layer => ridge(6, 356, y, amp, seed, bottom, depth, tone, { wl: 110, line: 0.55, angle, run });
  return [
    ...canopyLayers(small, { depth: 0.55, tone: 0.55, lit: 0, under: 1, local: 0.1, curve: 2, line: 0.85, seed: 10 }),
    ...canopyLayers(big, { depth: 0.25, tone: 0.92, lit: 0, under: 1.15, local: 0.12, curve: 2.4, line: 1.05, seed: 11 }),
    { d: poly([[30, 110], [120, 108], [128, 148], [14, 150]]), tone: 0.2, depth: 0.7, angle: 14, run: 1.4, toneAt: (_x, y) => clamp01(1 - (y - 108) / 42) },
    band(150, 2, 103, 240, 0.9, 0.22, 90, 1.8),
    band(164, 3, 104, 240, 0.75, 0.3, 84, 1.6),
    ...treeLine(180, 320, 152, 14, 105, 0.85, 0.85).layers,
    ...house(252, 164, { w: 18, d: 10, h: 8, rise: 6, hz: 146, vpL: -700, vpR: 700, depth: 0.6, seed: 10, sag: 0.3, windows: [0.5] }),
    band(184, 4, 106, 240, 0.55, 0.42, 78, 1.5),
    band(210, 4, 107, 240, 0.3, 0.6, 0, 1.3),
    { d: "", tone: 0, depth: 0.3, marks: [{ d: stroke2([[110, 240], [150, 212], [196, 190], [244, 172]]) + stroke2([[132, 240], [166, 214], [204, 194], [246, 174]]), w: 0.9, a: 0.85, depth: 0.3 }] },
    groundLayer(6, 356, (x) => 226 + 4 * Math.sin(x * 0.03), 240, { far: 0.4, near: 0.9, depth: 0.06, seed: 11, run: 1.3, marks: [tufts(10, 350, 228, 238, 30, 9, 11, 0.05)] }),
  ];
}

/** A canopy built from clumps placed by hand (an arch of roses). */
function canopyFrom(cl: readonly Clump[]): Canopy {
  const rings = cl.map((c) => flatten(c.d, 1.2)[0].p);
  const xs = cl.flatMap((c) => [c.cx - c.rx, c.cx + c.rx]);
  const ys = cl.flatMap((c) => [c.cy - c.ry, c.cy + c.ry]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, clumps: [...cl], rings, d: "" };
}

/* 11 — The Garden Gate: a stone wall, a wooden gate under an arch of climbing roses */
function sceneGate(): Layer[] {
  const r = mulberry32(111);
  const wallTop = 128;
  const wallBase = 192;
  let joints = "";
  for (let row = 0; row < 6; row++) {
    const y = wallTop + 8 + row * 10.5 + (r() - 0.5) * 2;
    let x = 6;
    while (x < 356) {
      const l = 10 + r() * 22;
      joints += `M${P(x, y)}Q${P(x + l / 2, y + (r() - 0.5) * 2.4)} ${P(x + l, y + (r() - 0.5) * 1.4)}`;
      x += l + 1 + r() * 3;
    }
  }
  let stones = "";
  for (let row = 0; row < 6; row++) {
    const y = wallTop + 8 + row * 10.5;
    for (let x = 6 + r() * 14; x < 356; x += 12 + r() * 14) stones += `M${P(x, y)}Q${P(x + (r() - 0.5) * 2, y + 5)} ${P(x + (r() - 0.5) * 1.6, y + 10)}`;
  }
  const wallD = poly([[6, wallTop], [148, wallTop - 1], [148, wallBase], [6, wallBase + 1]]);
  const wallR = poly([[214, wallTop - 1], [356, wallTop], [356, wallBase + 1], [214, wallBase]]);
  const nz = noise2(11);
  const wallTone = (px: number, py: number) => clamp01(0.1 + 0.5 * smoothstep(wallBase - 18, wallBase, py) + 0.35 * smoothstep(wallTop + 12, wallTop, py) + 0.2 * nz(px * 0.09, py * 0.09) + (px < 150 ? 0.2 * smoothstep(96, 148, px) : 0.2 * smoothstep(250, 214, px)) - 0.06);
  // the arch: clumps along a curve over the gate
  const arch: Pt[] = [[126, 152], [124, 128], [130, 106], [146, 88], [168, 78], [192, 80], [212, 92], [226, 110], [232, 132], [230, 152]];
  const rr = mulberry32(112);
  const cl: Clump[] = arch.flatMap((p, i) =>
    Array.from({ length: 2 }, (_, j): Clump => {
      const rx = 8 + rr() * 4;
      const cx = p[0] + (rr() - 0.5) * 8;
      const cy = p[1] + (rr() - 0.5) * 8;
      return { cx, cy, rx, ry: rx * 0.86, z: (i * 2 + j) / (arch.length * 2), d: scallop(cx, cy, rx, rx * 0.86, 120 + i * 3 + j, 9, 0.62, 0.1) };
    }),
  );
  const roses: Layer[] = [];
  for (let i = 0; i < 16; i++) {
    const p = arch[Math.floor(rr() * arch.length)];
    const x = p[0] + (rr() - 0.5) * 16;
    const y = p[1] + (rr() - 0.5) * 14;
    const s = 2.3 + rr() * 1.3;
    roses.push({ d: circ(x, y, s), tone: 0.1, depth: 0.15, knockout: true, line: 0.75, side: "all", marks: [{ d: stroke2([[x - s * 0.5, y + s * 0.1], [x, y - s * 0.4], [x + s * 0.5, y + s * 0.2], [x + s * 0.1, y + s * 0.5]]), w: 0.75, a: 0.9, depth: 0.15 }] });
  }
  const post = (x: number): Layer => ({ d: poly([[x - 6, wallBase + 1], [x - 5.5, wallTop - 20], [x + 6, wallTop - 20.5], [x + 6.5, wallBase + 1]]), tone: 0.45, depth: 0.25, knockout: true, line: 1, crisp: true, ramp: { to: 0.85, dir: "right" } });
  const planks: Layer[] = Array.from({ length: 6 }, (_, i): Layer => {
    const x0 = 152 + i * 10.4;
    return { d: poly([[x0, wallBase], [x0 + 9.6, wallBase], [x0 + 9.6, 124 + Math.abs(i - 2.5) * 1.6], [x0, 124 + Math.abs(i - 2.5) * 1.6 + 0.6]]), tone: 0.3, depth: 0.25, knockout: true, line: 0.85, crisp: true, ramp: { to: 0.5, dir: i % 2 ? "right" : "left" } };
  });
  const brace = poly([[152, wallBase - 6], [156, wallBase - 12], [212, 138], [208, 144]]);
  return [
    ...oakTree({ x: 296, base: 130, h: 96, w: 88, seed: 113, depth: 0.5, tone: 0.8, lit: 0.26, lobes: 1 }),
    { d: wallD, tone: 0.55, depth: 0.35, knockout: true, line: 0.9, crisp: true, toneAt: wallTone, marks: [{ d: joints, w: 0.7, a: 0.7, depth: 0.35 }, { d: stones, w: 0.65, a: 0.6, depth: 0.35 }] },
    { d: wallR, tone: 0.55, depth: 0.35, knockout: true, line: 0.9, crisp: true, toneAt: wallTone, marks: [{ d: joints, w: 0.7, a: 0.7, depth: 0.35 }, { d: stones, w: 0.65, a: 0.6, depth: 0.35 }] },
    post(144),
    post(220),
    ...planks,
    { d: brace, tone: 0.55, depth: 0.25, knockout: true, line: 0.85, crisp: true },
    { d: "", tone: 0, depth: 0.25, marks: [{ d: line(152, 140, 212, 138) + line(152, 176, 212, 177), w: 1.1, a: 0.9, depth: 0.25 }] },
    ...canopyLayers(canopyFrom(cl), { depth: 0.15, tone: 0.85, lit: 0.3, under: 0.25, local: 0.9, line: 0.95, seed: 12 }),
    ...roses,
    ...hedge(16, 122, 196, 28, 114, 0.25, 0.85),
    ...hedge(236, 340, 198, 26, 115, 0.25, 0.85),
    groundLayer(6, 356, (x) => 200 + 2 * Math.sin(x * 0.05), 240, { far: 0.2, near: 0.75, depth: 0.15, seed: 11, run: 1.2, marks: [tufts(10, 350, 204, 238, 40, 9, 11, 0.1)] }),
    ...[[176, 206, 24, 5], [186, 216, 28, 6], [170, 227, 34, 7], [190, 237, 40, 8]].map(([x, y, rx, ry], i): Layer => ({ d: oval(x, y, rx, ry, (i % 2) * 3 - 1.5), tone: 0.2, depth: 0.12, knockout: true, line: 0.85, side: "all", ramp: { to: 0.5, dir: "right" } })),
  ];
}

/* 12 — Cliffs and Sea: craggy rock faces hatched in planes, the sea in horizontal strokes, gulls */
function sceneCliffs(): Layer[] {
  const hz = 112;
  const nz = noise2(12);
  const r = mulberry32(120);
  const gull = (x: number, y: number, s: number) => `M${P(x, y)}Q${P(x + 4 * s, y - 4 * s)} ${P(x + 8 * s, y - 0.5 * s)}Q${P(x + 12 * s, y - 4.6 * s)} ${P(x + 16 * s, y + 0.5 * s)}`;
  let strata = "";
  for (let i = 0; i < 9; i++) {
    const y = 108 + i * 10 + (r() - 0.5) * 4;
    let x = 8 + r() * 10;
    while (x < 150) {
      const l = 10 + r() * 22;
      strata += `M${P(x, y + x * 0.06)}Q${P(x + l / 2, y + x * 0.06 + (r() - 0.5) * 3)} ${P(x + l, y + (x + l) * 0.06 + (r() - 0.5) * 1.6)}`;
      x += l + 3 + r() * 9;
    }
  }
  const facetTone = (x0: number, x1: number, lo: number, hi: number) => (px: number, py: number) => clamp01(lo + (hi - lo) * smoothstep(x0, x1, px) + 0.4 * nz(px * 0.07, py * 0.06) + 0.12 * Math.sin(py * 0.6 + nz(px * 0.05, 2) * 3) - 0.14);
  return [
    ridge(220, 356, hz - 2, 5, 121, hz + 4, 0.95, 0.3, { wl: 80, line: 0.6 }),
    { d: box(6, hz, 350, 128), tone: 0.55, depth: 0.5, angle: 90, run: 0.5, loose: true, toneAt: (px, py) => clamp01(0.16 + 0.45 * Math.pow(1 - clamp01((py - hz) / 128), 1.6) + 0.3 * smoothstep(0.1, 0.9, clamp01((py - 190) / 50)) + 0.28 * nz(px * 0.04, py * 0.5) - 0.14) },
    { d: "", tone: 0, depth: 0.5, marks: [{ d: line(6, hz, 356, hz), w: 0.9, a: 0.9, depth: 0.9 }, dashes(6, 356, hz + 4, 150, 34, 10, 12, { depth: 0.8, a: 0.65 }), dashes(6, 356, 150, 190, 28, 14, 13, { depth: 0.55, a: 0.7 }), dashes(6, 356, 190, 240, 22, 18, 14, { depth: 0.3, a: 0.75 })] },
    ...glints(180, 340, 130, 200, 8, 12),
    // the headland: a pale shoulder on top, then planes of rock turning into shadow
    { d: crag([[6, 134], [30, 100], [62, 62], [96, 36], [124, 38], [142, 60], [112, 86], [70, 100], [34, 120]], 1, 2.6), tone: 0.32, depth: 0.18, knockout: true, line: 1, side: "all", angle: 22, run: 0.8, toneAt: facetTone(0, 140, 0.3, 0.75) },
    { d: crag([[6, 134], [34, 120], [70, 100], [80, 150], [66, 196], [6, 206]], 2, 2), tone: 0.6, depth: 0.15, knockout: true, line: 1, side: "all", toneAt: facetTone(0, 80, 0.3, 0.7), marks: [{ d: strata, w: 0.55, a: 0.7, depth: 0.15 }] },
    { d: crag([[70, 100], [112, 86], [142, 60], [160, 96], [148, 130], [166, 154], [148, 182], [64, 196], [80, 150]], 3, 2.4), tone: 0.9, depth: 0.12, knockout: true, line: 1.1, side: "all", angle: -4, toneAt: facetTone(70, 160, 0.4, 0.95) },
    { d: crag([[96, 110], [110, 108], [104, 150], [110, 186], [92, 190], [96, 150]], 4, 1.4, 6), tone: 0.95, depth: 0.1, knockout: true, line: 0.6, side: "all" },
    ...hedge(72, 134, 46, 12, 123, 0.2, 0.75),
    { d: "", tone: 0, depth: 0.15, marks: [tufts(30, 132, 40, 100, 10, 6, 12, 0.15)] },
    // foam at the foot of the cliff
    ...[[152, 184, 12], [136, 194, 9], [168, 178, 7], [120, 200, 8]].map(([x, y, s], i): Layer => ({ d: scallop(x, y, s * 1.6, s * 0.5, 130 + i, 7, 0.6, 0.1), tone: 0, depth: 0.2, knockout: true, line: 0.7, side: "top" })),
    { d: "", tone: 0, depth: 0.2, marks: [{ d: gull(190, 62, 1) + gull(218, 50, 0.85) + gull(236, 78, 0.7) + gull(168, 86, 0.6), w: 1, a: 0.9, depth: 0.3 }] },
    { d: crag([[250, 232], [262, 210], [296, 202], [322, 214], [332, 232], [320, 240], [262, 240]], 5, 2), tone: 0.95, depth: 0.08, knockout: true, line: 1.1, side: "all", toneAt: facetTone(240, 340, 0.3, 0.95) },
    { d: crag([[204, 240], [214, 228], [240, 226], [252, 240]], 6, 1.6), tone: 0.9, depth: 0.1, knockout: true, line: 1, side: "all", toneAt: facetTone(200, 260, 0.3, 0.9) },
  ];
}

/* 13 — Orchard After Rain: rows of small fruit trees, puddles of bare paper with ripples and reflections */
function sceneOrchard(): Layer[] {
  const vx = 206;
  const hz = 106;
  const rr = mulberry32(131);
  const ys = [111, 117, 126, 139, 159, 186, 220];
  const placed: { x: number; y: number; seed: number; side: number }[] = [];
  ys.forEach((y, i) => {
    const t = (y - hz) / 100;
    placed.push({ x: vx - (16 + t * 74) + (rr() - 0.5) * 3, y: y + (rr() - 0.5) * 2, seed: 140 + i, side: -1 });
    placed.push({ x: vx + (18 + t * 66) + (rr() - 0.5) * 3, y: y + 3 + (rr() - 0.5) * 2, seed: 150 + i, side: 1 });
  });
  placed.sort((a, b) => a.y - b.y);
  const puddle = (cx: number, cy: number, rx: number, ry: number, seed: number): Layer => {
    const nz = noise2(seed);
    return {
      d: smooth(Array.from({ length: 10 }, (_, i): Pt => {
        const a = (i / 10) * Math.PI * 2;
        return [cx + Math.cos(a) * rx * (0.88 + 0.16 * nz(i, seed)), cy + Math.sin(a) * ry * (0.9 + 0.14 * nz(seed, i))];
      })),
      tone: 0.75,
      depth: 0.25,
      knockout: true,
      line: 0.8,
      side: "all",
      run: 0.5,
      toneAt: (px, py) => clamp01(smoothstep(cy + ry * 0.2, cy - ry * 0.9, py) * (0.5 + 0.5 * nz(px * 0.3, py * 0.3)) * (Math.abs(px - cx) < rx * 0.75 ? 1 : 0.35)),
      marks: [dashes(cx - rx * 0.7, cx + rx * 0.5, cy - ry * 0.1, cy + ry * 0.7, 7, rx * 0.35, seed + 1, { depth: 0.2, a: 0.75 })],
    };
  };
  const trees = placed.flatMap((p) => {
    const s = (p.y - hz) / 100;
    const th = 66 * s + 12;
    const tw = 50 * s + 8;
    return [
      castShadow(p.x - 5, p.y + 1.5, 20 * s + 5, 3.4 * s + 1, p.seed, 0.7, 0.3),
      ...oakTree({ x: p.x, base: p.y, h: th, w: tw, seed: p.seed, depth: clamp01(0.75 - s * 0.68), tone: 0.85, lit: 0.26, under: 0.65, lobes: 1, canopyFrac: 0.6, bend: p.side * -2 * s }),
      { d: "", tone: 0, depth: 0.2, marks: [stip(p.x, p.y - th * 0.62, tw * 0.3, th * 0.14, Math.round(4 + 8 * s), p.seed, 0.95, 0.15)] },
    ];
  });
  return [
    ridge(6, 356, 96, 8, 132, 240, 0.95, 0.16, { wl: 100, line: 0.5 }),
    ...treeLine(6, 356, hz + 4, 18, 141, 0.95, 0.65).layers,
    groundLayer(6, 356, () => hz + 4, 240, { far: 0.05, near: 0.5, depth: 0.5, seed: 13, marks: [tufts(10, 350, 114, 236, 50, 6, 13, 0.4)] }),
    puddle(vx, 140, 9, 2.6, 13),
    puddle(vx + 2, 172, 22, 5.6, 14),
    puddle(vx - 6, 216, 46, 10, 15),
    ...trees,
    groundLayer(6, 356, (x) => 233 + 2 * Math.sin(x * 0.05), 240, { far: 0.5, near: 0.9, depth: 0.06, seed: 14, run: 1.3, marks: [tufts(10, 350, 235, 238, 20, 8, 14, 0.05)] }),
  ];
}

/* 14 — Moonrise: rolling hills and a bare-paper moon in a lightly hatched evening sky */
function sceneMoon(): Layer[] {
  const mx = 236;
  const my = 62;
  const R = 25;
  const nz = noise2(14);
  const tiny = pineRow(6, 340, 146, 22, 14, 141, 0.7);
  const tiny2 = pineRow(30, 330, 172, 14, 24, 145, 0.4);
  return [
    { d: box(0, 0, 360, 160), tone: 0.5, depth: 0.5, angle: 86, run: 2.4, loose: true, toneAt: (px, py) => {
        const dm = Math.hypot(px - mx, py - my);
        return clamp01(0.06 + 0.94 * Math.pow(smoothstep(14, 150, py), 1.15) + 0.14 * nz(px * 0.03, py * 0.1) - 0.6 * (1 - smoothstep(R + 2, 90, dm)));
      } },
    mist(0, 230, 112, 8, 141, 0.5),
    mist(150, 356, 132, 7, 142, 0.5),
    { d: circ(mx, my, R), tone: 0.45, depth: 0.2, knockout: true, line: 0.75, side: "all", angle: 20, toneAt: (px, py) => {
        const u = ((px - mx) * -LIGHT[0] + (py - my) * -LIGHT[1]) / R;
        return clamp01(smoothstep(0.4, 1, u) * 0.95 + 0.2 * smoothstep(0.25, 0.75, nz(px * 0.16, py * 0.16)) * (1 - smoothstep(0.3, 0.8, u)));
      } },
    { d: "", tone: 0, depth: 0.5, marks: [stip(120, 40, 60, 24, 6, 3, 0.7, 0.4), stip(300, 30, 30, 20, 3, 4, 0.7, 0.4)] },
    ridge(6, 356, 150, 26, 141, 240, 0.85, 0.62, { wl: 130, line: 0.95, tilt: -14, angle: -8 }),
    ...tiny,
    ridge(6, 356, 178, 26, 142, 240, 0.55, 0.8, { wl: 110, line: 1, tilt: 14, angle: 8 }),
    ...tiny2,
    ridge(6, 356, 208, 18, 143, 240, 0.12, 0.85, { wl: 100, line: 1.05, tilt: -8, run: 1.2 }),
    ...oakTree({ x: 92, base: 212, h: 74, w: 58, seed: 144, depth: 0.1, tone: 0.98, lit: 0.6, under: 0.5, lobes: 1 }),
    { d: "", tone: 0, depth: 0.1, marks: [tufts(10, 350, 216, 238, 26, 9, 14, 0.08)] },
  ];
}

/** A row of little pines along a ridge. */
function pineRow(x0: number, x1: number, base: number, n: number, h: number, seed: number, depth: number): Layer[] {
  const r = mulberry32(seed * 3 + 1);
  return Array.from({ length: n }, (_, i) => pineLayers(x0 + ((x1 - x0) * (i + r() * 0.7)) / n, base + (r() - 0.5) * 8, h * (0.7 + r() * 0.7), h * 0.36, seed + i, { depth, tone: 0.9, line: 0.7 })).flat();
}

/* ───────────────── the small circles: each day's scene boiled down to one or two shapes, on a 40 × 40 disc ───────────────── */

/** A tiny tree: a scalloped crown on a short curved trunk. */
function miniTree(x: number, base: number, h: number, w: number, seed: number, tone = 0.85): Layer[] {
  const c = canopy(x, base - h * 0.62, w, h * 0.7, seed, { r: Math.max(3.4, w * 0.2), lobes: 0 });
  return [
    ...canopyLayers(c, { depth: 0.1, tone, lit: 0.32, under: 0.7, line: 0.8, seed }, 0, 0.5),
    ...trunkLayers(x, base, base - h * 0.42, Math.max(2.6, w * 0.16), Math.max(1.8, w * 0.1), 1.2, seed, { depth: 0.1, roots: 0.6 }),
    ...canopyLayers(c, { depth: 0.1, tone, lit: 0.32, under: 0.7, line: 0.8, seed }, 0.5, 1),
  ];
}

/** Whether each small disc also gets a loose pen ring. */
const CELL_RING = true;

const MOTIF_BUILDERS: readonly ((inv: boolean) => Layer[])[] = [
  // 1 a lone oak and a band of mist
  () => [...miniTree(23, 32, 27, 22, 1), { d: mist(6, 30, 27, 3, 3, 0.3).d, tone: 0, knockout: true, depth: 0.3 }, { d: "", tone: 0, marks: [{ d: stroke2([[8, 32], [18, 31.4], [30, 32.4]]), w: 0.9, a: 0.85 }] }],
  // 2 the old oak
  () => miniTree(20, 35, 28, 27, 2),
  // 3 a cottage roof beside a poplar
  () => [
    { d: poly([[7, 26], [7, 33], [22, 33], [22, 26]]), tone: 0.12, knockout: true, line: 0.9, crisp: true, depth: 0.1 },
    { d: poly([[4.5, 27], [14.5, 17], [25, 27]]), tone: 0.85, knockout: true, line: 0.95, crisp: true, angle: -8, depth: 0.1 },
    { d: poly([[11, 33], [11, 28.5], [14, 28.5], [14, 33]]), tone: 0.9, knockout: true, line: 0.7, crisp: true, depth: 0.1 },
    ...poplar(31, 34, 25, 6.5, 3, 0.1, 0.9),
  ],
  // 4 rows in perspective
  () => [
    ...[-27, -18, -9, 0, 9, 18, 27].map((b): Layer => ({ d: poly([[20 + b * 0.07, 13], [20 + b * 0.07 + 0.9, 13], [20 + b * 1.05 + 2.6, 34], [20 + b * 1.05 - 2.6, 34]]), tone: 0.85, knockout: true, line: 0.7, depth: 0.1, angle: b * 0.25 })),
    { d: "", tone: 0, marks: [{ d: line(4, 13, 36, 13), w: 0.7, a: 0.7 }] },
  ],
  // 5 ripples and a boathouse roof
  () => [
    { d: poly([[11, 14], [18, 9], [26, 14]]), tone: 0.8, knockout: true, line: 0.9, crisp: true, depth: 0.1 },
    { d: "", tone: 0, marks: [{ d: wavy(6, 34, 20, 0.7, 12, 0) + wavy(9, 31, 24.5, 0.8, 11, 1) + wavy(5, 28, 29, 0.8, 12, 2) + wavy(12, 34, 33.5, 0.8, 11, 3), w: 1.1, a: 0.9 }] },
  ],
  // 6 a pine
  () => pineLayers(20, 34, 30, 17, 6, { depth: 0.1, tone: 0.9, line: 0.8 }),
  // 7 a sunflower head
  () => sunflower(20, 17, 11, -10, 0.86, 36, 7, 0.1, 2, 0),
  // 8 reeds
  () => reeds(20, 35, 9, 14, 29, 15, 8, 0.1, 0.4, 1.1),
  // 9 two birches leaning together
  () => [...birchLayers(12, 36, 5, 2.6, 3, 9, 0.1), ...birchLayers(20, 36, 3, 3.2, -1, 10, 0.1), ...birchLayers(28, 36, 6, 2.6, -3, 12, 0.1)],
  // 10 a storm cloud
  () => [
    {
      d: scallop(20, 17, 15.5, 9.5, 11, 10, 0.72, 0.4),
      tone: 0.95,
      depth: 0.1,
      knockout: true,
      line: 0.95,
      side: "all",
      toneAt: (_x, py) => clamp01(smoothstep(15, 25, py) * 0.95 + 0.06),
    },
    { d: "", tone: 0, marks: [{ d: line(13, 30, 11.5, 35) + line(20, 30, 18.5, 36) + line(27, 30, 25.5, 35), w: 0.8, a: 0.8 }] },
  ],
  // 11 the arch of roses over a gate
  () => {
    const arch: Pt[] = [[9, 32], [8, 24], [11, 16], [20, 11], [29, 16], [32, 24], [31, 32]];
    const rr = mulberry32(11);
    const cl: Clump[] = arch.map((p, i) => {
      const rx = 4 + rr() * 1.4;
      return { cx: p[0], cy: p[1], rx, ry: rx * 0.9, z: i / arch.length, d: scallop(p[0], p[1], rx, rx * 0.9, 200 + i, 8, 0.62, 0.1) };
    });
    return [{ d: box(13, 22, 14, 12), tone: 0.25, depth: 0.1, knockout: true, line: 0.7, crisp: true }, ...canopyLayers(canopyFrom(cl), { depth: 0.1, tone: 0.9, lit: 0.3, under: 0.3, local: 0.9, line: 0.8, seed: 11 })];
  },
  // 12 a headland over the sea
  () => [
    { d: crag([[5, 14], [14, 9], [26, 12], [30, 19], [26, 28], [10, 33], [5, 33]], 12, 1.4, 5), tone: 0.85, knockout: true, line: 0.95, depth: 0.1, toneAt: (px, py) => clamp01(0.25 + 0.6 * smoothstep(8, 28, px) + 0.15 * smoothstep(14, 30, py)) },
    { d: "", tone: 0, marks: [{ d: wavy(14, 36, 31, 0.5, 9, 0) + wavy(20, 36, 35, 0.5, 9, 1.4), w: 1, a: 0.9 }, { d: line(28, 22, 36, 22), w: 0.7, a: 0.8 }] },
  ],
  // 13 two orchard trees and a puddle
  () => [
    ...miniTree(13, 27, 19, 13, 13),
    ...miniTree(27, 25, 15, 11, 14),
    { d: oval(20, 33.5, 9, 2.2), tone: 0, knockout: true, line: 0.85, side: "all", depth: 0.1, marks: [{ d: line(15, 33.4, 21, 33.4), w: 0.7, a: 0.8 }] },
  ],
  // 14 the moon: a crescent, or — on today's dark disc — a bare full moon
  (inv) => (inv ? [{ d: circ(20, 20, 9.5), tone: 0, knockout: true, depth: 0.1 }] : [{ d: circ(20, 20, 10.5), tone: 0.85, knockout: true, line: 0.9, depth: 0.1 }, { d: circ(24.5, 17, 8.6), tone: 0, knockout: true, line: 0.85, side: "all", depth: 0.1 }]),
];

/** The little disc for a day: an optional loose pen ring, the motif drawn in it. Today's is the negative: a dark disc with the motif left bare. */
function cellLayers(i: number, inverted: boolean): Layer[] {
  const motif = MOTIF_BUILDERS[i](inverted);
  if (!inverted) return [...(CELL_RING ? [{ d: circ(20, 20, 19.3), tone: 0, line: 0.55, depth: 0.4 } as Layer] : []), ...motif];
  const paper = i === 13 ? motif : motif.map((l): Layer => ({ ...l, tone: 0, knockout: true, ramp: undefined, toneAt: undefined, marks: undefined, line: Math.min(l.line ?? 0, 0.6) }));
  return [{ d: circ(20, 20, 19.3), tone: 0.98, depth: 0.05 }, ...paper];
}

type Scene = {
  kind: MomentKind;
  title: string;
  sentence: string;
  layers: () => Layer[];
};

const SCENES: readonly Scene[] = [
  { kind: "meadow", title: "Morning Fog", sentence: "Everything beyond the oak was still deciding whether to exist.", layers: sceneFog },
  { kind: "woodland", title: "The Old Oak", sentence: "It has held the whole meadow's shade for two hundred summers.", layers: sceneOak },
  { kind: "garden", title: "Cottage and Poplars", sentence: "The poplars whisper all afternoon; the cottage pretends not to listen.", layers: sceneCottage },
  { kind: "meadow", title: "Lavender Rows", sentence: "Every row leans toward the farmhouse, and the bees follow the rows.", layers: sceneLavender },
  { kind: "water", title: "Still Lake", sentence: "The lake held its breath, and the boathouse held its reflection.", layers: sceneLake },
  { kind: "hills", title: "Pine Ridge", sentence: "Ridge behind ridge, each one a shade quieter than the last.", layers: sceneRidge },
  { kind: "meadow", title: "Sunflowers", sentence: "By noon every head had turned to follow the same slow light.", layers: sceneSunflowers },
  { kind: "water", title: "River Bend", sentence: "The river slowed at the bend to look at the reeds.", layers: sceneRiver },
  { kind: "woodland", title: "Birch Path", sentence: "The birches lean in together, and the path goes quietly through.", layers: sceneBirches },
  { kind: "sky", title: "Storm Coming In", sentence: "The barn is small and the sky is not; the fields wait.", layers: sceneStorm },
  { kind: "garden", title: "The Garden Gate", sentence: "The roses climbed the gate years ago and never came down.", layers: sceneGate },
  { kind: "coast", title: "Cliffs and Sea", sentence: "The gulls read the wind; the sea keeps turning the page.", layers: sceneCliffs },
  { kind: "garden", title: "Orchard After Rain", sentence: "Every puddle borrowed a tree, and the grass smelled of earth.", layers: sceneOrchard },
  { kind: "sky", title: "Moonrise", sentence: "The moon came up over the hills, slow and pale and unhurried.", layers: sceneMoon },
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
const OUTLINE_MS = 520;
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
