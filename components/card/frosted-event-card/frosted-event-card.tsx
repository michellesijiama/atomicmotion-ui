"use client";

import * as React from "react";
import { MotionConfig, animate, motion, useMotionValue, useTransform } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One invite in the deck. */
export type EventItem = {
  id: string;
  /** Which light the card holds. */
  pattern: AuraPattern;
  /** Which colours it wears. */
  mood: AuraMoodName;
  /** Title lines; each entry is one line. */
  title: string[];
  subtitle: string;
  /** The date badge. `dateTime` is the machine-readable ISO date. */
  date: { month: string; day: string; weekday: string; dateTime: string };
};

export type FrostedEventCardProps = {
  /** The invites, in order. Five ship by default. */
  events?: EventItem[];
  /** Which card starts in the centre. */
  defaultIndex?: number;
  /** Advance on its own until someone swipes (the gallery card sets it). */
  loop?: boolean;
  /** A card has settled in the centre. */
  onSelect?: (event: EventItem) => void;
  onShare?: (event: EventItem) => void;
  className?: string;
};

// Reads the host's fonts if it exposes them (the gallery does, via next/font),
// falls back to installed faces, then to the system stacks.
const FONT_SANS = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";
const FONT_SERIF = "var(--font-instrument-serif, 'Instrument Serif'), 'Instrument Serif', Georgia, 'Times New Roman', serif";

/** The frame: a phone lying on its side. */
const FRAME_W = 640;
const FRAME_H = 296;
const FRAME_RADIUS = 42;
/** The cards inside it. */
const CARD = 252;
const CARD_RADIUS = 22;
const PAD = 14;

const INK = "#08080A";

const PRESS = { type: "spring", stiffness: 500, damping: 30 } as const;

/** A season of the salon: one card per evening, each with its own aura. Poetry After Dark leads. */
const EVENTS: EventItem[] = [
  { id: "poetry", pattern: "ovals", mood: "matisse", title: ["Poetry", "After Dark"], subtitle: "An evening of readings by candlelight, with a glass of something warm", date: { month: "OCT", day: "22", weekday: "Thu", dateTime: "2026-10-22" } },
  { id: "salon", pattern: "waves", mood: "monet", title: ["The Autumn", "Book Salon"], subtitle: "This season's pick: The Remains of the Day by Kazuo Ishiguro", date: { month: "OCT", day: "14", weekday: "Wed", dateTime: "2026-10-14" } },
  { id: "table", pattern: "stack", mood: "rothko", title: ["The Long", "Table"], subtitle: "A shared supper and a swap of the books you loved this year", date: { month: "NOV", day: "5", weekday: "Thu", dateTime: "2026-11-05" } },
  { id: "voices", pattern: "orbit", mood: "hockney", title: ["Two", "Voices"], subtitle: "Two novelists in conversation about writing from memory", date: { month: "NOV", day: "19", weekday: "Thu", dateTime: "2026-11-19" } },
  { id: "winter", pattern: "hourglass", mood: "hilma", title: ["The Winter", "Reading Party"], subtitle: "Closing the season with readings, cake and a raffle of signed copies", date: { month: "DEC", day: "3", weekday: "Thu", dateTime: "2026-12-03" } },
  { id: "press", pattern: "sphere", mood: "delaunay", title: ["Small Press", "Fair"], subtitle: "Twelve independent publishers, one long afternoon of browsing", date: { month: "DEC", day: "12", weekday: "Sat", dateTime: "2026-12-12" } },
  { id: "letters", pattern: "coil", mood: "frankenthaler", title: ["Letters", "by Lamplight"], subtitle: "Write to someone you have been meaning to; stamps and paper provided", date: { month: "JAN", day: "9", weekday: "Sat", dateTime: "2027-01-09" } },
  { id: "quiet", pattern: "streaks", mood: "okeeffe", title: ["The Quiet", "Hour"], subtitle: "Sixty minutes of silent reading together, then tea", date: { month: "JAN", day: "21", weekday: "Thu", dateTime: "2027-01-21" } },
];

/* ────────────────────────────── the aura ────────────────────────────── */

/**
 * The light in a card: a few glowing sources whose long tails read as fog,
 * bent by noise so nothing is a clean disc, with rays combed through the
 * halo, a field of sparkles that twinkle, and printed grain over it all.
 * Written once in GLSL and shared by every card.
 */
export type AuraPattern = "waves" | "ovals" | "stack" | "orbit" | "hourglass" | "sphere" | "coil" | "streaks";

const PATTERN_INDEX: Record<AuraPattern, number> = { waves: 0, ovals: 1, stack: 2, orbit: 3, hourglass: 4, sphere: 5, coil: 6, streaks: 7 };

/**
 * A mood, borrowed from a painter: the field's ramp (seven stops, rim to
 * core — the shared disc is read through it), four accents the shapes are
 * painted in, and the ink the type is set in when the field is pale. Most
 * are cohesive; two — Matisse and Delaunay — are built for contrast.
 */
export type AuraMood = {
  field: readonly [string, string, string, string, string, string, string];
  accents: readonly [string, string, string, string];
  /** Type colour; white when omitted. */
  ink?: string;
};

export const MOODS = {
  /** Monet, Water Lilies: lavender water, lilac, pale blue, sage and rose. Subtle. */
  monet: { field: ["#B9C4F2", "#A9C7F0", "#A6D6EA", "#B4E4DC", "#CDEFD9", "#E2F6E4", "#F1FBF0"], accents: ["#C9B8F2", "#9FD3F5", "#A9DDB0", "#F2B8D6"] },
  /** Matisse, the cut-outs: cobalt paper, lime, coral, sun and magenta. Loud. */
  matisse: { field: ["#4F7BFF", "#5E9BFF", "#7DB9FF", "#A2D2FF", "#C7E4FF", "#E3F2FF", "#F5FAFF"], accents: ["#B8F03A", "#FF6F5E", "#FFD93B", "#FF4FA3"] },
  /** Rothko, Orange and Yellow: tangerine into butter, coral, gold, peach and pink. Subtle, warm. */
  rothko: { field: ["#FF9A3C", "#FFAB45", "#FFBE52", "#FFD062", "#FFE27A", "#FFEE9C", "#FFF7C4"], accents: ["#FF6B6B", "#FFC83D", "#FFB48A", "#FFA5C8"], ink: "#4A2A12" },
  /** Hockney, the pools: turquoise water, sun, pool blue, pink and lime. Medium. */
  hockney: { field: ["#3FC9D9", "#5AD5E0", "#7EDFE7", "#A4E9EE", "#C6F1F3", "#E1F8F8", "#F4FCFC"], accents: ["#FFE04A", "#3C8BFF", "#FF8FC2", "#C6F25A"], ink: "#123E48" },
  /** Hilma af Klint, The Ten Largest: peach into cream, pink, lilac, sky and tangerine. Subtle. */
  hilma: { field: ["#FFC6A8", "#FFD0AE", "#FFDAB4", "#FFE3BC", "#FFECC6", "#FFF3D3", "#FFF9E4"], accents: ["#FFB6D5", "#D9BFF7", "#A8D8FF", "#FF9A5C"], ink: "#5A3A2A" },
  /** Sonia Delaunay: cream paper, turquoise, orange, magenta and cobalt discs. Loud. */
  delaunay: { field: ["#FFF1B8", "#FFF4BE", "#FFF7C8", "#FFF9D2", "#FFFBDD", "#FFFDE8", "#FFFFF3"], accents: ["#2ED3C7", "#FF7A1F", "#FF3D8F", "#2B5BFF"], ink: "#2A2440" },
  /** Frankenthaler, Mountains and Sea: dusty pink wash, sage, ochre, grey-blue and blush. Subtle. */
  frankenthaler: { field: ["#F0B7C8", "#F1BFCB", "#F2C8CF", "#F4D2D4", "#F6DDDA", "#F8E8E2", "#FBF2EC"], accents: ["#B9D9B0", "#F2C56B", "#B6CDE3", "#F6C1D1"], ink: "#4A3040" },
  /** O'Keeffe, Sky Above Clouds: pale blue into white, petal, lilac, cream and mint. Very subtle. */
  okeeffe: { field: ["#BFDDF7", "#CCE4F8", "#D9EBF9", "#E5F1FA", "#EFF6FB", "#F6FAFD", "#FCFDFE"], accents: ["#F8BBD0", "#D7C4F3", "#FFF1C9", "#BCEBD7"], ink: "#2E3A55" },
} as const satisfies Record<string, AuraMood>;

export type AuraMoodName = keyof typeof MOODS;

/** The shader draws into this many pixels a side; the card scales it. */
const AURA_PX = 512;

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_seed;
uniform float u_pattern;
uniform vec3 u_ramp[7];
uniform vec3 u_accent[4];

const float PI = 3.14159265;

float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

// Heat: a disc is a soft blob; a ring is heat gathered along an ellipse's
// outline; a segment is heat along a line. \`soft\` is how far each one blurs.
float disc(vec2 p, vec2 c, float r) { vec2 q = p - c; return exp(-dot(q, q) / (r * r)); }

vec2 rot(vec2 q, float a) { float c = cos(a), s = sin(a); return vec2(c * q.x + s * q.y, -s * q.x + c * q.y); }

float ring(vec2 p, vec2 c, vec2 r, float tilt, float soft, float beads, float off, float a0, float a1) {
  vec2 q = rot(p - c, tilt);
  vec2 n = q / r;
  float d = (length(n) - 1.0) * min(r.x, r.y);
  float heat = exp(-(d * d) / (soft * soft));
  float ang = atan(n.y, n.x);
  if (beads > 0.5) heat *= 0.62 + 0.38 * (0.5 + 0.5 * cos((ang / (2.0 * PI) * beads + off) * 2.0 * PI));
  float arc = smoothstep(a0 - 0.5, a0 + 0.3, ang) * (1.0 - smoothstep(a1 - 0.3, a1 + 0.5, ang));
  return heat * arc;
}
float segment(vec2 p, vec2 a, vec2 b, float soft) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float d = length(pa - ba * h);
  return exp(-(d * d) / (soft * soft));
}

// The field's ramp.
vec3 ramp(float h) {
  h = clamp(h, 0.0, 1.0);
  h = pow(h, 0.78) * 6.0;
  vec3 c = u_ramp[0];
  c = mix(c, u_ramp[1], clamp(h, 0.0, 1.0));
  c = mix(c, u_ramp[2], clamp(h - 1.0, 0.0, 1.0));
  c = mix(c, u_ramp[3], clamp(h - 2.0, 0.0, 1.0));
  c = mix(c, u_ramp[4], clamp(h - 3.0, 0.0, 1.0));
  c = mix(c, u_ramp[5], clamp(h - 4.0, 0.0, 1.0));
  c = mix(c, u_ramp[6], clamp(h - 5.0, 0.0, 1.0));
  return c;
}

// Painting: every shape is its own little gradient — a wide, faint halo in
// one colour under a tighter body that runs from the halo colour into the
// core colour. So one circle can carry two hues, and neighbours can differ.
vec3 accent(float i) {
  if (i < 0.5) return u_accent[0];
  if (i < 1.5) return u_accent[1];
  if (i < 2.5) return u_accent[2];
  return u_accent[3];
}
void paint(inout vec3 col, float body, float halo, vec3 haloColor, vec3 coreColor, float strength) {
  col = mix(col, haloColor, smoothstep(0.02, 0.7, halo) * 0.55 * strength);
  vec3 c = mix(haloColor, coreColor, smoothstep(0.15, 0.95, body));
  col = mix(col, c, smoothstep(0.03, 0.6, body) * 0.95 * strength);
}
void paintRing(inout vec3 col, vec2 p, vec2 c, vec2 r, float tilt, float soft, float beads, float off, float a0, float a1, float haloI, float coreI, float strength) {
  float body = ring(p, c, r, tilt, soft, beads, off, a0, a1);
  float halo = ring(p, c, r, tilt, soft * 3.2, beads, off, a0, a1);
  paint(col, body, halo, accent(haloI), accent(coreI), strength);
}
void paintDisc(inout vec3 col, vec2 p, vec2 c, float r, float haloI, float coreI, float strength) {
  paint(col, disc(p, c, r), disc(p, c, r * 2.2), accent(haloI), accent(coreI), strength);
}
void paintSegment(inout vec3 col, vec2 p, vec2 a, vec2 b, float soft, float haloI, float coreI, float strength) {
  paint(col, segment(p, a, b, soft), segment(p, a, b, soft * 3.0), accent(haloI), accent(coreI), strength);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time;
  vec2 p = uv;
  vec2 C = vec2(0.5, 0.56);
  float breathe = 1.0 + 0.18 * sin(t * 0.7 + u_seed);
  vec2 drift = 0.06 * vec2(sin(t * 0.43 + u_seed), cos(t * 0.31 + u_seed * 1.3));

  // The field: a wide, soft disc read through the ramp. The shapes are painted onto it.
  vec3 col = ramp(disc(p, C + drift, 0.36 * breathe) * 0.55);

  if (u_pattern < 0.5) {
    // WAVES: arcs ripple out to the right, each in the next accent, dissolving as they go.
    paintDisc(col, p, C + vec2(-0.12, 0.0) + drift, 0.11 + 0.05 * sin(t * 1.1), 3.0, 1.0, 0.9);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float ph = fract(t * 0.22 + fi * 0.25);
      vec2 c = C + vec2(-0.2 + ph * 0.6, 0.06 * sin(t * 0.8 + fi));
      float fade = smoothstep(0.0, 0.15, ph) * (1.0 - smoothstep(0.6, 1.0, ph));
      paintRing(col, p, c, vec2(0.08, 0.14) * (0.5 + 1.3 * ph), 0.0, 0.016 + 0.035 * ph, 0.0, 0.0, -1.3, 1.3, mod(fi + 2.0, 4.0), mod(fi, 4.0), fade);
    }
  } else if (u_pattern < 1.5) {
    // OVALS: two ovals in opposite colours breathe in turn, lean, and drift apart and together.
    float b1 = 1.0 + 0.32 * sin(t * 1.1);
    float b2 = 1.0 + 0.32 * sin(t * 1.1 + PI);
    float lean = 0.45 * sin(t * 0.6);
    float gap = 0.10 + 0.06 * sin(t * 0.8);
    paintRing(col, p, C + vec2(-gap, 0.0), vec2(0.085, 0.17) * b1, lean, 0.03, 0.0, 0.0, -PI, PI, 3.0, 0.0, 1.0);
    paintRing(col, p, C + vec2(gap, 0.0), vec2(0.085, 0.17) * b2, -lean, 0.03, 0.0, 0.0, -PI, PI, 1.0, 2.0, 1.0);
    paintRing(col, p, C + vec2(-gap, 0.0), vec2(0.05, 0.12) * b2, lean, 0.055, 0.0, 0.0, -PI, PI, 0.0, 1.0, 0.7);
    paintRing(col, p, C + vec2(gap, 0.0), vec2(0.05, 0.12) * b1, -lean, 0.055, 0.0, 0.0, -PI, PI, 2.0, 3.0, 0.7);
  } else if (u_pattern < 2.5) {
    // STACK: three ellipses shrinking upward, each its own colour, bouncing and swelling in turn.
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float bob = 0.05 * sin(t * 1.1 + fi * 1.4);
      vec2 c = C + vec2(0.05 * sin(t * 0.7 + fi), -0.13 + fi * 0.115 + bob);
      vec2 r = vec2(0.21, 0.09) * (1.0 - fi * 0.3) * (1.0 + 0.25 * sin(t * 1.1 + fi * 2.1));
      float beads = i == 2 ? 10.0 : 0.0;
      paintRing(col, p, c, r, 0.0, 0.03 + 0.012 * fi, beads, t * 0.05, -PI, PI, mod(fi + 1.0, 4.0), mod(fi * 2.0, 4.0), 1.0);
    }
  } else if (u_pattern < 3.5) {
    // ORBIT: a ring that flips over, a bead racing round it in a hot colour, a cool inner ring, a moon above.
    float tilt = 1.1 * sin(t * 0.35);
    vec2 R = vec2(0.25, 0.09 + 0.12 * (0.5 + 0.5 * sin(t * 0.5)));
    paintRing(col, p, C + vec2(0.0, 0.04), R, tilt, 0.032, 0.0, 0.0, -PI, PI, 3.0, 1.0, 0.95);
    paintRing(col, p, C + vec2(0.0, 0.04), R * 0.55, tilt, 0.06, 0.0, 0.0, -PI, PI, 1.0, 0.0, 0.7);
    float ph = t * 1.3;
    vec2 bead = C + vec2(0.0, 0.04) + rot(vec2(R.x * cos(ph), R.y * sin(ph)), -tilt);
    paintDisc(col, p, bead, 0.05 + 0.02 * sin(t * 2.0), 0.0, 2.0, 1.0);
    paintDisc(col, p, C + vec2(0.0, 0.2), 0.04, 2.0, 3.0, 0.8);
  } else if (u_pattern < 4.5) {
    // HOURGLASS: four beams in alternating colours pinch into a knot that pulses; the whole thing turns.
    float a = 0.7 * sin(t * 0.4);
    vec2 q = rot(p - C, a) + C;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec2 corner = C + vec2(fi < 2.0 ? -0.36 : 0.36, mod(fi, 2.0) < 0.5 ? -0.36 : 0.36);
      paintSegment(col, q, corner, C + (corner - C) * 0.1, 0.035, mod(fi, 2.0) * 2.0 + 1.0, mod(fi, 2.0) * 2.0, 0.8);
    }
    float pulse = 1.0 + 0.55 * sin(t * 1.1);
    paintRing(col, q, C, vec2(0.07, 0.07) * pulse, 0.0, 0.03, 0.0, 0.0, -PI, PI, 3.0, 1.0, 1.0);
    paintDisc(col, q, C, 0.06 / pulse, 1.0, 0.0, 0.9);
  } else if (u_pattern < 5.5) {
    // SPHERE: a ball in one colour bounces up off a plate in another; the plate squashes on landing.
    float bob = abs(sin(t * 1.0));
    float y = -0.02 + 0.17 * bob;
    paintRing(col, p, C + vec2(0.0, y), vec2(0.19, 0.19), 0.0, 0.035, 0.0, 0.0, -PI, PI, 3.0, 0.0, 0.95);
    paintDisc(col, p, C + vec2(0.0, y), 0.11, 0.0, 1.0, 0.8);
    float squash = 1.0 + 0.6 * (1.0 - bob);
    paintRing(col, p, C + vec2(0.0, -0.2), vec2(0.27 * squash, 0.04), 0.0, 0.03, 0.0, 0.0, -PI, PI, 0.0, 2.0, 0.95);
  } else if (u_pattern < 6.5) {
    // COIL: five rings like a spring, colours cycling up the coil, swaying and stretching.
    float stretch = 1.0 + 0.4 * sin(t * 0.8);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float sway = 0.10 * sin(t * 1.3 - fi * 0.8);
      vec2 c = C + vec2(sway, (-0.17 + fi * 0.085) * stretch);
      paintRing(col, p, c, vec2(0.21 + 0.04 * sin(t * 1.3 - fi * 0.8 + 1.5), 0.06), 0.0, 0.022 + 0.008 * fi, 0.0, 0.0, -PI, PI, mod(fi + 3.0, 4.0), mod(fi, 4.0), 0.9);
    }
  } else {
    // STREAKS: a disc rolling over, streaks in two colours rushing past it.
    float tilt = 0.9 * sin(t * 0.5);
    paintRing(col, p, C, vec2(0.18 + 0.05 * sin(t * 0.9), 0.06 + 0.08 * (0.5 + 0.5 * sin(t * 0.7))), tilt, 0.03, 12.0, t * 0.2, -PI, PI, 3.0, 2.0, 1.0);
    paintDisc(col, p, C, 0.09 + 0.04 * sin(t * 1.2), 2.0, 1.0, 0.85);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float slide = fract(t * 0.3 + fi * 0.25);
      float x0 = -0.44 + slide * 0.88;
      float yy = -0.15 + fi * 0.095;
      float len = 0.10 + 0.06 * hash(vec2(fi, u_seed));
      float fade = smoothstep(0.0, 0.2, slide) * (1.0 - smoothstep(0.8, 1.0, slide));
      paintSegment(col, p, C + vec2(x0, yy), C + vec2(x0 + len, yy), 0.028, mod(fi, 2.0) * 3.0, mod(fi + 1.0, 2.0), fade * 0.85);
    }
  }

  // Printed grain: fixed to the pixel, never swims.
  col += (hash(gl_FragCoord.xy * 0.71 + u_seed) - 0.5) * 0.07;

  gl_FragColor = vec4(col, 1.0);
}`;





type AuraParams = { pattern: AuraPattern; mood: AuraMood; seed: number };

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

/**
 * One offscreen WebGL canvas for the whole page. Each card asks it to draw
 * that card's light, then copies the pixels into its own 2D canvas — so
 * eight cards cost one GL context, and every card's light keeps moving.
 */
class AuraRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private u: Record<string, WebGLUniformLocation | null> = {};

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = AURA_PX;
    canvas.height = AURA_PX;
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("no webgl");
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const name of ["u_res", "u_time", "u_seed", "u_pattern", "u_ramp", "u_accent"]) {
      this.u[name] = gl.getUniformLocation(prog, name);
    }
    gl.viewport(0, 0, AURA_PX, AURA_PX);
    gl.uniform2f(this.u.u_res, AURA_PX, AURA_PX);
    this.gl = gl;
    this.canvas = canvas;
  }

  draw(target: HTMLCanvasElement, { pattern, mood, seed }: AuraParams, time: number) {
    const { gl, u } = this;
    gl.uniform1f(u.u_time, time);
    gl.uniform1f(u.u_seed, seed);
    gl.uniform1f(u.u_pattern, PATTERN_INDEX[pattern]);
    gl.uniform3fv(u.u_ramp, mood.field.flatMap(hexToRgb));
    gl.uniform3fv(u.u_accent, mood.accents.flatMap(hexToRgb));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    target.getContext("2d")?.drawImage(this.canvas, 0, 0);
  }
}

let renderer: AuraRenderer | null | undefined;
function getRenderer() {
  if (renderer !== undefined) return renderer;
  try {
    renderer = new AuraRenderer();
  } catch {
    renderer = null;
  }
  return renderer;
}

/** A card's light. Draws every frame while `live` (the ring keeps every card live), otherwise holds one still. */
function Aura({ pattern, mood, seed, live }: AuraParams & { live: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const clock = React.useRef(seed * 37);

  React.useEffect(() => {
    const target = ref.current;
    const r = getRenderer();
    if (!target || !r) return;
    const params = { pattern, mood, seed };
    if (!live) {
      r.draw(target, params, clock.current);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      clock.current += (now - last) / 1000;
      last = now;
      r.draw(target, params, clock.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pattern, mood, seed, live]);

  return (
    <canvas
      ref={ref}
      width={AURA_PX}
      height={AURA_PX}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ background: mood.field[0] }}
    />
  );
}

/* ────────────────────────────── the card ────────────────────────────── */

function ShareGlyph({ color }: { color: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

type CardProps = {
  event: EventItem;
  /** Only the centre card is real to assistive tech and the keyboard. */
  front: boolean;
  /** Whether the light should move. */
  live: boolean;
  /** Makes this card's noise its own. */
  seed: number;
  onShare: () => void;
};

/** One square: the aura, a short fade, the share button, and the title with its date. */
function Card({ event, front, live, seed, onShare }: CardProps) {
  const { title, subtitle, date, pattern, mood } = event;
  const { ink } = MOODS[mood] as AuraMood;
  return (
    <article
      aria-hidden={front ? undefined : true}
      aria-label={front ? `${title.join(" ")}, ${date.weekday} ${date.day} ${date.month}` : undefined}
      className="relative overflow-hidden"
      style={{ width: CARD, height: CARD, borderRadius: CARD_RADIUS, background: MOODS[mood].field[0] }}
    >
      <Aura pattern={pattern} mood={MOODS[mood]} seed={seed} live={live} />

      <motion.button
        type="button"
        aria-label="Share event"
        tabIndex={front ? undefined : -1}
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        whileTap={{ scale: 0.94 }}
        transition={PRESS}
        className="absolute flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{
          right: PAD,
          top: PAD,
          width: 44,
          height: 44,
          borderRadius: 14,
          background: "rgba(255,255,255,0.38)",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)",
        }}
      >
        <ShareGlyph color={ink ?? "#1C1C1E"} />
      </motion.button>

      {/* Pale fields set the type in ink; deeper ones in white with a soft glow. */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: PAD + 2,
          paddingInline: PAD + 2,
          color: ink ?? "#fff",
          textShadow: ink ? "0 0 12px rgba(255,255,255,0.55)" : "0 0 14px rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ fontFamily: FONT_SERIF, fontSize: 24, lineHeight: 1.04, letterSpacing: "-0.01em", fontWeight: 400 }}>
          {title.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h3>
        <p className="mt-[6px] truncate text-[11px] font-medium" style={{ opacity: 0.8, letterSpacing: "0.01em" }} title={subtitle}>
          {date.weekday} {date.day} {date.month}
        </p>
      </div>
    </article>
  );
}

/* ────────────────────────────── the carousel ────────────────────────────── */

/** One slot: how far the track moves per card. */
const STEP = 200;
/** Where a card one slot from the centre sits. */
const SIDE_X = 170;
/** How much further each slot beyond that adds. */
const FAR_X = 58;
/** Gallery card: how often it advances on its own. */
const LOOP_EVERY = 2800;

/** The settle after a swipe: quick off the finger, a long soft landing. */
const SNAP = { type: "tween", duration: 0.72, ease: [0.2, 0.7, 0.2, 1] } as const;

/** Signed distance from the centre in slots, wrapped so the ring never ends. */
const wrap = (d: number, n: number) => ((((d + n / 2) % n) + n) % n) - n / 2;

/** The cover-flow pose for a card `d` slots from the centre (d may be fractional). */
function pose(d: number) {
  const a = Math.abs(d);
  const sign = Math.sign(d);
  const near = Math.min(a, 1);
  const far = Math.max(a - 1, 0);
  return {
    x: sign * (near * SIDE_X + far * FAR_X),
    scale: 1 - near * 0.12 - Math.min(far, 3) * 0.04,
    rotateY: -sign * (near * 52 + Math.min(far, 2) * 5),
    brightness: 1 - near * 0.22 - Math.min(far, 3) * 0.08,
    z: 100 - Math.round(a * 10),
  };
}

type SlideProps = {
  index: number;
  count: number;
  track: ReturnType<typeof useMotionValue<number>>;
  children: React.ReactNode;
  onClick: () => void;
};

/** One card on the ring: every property follows the track continuously, so mid-swipe looks right. */
function Slide({ index, count, track, children, onClick }: SlideProps) {
  const d = useTransform(track, (v) => wrap(index + v / STEP, count));
  const x = useTransform(d, (v) => pose(v).x);
  const scale = useTransform(d, (v) => pose(v).scale);
  const rotateY = useTransform(d, (v) => pose(v).rotateY);
  const shade = useTransform(d, (v) => 1 - pose(v).brightness);
  const zIndex = useTransform(d, (v) => pose(v).z);
  const opacity = useTransform(d, (v) => (Math.abs(v) > 3.6 ? 0 : 1));
  return (
    <motion.div
      className="absolute"
      style={{
        left: "50%",
        top: "50%",
        marginLeft: -CARD / 2,
        marginTop: -CARD / 2,
        width: CARD,
        height: CARD,
        x,
        scale,
        rotateY,
        zIndex,
        opacity,
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        willChange: "transform",
      }}
      onClick={onClick}
    >
      {children}
      {/* Dimming as an overlay, so the card underneath is never re-rasterised mid-swipe. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "#0B0B0D", opacity: shade, borderRadius: CARD_RADIUS }}
      />
    </motion.div>
  );
}

export function FrostedEventCard({
  events = EVENTS,
  defaultIndex = 0,
  loop = false,
  onSelect,
  onShare,
  className,
}: FrostedEventCardProps) {
  const n = events.length;
  /** The track: -index * STEP puts card `index` in the centre. Unbounded, since the ring wraps. */
  const track = useMotionValue(-defaultIndex * STEP);
  const [active, setActive] = React.useState(defaultIndex);
  const [interacted, setInteracted] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const panStart = React.useRef(0);
  const moved = React.useRef(false);

  const settle = React.useCallback(
    (target: number) => {
      const i = ((Math.round(-target / STEP) % n) + n) % n;
      animate(track, target, {
        ...SNAP,
        onComplete: () => {
          setActive(i);
          onSelect?.(events[i]);
        },
      });
    },
    [track, events, n, onSelect],
  );

  /** Move `by` slots from wherever the track is now. */
  const step = React.useCallback(
    (by: number) => settle((Math.round(track.get() / STEP) - by) * STEP),
    [settle, track],
  );

  // Gallery card: advance on its own until someone takes over.
  React.useEffect(() => {
    if (!loop || interacted) return;
    const id = window.setInterval(() => step(1), LOOP_EVERY);
    return () => window.clearInterval(id);
  }, [loop, interacted, step]);

  const takeOver = () => setInteracted(true);

  // Trackpad and wheel: horizontal intent moves the ring one card at a time.
  const wheelLock = React.useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
    const now = Date.now();
    if (now - wheelLock.current < 420) return;
    wheelLock.current = now;
    takeOver();
    step(Math.sign(e.deltaX));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    takeOver();
    step(e.key === "ArrowRight" ? 1 : -1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("relative flex h-full min-h-[420px] w-full items-center justify-center bg-transparent", className)}
        style={{ fontFamily: FONT_SANS }}
      >
        <motion.div
          role="group"
          aria-roledescription="carousel"
          aria-label="Upcoming events"
          tabIndex={0}
          className="relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-4"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            borderRadius: FRAME_RADIUS,
            background: INK,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
            perspective: 1100,
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "pan-y",
          }}
          onPanStart={() => {
            takeOver();
            setDragging(true);
            moved.current = false;
            panStart.current = track.get();
          }}
          onPan={(_, info) => {
            if (Math.abs(info.offset.x) > 4) moved.current = true;
            track.set(panStart.current + info.offset.x);
          }}
          onPanEnd={(_, info) => {
            setDragging(false);
            // One card per swipe: past a third of a slot, or a real flick, turns the page;
            // anything less snaps back to where it started.
            const from = Math.round(panStart.current / STEP) * STEP;
            const travel = track.get() - from;
            const flick = Math.abs(info.velocity.x) > 320 ? Math.sign(info.velocity.x) : 0;
            const dir = Math.abs(travel) > STEP / 3 ? Math.sign(travel) : flick;
            settle(from + dir * STEP);
          }}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
        >
          {events.map((event, i) => (
            <Slide
              key={event.id}
              index={i}
              count={n}
              track={track}
              onClick={() => {
                if (moved.current) return;
                takeOver();
                const d = wrap(i + track.get() / STEP, n);
                if (Math.round(d) !== 0) step(Math.round(d));
              }}
            >
              <Card event={event} front={i === active} live seed={i + 1} onShare={() => onShare?.(event)} />
            </Slide>
          ))}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
