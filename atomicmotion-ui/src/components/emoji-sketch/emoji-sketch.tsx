"use client";

import * as React from "react";
import { getStroke } from "perfect-freehand";

import { cn } from "@/lib/utils";

export type EmojiSketchProps = {
  loop?: boolean;
  className?: string;
};

type Stroke = { outline: string; center: string; len: number };
type Trace = { strokes: Stroke[]; markup: string };

// Bundled OpenMoji line drawings in /public/emoji.
const HEXES = [
  "2764", "2B50", "1F600", "2600", "2728", "1F680", "1F338",
  "1F319", "26A1", "1F98B", "2615", "270C", "1F308", "2601",
  "2744", "1F3B5", "1F381", "1F388",
];

const GEOMETRY = "path, circle, ellipse, line, polyline, polygon, rect";
const BRUSH = 0.45;
const MASK_W = 3;
const CDN = "https://cdn.jsdelivr.net/npm/openmoji@15.0.0/black/svg";
const CELL = 210;
const INNER = 150;

const average = (a: number, b: number) => (a + b) / 2;

async function fetchEmojiSvg(code: string): Promise<string | null> {
  for (const url of [`/emoji/${code}.svg`, `${CDN}/${code}.svg`]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("<path") || text.includes("<circle") || text.includes('id="line"')) {
        return text;
      }
    } catch {
      /* try next source */
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
  let d = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(
    2,
  )} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;
  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    d += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }
  return `${d}Z`;
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
  if (raw.length < 4) return null;
  const n = raw.length;
  const withPressure = raw.map(([x, y], i) => {
    const t = i / (n - 1);
    const taper = Math.min(1, Math.min(t, 1 - t) * 5);
    const wave = 0.16 * Math.sin(i * 0.7 + seed);
    const pressure = Math.max(0.08, Math.min(1, 0.42 + 0.45 * taper + wave));
    return [x, y, pressure];
  });
  const outline = getStroke(withPressure, {
    size: BRUSH,
    thinning: 0.6,
    smoothing: 0.6,
    streamline: 0.5,
    simulatePressure: false,
    last: true,
  });
  let center = `M${raw[0][0].toFixed(2)} ${raw[0][1].toFixed(2)}`;
  for (let i = 1; i < raw.length; i++) center += `L${raw[i][0].toFixed(2)} ${raw[i][1].toFixed(2)}`;
  return { outline: outlineToPath(outline), center, len: total };
}

function parseEmoji(svgText: string): Trace | null {
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
  temp.querySelectorAll<SVGGeometryElement>(GEOMETRY).forEach((el, i) => {
    const s = elementToStroke(el, i * 1.7);
    if (s && s.outline) strokes.push(s);
  });
  document.body.removeChild(temp);
  if (!strokes.length) return null;
  return { strokes, markup };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function hash2(c: number, r: number): number {
  let h = (Math.imul(c | 0, 73856093) ^ Math.imul(r | 0, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}
const unit = (c: number, r: number) => (hash2(c, r) % 100000) / 100000;

// Soft sticker-pack palette for the colored sticker bodies.
const PALETTE = [
  "#FFD3DC",
  "#FFE9A8",
  "#BFE9C8",
  "#BBDDFF",
  "#E3D1FF",
  "#FFD9B0",
  "#B9EEE6",
  "#F6C9E0",
  "#D2EFA8",
  "#FFC9C2",
];

// One live, self-drawing sticker. Memoised so panning (which only moves the
// world wrapper) never re-renders already-mounted cells — only newly entered
// cells render and animate themselves on.
const StickerCell = React.memo(function StickerCell({
  trace,
  filterId,
  color,
  x,
  y,
  rot,
  phase,
  cycle,
}: {
  trace: Trace;
  filterId: string;
  color: string;
  x: number;
  y: number;
  rot: number;
  phase: number;
  cycle: number;
}) {
  const uid = React.useId().replace(/[:]/g, "");
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [replay, setReplay] = React.useState(0);

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const reduce = prefersReducedMotion();
    const masks = Array.from(svg.querySelectorAll<SVGPathElement>(`.cd-${uid}`));
    // Stagger each sticker's draw by its phase so the field redraws as a wave.
    let delay = phase * 1.6;
    masks.forEach((path, i) => {
      const len = trace.strokes[i]?.len ?? path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.getAnimations().forEach((a) => a.cancel());
      if (reduce) {
        path.style.strokeDashoffset = "0";
        return;
      }
      const duration = Math.min(0.9, Math.max(0.25, len / 130));
      path.style.strokeDashoffset = String(len);
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: duration * 1000,
        delay: delay * 1000,
        easing: "ease",
        fill: "forwards",
      });
      delay += duration * 0.5;
    });
  }, [trace, uid, replay, cycle, phase]);

  return (
    <svg
      ref={svgRef}
      viewBox="-8 -8 88 88"
      className="am-sticker absolute will-change-transform"
      onMouseEnter={() => setReplay((n) => n + 1)}
      style={
        {
          width: INNER,
          height: INNER,
          left: x,
          top: y,
          "--rot": `${rot}deg`,
          "--body": color,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <defs>
        {trace.strokes.map((s, i) => (
          <mask key={i} id={`cm-${uid}-${i}`} maskUnits="userSpaceOnUse" x="-8" y="-8" width="88" height="88">
            <path
              className={`cd-${uid}`}
              d={s.center}
              fill="none"
              stroke="#fff"
              strokeWidth={MASK_W}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </mask>
        ))}
      </defs>
      {/* White die-cut base (the border) + colored body on top of it. */}
      <g className="am-body-white" dangerouslySetInnerHTML={{ __html: trace.markup }} />
      <g className="am-body-color" dangerouslySetInnerHTML={{ __html: trace.markup }} />
      <g filter={`url(#${filterId})`}>
        {trace.strokes.map((s, i) => (
          <path key={i} d={s.outline} fill="var(--emoji-ink)" mask={`url(#cm-${uid}-${i})`} />
        ))}
      </g>
    </svg>
  );
});

export function EmojiSketch({ loop = false, className }: EmojiSketchProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const [traces, setTraces] = React.useState<Trace[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [vp, setVp] = React.useState({ w: 0, h: 0 });
  const [offset, setOffset] = React.useState({ x: -40, y: -30 });
  const [cycle, setCycle] = React.useState(0);
  const drag = React.useRef({ down: false, x: 0, y: 0, vx: 0, vy: 0 });
  const raf = React.useRef(0);

  // On the gallery card (loop), replay the self-draw on a timer so the stickers
  // keep animating — without moving the canvas.
  React.useEffect(() => {
    if (!loop || prefersReducedMotion() || traces.length === 0) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), 4500);
    return () => window.clearInterval(id);
  }, [loop, traces.length]);

  // Trace every emoji once.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const result: Trace[] = [];
      for (const hex of HEXES) {
        const text = await fetchEmojiSvg(hex);
        if (cancelled) return;
        const parsed = text ? parseEmoji(text) : null;
        if (parsed) result.push(parsed);
      }
      if (!cancelled) setTraces(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVp({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(raf.current);
    drag.current = { down: true, x: e.clientX, y: e.clientY, vx: 0, vy: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture unavailable */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    drag.current.vx = dx;
    drag.current.vy = dy;
    setOffset((o) => ({ x: o.x - dx, y: o.y - dy }));
  };

  const onPointerUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    let vx = drag.current.vx;
    let vy = drag.current.vy;
    const step = () => {
      vx *= 0.93;
      vy *= 0.93;
      if (Math.hypot(vx, vy) < 0.3) return;
      setOffset((o) => ({ x: o.x - vx, y: o.y - vy }));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const filterId = `wob-${uid}`;
  const cells: { key: string; c: number; r: number }[] = [];
  if (traces.length && vp.w && vp.h) {
    const c0 = Math.floor(offset.x / CELL) - 1;
    const c1 = Math.floor((offset.x + vp.w) / CELL) + 1;
    const r0 = Math.floor(offset.y / CELL) - 1;
    const r1 = Math.floor((offset.y + vp.h) / CELL) + 1;
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) cells.push({ key: `${c}:${r}`, c, r });
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "relative isolate size-full min-h-[420px] touch-none select-none justify-self-stretch self-stretch overflow-hidden [cursor:grab] active:[cursor:grabbing]",
        className,
      )}
      style={{ "--emoji-ink": "var(--jitter-ink, #0e1011)" } as React.CSSProperties}
    >
      <style>
        {`
          .am-body-white :is(path, circle, ellipse, line, polyline, polygon, rect) {
            fill: #ffffff; stroke: #ffffff; stroke-width: 18px;
            stroke-linejoin: round; stroke-linecap: round;
          }
          .am-body-white { filter: drop-shadow(0 1.6px 1.3px rgba(0,0,0,0.30)); }
          .am-body-color :is(path, circle, ellipse, line, polyline, polygon, rect) {
            fill: var(--body, #fff); stroke: var(--body, #fff); stroke-width: 14px;
            stroke-linejoin: round; stroke-linecap: round;
          }
          .am-sticker {
            transform: rotate(var(--rot, 0deg));
            transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .am-sticker:hover { transform: rotate(var(--rot, 0deg)) scale(1.16); z-index: 4; }
          @media (prefers-reduced-motion: reduce) {
            .am-sticker { transition: none; }
          }
        `}
      </style>

      {/* Shared hand-drawn wobble filter (light: no grain), referenced by all cells. */}
      <svg className="pointer-events-none absolute size-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={3} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={1.4} />
          </filter>
        </defs>
      </svg>

      {traces.length === 0 ? (
        <span className="absolute inset-0 grid place-items-center text-body text-[var(--jitter-gray-400)]">
          inking stickers…
        </span>
      ) : (
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(${(-offset.x).toFixed(1)}px, ${(-offset.y).toFixed(1)}px, 0)` }}
        >
          {cells.map(({ key, c, r }) => {
            const trace = traces[hash2(c, r) % traces.length];
            const color = PALETTE[hash2(c + 5, r + 9) % PALETTE.length];
            const rot = (unit(c + 131, r + 57) - 0.5) * 22;
            const jx = (unit(c + 11, r + 3) - 0.5) * (CELL - INNER) * 0.7;
            const jy = (unit(c + 7, r + 19) - 0.5) * (CELL - INNER) * 0.7;
            return (
              <StickerCell
                key={key}
                trace={trace}
                filterId={filterId}
                color={color}
                x={c * CELL + (CELL - INNER) / 2 + jx}
                y={r * CELL + (CELL - INNER) / 2 + jy}
                rot={rot}
                phase={unit(c + 3, r + 8)}
                cycle={cycle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
