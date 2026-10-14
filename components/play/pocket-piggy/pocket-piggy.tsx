"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PocketPiggyProps = {
  /** Accepted for the gallery card. The piggy simply idles on its own;
   *  there are no scripted presses. */
  loop?: boolean;
  /** The largest the device is shown, in px. It still shrinks to fit. */
  maxSize?: number;
  className?: string;
};

/** The device's true size. It is scaled down to fit whatever it is put in. */
const DECK = 440;

/** The largest it is shown by default, however much room it has. */
const MAX_SIZE = 420;

/** The CRT effects layer's own resolution. Drawn small and scaled up. */
const W = 320;
const H = 183;

/** The screen, in the units the doodle is drawn in. */
const SW = 388;
const SH = 222;

/** Where the doodle is first frozen at, for the still frame. */
const REST_TIME = 3.1;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** A small seeded generator, so everything is the same on the server and in
 *  the browser and from one visit to the next. */
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

/** Integer hash to 0–1, for dust that hops somewhere new on each beat. */
function hash(a: number, b: number, c: number) {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const DUST_COLOURS = ["#ff2a2a", "#22e05a", "#2b4bff", "#ffe030", "#ffffff", "#0a0a0a"];

/** A scatter of flecks, each with its own beat. Position is hashed from the
 *  beat, so a fleck hops to a fresh spot every period instead of drifting.
 *  Small and faint, so the piggy stays the focus. */
const DUST = (() => {
  const rnd = mulberry32(0x5eed);
  return Array.from({ length: 22 }, (_, i) => ({
    period: 0.7 + rnd() * 1.9,
    phase: rnd(),
    size: 2 + Math.floor(rnd() * 2),
    colour: DUST_COLOURS[i % DUST_COLOURS.length],
  }));
})();

/* ------------------------------------------------------------------------- */
/* The home: a little room seen from straight above                           */
/* ------------------------------------------------------------------------- */

const ROOM_INK = "#3a3a3a";

type Pt = { x: number; y: number };
const pt = (x: number, y: number): Pt => ({ x, y });

/** Places in the room, in screen units. A pig's position is where its feet are. */
const HUB = pt(206, 108);
const GAP = pt(206, 64);
const BED_SIDE = pt(86, 114);
const HOME = pt(172, 150);
const EAT = pt(236, 160);
const BED = pt(43, 106);
const BED_SIT = pt(44, 132);
const DESK = pt(322, 130);
const WATER = pt(172, 52);
const FISH = pt(146, 98);
const STRETCH = pt(206, 112);
const WANDER = [pt(298, 124), pt(176, 80), pt(206, 112), pt(120, 120)];
const SLOTS = [pt(255, 142), pt(274, 136), pt(277, 152)];
const LAMP = pt(356, 146);
const BALCONY_PLANT = pt(140, 40);

/** The things the piggy can be asked to do, in the order of the picker. */
const ACTIVITIES = [
  { id: "water", label: "Water the plants", dur: 3.6, route: [GAP, WATER] },
  { id: "desk", label: "Work at the desk", dur: 3.6, route: [DESK] },
  { id: "read", label: "Read a book", dur: 3.6, route: [BED_SIDE, BED_SIT] },
  { id: "fish", label: "Feed the fish", dur: 3.2, route: [FISH] },
  { id: "dance", label: "Dance", dur: 3.4, route: [HOME] },
  { id: "stretch", label: "Stretch", dur: 2.8, route: [STRETCH] },
] as const;

/** Dotted leaf clusters for the plants, the same wherever they are drawn. */
function leaves(seed: number, n: number, r: number) {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r;
    return {
      x: Math.round(Math.cos(a) * d * 10) / 10,
      y: Math.round(Math.sin(a) * d * 10) / 10 - r * 0.2,
      s: Math.round((1.7 + rnd() * 1.9) * 10) / 10,
      c: rnd() < 0.5 ? "#8fcf9c" : "#6fba85",
    };
  });
}

/* ------------------------------------------------------------------------- */
/* The doodle: drawn in the artist's own 960 by 1280 sheet                    */
/* ------------------------------------------------------------------------- */

const INK = "#1f9a5a";
const EYE = "#3b2f33";
/** The piggy is all one soft pink: its own line is a deeper rose. */
const PIG_INK = "#d4628c";

/** The sheet's units to screen units, and where the feet sit on the sheet. */
const PIG_S = 0.15;
const DRAW_CX = 486;
const DRAW_FEET = 860;
const pigTransform = (x: number, y: number) =>
  `translate(${x} ${y}) rotate(0) scale(${PIG_S} ${PIG_S}) translate(${-DRAW_CX} ${-DRAW_FEET})`;
/** Where the mouth is, relative to the feet, in screen units. */
const MOUTH_DX = (490 - DRAW_CX) * PIG_S;
const MOUTH_DY = (722 - DRAW_FEET) * PIG_S;

const TICKS = [
  { d: "M454 541 L458 553", cx: 456, cy: 547 },
  { d: "M477 536 L484 552", cx: 480, cy: 544 },
  { d: "M519 538 L521 546", cx: 520, cy: 542 },
];

const SMILE = "M459 724 Q487 748 513 728 Q525 716 525 698";
const SMILE_SOFT = "M472 722 Q491 735 510 722";

/* ------------------------------------------------------------------------- */
/* The world                                                                  */
/* ------------------------------------------------------------------------- */

type Mode = "idle" | "eat" | "happy" | "sleep" | "act";
type Apple = { x: number; y: number; age: number; bites: number; k: number };
type Heart = { x: number; y: number; t0: number };
type Crumb = { x: number; y: number; vx: number; vy: number; t0: number; kind: number };
type Zed = { x: number; y: number; t0: number };
type Cmd = "sleep" | "feed" | "home" | number;

type World = {
  t: number;
  night: number;
  asleep: boolean;
  tuck: number;
  fullness: number;
  fullShown: number;
  fullAt: number;
  puff: number;
  mode: Mode;
  modeT: number;
  bounce: boolean;
  heartN: number;
  popAt: number;
  biteT: number;
  open: number;
  pig: { x: number; y: number; phase: number };
  route: Pt[];
  goal: string;
  speedK: number;
  walking: boolean;
  act: { i: number; state: "go" | "do"; t0: number } | null;
  homeReq: boolean;
  idleUntil: number;
  apples: Apple[];
  hearts: Heart[];
  crumbs: Crumb[];
  zeds: Zed[];
  lastZ: number;
};

function newWorld(): World {
  return {
    t: REST_TIME,
    night: 0,
    asleep: false,
    tuck: 0,
    fullness: 0,
    fullShown: 0,
    fullAt: 0,
    puff: 0,
    mode: "idle",
    modeT: 0,
    bounce: false,
    heartN: 0,
    popAt: -10,
    biteT: 0,
    open: 0,
    pig: { x: HOME.x, y: HOME.y, phase: 0 },
    route: [],
    goal: "",
    speedK: 0,
    walking: false,
    act: null,
    homeReq: false,
    idleUntil: REST_TIME + 3,
    apples: [],
    hearts: [],
    crumbs: [],
    zeds: [],
    lastZ: -10,
  };
}

/** SVG fractal noise as a CSS background: the sandblasted grain of the body
 *  and the keys, with no image asset. Grey, opaque, laid on with soft-light. */
function grain(frequency: number, size: number, seed: number, gain: number) {
  const offset = (0.5 * (1 - gain)).toFixed(3);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
    `<filter id='g' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='3' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='${gain} 0 0 0 ${offset} ${gain} 0 0 0 ${offset} ${gain} 0 0 0 ${offset} 0 0 0 0 1'/>` +
    `</filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/"/g, "'")}")`;
}

const BODY_GRAIN = grain(1.6, 128, 7, 1.2);
const KEY_GRAIN = grain(0.95, 160, 11, 1.6);


/* ------------------------------------------------------------------------- */
/* The hardware                                                               */
/* ------------------------------------------------------------------------- */

/** The body's outer corner, and how far in from the body's edge the screen
 *  sits. The screen's top corners are concentric with the body's, so the glass
 *  curves parallel to the machine's own shoulders. */
const BODY_RADIUS = 68;
const SCREEN_INSET = 27;
const SCREEN_TOP_RADIUS = BODY_RADIUS - SCREEN_INSET;

/** How tall the skirt shows under the face at rest, and how far the face
 *  travels down when pressed (leaving 2px of skirt). */
const SKIRT = 8;
const SINK = 6;

/** One corner for every key and the bottom of the screen glass, so they read
 *  as a set; the bezel ring and the tray step out from it concentrically. */
const KEY_RADIUS = 16;
/** The face sits a pixel inside the skirt. */
const FACE_RADIUS = KEY_RADIUS - 1;

const glassRadius = (grow = 0) =>
  `${SCREEN_TOP_RADIUS + grow}px ${SCREEN_TOP_RADIUS + grow}px ${KEY_RADIUS + grow}px ${KEY_RADIUS + grow}px`;

type GlyphId = "sleep" | "feed" | "home" | "play" | "prev" | "ok" | "next" | "close";

function Glyph({ id }: { id: GlyphId }) {
  const stroke = {
    fill: "none",
    stroke: "#ecebe5",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 32 32"
      width={34}
      height={34}
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 2.5px rgba(255,255,255,0.38))", overflow: "visible" }}
    >
      {id === "sleep" && (
        <g {...stroke}>
          <path d="M23.4 19.6 A9.6 9.6 0 1 1 12.4 8.6 A7.6 7.6 0 0 0 23.4 19.6 Z" />
        </g>
      )}
      {id === "feed" && (
        <g {...stroke}>
          <path d="M16 11.4 C13.8 9.4 8.8 9.8 7.6 14.4 C6.6 18.8 9.6 25.6 12.6 25.8 C14 25.9 14.8 25 16 25 C17.2 25 18 25.9 19.4 25.8 C22.4 25.6 25.4 18.8 24.4 14.4 C23.2 9.8 18.2 9.4 16 11.4 Z" />
          <path d="M16 11.4 C16 9.4 16.6 7.8 18 6.6" />
          <path d="M18.2 9.2 C18.6 7.2 20.4 6 22.4 6.2 C22.4 8.2 20.8 9.8 18.2 9.2 Z" />
        </g>
      )}
      {id === "home" && (
        <g {...stroke}>
          <path d="M4.6 15.4 L16 5.8 L27.4 15.4" />
          <path d="M7.8 13.4 V25.8 H24.2 V13.4" />
          <path d="M13.4 25.8 V18.4 H18.6 V25.8" />
        </g>
      )}
      {id === "play" && (
        <g {...stroke}>
          <path d="M14 6 Q15.4 14.6 24 16.2 Q15.4 17.8 14 26.4 Q12.6 17.8 4 16.2 Q12.6 14.6 14 6 Z" />
          <path d="M25 4.6 V10.6 M22 7.6 H28" />
        </g>
      )}
      {id === "prev" && (
        <g {...stroke}>
          <path d="M21 7.6 L9.6 16 L21 24.4 Z" />
        </g>
      )}
      {id === "next" && (
        <g {...stroke}>
          <path d="M11 7.6 L22.4 16 L11 24.4 Z" />
        </g>
      )}
      {id === "ok" && (
        <g {...stroke}>
          <path d="M7 17 L13.4 23.4 L25.4 9" />
        </g>
      )}
      {id === "close" && (
        <g {...stroke}>
          <path d="M9 9 L23 23 M23 9 L9 23" />
        </g>
      )}
    </svg>
  );
}

/** Tiny doodle icons for the picker's bubbles, in the room's ink and flat fills. */
function ActivityIcon({ id }: { id: (typeof ACTIVITIES)[number]["id"] }) {
  const ink = { stroke: ROOM_INK, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
      {id === "water" && (
        <g {...ink}>
          <path d="M8 16.5 H16 L15 22 H9 Z" fill="#e0a68a" />
          <path d="M12 16.5 V10" fill="none" />
          <path d="M12 12.6 Q7.6 12 6.6 7.6 Q11 7.4 12 11.8 Z" fill="#8fcf9c" />
          <path d="M12 11.4 Q16.4 10.8 17.6 6.4 Q13.2 6.2 12 10.6 Z" fill="#8fcf9c" />
        </g>
      )}
      {id === "desk" && (
        <g {...ink}>
          <path d="M4.5 5.5 H19.5 V15 H4.5 Z" fill="#cfe0f5" />
          <path d="M9.5 19.4 H14.5 M12 15 V19.4" fill="none" />
        </g>
      )}
      {id === "read" && (
        <g {...ink}>
          <path d="M3 6.4 Q7.6 4.2 12 7 Q16.4 4.2 21 6.4 V18 Q16.4 16 12 19 Q7.6 16 3 18 Z" fill="#fff" />
          <path d="M12 7 V19" fill="none" />
          <path d="M5.6 9.4 Q8 8.6 9.6 9.6 M14.4 9.6 Q16 8.6 18.4 9.4" fill="none" strokeWidth="1" />
        </g>
      )}
      {id === "fish" && (
        <g {...ink}>
          <path d="M3.5 12 Q8.5 5.4 14.6 12 Q8.5 18.6 3.5 12 Z" fill="#f2a65a" />
          <path d="M14.6 12 L20.6 7.6 V16.4 Z" fill="#f2a65a" />
          <circle cx="7.4" cy="11" r="0.9" fill={ROOM_INK} stroke="none" />
        </g>
      )}
      {id === "dance" && (
        <g {...ink}>
          <path d="M9.4 17.4 V6.4 L18.4 4.6 V15.6" fill="none" />
          <ellipse cx="7.4" cy="17.8" rx="2.6" ry="2" fill="#f6a8c8" />
          <ellipse cx="16.4" cy="16" rx="2.6" ry="2" fill="#f6a8c8" />
        </g>
      )}
      {id === "stretch" && (
        <g {...ink}>
          <circle cx="12" cy="6.6" r="2.4" fill="#fff" />
          <path d="M12 9.4 V16.4 M12 11 L6.6 5.6 M12 11 L17.4 5.6 M9.4 21 L12 16.4 L14.6 21" fill="none" />
        </g>
      )}
    </svg>
  );
}

const NOISE_W = 160;
const NOISE_H = 92;

/** The room, drawn once: wood floor, balcony, bed, desk and the rest, all in
 *  thin dark ink over flat soft fills. */
function Plant({ cx, cy, seed, n = 11, r = 11, pot = 6 }: { cx: number; cy: number; seed: number; n?: number; r?: number; pot?: number }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={pot} fill="#f1ebe0" stroke={ROOM_INK} strokeWidth="1.1" />
      {leaves(seed, n, r).map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={l.s} fill={l.c} />
      ))}
    </g>
  );
}

function Room({ uid }: { uid: string }) {
  const line = { stroke: ROOM_INK, strokeWidth: 1.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-window`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2a6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffe2a6" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-lampDay`}>
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${uid}-plaid`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#4b5aa3" />
          <path d="M6 0 V12 M0 6 H12" stroke="#cdd4f2" strokeWidth="0.9" />
          <path d="M0 0 V12 M0 0 H12" stroke="#3a4885" strokeWidth="1.2" opacity="0.7" />
        </pattern>
        <clipPath id={`${uid}-floorClip`}>
          <rect x="9" y="58" width="370" height="154" />
        </clipPath>
      </defs>

      {/* Outside, the balcony floor, and the wooden floor of the room. */}
      <rect x="0" y="0" width={SW} height="26" fill="#cfe0f5" />
      <rect x="0" y="26" width={SW} height="26" fill="#d9cfba" />
      <g stroke="#c8bca2" strokeWidth="0.8">
        {Array.from({ length: 27 }, (_, i) => (
          <path key={i} d={`M${6 + i * 14.6} 26 V52`} />
        ))}
      </g>
      <path d="M4 26 H384" stroke={ROOM_INK} strokeWidth="1.5" />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${6 + i * 29} 26 V31`} stroke={ROOM_INK} strokeWidth="1" />
      ))}
      <rect x="0" y="52" width={SW} height={SH - 52} fill="#fbf3e6" />
      <rect x="9" y="58" width="370" height="154" fill="#ecd9bd" stroke="#c9b48f" strokeWidth="0.9" />
      <g clipPath={`url(#${uid}-floorClip)`} stroke="#d8c19c" strokeWidth="0.8">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M4 ${64 + i * 12} H384`} />
        ))}
        <path d="M60 52 V70 M120 70 V82 M250 82 V94 M310 94 V106 M90 106 V118 M200 118 V130 M330 130 V142 M140 142 V154 M270 154 V166 M80 166 V178 M220 178 V190 M340 190 V202 M150 202 V219" />
      </g>

      {/* Balcony plants, in dotted leaves. */}
      <Plant cx={28} cy={40} seed={3} />
      <Plant cx={70} cy={38} seed={9} n={9} r={10} />
      <Plant cx={BALCONY_PLANT.x} cy={BALCONY_PLANT.y} seed={21} />
      <Plant cx={262} cy={40} seed={33} n={12} r={12} />
      <Plant cx={346} cy={38} seed={41} n={9} r={10} />

      {/* The bed: pillow, plaid duvet. */}
      <rect x="12" y="58" width="64" height="114" rx="4" fill="#f4f0e8" {...line} />
      <rect x="18" y="63" width="25" height="22" rx="8" fill="#fbf8f2" {...line} />
      <rect x="45" y="63" width="25" height="22" rx="8" fill="#f2b896" {...line} />
      <path d="M24 70 Q31 67 38 70 M51 70 Q58 67 65 70" fill="none" stroke="#c9a28a" strokeWidth="0.9" />
      <rect x="15" y="86" width="58" height="83" rx="5" fill={`url(#${uid}-plaid)`} {...line} />
      <path d="M15 99 Q44 105 73 99" fill="none" stroke={ROOM_INK} strokeWidth="0.9" />
      <rect x="14" y="142" width="60" height="17" rx="2" fill="#eab08a" {...line} />
      <path d="M20 144 V157 M26 144 V157 M32 144 V157 M38 144 V157 M44 144 V157 M50 144 V157 M56 144 V157 M62 144 V157 M68 144 V157" fill="none" stroke="#d58f68" strokeWidth="0.9" />
      <path d="M17 159 v4 M23 159 v4 M29 159 v4 M35 159 v4 M41 159 v4 M47 159 v4 M53 159 v4 M59 159 v4 M65 159 v4" fill="none" stroke="#d58f68" strokeWidth="0.9" />

      {/* A little fish tank against the balcony wall. */}
      <rect x="86" y="58" width="44" height="20" rx="2" fill="#cfe6f2" {...line} />
      <rect x="89" y="61" width="38" height="14" rx="1.5" fill="#e3f1f8" stroke="none" />
      <path d="M86 78 H130" stroke={ROOM_INK} strokeWidth="1.6" />

      {/* A cubby shelf with a few books. */}
      <rect x="12" y="180" width="58" height="36" fill="#d9c7a3" {...line} />
      <path d="M41 180 V216 M12 198 H70" fill="none" {...line} />
      <rect x="16" y="184" width="6" height="12" fill="#c98f8f" {...line} strokeWidth="0.8" />
      <rect x="23" y="186" width="6" height="10" fill="#8fa9c9" {...line} strokeWidth="0.8" />
      <rect x="46" y="202" width="14" height="10" fill="#e8d9a8" {...line} strokeWidth="0.8" />
      <circle cx="26" cy="207" r="4" fill="#9ccfa8" {...line} strokeWidth="0.8" />

      {/* The desk, its monitor and keyboard, and the red stool. */}
      <rect x="292" y="60" width="80" height="44" rx="2" fill="#f7f4ee" {...line} />
      <rect x="358" y="66" width="6" height="32" fill="#dfe6ee" {...line} />
      <rect x="316" y="76" width="24" height="8" rx="1.5" fill="#e6e0d6" {...line} strokeWidth="0.9" />
      <path d="M320 80 H336" stroke="#c4bdb0" strokeWidth="0.8" />
      <ellipse cx="346" cy="80" rx="3" ry="4" fill="#e6e0d6" {...line} strokeWidth="0.9" />
      <circle cx="304" cy="70" r="4" fill="#e7b9a6" {...line} strokeWidth="0.9" />
      <rect x="296" y="88" width="14" height="10" rx="1" fill="#cfe0c0" {...line} strokeWidth="0.9" />
      <circle cx="322" cy="118" r="12" fill="#d65a5a" {...line} />
      <circle cx="322" cy="118" r="7" fill="#e07a7a" stroke="none" />

      {/* The low table, where the food goes. */}
      <rect x="228" y="172" width="20" height="20" rx="5" fill="#f0b95e" {...line} />
      <rect x="282" y="176" width="19" height="19" rx="5" fill="#d98f8f" {...line} />
      <rect x="240" y="119" width="60" height="48" rx="7" fill="#e3a182" {...line} />
      <path d="M244 124 H296 M244 162 H296" fill="none" stroke="#c9805f" strokeWidth="0.9" strokeDasharray="3 2" />
      <rect x="249" y="128" width="42" height="30" rx="3" fill="#d6b18c" {...line} strokeWidth="0.9" />
      <circle cx="286" cy="133" r="3.8" fill="#fffdf6" {...line} strokeWidth="0.9" />
      <circle cx="286" cy="133" r="2.2" fill="#9b6a45" stroke="none" />
      <path d="M284.6 128.6 q-1.6 -2 0 -3.6 t0 -3.4 M287.6 128.6 q-1.6 -2 0 -3.6 t0 -3.4" fill="none" stroke="#b9b2a6" strokeWidth="0.8" strokeLinecap="round" />

      {/* The round cushion in the middle, the piggy's own spot. */}
      <circle cx="172" cy="140" r="35" fill="#e8a98c" {...line} />
      <circle cx="172" cy="140" r="30" fill="none" stroke="#fbe6d4" strokeWidth="1.6" />
      <circle cx="172" cy="140" r="26" fill="none" stroke="#c9806a" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="172" cy="140" r="21" fill="#f0b95e" {...line} />
      <circle cx="172" cy="140" r="14" fill="#f6cf86" stroke="#d29a3e" strokeWidth="0.9" strokeDasharray="2 2" />
      <circle cx="172" cy="140" r="2" fill="#d29a3e" stroke="none" />

      {/* A floor lamp, and a plant in the corner. */}
      <circle cx={LAMP.x} cy={LAMP.y} r="11" fill="#f3dc93" {...line} />
      <circle cx={LAMP.x} cy={LAMP.y} r="6" fill="#f8e8b4" stroke="none" />
      <circle cx={LAMP.x} cy={LAMP.y} r="1.8" fill={ROOM_INK} stroke="none" />
      <Plant cx={364} cy={196} seed={57} n={18} r={14} pot={8} />
      <Plant cx={346} cy={207} seed={63} n={9} r={8} pot={5} />
      <Plant cx={366} cy={172} seed={71} n={8} r={8} pot={5} />

      {/* A stack of books, a pair of slippers by the door, two small frames. */}
      <g {...line} strokeWidth="0.9">
        <rect x="112" y="170" width="20" height="12" rx="1" fill="#c98f8f" />
        <rect x="114" y="164" width="17" height="10" rx="1" fill="#8fa9c9" transform="rotate(-6 122 169)" />
        <rect x="113" y="159" width="16" height="8" rx="1" fill="#e8d9a8" transform="rotate(5 121 163)" />
        <ellipse cx="316" cy="197" rx="3.6" ry="6" fill="#d98f8f" />
        <ellipse cx="326" cy="197" rx="3.6" ry="6" fill="#d98f8f" />
        <rect x="376" y="112" width="4" height="20" fill="#f2b8a0" />
        <rect x="118" y="213" width="30" height="4" fill="#b8d4ec" />
      </g>

      {/* The door, ajar, and its mat. */}
      <rect x="306" y="205" width="30" height="12" fill="#b99874" {...line} strokeWidth="0.9" />
      <path d="M312 205 V217 M318 205 V217 M324 205 V217 M330 205 V217" stroke="#9d7e5c" strokeWidth="0.7" />
      <rect x="297" y="194" width="4" height="25" fill="#cdbba0" {...line} strokeWidth="0.9" />
      <path d="M301 194 A25 25 0 0 1 326 219" fill="none" stroke="#bdb4a3" strokeWidth="0.9" strokeDasharray="2 3" />

      {/* The walls: thick and black, with a gap for the door, and the sliding
          window onto the balcony. */}
      <path d="M2.5 0 V219 H298 M340 219 H385.5 V0 M0 52 H122 M300 52 H388" fill="none" stroke="#161616" strokeWidth="5.5" />
      <path d="M114 53 H308 L346 128 H76 Z" fill={`url(#${uid}-window)`} />
      <circle cx={LAMP.x} cy={LAMP.y} r="60" fill={`url(#${uid}-lampDay)`} />
      <rect x="0" y="52" width={SW} height={SH - 52} fill="#ffb066" opacity="0.07" />
      <path d="M122 50.6 H300 M122 53.4 H300" stroke="#9bb4d4" strokeWidth="1.4" />
      <path d="M211 49 V55" stroke="#161616" strokeWidth="2" />
    </g>
  );
}

/**
 * A square slab of matte black plastic with a CRT sunk into its top, and on the
 * glass a hand-drawn green-outline piggy in its little top-down home. Sleep
 * tucks it into bed and dims the room, feed puts an apple on the low table,
 * home sends it back to its cushion, and play opens a picker so you can choose
 * what it does next.
 */
export function PocketPiggy({ maxSize = MAX_SIZE, className }: PocketPiggyProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const actRef = React.useRef<((cmd: Cmd) => void) | null>(null);
  const uid = `pp${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const [asleep, setAsleep] = React.useState(false);
  const [down, setDown] = React.useState<number | null>(null);
  const [picker, setPicker] = React.useState({ open: false, index: 0 });

  // Scale the deck to the space it has.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.min(maxSize / DECK, (host.clientWidth - 24) / DECK, (host.clientHeight - 24) / DECK);
      fit.style.transform = `scale(${Math.max(0.3, scale).toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [maxSize]);

  // The screen: the doodle is driven from one rAF loop, only while it can be
  // seen; a 2D canvas on top carries the CRT's dust, tracking line and static.
  React.useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    if (!host || !canvas || !svg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w = newWorld();
    const rnd = mulberry32(0xb166);

    const q = (name: string) => svg.querySelector<SVGElement>(`[data-p="${name}"]`);
    const many = (name: string, n: number) => Array.from({ length: n }, (_, i) => q(`${name}${i}`));
    const els = {
      pig: q("pig"),
      earL: q("earL"),
      earR: q("earR"),
      eyeL: q("eyeL"),
      eyeR: q("eyeR"),
      eyeLz: q("eyeLz"),
      eyeRz: q("eyeRz"),
      smile: q("smile"),
      mouthO: q("mouthO"),
      dim: q("dim"),
      dimCover: q("dimCover"),
      cover: q("cover"),
      lamp: q("lamp"),
      can: q("can"),
      plantDyn: q("plantDyn"),
      monGlow: q("monGlow"),
      book: q("book"),
      flip: q("flip"),
      fish: q("fish"),
      tilde: q("tilde"),
      ticks: many("tick", TICKS.length),
      apples: many("apple", 3),
      crumbs: many("crumb", 8),
      hearts: many("heart", 4),
      zeds: many("z", 3),
      drops: many("drop", 4),
      flakes: many("flake", 5),
      notes: many("note", 3),
      typing: many("type", 3),
    };
    const seeds = Array.from(svg.querySelectorAll<SVGElement>("[data-seed]"));
    const set = (el: SVGElement | null, name: string, value: string | number) => {
      if (el) el.setAttribute(name, String(value));
    };
    const fx = (n: number) => n.toFixed(2);

    const noiseCanvas = document.createElement("canvas");
    noiseCanvas.width = NOISE_W;
    noiseCanvas.height = NOISE_H;
    const noiseCtx = noiseCanvas.getContext("2d");
    const noiseData = noiseCtx ? noiseCtx.createImageData(NOISE_W, NOISE_H) : null;
    let noiseSeed = 0x9e3779b9;
    let noiseFresh = false;
    const fillNoise = () => {
      if (!noiseCtx || !noiseData || noiseFresh) return;
      const d = noiseData.data;
      let s = noiseSeed;
      for (let i = 0; i < d.length; i += 4) {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        const v = s & 255;
        d[i] = v;
        d[i + 1] = (v + ((s >>> 8) & 31)) & 255;
        d[i + 2] = (v + ((s >>> 16) & 47)) & 255;
        d[i + 3] = 255;
      }
      noiseSeed = s;
      noiseCtx.putImageData(noiseData, 0, 0);
      noiseFresh = true;
    };
    const stamp = (alpha: number) => {
      fillNoise();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(noiseCanvas, 0, 0, NOISE_W, NOISE_H, 0, 0, W, H);
      ctx.restore();
    };

    /* ----------------------------- behaviour ----------------------------- */

    const startIdle = () => {
      w.mode = "idle";
      w.modeT = 0;
      w.idleUntil = w.t + 2 + rnd() * 2.5;
    };
    const startHappy = (bounce: boolean) => {
      w.mode = "happy";
      w.modeT = 0;
      w.bounce = bounce;
      w.heartN = 0;
      w.popAt = w.t;
    };
    const spawnHeart = () => {
      w.hearts.push({ x: w.pig.x + (rnd() - 0.5) * 20, y: w.pig.y - 50, t0: w.t });
    };

    /** Sets off along a route to a place, by way of the middle of the floor. */
    const goTo = (name: string, dest: readonly Pt[]) => {
      if (w.goal === name) return;
      w.goal = name;
      w.speedK = 0;
      const p = w.pig;
      const r: Pt[] = [];
      if (p.y < 58) r.push(GAP);
      if (p.x < 100 && p.y > 56) r.push(BED_SIDE);
      r.push(HUB, ...dest);
      w.route = r;
    };
    /** Takes a step along the route, easing in and out. True once there. */
    const follow = (dt: number, speed: number) => {
      const p = w.pig;
      w.walking = false;
      while (w.route.length) {
        const r = w.route[0];
        const dx = r.x - p.x;
        const dy = r.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 1.2) {
          w.route.shift();
          continue;
        }
        w.speedK = Math.min(1, w.speedK + dt * 3.5);
        const slow = w.route.length === 1 ? Math.min(1, 0.3 + d / 14) : 1;
        const len = Math.min(d, speed * w.speedK * slow * dt);
        p.x += (dx / d) * len;
        p.y += (dy / d) * len;
        p.phase += len;
        w.walking = true;
        return false;
      }
      w.speedK = 0;
      return true;
    };

    const step = (dt: number) => {
      w.t += dt;
      w.modeT += dt;
      w.walking = false;

      // Day and night: a little over a second to cross.
      w.night += Math.max(-dt / 1.2, Math.min(dt / 1.2, (w.asleep ? 1 : 0) - w.night));

      // Slims back down, one level at a time.
      if (w.fullness > 0 && w.t - w.fullAt > 20) {
        w.fullness -= 1;
        w.fullAt = w.t;
      }
      w.fullShown += (w.fullness - w.fullShown) * Math.min(1, dt * 4);
      w.puff *= Math.exp(-dt * 9);

      // Apples settle into their places on the table.
      w.apples.forEach((a, i) => {
        a.age += dt;
        const s = SLOTS[i];
        a.x += (s.x - a.x) * Math.min(1, dt * 10);
        a.y += (s.y - a.y) * Math.min(1, dt * 10);
        a.k += (1 - 0.3 * a.bites - a.k) * Math.min(1, dt * 14);
      });
      for (const c of w.crumbs) {
        c.vy += 220 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
      w.crumbs = w.crumbs.filter((c) => w.t - c.t0 < 0.7);
      w.hearts = w.hearts.filter((h) => w.t - h.t0 < 1.6);
      w.zeds = w.zeds.filter((z) => w.t - z.t0 < 2.8);
      w.open = 0;

      // Bed time: walk to the bed, climb in.
      if (w.asleep) {
        w.act = null;
        w.homeReq = false;
        if (w.mode !== "sleep") {
          goTo("bed", [BED_SIDE, BED]);
          if (follow(dt, 58)) {
            w.goal = "";
            w.mode = "sleep";
            w.modeT = 0;
          }
        } else {
          w.tuck = Math.min(1, w.tuck + dt * 2.2);
          if (w.t - w.lastZ > 1.1) {
            w.lastZ = w.t;
            w.zeds.push({ x: BED.x + 16, y: BED.y - 52, t0: w.t });
          }
        }
        return;
      }
      // Waking: the covers come off before it climbs out.
      if (w.tuck > 0.02) {
        w.tuck = Math.max(0, w.tuck - dt * 2.6);
        return;
      }
      w.tuck = 0;
      if (w.mode === "sleep") startIdle();

      // A meal, once an apple has landed on the table.
      const first = w.apples[0];
      if (first && first.age > 0.4 && !w.act && !w.homeReq) {
        if (w.mode !== "eat") {
          goTo("eat", [EAT]);
          if (follow(dt, 42)) {
            w.goal = "";
            w.mode = "eat";
            w.modeT = 0;
            w.biteT = 0;
          }
          return;
        }
        const before = w.biteT;
        w.biteT += dt;
        const p = w.biteT;
        w.open = p < 0.18 ? p / 0.18 : p < 0.5 ? 1 : p < 0.62 ? 1 - (p - 0.5) / 0.12 : 0;
        if (before < 0.5 && p >= 0.5) {
          first.bites += 1;
          w.puff = 1;
          for (let i = 0; i < 4; i += 1) {
            w.crumbs.push({ x: first.x, y: first.y - 2, vx: (rnd() - 0.5) * 50, vy: -35 - rnd() * 35, t0: w.t, kind: i % 3 });
          }
        }
        if (p >= 0.62) {
          w.biteT = 0;
          if (first.bites >= 3) {
            w.apples.shift();
            w.fullness = Math.min(3, w.fullness + 1);
            w.fullAt = w.t;
            if (!w.apples.length) startHappy(false);
          }
        }
        return;
      }
      if (w.mode === "eat") startIdle();

      // Home, with a hop.
      if (w.homeReq) {
        w.act = null;
        goTo("home", [HOME]);
        if (follow(dt, 52)) {
          w.goal = "";
          w.homeReq = false;
          startHappy(true);
        }
        return;
      }

      // Something chosen from the picker.
      if (w.act) {
        const spec = ACTIVITIES[w.act.i];
        if (w.act.state === "go") {
          goTo(`act${w.act.i}`, spec.route);
          if (follow(dt, 40)) {
            w.goal = "";
            w.act.state = "do";
            w.act.t0 = w.t;
            w.mode = "act";
            w.modeT = 0;
            w.popAt = w.t;
          }
        } else if (w.t - w.act.t0 >= spec.dur) {
          w.act = null;
          startIdle();
        }
        return;
      }
      if (w.mode === "act") startIdle();

      if (w.mode === "happy") {
        const target = w.bounce ? 1 : 3;
        if (w.heartN < target && w.modeT >= w.heartN * 0.3) {
          w.heartN += 1;
          spawnHeart();
        }
        if (w.modeT > 1.5) startIdle();
        return;
      }

      // Otherwise it wanders a little, and comes back to its cushion.
      if (w.route.length) {
        if (follow(dt, 19)) {
          w.goal = "";
          startIdle();
        }
      } else if (w.t >= w.idleUntil) {
        const away = Math.hypot(w.pig.x - HOME.x, w.pig.y - HOME.y) > 20;
        const spot = away ? HOME : WANDER[Math.floor(rnd() * WANDER.length)];
        goTo(`wander${Math.round(spot.x)}`, [spot]);
      }
    };

    /* ------------------------------ painting ------------------------------ */

    const render = () => {
      const t = w.t;
      const sleeping = w.mode === "sleep" && w.asleep;
      const p = w.pig;
      const au = w.act && w.act.state === "do" ? t - w.act.t0 : -1;
      const actId = w.act && au >= 0 ? ACTIVITIES[w.act.i].id : "";

      // The room's light: the room dims, the lamp warms.
      set(els.dim, "opacity", fx(w.night * 0.55));
      set(els.dimCover, "opacity", fx(w.night * 0.55));
      set(els.lamp, "opacity", fx(w.night));

      // The piggy: waddle when walking, breathing, hops, wiggles and stretches.
      const br = Math.sin(t * (sleeping ? 1.1 : 1.7));
      let px = p.x;
      let dy = -br * 0.35;
      let rot = 0;
      let kx = 1 + 0.055 * w.fullShown + 0.045 * w.puff;
      let ky = 1 + 0.012 * w.fullShown + br * (sleeping ? 0.016 : 0.011);
      if (w.walking) {
        const s = Math.sin(p.phase * 0.55);
        rot = s * 7;
        dy -= Math.abs(s) * 1.4;
      }
      if (w.mode === "happy") {
        if (w.bounce) dy -= w.modeT < 0.9 ? Math.abs(Math.sin((w.modeT / 0.9) * Math.PI * 2)) * 8 : 0;
        else rot = Math.sin(w.modeT * 18) * 4 * Math.max(0, 1 - w.modeT / 1.5);
      }
      if (actId === "dance") {
        const s = Math.sin(au * 9);
        rot = s * 8;
        px += s * 2.5;
        dy -= Math.abs(Math.cos(au * 9)) * 1.6;
      } else if (actId === "stretch") {
        const u = au;
        const tall = u < 1.2 ? smooth(u / 1.2) : u < 1.8 ? 1 - smooth((u - 1.2) / 0.6) * 1.5 : -0.5 + smooth(Math.min(1, (u - 1.8) / 0.7)) * 0.5;
        ky *= 1 + 0.26 * Math.max(0, tall) + 0.14 * Math.min(0, tall);
        kx *= 1 - 0.09 * Math.max(0, tall) - 0.12 * Math.min(0, tall);
      } else if (actId === "desk") {
        dy += Math.sin(au * 13) * 0.25;
      }
      set(
        els.pig,
        "transform",
        `translate(${fx(px)} ${fx(p.y + dy)}) rotate(${fx(rot)}) scale(${(PIG_S * kx).toFixed(4)} ${(PIG_S * ky).toFixed(4)}) translate(${-DRAW_CX} ${-DRAW_FEET})`,
      );
      set(els.cover, "opacity", fx(w.tuck));

      // Eyes: dots, a blink, or closed arcs.
      const shut = sleeping || (w.tuck > 0.4 && !w.asleep);
      const blink = !shut && t % 3.9 < 0.14;
      for (const [dot, arc] of [
        [els.eyeL, els.eyeLz],
        [els.eyeR, els.eyeRz],
      ] as const) {
        set(dot, "opacity", shut ? 0 : 1);
        set(dot, "ry", blink ? 2 : 8);
        set(dot, "rx", blink ? 9 : 8);
        set(arc, "opacity", shut ? 1 : 0);
      }

      // The mouth: a smile, a softer one asleep, a round o while eating.
      const o = w.open;
      set(els.smile, "d", shut ? SMILE_SOFT : SMILE);
      set(els.smile, "opacity", o > 0.05 ? 0 : 1);
      set(els.mouthO, "opacity", o > 0.05 ? 1 : 0);
      set(els.mouthO, "ry", fx(4 + 15 * o));
      set(els.mouthO, "rx", fx(6 + 11 * o));

      // Ears: a twitch now and then, a flap when pleased.
      const tw = (period: number, offset: number) => {
        const u = ((t + offset) % period) / 0.45;
        return u < 1 ? Math.sin(u * Math.PI * 3) * 6 * (1 - u) : 0;
      };
      const flap = w.mode === "happy" || actId === "dance" ? Math.sin(t * 22) * 5 : 0;
      set(els.earL, "transform", `rotate(${fx(tw(7.3, 0) - flap)} 410 580)`);
      set(els.earR, "transform", `rotate(${fx(-tw(9.1, 3) + flap)} 545 580)`);

      // The ticks over its head: flicker, and pop now and then.
      const period = actId === "dance" ? 0.9 : 6;
      const popU = (t - w.popAt) / 0.5;
      const idleU = (t % period) / 0.5;
      const pu = popU >= 0 && popU < 1 ? popU : idleU < 1 ? idleU : 2;
      const pk = pu < 1 ? 1 + 0.7 * Math.sin(pu * Math.PI) : 1;
      TICKS.forEach((tk, i) => {
        const el = els.ticks[i];
        set(el, "opacity", shut ? 0 : fx(0.82 + 0.18 * Math.sin(t * 5 + i * 2)));
        set(el, "transform", `translate(${tk.cx} ${tk.cy}) scale(${pk.toFixed(3)}) translate(${-tk.cx} ${-tk.cy})`);
      });

      // The mouth's place on the screen, for apples being bitten.
      const mx = px + MOUTH_DX * kx;
      const my = p.y + MOUTH_DY * ky + dy;
      els.apples.forEach((el, i) => {
        const a = w.apples[i];
        if (!a) return set(el, "opacity", 0);
        const u = clamp01(a.age / 0.4);
        const back = 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2;
        const lift = i === 0 && w.mode === "eat" ? 0.35 * w.open : 0;
        set(el, "opacity", a.age < 0 ? 0 : 1);
        set(
          el,
          "transform",
          `translate(${fx(lerp(a.x, mx, lift))} ${fx(lerp(a.y, my, lift) - (1 - u) * 7)}) rotate(${fx((1 - u) * 20)}) scale(${(0.45 * a.k * Math.max(0, back)).toFixed(3)})`,
        );
      });
      els.crumbs.forEach((el, i) => {
        const c = w.crumbs[i];
        if (!c) return set(el, "opacity", 0);
        const u = (t - c.t0) / 0.7;
        set(el, "opacity", fx(1 - u));
        set(el, "transform", `translate(${fx(c.x)} ${fx(c.y)}) rotate(${fx(u * 240)})`);
        set(el, "fill", ["#ef4b4b", INK, "#f7c948"][c.kind]);
      });
      els.hearts.forEach((el, i) => {
        const h = w.hearts[i];
        if (!h) return set(el, "opacity", 0);
        const u = (t - h.t0) / 1.6;
        set(el, "opacity", fx(u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85));
        set(el, "transform", `translate(${fx(h.x + Math.sin(u * 8) * 2)} ${fx(h.y - u * 20)}) scale(${(0.5 + 0.3 * Math.min(1, u * 4)).toFixed(3)})`);
      });
      els.zeds.forEach((el, i) => {
        const z = w.zeds[i];
        if (!z) return set(el, "opacity", 0);
        const u = (t - z.t0) / 2.8;
        set(el, "opacity", fx((u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) * 0.95));
        set(el, "transform", `translate(${fx(z.x + u * 12 + Math.sin(u * 7) * 2)} ${fx(z.y - u * 24)}) scale(${(0.45 + u * 0.6).toFixed(3)})`);
      });

      // The fish swims, a little keener at feeding time.
      const feeding = actId === "fish";
      const fxp = 108 + Math.sin(t * (feeding ? 2.6 : 0.8)) * 12;
      const dir = Math.cos(t * (feeding ? 2.6 : 0.8)) >= 0 ? 1 : -1;
      set(
        els.fish,
        "transform",
        `translate(${fx(fxp)} ${fx(68 + Math.sin(t * 1.7) * 1.5)}) scale(${dir} 1) rotate(${fx(feeding ? Math.sin(t * 16) * 9 : Math.sin(t * 5) * 3)})`,
      );
      els.flakes.forEach((el, i) => {
        if (!feeding) return set(el, "opacity", 0);
        const ph = (au * 1.5 + i * 0.21) % 1;
        set(el, "opacity", fx(Math.sin(ph * Math.PI)));
        set(el, "transform", `translate(${fx(124 - i * 4 - ph * 6)} ${fx(59 + ph * 11)})`);
      });

      // Watering the plants: a can, drops, and leaves that bounce.
      const watering = actId === "water";
      set(els.can, "opacity", watering ? 1 : 0);
      set(els.can, "transform", `translate(${WATER.x - 14} ${WATER.y - 14}) rotate(${fx(-12 - Math.sin(au * 5) * 8)})`);
      set(els.plantDyn, "opacity", watering ? 1 : 0);
      set(
        els.plantDyn,
        "transform",
        `translate(${BALCONY_PLANT.x} ${BALCONY_PLANT.y + 6}) scale(${(1 + (watering ? Math.max(0, Math.sin(au * 9)) * 0.08 : 0)).toFixed(3)} ${(1 + (watering ? Math.max(0, Math.sin(au * 9 + 1)) * 0.1 : 0)).toFixed(3)}) translate(${-BALCONY_PLANT.x} ${-BALCONY_PLANT.y - 6})`,
      );
      els.drops.forEach((el, i) => {
        if (!watering) return set(el, "opacity", 0);
        const ph = (au * 1.7 + i * 0.25) % 1;
        set(el, "opacity", fx(Math.sin(ph * Math.PI) * 0.9));
        set(el, "transform", `translate(${fx(lerp(WATER.x - 22, BALCONY_PLANT.x + 2, ph))} ${fx(WATER.y - 18 + ph * ph * 12)})`);
      });

      // Working at the desk: the screen glows, the keys tick.
      const working = actId === "desk";
      set(els.monGlow, "opacity", working ? fx(0.55 + 0.35 * Math.sin(au * 8)) : 0);
      els.typing.forEach((el, i) => {
        const on = working && hash(Math.floor(au * 9), i, 5) > 0.35;
        set(el, "opacity", on ? 0.95 : 0);
      });

      // Reading: an open book held up, and a page that flips.
      const reading = actId === "read";
      set(els.book, "opacity", reading ? 1 : 0);
      set(els.book, "transform", `translate(${fx(px)} ${fx(p.y - 12 + Math.sin(au * 2) * 0.4)})`);
      set(els.flip, "transform", `scale(${fx(Math.cos(au * 5))} 1)`);

      // Dancing: notes float up. Stretching: a contented squiggle.
      els.notes.forEach((el, i) => {
        if (actId !== "dance") return set(el, "opacity", 0);
        const ph = (au * 0.9 + i / 3) % 1;
        const side = i % 2 === 0 ? -1 : 1;
        set(el, "opacity", fx(Math.sin(ph * Math.PI)));
        set(el, "transform", `translate(${fx(px + side * (14 + ph * 6) + Math.sin(ph * 8) * 2)} ${fx(p.y - 36 - ph * 22)})`);
      });
      set(els.tilde, "opacity", actId === "stretch" && au > 0.8 ? fx(Math.min(1, (au - 0.8) * 3)) : 0);
      set(els.tilde, "transform", `translate(${fx(px + 17)} ${fx(p.y - 58 + Math.sin(au * 6) * 1)})`);
    };

    // The glass's own mischief, over the top of the picture.
    const paintTube = (now: number) => {
      noiseFresh = false;
      const t = w.t;
      const n = w.night;
      ctx.clearRect(0, 0, W, H);

      // Dust: small coloured squares that hop and twinkle, dimmer at night.
      for (let i = 0; i < DUST.length; i += 1) {
        const d = DUST[i];
        const beat = t / d.period + d.phase;
        const slot = Math.floor(beat);
        const u = beat - slot;
        const alpha = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1;
        if (alpha <= 0.02) continue;
        ctx.globalAlpha = alpha * 0.4 * (1 - 0.5 * n);
        ctx.fillStyle = d.colour;
        ctx.fillRect(Math.floor(hash(i, slot, 1) * (W - 6)), Math.floor(hash(i, slot, 2) * (H - 12)) + 2, d.size, d.size);
      }
      ctx.globalAlpha = 1;

      // Tracking: a bright line that mostly rests near the foot of the frame
      // and now and then rolls all the way up.
      const phase = t % 9;
      let ty = H * 0.935;
      let th = 2;
      if (phase < 1.8) {
        const e = smooth(phase / 1.8);
        ty = H * 0.935 - e * H;
        th = 5;
      }
      if (ty > -6) {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(0, ty, W, th);
        ctx.fillStyle = "rgba(255,255,255,0.24)";
        ctx.fillRect(0, ty + th - 1, W, 1);
      }
      // Head-switching noise at the very foot.
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(0, H - 3, W, 3);

      // Faint film noise, a few streaks.
      stamp(0.045);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let i = 0; i < 3; i += 1) {
        const y = Math.floor(hash(Math.floor(now / 60), i, 9) * H);
        const x0 = Math.floor(hash(Math.floor(now / 60), i, 10) * W);
        ctx.fillRect(x0, y, 20 + hash(i, 4, Math.floor(now / 60)) * 90, 1);
      }
    };

    // The line boils: the noise that shakes it takes a new seed every so often.
    let boilAt = 0;
    let boilN = 0;
    const boil = (now: number) => {
      if (now - boilAt < 140) return;
      boilAt = now;
      boilN = (boilN + 1) % 4;
      for (const el of seeds) el.setAttribute("seed", String(boilN * 3 + 2));
    };

    const frameOnce = (now: number) => {
      render();
      paintTube(now);
    };

    // Motion reduced: one still frame, the piggy on its cushion.
    const redraw = () => {
      if (reduced) frameOnce(performance.now());
    };
    const wake = () => {
      if (w.asleep) {
        w.asleep = false;
        setAsleep(false);
      }
    };
    actRef.current = (cmd) => {
      if (cmd === "sleep") {
        w.asleep = !w.asleep;
        setAsleep(w.asleep);
        if (reduced) {
          w.night = w.asleep ? 1 : 0;
          w.tuck = w.asleep ? 1 : 0;
          w.mode = w.asleep ? "sleep" : "idle";
          w.pig.x = w.asleep ? BED.x : HOME.x;
          w.pig.y = w.asleep ? BED.y : HOME.y;
        }
      } else if (cmd === "feed") {
        wake();
        w.act = null;
        w.homeReq = false;
        if (!reduced && w.apples.length < 3) {
          const s = SLOTS[w.apples.length];
          w.apples.push({ x: s.x, y: s.y, age: -0.05, bites: 0, k: 1 });
        }
      } else if (cmd === "home") {
        wake();
        w.act = null;
        if (reduced) {
          w.night = 0;
          w.tuck = 0;
          w.mode = "idle";
          w.pig.x = HOME.x;
          w.pig.y = HOME.y;
        } else {
          w.homeReq = true;
          w.mode = "idle";
        }
      } else if (!reduced) {
        wake();
        w.homeReq = false;
        w.goal = "";
        w.route = [];
        w.mode = "idle";
        w.act = { i: cmd, state: "go", t0: w.t };
      }
      redraw();
    };
    frameOnce(performance.now());
    if (reduced) {
      return () => {
        actRef.current = null;
      };
    }

    let raf = 0;
    let last = performance.now();
    let visible = true;
    let running = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      // Thirty frames a second is all a tape has.
      if (dt < 30) return;
      last = now;
      step(Math.min(dt, 100) / 1000);
      boil(now);
      frameOnce(now);
    };
    const sync = () => {
      const should = visible && !document.hidden;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            visible = entries[entries.length - 1]?.isIntersecting ?? true;
            sync();
          })
        : null;
    io?.observe(host);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      actRef.current = null;
    };
  }, []);

  const press = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 0) setDown(i);
    },
    onPointerUp: () => setDown((d) => (d === i ? null : d)),
    onPointerLeave: () => setDown((d) => (d === i ? null : d)),
    onPointerCancel: () => setDown((d) => (d === i ? null : d)),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") setDown(i);
    },
    onKeyUp: () => setDown((d) => (d === i ? null : d)),
    onBlur: () => setDown((d) => (d === i ? null : d)),
  });

  const count = ACTIVITIES.length;
  const cycle = (by: number) => setPicker((s) => ({ ...s, index: (s.index + by + count) % count }));
  const closePicker = () => setPicker((s) => ({ ...s, open: false }));

  // While the picker is open the keys are soft keys: previous, do it, next, close.
  type KeyKind = "sleep" | "feed" | "home" | "open" | "prev" | "ok" | "next" | "close";
  const keys: { glyph: GlyphId; label: string; kind: KeyKind; pressed?: boolean }[] = picker.open
    ? [
        { glyph: "prev", label: "Previous", kind: "prev" },
        { glyph: "ok", label: "Do it", kind: "ok" },
        { glyph: "next", label: "Next", kind: "next" },
        { glyph: "close", label: "Close", kind: "close" },
      ]
    : [
        { glyph: "sleep", label: "Sleep", kind: "sleep", pressed: asleep },
        { glyph: "feed", label: "Feed", kind: "feed" },
        { glyph: "home", label: "Home", kind: "home" },
        { glyph: "play", label: "Play", kind: "open" },
      ];

  // The arrow keys and Escape work from anywhere inside the device while the
  // picker is open. Enter and Space press whichever key has focus, as ever.
  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (!picker.open) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cycle(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      cycle(1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePicker();
    }
  };

  return (
    <div
      ref={hostRef}
      className={cn("flex h-full min-h-[420px] w-full items-center justify-center", className)}
    >
      <style>{`@keyframes pp-flip{from{opacity:0;transform:perspective(120px) rotateX(75deg) scale(.8)}to{opacity:1;transform:none}}.pp-flip{animation:pp-flip 150ms ease-out}@keyframes pp-twinkle{0%,100%{opacity:.45}50%{opacity:1}}.pp-light{animation:pp-twinkle 3.4s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.pp-flip,.pp-light{animation:none}}`}</style>
      <div
        ref={fitRef}
        className="relative shrink-0"
        style={{ width: DECK, height: DECK, transformOrigin: "50% 50%" }}
        onKeyDown={onRootKeyDown}
      >
        <span className="sr-only" aria-live="polite">
          {picker.open ? ACTIVITIES[picker.index].label : ""}
        </span>
        {/* The body: matte charcoal, sandblasted. */}
        <div
          className="absolute inset-0 isolate overflow-hidden"
          style={{
            borderRadius: BODY_RADIUS,
            backgroundColor: "#1a1a1c",
            backgroundImage:
              "radial-gradient(120% 70% at 28% -4%, rgba(255,255,255,0.075), rgba(255,255,255,0) 62%), linear-gradient(180deg, #252528 0%, #1d1d1f 38%, #151517 100%)",
            boxShadow: [
              "0 1px 1px rgba(0,0,0,0.38)",
              "inset 0 0 0 1px rgba(0,0,0,0.62)",
              "inset 0 3px 3px -1px rgba(255,255,255,0.10)",
              "inset 0 -3px 5px rgba(0,0,0,0.55)",
              "inset 0 0 22px rgba(0,0,0,0.32)",
            ].join(", "),
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: BODY_GRAIN, backgroundSize: "128px 128px", mixBlendMode: "soft-light", opacity: 0.22 }}
          />
          {/* The rim light: a hairline of highlight, strongest along the top. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: BODY_RADIUS,
              padding: 1.5,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.05) 100%)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
            }}
          />
        </div>

        {/* The screen, sunk into the top. */}
        <div className="absolute" style={{ left: 26, top: 28, width: 388, height: 222 }}>
          <div
            aria-hidden="true"
            className="absolute"
            style={{
              inset: -2,
              borderRadius: glassRadius(2),
              backgroundColor: "#050506",
              boxShadow:
                "0 1.5px 0 rgba(255,255,255,0.09), 0 -1px 1px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.9)",
            }}
          />
          <div
            className="absolute inset-0 isolate overflow-hidden bg-black"
            style={{ borderRadius: glassRadius() }}
          >
            <svg
              ref={svgRef}
              aria-hidden="true"
              viewBox={`0 0 ${SW} ${SH}`}
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 block h-full w-full"
            >
              <defs>
                <radialGradient id={`${uid}-lamp`}>
                  <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
                </radialGradient>
                {/* The room is inked by hand once and left alone: a fixed wobble. */}
                <filter id={`${uid}-room`} filterUnits="userSpaceOnUse" x="-10" y="-10" width={SW + 20} height={SH + 20} colorInterpolationFilters="sRGB">
                  <feTurbulence type="fractalNoise" baseFrequency="0.045 0.05" numOctaves="1" seed="4" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                {/* The piggy and its props boil: a little noise shakes every
                    line, and takes a new seed a few times a second. */}
                <filter id={`${uid}-line`} filterUnits="userSpaceOnUse" x="-10" y="-10" width={SW + 20} height={SH + 20} colorInterpolationFilters="sRGB">
                  <feTurbulence type="fractalNoise" baseFrequency="0.06 0.07" numOctaves="1" seed="2" result="n" data-seed="" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                <clipPath id={`${uid}-duvet`}>
                  <path d="M15 90 Q44 83 73 90 L73 164 Q73 169 68 169 H20 Q15 169 15 164 Z" />
                </clipPath>
              </defs>

              {/* The home, by day or by lamplight. */}
              <g filter={`url(#${uid}-room)`}>
                <Room uid={uid} />
              </g>
              <rect data-p="dim" x="0" y="0" width={SW} height={SH} fill="#14204a" opacity="0" />
              {/* Fairy lights along the wall: they keep twinkling after dark. */}
              <path d="M12 56 Q40 62 68 56 T124 56 T180 56 T236 56 T292 56 T348 56 L380 57" fill="none" stroke="#6b5a45" strokeWidth="0.6" opacity="0.7" />
              {Array.from({ length: 19 }, (_, i) => {
                const x = 24 + i * 19;
                const y = 56 + (i % 2 === 0 ? 3.2 : 0.4);
                return (
                  <g key={i} className="pp-light" style={{ animationDelay: `${((i * 7) % 11) * 0.31}s` }}>
                    <circle cx={x} cy={y} r="3.4" fill="#ffd27a" opacity="0.28" />
                    <circle cx={x} cy={y} r="1.3" fill="#ffe7a8" />
                  </g>
                );
              })}
              <circle data-p="lamp" cx={LAMP.x} cy={LAMP.y} r="78" fill={`url(#${uid}-lamp)`} opacity="0" />

              {/* The piggy, and everything it picks up. */}
              <g filter={`url(#${uid}-line)`} strokeLinecap="round" strokeLinejoin="round">
                <rect data-p="monGlow" x="357" y="65" width="8" height="34" rx="1" fill="#bfe3ff" opacity="0" />
                <g data-p="plantDyn" opacity="0">
                  <Plant cx={BALCONY_PLANT.x} cy={BALCONY_PLANT.y} seed={21} />
                </g>
                <g data-p="fish">
                  <ellipse rx="5" ry="3" fill="#f2a65a" stroke={ROOM_INK} strokeWidth="0.8" />
                  <path d="M4 0 L9 -4 V4 Z" fill="#f2a65a" stroke={ROOM_INK} strokeWidth="0.8" />
                  <circle cx="-2.2" cy="-0.6" r="0.7" fill={ROOM_INK} stroke="none" />
                </g>

                <g data-p="pig" transform={pigTransform(HOME.x, HOME.y)}>
                  {/* Feet, then the round body, then the head on top. */}
                  <ellipse cx="430" cy="852" rx="17" ry="12" fill="#ff9fbf" stroke={PIG_INK} strokeWidth="9" />
                  <ellipse cx="542" cy="852" rx="17" ry="12" fill="#ff9fbf" stroke={PIG_INK} strokeWidth="9" />
                  <ellipse cx="397" cy="782" rx="12" ry="15" fill="#ff9fbf" stroke={PIG_INK} strokeWidth="9" />
                  <ellipse cx="575" cy="782" rx="12" ry="15" fill="#ff9fbf" stroke={PIG_INK} strokeWidth="9" />
                  <ellipse cx="486" cy="792" rx="94" ry="68" fill="#ffc4d8" stroke={PIG_INK} strokeWidth="12" />
                  <path
                    fill="#ffc4d8"
                    d="M408 772 L408 741 Q388 725 383 700 Q379 678 384 656 Q388 638 392 622 L384 604 L381 575 L380 548 L388 534 L442 574 Q475 566 513 575 L570 534 L582 540 L566 595 Q578 612 583 640 L586 665 L583 690 L580 772 Z"
                  />
                  <path d="M408 741 Q388 725 383 700 Q379 678 384 656 Q388 638 392 622 L384 604 L381 575 L380 556" fill="none" stroke={PIG_INK} strokeWidth="12" />
                  <path d="M442 574 Q475 566 513 575" fill="none" stroke={PIG_INK} strokeWidth="12" />
                  <path d="M566 595 Q578 612 583 640 L586 665 L583 690" fill="none" stroke={PIG_INK} strokeWidth="12" />

                  {/* Ears, each with its soft pink inside. */}
                  <g data-p="earL">
                    <path d="M381 550 L388 535 L442 574 L392 622 L384 604 Z" fill="#ffc4d8" />
                    <path d="M398 568 Q408 560 416 572 Q424 584 420 598 Q410 602 402 590 Z" fill="#ff6fb5" />
                    <path d="M380 556 L381 540 L388 534 L414 551 L440 571 L443 574" fill="none" stroke={PIG_INK} strokeWidth="12" />
                  </g>
                  <g data-p="earR">
                    <path d="M513 575 L570 534 L582 540 L577 572 L566 595 Z" fill="#ffc4d8" />
                    <path d="M560 566 Q548 560 538 572 Q530 584 536 597 Q548 598 556 586 Z" fill="#ff6fb5" />
                    <path d="M513 575 L541 555 L571 534 L580 537 L583 549 L577 573 L566 595" fill="none" stroke={PIG_INK} strokeWidth="12" />
                  </g>

                  {/* Three ticks of excitement. */}
                  {TICKS.map((tk, i) => (
                    <path key={i} data-p={`tick${i}`} d={tk.d} fill="none" stroke="#ef6a5a" strokeWidth="7" />
                  ))}

                  {/* Eyes. */}
                  <ellipse data-p="eyeL" cx="451" cy="624" rx="8" ry="8" fill={EYE} />
                  <ellipse data-p="eyeR" cx="502" cy="623" rx="8" ry="8" fill={EYE} />
                  <path data-p="eyeLz" d="M441 622 Q451 635 461 622" fill="none" stroke={EYE} strokeWidth="6" opacity="0" />
                  <path data-p="eyeRz" d="M492 621 Q502 634 512 621" fill="none" stroke={EYE} strokeWidth="6" opacity="0" />

                  {/* The snout, and the smile. */}
                  <ellipse cx="418" cy="690" rx="22" ry="14" fill="#ff9fbf" opacity="0.8" />
                  <ellipse cx="556" cy="684" rx="20" ry="13" fill="#ff9fbf" opacity="0.8" />
                  <ellipse cx="470" cy="668" rx="50" ry="38" fill="#f78fb5" />
                  <ellipse cx="468" cy="666" rx="38" ry="28" fill="#fba3c4" />
                  <ellipse cx="454" cy="670" rx="8" ry="12" fill="#b8323f" />
                  <ellipse cx="485" cy="669" rx="8" ry="12" fill="#b8323f" />
                  <path data-p="smile" d={SMILE} fill="none" stroke="#ef6a5a" strokeWidth="14" />
                  <ellipse data-p="mouthO" cx="491" cy="722" rx="14" ry="16" fill="#9e2a36" stroke="#ef6a5a" strokeWidth="9" opacity="0" />
                </g>

                {/* Tucked in: the duvet over everything but its head. */}
                <g data-p="cover" opacity="0">
                  <path d="M15 90 Q44 83 73 90 L73 164 Q73 169 68 169 H20 Q15 169 15 164 Z" fill={`url(#${uid}-plaid)`} stroke={ROOM_INK} strokeWidth="1.2" />
                  <path d="M15 99 Q44 105 73 99" fill="none" stroke={ROOM_INK} strokeWidth="0.9" />
                  <g clipPath={`url(#${uid}-duvet)`}>
                    <rect data-p="dimCover" x="10" y="80" width="70" height="95" fill="#14204a" opacity="0" />
                  </g>
                </g>

                {/* Props for the things it does. */}
                <g data-p="can" opacity="0">
                  <path d="M-5 -3 H5 L4 5 H-4 Z" fill="#9cc0e0" stroke={ROOM_INK} strokeWidth="0.9" />
                  <path d="M-5 -1 L-11 -6" fill="none" stroke={ROOM_INK} strokeWidth="1.2" />
                  <path d="M5 -1 Q9 -4 5 -6" fill="none" stroke={ROOM_INK} strokeWidth="0.9" />
                </g>
                {Array.from({ length: 4 }, (_, i) => (
                  <circle key={i} data-p={`drop${i}`} r="1.2" fill="#7fb5e8" opacity="0" />
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <path key={i} data-p={`type${i}`} d={`M${336 + i * 7} ${90 - (i % 2) * 5} h3`} stroke="#6fa3d8" strokeWidth="1.4" opacity="0" />
                ))}
                <g data-p="book" opacity="0">
                  <path d="M-12 -6 Q-6 -8.5 0 -5.5 V6 Q-6 3.5 -12 5.5 Z" fill="#fffdf6" stroke={ROOM_INK} strokeWidth="0.9" />
                  <path d="M12 -6 Q6 -8.5 0 -5.5 V6 Q6 3.5 12 5.5 Z" fill="#fffdf6" stroke={ROOM_INK} strokeWidth="0.9" />
                  <path d="M-12 5.5 Q-6 3.5 0 6 Q6 3.5 12 5.5" fill="none" stroke="#4b5aa3" strokeWidth="1.6" />
                  <g data-p="flip">
                    <path d="M0 -5.5 Q6 -8.5 11 -6 V5 Q6 3 0 6 Z" fill="#fffdf6" stroke={ROOM_INK} strokeWidth="0.7" />
                  </g>
                </g>
                {Array.from({ length: 5 }, (_, i) => (
                  <circle key={i} data-p={`flake${i}`} r="0.9" fill="#f2c066" opacity="0" />
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <g key={i} data-p={`note${i}`} opacity="0">
                    <path d="M-1.5 4 V-5 L3 -6 V3" fill="none" stroke={ROOM_INK} strokeWidth="1" />
                    <ellipse cx="-3" cy="4.4" rx="2" ry="1.5" fill="#f6a8c8" stroke={ROOM_INK} strokeWidth="0.8" />
                  </g>
                ))}
                <path data-p="tilde" d="M0 0 q3 -4 6 0 t6 0" fill="none" stroke="#ef6a5a" strokeWidth="1.6" opacity="0" />

                {[0, 1, 2].map((i) => (
                  <g key={i} data-p={`apple${i}`} opacity="0">
                    <path d="M0 -8 C-6 -13 -16 -9 -14 2 C-12 12 -5 15 0 13 C5 15 12 12 14 2 C16 -9 6 -13 0 -8 Z" fill="#ef4b4b" stroke={INK} strokeWidth="3" />
                    <path d="M0 -8 Q1 -13 4 -15" fill="none" stroke={INK} strokeWidth="2.6" />
                    <path d="M3 -12 Q10 -18 16 -12 Q10 -8 3 -12 Z" fill="#a6d64a" stroke={INK} strokeWidth="2" />
                  </g>
                ))}
                {Array.from({ length: 8 }, (_, i) => (
                  <rect key={i} data-p={`crumb${i}`} x="-1.2" y="-1.2" width="2.4" height="2.4" rx="0.6" fill="#ef4b4b" opacity="0" />
                ))}
                {Array.from({ length: 4 }, (_, i) => (
                  <path key={i} data-p={`heart${i}`} d="M0 5 C-9 -2 -7 -10 0 -5 C7 -10 9 -2 0 5 Z" fill="#ff6fb5" stroke="#e8458f" strokeWidth="1.6" strokeLinejoin="round" opacity="0" />
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <path key={i} data-p={`z${i}`} d="M-6 -6 H6 L-6 6 H6" fill="none" stroke="#e0709a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
                ))}
              </g>
            </svg>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 block h-full w-full"
            />

            {/* The picker: six bubbles along the top, one of them chosen. */}
            <div
              aria-hidden={!picker.open}
              className="pointer-events-none absolute left-0 right-0 flex items-start justify-center"
              style={{
                top: 10,
                gap: 7,
                opacity: picker.open ? 1 : 0,
                transform: picker.open ? "translateY(0) scale(1)" : "translateY(-44px) scale(0.9)",
                transition: picker.open
                  ? "transform 380ms cubic-bezier(0.34, 1.7, 0.5, 1), opacity 120ms ease-out"
                  : "transform 200ms ease-in, opacity 160ms ease-in",
              }}
            >
              {ACTIVITIES.map((a, i) => {
                const d = Math.abs(i - picker.index);
                const on = d === 0;
                return (
                  <div
                    key={a.id}
                    role="img"
                    aria-label={a.label}
                    className="flex items-center justify-center bg-white"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      border: on ? `2.5px solid ${PIG_INK}` : `1.3px solid ${ROOM_INK}`,
                      opacity: on ? 1 : d === 1 ? 0.8 : 0.55,
                      transform: `translateY(${on ? 3 : 0}px) scale(${on ? 1.26 : d === 1 ? 0.94 : 0.86})`,
                      boxShadow: on ? "0 2px 0 rgba(212,98,140,0.25)" : "none",
                      transition: "transform 260ms cubic-bezier(0.34, 1.6, 0.5, 1), opacity 180ms ease, border-color 180ms ease",
                    }}
                  >
                    <ActivityIcon id={a.id} />
                  </div>
                );
              })}
            </div>
            {/* The aperture grille: vertical stripes of red, green and blue. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,70,100,0.20) 0px, rgba(255,70,100,0.20) 1px, rgba(80,255,130,0.13) 1px, rgba(80,255,130,0.13) 2px, rgba(80,120,255,0.22) 2px, rgba(80,120,255,0.22) 3px)",
                mixBlendMode: "soft-light",
              }}
            />
            {/* Scanlines. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.035) 3px, rgba(0,0,0,0.035) 4px)",
              }}
            />
            {/* The glass: a faint diagonal sheen, a reflection along the top, vignette. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(118deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 26%, rgba(255,255,255,0) 40%), linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 12%), radial-gradient(130% 120% at 50% 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.5) 100%)",
              }}
            />
            {/* The recess: shadow pooled along the top and left. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: glassRadius(),
                boxShadow:
                  "inset 0 8px 14px rgba(0,0,0,0.7), inset 6px 0 12px rgba(0,0,0,0.42), inset -3px 0 8px rgba(0,0,0,0.3), inset 0 -2px 6px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(0,0,0,0.85)",
              }}
            />
          </div>
        </div>

        {/* The keys: four solid blocks packed into one recessed tray. */}
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: 38,
            bottom: 40,
            width: 364,
            height: 118,
            borderRadius: KEY_RADIUS + 4,
            backgroundImage: "linear-gradient(180deg, #060607 0%, #0b0b0c 100%)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.10), 0 -1px 0 rgba(0,0,0,0.55), inset 0 8px 10px -1px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(0,0,0,0.9), inset 0 -2px 3px rgba(0,0,0,0.35)",
          }}
        />
        <div className="absolute flex gap-[4.5px]" style={{ left: 42, bottom: 44, width: 356, height: 110 }}>
          {keys.map((key, i) => {
            const isDown = down === i;
            const travel = isDown ? SINK : 0;
            return (
              <button
                key={i}
                type="button"
                aria-label={key.label}
                aria-pressed={i === 0 && !picker.open ? key.pressed : undefined}
                aria-expanded={i === 3 ? picker.open : undefined}
                onClick={() => {
                  if (key.kind === "sleep" || key.kind === "feed" || key.kind === "home") actRef.current?.(key.kind);
                  else if (key.kind === "open") setPicker((st) => ({ ...st, open: true }));
                  else if (key.kind === "prev") cycle(-1);
                  else if (key.kind === "next") cycle(1);
                  else if (key.kind === "ok") {
                    actRef.current?.(picker.index);
                    closePicker();
                  } else closePicker();
                }}
                {...press(i)}
                className="relative block h-full flex-1 cursor-pointer appearance-none border-0 bg-transparent p-0 outline-none focus-visible:ring-1 focus-visible:ring-white/45 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                style={{ borderRadius: KEY_RADIUS, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
              >
                {/* The skirt: the dark side wall of the block, with its contact
                    shadow on the tray floor. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 block"
                  style={{
                    borderRadius: KEY_RADIUS,
                    backgroundImage: "linear-gradient(180deg, #1b1b1e 0%, #151517 50%, #0f0f11 100%)",
                    boxShadow: [
                      "inset 1px 0 0 rgba(255,255,255,0.075)",
                      "inset -1px 0 0 rgba(255,255,255,0.04)",
                      "inset 0 -1px 0 rgba(255,255,255,0.075)",
                      "inset 0 -3px 3px -2px rgba(0,0,0,0.6)",
                      isDown
                        ? "0 1px 0 rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.8)"
                        : "0 1px 0 rgba(0,0,0,0.95), 0 3px 4px rgba(0,0,0,0.85), 0 6px 7px -2px rgba(0,0,0,0.6)",
                    ].join(", "),
                    transition: isDown ? "box-shadow 45ms ease-out" : "box-shadow 240ms ease-out",
                  }}
                />
                {/* The face, inset a pixel from the skirt on three sides. */}
                <span
                  aria-hidden="true"
                  className="absolute flex items-center justify-center overflow-hidden"
                  style={{
                    left: 1,
                    right: 1,
                    top: 0,
                    height: `calc(100% - ${SKIRT}px)`,
                    borderRadius: FACE_RADIUS,
                    backgroundImage:
                      "radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.06), rgba(255,255,255,0) 65%), linear-gradient(180deg, #2d2d30 0%, #29292c 30%, #242427 70%, #202023 100%)",
                    boxShadow: [
                      // A thin bright line where the face meets the skirt.
                      "0 1px 0 rgba(255,255,255,0.11)",
                      "0 2px 1px -1px rgba(0,0,0,0.7)",
                      "inset 0 1px 0 rgba(255,255,255,0.30)",
                      "inset 1px 1px 0 rgba(255,255,255,0.07)",
                      "inset -1px 0 0 rgba(255,255,255,0.025)",
                      "inset 0 -2px 3px rgba(0,0,0,0.38)",
                      "inset 0 0 9px rgba(0,0,0,0.22)",
                    ].join(", "),
                    transform: `translateY(${travel}px)`,
                    filter: isDown ? "brightness(0.88)" : "none",
                    transition: isDown
                      ? "transform 45ms ease-out, filter 45ms ease-out"
                      : "transform 260ms cubic-bezier(0.34, 1.6, 0.5, 1), filter 200ms ease-out",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundImage: KEY_GRAIN, backgroundSize: "160px 160px", mixBlendMode: "soft-light", opacity: 0.1 }}
                  />
                  <span key={key.glyph} className="pp-flip flex items-center justify-center">
                    <Glyph id={key.glyph} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
