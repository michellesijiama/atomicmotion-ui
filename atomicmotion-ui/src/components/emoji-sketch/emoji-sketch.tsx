"use client";

import * as React from "react";
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

// Quick-pick set. A subset is bundled in /public/emoji; the rest falls back to OpenMoji CDN.
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
  { char: "🙂", hex: "1F642", label: "Smile" },
  { char: "😂", hex: "1F602", label: "Joy" },
  { char: "😎", hex: "1F60E", label: "Sunglasses" },
  { char: "😉", hex: "1F609", label: "Wink" },
  { char: "🥳", hex: "1F973", label: "Party" },
  { char: "👍", hex: "1F44D", label: "Thumbs up" },
  { char: "👏", hex: "1F44F", label: "Clap" },
  { char: "👀", hex: "1F440", label: "Eyes" },
  { char: "🧠", hex: "1F9E0", label: "Brain" },
  { char: "🤖", hex: "1F916", label: "Robot" },
  { char: "👻", hex: "1F47B", label: "Ghost" },
  { char: "👽", hex: "1F47D", label: "Alien" },
  { char: "🍕", hex: "1F355", label: "Pizza" },
  { char: "🍔", hex: "1F354", label: "Burger" },
  { char: "🍩", hex: "1F369", label: "Donut" },
  { char: "🎵", hex: "1F3B5", label: "Music" },
  { char: "🎨", hex: "1F3A8", label: "Palette" },
  { char: "📷", hex: "1F4F7", label: "Camera" },
  { char: "💎", hex: "1F48E", label: "Gem" },
  { char: "🎈", hex: "1F388", label: "Balloon" },
];

const GEOMETRY = "path, circle, ellipse, line, polyline, polygon, rect";
const BRUSH = 0.45;
const MASK_W = 3;
const CDN = "https://cdn.jsdelivr.net/npm/openmoji@15.0.0/black/svg";

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

export function EmojiSketch({ initial = "2764", loop = false, className }: EmojiSketchProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const [active, setActive] = React.useState(initial);
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [runId, setRunId] = React.useState(0);
  const [notFound, setNotFound] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

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

  const pick = (e: EmojiDef) => {
    if (e.hex === active) setRunId((r) => r + 1);
    else setActive(e.hex);
  };

  const handleStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    event.currentTarget.style.setProperty("--emoji-tilt-x", `${(-y * 9).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--emoji-tilt-y", `${(x * 11).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--emoji-pan-x", `${(x * 10).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--emoji-pan-y", `${(y * 8).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--emoji-lift", "18px");
    event.currentTarget.style.setProperty("--emoji-shadow-x", `${(-x * 18).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--emoji-shadow-y", `${(12 - y * 10).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--emoji-shadow-opacity", "0.2");
  };

  const handleStagePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--emoji-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--emoji-tilt-y", "0deg");
    event.currentTarget.style.setProperty("--emoji-pan-x", "0px");
    event.currentTarget.style.setProperty("--emoji-pan-y", "0px");
    event.currentTarget.style.setProperty("--emoji-lift", "0px");
    event.currentTarget.style.setProperty("--emoji-shadow-x", "0px");
    event.currentTarget.style.setProperty("--emoji-shadow-y", "16px");
    event.currentTarget.style.setProperty("--emoji-shadow-opacity", "0.08");
  };

  return (
    <div
      className={cn(
        "relative isolate grid h-full min-h-full w-full grid-cols-[minmax(0,1fr)_112px] items-center gap-5 px-6 py-8",
        className,
      )}
      style={{
        "--emoji-ink": "var(--jitter-ink, #0e1011)",
        "--emoji-tilt-x": "0deg",
        "--emoji-tilt-y": "0deg",
        "--emoji-pan-x": "0px",
        "--emoji-pan-y": "0px",
        "--emoji-lift": "0px",
        "--emoji-shadow-x": "0px",
        "--emoji-shadow-y": "16px",
        "--emoji-shadow-opacity": "0.08",
      } as React.CSSProperties}
    >
      {/* Sticker stage */}
      <div
        className="relative flex w-full flex-1 items-center justify-center [perspective:900px]"
        onPointerMove={handleStagePointerMove}
        onPointerLeave={handleStagePointerLeave}
      >
        {strokes.length > 0 ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/20 blur-2xl transition-[opacity,transform] duration-500 ease-out"
              style={{
                opacity: "var(--emoji-shadow-opacity)",
                transform:
                  "translate3d(calc(-50% + var(--emoji-shadow-x)), calc(-50% + var(--emoji-shadow-y)), 0) scale(0.92)",
              }}
            />
            <svg
              ref={svgRef}
              viewBox="0 0 72 72"
              className="relative z-10 h-auto max-h-[40vh] w-full max-w-[280px] origin-center transition-[filter,transform] duration-500 ease-out [transform-style:preserve-3d]"
              style={{
                filter:
                  "drop-shadow(calc(var(--emoji-shadow-x) * 0.16) calc(var(--emoji-shadow-y) * 0.18) 4px rgba(14,16,17,0.14))",
                transform:
                  "translate3d(var(--emoji-pan-x), var(--emoji-pan-y), var(--emoji-lift)) rotateX(var(--emoji-tilt-x)) rotateY(var(--emoji-tilt-y))",
              }}
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
                <filter
                  id={`emoji-depth-${uid}`}
                  x="-12%"
                  y="-12%"
                  width="124%"
                  height="124%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur stdDeviation="0.55" />
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
              <g
                filter={`url(#emoji-depth-${uid})`}
                opacity="0.18"
                transform="translate(1.35 1.8)"
              >
                {strokes.map((s, i) => (
                  <path key={i} d={s.outline} fill="var(--emoji-ink)" mask={`url(#em-${uid}-${i})`} />
                ))}
              </g>
              <g filter={`url(#emoji-ink-${uid})`}>
                {strokes.map((s, i) => (
                  <path key={i} d={s.outline} fill="var(--emoji-ink)" mask={`url(#em-${uid}-${i})`} />
                ))}
              </g>
            </svg>
          </>
        ) : (
          <p className="text-body text-[var(--jitter-gray-400)]">
            {notFound ? "Couldn't sketch that one — try another emoji." : "Pick an emoji."}
          </p>
        )}
      </div>

      <aside
        className="grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto rounded-[26px] bg-white/65 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur-xl"
        aria-label="Emoji choices"
      >
        {EMOJIS.map((emoji) => {
          const selected = emoji.hex === active;
          return (
            <button
              key={emoji.hex}
              type="button"
              aria-label={emoji.label}
              aria-pressed={selected}
              onClick={() => pick(emoji)}
              className={cn(
                "inline-flex aspect-square items-center justify-center rounded-2xl text-[22px] leading-none transition-colors",
                selected
                  ? "bg-[var(--jitter-ink)] text-white"
                  : "text-[var(--jitter-ink)] hover:bg-[var(--jitter-gray-100)]",
              )}
            >
              <span aria-hidden="true">{emoji.char}</span>
            </button>
          );
        })}
      </aside>
    </div>
  );
}
