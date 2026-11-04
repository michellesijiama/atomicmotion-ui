"use client";

import * as React from "react";

import { type ClassValue, clsx } from "clsx";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type AnimationPlaybackControls,
  type ValueAnimationTransition,
  type MotionValue,
} from "framer-motion";
import { Battery, Heart, RotateCcw, Smile, Star } from "lucide-react";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One sticker stuck on the notebook page, with its position as a fraction of the page. */
export type StickerPeelPlacement = {
  id: string;
  label: string;
  /** Horizontal centre, 0 (left edge of the page) to 1 (right edge). */
  x: number;
  /** Vertical centre, 0 (top edge of the page) to 1 (bottom edge). */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
};

export type StickerPeelProps = {
  /** Plays a hands-free demo for the gallery card: stickers peel off the phone one by one,
   *  get slapped onto the notebook, hold, then peel back and repeat. Pointer input is
   *  switched off while it plays. */
  loop?: boolean;
  /** Called after the set of stuck stickers or their positions change. */
  onChange?: (stickers: StickerPeelPlacement[]) => void;
  className?: string;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Side of a sticker's square box, in scene units. */
const S = 84;
/** Scale of a sticker sitting in the phone's grid, in the hand, and stuck on the page. */
const PHONE_S = 0.9;
const CARRY_S = 1.3;
const PLACED_S = 1.15;

type LayoutName = "row" | "col";
type Rect = { x: number; y: number; w: number; h: number };

type Geometry = {
  W: number;
  H: number;
  notebook: Rect;
  paper: Rect;
  phone: Rect;
  screen: Rect;
  /** Where the grid panel sits on the phone screen, relative to the screen. */
  panel: { top: number; height: number };
  slots: { x: number; y: number }[];
};

function geometry(layout: LayoutName): Geometry {
  if (layout === "row") {
    const notebook = { x: 0, y: 10, w: 500, h: 500 };
    const phone = { x: 540, y: 10, w: 250, h: 500 };
    const screen = { x: phone.x + 10, y: phone.y + 10, w: 230, h: 480 };
    const slots = Array.from({ length: 8 }, (_, i) => ({
      x: screen.x + (i % 2 === 0 ? 63 : 167),
      y: screen.y + 130 + 84 * Math.floor(i / 2),
    }));
    return { W: 790, H: 520, notebook, paper: paperOf(notebook), phone, screen, panel: { top: 88, height: 340 }, slots };
  }
  const notebook = { x: 0, y: 0, w: 520, h: 370 };
  const phone = { x: 110, y: 390, w: 300, h: 410 };
  const screen = { x: phone.x + 10, y: phone.y + 10, w: 280, h: 390 };
  const slots = Array.from({ length: 8 }, (_, i) => ({
    x: screen.x + 55 + 85 * (i % 3),
    y: screen.y + 125 + 82 * Math.floor(i / 3),
  }));
  return { W: 520, H: 800, notebook, paper: paperOf(notebook), phone, screen, panel: { top: 84, height: 252 }, slots };
}

function paperOf(nb: Rect): Rect {
  return { x: nb.x + 42, y: nb.y + 18, w: nb.w - 60, h: nb.h - 36 };
}

/** Pleasant places to stick things, as fractions of the page, with a rotation. */
const SPOTS: { u: number; v: number; rot: number }[] = [
  { u: 0.24, v: 0.24, rot: -9 },
  { u: 0.55, v: 0.2, rot: 7 },
  { u: 0.82, v: 0.3, rot: -5 },
  { u: 0.38, v: 0.52, rot: 5 },
  { u: 0.7, v: 0.58, rot: -11 },
  { u: 0.2, v: 0.8, rot: 8 },
  { u: 0.5, v: 0.82, rot: -4 },
  { u: 0.84, v: 0.84, rot: 10 },
];

/** The autoplay order: [sticker index, spot index]. */
const DEMO: [number, number][] = [
  [2, 3],
  [0, 0],
  [1, 1],
  [4, 5],
  [3, 2],
  [5, 6],
  [6, 4],
  [7, 7],
];

const POS_SPRING = { stiffness: 700, damping: 42, mass: 0.7 };
const EASE_OUT = [0.2, 0.8, 0.25, 1] as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* -------------------------------------------------------------------------- */
/* Sticker artwork (original, 100 x 100 viewBox)                              */
/* -------------------------------------------------------------------------- */

/** Draws shapes with a coloured outline that does not show inside overlaps. */
function outlined(shapes: React.ReactNode, fill: string, stroke: string, width: number) {
  return (
    <>
      <g fill={stroke} stroke={stroke} strokeWidth={width * 2} strokeLinejoin="round">
        {shapes}
      </g>
      <g fill={fill}>{shapes}</g>
    </>
  );
}

function starPoints(cx: number, cy: number, ro: number, ri: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? ri : ro;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

type StickerDef = {
  id: string;
  label: string;
  /** The largest x + y the artwork (and its white border) reaches. The paper curl starts here. */
  maxSum: number;
  art: React.ReactNode;
};

const STICKERS: StickerDef[] = [
  {
    id: "star",
    label: "Star",
    maxSum: 172,
    art: (
      <g>
        <polygon points={starPoints(50, 53, 41, 18)} fill="#FFC531" stroke="#F59E0B" strokeWidth={3} strokeLinejoin="round" />
        <polygon points={starPoints(47, 50, 22, 10)} fill="#FFE27A" opacity={0.75} />
        <circle cx={43} cy={53} r={2.4} fill="#6b3b0a" />
        <circle cx={57} cy={53} r={2.4} fill="#6b3b0a" />
        <path d="M44 60 Q50 66 56 60" fill="none" stroke="#6b3b0a" strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={38} cy={59} r={3} fill="#FF8FA3" opacity={0.7} />
        <circle cx={62} cy={59} r={3} fill="#FF8FA3" opacity={0.7} />
      </g>
    ),
  },
  {
    id: "heart",
    label: "Heart",
    maxSum: 152,
    art: (
      <g>
        <path
          d="M50 86 C20 64 9 46 9 32 C9 19 19 12 30 12 C39 12 46 17 50 25 C54 17 61 12 70 12 C81 12 91 19 91 32 C91 46 80 64 50 86 Z"
          fill="#FF5C8A"
          stroke="#E83E73"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d="M22 32 Q23 23 32 21" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.75} />
        <circle cx={37} cy={46} r={2.4} fill="#7a1738" />
        <circle cx={63} cy={46} r={2.4} fill="#7a1738" />
        <path d="M45 54 Q50 59 55 54" fill="none" stroke="#7a1738" strokeWidth={2.4} strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: "smiley",
    label: "Smiley face",
    maxSum: 166,
    art: (
      <g>
        <circle cx={50} cy={50} r={38} fill="#FFD84D" stroke="#F2A91C" strokeWidth={3} />
        <path d="M24 34 Q34 18 52 15" fill="none" stroke="#FFF1A8" strokeWidth={5} strokeLinecap="round" />
        <ellipse cx={37} cy={44} rx={4.2} ry={6.5} fill="#5b3a1a" />
        <ellipse cx={63} cy={44} rx={4.2} ry={6.5} fill="#5b3a1a" />
        <path d="M30 59 Q50 80 70 59" fill="none" stroke="#5b3a1a" strokeWidth={4} strokeLinecap="round" />
        <circle cx={28} cy={58} r={5} fill="#FF8FA3" opacity={0.65} />
        <circle cx={72} cy={58} r={5} fill="#FF8FA3" opacity={0.65} />
      </g>
    ),
  },
  {
    id: "bolt",
    label: "Lightning bolt",
    maxSum: 142,
    art: (
      <g>
        <polygon points="60,6 20,56 44,56 34,94 80,38 55,38" fill="#8B6CFF" stroke="#5B3FD6" strokeWidth={3} strokeLinejoin="round" />
        <polygon points="57,18 33,50 49,50" fill="#B7A6FF" opacity={0.85} />
      </g>
    ),
  },
  {
    id: "flower",
    label: "Flower",
    maxSum: 166,
    art: (() => {
      const petals = Array.from({ length: 6 }, (_, k) => {
        const a = (k * Math.PI) / 3 - Math.PI / 2;
        return <circle key={k} cx={50 + 24 * Math.cos(a)} cy={50 + 24 * Math.sin(a)} r={15} />;
      });
      return (
        <g>
          {outlined(petals, "#FF86B6", "#E2578F", 2.5)}
          <circle cx={50} cy={50} r={13} fill="#FFD23F" stroke="#F2A91C" strokeWidth={2.5} />
          <circle cx={46} cy={46} r={4} fill="#FFF0A0" opacity={0.9} />
        </g>
      );
    })(),
  },
  {
    id: "rainbow",
    label: "Rainbow",
    maxSum: 188,
    art: (() => {
      const bands = [
        [40, "#FF5A5F"],
        [33, "#FFA43A"],
        [26, "#FFD93D"],
        [19, "#43C98B"],
        [12, "#5AA9FF"],
      ] as const;
      const cloud = (cx: number) => (
        <>
          <circle cx={cx - 7} cy={76} r={8} />
          <circle cx={cx + 1} cy={72} r={10} />
          <circle cx={cx + 8} cy={77} r={7} />
        </>
      );
      return (
        <g>
          {bands.map(([r, c]) => (
            <path key={c} d={`M${50 - r} 72 A${r} ${r} 0 0 1 ${50 + r} 72`} fill="none" stroke={c} strokeWidth={7.6} />
          ))}
          {outlined(<>{cloud(14)}{cloud(86)}</>, "#fff", "#A9CBEE", 2.4)}
        </g>
      );
    })(),
  },
  {
    id: "cloud",
    label: "Cloud",
    maxSum: 172,
    art: (() => {
      const shapes = (
        <>
          <circle cx={31} cy={58} r={17} />
          <circle cx={50} cy={44} r={22} />
          <circle cx={70} cy={58} r={17} />
          <rect x={16} y={56} width={70} height={22} rx={11} />
        </>
      );
      return (
        <g>
          {outlined(shapes, "#CDEBFF", "#86BDEB", 2.6)}
          <path d="M34 36 Q40 28 48 27" fill="none" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
          <circle cx={42} cy={62} r={2.4} fill="#35618a" />
          <circle cx={60} cy={62} r={2.4} fill="#35618a" />
          <path d="M47 67 Q51 71 55 67" fill="none" stroke="#35618a" strokeWidth={2.2} strokeLinecap="round" />
        </g>
      );
    })(),
  },
  {
    id: "badge",
    label: "OK badge",
    maxSum: 164,
    art: (
      <g>
        <rect x={10} y={28} width={80} height={44} rx={16} fill="#2FD3A3" stroke="#14A57E" strokeWidth={3} />
        <path d="M22 38 H52" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.45} />
        <text
          x={50}
          y={61}
          textAnchor="middle"
          fontSize={30}
          fontWeight={900}
          fill="#fff"
          stroke="#0f8c6a"
          strokeWidth={1.2}
          paintOrder="stroke"
          style={{ fontFamily: 'ui-rounded, "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif', letterSpacing: 1 }}
        >
          OK!
        </text>
        <circle cx={80} cy={34} r={3} fill="#FFE27A" />
      </g>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/* Shared SVG filters                                                         */
/* -------------------------------------------------------------------------- */

const FILTER_BOX = { x: -15, y: -15, width: 130, height: 130, filterUnits: "userSpaceOnUse" } as const;

/** Blur then threshold the artwork's alpha: a rounded silhouette a few units wider. */
const GROW = (
  <>
    <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="blur" />
    <feComponentTransfer in="blur" result="grown">
      <feFuncA type="linear" slope="16" intercept="-1.6" />
    </feComponentTransfer>
  </>
);

function SharedFilters({ uid }: { uid: string }) {
  const tint = (id: string, color: string, opacity: number, blur: number) => (
    <filter id={`${uid}-${id}`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
      {GROW}
      <feFlood floodColor={color} floodOpacity={opacity} result="flood" />
      <feComposite in="flood" in2="grown" operator="in" result="fill" />
      {blur > 0 ? <feGaussianBlur in="fill" stdDeviation={blur} /> : null}
    </filter>
  );
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        {/* The die-cut look: a thick white border behind the artwork. */}
        <filter id={`${uid}-die`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#ffffff" result="white" />
          <feComposite in="white" in2="grown" operator="in" result="border" />
          <feMerge>
            <feMergeNode in="border" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {tint("silh", "#ffffff", 1, 0)}
        {tint("back", "#f6f2fc", 1, 0)}
        {tint("tight", "#231946", 0.9, 1.3)}
        {tint("soft", "#231946", 0.9, 5)}
        <filter id={`${uid}-ghost`} {...FILTER_BOX} colorInterpolationFilters="sRGB">
          {GROW}
          <feFlood floodColor="#6f7aa8" floodOpacity="0.13" result="tintFill" />
          <feComposite in="tintFill" in2="grown" operator="in" result="fill" />
          <feMorphology in="grown" operator="erode" radius="1.1" result="inner" />
          <feComposite in="grown" in2="inner" operator="out" result="edge" />
          <feFlood floodColor="#6f7aa8" floodOpacity="0.5" result="tintEdge" />
          <feComposite in="tintEdge" in2="edge" operator="in" result="line" />
          <feMerge>
            <feMergeNode in="fill" />
            <feMergeNode in="line" />
          </feMerge>
        </filter>
        <filter id={`${uid}-fold`} x="-60" y="-60" width="220" height="220" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${uid}-flap`} {...FILTER_BOX}>
          <feDropShadow dx="-1" dy="-1.6" stdDeviation="2" floodColor="#1c1238" floodOpacity="0.38" />
        </filter>
      </defs>
    </svg>
  );
}

function Ghost({ def, uid, visible }: { def: StickerDef; uid: string; visible: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={S * PHONE_S}
      height={S * PHONE_S}
      aria-hidden="true"
      className="pointer-events-none absolute overflow-visible transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0, left: 0, top: 0 }}
    >
      <g filter={`url(#${uid}-ghost)`}>{def.art}</g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* One sticker                                                                */
/* -------------------------------------------------------------------------- */

type Home = { x: number; y: number; rot: number; s: number; placed: boolean };
type FlyOpts = { /** Curl the corner and wait for it before lifting. */ peel?: boolean; /** Arc flight in ms. 0 means a spring. */ flight?: number; delay?: number };
type ItemApi = { flyTo: (target: Home, kind: "slap" | "home", opts?: FlyOpts) => Promise<void> };

const homeKey = (h: Home) => `${h.placed ? 1 : 0}|${Math.round(h.x)}|${Math.round(h.y)}|${Math.round(h.rot)}`;

type StickerItemProps = {
  def: StickerDef;
  uid: string;
  home: Home;
  z: number;
  interactive: boolean;
  reduce: boolean;
  label: string;
  bounds: { W: number; H: number };
  apiRef: React.Ref<ItemApi>;
  toLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onDrop: (moved: boolean, x: number, y: number) => void;
  onHeld: (held: boolean) => void;
  onRaise: () => void;
  onKey: (e: React.KeyboardEvent) => void;
  onDouble: () => void;
};

function StickerItem(props: StickerItemProps) {
  const { def, uid, home, z, interactive, reduce, label, bounds, apiRef, toLogical, onDrop, onHeld, onRaise, onKey, onDouble } = props;
  const sid = `${uid}-${def.id}`;

  const rx = useMotionValue(home.x);
  const ry = useMotionValue(home.y);
  const sx = useSpring(rx, POS_SPRING);
  const sy = useSpring(ry, POS_SPRING);
  const rotBase = useMotionValue(home.rot);
  const sc = useMotionValue(home.s);
  const qx = useMotionValue(1);
  const qy = useMotionValue(1);
  const lift = useMotionValue(0);
  const curl = useMotionValue(0);
  const ringO = useMotionValue(0);
  const ringS = useMotionValue(1);
  const fade = useMotionValue(1);
  const shX = useMotionValue(0);
  const shY = useMotionValue(0);
  const shO = useMotionValue(0);

  const velocity = useVelocity(sx);
  const tiltTarget = useTransform(velocity, (v) => clamp(v * 0.02, -16, 16));
  const tilt = useSpring(tiltTarget, { stiffness: 260, damping: 16 });
  const x = useTransform(sx, (v) => v - S / 2);
  const y = useTransform(sy, (v) => v - S / 2);
  const rotate = useTransform([rotBase, tilt], (v: number[]) => v[0] + v[1]);
  const scaleX = useTransform([sc, qx], (v: number[]) => v[0] * v[1]);
  const scaleY = useTransform([sc, qy], (v: number[]) => v[0] * v[1]);
  const negRotate = useTransform(rotate, (r) => -r);
  const tightO = useTransform(lift, (l) => 0.45 - 0.32 * l);
  const castY = useTransform(lift, (l) => l * 20);
  const castS = useTransform(lift, (l) => 1 + l * 0.1);
  const castO = useTransform(lift, (l) => l * 0.42);

  const [lifted, setLifted] = React.useState(false);

  const anims = React.useRef<AnimationPlaybackControls[]>([]);
  const timers = React.useRef<Set<number>>(new Set());
  const token = React.useRef(0);
  const busy = React.useRef(false);
  const handled = React.useRef(homeKey(home));
  const drag = React.useRef<null | {
    id: number;
    phase: "curl" | "drag";
    off: { x: number; y: number };
    start: { x: number; y: number };
    last: { x: number; y: number };
    moved: number;
    timer: number;
  }>(null);

  const stopAnims = () => {
    for (const a of anims.current) a.stop();
    anims.current = [];
  };
  const play = (mv: MotionValue<number>, to: number | number[], opts: ValueAnimationTransition<number>) => {
    const c = animate(mv, to as number, opts);
    anims.current.push(c);
    return c;
  };
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        timers.current.delete(id);
        resolve();
      }, ms);
      timers.current.add(id);
    });

  React.useEffect(() => {
    const t = timers.current;
    return () => {
      token.current += 1;
      for (const a of anims.current) a.stop();
      for (const id of t) window.clearTimeout(id);
      t.clear();
    };
  }, []);

  /* ---- the paper curl, drawn straight into the SVG ---- */
  const mainClip = React.useRef<SVGPathElement>(null);
  const flapClip = React.useRef<SVGPathElement>(null);
  const flapWrap = React.useRef<SVGGElement>(null);
  const flapG = React.useRef<SVGGElement>(null);
  const foldLine = React.useRef<SVGPathElement>(null);
  const sheen = React.useRef<SVGRectElement>(null);

  const applyCurl = (v: number) => {
    const wrap = flapWrap.current;
    if (!wrap || !mainClip.current || !flapClip.current || !flapG.current || !foldLine.current) return;
    if (v < 0.012) {
      wrap.setAttribute("display", "none");
      foldLine.current.setAttribute("display", "none");
      mainClip.current.setAttribute("d", "M-80 -80 H200 V200 H-80 Z");
      return;
    }
    const D = def.maxSum + 8 - v * 50;
    wrap.setAttribute("display", "inline");
    foldLine.current.setAttribute("display", "inline");
    mainClip.current.setAttribute("d", `M-80 -80 L${D + 80} -80 L-80 ${D + 80} Z`);
    flapClip.current.setAttribute("d", `M${D + 80} -80 L-80 ${D + 80} L340 340 Z`);
    flapG.current.setAttribute("transform", `matrix(0 -1 -1 0 ${D} ${D})`);
    foldLine.current.setAttribute("d", `M${D + 57} -60 L-60 ${D + 57}`);
  };
  useMotionValueEvent(curl, "change", applyCurl);
  React.useLayoutEffect(() => {
    applyCurl(curl.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySheen = () => {
    sheen.current?.setAttribute("transform", `translate(${shX.get().toFixed(1)} ${shY.get().toFixed(1)})`);
  };
  useMotionValueEvent(shX, "change", applySheen);
  useMotionValueEvent(shY, "change", applySheen);

  /* ---- motion recipes ---- */
  const slap = (t: Home) => {
    play(lift, 0, { type: "spring", stiffness: 900, damping: 40 });
    play(curl, 0, { duration: 0.09, ease: "easeIn" });
    play(sc, t.s, { type: "spring", stiffness: 520, damping: 11 });
    qx.set(1.12);
    qy.set(0.84);
    play(qx, 1, { type: "spring", stiffness: 420, damping: 9 });
    play(qy, 1, { type: "spring", stiffness: 420, damping: 9 });
    play(rotBase, t.rot, { type: "spring", stiffness: 260, damping: 14 });
    play(shO, 0, { duration: 0.3 });
    ringO.set(0.6);
    ringS.set(0.7);
    play(ringS, 1.6, { duration: 0.45, ease: "easeOut" });
    play(ringO, 0, { duration: 0.45, ease: "easeOut" });
  };
  const settleHome = (t: Home) => {
    play(lift, 0, { type: "spring", stiffness: 300, damping: 28 });
    play(curl, 0, { duration: 0.22, ease: "easeOut" });
    play(sc, t.s, { type: "spring", stiffness: 380, damping: 16 });
    play(rotBase, t.rot, { type: "spring", stiffness: 260, damping: 18 });
    play(shO, 0, { duration: 0.3 });
    qx.set(1.04);
    qy.set(0.96);
    play(qx, 1, { type: "spring", stiffness: 380, damping: 12 });
    play(qy, 1, { type: "spring", stiffness: 380, damping: 12 });
  };
  const jumpTo = (t: Home) => {
    rx.jump(t.x);
    sx.jump(t.x);
    ry.jump(t.y);
    sy.jump(t.y);
    rotBase.jump(t.rot);
    sc.jump(t.s);
    lift.jump(0);
    curl.jump(0);
    qx.jump(1);
    qy.jump(1);
  };

  const flyTo = async (t: Home, kind: "slap" | "home", o: FlyOpts = {}) => {
    const tok = ++token.current;
    const live = () => tok === token.current;
    stopAnims();
    handled.current = homeKey(t);
    busy.current = true;
    setLifted(true);
    if (o.delay) {
      await wait(o.delay);
      if (!live()) return;
    }
    onHeld(true);
    const finish = () => {
      busy.current = false;
      setLifted(false);
      onHeld(false);
    };
    if (reduce) {
      play(fade, 0, { duration: 0.12 });
      await wait(130);
      if (!live()) return;
      jumpTo(t);
      play(fade, 1, { duration: 0.2 });
      await wait(220);
      if (live()) finish();
      return;
    }
    if (o.peel) {
      play(curl, 1, { duration: 0.24, ease: EASE_OUT });
      play(sc, home.s * 1.05, { duration: 0.24 });
      await wait(260);
      if (!live()) return;
    }
    play(lift, 1, { type: "spring", stiffness: 300, damping: 22 });
    play(sc, CARRY_S, { type: "spring", stiffness: 300, damping: 20 });
    play(curl, 0.3, { type: "spring", stiffness: 200, damping: 18 });
    const flight = o.flight ?? 0;
    if (flight > 0) {
      const x0 = rx.get();
      const y0 = ry.get();
      const peak = Math.min(y0, t.y) - 70 - Math.abs(t.x - x0) * 0.08;
      const dur = flight / 1000;
      play(rx, t.x, { duration: dur, ease: [0.45, 0.05, 0.25, 1] });
      play(ry, [y0, peak, t.y], { duration: dur, times: [0, 0.5, 1], ease: ["easeOut", "easeIn"] });
      play(rotBase, t.rot, { duration: dur, ease: "easeInOut" });
      await wait(flight + 50);
    } else {
      play(rx, t.x, { type: "spring", stiffness: 260, damping: 24 });
      play(ry, t.y, { type: "spring", stiffness: 260, damping: 24 });
      await wait(kind === "slap" ? 80 : 380);
    }
    if (!live()) return;
    if (kind === "slap") slap(t);
    else settleHome(t);
    await wait(430);
    if (live()) finish();
  };

  React.useImperativeHandle(apiRef, () => ({ flyTo }));

  // Home moved without a scripted flight (keyboard nudge, rotation): spring along.
  const key = homeKey(home);
  React.useEffect(() => {
    if (handled.current === key || drag.current) return;
    handled.current = key;
    token.current += 1;
    stopAnims();
    if (reduce) {
      jumpTo(home);
      return;
    }
    play(rx, home.x, { type: "spring", stiffness: 340, damping: 26 });
    play(ry, home.y, { type: "spring", stiffness: 340, damping: 26 });
    play(rotBase, home.rot, { type: "spring", stiffness: 300, damping: 20 });
    play(sc, home.s, { type: "spring", stiffness: 340, damping: 22 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /* ---- pointer ---- */
  const liftNow = () => {
    const d = drag.current;
    if (!d || d.phase === "drag") return;
    window.clearTimeout(d.timer);
    d.phase = "drag";
    onHeld(true);
    if (reduce) {
      lift.set(1);
      curl.set(0);
      sc.set(CARRY_S);
    } else {
      play(lift, 1, { type: "spring", stiffness: 280, damping: 20 });
      play(sc, CARRY_S, { type: "spring", stiffness: 300, damping: 16 });
      play(curl, 0.3, { type: "spring", stiffness: 180, damping: 14 });
    }
    play(shO, 0.8, { duration: 0.2 });
    rx.set(d.last.x - d.off.x);
    ry.set(d.last.y - d.off.y);
  };

  const release = () => {
    const d = drag.current;
    if (!d) return;
    window.clearTimeout(d.timer);
    drag.current = null;
    if (d.phase === "curl") {
      // A tap: the corner lifts a little and settles back.
      busy.current = false;
      setLifted(false);
      play(curl, 0, { duration: 0.22, ease: "easeOut" });
      play(sc, home.s, { type: "spring", stiffness: 400, damping: 22 });
      return;
    }
    onDrop(d.moved > 5, rx.get(), ry.get());
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    token.current += 1;
    stopAnims();
    const p = toLogical(e.clientX, e.clientY);
    busy.current = true;
    setLifted(true);
    onRaise();
    drag.current = {
      id: e.pointerId,
      phase: "curl",
      off: { x: p.x - rx.get(), y: p.y - ry.get() },
      start: p,
      last: p,
      moved: 0,
      timer: 0,
    };
    if (reduce) {
      liftNow();
      return;
    }
    play(curl, home.placed ? 0.6 : 1, { duration: 0.2, ease: EASE_OUT });
    play(sc, home.s * 1.06, { duration: 0.2 });
    drag.current.timer = window.setTimeout(liftNow, 150);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    const p = toLogical(e.clientX, e.clientY);
    shX.set((((p.x - (rx.get() - S / 2)) / S) * 100 - 50) * 1.3);
    shY.set((((p.y - (ry.get() - S / 2)) / S) * 100 - 50) * 1.3);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.last = p;
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.start.x, p.y - d.start.y));
    if (d.phase === "curl" && d.moved > 7) liftNow();
    if (d.phase === "drag") {
      rx.set(clamp(p.x - d.off.x, -10, bounds.W + 10));
      ry.set(clamp(p.y - d.off.y, -10, bounds.H + 10));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    release();
  };

  const onPointerCancel = () => {
    const d = drag.current;
    if (!d) return;
    if (d.phase === "drag") {
      window.clearTimeout(d.timer);
      drag.current = null;
      onDrop(true, -999, -999);
    } else release();
  };

  const onEnter = (e: React.PointerEvent) => {
    if (!interactive || busy.current || drag.current || e.pointerType === "touch") return;
    stopAnims();
    play(lift, 0.3, { type: "spring", stiffness: 300, damping: 22 });
    play(sc, home.s * 1.05, { type: "spring", stiffness: 300, damping: 20 });
    play(shO, 1, { duration: 0.2 });
  };
  const onLeave = () => {
    if (busy.current || drag.current) return;
    stopAnims();
    play(lift, 0, { type: "spring", stiffness: 300, damping: 26 });
    play(sc, home.s, { type: "spring", stiffness: 300, damping: 22 });
    play(shO, 0, { duration: 0.2 });
  };

  const art = def.art;
  return (
    <motion.button
      type="button"
      aria-label={label}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onKeyDown={onKey}
      onDoubleClick={interactive ? onDouble : undefined}
      onDragStart={(e) => e.preventDefault()}
      className="absolute left-0 top-0 cursor-grab rounded-[26px] outline-none focus-visible:ring-4 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:cursor-grabbing"
      style={{
        width: S,
        height: S,
        x,
        y,
        rotate,
        scaleX,
        scaleY,
        opacity: fade,
        zIndex: lifted ? 5000 : z,
        touchAction: "none",
        pointerEvents: interactive ? "auto" : "none",
        willChange: "transform",
      }}
    >
      {/* Shadows stay in world axes: counter-rotate, offset, rotate back. */}
      <motion.span className="pointer-events-none absolute inset-0" style={{ rotate: negRotate, y: castY, scale: castS, opacity: castO }}>
        <motion.span className="absolute inset-0 block" style={{ rotate }}>
          <svg viewBox="0 0 100 100" width={S} height={S} className="overflow-visible" aria-hidden="true">
            <g filter={`url(#${uid}-soft)`}>{art}</g>
          </svg>
        </motion.span>
      </motion.span>
      <motion.span className="pointer-events-none absolute inset-0" style={{ opacity: tightO }}>
        <svg viewBox="0 0 100 100" width={S} height={S} className="overflow-visible" aria-hidden="true">
          <g filter={`url(#${uid}-tight)`} transform="translate(0 1.2)">
            {art}
          </g>
        </svg>
      </motion.span>
      <motion.span
        className="pointer-events-none absolute inset-[-6px] rounded-full border-2 border-white"
        style={{ opacity: ringO, scale: ringS }}
      />
      <svg viewBox="0 0 100 100" width={S} height={S} className="pointer-events-none relative overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={`${sid}-cm`}>
            <path ref={mainClip} d="M-80 -80 H200 V200 H-80 Z" />
          </clipPath>
          <clipPath id={`${sid}-cf`}>
            <path ref={flapClip} d="M0 0" />
          </clipPath>
          <mask id={`${sid}-mk`} maskUnits="userSpaceOnUse" x={-15} y={-15} width={130} height={130}>
            <g filter={`url(#${uid}-silh)`}>{art}</g>
          </mask>
          <linearGradient id={`${sid}-holo`} gradientUnits="userSpaceOnUse" x1={-20} y1={-20} x2={120} y2={120}>
            <stop offset="0.28" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.4" stopColor="#7ff5e6" stopOpacity={0.5} />
            <stop offset="0.48" stopColor="#fff" stopOpacity={0.8} />
            <stop offset="0.56" stopColor="#ff8fe0" stopOpacity={0.5} />
            <stop offset="0.66" stopColor="#ffe97a" stopOpacity={0.4} />
            <stop offset="0.76" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${sid}-shade`} gradientUnits="userSpaceOnUse" x1={40} y1={40} x2={125} y2={125}>
            <stop offset="0" stopColor="#5a508c" stopOpacity={0.42} />
            <stop offset="0.3" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.7" stopColor="#fff" stopOpacity={0.1} />
            <stop offset="1" stopColor="#786eaa" stopOpacity={0.38} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${sid}-cm)`}>
          <g filter={`url(#${uid}-die)`}>{art}</g>
          <g mask={`url(#${sid}-mk)`}>
            <g mask={undefined}>
              <motion.rect
                ref={sheen}
                x={-30}
                y={-30}
                width={160}
                height={160}
                fill={`url(#${sid}-holo)`}
                style={{ opacity: shO, mixBlendMode: "soft-light" }}
              />
            </g>
            <path ref={foldLine} d="M0 0" stroke="#1c1238" strokeOpacity={0.4} strokeWidth={9} fill="none" filter={`url(#${uid}-fold)`} />
          </g>
        </g>
        <g ref={flapWrap} display="none" filter={`url(#${uid}-flap)`}>
          <g ref={flapG}>
            <g clipPath={`url(#${sid}-cf)`}>
              <g filter={`url(#${uid}-back)`}>{art}</g>
              <g mask={`url(#${sid}-mk)`}>
                <rect x={-30} y={-30} width={170} height={170} fill={`url(#${sid}-shade)`} />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* The scene                                                                  */
/* -------------------------------------------------------------------------- */

type ItemState = { placed: boolean; u: number; v: number; rot: number; z: number };

const INITIAL_ITEMS: ItemState[] = STICKERS.map(() => ({ placed: false, u: 0.5, v: 0.5, rot: 0, z: 0 }));

/**
 * A phone holds a pack of die-cut stickers, and a notebook waits beside it.
 * Press a sticker to curl its corner and peel it off the glass, carry it over
 * the notebook and let go to slap it down. Drop it anywhere else and it springs
 * back to its slot on the phone.
 *
 * Keyboard: Enter or Space on a phone sticker sticks it at the next free spot.
 * On the notebook, arrow keys nudge (Shift for bigger steps), `[` and `]`
 * rotate, and Delete or Backspace sends it back to the phone. Double-click does
 * the same.
 */
export function StickerPeel({ loop = false, onChange, className }: StickerPeelProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = `sp${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hostRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);

  const [view, setView] = React.useState<{ layout: LayoutName; scale: number; ready: boolean }>({
    layout: "row",
    scale: 1,
    ready: false,
  });
  const [items, setItems] = React.useState<ItemState[]>(INITIAL_ITEMS);
  const [held, setHeld] = React.useState<Set<number>>(() => new Set());
  const [status, setStatus] = React.useState("");

  const geo = React.useMemo(() => geometry(view.layout), [view.layout]);
  const [rng] = React.useState(() => Math.random);
  const zRef = React.useRef(0);
  const apis = React.useRef<(ItemApi | null)[]>([]);

  // Scale the whole scene to the space it has, and pick the layout that fits best.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => {
      const w = Math.max(1, host.clientWidth - 16);
      const h = Math.max(1, host.clientHeight - 16);
      const row = geometry("row");
      const col = geometry("col");
      const sRow = Math.min(w / row.W, h / row.H);
      const sCol = Math.min(w / col.W, h / col.H);
      const useCol = loop || sCol > sRow * 1.02;
      const cap = loop ? 0.84 : 1.2;
      const scale = clamp(useCol ? sCol : sRow, 0.2, cap);
      setView((v) => (v.layout === (useCol ? "col" : "row") && Math.abs(v.scale - scale) < 0.002 && v.ready ? v : { layout: useCol ? "col" : "row", scale, ready: true }));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, [loop]);

  const toLogical = (cx: number, cy: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { x: cx, y: cy };
    const k = rect.width / geo.W;
    return { x: (cx - rect.left) / k, y: (cy - rect.top) / k };
  };

  const { paper, notebook, slots } = geo;
  const marginU = (S * PLACED_S * 0.42) / paper.w;
  const marginV = (S * PLACED_S * 0.42) / paper.h;
  const toUV = (x: number, y: number) => ({
    u: clamp((x - paper.x) / paper.w, marginU, 1 - marginU),
    v: clamp((y - paper.y) / paper.h, marginV, 1 - marginV),
  });
  const overNotebook = (x: number, y: number) =>
    x > notebook.x - 6 && x < notebook.x + notebook.w + 6 && y > notebook.y - 6 && y < notebook.y + notebook.h + 6;

  const homeOf = (it: ItemState, i: number): Home =>
    it.placed
      ? { x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h, rot: it.rot, s: PLACED_S, placed: true }
      : { x: slots[i].x, y: slots[i].y, rot: 0, s: PHONE_S, placed: false };

  const place = (i: number, u: number, v: number, rot: number, opts?: FlyOpts) => {
    zRef.current += 1;
    const z = 10 + zRef.current;
    setItems((prev) => prev.map((it, k) => (k === i ? { placed: true, u, v, rot, z } : it)));
    const target: Home = { x: paper.x + u * paper.w, y: paper.y + v * paper.h, rot, s: PLACED_S, placed: true };
    void apis.current[i]?.flyTo(target, "slap", opts);
  };
  const sendBack = (i: number, opts?: FlyOpts) => {
    setItems((prev) => prev.map((it, k) => (k === i ? { ...it, placed: false } : it)));
    void apis.current[i]?.flyTo(homeOf({ ...items[i], placed: false }, i), "home", opts);
  };
  const nextSpot = () => {
    const taken = items.filter((it) => it.placed).map((it) => ({ x: paper.x + it.u * paper.w, y: paper.y + it.v * paper.h }));
    for (const s of SPOTS) {
      const px = paper.x + s.u * paper.w;
      const py = paper.y + s.v * paper.h;
      if (taken.every((t) => Math.hypot(t.x - px, t.y - py) > 62)) return s;
    }
    const n = taken.length;
    const base = SPOTS[n % SPOTS.length];
    return { u: clamp(base.u + 0.04 * Math.floor(n / SPOTS.length), 0.1, 0.9), v: clamp(base.v + 0.04 * Math.floor(n / SPOTS.length), 0.1, 0.9), rot: -base.rot };
  };

  const reset = () => {
    let n = 0;
    items.forEach((it, i) => {
      if (!it.placed) return;
      void apis.current[i]?.flyTo(homeOf({ ...it, placed: false }, i), "home", { peel: true, flight: 520, delay: n * 70 });
      n += 1;
    });
    setItems((prev) => prev.map((it) => ({ ...it, placed: false })));
    setStatus("All stickers are back on the phone");
  };

  const onDrop = (i: number, moved: boolean, x: number, y: number) => {
    const it = items[i];
    if (overNotebook(x, y)) {
      if (it.placed && !moved) {
        place(i, it.u, it.v, it.rot);
        return;
      }
      const { u, v } = toUV(x, y);
      place(i, u, v, (rng() * 2 - 1) * 12);
      setStatus(`${STICKERS[i].label} stuck on the notebook`);
    } else {
      sendBack(i);
      setStatus(`${STICKERS[i].label} is back on the phone`);
    }
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    const it = items[i];
    const k = e.key;
    if (!it.placed) {
      if (k === "Enter" || k === " ") {
        e.preventDefault();
        const s = nextSpot();
        place(i, s.u, s.v, s.rot, { peel: true, flight: 560 });
        setStatus(`${STICKERS[i].label} stuck on the notebook`);
      }
      return;
    }
    if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      sendBack(i, { peel: true, flight: 520 });
      setStatus(`${STICKERS[i].label} is back on the phone`);
      return;
    }
    const step = e.shiftKey ? 36 : 8;
    let du = 0;
    let dv = 0;
    if (k === "ArrowLeft") du = -step / paper.w;
    else if (k === "ArrowRight") du = step / paper.w;
    else if (k === "ArrowUp") dv = -step / paper.h;
    else if (k === "ArrowDown") dv = step / paper.h;
    if (du || dv) {
      e.preventDefault();
      setItems((prev) =>
        prev.map((p, n) => (n === i ? { ...p, u: clamp(p.u + du, marginU, 1 - marginU), v: clamp(p.v + dv, marginV, 1 - marginV) } : p)),
      );
      return;
    }
    if (k === "[" || k === "]") {
      e.preventDefault();
      const d = (k === "]" ? 1 : -1) * (e.shiftKey ? 15 : 6);
      setItems((prev) => prev.map((p, n) => (n === i ? { ...p, rot: p.rot + d } : p)));
    }
  };

  // Tell the host what is stuck where.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });
  const firstChange = React.useRef(true);
  React.useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    onChangeRef.current?.(
      items.flatMap((it, i) => (it.placed ? [{ id: STICKERS[i].id, label: STICKERS[i].label, x: it.u, y: it.v, rotation: it.rot }] : [])),
    );
  }, [items]);

  // The hands-free demo.
  const demo = React.useRef({ place, sendBack });
  React.useEffect(() => {
    demo.current = { place, sendBack };
  });
  React.useEffect(() => {
    if (!loop || !view.ready) return;
    let dead = false;
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) => {
      timers.push(
        window.setTimeout(() => {
          if (!dead) fn();
        }, ms),
      );
    };
    const cycle = () => {
      let t = 700;
      for (const [idx, spot] of DEMO) {
        const s = SPOTS[spot];
        at(() => demo.current.place(idx, s.u, s.v, s.rot, { peel: true, flight: 620 }), t);
        t += 1250;
      }
      t += 2600;
      for (const [idx] of [...DEMO].reverse()) {
        at(() => demo.current.sendBack(idx, { peel: true, flight: 520 }), t);
        t += 380;
      }
      t += 1800;
      at(cycle, t);
    };
    cycle();
    return () => {
      dead = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [loop, view.ready, view.layout]);

  const anyPlaced = items.some((it) => it.placed);
  const onPhone = items.filter((it) => !it.placed).length;
  const interactive = !loop;
  const { phone, panel } = geo;
  const rings = Math.floor((notebook.h - 40) / 34);

  return (
    <div
      ref={hostRef}
      className={cn("relative flex h-full min-h-[520px] w-full select-none items-center justify-center overflow-hidden", className)}
    >
      <SharedFilters uid={uid} />
      <div
        ref={stageRef}
        className="relative shrink-0"
        style={{
          width: geo.W,
          height: geo.H,
          transform: `scale(${view.scale})`,
          transformOrigin: "50% 50%",
          visibility: view.ready ? "visible" : "hidden",
        }}
      >
        <span className="sr-only" aria-live="polite">
          {status}
        </span>

        {/* Notebook */}
        <div
          className="absolute rounded-[24px]"
          style={{
            left: notebook.x,
            top: notebook.y,
            width: notebook.w,
            height: notebook.h,
            background: "linear-gradient(150deg,#86bfae 0%,#68a592 60%,#5a9683 100%)",
            boxShadow: "0 24px 40px -18px rgba(30,60,50,.45), 0 4px 10px rgba(30,60,50,.18), inset 0 1px 0 rgba(255,255,255,.45)",
          }}
        >
          <div
            className="absolute rounded-[12px]"
            style={{
              left: paper.x - notebook.x,
              top: paper.y - notebook.y,
              width: paper.w,
              height: paper.h,
              backgroundColor: "#fffdf7",
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(100,115,150,.32) 1px, transparent 1.4px), linear-gradient(90deg, rgba(0,0,0,.07), transparent 14px)",
              backgroundSize: "22px 22px, 100% 100%",
              boxShadow: "inset 0 0 0 1px rgba(60,70,100,.08), 0 1px 0 rgba(255,255,255,.5)",
            }}
          >
            {!anyPlaced ? (
              <p
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[22px] italic text-slate-400/80"
                style={{ fontFamily: '"Bradley Hand","Segoe Print","Comic Sans MS",cursive' }}
              >
                stick things here
              </p>
            ) : null}
            <div
              className="pointer-events-none absolute -top-[10px] right-8 h-[26px] w-[96px] rotate-[4deg] rounded-[3px]"
              style={{
                background: "repeating-linear-gradient(45deg, rgba(255,170,190,.78) 0 8px, rgba(255,205,215,.78) 8px 16px)",
                boxShadow: "0 1px 2px rgba(0,0,0,.18)",
              }}
            />
          </div>
          {/* Spiral binding */}
          {Array.from({ length: rings }, (_, r) => (
            <div key={r} className="pointer-events-none absolute" style={{ left: 8, top: 26 + r * 34, width: 60, height: 14 }}>
              <div className="absolute rounded-full" style={{ left: 28, top: 2, width: 12, height: 10, background: "#3d4a52", boxShadow: "inset 0 1px 2px rgba(0,0,0,.6)" }} />
              <div
                className="absolute rounded-full"
                style={{
                  left: 2,
                  top: 2,
                  width: 54,
                  height: 10,
                  background: "linear-gradient(180deg,#f4f5f8 0%,#aeb2c0 48%,#7d8294 100%)",
                  boxShadow: "0 2px 3px rgba(0,0,0,.3)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Phone */}
        <div
          className="absolute rounded-[46px]"
          style={{
            left: phone.x,
            top: phone.y,
            width: phone.w,
            height: phone.h,
            background: "linear-gradient(145deg,#4a4d5c 0%,#23252e 40%,#16171d 100%)",
            boxShadow:
              "0 28px 44px -16px rgba(20,18,50,.55), 0 6px 14px rgba(20,18,50,.25), inset 0 0 0 1.5px rgba(255,255,255,.18), inset 0 0 0 4px rgba(0,0,0,.5)",
          }}
        >
          <span className="absolute -left-[3px] top-[96px] h-[30px] w-[4px] rounded-l-[3px] bg-[#2b2d37]" />
          <span className="absolute -left-[3px] top-[138px] h-[52px] w-[4px] rounded-l-[3px] bg-[#2b2d37]" />
          <span className="absolute -right-[3px] top-[130px] h-[70px] w-[4px] rounded-r-[3px] bg-[#2b2d37]" />
          <div
            className="absolute inset-[10px] overflow-hidden rounded-[36px]"
            style={{ background: "linear-gradient(180deg,#f8f6ff 0%,#ebe7fb 100%)" }}
          >
            <span className="absolute left-[24px] top-[12px] text-[11px] font-semibold text-slate-800">9:41</span>
            <span className="absolute left-1/2 top-[9px] h-[22px] w-[74px] -translate-x-1/2 rounded-full bg-black" />
            <Battery className="absolute right-[22px] top-[11px] size-[15px] text-slate-800" strokeWidth={2} aria-hidden="true" />
            <div className="absolute left-[20px] right-[20px] top-[40px] flex items-end justify-between">
              <div>
                <p className="text-[20px] font-extrabold leading-none tracking-tight text-slate-900">Stickers</p>
                <p className="mt-1 text-[11px] font-medium text-violet-600">Pocket Pals pack</p>
              </div>
              <span className="rounded-full bg-violet-600 px-2 py-[2px] text-[10px] font-bold text-white">{onPhone} left</span>
            </div>
            <div
              className="absolute left-[10px] right-[10px] rounded-[22px]"
              style={{
                top: panel.top,
                height: panel.height,
                backgroundColor: "rgba(255,255,255,.78)",
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(120,110,170,.22) 1px, transparent 1.4px)",
                backgroundSize: "16px 16px",
                boxShadow: "inset 0 0 0 1px rgba(120,110,170,.14), inset 0 2px 6px rgba(120,110,170,.12)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-around border-t border-violet-200/70 bg-white/85">
              <Smile className="size-5 text-violet-600" strokeWidth={2.4} aria-hidden="true" />
              <Heart className="size-5 text-slate-400" strokeWidth={2.2} aria-hidden="true" />
              <Star className="size-5 text-slate-400" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(115deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 32%)" }}
            />
          </div>
        </div>

        {/* Ghosts: the die-cut slot a sticker left behind */}
        {STICKERS.map((def, i) => (
          <div
            key={`g-${def.id}`}
            className="pointer-events-none absolute"
            style={{ left: slots[i].x - (S * PHONE_S) / 2, top: slots[i].y - (S * PHONE_S) / 2, width: S * PHONE_S, height: S * PHONE_S, zIndex: 1 }}
          >
            <Ghost def={def} uid={uid} visible={items[i].placed || held.has(i)} />
          </div>
        ))}

        {/* Stickers live in their own top layer, so they can leave the phone's glass */}
        {STICKERS.map((def, i) => {
          const it = items[i];
          const label = it.placed
            ? `${def.label} sticker on the notebook. Arrow keys move it, brackets rotate it, Delete returns it to the phone.`
            : `${def.label} sticker on the phone. Press Enter to stick it on the notebook, or drag it there.`;
          return (
            <StickerItem
              key={`${view.layout}-${def.id}`}
              def={def}
              uid={uid}
              home={homeOf(it, i)}
              z={it.placed ? it.z : 2}
              interactive={interactive}
              reduce={reduce}
              label={label}
              bounds={{ W: geo.W, H: geo.H }}
              apiRef={(api) => {
                apis.current[i] = api;
              }}
              toLogical={toLogical}
              onDrop={(moved, x, y) => onDrop(i, moved, x, y)}
              onHeld={(h) =>
                setHeld((prev) => {
                  if (prev.has(i) === h) return prev;
                  const next = new Set(prev);
                  if (h) next.add(i);
                  else next.delete(i);
                  return next;
                })
              }
              onRaise={() => {
                if (!it.placed) return;
                zRef.current += 1;
                const z = 10 + zRef.current;
                setItems((prev) => prev.map((p, k) => (k === i ? { ...p, z } : p)));
              }}
              onKey={(e) => onKey(i, e)}
              onDouble={() => {
                if (it.placed) {
                  sendBack(i, { peel: true, flight: 520 });
                  setStatus(`${def.label} is back on the phone`);
                }
              }}
            />
          );
        })}

        {!loop ? (
          <button
            type="button"
            onClick={reset}
            disabled={!anyPlaced}
            className="absolute inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 shadow-[0_2px_8px_rgba(30,40,70,.22)] outline-none transition-opacity hover:bg-white focus-visible:ring-4 focus-visible:ring-sky-500 disabled:opacity-40"
            style={{ left: paper.x + 16, bottom: geo.H - (notebook.y + notebook.h) + 30, zIndex: 3000 }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
