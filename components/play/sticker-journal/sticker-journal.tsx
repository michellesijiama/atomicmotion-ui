"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, animate, motion, motionValue, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { AnimationPlaybackControls, MotionValue } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Sticker Journal — a hobonichi-style journaling app on a portrait phone. The top of the screen is a page of warm
// cream paper with a faint dot grid and a hand-lettered date; the bottom is a sticker sheet holding four packs of
// die-cut stickers, every one drawn in code as inline SVG (a thick white outline round flat pastel colour and dark
// ink line, with a soft shadow). Tap a sticker and it peels off the sheet, flies onto the page and lands with a
// little squash, or drag it there yourself. Stickers on the page can be moved, turned and resized by their corner
// handle, or nudged from the keyboard. Swipe the sheet — with a finger or a two-finger trackpad swipe — to change pack.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The name of every sticker in the four packs. */
export type StickerId =
  | "coffee-cup"
  | "croissant"
  | "shortcake"
  | "matcha-latte"
  | "onigiri"
  | "cherry"
  | "daisy"
  | "tulip"
  | "leaf-sprig"
  | "sun"
  | "cloud"
  | "ladybug"
  | "label-today"
  | "label-yay"
  | "label-love"
  | "label-good-day"
  | "star-burst"
  | "speech-hi"
  | "washi-stripe"
  | "washi-gingham"
  | "washi-dots"
  | "heart"
  | "sparkle"
  | "paper-clip";

/** One sticker stuck on the journal page. */
export type PlacedSticker = {
  /** Unique within the page. Later stickers in the array sit on top of earlier ones. */
  id: string;
  /** Which sticker it is. */
  sticker: StickerId;
  /** Where its centre is, in page pixels from the page's top-left (the page is 312 × 372). */
  x: number;
  y: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** 1 is the size it is first placed at. */
  scale: number;
};

export type StickerJournalProps = {
  /** Gallery card: swipe to a pack, peel a sticker onto the page, now and then turn one, and start over once the page is full, until the user interacts. */
  loop?: boolean;
  /** The hand-lettered date at the top of the page. Defaults to a fixed date so SSR and gallery posters are deterministic. */
  date?: string;
  /** The stickers the page starts with. Defaults to a small spread of four so the page is never bare. */
  initialStickers?: PlacedSticker[];
  /** A person placed, moved, turned, resized, removed or cleared stickers. Receives the whole page, back to front. */
  onChange?: (stickers: PlacedSticker[]) => void;
  className?: string;
};

/* ───────────────────────────── palette & type ───────────────────────────── */

const INK = "#4B3A4A";
/** The phone screen the page sits on. */
const SCREEN = "#F3DCE4";
const PAPER = "#FFF8E8";
const PAPER_DOT = "#E6D7B8";
const SHEET = "#FFFDFB";
const BLUSH = "#FF9DB5";
const FONT = "var(--font-poppins, Poppins), Poppins, ui-sans-serif, system-ui, sans-serif";
const HAND = 'var(--font-caveat, Caveat), "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive';

/* ───────────────────────────── layout tokens ───────────────────────────── */

/** The phone: a bare rounded screen in iPhone proportions. */
const SURFACE_W = 340;
const SURFACE_H = 736;
const SURFACE_RADIUS = 52;

/** The journal page sits under the toolbar. */
const PAGE_X = 14;
const PAGE_Y = 84;
const PAGE_W = 312;
const PAGE_H = 372;
const PAGE_RADIUS = 22;

/** The sticker sheet takes the rest of the screen. */
const SHEET_TOP = 470;
const SHEET_RADIUS = 32;
const DECK_TOP = 48;
const DECK_H = 194;

/** A sticker's art box on the page, and in the sheet, in px. */
const BASE = 84;
const CELL_ART = 76;

const MAX_STICKERS = 30;
const SCALE_MIN = 0.5;
const SCALE_MAX = 2.2;
/** How far in from the page edge a sticker's centre may go, so it can never be lost. */
const EDGE = 18;
/** The loop clears the page once it holds this many. */
const LOOP_FULL = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A small seeded generator, so a page composes itself the same way on every visit. */
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

/* ───────────────────────────── the stickers ───────────────────────────── */

// Every sticker is drawn on a 100 × 100 sheet in flat pastel fills with a dark plum ink line. A sticker is
// painted twice: first with every shape turned white and fattened into one thick outline (the die-cut border),
// then in colour on top. Shapes that must not join the border carry the class sj-skip.

type ArtProps = { u: string };

const f1 = (n: number) => Math.round(n * 10) / 10;

/** A pointed starburst with `n` spikes. */
function burst(cx: number, cy: number, ro: number, ri: number, n: number) {
  let d = "";
  for (let i = 0; i < n * 2; i += 1) {
    const a = (i * Math.PI) / n - Math.PI / 2;
    const r = i % 2 ? ri : ro;
    d += `${i ? "L" : "M"}${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** A round badge with `n` soft scallops round its edge. */
function scallop(cx: number, cy: number, r: number, n: number, k: number) {
  const at = (i: number, rr: number) => {
    const a = (i * 2 * Math.PI) / n - Math.PI / 2;
    return `${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`;
  };
  let d = `M${at(0, r)}`;
  for (let i = 0; i < n; i += 1) d += `Q${at(i + 0.5, r * (1 + k))} ${at(i + 1, r)}`;
  return `${d}Z`;
}

const HEART = "M50 86C14 62 8 38 22 24C34 12 48 20 50 32C52 20 66 12 78 24C92 38 86 62 50 86Z";
const BURST = burst(50, 50, 45, 35, 12);
const SCALLOP = scallop(50, 50, 38, 12, 0.22);

/** A line with an ink edge and a coloured core, like a stem or a straw. */
function Tube({ d, color, w = 4.4 }: { d: string; color: string; w?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={w + 3.6} />
      <path d={d} fill="none" stroke={color} strokeWidth={w} />
    </>
  );
}

/** A sleepy kawaii face: two dot eyes, a small smile and pink cheeks. */
function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="none">
      <ellipse cx={-14} cy={5.2} rx={4.4} ry={2.8} fill={BLUSH} opacity={0.8} />
      <ellipse cx={14} cy={5.2} rx={4.4} ry={2.8} fill={BLUSH} opacity={0.8} />
      <circle cx={-9} cy={0} r={2.5} fill={INK} />
      <circle cx={9} cy={0} r={2.5} fill={INK} />
      <path d="M-3.6 3.4Q0 7.6 3.6 3.4" fill="none" stroke={INK} strokeWidth={2} />
    </g>
  );
}

/** Hand-lettered words, squeezed to a width so any fallback font still fits the label. */
function Words({ x, y, size, w, children }: { x: number; y: number; size: number; w: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={700} fontFamily={HAND} fill={INK} stroke="none" textLength={w} lengthAdjust="spacingAndGlyphs">
      {children}
    </text>
  );
}

/** A four-point sparkle centred on (cx, cy), `r` from the middle to each tip. */
const sparklePath = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}C${f1(cx + r * 0.06)} ${f1(cy - r * 0.36)} ${f1(cx + r * 0.36)} ${f1(cy - r * 0.06)} ${cx + r} ${cy}C${f1(cx + r * 0.36)} ${f1(cy + r * 0.06)} ${f1(cx + r * 0.06)} ${f1(cy + r * 0.36)} ${cx} ${cy + r}C${f1(cx - r * 0.06)} ${f1(cy + r * 0.36)} ${f1(cx - r * 0.36)} ${f1(cy + r * 0.06)} ${cx - r} ${cy}C${f1(cx - r * 0.36)} ${f1(cy - r * 0.06)} ${f1(cx - r * 0.06)} ${f1(cy - r * 0.36)} ${cx} ${cy - r}Z`;

function CoffeeCup() {
  return (
    <>
      <ellipse cx={50} cy={84} rx={37} ry={9} fill="#FFF1E4" />
      <ellipse cx={50} cy={83} rx={23} ry={4.6} fill="#F4DCC6" strokeWidth={1.6} />
      <Tube d="M76 47C93 45 95 66 76 69" color="#FFB3C8" w={4.6} />
      <path d="M21 42H79V62C79 79 66 83 50 83C34 83 21 79 21 62Z" fill="#FFD3E0" />
      <path d="M28 52V62" fill="none" stroke="#FFF" strokeWidth={3.2} opacity={0.85} />
      <ellipse cx={50} cy={42} rx={29} ry={8} fill="#FFF4F7" />
      <ellipse cx={50} cy={43} rx={23} ry={5.6} fill="#B97B57" strokeWidth={1.8} />
      <path d="M44 42.6C44 40.6 47 40.4 50 43C53 40.4 56 40.6 56 42.6C56 45 50 47 50 47C50 47 44 45 44 42.6Z" fill="#F5DCC3" stroke="none" />
      <Face x={50} y={63} s={0.95} />
      <path d="M38 31C32 25 41 21 36 14" fill="none" strokeWidth={2.4} />
      <path d="M57 29C51 24 60 20 55 13" fill="none" strokeWidth={2.4} />
    </>
  );
}

function Croissant() {
  return (
    <>
      <ellipse cx={16} cy={64} rx={9.5} ry={15} transform="rotate(36 16 64)" fill="#F2B95F" />
      <ellipse cx={84} cy={64} rx={9.5} ry={15} transform="rotate(-36 84 64)" fill="#F2B95F" />
      <ellipse cx={29} cy={53} rx={14.5} ry={21} transform="rotate(24 29 53)" fill="#F6C36A" />
      <ellipse cx={71} cy={53} rx={14.5} ry={21} transform="rotate(-24 71 53)" fill="#F6C36A" />
      <ellipse cx={50} cy={48} rx={18.5} ry={25} fill="#FBD283" />
      <path d="M41 31C46 27 54 27 59 31" fill="none" stroke="#FFF" strokeWidth={3} opacity={0.8} />
      <path d="M18 51C20 47 23 45 26 44" fill="none" stroke="#FFF" strokeWidth={2.4} opacity={0.7} />
      <path d="M82 51C80 47 77 45 74 44" fill="none" stroke="#FFF" strokeWidth={2.4} opacity={0.7} />
      <Face x={50} y={52} s={1} />
    </>
  );
}

function Shortcake() {
  return (
    <g transform="translate(4 0)">
      <path d="M62 50L80 38V72L62 84Z" fill="#F2CC86" />
      <path d="M62 60L80 48V54L62 66Z" fill="#FFF" strokeWidth={1.6} />
      <path d="M62 72L80 60V64L62 76Z" fill="#FF9DB5" strokeWidth={1.6} />
      <path d="M12 50H62V84H12Z" fill="#FFE3A8" />
      <path d="M12 60H62V66H12Z" fill="#FFFDF8" strokeWidth={1.6} />
      <path d="M12 72H62V76H12Z" fill="#FF9DB5" strokeWidth={1.6} />
      <path d="M12 50L30 38H80L62 50Z" fill="#FFFBF3" />
      <path d="M30 41C38 44 54 44 70 41" fill="none" stroke="#FFD3E0" strokeWidth={2.4} />
      <path d="M31 21C31 15 38 12 44 15C50 12 57 15 57 21C57 34 50 46 44 48C38 46 31 34 31 21Z" fill="#FF6F8D" />
      <path d="M36 22C35 26 36 30 38 34" fill="none" stroke="#FFF" strokeWidth={2.4} opacity={0.75} />
      {[
        [40, 23],
        [48, 23],
        [44, 30],
        [38, 31],
        [50, 31],
        [44, 38],
      ].map(([sx, sy]) => (
        <ellipse key={`${sx}-${sy}`} cx={sx} cy={sy} rx={1.1} ry={1.7} fill="#FFE9A6" stroke="none" />
      ))}
      <path d="M44 17L36 10L40.5 13.4L38 6L44 11L50 6L47.5 13.4L52 10Z" fill="#8ED08A" strokeWidth={1.8} />
      <path d="M26 46C28 42 32 40 36 41C38 38 44 38 46 41C50 39 55 41 55 45C57 46 56 49 52 49H31C26 49 24 47 26 46Z" fill="#FFF" strokeWidth={1.8} />
      <path d="M66 36C72 30 80 32 82 38C76 42 70 42 66 36Z" fill="#8ED08A" strokeWidth={1.8} />
    </g>
  );
}

function MatchaLatte() {
  return (
    <>
      <Tube d="M61 38L69 5" color="#FFB3C8" w={4.6} />
      <path d="M26 36H74L69 82C68.5 87 66 88 62 88H38C34 88 31.5 87 31 82Z" fill="#FFFFFF" />
      <path d="M27.6 50C38 45 45 55 50 50C56 45 64 55 72.4 50L69 82C68.5 87 66 88 62 88H38C34 88 31.5 87 31 82Z" fill="#A9D483" stroke="none" />
      <path d="M28 51C37 47 44 55 50 51" fill="none" stroke="#C9E6A9" strokeWidth={2.4} />
      <path d="M26 36H74L69 82C68.5 87 66 88 62 88H38C34 88 31.5 87 31 82Z" fill="none" />
      <rect x={34} y={38} width={11} height={11} rx={3} transform="rotate(-8 39 43)" fill="#FFF" opacity={0.9} strokeWidth={1.6} />
      <rect x={52} y={39} width={10} height={10} rx={3} transform="rotate(10 57 44)" fill="#FFF" opacity={0.9} strokeWidth={1.6} />
      <path d="M24 28C24 18 36 15 50 15C64 15 76 18 76 28Z" fill="#FFFFFF" />
      <rect x={21} y={27} width={58} height={9} rx={4.5} fill="#F2F2EE" />
      <path d="M33 22C36 19 40 18 44 18" fill="none" stroke="#DADAD2" strokeWidth={2.2} />
      <Face x={50} y={70} s={0.9} />
    </>
  );
}

function Onigiri() {
  return (
    <>
      <path d="M50 12C57 12 62 16 66 24L86 62C92 74 88 84 74 85L26 85C12 84 8 74 14 62L34 24C38 16 43 12 50 12Z" fill="#FFFDF6" />
      <path d="M76 52L86 62C92 74 88 84 74 85L66 85C78 78 80 64 76 52Z" fill="#F1E8D4" stroke="none" />
      <path d="M14 62H86C92 74 88 84 74 85L26 85C12 84 8 74 14 62Z" fill="#4A5851" />
      <path d="M22 70H74" fill="none" stroke="#6E8078" strokeWidth={1.8} opacity={0.9} />
      <path d="M50 12C57 12 62 16 66 24L86 62C92 74 88 84 74 85L26 85C12 84 8 74 14 62L34 24C38 16 43 12 50 12Z" fill="none" />
      <Face x={50} y={44} s={1} />
      <path d="M40 24C43 22 46 21.5 49 22" fill="none" stroke="#FFF" strokeWidth={2.6} />
      <circle cx={30} cy={52} r={1.2} fill="#CFC3A8" stroke="none" />
      <circle cx={70} cy={50} r={1.2} fill="#CFC3A8" stroke="none" />
    </>
  );
}

function Cherry() {
  return (
    <>
      <path d="M30 60C32 36 44 22 58 12" fill="none" strokeWidth={2.8} />
      <path d="M70 62C68 40 64 24 58 12" fill="none" strokeWidth={2.8} />
      <path d="M58 12C68 2 84 4 92 12C82 24 66 22 58 12Z" fill="#8ED08A" />
      <path d="M62 12C72 9 80 10 86 12" fill="none" strokeWidth={1.8} />
      <circle cx={30} cy={72} r={18} fill="#FF6B8A" />
      <circle cx={70} cy={76} r={17} fill="#FF5C7F" />
      <path d="M19 66C20 60 24 56 30 55" fill="none" stroke="#FFF" strokeWidth={3} opacity={0.85} />
      <path d="M60 70C61 65 64 62 69 61" fill="none" stroke="#FFF" strokeWidth={3} opacity={0.85} />
      <Face x={30} y={76} s={0.72} />
      <Face x={70} y={80} s={0.68} />
    </>
  );
}

function Daisy() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx={50} cy={25} rx={9} ry={18.5} transform={`rotate(${i * 36} 50 50)`} fill="#FFFDFB" />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d="M50 13V25" fill="none" stroke="#FFBBD0" strokeWidth={2.2} transform={`rotate(${i * 36} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={15} fill="#FFD25C" />
      <path d="M41 42C43 39 46 38 49 38" fill="none" stroke="#FFF" strokeWidth={2.2} opacity={0.8} />
      <Face x={50} y={50} s={0.6} />
    </>
  );
}

function Tulip() {
  return (
    <>
      <path d="M49 92C22 90 16 58 16 58C38 62 49 84 49 84Z" fill="#98D69B" />
      <path d="M51 88C74 86 82 64 82 64C62 66 51 82 51 82Z" fill="#86CC8E" />
      <Tube d="M50 56C48 72 51 82 50 94" color="#7EC48B" w={4.6} />
      <path d="M24 22C28 14 36 20 38 26C41 36 46 46 50 56C28 58 22 40 24 22Z" fill="#FF9DBA" />
      <path d="M76 22C72 14 64 20 62 26C59 36 54 46 50 56C72 58 78 40 76 22Z" fill="#FF9DBA" />
      <path d="M50 6C64 20 62 38 60 44C58 52 54 57 50 58C46 57 42 52 40 44C38 38 36 20 50 6Z" fill="#FFB8CE" />
      <path d="M45 24C43 32 44 40 46 46" fill="none" stroke="#FFF" strokeWidth={2.6} opacity={0.8} />
    </>
  );
}

/** A leaf pointing along +x from its stem end. */
function Leaf({ x, y, a, k = 1, fill }: { x: number; y: number; a: number; k?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${k})`}>
      <path d="M0 0C6 -12 24 -14 34 0C24 14 6 12 0 0Z" fill={fill} />
      <path d="M4 0Q18 -1.5 28 0" fill="none" strokeWidth={1.6} />
    </g>
  );
}

function LeafSprig() {
  return (
    <>
      <Leaf x={24.7} y={81.4} a={8} fill="#9BD79A" />
      <Leaf x={32.1} y={70.2} a={-118} fill="#80C68B" />
      <Leaf x={40.1} y={58.6} a={8} fill="#9BD79A" />
      <Leaf x={48.7} y={46.6} a={-118} k={0.9} fill="#80C68B" />
      <Tube d="M18 93Q34 66 58 34" color="#6DB87D" w={3.6} />
      <Leaf x={58} y={34} a={-53} k={0.82} fill="#B3E3A6" />
    </>
  );
}

function Sun() {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={45} y={4} width={10} height={19} rx={5} transform={`rotate(${i * 36} 50 50)`} fill="#FFC24D" />
      ))}
      <circle cx={50} cy={50} r={27} fill="#FFE070" />
      <path d="M33 38C36 33 40 30 45 29" fill="none" stroke="#FFF" strokeWidth={3} opacity={0.8} />
      <Face x={50} y={52} s={0.95} />
    </>
  );
}

function Cloud() {
  return (
    <>
      <path d="M26 76C10 76 6 58 20 52C18 36 38 30 46 40C52 24 78 28 78 46C94 44 98 74 78 76Z" fill="#DCEFFC" />
      <path d="M22 62C23 58 26 55 30 54" fill="none" stroke="#FFF" strokeWidth={3} opacity={0.9} />
      <Face x={50} y={61} s={0.95} />
      <path d="M85 20Q85 27 92 28Q85 29 85 36Q85 29 78 28Q85 27 85 20Z" fill="#FFE27A" strokeWidth={1.8} />
    </>
  );
}

function Ladybug() {
  return (
    <>
      <path d="M20 52L9 48M19 63L7 66M23 75L12 82M80 52L91 48M81 63L93 66M77 75L88 82" fill="none" strokeWidth={2.8} />
      <path d="M42 20Q38 9 29 9M58 20Q62 9 71 9" fill="none" strokeWidth={2.4} />
      <circle cx={29} cy={9} r={2.6} fill={INK} />
      <circle cx={71} cy={9} r={2.6} fill={INK} />
      <circle cx={50} cy={58} r={31} fill="#FF7B7B" />
      <path d="M50 42V88" fill="none" strokeWidth={2.4} />
      <circle cx={34} cy={57} r={5.6} fill={INK} stroke="none" />
      <circle cx={66} cy={57} r={5.6} fill={INK} stroke="none" />
      <circle cx={39} cy={75} r={4.6} fill={INK} stroke="none" />
      <circle cx={61} cy={75} r={4.6} fill={INK} stroke="none" />
      <path d="M25 52C26 46 30 42 35 40" fill="none" stroke="#FFF" strokeWidth={3} opacity={0.85} />
      <path d="M27 38C27 14 73 14 73 38C60 45 40 45 27 38Z" fill="#5A4659" />
      <circle cx={41} cy={29} r={4.2} fill="#FFF" stroke="none" />
      <circle cx={59} cy={29} r={4.2} fill="#FFF" stroke="none" />
      <circle cx={42} cy={30} r={2} fill={INK} stroke="none" />
      <circle cx={58} cy={30} r={2} fill={INK} stroke="none" />
      <ellipse cx={34} cy={36} rx={3.6} ry={2.2} fill={BLUSH} stroke="none" opacity={0.9} />
      <ellipse cx={66} cy={36} rx={3.6} ry={2.2} fill={BLUSH} stroke="none" opacity={0.9} />
    </>
  );
}

function LabelToday() {
  return (
    <>
      <rect x={5} y={29} width={90} height={44} rx={22} fill="#FFC4D6" />
      <rect x={11} y={35} width={78} height={32} rx={16} fill="none" stroke="#FFF" strokeWidth={1.8} strokeDasharray="3 3.6" />
      <Words x={50} y={59.5} size={29} w={64}>
        today!
      </Words>
      <path d={sparklePath(90, 27, 9)} fill="#FFE27A" strokeWidth={1.8} />
    </>
  );
}

function LabelYay() {
  return (
    <>
      <path d={SCALLOP} fill="#FFD2A8" />
      <circle cx={50} cy={50} r={29} fill="none" stroke="#FFF" strokeWidth={1.8} strokeDasharray="3 3.6" />
      <Words x={50} y={61} size={36} w={44}>
        yay
      </Words>
      <circle cx={25} cy={30} r={2.6} fill="#FF8FAB" stroke="none" />
      <circle cx={77} cy={73} r={2.6} fill="#8FD3F4" stroke="none" />
    </>
  );
}

function LabelLove() {
  return (
    <>
      <path d="M7 29H93V43A7 7 0 0 0 93 57V71H7V57A7 7 0 0 0 7 43Z" fill="#D9C8FA" />
      <path d="M17 35H83V43A6 6 0 0 0 83 57V65H17V57A6 6 0 0 0 17 43Z" fill="none" stroke="#FFF" strokeWidth={1.8} strokeDasharray="3 3.6" />
      <path d={HEART} transform="translate(20.5 39) scale(0.23)" fill="#FF6F9A" strokeWidth={8} />
      <Words x={62} y={59.5} size={29} w={38}>
        love
      </Words>
    </>
  );
}

function LabelGoodDay() {
  return (
    <>
      <rect x={13} y={14} width={74} height={72} rx={22} fill="#BFE3F5" />
      <rect x={19} y={20} width={62} height={60} rx={17} fill="none" stroke="#FFF" strokeWidth={1.8} strokeDasharray="3 3.6" />
      <Words x={50} y={52} size={29} w={44}>
        good
      </Words>
      <Words x={50} y={74} size={29} w={32}>
        day
      </Words>
      <rect x={32} y={7} width={36} height={13} rx={2} transform="rotate(-5 50 13)" fill="#FFB5C8" opacity={0.95} strokeWidth={1.8} />
      <path d="M38 12L62 10M40 15L60 13.5" fill="none" stroke="#FFF" strokeWidth={1.6} opacity={0.8} transform="rotate(-5 50 13)" />
    </>
  );
}

function StarBurst() {
  return (
    <>
      <path d={BURST} fill="#FFE066" />
      <path d={burst(50, 50, 37, 28, 12)} fill="none" stroke="#FFF" strokeWidth={1.8} strokeDasharray="3 3.6" opacity={0.95} />
      <g transform="rotate(-8 50 50)">
        <Words x={50} y={60} size={32} w={46}>
          wow
        </Words>
      </g>
    </>
  );
}

function SpeechHi() {
  return (
    <>
      <path d="M50 12C75 12 91 27 91 43C91 60 74 72 54 72C50 72 46 72 42 71L22 87L27 66C16 60 9 52 9 43C9 27 25 12 50 12Z" fill="#C2EBCD" />
      <path d="M50 19C70 19 84 30 84 43C84 56 70 65 54 65" fill="none" stroke="#FFF" strokeWidth={1.8} strokeDasharray="3 3.6" />
      <Words x={50} y={55} size={40} w={24}>
        hi
      </Words>
    </>
  );
}

/** A strip of washi with torn, zig-zag ends, laid at a jaunty angle. */
function Washi({ fill, angle }: { fill: string; angle: number }) {
  return (
    <g transform={`rotate(${angle} 50 50)`}>
      <path d="M7 33L11 37.5L7 42L11 46.5L7 51L11 55.5L7 60L11 64.5L7 67H93L89 62.5L93 58L89 53.5L93 49L89 44.5L93 40L89 35.5L93 33Z" fill={fill} stroke={INK} strokeWidth={1.6} strokeOpacity={0.4} fillOpacity={0.9} />
      <path d="M16 38H84" fill="none" stroke="#FFF" strokeWidth={2.2} opacity={0.5} />
    </g>
  );
}

function WashiStripe({ u }: ArtProps) {
  return <Washi fill={`url(#${u}-wstripe)`} angle={-9} />;
}

function WashiGingham({ u }: ArtProps) {
  return <Washi fill={`url(#${u}-wgingham)`} angle={7} />;
}

function WashiDots({ u }: ArtProps) {
  return <Washi fill={`url(#${u}-wdots)`} angle={-4} />;
}

function Heart() {
  return (
    <>
      <path d={HEART} fill="#FF8FAB" />
      <path d="M25 36C26 31 30 28 35 27" fill="none" stroke="#FFF" strokeWidth={3.2} opacity={0.85} />
      <Face x={50} y={52} s={0.95} />
    </>
  );
}

function Sparkle() {
  return (
    <>
      <path d={sparklePath(46, 54, 40)} fill="#FFE066" />
      <path d={sparklePath(82, 20, 13)} fill="#FFF0A8" />
      <path d={sparklePath(16, 18, 8)} fill="#FFD0E0" strokeWidth={2} />
      <path d={sparklePath(84, 84, 7)} fill="#C7E6FA" strokeWidth={2} />
    </>
  );
}

function PaperClip() {
  return (
    <g transform="rotate(26 50 50) translate(0 2)">
      <Tube d="M58 30V64C58 76 48 76 48 76C38 76 38 66 38 64V26C38 12 52 12 52 12C66 12 66 26 66 26V70C66 88 50 88 50 88C32 88 32 70 32 70V40" color="#FF8F7E" w={4.6} />
    </g>
  );
}

type StickerDef = {
  id: StickerId;
  name: string;
  art: React.ComponentType<ArtProps>;
  /** Translucent stickers (washi tape) skip the white die-cut border. */
  flat?: boolean;
};

type Pack = { id: string; name: string; stickers: readonly StickerDef[] };

const PACKS: readonly Pack[] = [
  {
    id: "cafe",
    name: "Café",
    stickers: [
      { id: "coffee-cup", name: "Coffee cup", art: CoffeeCup },
      { id: "croissant", name: "Croissant", art: Croissant },
      { id: "shortcake", name: "Strawberry shortcake", art: Shortcake },
      { id: "matcha-latte", name: "Matcha latte", art: MatchaLatte },
      { id: "onigiri", name: "Onigiri", art: Onigiri },
      { id: "cherry", name: "Cherries", art: Cherry },
    ],
  },
  {
    id: "garden",
    name: "Garden",
    stickers: [
      { id: "daisy", name: "Daisy", art: Daisy },
      { id: "tulip", name: "Tulip", art: Tulip },
      { id: "leaf-sprig", name: "Leaf sprig", art: LeafSprig },
      { id: "sun", name: "Sun", art: Sun },
      { id: "cloud", name: "Cloud", art: Cloud },
      { id: "ladybug", name: "Ladybug", art: Ladybug },
    ],
  },
  {
    id: "words",
    name: "Words",
    stickers: [
      { id: "label-today", name: "Today label", art: LabelToday },
      { id: "label-yay", name: "Yay badge", art: LabelYay },
      { id: "label-love", name: "Love ticket", art: LabelLove },
      { id: "label-good-day", name: "Good day note", art: LabelGoodDay },
      { id: "star-burst", name: "Wow star burst", art: StarBurst },
      { id: "speech-hi", name: "Hi speech bubble", art: SpeechHi },
    ],
  },
  {
    id: "washi",
    name: "Washi & Bits",
    stickers: [
      { id: "washi-stripe", name: "Striped washi tape", art: WashiStripe, flat: true },
      { id: "washi-gingham", name: "Gingham washi tape", art: WashiGingham, flat: true },
      { id: "washi-dots", name: "Dotted washi tape", art: WashiDots, flat: true },
      { id: "heart", name: "Heart", art: Heart },
      { id: "sparkle", name: "Sparkles", art: Sparkle },
      { id: "paper-clip", name: "Paper clip", art: PaperClip },
    ],
  },
];

const PACKS_LAST = PACKS.length - 1;

/** Past either end of the packs the sheet gives way at a third of the hand's pace, like a rubber band. */
const rubber = (p: number) => (p < 0 ? p * 0.3 : p > PACKS_LAST ? PACKS_LAST + (p - PACKS_LAST) * 0.3 : p);

const STICKER_BY_ID = new Map<string, StickerDef>(PACKS.flatMap((pack) => pack.stickers).map((def) => [def.id, def]));

/** The page a journal opens with, so it is never bare. */
const DEFAULT_STICKERS: PlacedSticker[] = [
  { id: "d1", sticker: "coffee-cup", x: 92, y: 170, rotation: -8, scale: 1.4 },
  { id: "d2", sticker: "label-today", x: 214, y: 116, rotation: 7, scale: 1.3 },
  { id: "d3", sticker: "croissant", x: 218, y: 246, rotation: 11, scale: 1.25 },
  { id: "d4", sticker: "daisy", x: 98, y: 292, rotation: -12, scale: 1.2 },
];

/**
 * A sticker, painted twice. The first pass turns every shape white and fattens it (see .sj-cut in the page
 * styles) into the die-cut border; the second is the art in colour. `hit` limits pointer hits to the painted
 * sticker, so the empty corners of its box fall through to the paper.
 */
function StickerArt({ def, u, size, hit }: { def: StickerDef; u: string; size: number; hit?: boolean }) {
  const Art = def.art;
  const painted = hit ? { pointerEvents: "visiblePainted" as const } : undefined;
  return (
    <svg aria-hidden viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>
      {def.flat ? null : (
        <g className="sj-cut" style={painted}>
          <Art u={u} />
        </g>
      )}
      <g stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={def.flat ? painted : undefined}>
        <Art u={u} />
      </g>
    </svg>
  );
}

/** The sticker's shadow: a hair of contact shadow when it is stuck down, a soft long one when it is lifted. */
const shadowOf = (lift: number) =>
  `drop-shadow(0 ${(0.6 + 0.6 * (1 - lift)).toFixed(2)}px ${(0.8 + 0.4 * (1 - lift)).toFixed(2)}px rgba(75,50,65,${(0.22 * (1 - lift)).toFixed(3)})) drop-shadow(0 ${(1 + 10 * lift).toFixed(1)}px ${(1.6 + 7 * lift).toFixed(1)}px rgba(75,50,65,${(0.16 + 0.1 * lift).toFixed(3)}))`;

/** Where a landed sticker sits relative to a lifted one: the peeled sticker is this far up and this much larger. */
const LIFT_RISE = 9;
const LIFT_GROW = 0.08;

/* ───────────────────────────── a sticker in the air ───────────────────────────── */

type GhostValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
  /** 0 stuck down … 1 held up. */
  lift: MotionValue<number>;
  /** 0 flat … 1 peeling off the sheet: its top edge curls up toward the viewer. */
  peel: MotionValue<number>;
};

/** A sticker held in the air, positioned in phone pixels by motion values. */
function Ghost({ def, u, v }: { def: StickerDef; u: string; v: GhostValues }) {
  const filter = useTransform(v.lift, shadowOf);
  const rotateX = useTransform(v.peel, (p) => -34 * p);
  const skew = useTransform(v.peel, (p) => 3 * p);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      style={{ x: v.x, y: v.y, width: BASE, height: BASE, marginLeft: -BASE / 2, marginTop: -BASE / 2, zIndex: 40, filter }}
    >
      <motion.div style={{ rotate: v.rotate, scale: v.scale }}>
        <motion.div style={{ transformPerspective: 460, transformOrigin: "50% 100%", rotateX, skewX: skew }}>
          <StickerArt def={def} u={u} size={BASE} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

type FlightSpec = {
  key: number;
  def: StickerDef;
  /** Where it starts and ends, in phone pixels. */
  from: { x: number; y: number };
  to: { x: number; y: number; rotation: number; scale: number };
  byPerson: boolean;
};

/** A sticker flying from the sheet to its spot: peels up, arcs across, and hands over to the page when it lands. */
function Flight({ spec, u, onDone }: { spec: FlightSpec; u: string; onDone: (key: number) => void }) {
  const x = useMotionValue(spec.from.x);
  const y = useMotionValue(spec.from.y);
  const scale = useMotionValue(CELL_ART / BASE);
  const rotate = useMotionValue(0);
  const lift = useMotionValue(0);
  const peel = useMotionValue(0);

  React.useEffect(() => {
    const { from, to } = spec;
    const s0 = CELL_ART / BASE;
    const landY = to.y - LIFT_RISE;
    const landScale = to.scale * (1 + LIFT_GROW);
    const dist = Math.hypot(to.x - from.x, landY - from.y);
    const arc = clamp(dist * 0.2, 30, 80);
    const runs: AnimationPlaybackControls[] = [];
    let cancelled = false;
    x.set(from.x);
    y.set(from.y);
    scale.set(s0);
    rotate.set(0);
    lift.set(0);
    peel.set(0);
    (async () => {
      // Lift off the sheet: the sticker grows, its shadow opens and the top edge curls up.
      runs.push(
        animate(lift, 1, { duration: 0.2, ease: "easeOut" }),
        animate(peel, 1, { duration: 0.2, ease: "easeOut" }),
        animate(scale, s0 * 1.22, { duration: 0.2, ease: "easeOut" }),
        animate(rotate, -7, { duration: 0.2, ease: "easeOut" }),
      );
      await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
      if (cancelled) return;
      // Carry it across in an arc, turning it to the angle it will be stuck at.
      const dur = clamp(0.4 + dist / 1000, 0.5, 0.78);
      const fly = animate(0, 1, {
        duration: dur,
        ease: [0.45, 0, 0.2, 1],
        onUpdate: (t) => {
          x.set(lerp(from.x, to.x, t));
          y.set(lerp(from.y, landY, t) - Math.sin(Math.PI * t) * arc);
          scale.set(lerp(s0 * 1.22, landScale, t));
          rotate.set(lerp(-7, to.rotation, t));
          peel.set(1 - clamp(t * 2.4, 0, 1));
        },
        onComplete: () => {
          if (!cancelled) onDone(spec.key);
        },
      });
      runs.push(fly);
    })();
    return () => {
      cancelled = true;
      runs.forEach((run) => run.stop());
    };
  }, [spec, x, y, scale, rotate, lift, peel, onDone]);

  return <Ghost def={spec.def} u={u} v={{ x, y, scale, rotate, lift, peel }} />;
}

/* ───────────────────────────── a sticker on the page ───────────────────────────── */

type Entry = "land" | "fade";

type PlacedItemProps = {
  s: PlacedSticker;
  def: StickerDef;
  z: number;
  u: string;
  selected: boolean;
  entry?: Entry;
  scaleRef: React.RefObject<number>;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onCommit: () => void;
  onKey: (id: string, event: React.KeyboardEvent) => void;
};

const PlacedItem = React.memo(function PlacedItem({ s, def, z, u, selected, entry, scaleRef, onSelect, onMove, onCommit, onKey }: PlacedItemProps) {
  // How the sticker arrives is decided once, when it is mounted.
  const [arrival] = React.useState(entry);
  const lift = useMotionValue(arrival === "land" ? 1 : 0);
  const squashX = useMotionValue(1);
  const squashY = useMotionValue(1);
  const opacity = useMotionValue(arrival === "fade" ? 0 : 1);
  const ref = React.useRef<HTMLDivElement>(null);
  const dragCleanup = React.useRef<(() => void) | null>(null);

  const y = useTransform(lift, (l) => -LIFT_RISE * l);
  const sx = useTransform([lift, squashX], ([l, q]) => (1 + LIFT_GROW * (l as number)) * (q as number));
  const sy = useTransform([lift, squashY], ([l, q]) => (1 + LIFT_GROW * (l as number)) * (q as number));
  const filter = useTransform(lift, shadowOf);

  // Landing: drop the last few pixels, squash against the paper, and stick.
  React.useEffect(() => {
    const runs: AnimationPlaybackControls[] = [];
    if (arrival === "land") {
      runs.push(
        animate(lift, 0, { duration: 0.12, ease: "easeIn" }),
        animate(squashX, [1, 1.13, 0.97, 1], { duration: 0.46, delay: 0.1, times: [0, 0.22, 0.6, 1], ease: "easeOut" }),
        animate(squashY, [1, 0.84, 1.04, 1], { duration: 0.46, delay: 0.1, times: [0, 0.22, 0.6, 1], ease: "easeOut" }),
      );
    } else if (arrival === "fade") {
      runs.push(animate(opacity, 1, { duration: 0.28, ease: "easeOut" }));
    }
    return () => runs.forEach((run) => run.stop());
  }, [arrival, lift, squashX, squashY, opacity]);

  React.useEffect(() => () => dragCleanup.current?.(), []);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    onSelect(s.id);
    ref.current?.focus({ preventScroll: true });
    const start = { px: event.clientX, py: event.clientY, x: s.x, y: s.y, moved: false };
    const move = (e: PointerEvent) => {
      const dx = (e.clientX - start.px) / scaleRef.current;
      const dy = (e.clientY - start.py) / scaleRef.current;
      if (!start.moved) {
        if (Math.hypot(dx, dy) < 3) return;
        start.moved = true;
        animate(lift, 1, { duration: 0.14, ease: "easeOut" });
      }
      onMove(s.id, start.x + dx, start.y + dy);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      dragCleanup.current = null;
      if (!start.moved) return;
      // Set down again: the shadow tightens and the sticker gives a little.
      animate(lift, 0, { type: "spring", stiffness: 640, damping: 26 });
      animate(squashX, [1, 1.06, 1], { duration: 0.26, ease: "easeOut" });
      animate(squashY, [1, 0.94, 1], { duration: 0.26, ease: "easeOut" });
      onCommit();
    };
    dragCleanup.current?.();
    dragCleanup.current = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      data-sid={s.id}
      aria-label={def.name}
      aria-roledescription="sticker"
      aria-pressed={selected}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown [ ] - = Delete Escape"
      className="sj-placed pointer-events-none absolute"
      style={{ left: s.x, top: s.y, width: BASE, height: BASE, marginLeft: -BASE / 2, marginTop: -BASE / 2, zIndex: z + 1 }}
      onFocus={() => onSelect(s.id)}
      onKeyDown={(event) => onKey(s.id, event)}
    >
      <motion.div style={{ y, scaleX: sx, scaleY: sy, filter, opacity }}>
        <div className="sj-rot pointer-events-none" style={{ transform: `rotate(${s.rotation}deg) scale(${s.scale})`, touchAction: "none" }} onPointerDown={onPointerDown}>
          <StickerArt def={def} u={u} size={BASE} hit />
        </div>
      </motion.div>
    </div>
  );
});

/** The dashed box round the chosen sticker, with its delete button and the corner handle that turns and resizes it. */
function SelectionBox({
  s,
  name,
  onTransform,
  onCommit,
  onRemove,
}: {
  s: PlacedSticker;
  name: string;
  onTransform: (id: string, rotation: number, scale: number) => void;
  onCommit: () => void;
  onRemove: (id: string) => void;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const size = BASE * s.scale;

  const onHandleDown = (event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const box = boxRef.current;
    if (!box) return;
    // The box is turned about its middle, so the middle of its bounding box is the sticker's centre however it is rotated.
    const r = box.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const a0 = Math.atan2(event.clientY - cy, event.clientX - cx);
    const d0 = Math.hypot(event.clientX - cx, event.clientY - cy) || 1;
    const rot0 = s.rotation;
    const scale0 = s.scale;
    const move = (e: PointerEvent) => {
      const a = Math.atan2(e.clientY - cy, e.clientX - cx);
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);
      onTransform(s.id, rot0 + ((a - a0) * 180) / Math.PI, clamp(scale0 * (d / d0), SCALE_MIN, SCALE_MAX));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      onCommit();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  return (
    <div
      ref={boxRef}
      className="pointer-events-none absolute"
      style={{ left: s.x, top: s.y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, transform: `rotate(${s.rotation}deg)`, zIndex: 200 }}
    >
      <div className="absolute inset-[3px] rounded-[14px]" style={{ border: `1.5px dashed ${INK}`, background: "rgba(255,255,255,0.14)" }} />
      <button
        type="button"
        className="sj-btn sj-round pointer-events-auto absolute"
        aria-label={`Remove ${name}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onRemove(s.id)}
        style={{ left: -9, top: -9, transform: `rotate(${-s.rotation}deg)` }}
      >
        <svg aria-hidden viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round">
          <path d="M6 6L18 18M18 6L6 18" />
        </svg>
      </button>
      <div
        aria-hidden
        className="sj-round sj-handle pointer-events-auto absolute"
        onPointerDown={onHandleDown}
        style={{ right: -9, bottom: -9, transform: `rotate(${-s.rotation}deg)`, touchAction: "none", cursor: "grab" }}
      >
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 15A9 9 0 1 1 18.4 5.6L23 10" />
          <path d="M23 4V10H17" />
        </svg>
      </div>
    </div>
  );
}

/* ───────────────────────────── the page's own styles ───────────────────────────── */

const STYLES = `
  .sj-screen { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  .sj-cut * { fill: #fff !important; stroke: #fff !important; stroke-width: 12px !important; stroke-linejoin: round !important; stroke-linecap: round !important; opacity: 1 !important; stroke-dasharray: none !important; }
  .sj-cut [fill="none"] { fill: none !important; }
  .sj-cut .sj-skip { display: none !important; }
  .sj-btn { outline: none; cursor: pointer; border: 0; font-family: ${FONT}; -webkit-tap-highlight-color: transparent; }
  .sj-btn:focus-visible, .sj-dot:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
  .sj-btn:disabled { cursor: default; }
  .sj-round { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; background: #fff; box-shadow: 0 0 0 1.5px ${INK}, 0 2px 5px rgba(75,58,74,0.25); padding: 0; }
  .sj-handle:hover { background: #FFF1F5; }
  .sj-deck { outline: none; }
  .sj-deck:focus-visible { outline: 2px solid ${INK}; outline-offset: -3px; border-radius: 22px; }
  .sj-cell { outline: none; border: 0; padding: 0; background: transparent; cursor: grab; -webkit-tap-highlight-color: transparent; touch-action: none; }
  .sj-cell:focus-visible .sj-slot { outline: 2px solid ${INK}; outline-offset: 2px; }
  .sj-slot { background: rgba(255,157,181,0.09); border: 1.5px dashed rgba(190,120,140,0.28); border-radius: 22px; }
  .sj-art { display: block; transition: transform 0.28s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.2s ease; will-change: transform; }
  .sj-cell[data-taken="true"] .sj-art { opacity: 0.28; }
  @media (hover: hover) and (pointer: fine) {
    .sj-cell:hover .sj-art { transform: translateY(-3px) rotate(-3deg) scale(1.07); }
    .sj-handle { cursor: grab; }
  }
  .sj-cell:active .sj-art { transform: scale(0.94); }
  .sj-placed { outline: none; }
  .sj-placed:focus-visible .sj-rot { outline: 2px solid ${INK}; outline-offset: -1px; border-radius: 16px; }
  .sj-page-ring { transition: box-shadow 0.18s ease; }
  .sj-pip { transition: width 0.25s ease, background 0.25s ease; }
  @media (prefers-reduced-motion: reduce) {
    .sj-art, .sj-page-ring, .sj-pip { transition: none; }
  }
`;

/* ───────────────────────────── small interface pieces ───────────────────────────── */

function StatusBar() {
  return (
    <>
      <div aria-hidden className="absolute" style={{ left: 36, top: 17, fontSize: 13, fontWeight: 600, lineHeight: "20px", color: INK, letterSpacing: "-0.01em" }}>
        9:41
      </div>
      <div aria-hidden className="absolute" style={{ left: "50%", top: 14, width: 88, height: 26, marginLeft: -44, borderRadius: 13, background: "#2A2430" }} />
      <svg aria-hidden className="absolute" style={{ right: 32, top: 21 }} width={52} height={13} viewBox="0 0 52 13" fill={INK}>
        <rect x={0} y={8} width={3} height={4} rx={1} />
        <rect x={5} y={5} width={3} height={7} rx={1} />
        <rect x={10} y={2} width={3} height={10} rx={1} />
        <rect x={15} y={0} width={3} height={12} rx={1} opacity={0.3} />
        <rect x={25} y={1} width={24} height={11} rx={3.4} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.55} />
        <rect x={27} y={3} width={16} height={7} rx={2} />
        <rect x={50} y={4.6} width={1.6} height={4} rx={0.8} opacity={0.55} />
      </svg>
    </>
  );
}

const chevron = (dir: -1 | 1) => (
  <svg aria-hidden viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d={dir < 0 ? "M15 5L8 12L15 19" : "M9 5L16 12L9 19"} />
  </svg>
);

/* ───────────────────────────── the journal ───────────────────────────── */

type Spot = { x: number; y: number; rotation: number; scale: number };

export function StickerJournal({ date = "Oct 29 · Thu", initialStickers = DEFAULT_STICKERS, loop = false, onChange, className }: StickerJournalProps) {
  const reduce = !!useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const [initial] = React.useState(initialStickers);
  const [stickers, setStickers] = React.useState<PlacedSticker[]>(initial);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<Record<string, Entry>>({});
  const [flights, setFlights] = React.useState<FlightSpec[]>([]);
  const [shown, setShown] = React.useState(0);
  const [taken, setTaken] = React.useState<StickerDef | null>(null);
  const [over, setOver] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [undo, setUndo] = React.useState<PlacedSticker[] | null>(null);
  const [bump, setBump] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [interacted, setInteracted] = React.useState(false);

  const stickersRef = React.useRef(stickers);
  const flightsRef = React.useRef<FlightSpec[]>([]);
  const resolvers = React.useRef(new Map<number, () => void>());
  const scaleRef = React.useRef(1);
  const interactedRef = React.useRef(false);
  const draggedRef = React.useRef(false);
  const idRef = React.useRef(0);
  const flightKey = React.useRef(0);
  const packRef = React.useRef(0);
  const posAnim = React.useRef<AnimationPlaybackControls | null>(null);
  const gestureEnd = React.useRef<(() => void) | null>(null);
  const focusAfter = React.useRef<"top" | "page" | null>(null);
  const rngRef = React.useRef<(() => number) | null>(null);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const reduceRef = React.useRef(reduce);
  React.useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const screenRef = React.useRef<HTMLDivElement>(null);
  const deckRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);

  // The sheet's position, in packs: 0 is the first pack in view, 1 the second, and so on, with every value in between.
  const pos = React.useMemo(() => motionValue(0), []);
  const trackX = useTransform(pos, (p) => -p * SURFACE_W);
  // The drag ghost: a sticker held by the pointer on its way from the sheet to the page.
  const ghost = React.useMemo<GhostValues>(
    () => ({ x: motionValue(0), y: motionValue(0), scale: motionValue(1), rotate: motionValue(0), lift: motionValue(0), peel: motionValue(0) }),
    [],
  );

  const rnd = React.useCallback(() => {
    if (!rngRef.current) rngRef.current = mulberry32(0x5ca1ed);
    return rngRef.current();
  }, []);

  // Scale the true-size phone down to the space it has, so it is always whole.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.max(0.3, Math.min(1, (host.clientWidth - 24) / SURFACE_W, (host.clientHeight - 24) / SURFACE_H));
      scaleRef.current = scale;
      fit.style.transform = `scale(${scale.toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => pos.on("change", (v) => setShown(clamp(Math.round(v), 0, PACKS.length - 1))), [pos]);
  React.useEffect(() => () => gestureEnd.current?.(), []);

  const touched = React.useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }, []);

  /** A point on the screen, in the phone's own pixels. */
  const toPhone = React.useCallback((clientX: number, clientY: number) => {
    const r = fitRef.current?.getBoundingClientRect();
    const s = scaleRef.current;
    return r ? { x: (clientX - r.left) / s, y: (clientY - r.top) / s } : { x: 0, y: 0 };
  }, []);
  const centreOf = React.useCallback(
    (el: Element) => {
      const r = el.getBoundingClientRect();
      return toPhone(r.left + r.width / 2, r.top + r.height / 2);
    },
    [toPhone],
  );

  /* ───────────── the page's stickers ───────────── */

  const setList = React.useCallback((next: PlacedSticker[]) => {
    stickersRef.current = next;
    setStickers(next);
  }, []);
  /** Tell the host a person changed the page. */
  const emit = React.useCallback(() => onChangeRef.current?.(stickersRef.current), []);

  const nextId = React.useCallback(() => {
    let id: string;
    do {
      idRef.current += 1;
      id = `s${idRef.current}`;
    } while (stickersRef.current.some((s) => s.id === id));
    return id;
  }, []);

  const patch = React.useCallback(
    (id: string, change: Partial<PlacedSticker>) => {
      setList(stickersRef.current.map((s) => (s.id === id ? { ...s, ...change } : s)));
    },
    [setList],
  );

  const select = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      const list = stickersRef.current;
      const i = list.findIndex((s) => s.id === id);
      // The chosen sticker comes to the front.
      if (i >= 0 && i < list.length - 1) setList([...list.slice(0, i), ...list.slice(i + 1), list[i]]);
    },
    [setList],
  );

  const move = React.useCallback(
    (id: string, x: number, y: number) => patch(id, { x: r1(clamp(x, EDGE, PAGE_W - EDGE)), y: r1(clamp(y, EDGE, PAGE_H - EDGE)) }),
    [patch],
  );
  const transform = React.useCallback(
    (id: string, rotation: number, scale: number) => {
      const turns = ((((rotation + 180) % 360) + 360) % 360) - 180;
      patch(id, { rotation: r1(turns), scale: Math.round(scale * 100) / 100 });
    },
    [patch],
  );

  const remove = React.useCallback(
    (id: string) => {
      const def = STICKER_BY_ID.get(stickersRef.current.find((s) => s.id === id)?.sticker ?? "");
      setList(stickersRef.current.filter((s) => s.id !== id));
      setSelectedId(null);
      setNote(`Removed ${def?.name ?? "sticker"}`);
      focusAfter.current = "top";
      emit();
    },
    [setList, emit],
  );

  const clearPage = React.useCallback(
    (back?: PlacedSticker[], byPerson = true) => {
      const before = stickersRef.current;
      setSelectedId(null);
      const finish = () => {
        setClearing(false);
        if (back) {
          setEntries(Object.fromEntries(back.map((s) => [s.id, "fade" as const])));
        }
        setList(back ?? []);
        if (byPerson) emit();
      };
      if (byPerson) {
        setUndo(back ? null : before);
        setNote(back ? "Page restored" : "Page cleared");
      }
      if (reduceRef.current || before.length === 0) {
        finish();
        return;
      }
      setClearing(true);
      window.setTimeout(finish, 240);
    },
    [setList, emit],
  );

  /** Somewhere on the page with room: the best of a handful of seeded tries, the one furthest from everything already there. */
  const pickSpot = React.useCallback((): Spot => {
    const occupied = [...stickersRef.current.map((s) => ({ x: s.x, y: s.y })), ...flightsRef.current.map((f) => ({ x: f.to.x - PAGE_X, y: f.to.y - PAGE_Y }))];
    let best: Spot | null = null;
    let bestGap = -1;
    for (let i = 0; i < 18; i += 1) {
      const x = EDGE + 30 + rnd() * (PAGE_W - 2 * (EDGE + 30));
      const y = 74 + 30 + rnd() * (PAGE_H - 74 - 30 - EDGE - 30);
      const gap = occupied.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), 999);
      if (gap > bestGap) {
        bestGap = gap;
        best = { x, y, rotation: (rnd() - 0.5) * 28, scale: 0.94 + rnd() * 0.18 };
      }
    }
    return best as Spot;
  }, [rnd]);

  /** Stick a sticker down on the page. `entry` is how it arrives: dropped from a lift, or faded in. */
  const land = React.useCallback(
    (def: StickerDef, spot: Spot, entry: Entry, byPerson: boolean) => {
      const id = nextId();
      const list = [...stickersRef.current, { id, sticker: def.id, x: r1(clamp(spot.x, EDGE, PAGE_W - EDGE)), y: r1(clamp(spot.y, EDGE, PAGE_H - EDGE)), rotation: r1(spot.rotation), scale: Math.round(spot.scale * 100) / 100 }];
      setEntries((prev) => ({ ...prev, [id]: entry }));
      setList(list);
      setUndo(null);
      setNote(`Placed ${def.name}`);
      if (byPerson) emit();
    },
    [nextId, setList, emit],
  );

  const full = React.useCallback(() => {
    setBump((b) => b + 1);
    setNote("The page is full");
  }, []);

  /** Peel a sticker off the sheet and fly it onto the page. Resolves once it has landed. */
  const fly = React.useCallback(
    (def: StickerDef, from: Element | null, byPerson: boolean) =>
      new Promise<void>((resolve) => {
        if (stickersRef.current.length + flightsRef.current.length >= MAX_STICKERS) {
          full();
          resolve();
          return;
        }
        const spot = pickSpot();
        if (reduceRef.current || !from) {
          land(def, spot, "fade", byPerson);
          resolve();
          return;
        }
        const spec: FlightSpec = { key: (flightKey.current += 1), def, from: centreOf(from), to: { x: PAGE_X + spot.x, y: PAGE_Y + spot.y, rotation: spot.rotation, scale: spot.scale }, byPerson };
        resolvers.current.set(spec.key, resolve);
        flightsRef.current = [...flightsRef.current, spec];
        setFlights(flightsRef.current);
      }),
    [pickSpot, land, centreOf, full],
  );

  const finishFlight = React.useCallback(
    (key: number) => {
      const spec = flightsRef.current.find((f) => f.key === key);
      if (!spec) return;
      flightsRef.current = flightsRef.current.filter((f) => f.key !== key);
      setFlights(flightsRef.current);
      land(spec.def, { x: spec.to.x - PAGE_X, y: spec.to.y - PAGE_Y, rotation: spec.to.rotation, scale: spec.to.scale }, "land", spec.byPerson);
      resolvers.current.get(key)?.();
      resolvers.current.delete(key);
    },
    [land],
  );

  // After a sticker is removed, keep the keyboard on the page.
  React.useEffect(() => {
    const want = focusAfter.current;
    if (!want) return;
    focusAfter.current = null;
    const items = pageRef.current?.querySelectorAll<HTMLElement>("[data-sid]");
    const target = want === "top" && stickers.length ? pageRef.current?.querySelector<HTMLElement>(`[data-sid="${stickers[stickers.length - 1].id}"]`) : null;
    (target ?? (items && items.length ? null : pageRef.current))?.focus({ preventScroll: true });
  }, [stickers]);

  const onItemKey = React.useCallback(
    (id: string, event: React.KeyboardEvent) => {
      const s = stickersRef.current.find((item) => item.id === id);
      if (!s) return;
      const step = event.shiftKey ? 16 : 4;
      const turn = event.shiftKey ? 15 : 5;
      const key = event.code === "BracketLeft" ? "[" : event.code === "BracketRight" ? "]" : event.key;
      switch (key) {
        case "ArrowLeft":
          move(id, s.x - step, s.y);
          break;
        case "ArrowRight":
          move(id, s.x + step, s.y);
          break;
        case "ArrowUp":
          move(id, s.x, s.y - step);
          break;
        case "ArrowDown":
          move(id, s.x, s.y + step);
          break;
        case "[":
          transform(id, s.rotation - turn, s.scale);
          break;
        case "]":
          transform(id, s.rotation + turn, s.scale);
          break;
        case "-":
        case "_":
          transform(id, s.rotation, clamp(s.scale * 0.92, SCALE_MIN, SCALE_MAX));
          break;
        case "=":
        case "+":
          transform(id, s.rotation, clamp(s.scale * 1.08, SCALE_MIN, SCALE_MAX));
          break;
        case "Delete":
        case "Backspace":
          event.preventDefault();
          remove(id);
          return;
        case "Escape":
          setSelectedId(null);
          return;
        default:
          return;
      }
      event.preventDefault();
      emit();
    },
    [move, transform, remove, emit],
  );

  const onPaperDown = () => {
    setSelectedId(null);
    const active = document.activeElement;
    if (active instanceof HTMLElement && pageRef.current?.contains(active)) active.blur();
  };

  /* ───────────── the sticker sheet ───────────── */

  /** Take the sheet to a pack, with a spring that carries on from the hand's speed (packs per second). */
  const goPack = React.useCallback(
    (target: number, velocity = 0) => {
      const i = clamp(Math.round(target), 0, PACKS.length - 1);
      packRef.current = i;
      posAnim.current?.stop();
      if (reduceRef.current) {
        pos.set(i);
        return;
      }
      posAnim.current = animate(pos, i, { type: "spring", bounce: 0, visualDuration: 0.44, velocity });
    },
    [pos],
  );

  // The hand on the sheet. A drag that starts on a sticker and goes mostly up or down takes the sticker; any other drag
  // swipes the packs. Both are tracked on the window, so they carry on wherever the pointer goes.
  const onDeckPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gestureEnd.current?.();
    posAnim.current?.stop();
    const cell = (event.target as Element).closest<HTMLElement>("[data-sticker]");
    const def = cell ? STICKER_BY_ID.get(cell.dataset.sticker ?? "") ?? null : null;
    const g = {
      x0: event.clientX,
      y0: event.clientY,
      mode: "pending" as "pending" | "swipe" | "take",
      startPos: pos.get(),
      startIdx: packRef.current,
      samples: [{ t: performance.now(), x: event.clientX }],
      rotation: 0,
      home: { x: 0, y: 0 },
    };
    const inPage = (p: { x: number; y: number }) => p.x >= PAGE_X && p.x <= PAGE_X + PAGE_W && p.y >= PAGE_Y && p.y <= PAGE_Y + PAGE_H;
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - g.x0) / scaleRef.current;
      const dy = (e.clientY - g.y0) / scaleRef.current;
      if (g.mode === "pending") {
        if (Math.hypot(dx, dy) < 7) return;
        draggedRef.current = true;
        if (cell && def && Math.abs(dy) > Math.abs(dx) * 0.9) {
          g.mode = "take";
          g.rotation = (rnd() - 0.5) * 20;
          g.home = centreOf(cell);
          setTaken(def);
          const start = toPhone(e.clientX, e.clientY);
          ghost.x.jump(start.x);
          ghost.y.jump(start.y - LIFT_RISE - 6);
          ghost.scale.jump(CELL_ART / BASE);
          ghost.rotate.jump(0);
          ghost.lift.jump(0);
          ghost.peel.jump(0);
          animate(ghost.lift, 1, { duration: 0.16, ease: "easeOut" });
          animate(ghost.scale, 1.08, { type: "spring", stiffness: 520, damping: 22 });
          animate(ghost.rotate, g.rotation, { duration: 0.2, ease: "easeOut" });
          animate(ghost.peel, [0, 1, 0], { duration: 0.3, ease: "easeOut" });
        } else {
          g.mode = "swipe";
        }
      }
      if (g.mode === "swipe") {
        g.samples.push({ t: performance.now(), x: e.clientX });
        if (g.samples.length > 12) g.samples.shift();
        pos.set(rubber(g.startPos - dx / SURFACE_W));
      } else if (g.mode === "take") {
        const p = toPhone(e.clientX, e.clientY);
        ghost.x.set(p.x);
        ghost.y.set(p.y - LIFT_RISE - 6);
        setOver(inPage(p));
      }
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      gestureEnd.current = null;
    };
    const finish = (cancelled: boolean) => {
      stop();
      // Catching the sheet mid-glide stopped it where it was; a tap or a sticker drag lets it carry on to its pack.
      if (g.mode !== "swipe" && Math.abs(pos.get() - packRef.current) > 0.001) goPack(packRef.current);
      if (g.mode === "pending") return;
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 60);
      if (g.mode === "swipe") {
        const last = g.samples[g.samples.length - 1];
        const first = g.samples.find((s) => last.t - s.t < 90) ?? g.samples[0];
        const idle = performance.now() - last.t > 80;
        const v = !idle && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0;
        const velocity = -v / scaleRef.current / SURFACE_W;
        goPack(clamp(Math.round(pos.get() + velocity * 0.12), g.startIdx - 1, g.startIdx + 1), velocity);
        return;
      }
      // Let go of a taken sticker: on the page it sticks, anywhere else it springs back to its place on the sheet.
      setOver(false);
      // The sticker is held a little above the pointer, so the pointer is what decides where it is dropped.
      const at = { x: ghost.x.get(), y: ghost.y.get() + LIFT_RISE + 6 };
      if (!cancelled && def && inPage(at)) {
        land(def, { x: at.x - PAGE_X, y: at.y - 6 - PAGE_Y, rotation: g.rotation, scale: 1 }, "land", true);
        setTaken(null);
        return;
      }
      if (reduceRef.current) {
        setTaken(null);
        return;
      }
      const home = centreOf(cell as Element);
      const back = { type: "spring" as const, stiffness: 380, damping: 30 };
      animate(ghost.lift, 0, { duration: 0.3 });
      animate(ghost.rotate, 0, { duration: 0.3 });
      animate(ghost.scale, CELL_ART / BASE, back);
      animate(ghost.x, home.x, back);
      animate(ghost.y, home.y, { ...back, onComplete: () => setTaken(null) });
    };
    const onUp = () => finish(false);
    const onCancel = () => finish(true);
    gestureEnd.current = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  // A two-finger trackpad swipe feeds the same position directly, so the packs follow frame by frame.
  React.useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    const w = { active: false, startPos: 0, startIdx: 0, acc: 0, last: 0, v: 0, lock: 0, timer: 0 };
    const finish = () => {
      w.timer = 0;
      w.active = false;
      w.lock = performance.now() + 450; // ignore the momentum tail of this swipe
      goPack(clamp(Math.round(pos.get() + w.v * 0.12), w.startIdx - 1, w.startIdx + 1), w.v);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical intent: let the page scroll
      e.preventDefault(); // and don't let a sideways swipe turn into browser back/forward
      if (!interactedRef.current) {
        interactedRef.current = true;
        setInteracted(true);
      }
      const now = performance.now();
      if (reduceRef.current || now < w.lock) return;
      if (!w.active) {
        w.active = true;
        w.startPos = pos.get();
        w.startIdx = packRef.current;
        w.acc = 0;
        posAnim.current?.stop();
      }
      w.v = (e.deltaX / Math.max(8, now - w.last) / scaleRef.current / SURFACE_W) * 1000;
      w.last = now;
      w.acc += e.deltaX;
      pos.set(rubber(w.startPos + w.acc / scaleRef.current / SURFACE_W));
      window.clearTimeout(w.timer);
      w.timer = window.setTimeout(finish, 90);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(w.timer);
    };
  }, [pos, goPack]);

  const onDeckKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = clamp(packRef.current + (event.key === "ArrowRight" ? 1 : -1), 0, PACKS.length - 1);
    if (next === packRef.current) return;
    goPack(next);
    // The page the keyboard was on is now out of reach, so it follows to the sheet itself.
    deckRef.current?.focus({ preventScroll: true });
  };

  const onCell = (def: StickerDef, el: HTMLElement) => {
    if (draggedRef.current) return;
    void fly(def, el, true);
  };

  // Gallery loop: swipe to a pack, peel a sticker onto the page, now and then turn one, and clear the page when it is full.
  React.useEffect(() => {
    if (!loop || interacted) return;
    let cancelled = false;
    const timers = new Set<number>();
    const runs = new Set<AnimationPlaybackControls>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });
    const twirl = async () => {
      const list = stickersRef.current;
      if (!list.length) return;
      const s = list[Math.floor(rnd() * list.length)];
      select(s.id);
      await wait(500);
      if (cancelled) return;
      const turn = rnd() < 0.5 ? -34 : 34;
      await new Promise<void>((resolve) => {
        const run = animate(0, 1, {
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1],
          onUpdate: (t) => patch(s.id, { rotation: r1(s.rotation + turn * t), scale: Math.round((s.scale * (1 + 0.1 * Math.sin(Math.PI * t))) * 100) / 100 }),
          onComplete: resolve,
        });
        runs.add(run);
      });
      await wait(450);
      if (!cancelled) setSelectedId(null);
    };
    (async () => {
      await wait(1600);
      let round = 0;
      while (!cancelled) {
        const p = round % PACKS.length;
        goPack(p);
        await wait(reduceRef.current ? 200 : 800);
        if (cancelled) return;
        const def = PACKS[p].stickers[(round * 2 + Math.floor(round / PACKS.length)) % PACKS[p].stickers.length];
        await fly(def, screenRef.current?.querySelector(`[data-sticker="${def.id}"]`) ?? null, false);
        if (cancelled) return;
        await wait(1000);
        round += 1;
        if (round % 3 === 0 && !reduceRef.current) {
          await twirl();
          if (cancelled) return;
        }
        if (stickersRef.current.length >= LOOP_FULL) {
          await wait(1500);
          if (cancelled) return;
          clearPage(initial, false);
          await wait(1100);
        }
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      runs.forEach((run) => run.stop());
    };
  }, [loop, interacted, initial, goPack, fly, select, patch, clearPage, rnd]);

  /* ───────────── render ───────────── */

  // Render in a steady order so stacking changes never move a sticker in the DOM (which would drop its focus); z-index carries the stacking.
  const { order, depth } = React.useMemo(() => {
    const byId = [...stickers].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return { order: byId, depth: new Map(stickers.map((s, i) => [s.id, i])) };
  }, [stickers]);
  const selected = stickers.find((s) => s.id === selectedId) ?? null;
  const selectedDef = selected ? STICKER_BY_ID.get(selected.sticker) : undefined;
  const empty = stickers.length === 0 && flights.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={hostRef}
        className={cn("relative flex size-full min-h-[420px] items-center justify-center overflow-hidden", className)}
        style={{ fontFamily: FONT }}
        onPointerDownCapture={touched}
        onKeyDownCapture={touched}
      >
        <style>{STYLES}</style>

        {/* Shared paints: the washi patterns and the paper grain. */}
        <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
          <defs>
            <pattern id={`${uid}-wstripe`} width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="13" height="13" fill="#FFEAF0" />
              <rect width="6.5" height="13" fill="#FFA9C3" />
            </pattern>
            <pattern id={`${uid}-wgingham`} width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#E6F6EF" />
              <rect width="14" height="7" fill="#79CBAE" opacity="0.5" />
              <rect width="7" height="14" fill="#79CBAE" opacity="0.5" />
            </pattern>
            <pattern id={`${uid}-wdots`} width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="#C6E4F9" />
              <circle cx="6" cy="6" r="2.6" fill="#FFFFFF" />
            </pattern>
            <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="6" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.34  0 0 0 0 0.3  0 0 0 1.4 -0.5" />
            </filter>
          </defs>
        </svg>

        <div ref={fitRef} className="relative shrink-0" style={{ width: SURFACE_W, height: SURFACE_H, transformOrigin: "50% 50%" }}>
          <div
            ref={screenRef}
            role="group"
            aria-label="Sticker journal"
            className="sj-screen absolute inset-0 overflow-hidden"
            style={{
              borderRadius: SURFACE_RADIUS,
              background: SCREEN,
              color: INK,
              fontFamily: FONT,
              boxShadow: "0 0 0 1px rgba(75,58,74,0.1), 0 22px 44px -18px rgba(75,58,74,0.4)",
            }}
          >
            <StatusBar />

            {/* The toolbar: how many stickers are on the page, and a quick way to start over. */}
            <div className="absolute flex items-center justify-between" style={{ left: 20, right: 20, top: 48, height: 30, zIndex: 5 }}>
              <motion.div
                key={bump}
                aria-live="polite"
                className="flex items-center gap-1.5 rounded-full"
                animate={bump ? { x: [0, -4, 4, -3, 0] } : undefined}
                transition={{ duration: 0.3 }}
                style={{ height: 28, padding: "0 12px 0 9px", background: stickers.length >= MAX_STICKERS ? "#FFD3E0" : "rgba(255,255,255,0.72)", fontSize: 12.5, fontWeight: 600, lineHeight: 1 }}
              >
                <svg aria-hidden viewBox="0 0 24 24" width={15} height={15}>
                  <path d={sparklePath(12, 12, 11)} fill="#FFD84D" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
                </svg>
                <span aria-label={`${stickers.length} of ${MAX_STICKERS} stickers`}>
                  {stickers.length} / {MAX_STICKERS}
                </span>
              </motion.div>
              <button
                type="button"
                className="sj-btn rounded-full"
                disabled={stickers.length === 0 && !undo}
                onClick={() => (stickers.length === 0 && undo ? clearPage(undo) : clearPage())}
                style={{ height: 28, padding: "0 13px", background: "#fff", color: INK, fontSize: 12.5, fontWeight: 600, opacity: stickers.length === 0 && !undo ? 0.45 : 1, boxShadow: "0 1px 0 rgba(75,58,74,0.1)" }}
              >
                {stickers.length === 0 && undo ? "Undo clear" : "Clear page"}
              </button>
            </div>

            {/* The journal page. */}
            <div
              ref={pageRef}
              role="group"
              tabIndex={-1}
              aria-label={`Journal page, ${date}`}
              className="sj-page-ring absolute outline-none"
              style={{ left: PAGE_X, top: PAGE_Y, width: PAGE_W, height: PAGE_H, borderRadius: PAGE_RADIUS, zIndex: 2, boxShadow: over ? `0 0 0 3px ${BLUSH}, 0 10px 22px -12px rgba(75,58,74,0.35)` : "0 10px 22px -12px rgba(75,58,74,0.35)" }}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                onPointerDown={onPaperDown}
                style={{
                  borderRadius: PAGE_RADIUS,
                  background: PAPER,
                  backgroundImage: `radial-gradient(circle at 1px 1px, ${PAPER_DOT} 1.15px, transparent 1.5px)`,
                  backgroundSize: "16px 16px",
                  backgroundPosition: "9px 9px",
                  boxShadow: "inset 0 0 0 1px rgba(75,58,74,0.07)",
                }}
              >
                <svg aria-hidden className="pointer-events-none absolute inset-0" width="100%" height="100%">
                  <rect width="100%" height="100%" filter={`url(#${uid}-grain)`} style={{ opacity: 0.22, mixBlendMode: "multiply" }} />
                </svg>

                {/* A strip of washi wrapped round the corner. */}
                <svg aria-hidden className="pointer-events-none absolute" style={{ right: -34, top: 8, transform: "rotate(36deg)", overflow: "visible" }} width={130} height={32} viewBox="0 0 130 32">
                  <path
                    d="M0 3L4 7.5L0 12L4 16.5L0 21L4 25.5L0 30H130L126 25.5L130 21L126 16.5L130 12L126 7.5L130 3Z"
                    fill={`url(#${uid}-wgingham)`}
                    fillOpacity={0.92}
                    stroke={INK}
                    strokeOpacity={0.28}
                    strokeWidth={1.2}
                  />
                </svg>

                <div className="pointer-events-none absolute" style={{ left: 20, top: 12 }}>
                  <h2 className="m-0" style={{ font: "inherit", fontFamily: HAND, fontSize: 36, fontWeight: 700, lineHeight: "40px", letterSpacing: "0.01em", color: INK, whiteSpace: "nowrap" }}>
                    {date}
                  </h2>
                  <svg aria-hidden width={134} height={9} viewBox="0 0 134 9" fill="none" style={{ display: "block", marginTop: -1 }}>
                    <path d="M2 5.2C10 1.4 15 8 23 4.6C31 1.2 36 8 44 4.6C52 1.2 57 8 65 4.6C73 1.2 78 8 86 4.6C94 1.2 99 8 107 4.6C115 1.2 120 8 132 4.2" stroke={BLUSH} strokeWidth={2.4} strokeLinecap="round" />
                  </svg>
                </div>

                {/* Two faint ruled lines at the foot of the page, for notes. */}
                <div aria-hidden className="pointer-events-none absolute" style={{ left: 20, right: 20, bottom: 26, height: 1, background: PAPER_DOT, opacity: 0.8 }} />
                <div aria-hidden className="pointer-events-none absolute" style={{ left: 20, right: 20, bottom: 50, height: 1, background: PAPER_DOT, opacity: 0.8 }} />

                {empty ? (
                  <div className="pointer-events-none absolute inset-x-0 text-center" style={{ top: "46%", fontFamily: HAND, fontSize: 25, fontWeight: 600, color: INK, opacity: 0.4 }}>
                    tap or drag a sticker here
                  </div>
                ) : null}
              </div>

              {/* The stickers. The layer clips at the page edge, like a sticker hanging over a real page. */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: PAGE_RADIUS, opacity: clearing ? 0 : 1, transition: "opacity 0.22s ease" }}>
                {order.map((s) => {
                  const def = STICKER_BY_ID.get(s.sticker);
                  return def ? (
                    <PlacedItem key={s.id} s={s} def={def} z={depth.get(s.id) ?? 0} u={uid} selected={s.id === selectedId} entry={entries[s.id]} scaleRef={scaleRef} onSelect={select} onMove={move} onCommit={emit} onKey={onItemKey} />
                  ) : null;
                })}
              </div>

              {/* Its dashed box and handles sit above, so they are never clipped by the page edge. */}
              {selected && selectedDef && !clearing ? <SelectionBox s={selected} name={selectedDef.name} onTransform={transform} onCommit={emit} onRemove={remove} /> : null}
            </div>

            {/* The sticker sheet. */}
            <section
              aria-label="Sticker sheet"
              className="absolute inset-x-0 bottom-0"
              style={{ top: SHEET_TOP, borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`, background: `linear-gradient(180deg, ${SHEET} 0%, #FFF7F9 100%)`, boxShadow: "0 -12px 28px -14px rgba(75,58,74,0.35), inset 0 1px 0 #fff", zIndex: 6 }}
            >
              <div className="absolute flex items-center justify-between" style={{ left: 18, right: 18, top: 12, height: 30 }}>
                <button type="button" className="sj-btn sj-round" aria-label="Previous pack" disabled={shown === 0} onClick={() => { goPack(packRef.current - 1); }} style={{ width: 28, height: 28, opacity: shown === 0 ? 0.35 : 1, background: "#F8EDF1", boxShadow: "none" }}>
                  {chevron(-1)}
                </button>
                <div className="relative text-center" style={{ height: 30, width: 180 }}>
                  <AnimatePresence initial={false} mode="wait">
                    <motion.h3
                      key={shown}
                      className="absolute inset-x-0 m-0"
                      style={{ font: "inherit", fontSize: 15, fontWeight: 600, lineHeight: "30px", letterSpacing: "-0.01em" }}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
                      exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                    >
                      {PACKS[shown].name}
                    </motion.h3>
                  </AnimatePresence>
                </div>
                <button type="button" className="sj-btn sj-round" aria-label="Next pack" disabled={shown === PACKS.length - 1} onClick={() => { goPack(packRef.current + 1); }} style={{ width: 28, height: 28, opacity: shown === PACKS.length - 1 ? 0.35 : 1, background: "#F8EDF1", boxShadow: "none" }}>
                  {chevron(1)}
                </button>
              </div>

              <div
                ref={deckRef}
                role="group"
                aria-roledescription="carousel"
                aria-label="Sticker packs"
                tabIndex={0}
                className="sj-deck absolute overflow-hidden"
                onKeyDown={onDeckKeyDown}
                onPointerDown={onDeckPointerDown}
                style={{ left: 0, right: 0, top: DECK_TOP, height: DECK_H, touchAction: "none", overscrollBehaviorX: "contain" }}
              >
                <motion.div className="flex h-full" style={{ x: trackX, width: PACKS.length * SURFACE_W }}>
                  {PACKS.map((pack, i) => (
                    <div
                      key={pack.id}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${pack.name}, ${i + 1} of ${PACKS.length}`}
                      aria-hidden={i === shown ? undefined : true}
                      inert={i === shown ? undefined : true}
                      className="grid flex-none"
                      style={{ width: SURFACE_W, padding: "0 20px", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 8 }}
                    >
                      {pack.stickers.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          className="sj-cell relative grid place-items-center"
                          data-sticker={def.id}
                          data-taken={taken?.id === def.id ? "true" : undefined}
                          aria-label={`Add ${def.name} sticker`}
                          onClick={(event) => onCell(def, event.currentTarget)}
                        >
                          <span aria-hidden className="sj-slot absolute inset-0" />
                          <span aria-hidden className="sj-art relative">
                            <StickerArt def={def} u={uid} size={CELL_ART} />
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </motion.div>
              </div>

              <div role="group" aria-label="Choose a pack" className="absolute inset-x-0 flex items-center justify-center" style={{ top: DECK_TOP + DECK_H + 4, height: 18, gap: 2 }}>
                {PACKS.map((pack, i) => (
                  <button
                    key={pack.id}
                    type="button"
                    className="sj-btn sj-dot grid place-items-center rounded-full"
                    aria-label={`${pack.name} pack`}
                    aria-current={i === shown ? "true" : undefined}
                    onClick={() => goPack(i)}
                    style={{ width: 20, height: 18, background: "transparent" }}
                  >
                    <span aria-hidden className="sj-pip block rounded-full" style={{ width: i === shown ? 16 : 6, height: 6, background: i === shown ? BLUSH : "rgba(75,58,74,0.2)" }} />
                  </button>
                ))}
              </div>
            </section>

            {/* Stickers in the air: flying to the page, or held by the pointer. */}
            {flights.map((spec) => (
              <Flight key={spec.key} spec={spec} u={uid} onDone={finishFlight} />
            ))}
            {taken ? <Ghost def={taken} u={uid} v={ghost} /> : null}

            <div role="status" aria-live="polite" className="sr-only">
              {note}
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
