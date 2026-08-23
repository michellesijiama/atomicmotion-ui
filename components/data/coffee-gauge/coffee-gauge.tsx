"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CoffeeGaugeProps = {
  /** 0–100 per cup, in order: latte, espresso, cappuccino. Leave undefined and
   *  the card pours on its own until someone opens it and logs a drink. */
  values?: [number, number, number];
  /** Defaults to "Coffee consumption". */
  title?: string;
  /** Present for gallery parity — the card animates either way. */
  loop?: boolean;
  className?: string;
};

/* Flat, saturated poster colours: dark-roast silhouettes on periwinkle, with
   grain over everything to keep it from going digital-clean. */
const PALETTE = {
  paper: "#93A6DB",
  ink: "#2E1B0F",
  cup: "#43291A",
  // Text sits in the dark half of the palette on purpose. Cream or pink type on
  // periwinkle measures about 1.8:1 and 1.4:1 — nowhere near the 4.5:1 WCAG AA
  // asks for at these sizes. Brown lands at 7.7:1 and the wine at 5.0:1, and it
  // matches the source illustration, which keeps its captions dark and spends
  // its pink on the one display word.
  wine: "#6E2437",
  // Blush fills the undrunk part of each cup and draws its outline. As type it
  // would be unusable (1.4:1 on the card) and its edge against the card is only
  // 1.40:1 — under the 3:1 WCAG 1.4.11 wants of a meaningful graphic. What keeps
  // the gauge readable anyway is that the *reading* never depends on that edge:
  // the level is coffee against blush, which is 8.7:1, and a wide hue shift plus
  // the letterpress highlight carry the silhouette against the periwinkle.
  blush: "#F5C4D3",
  // Foam on top of a pour. Decorative, non-text.
  foam: "#FBF3E7",
};

/** Every cup is authored on its own 120×120 field. */
const FIELD = 120;

type Cup = {
  key: string;
  label: string;
  /** Closed silhouette the coffee is clipped to. */
  body: string;
  /** The handle, drawn in outline only — coffee never fills a handle. */
  handle: string;
  /** Top and bottom of `body`, so a level means a fraction of that cup. */
  bounds: [number, number];
  /** How many of this drink counts as a full day. */
  limit: number;
  /** The band this drink drifts within while the card is idling. */
  range: [number, number];
  /** Milliseconds this cup holds a value before moving to the next. Deliberately
   *  co-prime-ish across the three, so they never fall back into step. */
  period: number;
  /** Head start, so they don't all move the moment the card mounts. */
  offset: number;
};

/* Three silhouettes, each with its own character: the latte is a tall straight
   mug, the espresso is squat and tapered, the cappuccino has a wobbling wall.
   Empty, each reads as an outline; full, each reads as the solid shape. */
const CUPS: Cup[] = [
  {
    key: "latte",
    label: "Latte",
    body: "M38,22 H84 V92 C84,96 80,100 76,100 H46 C42,100 38,96 38,92 Z",
    handle: "M38,38 H22 C13,38 8,44 8,52 C8,60 13,66 22,66 H38",
    bounds: [22, 100],
    limit: 4,
    range: [28, 95],
    period: 2900,
    offset: 0,
  },
  {
    key: "espresso",
    label: "Espresso",
    body: "M26,50 H94 C94,50 90,84 81,93 C77,97 43,97 39,93 C30,84 26,50 26,50 Z",
    handle: "M26,58 C10,58 4,66 6,74 C8,82 18,86 28,84",
    bounds: [50, 96],
    limit: 6,
    range: [18, 88],
    period: 3700,
    offset: 1250,
  },
  {
    key: "cappuccino",
    label: "Cappuccino",
    body: "M34,24 C42,33 30,41 38,50 C46,59 30,67 38,76 C44,84 34,90 42,95 C48,99 73,99 79,94 C86,88 76,81 83,73 C90,65 75,57 82,48 C89,39 75,32 81,24 Z",
    handle: "M83,44 C99,42 107,52 105,62 C103,72 93,76 83,74",
    bounds: [24, 99],
    limit: 4,
    range: [24, 92],
    period: 3200,
    offset: 2100,
  },
];

/** How long a value takes to pour into place, once it starts moving. */
const TWEEN_MS = 1000;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** The cubic-bezier(0.65, 0, 0.35, 1) ease-in-out, in closed form. */
function easeInOutCubic(p: number) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/**
 * Deterministic pseudo-random in [0, 1). A hand-written cycle of four values
 * reads as a loop within about ten seconds, but `Math.random` would disagree
 * between the server render and the first client render — so this stands in:
 * genuinely scattered, and identical on both sides because it is a pure
 * function of the step index.
 */
function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** The value this cup rests at during its `n`-th step. */
function stopAt(cup: Cup, cupIndex: number, n: number) {
  const [lo, hi] = cup.range;
  return lo + hash01(n * 7.13 + cupIndex * 41.7) * (hi - lo);
}

/**
 * Where a cup sits while the card is idling. Each cup runs on its own period
 * and offset, so the three drift independently instead of stepping together —
 * which is what made the old synchronised version look mechanical.
 */
function idleLevel(cup: Cup, cupIndex: number, ms: number) {
  const phase = ms + cup.offset;
  const n = Math.floor(phase / cup.period);
  const p = clamp((phase - n * cup.period) / TWEEN_MS, 0, 1);
  const from = stopAt(cup, cupIndex, n);
  const to = stopAt(cup, cupIndex, n + 1);
  return from + (to - from) * easeInOutCubic(p);
}

/**
 * The coffee's surface. Two out-of-phase sines keep it from reading as a clean
 * sine — liquid in a small vessel never settles into one frequency. `seed`
 * offsets each cup so the three never slosh in lockstep.
 */
function crestPoints(
  level: number,
  t: number,
  bounds: [number, number],
  seed: number,
): string {
  const [top, bottom] = bounds;
  // Overshoot both ends so 0 is bone dry and 100 leaves no sliver of the cup.
  const base = bottom + 4 - clamp(level, 0, 1) * (bottom - top + 8);
  // Flatten the surface as the cup fills: less headroom, less slosh.
  const amp = 3.2 * (0.35 + 0.65 * Math.sin(Math.PI * clamp(level, 0, 1)));
  let d = "";
  for (let x = -12; x <= FIELD + 12; x += 5) {
    const u = x / FIELD;
    const y =
      base +
      Math.sin(u * Math.PI * 2.4 + t * 1.5 + seed) * amp +
      Math.sin(u * Math.PI * 5.3 - t * 2.2 + seed) * amp * 0.42;
    d += `${d ? "L" : "M"}${x.toFixed(1)},${y.toFixed(2)} `;
  }
  return d;
}

/** The surface closed off below the field, so it fills as a body of coffee. */
function coffeePath(
  level: number,
  t: number,
  bounds: [number, number],
  seed: number,
): string {
  return `${crestPoints(level, t, bounds, seed)}L${FIELD + 12},${FIELD + 24} L-12,${FIELD + 24} Z`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** A logged tally, and the pour that carried the gauges to it. */
type Logged = {
  counts: [number, number, number];
  from: number[];
  to: number[];
  at: number;
};

export function CoffeeGauge({
  values,
  title = "Coffee consumption",
  className,
}: CoffeeGaugeProps) {
  const uid = React.useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();

  const controlled = values !== undefined;
  const [clockMs, setClockMs] = React.useState(0);
  const [expanded, setExpanded] = React.useState(false);
  // Null until someone logs a drink; from then on the card shows their tally
  // instead of idling.
  const [logged, setLogged] = React.useState<Logged | null>(null);

  // A single rAF is the only clock in the component: it drives the idle drift,
  // the pour after a tap, and the sloshing surface.
  React.useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      setClockMs(now - started);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const levels = React.useMemo(
    () =>
      CUPS.map((cup, i) => {
        if (controlled) return clamp(values[i], 0, 100);
        if (!logged) return idleLevel(cup, i, clockMs);
        const p = clamp((clockMs - logged.at) / TWEEN_MS, 0, 1);
        return logged.from[i] + (logged.to[i] - logged.from[i]) * easeInOutCubic(p);
      }),
    [controlled, values, logged, clockMs],
  );

  const counts = React.useMemo(
    () =>
      logged
        ? logged.counts
        : (CUPS.map((cup, i) =>
            Math.round((levels[i] / 100) * cup.limit),
          ) as [number, number, number]),
    [logged, levels],
  );

  /**
   * Opening the log commits the tally. Without this the counts keep tracking
   * the idle drift while the panel is on screen, so the first tap would appear
   * to change all three cups at once — you'd be adjusting whatever number the
   * animation had drifted to, not the one you were looking at. Committing on
   * open pours each cup to its nearest whole drink and holds it there.
   */
  const toggle = () => {
    if (!expanded && !logged && !controlled) {
      const committed = CUPS.map((cup, i) =>
        clamp(Math.round((levels[i] / 100) * cup.limit), 0, cup.limit),
      ) as [number, number, number];
      setLogged({
        counts: committed,
        from: levels,
        to: CUPS.map((cup, i) => (committed[i] / cup.limit) * 100),
        at: clockMs,
      });
    }
    setExpanded((open) => !open);
  };

  const adjust = (index: number, delta: number) => {
    const next = [...counts] as [number, number, number];
    next[index] = clamp(next[index] + delta, 0, CUPS[index].limit);
    setLogged({
      counts: next,
      // Pour from wherever the gauges happen to be, so the first tap out of the
      // idle state doesn't jump.
      from: levels,
      to: CUPS.map((cup, i) => (next[i] / cup.limit) * 100),
      at: clockMs,
    });
  };

  const t = reduced ? 0 : clockMs / 1000;

  return (
    <div
      className={cn(
        "flex h-full min-h-full w-full flex-1 items-center justify-center",
        className,
      )}
    >
      <div
        className="relative flex h-fit w-[336px] flex-col gap-5 overflow-hidden rounded-[20px] px-5 py-4"
        style={{
          // Translucent rather than solid, so whatever sits behind it tints the
          // sheet the way light does through real stock.
          background: `${PALETTE.paper}e0`,
          backdropFilter: "blur(12px) saturate(1.1)",
          WebkitBackdropFilter: "blur(12px) saturate(1.1)",
          border: `1px solid ${PALETTE.ink}2e`,
          color: PALETTE.ink,
          fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
        }}
      >
        {/* The sheet itself: coarse mottling, fine fibre grain and darkened
            edges — what separates printed stock from a flat rectangle. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <filter id={`${uid}-paper`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="4"
                seed="11"
              />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.22" />
              </feComponentTransfer>
            </filter>
            <filter id={`${uid}-foxing`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.014"
                numOctaves="4"
                seed="23"
              />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.15" intercept="-0.04" />
              </feComponentTransfer>
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#${uid}-foxing)`} />
          <rect width="100%" height="100%" filter={`url(#${uid}-paper)`} />
        </svg>

        <header className="relative flex items-center justify-between">
          <span
            className="text-[15px] italic"
            style={{ color: PALETTE.ink, letterSpacing: "0.01em" }}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={`${uid}-log`}
            className="-mr-1 grid h-7 w-7 place-items-center rounded-full transition-colors"
            style={{ color: PALETTE.ink }}
          >
            <span className="sr-only">
              {expanded ? "Hide the log" : "Log a drink"}
            </span>
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 opacity-70 transition-transform duration-300"
              style={{ transform: expanded ? "rotate(180deg)" : undefined }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M3.5 6l4.5 4.5L12.5 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <div className="relative grid grid-cols-3 gap-2">
          {CUPS.map((cup, i) => {
            const level = levels[i] / 100;
            const reading = Math.round(levels[i]);
            const seed = i * 1.7;
            const coffee = coffeePath(level, t, cup.bounds, seed);
            const crest = crestPoints(level, t, cup.bounds, seed);

            return (
              <div key={cup.key} className="flex flex-col items-center gap-1">
                <svg
                  viewBox={`0 0 ${FIELD} ${FIELD}`}
                  className="h-[86px] w-[86px]"
                  role="img"
                  aria-label={`${cup.label}: ${reading}%`}
                >
                  <defs>
                    {/* A soft irregular edge on the coffee, so the level looks
                        poured rather than masked. */}
                    <filter
                      id={`${uid}-${cup.key}-pour`}
                      x="-25%"
                      y="-25%"
                      width="150%"
                      height="150%"
                    >
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.04"
                        numOctaves="3"
                        seed={7 + i}
                        result="n"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="n"
                        scale="3"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                    {/* Pencil wobble, so every line is drawn, not plotted. */}
                    <filter
                      id={`${uid}-${cup.key}-pencil`}
                      x="-15%"
                      y="-15%"
                      width="130%"
                      height="130%"
                    >
                      <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.05"
                        numOctaves="2"
                        seed={3 + i}
                        result="n"
                      />
                      <feDisplacementMap
                        in="SourceGraphic"
                        in2="n"
                        scale="1.1"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                    {/* Letterpress. A blurred copy of the shape's own alpha is
                        used as a height map, then lit from the top left — so the
                        edges catch a highlight and the shape sits in the stock
                        rather than on it. Both layers it runs on are static, so
                        the browser can cache the result instead of relighting
                        every animation frame. */}
                    <filter
                      id={`${uid}-${cup.key}-emboss`}
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feGaussianBlur
                        in="SourceAlpha"
                        stdDeviation="0.7"
                        result="height"
                      />
                      <feSpecularLighting
                        in="height"
                        surfaceScale="1.8"
                        specularConstant="0.5"
                        specularExponent="18"
                        lightingColor="#ffffff"
                        result="lit"
                      >
                        <feDistantLight azimuth="235" elevation="52" />
                      </feSpecularLighting>
                      <feComposite
                        in="lit"
                        in2="SourceAlpha"
                        operator="in"
                        result="litIn"
                      />
                      <feComposite
                        in="SourceGraphic"
                        in2="litIn"
                        operator="arithmetic"
                        k1="0"
                        k2="1"
                        k3="1"
                        k4="0"
                      />
                    </filter>
                    <clipPath id={`${uid}-${cup.key}-clip`}>
                      <path d={cup.body} />
                    </clipPath>
                  </defs>

                  {/* The undrunk half. Pink here is what makes the level readable
                      at a glance — and what keeps a drained cup from looking like
                      an empty outline. */}
                  <path
                    d={cup.body}
                    fill={PALETTE.blush}
                    filter={`url(#${uid}-${cup.key}-emboss)`}
                  />

                  {/* The coffee. At 100% it covers the silhouette exactly, so a
                      full cup is the solid shape and an empty one is the
                      outline — the gauge and the illustration are one drawing. */}
                  <g clipPath={`url(#${uid}-${cup.key}-clip)`}>
                    <g filter={`url(#${uid}-${cup.key}-pour)`}>
                      <path d={coffee} fill={PALETTE.cup} />
                    </g>
                    {/* Crema: the lighter band that sits on top of a pour. */}
                    <path
                      d={crest}
                      fill="none"
                      stroke={PALETTE.foam}
                      strokeWidth="2.4"
                      strokeOpacity={0.5 * Math.min(1, level * 4)}
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Outline last — pressed in like the fill, so the drawn line
                      and the shape sit on the same plane of the paper. */}
                  <g filter={`url(#${uid}-${cup.key}-emboss)`}>
                    <g
                      filter={`url(#${uid}-${cup.key}-pencil)`}
                      stroke={PALETTE.blush}
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={cup.body} />
                      <path d={cup.handle} />
                    </g>
                  </g>
                </svg>

                <span
                  className="text-[11px] italic leading-none"
                  style={{ color: PALETTE.ink, opacity: 0.9 }}
                >
                  {cup.label}
                </span>
                <span
                  className="text-[20px] leading-none"
                  style={{
                    color: PALETTE.ink,
                    fontVariantNumeric: "lining-nums tabular-nums",
                  }}
                >
                  {reading}
                  <span className="ml-[3px] text-[11px]">%</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* The log. `grid-template-rows` from 0fr to 1fr is what lets this
            animate open to its own height without hard-coding one. */}
        <div
          id={`${uid}-log`}
          className="relative -mt-1 grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div
              className="flex flex-col gap-2 pt-3"
              style={{ borderTop: `1px solid 33` }}
            >
              {CUPS.map((cup, i) => (
                <div
                  key={cup.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span
                    className="text-[12px] italic"
                    style={{ color: PALETTE.ink, opacity: 0.9 }}
                  >
                    {cup.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <StepButton
                      label={`One less ${cup.label}`}
                      glyph="−"
                      disabled={!expanded || counts[i] <= 0}
                      onClick={() => adjust(i, -1)}
                    />
                    <span
                      className="w-[52px] text-center text-[12px]"
                      style={{
                        color: PALETTE.ink,
                        fontVariantNumeric: "lining-nums tabular-nums",
                      }}
                    >
                      {counts[i]} / {cup.limit}
                    </span>
                    <StepButton
                      label={`One more ${cup.label}`}
                      glyph="+"
                      disabled={!expanded || counts[i] >= cup.limit}
                      onClick={() => adjust(i, 1)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-6 w-6 place-items-center rounded-full text-[13px] leading-none transition-opacity disabled:opacity-30"
      style={{
        color: PALETTE.ink,
        // Drawn, not filled — the same brown stroke the cups are outlined in,
        // so the controls read as part of the illustration.
        background: "transparent",
        border: `1.5px solid ${PALETTE.ink}`,
      }}
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
