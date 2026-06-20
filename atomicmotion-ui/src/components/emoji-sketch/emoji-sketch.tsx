"use client";

import * as React from "react";
import { ArrowRight, Plus } from "lucide-react";
import { getStroke } from "perfect-freehand";

import { cn } from "@/lib/utils";

export type EmojiSketchProps = {
  /** OpenMoji hex codepoint to draw first (e.g. "2764"). */
  initial?: string;
  /** Keep redrawing the sticker on a loop (used in the gallery card). */
  loop?: boolean;
  className?: string;
};

type EmojiDef = { char: string; hex: string; label: string };
type Stroke = { outline: string; center: string; len: number };

// Quick-pick set — bundled in /public/emoji; any typed emoji falls back to CDN.
const EMOJIS: EmojiDef[] = [
  { char: "❤️", hex: "2764", label: "Heart" },
  { char: "⭐", hex: "2B50", label: "Star" },
  { char: "😀", hex: "1F600", label: "Grin" },
  { char: "☀️", hex: "2600", label: "Sun" },
  { char: "🔥", hex: "1F525", label: "Fire" },
  { char: "✨", hex: "2728", label: "Sparkles" },
  { char: "🚀", hex: "1F680", label: "Rocket" },
  { char: "🌸", hex: "1F338", label: "Blossom" },
  { char: "🌙", hex: "1F319", label: "Moon" },
  { char: "⚡", hex: "26A1", label: "Bolt" },
  { char: "🦋", hex: "1F98B", label: "Butterfly" },
  { char: "☕", hex: "2615", label: "Coffee" },
];

const GEOMETRY = "path, circle, ellipse, line, polyline, polygon, rect";
const BRUSH = 0.45;
const MASK_W = 3;
const INK = "#0e1011";
const CDN = "https://cdn.jsdelivr.net/npm/openmoji@15.0.0/black/svg";

const average = (a: number, b: number) => (a + b) / 2;

// A typed emoji string → OpenMoji filename code (uppercase hex, FE0F stripped).
function emojiToCode(input: string): string | null {
  const match = input
    .trim()
    .match(/\p{Extended_Pictographic}(‍\p{Extended_Pictographic}|[️\u{1F3FB}-\u{1F3FF}])*/u);
  const emoji = match?.[0] ?? input.trim();
  const cps = Array.from(emoji)
    .map((c) => c.codePointAt(0) ?? 0)
    .filter((cp) => cp && cp !== 0xfe0f);
  if (!cps.length) return null;
  return cps.map((cp) => cp.toString(16).toUpperCase()).join("-");
}

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

function computeStrokes(svgText: string): Stroke[] {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const line = doc.querySelector("#line") ?? doc.querySelector("svg");
  if (!line) return [];

  const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  temp.setAttribute("viewBox", "0 0 72 72");
  temp.setAttribute("width", "72");
  temp.setAttribute("height", "72");
  temp.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden";
  temp.innerHTML = line.innerHTML;
  document.body.appendChild(temp);

  const strokes: Stroke[] = [];
  temp.querySelectorAll<SVGGeometryElement>(GEOMETRY).forEach((el, i) => {
    const s = elementToStroke(el, i * 1.7);
    if (s && s.outline) strokes.push(s);
  });

  document.body.removeChild(temp);
  return strokes;
}

// The textured-ink filter, as a standalone string for rasterizing to PNG.
const INK_FILTER = `<filter id="ink" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="10" numOctaves="2" seed="8" result="grain"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0.4" result="grainA"/><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="rough"/><feDisplacementMap in="SourceGraphic" in2="rough" scale="1.3" result="disp"/><feComposite in="disp" in2="grainA" operator="in"/></filter>`;

function strokesToSvgString(strokes: Stroke[], size: number): string {
  const paths = strokes.map((s) => `<path d="${s.outline}" fill="${INK}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="${size}" height="${size}"><defs>${INK_FILTER}</defs><g filter="url(#ink)">${paths}</g></svg>`;
}

function rasterize(strokes: Stroke[], size: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(strokesToSvgString(strokes, size))}`;
  });
}

export function EmojiSketch({ initial = "2764", loop = false, className }: EmojiSketchProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const [active, setActive] = React.useState(initial);
  const [input, setInput] = React.useState("");
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [runId, setRunId] = React.useState(0);
  const [notFound, setNotFound] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [cursorOn, setCursorOn] = React.useState(false);
  const [cursorUrl, setCursorUrl] = React.useState<string | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const cursorOnRef = React.useRef(false);

  // Load + trace whenever the active emoji changes.
  React.useEffect(() => {
    let cancelled = false;
    fetchEmojiSvg(active).then((text) => {
      if (cancelled) return;
      const s = text ? computeStrokes(text) : [];
      if (!s.length) {
        setNotFound(true);
        return;
      }
      setNotFound(false);
      setStrokes(s);
      setRunId((r) => r + 1);
      if (cursorOnRef.current) rasterize(s, 64).then((u) => !cancelled && setCursorUrl(u));
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  // Self-draw: grow each variable-width stroke's mask along its centerline.
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || strokes.length === 0) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const masks = Array.from(svg.querySelectorAll<SVGPathElement>(`.emoji-draw-${uid}`));
    let delay = 0;
    let maxEnd = 0;
    masks.forEach((path, i) => {
      const len = strokes[i]?.len ?? path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.getAnimations().forEach((a) => a.cancel());
      if (reduce) {
        path.style.strokeDashoffset = "0";
        return;
      }
      const duration = Math.min(1.2, Math.max(0.3, len / 120));
      path.style.strokeDashoffset = String(len);
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: duration * 1000,
        delay: delay * 1000,
        easing: "ease",
        fill: "forwards",
      });
      maxEnd = Math.max(maxEnd, delay + duration);
      delay += duration * 0.55;
    });

    // When looping (gallery card), redraw from scratch after a short hold.
    if (loop && !reduce) {
      const id = window.setTimeout(() => setRunId((r) => r + 1), (maxEnd + 1.4) * 1000);
      return () => window.clearTimeout(id);
    }
  }, [strokes, runId, uid, loop]);

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    const code = emojiToCode(input);
    if (!code) return;
    setPickerOpen(false);
    if (code === active) setRunId((r) => r + 1);
    else setActive(code);
  };

  const pick = (e: EmojiDef) => {
    setInput(e.char);
    setPickerOpen(false);
    if (e.hex === active) setRunId((r) => r + 1);
    else setActive(e.hex);
  };

  const copySticker = async () => {
    if (strokes.length === 0) return;
    try {
      const url = await rasterize(strokes, 256);
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const toggleCursor = async () => {
    const next = !cursorOn;
    setCursorOn(next);
    cursorOnRef.current = next;
    if (next && strokes.length) setCursorUrl(await rasterize(strokes, 64));
    else setCursorUrl(null);
  };

  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-full w-full flex-col items-center justify-between gap-6 px-6 py-8",
        className,
      )}
      style={{
        "--emoji-ink": "var(--jitter-ink, #0e1011)",
        ...(cursorOn && cursorUrl ? { cursor: `url(${cursorUrl}) 32 32, auto` } : null),
      } as React.CSSProperties}
    >
      {/* Sticker stage */}
      <div className="flex w-full flex-1 items-center justify-center">
        {strokes.length > 0 ? (
          <svg
            ref={svgRef}
            viewBox="0 0 72 72"
            className="h-auto max-h-[40vh] w-full max-w-[280px]"
            aria-label="Emoji sticker"
          >
            <defs>
              <filter
                id={`emoji-ink-${uid}`}
                x="-6%"
                y="-6%"
                width="112%"
                height="112%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence type="fractalNoise" baseFrequency="10" numOctaves={2} seed={8} result="grain" />
                <feColorMatrix
                  in="grain"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0.4"
                  result="grainA"
                />
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={3} result="rough" />
                <feDisplacementMap in="SourceGraphic" in2="rough" scale={1.3} result="disp" />
                <feComposite in="disp" in2="grainA" operator="in" />
              </filter>
              {strokes.map((s, i) => (
                <mask key={i} id={`em-${uid}-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="72" height="72">
                  <path
                    className={`emoji-draw-${uid}`}
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
            <g filter={`url(#emoji-ink-${uid})`}>
              {strokes.map((s, i) => (
                <path key={i} d={s.outline} fill="var(--emoji-ink)" mask={`url(#em-${uid}-${i})`} />
              ))}
            </g>
          </svg>
        ) : (
          <p className="text-body text-[var(--jitter-gray-400)]">
            {notFound ? "Couldn't sketch that one — try another emoji." : "Pick or type an emoji below."}
          </p>
        )}
      </div>

      {/* Actions */}
      {strokes.length > 0 ? (
        <div className="flex items-center gap-2 text-caption">
          <button
            type="button"
            onClick={copySticker}
            className="inline-flex h-8 items-center rounded-full bg-[var(--jitter-ink)] px-4 text-white transition-colors hover:bg-[var(--jitter-gray-800)]"
          >
            {copied ? "Copied!" : "Copy sticker"}
          </button>
          <button
            type="button"
            onClick={toggleCursor}
            aria-pressed={cursorOn}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-4 ring-1 ring-[var(--jitter-ink)] transition-colors",
              cursorOn ? "bg-[var(--jitter-ink)] text-white" : "hover:bg-[var(--jitter-gray-100)]",
            )}
          >
            {cursorOn ? "Cursor on" : "Use as cursor"}
          </button>
        </div>
      ) : null}

      {/* Chat-style input bar */}
      <form
        onSubmit={submitTyped}
        className="relative flex w-full max-w-xl items-center gap-2 rounded-[28px] bg-white p-2 shadow-[0_10px_34px_rgba(0,0,0,0.07)] ring-1 ring-black/5"
      >
        <button
          type="button"
          aria-label="Pick an emoji"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--jitter-gray-100)] text-[var(--jitter-gray-600)] transition-colors hover:bg-[#e6e6e6]"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or pick an emoji…"
          aria-label="Emoji"
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-[var(--jitter-gray-800)] outline-none placeholder:text-[var(--jitter-gray-400)]"
        />

        <button
          type="submit"
          aria-label="Sketch it"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--jitter-gray-100)] text-[var(--jitter-ink)] transition-colors hover:bg-[#e6e6e6]"
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>

        {pickerOpen ? (
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-10 grid grid-cols-6 gap-1 rounded-3xl bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
            {EMOJIS.map((e) => (
              <button
                key={e.hex}
                type="button"
                aria-label={e.label}
                onClick={() => pick(e)}
                className="inline-flex size-10 items-center justify-center rounded-xl text-[20px] leading-none transition-colors hover:bg-[var(--jitter-gray-100)]"
              >
                <span aria-hidden="true">{e.char}</span>
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}
