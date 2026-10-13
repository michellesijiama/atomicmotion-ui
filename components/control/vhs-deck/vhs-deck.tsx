"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type VhsDeckProps = {
  /** Accepted for the gallery card. The deck simply plays on its own; there
   *  are no scripted clicks. */
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
const HORIZON = Math.round(H * 0.65);
const GROUND = Math.round(H * 0.77);

/** Where the first frame is frozen at: a pleasing spread of dust. */
const REST_TIME = 3.1;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

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

type Palette = {
  sky: [number, string][];
  /** rgb triplet of the warm bloom at the horizon. */
  glow: string;
  glowAlpha: number;
  ground: string;
  hz: string;
  figure: string;
  figureBack: string;
};

/** Three channels: sunset, dusk, night. */
const PALETTES: Palette[] = [
  {
    sky: [
      [0, "#3468ff"],
      [0.06, "#4f78ff"],
      [0.14, "#a07ff8"],
      [0.25, "#ee74ea"],
      [0.42, "#ff72dc"],
      [0.6, "#ff78d0"],
      [0.8, "#ff9fb0"],
      [0.9, "#ffbf8a"],
      [1, "#ff9a62"],
    ],
    glow: "255,196,128",
    glowAlpha: 0.55,
    ground: "#18181d",
    hz: "rgba(70,20,80,0.32)",
    figure: "#0d0d11",
    figureBack: "#201e29",
  },
  {
    sky: [
      [0, "#0c3f55"],
      [0.12, "#176b78"],
      [0.26, "#3fa6a0"],
      [0.42, "#86cdb0"],
      [0.58, "#f2d9a0"],
      [0.74, "#ffb867"],
      [0.88, "#ff8a3c"],
      [1, "#ff6e2a"],
    ],
    glow: "255,170,90",
    glowAlpha: 0.6,
    ground: "#101a1d",
    hz: "rgba(10,50,60,0.34)",
    figure: "#080f11",
    figureBack: "#182427",
  },
  {
    sky: [
      [0, "#0a0838"],
      [0.14, "#1d1580"],
      [0.3, "#4a24b0"],
      [0.46, "#8a38c8"],
      [0.62, "#c04fc0"],
      [0.78, "#e5649e"],
      [0.9, "#ff8a80"],
      [1, "#ff9f70"],
    ],
    glow: "255,120,170",
    glowAlpha: 0.45,
    ground: "#0d0b1c",
    hz: "rgba(20,10,70,0.4)",
    figure: "#06050f",
    figureBack: "#161229",
  },
];

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

/* ------------------------------------------------------------------------- */
/* The scene                                                                  */
/* ------------------------------------------------------------------------- */

type Ctx = CanvasRenderingContext2D;

/**
 * Two silhouettes, my own shapes: on the left a hunched person in a cap, cut
 * off by the edge, with a second head and shoulder tucked behind; on the right
 * a smaller one sitting alone, facing left.
 */
function figures(x: Ctx, dx: number, colours?: { back: string; front: string }) {
  const p = (path: (c: Ctx) => void) => {
    x.beginPath();
    path(x);
    x.fill();
  };
  const t = (n: number) => n + dx;

  // The head and shoulder behind.
  if (colours) x.fillStyle = colours.back;
  p((c) => {
    c.moveTo(t(52), 184);
    c.lineTo(t(54), 168);
    c.quadraticCurveTo(t(60), 158, t(72), 160);
    c.quadraticCurveTo(t(90), 160, t(98), 171);
    c.lineTo(t(100), 184);
    c.closePath();
  });
  p((c) => c.ellipse(t(70), 149, 10.5, 11.5, 0, 0, Math.PI * 2));

  if (colours) x.fillStyle = colours.front;
  // Left person: shoulders, head, cap and its peak.
  p((c) => {
    c.moveTo(t(-12), 184);
    c.lineTo(t(-12), 153);
    c.quadraticCurveTo(t(2), 142, t(22), 138);
    c.lineTo(t(30), 133);
    c.lineTo(t(46), 134);
    c.quadraticCurveTo(t(58), 139, t(63), 150);
    c.quadraticCurveTo(t(69), 163, t(71), 184);
    c.closePath();
  });
  p((c) => c.ellipse(t(36), 122, 13.2, 14.2, 0, 0, Math.PI * 2));
  p((c) => {
    c.moveTo(t(21), 118);
    c.quadraticCurveTo(t(22), 102, t(37), 101.5);
    c.quadraticCurveTo(t(52), 102, t(54), 116);
    c.closePath();
  });
  p((c) => {
    c.moveTo(t(48), 114.5);
    c.lineTo(t(67), 119.5);
    c.quadraticCurveTo(t(68.5), 122.5, t(64), 123);
    c.lineTo(t(48), 121);
    c.closePath();
  });

  // Right person, facing left.
  p((c) => {
    c.moveTo(t(236), 184);
    c.quadraticCurveTo(t(238), 161, t(252), 151);
    c.lineTo(t(262), 141);
    c.lineTo(t(277), 138);
    c.quadraticCurveTo(t(293), 142, t(305), 153);
    c.quadraticCurveTo(t(317), 161, t(324), 171);
    c.lineTo(t(324), 184);
    c.closePath();
  });
  p((c) => c.ellipse(t(270), 123, 12, 13.2, 0, 0, Math.PI * 2));
  p((c) => {
    c.moveTo(t(259), 121);
    c.lineTo(t(255.5), 126.5);
    c.lineTo(t(260), 128.5);
    c.closePath();
  });
  p((c) => {
    c.moveTo(t(259), 119);
    c.quadraticCurveTo(t(262), 107, t(273), 107.5);
    c.quadraticCurveTo(t(284), 109, t(283), 121);
    c.closePath();
  });
}

/** Pre-drawn once per channel: the silhouettes with a red and a cyan fringe. */
function buildFigures(palette: Palette) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return c;
  x.fillStyle = "rgba(255,50,70,0.8)";
  figures(x, -1.4);
  x.fillStyle = "rgba(40,230,255,0.72)";
  figures(x, 1.4);
  x.shadowColor = palette.figure;
  x.shadowBlur = 1.6;
  figures(x, 0, { back: palette.figureBack, front: palette.figure });
  return c;
}

type Sim = {
  playing: boolean;
  /** Scene clock, seconds. Stops while paused. */
  t: number;
  palette: number;
  pending: number | null;
  switchAt: number;
  noiseAt: number;
  flashAt: number;
  jitter: number;
  jitterAt: number;
};

const NOISE_W = 160;
const NOISE_H = 92;

/* ------------------------------------------------------------------------- */
/* The keys                                                                   */
/* ------------------------------------------------------------------------- */

/** How tall the skirt shows under the face at rest, and how far the face
 *  travels down when pressed (leaving 2px of skirt). */
const SKIRT = 8;
const SINK = 6;

type KeyId = "play" | "share" | "menu";

const KEY_STYLES: Record<KeyId, { radius: string; faceRadius: string }> = {
  play: { radius: "12px 12px 12px 60px", faceRadius: "11px 11px 11px 58px" },
  share: { radius: "12px", faceRadius: "11px" },
  menu: { radius: "12px 12px 60px 12px", faceRadius: "11px 11px 58px 11px" },
};

function Glyph({ id, playing }: { id: KeyId; playing: boolean }) {
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
      {id === "play" &&
        (playing ? (
          <g {...stroke}>
            <rect x="9.2" y="7.4" width="4.6" height="17.2" rx="0.8" />
            <rect x="18.2" y="7.4" width="4.6" height="17.2" rx="0.8" />
          </g>
        ) : (
          <path {...stroke} strokeLinejoin="miter" d="M10.2 6.6 L25.2 16 L10.2 25.4 Z" />
        ))}
      {id === "share" && (
        <g {...stroke}>
          <path d="M11.4 13.2 H8.6 V25.4 H23.4 V13.2 H20.6" />
          <path d="M16 20.4 V6.2" />
          <path d="M11.6 10.4 L16 6 L20.4 10.4" />
        </g>
      )}
      {id === "menu" && (
        <g {...stroke}>
          <path d="M4.5 9.5 H27.5 M4.5 16 H27.5 M4.5 22.5 H27.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * A square slab of matte black plastic with a CRT sunk into its top and three
 * chunky keys beneath. Play pauses the tape — it holds still with the shudder
 * of a paused VHS — share fires the shutter, menu changes the channel.
 */
export function VhsDeck({ className }: VhsDeckProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const actRef = React.useRef<((id: KeyId) => void) | null>(null);
  const sim = React.useRef<Sim>({
    playing: true,
    t: REST_TIME,
    palette: 0,
    pending: null,
    switchAt: 0,
    noiseAt: -1e9,
    flashAt: -1e9,
    jitter: 0,
    jitterAt: 0,
  });

  const [playing, setPlaying] = React.useState(true);
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

    const figureLayers = PALETTES.map(buildFigures);

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

    const draw = (now: number) => {
      const s = sim.current;
      noiseFresh = false;

      if (s.pending !== null && now >= s.switchAt) {
        s.palette = s.pending;
        s.pending = null;
      }
      const pal = PALETTES[s.palette];
      const t = s.t;
      const paused = !s.playing;

      // The pause shudder: the whole frame shakes a pixel, every other beat.
      let jy = 0;
      if (paused && !reduced) {
        if (now - s.jitterAt > 55) {
          s.jitterAt = now;
          s.jitter = Math.floor(Math.random() * 3) - 1;
        }
        jy = s.jitter;
      }

      ctx.save();
      ctx.translate(0, jy);

      // Sky, breathing a little.
      const breath = Math.sin(t * 0.5) * 0.014;
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      for (const [pos, colour] of pal.sky) {
        const shifted = pos > 0.05 && pos < 0.95 ? pos + breath : pos;
        sky.addColorStop(clamp01(shifted), colour);
      }
      ctx.fillStyle = sky;
      ctx.fillRect(-2, -2, W + 4, H + 4);

      // The warm bloom along the horizon.
      ctx.save();
      ctx.translate(W * 0.5, HORIZON + 8);
      ctx.scale(1, 0.26);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 190);
      const ga = pal.glowAlpha * (0.88 + Math.sin(t * 0.7) * 0.12);
      glow.addColorStop(0, `rgba(${pal.glow},${ga.toFixed(3)})`);
      glow.addColorStop(1, `rgba(${pal.glow},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(-W, -200, W * 2, 400);
      ctx.restore();

      // The faint line of the horizon, and the dark ground.
      ctx.fillStyle = pal.hz;
      ctx.fillRect(0, HORIZON, W, 1);
      const ground = ctx.createLinearGradient(0, GROUND - 5, 0, GROUND + 5);
      ground.addColorStop(0, "rgba(0,0,0,0)");
      ground.addColorStop(1, pal.ground);
      ctx.fillStyle = ground;
      ctx.fillRect(0, GROUND - 5, W, 10);
      ctx.fillStyle = pal.ground;
      ctx.fillRect(0, GROUND + 5, W, H);

      // The two of them, breathing very slightly.
      ctx.drawImage(figureLayers[s.palette], 0, Math.sin(t * 1.1) * 0.35);

      // Dust: small coloured squares that hop and twinkle.
      for (let i = 0; i < DUST.length; i += 1) {
        const d = DUST[i];
        const beat = t / d.period + d.phase;
        const slot = Math.floor(beat);
        const u = beat - slot;
        const alpha = u < 0.12 ? u / 0.12 : u > 0.78 ? (1 - u) / 0.22 : 1;
        if (alpha <= 0.02) continue;
        const dx = Math.floor(hash(i, slot, 1) * (W - 6));
        const dy = Math.floor(hash(i, slot, 2) * (HORIZON - 12)) + 2;
        ctx.globalAlpha = alpha * 0.92;
        ctx.fillStyle = d.colour;
        ctx.fillRect(dx, dy, d.size, d.size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

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

      // Paused: a noisy band crawls down the picture and drags it sideways.
      if (paused) {
        const by = ((now * 0.022) % (H + 24)) - 12;
        const sx = Math.round((Math.random() - 0.5) * 7);
        ctx.drawImage(canvas, 0, Math.max(0, by), W, 11, sx, Math.max(0, by), W, 11);
        stamp(0.4, Math.max(0, Math.min(H - 12, by)), 12);
        stamp(0.07);
      } else {
        // Playing: faint film noise, a few streaks.
        stamp(0.055);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        for (let i = 0; i < 3; i += 1) {
          const y = Math.floor(hash(Math.floor(now / 60), i, 9) * H);
          const x0 = Math.floor(hash(Math.floor(now / 60), i, 10) * W);
          ctx.fillRect(x0, y, 20 + hash(i, 4, Math.floor(now / 60)) * 90, 1);
        }
      }

      // Changing channel: static, with the picture torn.
      const nu = (now - s.noiseAt) / 250;
      if (nu >= 0 && nu <= 1) {
        const a = Math.sin(nu * Math.PI);
        const tearY = Math.floor(Math.random() * (H - 30));
        ctx.drawImage(canvas, 0, tearY, W, 20, Math.round((Math.random() - 0.5) * 30 * a), tearY, W, 20);
        stamp(0.15 + a * 0.85);
      }

      // The shutter: a white flash and a short burst of static in its wake.
      const fu = (now - s.flashAt) / 1000;
      if (fu >= 0 && fu < 0.4) {
        const flash = fu < 0.05 ? fu / 0.05 : Math.pow(Math.max(0, 1 - (fu - 0.05) / 0.3), 1.6);
        if (fu >= 0.05 && fu < 0.25) stamp(0.5 * (1 - (fu - 0.05) / 0.2));
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${(flash * 0.96).toFixed(3)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    };

    // With motion reduced there is no loop, so a change repaints the one frame.
    const redraw = () => {
      if (reduced) draw(performance.now());
    };
    actRef.current = (id) => {
      const s = sim.current;
      const now = performance.now();
      if (id === "play") {
        s.playing = !s.playing;
        setPlaying(s.playing);
      } else if (id === "share") {
        s.flashAt = now;
      } else {
        const from = s.pending ?? s.palette;
        s.pending = (from + 1) % PALETTES.length;
        s.noiseAt = now;
        s.switchAt = reduced ? now : now + 125;
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
      if (sim.current.playing) sim.current.t += Math.min(dt, 100) / 1000;
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
    { id: "play", label: "Play", pressed: playing },
    { id: "share", label: "Share" },
    { id: "menu", label: "Menu" },
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
            borderRadius: 106,
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
              borderRadius: 106,
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
              borderRadius: "38px 38px 28px 28px",
              backgroundColor: "#050506",
              boxShadow:
                "0 1.5px 0 rgba(255,255,255,0.09), 0 -1px 1px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.9), 0 0 14px 1px rgba(0,0,0,0.35)",
            }}
          />
          <div
            className="absolute inset-0 isolate overflow-hidden bg-black"
            style={{ borderRadius: "36px 36px 26px 26px" }}
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
                borderRadius: "36px 36px 26px 26px",
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
            borderRadius: "14px 14px 66px 66px",
            backgroundImage: "linear-gradient(180deg, #060607 0%, #0b0b0c 100%)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.10), 0 -1px 0 rgba(0,0,0,0.55), inset 0 8px 10px -1px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(0,0,0,0.9), inset 0 -2px 3px rgba(0,0,0,0.35)",
          }}
        />
        <div className="absolute flex gap-[4.5px]" style={{ left: 42, bottom: 44, width: 356, height: 110 }}>
          {keys.map((key) => {
            const isDown = down === key.id;
            const radius = KEY_STYLES[key.id].radius;
            const faceRadius = KEY_STYLES[key.id].faceRadius;
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
                style={{ borderRadius: radius, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
              >
                {/* The skirt: the dark side wall of the block, with its contact
                    shadow on the tray floor. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 block"
                  style={{
                    borderRadius: radius,
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
                    borderRadius: faceRadius,
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
                  <Glyph id={key.id} playing={playing} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
