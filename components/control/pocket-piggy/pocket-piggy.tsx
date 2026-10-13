"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PocketPiggyProps = {
  /** Accepted for the gallery card. The piggy simply wanders on its own;
   *  there are no scripted presses. */
  loop?: boolean;
  className?: string;
};

/** The device's true size. It is scaled down to fit whatever it is put in. */
const DECK = 440;

/** The largest it is ever shown, however much room it has. */
const MAX_SIZE = 320;

/** The tape's own resolution. Drawn small and scaled up, the way a CRT would. */
const W = 320;
const H = 183;
const HORIZON = Math.round(H * 0.62);
const GROUND = Math.round(H * 0.74);

/** Where the first frame is frozen at: a pleasing spread of dust. */
const REST_TIME = 3.1;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A small seeded generator, so the dust is the same on the server and in the
 *  browser and from one visit to the next. */
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

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mixes two #rrggbb colours. */
function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  return `rgb(${Math.round(lerp(ar, br, t))},${Math.round(lerp(ag, bg, t))},${Math.round(lerp(ab, bb, t))})`;
}

/** The sky, top to horizon, by day and by night: the same stops, so one
 *  number (0 = day, 1 = night) walks every colour from one to the other. */
const SKY_STOPS = [0, 0.06, 0.14, 0.25, 0.42, 0.6, 0.8, 0.9, 1];
const SKY_DAY = ["#3468ff", "#4f78ff", "#a07ff8", "#ee74ea", "#ff72dc", "#ff78d0", "#ff9fb0", "#ffbf8a", "#ff9a62"];
const SKY_NIGHT = ["#07052e", "#0e0a48", "#1a1478", "#34228e", "#53299a", "#74339f", "#9440a0", "#b04e98", "#c45f8e"];

const DUST_COLOURS = ["#ff2a2a", "#22e05a", "#2b4bff", "#ffe030", "#ffffff", "#0a0a0a"];

/** ~26 flecks, each with its own beat. Position is hashed from the beat, so a
 *  fleck hops to a fresh spot every period instead of drifting. */
const DUST = (() => {
  const rnd = mulberry32(0x5eed);
  return Array.from({ length: 26 }, (_, i) => ({
    period: 0.7 + rnd() * 1.9,
    phase: rnd(),
    size: 3 + Math.floor(rnd() * 3),
    colour: DUST_COLOURS[i % DUST_COLOURS.length],
  }));
})();

/** A few night stars and some tufts of grass, seeded the same way. */
const STARS = (() => {
  const rnd = mulberry32(0x57a2);
  return Array.from({ length: 26 }, () => ({
    x: Math.floor(rnd() * (W - 4)),
    y: Math.floor(rnd() * (GROUND - 40)) + 2,
    phase: rnd() * 6.28,
    rate: 1.2 + rnd() * 2.4,
  }));
})();
const TUFTS = (() => {
  const rnd = mulberry32(0x6a55);
  return Array.from({ length: 16 }, () => ({
    x: 4 + Math.floor(rnd() * (W - 8)),
    y: GROUND + 8 + Math.floor(rnd() * (H - GROUND - 12)),
    phase: rnd() * 6.28,
  }));
})();

/* ------------------------------------------------------------------------- */
/* Pixel art: every sprite is a small map of letters and a palette            */
/* ------------------------------------------------------------------------- */

type Sprite = { x: number; y: number; rows: string[] };

const PIG_PALETTE: Record<string, string> = {
  O: "#a83d6c", // outline
  P: "#ff9ec4", // pink
  L: "#ffd3e4", // belly
  S: "#e0679a", // shade
  K: "#ffb9d6", // snout
  N: "#7a2048", // nostril, mouth
  B: "#ff6f9f", // blush
  E: "#3b1530", // eye
  H: "#ffffff", // eye highlight
};

/** Drawn facing right; it is flipped to face the other way. The body, legs,
 *  tail, eye and mouth are separate layers so one pig can do everything. */
const PIG_BODY: Sprite = { x: 0, y: 0, rows: [
    "............OPPO........",
    "........OOOOPSSPOO......",
    "....OOOOPPPOPPSSPOO.....",
    "...OPPLLPPPPOPSSPPOO....",
    "..OPPLPPPPPPPOPPPOPPO...",
    ".OPPLPPPPPPPPPOOOPPPPO..",
    "OPPPPPPPPPPPPPPPPPPKKKO.",
    "OPPPPPPPPPPPPPPPPPPSNNKO",
    "OPPPPPPPPPPPPPPBBBPSKKKO",
    "OSPPPPPPPPPPPPPBBBPSNNKO",
    ".OSPPLLLLLLLLLLLPPPSKKSO",
    "..OSPPPPLLLLPPPPPPSSSSO.",
    "...OSSSSPPPPSSSSSSOOOO..",
    "....OOOOSSSSOOOOOO......",
    "........OOOO............",
  ] };

const PIG_LEGS: Sprite[] = [
{ x: 3, y: 12, rows: [
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OSSOOSSO",
    "OOOOOOOO..OOOOOOOO",
  ] },
{ x: 3, y: 12, rows: [
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OPPOOSSO",
    "OOOOOSSO..OSSOOOOO",
    "....OOOO..OOOO....",
  ] },
{ x: 3, y: 12, rows: [
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OPPOOPPO",
    "OSSOOSSO..OSSOOPPO",
    "OSSOOOOO..OOOOOSSO",
    "OOOO..........OOOO",
  ] },
];

const PIG_EYES: Record<"open" | "closed" | "happy", Sprite> = {
  open: { x: 16, y: 5, rows: [
    "HE",
    "EE",
  ] },
  closed: { x: 16, y: 6, rows: [
    "EE",
  ] },
  happy: { x: 15, y: 5, rows: [
    ".EE.",
    "E..E",
  ] },
};

const PIG_TAILS: Sprite[] = [
{ x: 0, y: 4, rows: [
    ".OO",
    "OOO",
    "O..",
  ] },
{ x: 0, y: 4, rows: [
    ".O.",
    "O.O",
    "O..",
    "O..",
  ] },
];

const PIG_MOUTH: Sprite = { x: 19, y: 11, rows: [
    "NNN",
    ".OO",
  ] };

const PIG_SLEEP: Sprite = { x: 0, y: 5, rows: [
    "...............OOO......",
    ".........OOOOOOPPPO.....",
    ".....OOOOPPPPOPPSSPO....",
    "...OOPPPPPPPPOPPSSPOO...",
    "..OPPPPPPPPPPPOPPPOPPO..",
    ".OOPPPPPPPPPPPPOOOPPPO..",
    "OPOPPPPPPPPPPPPPPPEEEPO.",
    "OPPPPPPPPPPPPPPPPPPPKNO.",
    "OSPPPPPPPPPPPPPPPBBPKKKO",
    ".OSPPPPPPPPPPPPPPBBPKNKO",
    "..OSSPLLLLLLLLLLPPPSKKO.",
    "...OOSSSLLLLLLLSSSSOOO..",
    ".....OOOSOOSSSSOOOO.....",
    "........OOOOOOO.........",
  ] };

const APPLE = [
  "...sGG.",
  ".RRsRR.",
  "RRHRRRR",
  "RHRRRRR",
  "RRRRRRD",
  ".RRRRD.",
  "..RDD..",
];
const APPLE_PALETTE: Record<string, string> = { R: "#ff4d5e", D: "#c2263f", H: "#ffc2c8", s: "#6b3a1f", G: "#5ec26a" };

const HEART = [".R.R.", "RRRRR", "RRRRR", ".RRR.", "..R.."];
const Z_LETTER = ["ZZZZZ", "...Z.", "..Z..", ".Z...", "ZZZZZ"];

/** The little hut the piggy calls home: a roof, a door, a window. */
const HUT = [
  "......RRRR......",
  "....RRRRRRRR....",
  "..RRRRRRRRRRRR..",
  ".RRRRRrRRRRRRRR.",
  "RRRRRRRRRRRRRRRR",
  "..WWWWWWWWWWWW..",
  "..WWWWWWWWWWWW..",
  "..WWDDDWWWwwWW..",
  "..WWDDDWWWwwWW..",
  "..WWDDDWWWWWWW..",
  "..WWDDDWWWWWWW..",
  "..WWDDDWWWWWWW..",
];
const HUT_PALETTE: Record<string, string> = { R: "#d0577a", r: "#e8809c", W: "#f0d6b4", w: "#9ac4e0", D: "#3a2430" };


/* ------------------------------------------------------------------------- */
/* The world                                                                  */
/* ------------------------------------------------------------------------- */

type Ctx = CanvasRenderingContext2D;

/** Size of one sprite pixel, in canvas pixels: about 45px for the pig. */
const PIG_SCALE = 1.9;
/** Where the pig stands to be home, and where it goes to sleep. */
const HOME = { x: 66, y: 162 };
const BED = { x: W / 2, y: 163 };
const HUT_POS = { x: 8, y: 163 };
/** Pig sprite sheet: 24 by 19 sprite pixels, feet on row 17. */
const SHEET_W = 24;
const SHEET_H = 19;

function paintMap(x: Ctx, rows: string[], palette: Record<string, string>, px: number, py: number, scale: number, mirror = false) {
  const width = rows[0].length;
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    for (let c = 0; c < row.length; c += 1) {
      const colour = palette[row[c]];
      if (!colour) continue;
      x.fillStyle = colour;
      const cx = mirror ? width - 1 - c : c;
      x.fillRect(Math.round(px + cx * scale), Math.round(py + r * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
}

function paintSprite(x: Ctx, s: Sprite) {
  for (let r = 0; r < s.rows.length; r += 1) {
    const row = s.rows[r];
    for (let c = 0; c < row.length; c += 1) {
      const colour = PIG_PALETTE[row[c]];
      if (!colour) continue;
      x.fillStyle = colour;
      x.fillRect(s.x + c, s.y + r, 1, 1);
    }
  }
}

type Mode = "idle" | "walk" | "eat" | "happy" | "sleep";
type Apple = { x: number; y: number; vy: number; rest: number; bounces: number; landed: boolean; bites: number; side: 1 | -1 };
type Pig = { x: number; y: number; dir: 1 | -1; mode: Mode; modeT: number; tx: number; ty: number; idleUntil: number; eating: Apple | null; biteT: number };
type Heart = { x: number; y: number; t0: number };
type Crumb = { x: number; y: number; vx: number; vy: number; t0: number; colour: string };
type Zed = { x: number; y: number; t0: number };

type World = {
  t: number;
  night: number;
  asleep: boolean;
  goHome: boolean;
  fullness: number;
  fullShown: number;
  fullAt: number;
  pig: Pig;
  apples: Apple[];
  hearts: Heart[];
  crumbs: Crumb[];
  zeds: Zed[];
  lastZ: number;
  lastHeart: number;
};

function newWorld(): World {
  return {
    t: REST_TIME,
    night: 0,
    asleep: false,
    goHome: false,
    fullness: 0,
    fullShown: 0,
    fullAt: 0,
    pig: { x: HOME.x, y: HOME.y, dir: -1, mode: "idle", modeT: 0, tx: HOME.x, ty: HOME.y, idleUntil: REST_TIME + 2.5, eating: null, biteT: 0 },
    apples: [],
    hearts: [],
    crumbs: [],
    zeds: [],
    lastZ: -10,
    lastHeart: -10,
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

const BODY_GRAIN = grain(1.05, 180, 7, 1.5);
const BODY_SPECK = grain(0.5, 240, 3, 1.5);
const KEY_GRAIN = grain(0.95, 160, 11, 1.6);


const NOISE_W = 160;
const NOISE_H = 92;

/* ------------------------------------------------------------------------- */
/* The keys                                                                   */
/* ------------------------------------------------------------------------- */

/** How tall the skirt shows under the face at rest, and how far the face
 *  travels down when pressed (leaving 2px of skirt). */
const SKIRT = 8;
const SINK = 6;

type KeyId = "sleep" | "feed" | "home";

/** One corner for the screen glass and every key, so they read as a set; the
 *  bezel ring and the tray step out from it concentrically. */
const KEY_RADIUS = 16;
/** The face sits a pixel inside the skirt. */
const FACE_RADIUS = KEY_RADIUS - 1;

function Glyph({ id }: { id: KeyId }) {
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
      width={38}
      height={38}
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
    </svg>
  );
}

/**
 * A square slab of matte black plastic with a CRT sunk into its top, and on
 * the glass a small pink pixel piggy in a sunset meadow. Sleep puts the sky
 * to night and the piggy to bed, feed drops an apple for it to trot over and
 * eat, home sends it running back to its hut.
 */
export function PocketPiggy({ className }: PocketPiggyProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const actRef = React.useRef<((id: KeyId) => void) | null>(null);

  const [asleep, setAsleep] = React.useState(false);
  const [down, setDown] = React.useState<KeyId | null>(null);

  // Scale the deck to the space it has.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.min(MAX_SIZE / DECK, (host.clientWidth - 24) / DECK, (host.clientHeight - 24) / DECK);
      fit.style.transform = `scale(${Math.max(0.3, scale).toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // The screen: one 2D canvas, one rAF loop, only while it can be seen.
  React.useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w = newWorld();
    const rnd = mulberry32(0xb166);

    // The pig is composed a sprite pixel at a time on a small sheet, then
    // stamped onto the screen with no smoothing.
    const sheet = document.createElement("canvas");
    sheet.width = SHEET_W;
    sheet.height = SHEET_H;
    const sx = sheet.getContext("2d");
    // A pre-drawn apple, for the bites to shrink.
    const appleSheet = document.createElement("canvas");
    appleSheet.width = 7;
    appleSheet.height = 7;
    const ax = appleSheet.getContext("2d");
    if (ax) paintMap(ax, APPLE, APPLE_PALETTE, 0, 0, 1);

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
    const stamp = (alpha: number, y = 0, h = H) => {
      fillNoise();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(noiseCanvas, 0, 0, NOISE_W, (h / H) * NOISE_H, 0, y, W, h);
      ctx.restore();
    };

    const canBloom = "filter" in ctx;

    /* ----------------------------- behaviour ----------------------------- */

    const startIdle = () => {
      const p = w.pig;
      p.mode = "idle";
      p.modeT = 0;
      p.idleUntil = w.t + 1.6 + rnd() * 2.8;
    };
    const startHappy = () => {
      const p = w.pig;
      p.mode = "happy";
      p.modeT = 0;
      w.lastHeart = -10;
    };
    /** Takes a step toward a spot. True once it is there. */
    const walkTo = (tx: number, ty: number, speed: number, dt: number) => {
      const p = w.pig;
      const dx = tx - p.x;
      const dy = ty - p.y;
      if (Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2) return true;
      if (p.mode !== "walk") {
        p.mode = "walk";
        p.modeT = 0;
      }
      if (Math.abs(dx) > 1.2) p.dir = dx > 0 ? 1 : -1;
      const dist = Math.hypot(dx, dy);
      const stepLen = Math.min(dist, speed * dt);
      p.x += (dx / dist) * stepLen;
      p.y += (dy / dist) * stepLen * 0.9;
      return false;
    };

    const step = (dt: number) => {
      w.t += dt;
      const p = w.pig;
      p.modeT += dt;

      // Day and night: a little over a second to cross.
      const nightGoal = w.asleep ? 1 : 0;
      w.night += Math.max(-dt / 1.2, Math.min(dt / 1.2, nightGoal - w.night));

      // The pig slowly slims back down.
      if (w.fullness > 0 && w.t - w.fullAt > 20) {
        w.fullness -= 1;
        w.fullAt = w.t;
      }
      w.fullShown += (w.fullness - w.fullShown) * Math.min(1, dt * 4);

      // Apples fall, bounce once and settle.
      for (const a of w.apples) {
        if (a.landed) continue;
        a.vy += 520 * dt;
        a.y += a.vy * dt;
        if (a.y >= a.rest) {
          a.y = a.rest;
          if (a.bounces < 1) {
            a.vy = -a.vy * 0.36;
            a.bounces += 1;
          } else {
            a.vy = 0;
            a.landed = true;
          }
        }
      }
      // Crumbs.
      for (const c of w.crumbs) {
        c.vy += 260 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
      w.crumbs = w.crumbs.filter((c) => w.t - c.t0 < 0.7);
      w.hearts = w.hearts.filter((h) => w.t - h.t0 < 1.5);
      w.zeds = w.zeds.filter((z) => w.t - z.t0 < 2.8);

      // Mid-meal and mid-hop, the pig finishes what it is doing.
      if (p.mode === "eat" && p.eating) {
        p.biteT += dt;
        if (p.biteT >= 0.5) {
          p.biteT = 0;
          const a = p.eating;
          a.bites += 1;
          for (let i = 0; i < 4; i += 1) {
            w.crumbs.push({
              x: a.x,
              y: a.y - 6,
              vx: (rnd() - 0.5) * 70 + p.dir * 18,
              vy: -50 - rnd() * 40,
              t0: w.t,
              colour: i % 2 ? "#ff4d5e" : "#ffe6c8",
            });
          }
          if (a.bites >= 3) {
            w.apples = w.apples.filter((o) => o !== a);
            p.eating = null;
            w.fullness = Math.min(3, w.fullness + 1);
            w.fullAt = w.t;
            startHappy();
          }
        }
        return;
      }
      if (p.mode === "happy") {
        if (w.t - w.lastHeart > 0.35 && p.modeT < 1.1) {
          w.lastHeart = w.t;
          w.hearts.push({ x: p.x + (rnd() - 0.5) * 22, y: p.y - 34, t0: w.t });
        }
        if (p.modeT > 1.5) startIdle();
        return;
      }

      // Asleep, or on the way to bed.
      if (w.asleep) {
        if (p.mode === "sleep") {
          if (w.t - w.lastZ > 1.0) {
            w.lastZ = w.t;
            w.zeds.push({ x: p.x + p.dir * 16, y: p.y - 20, t0: w.t });
          }
          return;
        }
        if (walkTo(BED.x, BED.y, 30, dt)) {
          p.mode = "sleep";
          p.modeT = 0;
          p.dir = 1;
        }
        return;
      }
      if (p.mode === "sleep") startIdle();

      // Home beats everything but a meal in progress.
      if (w.goHome) {
        if (walkTo(HOME.x, HOME.y, 84, dt)) {
          w.goHome = false;
          p.dir = -1;
          startHappy();
        }
        return;
      }

      // An apple, if there is one.
      const apple = w.apples[0];
      if (apple) {
        const dest = Math.max(30, Math.min(W - 30, apple.x - apple.side * 17));
        if (walkTo(dest, apple.y, 62, dt)) {
          if (apple.landed) {
            p.dir = apple.side;
            p.mode = "eat";
            p.modeT = 0;
            p.biteT = 0;
            p.eating = apple;
          } else if (p.mode !== "idle") {
            p.mode = "idle";
            p.modeT = 0;
          }
        }
        return;
      }

      // Otherwise, wander.
      if (p.mode === "walk") {
        if (walkTo(p.tx, p.ty, 17, dt)) startIdle();
      } else if (w.t >= p.idleUntil) {
        p.tx = 78 + rnd() * (W - 118);
        p.ty = 152 + rnd() * 14;
        if (Math.abs(p.tx - p.x) < 24) p.tx = p.x + (p.x > W / 2 ? -40 : 40);
        walkTo(p.tx, p.ty, 17, dt);
      }
    };

    /* ------------------------------ painting ------------------------------ */

    const paintPig = () => {
      if (!sx) return;
      const p = w.pig;
      sx.clearRect(0, 0, SHEET_W, SHEET_H);
      const t = w.t;
      let anchor = 17;
      if (p.mode === "sleep") {
        paintSprite(sx, PIG_SLEEP);
        anchor = 18;
      } else {
        const walking = p.mode === "walk";
        const leg = walking ? 1 + (Math.floor(p.modeT * 6) % 2) : 0;
        paintSprite(sx, PIG_LEGS[leg]);
        paintSprite(sx, PIG_BODY);
        paintSprite(sx, PIG_TAILS[Math.floor(t * (p.mode === "happy" ? 7 : 2.6)) % 2]);
        const blink = t % 3.7 < 0.14;
        const content = p.mode === "eat" || p.mode === "happy";
        paintSprite(sx, PIG_EYES[content ? "happy" : blink ? "closed" : "open"]);
        if (p.mode === "eat" && Math.floor(p.biteT * 9) % 2 === 0) paintSprite(sx, PIG_MOUTH);
      }

      // Rounder with every apple.
      const fat = w.fullShown;
      let kx = PIG_SCALE * (1 + 0.075 * fat);
      let ky = PIG_SCALE * (1 + 0.03 * fat);
      let lift = 0;
      if (p.mode === "sleep") ky *= 1 + Math.sin(t * 1.6) * 0.035;
      else if (p.mode === "idle") ky *= 1 + Math.sin(t * 3) * 0.022;
      else if (p.mode === "walk") lift = Math.abs(Math.sin(p.modeT * 12)) * 1.2;
      else if (p.mode === "happy") {
        const u = Math.min(1, p.modeT / 1.4);
        lift = Math.abs(Math.sin(u * Math.PI * 2)) * 10;
      } else if (p.mode === "eat") ky *= 1 - Math.abs(Math.sin(p.biteT * Math.PI * 4)) * 0.03;
      kx *= p.mode === "sleep" ? 1.04 : 1;

      // A soft shadow on the grass.
      const sw = 20 * (kx / PIG_SCALE) * (1 - lift / 40);
      ctx.fillStyle = "rgba(10,6,20,0.32)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 1, sw, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor = "rgba(255,160,205,0.55)";
      ctx.shadowBlur = 7;
      ctx.translate(p.x, p.y - lift);
      ctx.scale(p.dir * kx, ky);
      ctx.drawImage(sheet, -SHEET_W / 2, -anchor);
      ctx.restore();
    };

    const draw = (now: number) => {
      noiseFresh = false;
      const t = w.t;
      const n = w.night;

      // The sky: sunset by day, indigo and violet by night.
      const breath = Math.sin(t * 0.5) * 0.014;
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      for (let i = 0; i < SKY_STOPS.length; i += 1) {
        const pos = SKY_STOPS[i];
        const shifted = pos > 0.05 && pos < 0.95 ? pos + breath : pos;
        sky.addColorStop(clamp01(shifted), mix(SKY_DAY[i], SKY_NIGHT[i], n));
      }
      ctx.fillStyle = sky;
      ctx.fillRect(-2, -2, W + 4, H + 4);

      // The warm bloom along the horizon.
      ctx.save();
      ctx.translate(W * 0.5, HORIZON + 8);
      ctx.scale(1, 0.26);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 190);
      const ga = lerp(0.55, 0.3, n) * (0.88 + Math.sin(t * 0.7) * 0.12);
      const gr = `${Math.round(lerp(255, 190, n))},${Math.round(lerp(196, 100, n))},${Math.round(lerp(128, 200, n))}`;
      glow.addColorStop(0, `rgba(${gr},${ga.toFixed(3)})`);
      glow.addColorStop(1, `rgba(${gr},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(-W, -200, W * 2, 400);
      ctx.restore();

      // Stars, once it is dark.
      if (n > 0.02) {
        for (const s of STARS) {
          const a = n * (0.45 + 0.55 * Math.sin(t * s.rate + s.phase));
          if (a <= 0.05) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = "#fff6d8";
          ctx.fillRect(s.x, s.y, 2, 2);
          if (a > 0.7) {
            ctx.fillRect(s.x - 1, s.y, 4, 2);
            ctx.fillRect(s.x, s.y - 1, 2, 4);
          }
        }
        ctx.globalAlpha = 1;
      }

      // Dust: small coloured squares that hop and twinkle, dimmer at night.
      for (let i = 0; i < DUST.length; i += 1) {
        const d = DUST[i];
        const beat = t / d.period + d.phase;
        const slot = Math.floor(beat);
        const u = beat - slot;
        const alpha = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1;
        if (alpha <= 0.02) continue;
        const dx = Math.floor(hash(i, slot, 1) * (W - 6));
        const dy = Math.floor(hash(i, slot, 2) * (HORIZON - 12)) + 2;
        ctx.globalAlpha = alpha * 0.92 * (1 - 0.65 * n);
        ctx.fillStyle = d.colour;
        ctx.fillRect(dx, dy, d.size, d.size);
      }
      ctx.globalAlpha = 1;

      // The faint line of the horizon, and the dusky meadow.
      ctx.fillStyle = `rgba(70,20,80,${(0.3 + 0.1 * n).toFixed(2)})`;
      ctx.fillRect(0, HORIZON, W, 1);
      const meadow = ctx.createLinearGradient(0, GROUND - 6, 0, H);
      meadow.addColorStop(0, "rgba(0,0,0,0)");
      meadow.addColorStop(0.1, mix("#55425f", "#1b1636", n));
      meadow.addColorStop(1, mix("#25402f", "#0b0d1b", n));
      ctx.fillStyle = meadow;
      ctx.fillRect(0, GROUND - 6, W, H - GROUND + 6);
      // A lighter lip along the top of the grass.
      ctx.fillStyle = mix("#6a5a7a", "#2c2552", n);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, GROUND + 1, W, 1);
      ctx.globalAlpha = 1;

      // Grass tufts.
      ctx.fillStyle = mix("#9cc47c", "#3c4b6c", n);
      for (const g of TUFTS) {
        const sway = Math.round(Math.sin(t * 1.3 + g.phase));
        ctx.fillRect(g.x, g.y, 2, 2);
        ctx.fillRect(g.x - 2 + sway, g.y - 3, 2, 3);
        ctx.fillRect(g.x + 2 - sway, g.y - 3, 2, 3);
        ctx.fillRect(g.x, g.y - 5, 2, 3);
      }

      // The hut, dimmed with the day.
      paintMap(ctx, HUT, HUT_PALETTE, HUT_POS.x, HUT_POS.y - HUT.length * 2, 2);
      if (n > 0.01) {
        ctx.fillStyle = `rgba(14,10,48,${(n * 0.5).toFixed(2)})`;
        ctx.fillRect(HUT_POS.x, HUT_POS.y - HUT.length * 2, 32, HUT.length * 2);
      }

      // Apples on the grass, shrinking as they are eaten.
      for (const a of w.apples) {
        const k = [1, 0.72, 0.44][Math.min(2, a.bites)];
        const size = 14 * k;
        ctx.fillStyle = "rgba(10,6,20,0.3)";
        ctx.fillRect(a.x - size / 2, a.rest, size, 2);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(appleSheet, Math.round(a.x - size / 2), Math.round(a.y - size), size, size);
        ctx.restore();
      }

      paintPig();

      // Crumbs, hearts, and the z's.
      for (const c of w.crumbs) {
        ctx.globalAlpha = clamp01(1 - (w.t - c.t0) / 0.7);
        ctx.fillStyle = c.colour;
        ctx.fillRect(Math.round(c.x), Math.round(c.y), 2, 2);
      }
      ctx.globalAlpha = 1;
      for (const h of w.hearts) {
        const u = (w.t - h.t0) / 1.5;
        ctx.globalAlpha = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
        paintMap(ctx, HEART, { R: "#ff4f7b" }, Math.round(h.x - 5 + Math.sin(u * 9) * 3), Math.round(h.y - u * 24), 2);
      }
      ctx.globalAlpha = 1;
      for (const z of w.zeds) {
        const u = (w.t - z.t0) / 2.8;
        ctx.globalAlpha = (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) * 0.95;
        paintMap(ctx, Z_LETTER, { Z: "#f4f0ff" }, Math.round(z.x + u * 14 + Math.sin(u * 7) * 2), Math.round(z.y - u * 30), 2 + Math.round(u * 1.2));
      }
      ctx.globalAlpha = 1;

      // Bloom: the picture, blurred, laid back over itself.
      if (canBloom) {
        ctx.save();
        ctx.filter = "blur(2.2px)";
        ctx.globalAlpha = 0.2;
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
      }

      // Tracking: a bright line that mostly rests near the foot of the frame
      // and now and then rolls all the way up, tearing the picture sideways.
      const cycle = 9;
      const phase = t % cycle;
      let ty = H * 0.935;
      let th = 2;
      let tear = 1.5;
      if (phase < 1.8) {
        const u = phase / 1.8;
        const e = u * u * (3 - 2 * u);
        ty = H * 0.935 - e * H * 1.0;
        th = 5;
        tear = 4 * Math.sin(u * Math.PI) + 1;
      }
      if (ty > -6) {
        const jx = Math.sin(t * 40) * tear;
        ctx.drawImage(canvas, 0, ty, W, th, jx, ty, W, th);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(0, ty + th - 1, W, 1);
      }
      // Head-switching noise at the very foot.
      ctx.drawImage(canvas, 0, H - 4, W, 4, Math.sin(t * 3) * 3 + 2, H - 4, W, 4);

      // Faint film noise, a few streaks.
      stamp(0.055);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let i = 0; i < 3; i += 1) {
        const y = Math.floor(hash(Math.floor(now / 60), i, 9) * H);
        const x0 = Math.floor(hash(Math.floor(now / 60), i, 10) * W);
        ctx.fillRect(x0, y, 20 + hash(i, 4, Math.floor(now / 60)) * 90, 1);
      }
    };

    // Motion reduced: one still frame, the piggy at rest by its hut.
    const redraw = () => {
      if (reduced) draw(performance.now());
    };
    actRef.current = (id) => {
      if (id === "sleep") {
        w.asleep = !w.asleep;
        if (w.asleep) w.goHome = false;
        setAsleep(w.asleep);
        if (reduced) {
          w.night = w.asleep ? 1 : 0;
          if (w.asleep) {
            w.pig.x = BED.x;
            w.pig.y = BED.y;
            w.pig.mode = "sleep";
          } else {
            w.pig.x = HOME.x;
            w.pig.y = HOME.y;
            w.pig.mode = "idle";
          }
        }
      } else if (id === "feed") {
        if (w.asleep) {
          w.asleep = false;
          setAsleep(false);
        }
        if (w.apples.length < 3) {
          w.apples.push({
            x: 76 + rnd() * (W - 110),
            y: -12,
            vy: 0,
            rest: 154 + rnd() * 12,
            bounces: 0,
            landed: false,
            bites: 0,
            side: 1,
          });
          const a = w.apples[w.apples.length - 1];
          a.side = a.x > w.pig.x ? -1 : 1;
        }
      } else {
        if (w.asleep) {
          w.asleep = false;
          setAsleep(false);
        }
        w.goHome = true;
      }
      redraw();
    };
    draw(performance.now());
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
      draw(now);
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

  const press = (id: KeyId) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 0) setDown(id);
    },
    onPointerUp: () => setDown((d) => (d === id ? null : d)),
    onPointerLeave: () => setDown((d) => (d === id ? null : d)),
    onPointerCancel: () => setDown((d) => (d === id ? null : d)),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") setDown(id);
    },
    onKeyUp: () => setDown((d) => (d === id ? null : d)),
    onBlur: () => setDown((d) => (d === id ? null : d)),
  });

  const keys: { id: KeyId; label: string; pressed?: boolean }[] = [
    { id: "sleep", label: "Sleep", pressed: asleep },
    { id: "feed", label: "Feed" },
    { id: "home", label: "Home" },
  ];

  return (
    <div
      ref={hostRef}
      className={cn("flex h-full min-h-[420px] w-full items-center justify-center", className)}
    >
      <div
        ref={fitRef}
        className="relative shrink-0"
        style={{ width: DECK, height: DECK, transformOrigin: "50% 50%" }}
      >
        {/* The body: matte charcoal, sandblasted. */}
        <div
          className="absolute inset-0 isolate overflow-hidden"
          style={{
            borderRadius: 68,
            backgroundColor: "#1a1a1c",
            backgroundImage:
              "radial-gradient(120% 70% at 28% -4%, rgba(255,255,255,0.075), rgba(255,255,255,0) 62%), linear-gradient(180deg, #252528 0%, #1d1d1f 38%, #151517 100%)",
            boxShadow: [
              "0 1px 1px rgba(0,0,0,0.38)",
              "0 6px 8px -2px rgba(0,0,0,0.30)",
              "0 22px 26px -8px rgba(0,0,0,0.26)",
              "0 46px 58px -16px rgba(0,0,0,0.30)",
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
            style={{ backgroundImage: BODY_GRAIN, backgroundSize: "200px 200px", mixBlendMode: "soft-light", opacity: 0.62 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: BODY_SPECK, backgroundSize: "260px 260px", mixBlendMode: "soft-light", opacity: 0.22 }}
          />
          {/* The rim light: a hairline of highlight, strongest along the top. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: 68,
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
              borderRadius: KEY_RADIUS + 2,
              backgroundColor: "#050506",
              boxShadow:
                "0 1.5px 0 rgba(255,255,255,0.09), 0 -1px 1px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.9), 0 0 14px 1px rgba(0,0,0,0.35)",
            }}
          />
          <div
            className="absolute inset-0 isolate overflow-hidden bg-black"
            style={{ borderRadius: KEY_RADIUS }}
          >
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              aria-hidden="true"
              className="absolute inset-0 block h-full w-full"
              style={{ filter: "saturate(1.14) contrast(1.05)" }}
            />
            {/* The aperture grille: vertical stripes of red, green and blue. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,70,100,0.42) 0px, rgba(255,70,100,0.42) 1px, rgba(80,255,130,0.30) 1px, rgba(80,255,130,0.30) 2px, rgba(80,120,255,0.46) 2px, rgba(80,120,255,0.46) 3px)",
                mixBlendMode: "soft-light",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(0,0,0,0.26) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)",
              }}
            />
            {/* Scanlines. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0.09) 3px, rgba(0,0,0,0.09) 4px)",
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
                borderRadius: KEY_RADIUS,
                boxShadow:
                  "inset 0 8px 14px rgba(0,0,0,0.7), inset 6px 0 12px rgba(0,0,0,0.42), inset -3px 0 8px rgba(0,0,0,0.3), inset 0 -2px 6px rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(0,0,0,0.85)",
              }}
            />
          </div>
        </div>

        {/* The keys: three solid blocks packed into one recessed tray. */}
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
          {keys.map((key) => {
            const isDown = down === key.id;
            const travel = isDown ? SINK : 0;
            return (
              <button
                key={key.id}
                type="button"
                aria-label={key.label}
                aria-pressed={key.pressed}
                onClick={() => actRef.current?.(key.id)}
                {...press(key.id)}
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
                    style={{ backgroundImage: KEY_GRAIN, backgroundSize: "160px 160px", mixBlendMode: "soft-light", opacity: 0.28 }}
                  />
                  <Glyph id={key.id} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
