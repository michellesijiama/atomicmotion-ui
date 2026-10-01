"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, animate, motion, motionValue, useReducedMotion, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Stamp Tracker — a week of four habits, printed like a risograph zine and held as a deck
// of small soft cards on one rounded sheet of paper. Each card glows in its habit's inks.
// The week is the point: seven day-circles, mon to sun, and tapping one brings a rubber
// stamp down on it, leaving a flat disc of ink with a rounded silhouette in a second ink
// printed a hair out of register, rough at the edge and speckled where the drum ran dry.
// Today also has a small stamp in the card's corner (the same state), and a slim track
// below counts the week. Swipe the card away and it tucks in behind the others, whose tops
// peek out above it.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type HabitId = "coffee" | "move" | "water" | "read";

export type StampTrackerProps = {
  /** Date treated as today. Defaults to 2026-09-30 so SSR and gallery posters are deterministic. */
  today?: Date;
  /** Gallery card: stamp today on each card in turn and swipe on, until the user interacts. */
  loop?: boolean;
  onChange?: (habit: HabitId, day: number, stamped: boolean) => void;
  className?: string;
};

/* ───────────────────────────── palette & type ───────────────────────────── */

const PAPER = "#F6F3EC";
const INK = "#2B2A33";
const FONT = "var(--font-poppins, Poppins), Poppins, ui-sans-serif, system-ui, sans-serif";

type Habit = {
  id: HabitId;
  name: string;
  frequency: string;
  /** How many days a week count as a full week. */
  goal: number;
  /** The disc and the glow of the card. */
  block: string;
  /** The silhouette printed over the block. */
  figure: string;
  /** Share of past days that start out stamped. */
  seed: number;
};

const HABITS: readonly Habit[] = [
  { id: "coffee", name: "coffee", frequency: "everyday", goal: 7, block: "#9B6B52", figure: "#F4B6C8", seed: 0.72 },
  { id: "move", name: "move", frequency: "5 days a week", goal: 5, block: "#E8684A", figure: "#F6C35B", seed: 0.7 },
  { id: "water", name: "water", frequency: "everyday", goal: 7, block: "#6FB3E6", figure: "#F5DD4B", seed: 0.7 },
  { id: "read", name: "read", frequency: "everyday", goal: 7, block: "#6CC3A0", figure: "#6E6AC2", seed: 0.7 },
];

/* ───────────────────────────── layout tokens ───────────────────────────── */

const SURFACE_W = 340;
const SURFACE_H = 430;
const SURFACE_RADIUS = 40;

const CARD_MARGIN = 20;
const CARD_W = SURFACE_W - CARD_MARGIN * 2;
const CARD_H = 300;
/** The deck block (peeks, card, gap, dots) is centred in the sheet. */
const DECK_TOP = 69;
const DECK_BOTTOM = SURFACE_H - DECK_TOP - CARD_H;
const CARD_RADIUS = 32;
const CARD_PAD = 20;
/** Cards behind the front one: how far up each is shifted and how much it shrinks. */
const PEEK_Y = [0, 14, 26, 36] as const;
const PEEK_SCALE = [1, 0.93, 0.86, 0.79] as const;

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const WEEKDAYS_LONG = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const DEFAULT_TODAY = new Date(2026, 8, 30);

const DECK_SPRING = { type: "spring", stiffness: 260, damping: 28 } as const;
const SNAP_SPRING = { type: "spring", stiffness: 420, damping: 32 } as const;

/** The two sizes a stamp button comes in: the big one for today, the little ones for the week. */
const VARIANT = {
  hero: { size: 56, pad: 5, head: 1.45, lift: -8, shadow: "drop-shadow(0 8px 12px rgba(0,0,0,0.13))", speck: [2, 4], reach: 7, tilt: 12 },
  day: { size: 33, pad: 4, head: 1.55, lift: -6, shadow: "drop-shadow(0 8px 12px rgba(0,0,0,0.12))", speck: [2, 3], reach: 5, tilt: 20 },
} as const;

/* ───────────────────────────── seeded hashing ───────────────────────────── */

/** FNV-1a over a string, mapped to [0, 1). No Math.random, so server and client agree. */
function hash01(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Day index in the week → stamped. Indices run Monday 0 … Sunday 6. */
type Stamps = Record<HabitId, ReadonlySet<number>>;

/** The glow of a card: big soft blobs of the habit's two inks over paper. */
function glow(h: Habit) {
  return [
    `radial-gradient(120% 62% at 10% 4%, ${h.block}8C 0%, ${h.block}00 64%)`,
    `radial-gradient(90% 55% at 104% 52%, ${h.figure}A6 0%, ${h.figure}00 66%)`,
    `radial-gradient(115% 58% at 18% 104%, ${h.block}80 0%, ${h.block}00 62%)`,
    PAPER,
  ].join(", ");
}

/* ───────────────────────────── the silhouettes ───────────────────────────── */

// Soft block shapes on a 100 × 100 sheet. Every shape is filled and stroked in the same ink
// with round joins, so corners come out rounded; the knock-outs are round dots and pills (the
// stroke eats a little of each, so they are drawn a touch larger than they print).

function Figure({ habit, ink }: { habit: HabitId; ink: string }) {
  return (
    <g fill={ink} stroke={ink} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
      {habit === "coffee" ? (
        <>
          <rect x="36" y="14" width="3" height="6" />
          <rect x="50" y="9" width="3" height="6" />
          <path fillRule="evenodd" d="M28 36H60V65A10 10 0 0 1 50 75H38A10 10 0 0 1 28 65Z M34 51a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z" />
          <path d="M61 45h6a8 8 0 0 1 0 20h-6" fill="none" strokeWidth={6} />
        </>
      ) : null}
      {habit === "move" ? (
        <g transform="rotate(-28 50 50)">
          <path d="M18 50H82" fill="none" strokeWidth={6} />
          <rect x="29" y="34" width="4" height="32" strokeWidth={9} />
          <rect x="67" y="34" width="4" height="32" strokeWidth={9} />
          <rect x="19" y="42" width="2" height="16" strokeWidth={8} />
          <rect x="79" y="42" width="2" height="16" strokeWidth={8} />
        </g>
      ) : null}
      {habit === "water" ? (
        <path
          fillRule="evenodd"
          d="M50 15L64 39L70 52V62L64 72L56 77H44L36 72L30 62V52L36 39Z M33 60a8 8 0 1 0 16 0a8 8 0 1 0 -16 0Z"
        />
      ) : null}
      {habit === "read" ? (
        <>
          <path fillRule="evenodd" d="M19 38L46 44V73L19 67Z M25 51h13a4.5 4.5 0 0 1 0 9h-13a4.5 4.5 0 0 1 0 -9Z" />
          <path fillRule="evenodd" d="M54 44L81 38V67L54 73Z M62 51h13a4.5 4.5 0 0 1 0 9h-13a4.5 4.5 0 0 1 0 -9Z" />
          <circle cx="50" cy="25" r="2.5" />
        </>
      ) : null}
    </g>
  );
}

/**
 * The inked shape: a round disc with an optional silhouette in the second ink laid over
 * it. A faint multiplied ghost of the silhouette, a hair out of register, shows where the
 * two passes overprint. `textured` is the id of a shared riso-ink filter.
 */
function Print({ habit, textured, freshFigure }: { habit: Habit; textured?: string; freshFigure?: boolean }) {
  const content = (
    <>
      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx="50" cy="50" r="48" fill={habit.block} opacity="0.92" />
        {/* Ink pools at the rim of a stamp. */}
        <circle cx="50" cy="50" r="47.2" fill="none" stroke={habit.block} strokeOpacity="0.35" strokeWidth="3.4" />
      </g>
      <motion.g initial={freshFigure ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.08, delay: 0.04 }}>
        <g opacity="0.4" transform="translate(1.6 0.9)" style={{ mixBlendMode: "multiply" }}>
          <Figure habit={habit.id} ink={habit.block} />
        </g>
        <g opacity="0.95" transform="translate(3.5 2.4)">
          <Figure habit={habit.id} ink={habit.figure} />
        </g>
      </motion.g>
    </>
  );
  return textured ? <g filter={`url(#${textured})`}>{content}</g> : content;
}

/* ───────────────────────────── a stamp button, big or small ───────────────────────────── */

type StampButtonProps = {
  variant: keyof typeof VARIANT;
  habit: Habit;
  idx: number;
  stamped: boolean;
  isToday?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  /** Non-zero while a stamp has just been pressed onto this button. */
  slam: number;
  inkFilter: string;
  reduce: boolean;
  onPress: () => void;
};

function StampButton({ variant, habit, idx, stamped, isToday, disabled, ariaLabel, slam, inkFilter, reduce, onPress }: StampButtonProps) {
  const v = VARIANT[variant];
  const hero = variant === "hero";
  const [doneToken, setDoneToken] = React.useState(0);
  const headActive = !reduce && slam !== 0 && slam !== doneToken && stamped;
  const fresh = slam !== 0 && stamped && !reduce;
  const tilt = (hash01(`${habit.id}:${variant}:tilt:${idx}`) - 0.5) * v.tilt;
  const svgSize = v.size + v.pad;
  const offset = (v.size - svgSize) / 2;
  const ring = disabled ? `${habit.block}2E` : hero || isToday ? habit.block : `${habit.block}8C`;

  return (
    <button
      type="button"
      className="st-stamp"
      aria-pressed={stamped}
      aria-label={ariaLabel}
      aria-current={isToday && !hero ? "date" : undefined}
      disabled={disabled}
      onClick={onPress}
      style={{
        position: "relative",
        width: v.size,
        height: v.size,
        padding: 0,
        border: 0,
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        zIndex: headActive ? 5 : 1,
        overflow: "visible",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* The empty ring; it gives way to the stamp and comes back when the stamp lifts. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          border: `${hero ? 2 : isToday ? 2.5 : 2}px ${hero ? "dashed" : "solid"} ${ring}`,
          opacity: stamped ? 0 : 1,
          transition: `opacity ${stamped ? 120 : 200}ms ease ${stamped ? 0 : 140}ms`,
        }}
      >
        {hero ? (
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block", opacity: 0.18 }}>
            <Figure habit={habit.id} ink={habit.block} />
          </svg>
        ) : null}
      </span>
      {isToday && !hero ? (
        <span aria-hidden className="absolute rounded-full" style={{ width: 4, height: 4, left: "50%", bottom: -9, marginLeft: -2, background: habit.block }} />
      ) : null}

      <AnimatePresence initial={false}>
        {stamped && !headActive ? (
          <motion.svg
            key="imprint"
            aria-hidden
            viewBox="0 0 100 100"
            width={svgSize}
            height={svgSize}
            className="pointer-events-none absolute"
            style={{ left: offset, top: offset, overflow: "visible", rotate: tilt }}
            initial={fresh ? { scale: 1.08, opacity: 1 } : { scale: 0.96, opacity: 0 }}
            animate={fresh ? { scale: [1.08, 0.97, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0, transition: { duration: reduce ? 0.12 : 0.2 } }}
            transition={fresh ? { duration: 0.22, times: [0, 0.45, 1], ease: "easeOut" } : { duration: reduce ? 0.12 : 0.25 }}
          >
            <Print habit={habit} textured={inkFilter} freshFigure={fresh} />
          </motion.svg>
        ) : null}
      </AnimatePresence>

      {/* The stamp head: the same disc and silhouette, lifted and a little large, then slammed down. */}
      {headActive ? (
        <motion.svg
          aria-hidden
          viewBox="0 0 100 100"
          width={svgSize}
          height={svgSize}
          className="pointer-events-none absolute"
          style={{ left: offset, top: offset, overflow: "visible", rotate: tilt, filter: v.shadow }}
          initial={{ scale: v.head, y: v.lift, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: [0, 0.5, 0.5] }}
          transition={{
            scale: { duration: 0.14, ease: [0.55, 0, 1, 0.45] },
            y: { duration: 0.14, ease: [0.55, 0, 1, 0.45] },
            opacity: { duration: 0.14, times: [0, 0.4, 1] },
          }}
          onAnimationComplete={() => setDoneToken(slam)}
        >
          <Print habit={habit} />
        </motion.svg>
      ) : null}

      {/* A few flecks of ink thrown past the rim on impact. */}
      {fresh && !headActive
        ? [0, 1, 2, 3, 4].map((i) => {
            const a = hash01(`${habit.id}:fleck:${variant}:${idx}:${i}`) * Math.PI * 2;
            const r = v.size / 2 + 1 + hash01(`${habit.id}:fr:${variant}:${idx}:${i}`) * v.reach;
            const s = v.speck[0] + Math.round(hash01(`${habit.id}:fs:${variant}:${idx}:${i}`) * (v.speck[1] - v.speck[0]));
            return (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                initial={{ opacity: 0.9, x: 0, y: 0 }}
                animate={{ opacity: 0, x: Math.cos(a) * 3, y: Math.sin(a) * 3 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ width: s, height: s, left: v.size / 2 + Math.cos(a) * r - s / 2, top: v.size / 2 + Math.sin(a) * r - s / 2, background: habit.block }}
              />
            );
          })
        : null}
    </button>
  );
}

/* ───────────────────────────── a habit card ───────────────────────────── */

type DeckCardProps = {
  habit: Habit;
  /** 0 is the front card, 1 and 2 peek out behind it, 3 is hidden. */
  depth: number;
  entered: boolean;
  x: MotionValue<number>;
  stamps: Stamps;
  todayIdx: number;
  pressed: { habit: HabitId; idx: number; token: number } | null;
  inkFilters: { hero: string; day: string; grain: string };
  reduce: boolean;
  onToggle: (habit: HabitId, idx: number) => void;
  onSwipe: (dir: 1 | -1) => void;
  draggedRef: React.MutableRefObject<boolean>;
};

function DeckCard({ habit, depth, entered, x, stamps, todayIdx, pressed, inkFilters, reduce, onToggle, onSwipe, draggedRef }: DeckCardProps) {
  const rotate = useTransform(x, [-220, 0, 220], [-5, 0, 5]);
  const front = depth === 0;
  const done = stamps[habit.id].size;
  const shown = Math.min(depth, 3);
  const slamFor = (i: number) => (pressed && pressed.habit === habit.id && pressed.idx === i ? pressed.token : 0);

  // A card that has just flown off goes back to the middle at once, behind the others.
  const lastDepth = React.useRef(depth);
  React.useLayoutEffect(() => {
    if (lastDepth.current === 0 && depth !== 0) x.set(0);
    lastDepth.current = depth;
  }, [depth, x]);

  const guarded = (i: number) => () => {
    if (draggedRef.current) return;
    onToggle(habit.id, i);
  };

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${habit.name}, ${habit.frequency}`}
      aria-hidden={front ? undefined : true}
      inert={front ? undefined : true}
      className="absolute inset-x-0 top-0 bottom-0 overflow-hidden"
      drag={front ? "x" : false}
      dragMomentum={false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => {
        draggedRef.current = true;
      }}
      onDragEnd={(_, info) => {
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 60);
        const off = info.offset.x;
        const v = info.velocity.x;
        if (off < -90 || v < -520) onSwipe(1);
        else if (off > 90 || v > 520) onSwipe(-1);
        else animate(x, 0, SNAP_SPRING);
      }}
      initial={{ y: SURFACE_H, scale: PEEK_SCALE[shown], opacity: depth > 2 ? 0 : 1 }}
      animate={{ y: -PEEK_Y[shown], scale: PEEK_SCALE[shown], opacity: depth > 2 ? 0 : 1 }}
      transition={{ ...DECK_SPRING, delay: entered ? 0 : (3 - shown) * 0.09, opacity: { duration: 0.18 } }}
      style={{
        x,
        rotate,
        transformOrigin: "50% 0%",
        zIndex: 4 - shown,
        borderRadius: CARD_RADIUS,
        background: glow(habit),
        boxShadow: front ? "0 18px 36px -24px rgba(43,42,51,0.4), inset 0 0 0 1px rgba(43,42,51,0.06)" : "inset 0 0 0 1px rgba(43,42,51,0.06)",
        touchAction: "pan-y",
        cursor: front ? "grab" : "default",
        color: INK,
        padding: CARD_PAD,
      }}
    >
      {/* Printed grain over the glow, so the card reads as ink on paper, not a screen. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0" width="100%" height="100%" style={{ opacity: 0.1, mixBlendMode: "multiply" }}>
        <rect width="100%" height="100%" filter={`url(#${inkFilters.grain})`} />
      </svg>

      <div className="relative flex h-full flex-col">
        {/* 1. The header: which habit, and today's stamp. Secondary. */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="m-0" style={{ fontWeight: 600, fontSize: 18, lineHeight: "24px", letterSpacing: "-0.02em" }}>
              {habit.name}
            </h3>
            <div style={{ fontWeight: 400, fontSize: 12, lineHeight: "18px", opacity: 0.45 }}>{habit.frequency}</div>
          </div>
          <StampButton
            variant="hero"
            habit={habit}
            idx={todayIdx}
            stamped={stamps[habit.id].has(todayIdx)}
            ariaLabel={`${habit.name} today`}
            slam={slamFor(todayIdx)}
            inkFilter={inkFilters.hero}
            reduce={reduce}
            onPress={guarded(todayIdx)}
          />
        </div>

        {/* 2. The week. This is the point of the card, so it takes the middle and the most weight. */}
        <div className="flex flex-1 flex-col justify-center" style={{ paddingBottom: 6 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {WEEKDAYS.map((w, i) => (
              <span
                key={w}
                className="text-center"
                style={{ fontWeight: i === todayIdx ? 600 : 500, fontSize: 11, lineHeight: "16px", opacity: i === todayIdx ? 0.9 : 0.5 }}
              >
                {w}
              </span>
            ))}
          </div>
          <div className="grid justify-items-center" style={{ marginTop: 10, gridTemplateColumns: "repeat(7, 1fr)" }}>
            {WEEKDAYS.map((w, i) => (
              <StampButton
                key={w}
                variant="day"
                habit={habit}
                idx={i}
                stamped={stamps[habit.id].has(i)}
                isToday={i === todayIdx}
                disabled={i > todayIdx}
                ariaLabel={`${habit.name}, ${WEEKDAYS_LONG[i]} — ${stamps[habit.id].has(i) ? "stamped" : "not stamped"}`}
                slam={slamFor(i)}
                inkFilter={inkFilters.day}
                reduce={reduce}
                onPress={guarded(i)}
              />
            ))}
          </div>
        </div>

        {/* 3. Progress. Tertiary. */}
        <div>
          <div style={{ fontWeight: 400, fontSize: 12, lineHeight: "16px", opacity: 0.5 }}>
            {done} of {habit.goal} this week
          </div>
          <div className="relative overflow-hidden rounded-full" style={{ marginTop: 8, height: 6, background: "rgba(43,42,51,0.06)" }}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: habit.block }}
              initial={false}
              animate={{ width: `${Math.min(1, done / habit.goal) * 100}%` }}
              transition={{ duration: reduce ? 0.12 : 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────────── the sheet ───────────────────────────── */

export function StampTracker({ today = DEFAULT_TODAY, loop = false, onChange, className }: StampTrackerProps) {
  const reduce = !!useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const year = today.getFullYear();
  const month = today.getMonth();
  const dom = today.getDate();
  const todayIdx = (today.getDay() + 6) % 7; // Monday first

  const [initial] = React.useState<Stamps>(() => {
    const out = {} as Record<HabitId, Set<number>>;
    for (const habit of HABITS) {
      const set = new Set<number>();
      for (let i = 0; i < todayIdx; i += 1) {
        const d = new Date(year, month, dom - todayIdx + i);
        if (hash01(`${habit.id}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) < habit.seed) set.add(i);
      }
      out[habit.id] = set;
    }
    return out;
  });
  const [stamps, setStamps] = React.useState<Stamps>(initial);
  const [front, setFront] = React.useState(0);
  const [entered, setEntered] = React.useState(false);
  const [pressed, setPressed] = React.useState<{ habit: HabitId; idx: number; token: number } | null>(null);
  const [interacted, setInteracted] = React.useState(false);

  const stampsRef = React.useRef(stamps);
  React.useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);
  const frontRef = React.useRef(0);
  const interactedRef = React.useRef(false);
  const busyRef = React.useRef(false);
  const draggedRef = React.useRef(false);
  const tokenRef = React.useRef(0);
  const clearRef = React.useRef<number | null>(null);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const reduceRef = React.useRef(reduce);
  React.useEffect(() => {
    reduceRef.current = reduce;
  }, [reduce]);

  // One horizontal offset per card, so a card can be dragged, flung and put back.
  const xs = React.useMemo(() => HABITS.map(() => motionValue(0)), []);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);

  // Scale the true-size sheet down to the space it has, so it is always whole.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.max(0.3, Math.min(1, (host.clientWidth - 24) / SURFACE_W, (host.clientHeight - 24) / SURFACE_H));
      fit.style.transform = `scale(${scale.toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // The cards have risen into place once the last one has landed; after that they move without a stagger.
  React.useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 1100);
    return () => window.clearTimeout(t);
  }, []);

  React.useEffect(
    () => () => {
      if (clearRef.current !== null) window.clearTimeout(clearRef.current);
    },
    [],
  );

  const setStamped = React.useCallback(
    (id: HabitId, idx: number, on: boolean, byPerson: boolean) => {
      if (stampsRef.current[id].has(idx) === on) return;
      setStamps((prev) => {
        const next = new Set(prev[id]);
        if (on) next.add(idx);
        else next.delete(idx);
        const out = { ...prev, [id]: next };
        stampsRef.current = out;
        return out;
      });
      if (on) {
        tokenRef.current += 1;
        setPressed({ habit: id, idx, token: tokenRef.current });
        if (clearRef.current !== null) window.clearTimeout(clearRef.current);
        clearRef.current = window.setTimeout(() => setPressed(null), 900);
      } else {
        setPressed(null);
      }
      if (byPerson) onChangeRef.current?.(id, new Date(year, month, dom - todayIdx + idx).getDate(), on);
    },
    [year, month, dom, todayIdx],
  );

  const toggle = React.useCallback(
    (id: HabitId, idx: number) => {
      setStamped(id, idx, !stampsRef.current[id].has(idx), true);
    },
    [setStamped],
  );

  /** dir 1: the front card goes to the back; dir -1: the back card comes round to the front. */
  const advance = React.useCallback(
    async (dir: 1 | -1) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const cur = frontRef.current;
      const n = HABITS.length;
      if (dir === 1) {
        if (!reduceRef.current) await animate(xs[cur], -(CARD_W + 80), { duration: 0.24, ease: [0.4, 0, 0.9, 0.6] });
        frontRef.current = (cur + 1) % n;
        setFront((cur + 1) % n);
      } else {
        const prev = (cur + n - 1) % n;
        xs[prev].set(reduceRef.current ? 0 : CARD_W + 80);
        frontRef.current = prev;
        setFront(prev);
        if (!reduceRef.current) {
          animate(xs[cur], 0, SNAP_SPRING);
          await animate(xs[prev], 0, DECK_SPRING);
        }
      }
      busyRef.current = false;
    },
    [xs],
  );

  const goTo = React.useCallback(
    (i: number) => {
      if (i === frontRef.current || busyRef.current) return;
      xs.forEach((v) => v.set(0));
      frontRef.current = i;
      setFront(i);
    },
    [xs],
  );

  const touched = React.useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }, []);

  // Gallery loop: stamp today on the front card, let the stamp land, swipe to the next card;
  // when every habit is done for today, wipe the week back to its seed.
  React.useEffect(() => {
    if (!loop || interacted) return;
    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });
    (async () => {
      await wait(1800);
      while (!cancelled) {
        const id = HABITS[frontRef.current].id;
        if (!stampsRef.current[id].has(todayIdx)) {
          setStamped(id, todayIdx, true, false);
          await wait(900);
          if (cancelled) return;
        }
        if (HABITS.every((h) => stampsRef.current[h.id].has(todayIdx))) {
          await wait(1500);
          if (cancelled) return;
          setStamps(initial);
          stampsRef.current = initial;
          await wait(800);
          continue;
        }
        await advance(1);
        await wait(1700);
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [loop, interacted, initial, setStamped, advance, todayIdx]);

  const onDeckKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    void advance(event.key === "ArrowRight" ? 1 : -1);
  };

  const inkFilters = { hero: `${uid}-hero`, day: `${uid}-day`, grain: `${uid}-grain` };
  const frontHabit = HABITS[front];

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={hostRef}
        className={cn("relative flex size-full min-h-[420px] items-center justify-center overflow-hidden", className)}
        style={{ fontFamily: FONT }}
        onPointerDownCapture={touched}
        onKeyDownCapture={touched}
      >
        <style>
          {`
            .st-stamp { outline: none; border-radius: 50%; }
            .st-stamp:focus-visible { outline: 2px solid ${INK}; outline-offset: 3px; }
            .st-deck { outline: none; }
            .st-deck:focus-visible { outline: 2px solid ${INK}; outline-offset: 4px; border-radius: ${CARD_RADIUS}px; }
            .st-dot { outline: none; }
            .st-dot:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
          `}
        </style>

        {/* Shared ink textures — a coarse one for the big stamp, a fine one for the little ones. */}
        <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
          <defs>
            <filter id={inkFilters.hero} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="21" result="warp" />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" result="rough" />
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="5" result="grain" />
              <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  30 0 0 0 -9" result="speck" />
              <feComposite in="rough" in2="speck" operator="in" />
            </filter>
            <filter id={inkFilters.day} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="warp" />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
              <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="3" result="grain" />
              <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  30 0 0 0 -9" result="speck" />
              <feComposite in="rough" in2="speck" operator="in" />
            </filter>
            <filter id={inkFilters.grain} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.16  0 0 0 0 0.2  0 0 0 1.6 -0.35" />
            </filter>
          </defs>
        </svg>

        <div ref={fitRef} className="relative shrink-0" style={{ width: SURFACE_W, height: SURFACE_H, transformOrigin: "50% 50%" }}>
          <div
            role="group"
            aria-label="Stamp tracker"
            className="absolute inset-0 overflow-hidden"
            style={{
              borderRadius: SURFACE_RADIUS,
              background: PAPER,
              color: INK,
              fontFamily: FONT,
              boxShadow: "0 0 0 1px rgba(43,42,51,0.06), 0 26px 50px -30px rgba(43,42,51,0.3)",
            }}
          >
            {/* The deck. The cards behind peek out above the front one. */}
            <div
              role="group"
              aria-roledescription="carousel"
              aria-label="Habits"
              tabIndex={0}
              className="st-deck absolute"
              onKeyDown={onDeckKeyDown}
              style={{ left: CARD_MARGIN, right: CARD_MARGIN, top: DECK_TOP, bottom: DECK_BOTTOM }}
            >
              {HABITS.map((h, i) => (
                <DeckCard
                  key={h.id}
                  habit={h}
                  depth={(i - front + HABITS.length) % HABITS.length}
                  entered={entered}
                  x={xs[i]}
                  stamps={stamps}
                  todayIdx={todayIdx}
                  pressed={pressed}
                  inkFilters={inkFilters}
                  reduce={reduce}
                  onToggle={toggle}
                  onSwipe={(dir) => void advance(dir)}
                  draggedRef={draggedRef}
                />
              ))}
            </div>

            {/* Which card is in front. */}
            <div className="absolute left-0 right-0 flex items-center justify-center" style={{ bottom: 35, gap: 7, height: 10 }}>
              {HABITS.map((h, i) => {
                const active = i === front;
                return (
                  <button
                    key={h.id}
                    type="button"
                    className="st-dot rounded-full"
                    aria-label={`Show ${h.name}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => goTo(i)}
                    style={{
                      width: active ? 20 : 8,
                      height: 8,
                      padding: 0,
                      border: 0,
                      cursor: "pointer",
                      background: active ? frontHabit.block : "rgba(43,42,51,0.2)",
                      transition: "width 250ms ease, background-color 250ms ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Paper grain, clipped to the sheet. */}
            <svg aria-hidden className="pointer-events-none absolute inset-0" width="100%" height="100%" style={{ opacity: 0.08, mixBlendMode: "multiply" }}>
              <rect width="100%" height="100%" filter={`url(#${inkFilters.grain})`} />
            </svg>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
