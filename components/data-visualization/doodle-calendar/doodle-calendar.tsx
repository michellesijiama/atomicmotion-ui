"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { getStroke } from "perfect-freehand";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Doodle Calendar — the weather doodles are traced at runtime from OpenMoji
// line drawings served from /emoji/<HEX>.svg (CC BY-SA 4.0, OpenMoji project &
// contributors, https://openmoji.org). Copy public/emoji/ across with this file
// and keep the licence: licenses/OpenMoji-CC-BY-SA-4.0.txt.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One day of the month and the weather it wore. */
export type WeatherKind = "sunny" | "partly" | "cloudy" | "rain" | "storm" | "windy" | "rainbow";

export type WeatherDay = {
  /** Day of the month, 1–31. */
  day: number;
  /** Full English weekday, e.g. "Friday". */
  weekday: string;
  kind: WeatherKind;
  /** Human label for the weather, e.g. "Partly cloudy". */
  label: string;
  /** Temperature in °C. */
  temp: number;
};

export type DoodleCalendarProps = {
  /** The day the calendar treats as today (August 2026), 1–31. It starts selected and drawn. */
  today?: number;
  /** Step through the month on its own, drawing as it goes, until someone touches it (the gallery card sets it). */
  loop?: boolean;
  /** A day was selected — by a click, the arrow keys, or the loop. */
  onSelect?: (day: WeatherDay) => void;
  className?: string;
};

/* ───────────────────────────── palette & type ───────────────────────────── */

// One bluish ink on one grey-lilac paper — every colour in the file is a
// tint of these two, so the whole phone reads as a single pen on a single sheet.
const INK = "#2F2BD6";
const INK_RGB = "47 43 214";
const PAPER = "#E4E4EA";
const ink = (a: number) => `rgb(${INK_RGB} / ${a})`;

const FONT_SANS = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";
const FONT_MONO =
  "var(--font-geist-mono, 'Geist Mono'), 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/* ───────────────────────────── the phone ───────────────────────────── */

const PHONE_W = 320;
const PHONE_H = 660;
const BEZEL = 10;
const PHONE_RADIUS = 52;
const SCREEN_RADIUS = PHONE_RADIUS - BEZEL;

/* ───────────────────────────── the month ───────────────────────────── */

const YEAR = 2026;
const MONTH_NAME = "August";
const DAYS_IN_MONTH = 31;
/** August 1st, 2026 is a Saturday — the sixth column of a Monday-first week. */
const FIRST_COLUMN = 5;
const WEEKS = 6;

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const LABELS: Record<WeatherKind, string> = {
  sunny: "Sunny",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  storm: "Thunderstorm",
  windy: "Windy",
  rainbow: "Rainbow",
};

/** A deterministic August: kind and °C for each of the 31 days. */
const FORECAST: readonly (readonly [WeatherKind, number])[] = [
  ["sunny", 27], ["sunny", 29], ["partly", 26], ["cloudy", 23], ["rain", 20], ["rainbow", 22], ["sunny", 29],
  ["sunny", 31], ["partly", 28], ["storm", 24], ["rain", 19], ["cloudy", 21], ["windy", 22], ["partly", 25],
  ["sunny", 28], ["sunny", 30], ["sunny", 32], ["partly", 29], ["storm", 25], ["rain", 20], ["rainbow", 22],
  ["cloudy", 21], ["partly", 24], ["sunny", 27], ["windy", 23], ["cloudy", 22], ["rain", 19], ["partly", 24],
  ["sunny", 26], ["sunny", 28], ["partly", 25],
];

const WEATHER_DAYS: readonly WeatherDay[] = FORECAST.map(([kind, temp], i) => ({
  day: i + 1,
  weekday: WEEKDAYS_LONG[(FIRST_COLUMN + i) % 7],
  kind,
  label: LABELS[kind],
  temp,
}));

const clampDay = (d: number) => Math.min(DAYS_IN_MONTH, Math.max(1, Math.round(d)));

/* ───────────────────────── OpenMoji → pencil strokes ─────────────────────────
 * The same trick as Emoji Sketch: fetch an OpenMoji line drawing, walk every
 * geometry element with getPointAtLength, and re-draw it as a perfect-freehand
 * stroke with a wobble. A stroke is sampled once; its outline is cut to
 * whatever brush the doodle needs (small in a day cell, larger in the header).
 */

type Stroke = {
  /** Wobbled sample points, in the glyph's 72-unit space. */
  pts: number[][];
  center: string;
  len: number;
  seed: number;
  outlines: Map<string, string>;
};
type Trace = { strokes: Stroke[]; markup: string };

const GEOMETRY = "path, circle, ellipse, line, polyline, polygon, rect";
const CDN = "https://cdn.jsdelivr.net/npm/openmoji@15.0.0/black/svg";
/** How far the pencil strays from the printed line, in glyph units. */
const WOBBLE = 0.5;

const average = (a: number, b: number) => (a + b) / 2;

async function fetchEmojiSvg(code: string): Promise<string | null> {
  for (const url of [`/emoji/${code}.svg`, `${CDN}/${code}.svg`]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("<path") || text.includes("<circle") || text.includes('id="line"')) return text;
    } catch {
      /* try the next source */
    }
  }
  return null;
}

function outlineToPath(points: number[][]): string {
  const len = points.length;
  if (len < 4) return "";
  let a = points[0];
  let b = points[1];
  const c = points[2];
  let d = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(
    2,
  )},${average(b[1], c[1]).toFixed(2)} T`;
  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    d += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }
  return `${d}Z`;
}

/** Turns a dense run of points into a hand-drawn stroke. Pure maths — safe anywhere. */
function buildStroke(points: number[][], seed: number): Stroke | null {
  if (points.length < 4) return null;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  if (!len) return null;
  const pts = points.map(([x, y], i) => [
    x + WOBBLE * Math.sin(i * 0.33 + seed),
    y + WOBBLE * Math.cos(i * 0.29 + seed * 1.3),
  ]);
  let center = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) center += `L${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  return { pts, center, len, seed, outlines: new Map() };
}

/** The pencil outline of a stroke at a brush size, cached per size. */
function strokeOutline(stroke: Stroke, size: number): string {
  const key = size.toFixed(2);
  const hit = stroke.outlines.get(key);
  if (hit !== undefined) return hit;
  const n = stroke.pts.length;
  const withPressure = stroke.pts.map(([x, y], i) => {
    const t = i / (n - 1);
    const taper = Math.min(1, Math.min(t, 1 - t) * 5);
    const wave = 0.16 * Math.sin(i * 0.7 + stroke.seed);
    return [x, y, Math.max(0.08, Math.min(1, 0.42 + 0.45 * taper + wave))];
  });
  const path = outlineToPath(
    getStroke(withPressure, { size, thinning: 0.6, smoothing: 0.6, streamline: 0.5, simulatePressure: false, last: true }),
  );
  stroke.outlines.set(key, path);
  return path;
}

function elementToStroke(el: SVGGeometryElement, seed: number): Stroke | null {
  const total = el.getTotalLength();
  if (!total) return null;
  const step = Math.max(0.8, total / 160);
  const raw: number[][] = [];
  for (let dist = 0; dist <= total; dist += step) {
    const p = el.getPointAtLength(dist);
    raw.push([p.x, p.y]);
  }
  return buildStroke(raw, seed);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h ^ (h >>> 13)) >>> 0;
}

function parseEmoji(hex: string, svgText: string): Trace | null {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const line = doc.querySelector("#line") ?? doc.querySelector("svg");
  if (!line) return null;
  const markup = line.innerHTML;
  const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  temp.setAttribute("viewBox", "0 0 72 72");
  temp.setAttribute("width", "72");
  temp.setAttribute("height", "72");
  temp.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden";
  temp.innerHTML = markup;
  document.body.appendChild(temp);
  const strokes: Stroke[] = [];
  const base = (hashString(hex) % 100) / 10;
  temp.querySelectorAll<SVGGeometryElement>(GEOMETRY).forEach((el, i) => {
    const s = elementToStroke(el, base + i * 1.7);
    if (s) strokes.push(s);
  });
  document.body.removeChild(temp);
  return strokes.length ? { strokes, markup } : null;
}

// Each emoji is fetched and parsed once, however many days ask for it.
const traceCache = new Map<string, Promise<Trace | null>>();

function loadTrace(hex: string): Promise<Trace | null> {
  let hit = traceCache.get(hex);
  if (!hit) {
    hit = fetchEmojiSvg(hex).then((text) => (text ? parseEmoji(hex, text) : null));
    traceCache.set(hex, hit);
  }
  return hit;
}

/* ───────────────────────── the weather, as doodles ───────────────────────── */

/** A hand-drawn extra: a dense run of points in the 72-unit glyph space. */
function polyline(...pts: number[][]): number[][] {
  const out: number[][] = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.8));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  return out;
}

/** A gust: a long stroke that ends in a small curl. */
function gust(x0: number, y0: number, length: number, r: number): number[][] {
  const out: number[][] = [];
  const steps = Math.ceil(length / 0.8);
  for (let i = 0; i <= steps; i++) out.push([x0 + (length * i) / steps, y0 + 1.2 * Math.sin((i / steps) * Math.PI * 1.4)]);
  const cx = x0 + length;
  const cy = y0 - r;
  for (let a = Math.PI / 2; r > 0 && a > -Math.PI * 1.05; a -= 0.09) out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  return out;
}

type Layer = {
  /** OpenMoji code point to trace, or none for hand-made extras. */
  hex?: string;
  /** Where the glyph's centre lands in the 72-unit doodle, and how big it is. */
  cx: number;
  cy: number;
  s: number;
  /** Paper-coloured body under the ink, so this layer hides what is behind it. */
  fill?: boolean;
  /** Extra strokes drawn by hand (rain, wind) instead of traced. */
  extras?: Stroke[];
};

const extra = (points: number[][], seed: number) => {
  const s = buildStroke(points, seed);
  return s ? [s] : [];
};

const DROPS: Stroke[] = [
  polyline([22, 49], [19, 57]),
  polyline([33, 52], [30, 61]),
  polyline([44, 49], [41, 57]),
  polyline([54, 52], [51, 60]),
].flatMap((p, i) => extra(p, 3 + i * 2.3));

const GUSTS: Stroke[] = [...extra(gust(4, 60, 34, 6.5), 1.1), ...extra(gust(16, 69, 24, 0), 4.2)];

/** Each weather, as layers of OpenMoji glyphs — back to front. */
const DOODLES: Record<WeatherKind, Layer[]> = {
  sunny: [{ hex: "2600", cx: 36, cy: 36, s: 1 }],
  partly: [
    { hex: "2600", cx: 46, cy: 26, s: 0.62 },
    { hex: "2601", cx: 33, cy: 45, s: 0.86, fill: true },
  ],
  cloudy: [
    { hex: "2601", cx: 50, cy: 25, s: 0.6 },
    { hex: "2601", cx: 32, cy: 42, s: 0.95, fill: true },
  ],
  rain: [
    { hex: "2601", cx: 36, cy: 27, s: 0.9, fill: true },
    { cx: 36, cy: 36, s: 1, extras: DROPS },
  ],
  storm: [
    { hex: "2601", cx: 36, cy: 25, s: 0.9, fill: true },
    { hex: "26A1", cx: 38, cy: 47, s: 0.62, fill: true },
  ],
  windy: [
    { hex: "1F343", cx: 40, cy: 29, s: 0.95 },
    { cx: 36, cy: 36, s: 1, extras: GUSTS },
  ],
  rainbow: [
    { hex: "1F308", cx: 34, cy: 34, s: 1 },
    { hex: "2601", cx: 51, cy: 53, s: 0.5, fill: true },
  ],
};

const ALL_HEXES = Array.from(
  new Set(Object.values(DOODLES).flatMap((layers) => layers.flatMap((l) => (l.hex ? [l.hex] : [])))),
);

type Traces = Record<string, Trace | null | undefined>;

/** Traces every emoji the doodles need, once, in an effect (DOM parsing never runs on the server). */
function useTraces(): Traces {
  const [traces, setTraces] = React.useState<Traces>({});
  React.useEffect(() => {
    let cancelled = false;
    ALL_HEXES.forEach((hex) => {
      loadTrace(hex).then((trace) => {
        if (!cancelled) setTraces((prev) => (prev[hex] === undefined ? { ...prev, [hex]: trace } : prev));
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return traces;
}

type DoodleState = "loading" | "ready" | "failed";

function doodleState(kind: WeatherKind, traces: Traces): DoodleState {
  let loading = false;
  for (const layer of DOODLES[kind]) {
    if (!layer.hex) continue;
    const t = traces[layer.hex];
    if (t === null) return "failed";
    if (t === undefined) loading = true;
  }
  return loading ? "loading" : "ready";
}

/* ───────────────────────────── one doodle ───────────────────────────── */

/** Brush size in glyph units, tuned per rendered size so a line stays ~1.5px whatever the scale. */
const BRUSH_CELL = 1.75;
const BRUSH_HEADER = 1.25;

type DoodleProps = {
  kind: WeatherKind;
  traces: Traces;
  size: number;
  brush: number;
  /** Seconds the whole drawing takes. */
  duration: number;
  /** Draw stroke by stroke; false shows it finished. */
  animate: boolean;
  className?: string;
};

const Doodle = React.memo(function Doodle({ kind, traces, size, brush, duration, animate, className }: DoodleProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = React.useRef<SVGSVGElement>(null);
  const layers = DOODLES[kind];

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !animate) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path[data-len]"));
    const fills = Array.from(svg.querySelectorAll<SVGGElement>("g[data-fill]"));
    // Lay the strokes end to end, each starting a little before the last finishes.
    const plan: { d: number; at: number; layer: number }[] = [];
    let cursor = 0;
    paths.forEach((p) => {
      const d = Math.min(0.7, Math.max(0.16, Number(p.dataset.len) / 120));
      plan.push({ d, at: cursor, layer: Number(p.dataset.layer) });
      cursor += d * 0.55;
    });
    const last = plan[plan.length - 1];
    const k = last ? duration / (last.at + last.d) : 1;
    const anims: Animation[] = [];
    paths.forEach((p, i) => {
      const len = Number(p.dataset.len);
      anims.push(
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
          duration: plan[i].d * k * 1000,
          delay: plan[i].at * k * 1000,
          easing: "ease",
          fill: "forwards",
        }),
      );
    });
    fills.forEach((g) => {
      const first = plan.find((s) => s.layer === Number(g.dataset.fill));
      anims.push(
        g.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 120,
          delay: (first?.at ?? 0) * k * 1000,
          fill: "forwards",
        }),
      );
    });
    return () => anims.forEach((a) => a.cancel());
  }, [animate, duration, kind]);

  return (
    <svg
      ref={svgRef}
      viewBox="-3 -3 78 78"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {layers.map((layer, li) => {
        const strokes = layer.extras ?? traces[layer.hex ?? ""]?.strokes ?? [];
        const markup = layer.fill && layer.hex ? traces[layer.hex]?.markup : undefined;
        const size = brush / layer.s;
        return (
          <g
            key={li}
            transform={`translate(${(layer.cx - 36 * layer.s).toFixed(2)} ${(layer.cy - 36 * layer.s).toFixed(2)}) scale(${layer.s})`}
          >
            {markup ? (
              <g
                data-fill={li}
                className="dc-body"
                style={{ opacity: animate ? 0 : 1 }}
                dangerouslySetInnerHTML={{ __html: markup }}
              />
            ) : null}
            <defs>
              {strokes.map((s, si) => (
                <mask key={si} id={`dc-${uid}-${li}-${si}`} maskUnits="userSpaceOnUse" x="-100" y="-100" width="300" height="300">
                  <path
                    d={s.center}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={size * 2 + 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    data-len={(s.len * layer.s).toFixed(1)}
                    data-layer={li}
                    style={{ strokeDasharray: s.len, strokeDashoffset: animate ? s.len : 0 }}
                  />
                </mask>
              ))}
            </defs>
            {strokes.map((s, si) => (
              <path key={si} d={strokeOutline(s, size)} fill={INK} mask={`url(#dc-${uid}-${li}-${si})`} />
            ))}
          </g>
        );
      })}
    </svg>
  );
});

/* ───────────────────────────── status bar glyphs ───────────────────────────── */

function StatusGlyphs() {
  return (
    <svg width="62" height="12" viewBox="0 0 62 12" fill="none" aria-hidden="true" focusable="false">
      {/* signal */}
      <rect x="0" y="7.5" width="3" height="4" rx="1" fill={INK} />
      <rect x="4.6" y="5.2" width="3" height="6.3" rx="1" fill={INK} />
      <rect x="9.2" y="2.8" width="3" height="8.7" rx="1" fill={INK} />
      <rect x="13.8" y="0.5" width="3" height="11" rx="1" fill={INK} />
      {/* wifi */}
      <path d="M22.2 4.6a7.6 7.6 0 0 1 10.6 0" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24.3 7.1a4.6 4.6 0 0 1 6.4 0" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="27.5" cy="9.7" r="1.25" fill={INK} />
      {/* battery */}
      <rect x="37.5" y="1" width="21" height="10.4" rx="3.2" stroke={ink(0.45)} strokeWidth="1" />
      <rect x="39.2" y="2.7" width="15.2" height="7" rx="1.8" fill={INK} />
      <path d="M60.2 4.6v3.2" stroke={ink(0.45)} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────────── the component ───────────────────────────── */

const GRID_PAD = 16;
const CELL_H = 50;
const DOT = 35;
const LOOP_MS = 1600;

const SWAP = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;

type DayKind = "past" | "today" | "future";

export function DoodleCalendar({ today: todayProp = 7, loop = false, onSelect, className }: DoodleCalendarProps) {
  const today = clampDay(todayProp);
  const reduced = useReducedMotion();
  const traces = useTraces();

  const [selected, setSelected] = React.useState(today);
  const [revealed, setRevealed] = React.useState<ReadonlySet<number>>(() => new Set([today]));
  const [interacted, setInteracted] = React.useState(false);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const cells = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const selectedRef = React.useRef(today);
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
      const scale = Math.min(1, (host.clientWidth - 24) / PHONE_W, (host.clientHeight - 24) / PHONE_H);
      fit.style.transform = `scale(${Math.max(0.3, scale).toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  /** Selecting a day also draws it — revealed days stay revealed. */
  const select = React.useCallback((raw: number) => {
    const day = clampDay(raw);
    selectedRef.current = day;
    setSelected(day);
    setRevealed((prev) => (prev.has(day) ? prev : new Set(prev).add(day)));
    onSelectRef.current?.(WEATHER_DAYS[day - 1]);
  }, []);

  // The gallery card: walk the month one day at a time, wrapping round, until touched.
  React.useEffect(() => {
    if (!loop || interacted || reduced) return;
    const id = window.setInterval(() => select((selectedRef.current % DAYS_IN_MONTH) + 1), LOOP_MS);
    return () => window.clearInterval(id);
  }, [loop, interacted, reduced, select]);

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: number | null = null;
    if (e.key in step) next = clampDay(selectedRef.current + step[e.key]);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = DAYS_IN_MONTH;
    if (next === null) return;
    e.preventDefault();
    select(next);
    cells.current[next]?.focus();
  };

  const current = WEATHER_DAYS[selected - 1];
  const headerState = doodleState(current.kind, traces);
  const dayName = current.weekday.slice(0, 3).toUpperCase();
  const draw = reduced !== true;

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={hostRef}
        className={cn("relative flex size-full min-h-[420px] items-center justify-center overflow-hidden", className)}
        style={{ fontFamily: FONT_MONO }}
        onPointerDownCapture={() => setInteracted(true)}
        onKeyDownCapture={() => setInteracted(true)}
      >
        <style>
          {`
            .dc-body :is(path, circle, ellipse, line, polyline, polygon, rect) {
              fill: ${PAPER}; stroke: none;
            }
            .dc-cell { outline: none; }
            .dc-cell:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
          `}
        </style>

        <div ref={fitRef} className="relative shrink-0" style={{ width: PHONE_W, height: PHONE_H, transformOrigin: "50% 50%" }}>
          {/* The white iPhone: a bezel with a hairline outline, nothing behind it. */}
          <div
            className="absolute inset-0"
            style={{
              background: "#FFFFFF",
              borderRadius: PHONE_RADIUS,
              border: "1px solid rgba(20, 20, 60, 0.10)",
            }}
          />

          {/* The screen: one sheet of paper. */}
          <div
            className="absolute overflow-hidden"
            style={{ inset: BEZEL, borderRadius: SCREEN_RADIUS, background: PAPER, color: INK }}
          >
            {/* Status bar */}
            <div
              className="absolute inset-x-0 top-0 flex items-center justify-between"
              style={{ height: 48, padding: "0 26px 0 30px" }}
              aria-hidden="true"
            >
              <span style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 13.5, letterSpacing: "0.01em" }}>9:41</span>
              <StatusGlyphs />
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 11, width: 88, height: 25, borderRadius: 13, background: INK }}
              aria-hidden="true"
            />

            {/* Header: the chosen day, big, with its weather drawn beside it. */}
            <div className="absolute inset-x-0" style={{ top: 58, padding: "0 20px" }}>
              <div className="flex items-start justify-between">
                <div style={{ height: 100, overflow: "visible" }} aria-hidden="true">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={current.day}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={SWAP}
                      style={{
                        fontFamily: FONT_SANS,
                        fontWeight: 800,
                        fontSize: 112,
                        lineHeight: "100px",
                        letterSpacing: "-0.05em",
                        marginLeft: -4,
                      }}
                    >
                      {current.day}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex flex-col items-end" style={{ width: 112, paddingTop: 2 }}>
                  <div style={{ width: 96, height: 96 }} aria-hidden="true">
                    {headerState === "ready" ? (
                      <Doodle
                        key={current.day}
                        kind={current.kind}
                        traces={traces}
                        size={96}
                        brush={BRUSH_HEADER}
                        duration={1.5}
                        animate={draw}
                      />
                    ) : null}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={current.day}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={SWAP}
                      className="whitespace-nowrap"
                      style={{ fontSize: 10.5, letterSpacing: "0.01em", color: ink(0.62), marginTop: 2 }}
                      aria-hidden="true"
                    >
                      {current.label} · {current.temp}°
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-end justify-between" style={{ marginTop: 6 }}>
                <div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontWeight: 800,
                      fontSize: 22,
                      lineHeight: "24px",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {MONTH_NAME.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: "16px", color: ink(0.62) }}>{YEAR}</div>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={dayName}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={SWAP}
                    style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: 22, lineHeight: "24px", letterSpacing: "0.03em" }}
                    aria-hidden="true"
                  >
                    {dayName}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Announces the day for assistive tech; the visual header is decorative. */}
            <p className="sr-only" aria-live="polite">
              {`${current.weekday}, ${MONTH_NAME} ${current.day}, ${YEAR} — ${current.label.toLowerCase()}, ${current.temp}°`}
            </p>

            {/* The month */}
            <div
              role="grid"
              aria-label={`${MONTH_NAME} ${YEAR}`}
              className="absolute inset-x-0"
              style={{ top: 236, padding: `0 ${GRID_PAD}px` }}
              onKeyDown={onGridKeyDown}
            >
              <div role="row" className="grid grid-cols-7" style={{ marginBottom: 4, fontSize: 9.5, color: ink(0.55) }}>
                {WEEKDAYS_SHORT.map((w, i) => (
                  <div key={w} role="columnheader" className="text-center" style={{ letterSpacing: "0.02em" }}>
                    <abbr title={WEEKDAYS_LONG[i]} style={{ textDecoration: "none" }}>
                      {w}
                    </abbr>
                  </div>
                ))}
              </div>

              {Array.from({ length: WEEKS }, (_, row) => (
                <div key={row} role="row" className="grid grid-cols-7" style={{ height: CELL_H }}>
                  {Array.from({ length: 7 }, (_, col) => {
                    const day = row * 7 + col - FIRST_COLUMN + 1;
                    if (day < 1 || day > DAYS_IN_MONTH) return <div key={col} role="gridcell" />;
                    const info = WEATHER_DAYS[day - 1];
                    const kind: DayKind = day < today ? "past" : day === today ? "today" : "future";
                    return (
                      <div key={col} role="gridcell" className="flex items-center justify-center">
                        <DayCell
                          info={info}
                          kind={kind}
                          selected={selected === day}
                          revealed={revealed.has(day)}
                          traces={traces}
                          draw={draw}
                          onPick={select}
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

            {/* Footer */}
            <div
              className="absolute inset-x-0 flex items-baseline justify-between"
              style={{ bottom: 34, padding: "0 20px", fontSize: 11.5, letterSpacing: "0.01em" }}
            >
              <span style={{ color: INK }}>{YEAR}</span>
              <span style={{ color: ink(0.5) }}>
                <span style={{ color: INK, fontWeight: 600 }}>{revealed.size}</span>{" "}
                {revealed.size === 1 ? "day" : "days"} sketched
              </span>
            </div>

            {/* Home indicator */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ bottom: 9, width: 104, height: 4, borderRadius: 2, background: ink(0.32) }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

/* ───────────────────────────── one day ───────────────────────────── */

type DayCellProps = {
  info: WeatherDay;
  kind: DayKind;
  selected: boolean;
  revealed: boolean;
  traces: Traces;
  draw: boolean;
  onPick: (day: number) => void;
  register: (el: HTMLButtonElement | null) => void;
};

// Past days are ink at a fifth strength, today is solid, the future is a faint wash.
const DOT_FILL: Record<DayKind, string> = { past: ink(0.2), today: INK, future: ink(0.08) };

function DayCell({ info, kind, selected, revealed, traces, draw, onPick, register }: DayCellProps) {
  const state = doodleState(info.kind, traces);
  // If the glyph could not be fetched, the plain circle stays, ringed in ink.
  const failed = revealed && state === "failed";
  const gone = revealed && !failed;

  return (
    <motion.button
      type="button"
      ref={register}
      className="dc-cell relative grid cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0"
      style={{ width: CELL_H - 4, height: CELL_H - 4 }}
      tabIndex={selected ? 0 : -1}
      aria-pressed={selected}
      aria-label={`${info.weekday}, ${MONTH_NAME} ${info.day} — ${info.label.toLowerCase()}, ${info.temp}°`}
      onClick={() => onPick(info.day)}
      whileTap={{ scale: 0.93 }}
    >
      {/* The plain circle — it shrinks and fades as the pencil takes over. */}
      <motion.span
        className="absolute rounded-full"
        initial={false}
        animate={gone ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: DOT,
          height: DOT,
          background: DOT_FILL[kind],
          border: failed ? `1.5px solid ${INK}` : "none",
        }}
        aria-hidden="true"
      />

      {/* Today keeps a hairline ring even after it is drawn, so it never gets lost. */}
      {kind === "today" && gone && !selected ? (
        <span
          className="absolute rounded-full"
          style={{ width: DOT + 4, height: DOT + 4, border: `1px dashed ${ink(0.45)}` }}
          aria-hidden="true"
        />
      ) : null}

      {gone && state === "ready" ? (
        <Doodle kind={info.kind} traces={traces} size={DOT + 8} brush={BRUSH_CELL} duration={1.15} animate={draw} className="absolute" />
      ) : null}

      {/* The chosen day. */}
      <motion.span
        className="pointer-events-none absolute rounded-full"
        initial={false}
        animate={selected ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: DOT + 5, height: DOT + 5, border: `1.5px solid ${INK}` }}
        aria-hidden="true"
      />
    </motion.button>
  );
}
