"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion, motionValue, useReducedMotion, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Stamp Tracker — four habits, printed like a risograph zine and held as a deck of tall soft
// cards on a bare grey phone screen. Each card is a sheet of frosted glass. A Day / Week /
// Month switch at the top chooses what the card shows: one big stamp for today, a row of seven
// days, or the whole month. Tap a day and a rubber stamp comes down on it, leaving a flat disc
// of ink with a rounded silhouette in a second ink printed a hair out of register, rough at the
// edge and speckled where the drum ran dry. Swipe the card away and it tucks in behind the
// others, which fan out above it like a loose stack of paper.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type HabitId = "coffee" | "move" | "water" | "read";

export type StampTrackerProps = {
  /** Date treated as today; the cards show its month and its week. Defaults to 2026-09-30 so SSR and gallery posters are deterministic. */
  today?: Date;
  /** Gallery card: stamp today on each card in turn and swipe on, until the user interacts. */
  loop?: boolean;
  /** A person stamped or lifted a day. `date` is an ISO date, e.g. "2026-09-14". */
  onChange?: (habit: HabitId, date: string, stamped: boolean) => void;
  className?: string;
};

type View = "day" | "week" | "month";

/* ───────────────────────────── palette & type ───────────────────────────── */

const INK = "#2B2A33";
/** The phone screen the deck sits on: a soft, cool grey with no bezel. */
const SCREEN = "#F1F2F4";
const FONT = "var(--font-poppins, Poppins), Poppins, ui-sans-serif, system-ui, sans-serif";

type Habit = {
  id: HabitId;
  name: string;
  /** The card: a flat block of riso colour, like the blocks on the book cover. */
  card: string;
  /** The stamp: the pattern ink printed on that block — the disc, its rings and the card's type. */
  stamp: string;
  /** Share of past days that start out stamped. */
  seed: number;
};

const HABITS: readonly Habit[] = [
  { id: "coffee", name: "Coffee", card: "#9C7158", stamp: "#EDBC9F", seed: 0.68 },
  { id: "move", name: "Move", card: "#F2B6CB", stamp: "#4FAE8F", seed: 0.62 },
  { id: "water", name: "Water", card: "#6BAEE5", stamp: "#F8DF3E", seed: 0.66 },
  { id: "read", name: "Read", card: "#5DB896", stamp: "#6560BE", seed: 0.64 },
];

const VIEWS: readonly { id: View; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

/* ───────────────────────────── layout tokens ───────────────────────────── */

/** The phone: a bare rounded screen in iPhone proportions. */
const SURFACE_W = 340;
const SURFACE_H = 736;
const SURFACE_RADIUS = 60;

/** The Day / Week / Month switch, centred near the top. */
const SWITCH_TOP = 64;
const SWITCH_W = 216;
const SWITCH_H = 36;

const CARD_MARGIN = 20;
const CARD_W = SURFACE_W - CARD_MARGIN * 2;
const CARD_H = 504;
/** The deck block (the peeks plus the card) sits centred in the space under the switch. */
const PEEK_TOP = 60;
const DECK_REGION_TOP = SWITCH_TOP + SWITCH_H + 16;
const DECK_REGION_BOTTOM = SURFACE_H - 40;
const DECK_TOP = Math.round((DECK_REGION_TOP + DECK_REGION_BOTTOM - CARD_H - PEEK_TOP) / 2) + PEEK_TOP;
const DECK_BOTTOM = SURFACE_H - DECK_TOP - CARD_H;
const CARD_RADIUS = 36;
const CARD_PAD = 24;
/** The grids reach a little into the card's side padding, so a row runs nearly edge to edge. */
const GRID_BLEED = 4;
/** Where each card sits in the stack. All four show: the three behind are smaller and narrower, pivot about their top edge and tilt a little, so only their rounded tops show above the front card. */
const SLOTS = [
  { y: 0, scale: 1, rotate: 0 },
  { y: -20, scale: 0.88, rotate: -2.2 },
  { y: -38, scale: 0.77, rotate: 2.5 },
  { y: -54, scale: 0.66, rotate: -1.5 },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const DEFAULT_TODAY = new Date(2026, 8, 30);

const DECK_SPRING = { type: "spring", stiffness: 260, damping: 28 } as const;
const SNAP_SPRING = { type: "spring", stiffness: 420, damping: 32 } as const;

/** A stamp button's size, and how far a fresh print throws ink. */
const VARIANT = {
  cell: { size: 31, pad: 4, speck: [2, 3], reach: 5, fling: 3, tilt: 20, num: 12 },
  week: { size: 34, pad: 4, speck: [2, 3], reach: 5, fling: 3, tilt: 20, num: 13 },
  day: { size: 150, pad: 12, speck: [3, 5], reach: 9, fling: 8, tilt: 8, num: 0 },
} as const;
type Variant = keyof typeof VARIANT;

/* ───────────────────────────── seeded hashing & dates ───────────────────────────── */

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

/** A local date as "YYYY-MM-DD". */
function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Habit → the ISO dates that carry a stamp. */
type Stamps = Record<HabitId, ReadonlySet<string>>;

/** One day of a calendar: its ISO date, its day of the month and how to say it aloud. */
type Cell = { iso: string; day: number; spoken: string };

type Calendar = {
  todayIso: string;
  month: { name: string; cells: (Cell | null)[]; todayCol: number };
  week: { range: string; cells: Cell[] };
  day: { weekday: string; label: string };
};

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
 * The inked shape: a round disc of flat riso ink with the silhouette in a second ink laid
 * over it. A faint multiplied ghost of the silhouette, a hair out of register, shows where
 * the two passes overprint. `textured` is the id of a shared riso-ink filter.
 */
function Print({ habit, textured }: { habit: Habit; textured?: string }) {
  // The pattern itself in the stamp ink, printed straight onto the card like the houses on the cover —
  // no disc behind it. Grown a little so it fills the day's circle.
  const content = (
    <g transform="translate(50 50) scale(1.18) translate(-50 -50)">
      <Figure habit={habit.id} ink={habit.stamp} />
    </g>
  );
  return textured ? <g filter={`url(#${textured})`}>{content}</g> : content;
}

/* ───────────────────────────── a day's stamp button ───────────────────────────── */

type StampButtonProps = {
  variant: Variant;
  habit: Habit;
  cell: Cell;
  stamped: boolean;
  isToday?: boolean;
  disabled?: boolean;
  /** Non-zero while a stamp has just been pressed onto this button. */
  slam: number;
  inkFilter: string;
  reduce: boolean;
  onPress: () => void;
};

function StampButton({ variant, habit, cell, stamped, isToday, disabled, slam, inkFilter, reduce, onPress }: StampButtonProps) {
  const v = VARIANT[variant];
  const big = variant === "day";
  const fresh = slam !== 0 && stamped && !reduce;
  const tilt = (hash01(`${habit.id}:${variant}:tilt:${cell.iso}`) - 0.5) * v.tilt;
  const svgSize = v.size + v.pad;
  const offset = (v.size - svgSize) / 2;
  const ring = disabled ? `${habit.stamp}4D` : isToday ? habit.stamp : `${habit.stamp}A6`;

  return (
    <button
      type="button"
      className="st-stamp"
      aria-pressed={stamped}
      aria-label={`${habit.name}, ${cell.spoken} — ${stamped ? "stamped" : "not stamped"}`}
      aria-current={isToday ? "date" : undefined}
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
        zIndex: 1,
        overflow: "visible",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* The empty ring; it gives way to the stamp and comes back when the stamp lifts. */}
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center rounded-full"
        style={{
          border: `${big ? 2.5 : isToday ? 2 : 1.5}px ${big ? "dashed" : "solid"} ${ring}`,
          opacity: stamped ? 0 : 1,
          transition: `opacity ${stamped ? 120 : 200}ms ease ${stamped ? 0 : 140}ms`,
        }}
      >
        {big ? (
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block", opacity: 0.18 }}>
            <Figure habit={habit.id} ink={habit.stamp} />
          </svg>
        ) : (
          <span style={{ fontWeight: isToday ? 600 : 500, fontSize: v.num, lineHeight: 1, color: habit.stamp, opacity: disabled ? 0.4 : isToday ? 1 : 0.8 }}>{cell.day}</span>
        )}
      </span>

      <AnimatePresence initial={false}>
        {stamped ? (
          <motion.svg
            key="imprint"
            aria-hidden
            viewBox="0 0 100 100"
            width={svgSize}
            height={svgSize}
            className="pointer-events-none absolute"
            style={{ left: offset, top: offset, overflow: "visible", rotate: tilt }}
            // Pressed, not hovered: the print comes down fast, squashes a touch on impact, and settles.
            initial={fresh ? { scale: 1.3, opacity: 0 } : { scale: 0.96, opacity: 0 }}
            animate={fresh ? { scale: [1.3, 0.92, 1], opacity: [0, 1, 1] } : { scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0, transition: { duration: reduce ? 0.12 : 0.18 } }}
            transition={fresh ? { duration: 0.28, times: [0, 0.45, 1], ease: [0.3, 0, 0.2, 1] } : { duration: reduce ? 0.12 : 0.2 }}
          >
            <Print habit={habit} textured={inkFilter} />
          </motion.svg>
        ) : null}
      </AnimatePresence>


      {/* A few flecks of ink thrown past the rim on impact. */}
      {fresh
        ? [0, 1, 2, 3, 4].map((i) => {
            const a = hash01(`${habit.id}:fleck:${variant}:${cell.iso}:${i}`) * Math.PI * 2;
            const r = v.size / 2 + 1 + hash01(`${habit.id}:fr:${variant}:${cell.iso}:${i}`) * v.reach;
            const s = v.speck[0] + Math.round(hash01(`${habit.id}:fs:${variant}:${cell.iso}:${i}`) * (v.speck[1] - v.speck[0]));
            return (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 0.9, 0], x: Math.cos(a) * v.fling, y: Math.sin(a) * v.fling }}
                transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
                style={{ width: s, height: s, left: v.size / 2 + Math.cos(a) * r - s / 2, top: v.size / 2 + Math.sin(a) * r - s / 2, background: habit.stamp }}
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
  /** 0 is the front card; 1, 2 and 3 peek out behind it. */
  depth: number;
  entered: boolean;
  view: View;
  x: MotionValue<number>;
  /** How far the front card has been pulled aside (px); the card right behind it shows its contents as it's uncovered. */
  peel: MotionValue<number>;
  stamps: Stamps;
  cal: Calendar;
  pressed: { habit: HabitId; iso: string; token: number } | null;
  inkFilters: { day: string; hero: string; grain: string; fleck: string };
  reduce: boolean;
  onToggle: (habit: HabitId, iso: string) => void;
  onSwipe: (dir: 1 | -1) => void;
  draggedRef: React.MutableRefObject<boolean>;
};

/** Swaps a card's contents when the view changes: the old one fades out, the new one rises in. */
const fade = (reduce: boolean) => ({
  initial: { opacity: 0, y: reduce ? 0 : 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, delay: 0.04 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
});

function DeckCard({ habit, depth, entered, view, x, peel, stamps, cal, pressed, inkFilters, reduce, onToggle, onSwipe, draggedRef }: DeckCardProps) {
  // Dragging tilts the card about its bottom edge, like a sheet pulled off a stack.
  const rotate = useTransform(x, [-220, 0, 220], [-4, 0, 4]);
  const front = depth === 0;
  // The next card's contents come up as the front card is pulled off it, so it's already readable when it lands.
  const reveal = useTransform(peel, [10, 120], [0, 1]);
  const slot = SLOTS[Math.min(depth, 3)];
  const slamFor = (iso: string) => (pressed && pressed.habit === habit.id && pressed.iso === iso ? pressed.token : 0);

  // A card that has just flown off goes back to the middle at once, behind the others.
  const lastDepth = React.useRef(depth);
  React.useLayoutEffect(() => {
    if (lastDepth.current === 0 && depth !== 0) x.set(0);
    lastDepth.current = depth;
  }, [depth, x]);

  const guarded = (iso: string) => () => {
    if (draggedRef.current) return;
    onToggle(habit.id, iso);
  };

  const subtitle = view === "month" ? cal.month.name : view === "week" ? cal.week.range : cal.day.weekday;

  const button = (variant: Variant, cell: Cell) => (
    <StampButton
      key={cell.iso}
      variant={variant}
      habit={habit}
      cell={cell}
      stamped={stamps[habit.id].has(cell.iso)}
      isToday={cell.iso === cal.todayIso}
      disabled={cell.iso > cal.todayIso}
      slam={slamFor(cell.iso)}
      inkFilter={variant === "day" ? inkFilters.hero : inkFilters.day}
      reduce={reduce}
      onPress={guarded(cell.iso)}
    />
  );

  const labelRow = (cols: number | null) => (
    <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
      {WEEKDAYS.map((w, c) => (
        <span key={w} className="text-center" style={{ fontWeight: c === cols ? 600 : 500, fontSize: 14, lineHeight: "20px", opacity: c === cols ? 1 : 0.75 }}>
          {w}
        </span>
      ))}
    </div>
  );

  const todayWeekCol = cal.week.cells.findIndex((c) => c.iso === cal.todayIso);
  const todayCell = cal.week.cells[todayWeekCol] ?? cal.week.cells[0];

  return (
    // The outer layer holds the card's place in the stack (and fans it); the inner one is the card, which can be dragged.
    <motion.div
      className="absolute inset-x-0 top-0 bottom-0"
      initial={{ y: SURFACE_H, scale: slot.scale, rotate: slot.rotate }}
      animate={{ y: slot.y, scale: slot.scale, rotate: slot.rotate }}
      transition={{ ...DECK_SPRING, delay: entered ? 0 : (3 - Math.min(depth, 3)) * 0.09 }}
      style={{ transformOrigin: "50% 0%", zIndex: 4 - Math.min(depth, 3), pointerEvents: front ? "auto" : "none" }}
    >
      <motion.div
        role="group"
        aria-roledescription="slide"
        aria-label={`${habit.name}, ${subtitle}`}
        aria-hidden={front ? undefined : true}
        inert={front ? undefined : true}
        className="absolute inset-0 overflow-hidden"
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
        style={{
          x,
          rotate,
          transformOrigin: "50% 100%",
          borderRadius: CARD_RADIUS,
          // A flat block of riso colour; its type and stamps are printed in the pattern ink.
          background: habit.card,
          touchAction: "pan-y",
          cursor: front ? "grab" : "default",
          color: habit.stamp,
          padding: CARD_PAD,
        }}
      >
        {/* Printed noise over the block — dark specks where the ink sat heavy, light ones where the drum ran dry. */}
        <svg aria-hidden className="pointer-events-none absolute inset-0" width="100%" height="100%">
          <rect width="100%" height="100%" filter={`url(#${inkFilters.grain})`} style={{ opacity: 0.35, mixBlendMode: "multiply" }} />
          <rect width="100%" height="100%" filter={`url(#${inkFilters.fleck})`} style={{ opacity: 0.4 }} />
        </svg>
        {/* The front card shows its contents and the one behind it fades its in while you swipe; the rest are bare blocks of colour. */}
        <motion.div className="relative flex h-full flex-col" style={{ opacity: front ? 1 : depth === 1 ? reveal : 0 }}>
          {/* The header: the habit, and under it what the card is showing, the same size in grey. */}
                    <div style={{ fontWeight: 600, fontSize: 24, lineHeight: "30px", letterSpacing: "-0.02em" }}>
            <h3 className="m-0" style={{ font: "inherit", letterSpacing: "inherit" }}>
              {habit.name}
            </h3>
            <div className="relative" style={{ height: 30, opacity: 0.6 }}>
              <AnimatePresence initial={false} mode="wait">
                <motion.div key={view} className="absolute inset-x-0 top-0 whitespace-nowrap" {...fade(reduce)}>
                  {subtitle}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* The body, low in the card. */}
          <div className="relative flex-1">
            <AnimatePresence initial={false} mode="wait">
              {view === "month" ? (
                <motion.div key="month" className="absolute inset-x-0 bottom-0" style={{ marginInline: -GRID_BLEED, paddingBottom: 2 }} {...fade(reduce)}>
                  {labelRow(cal.month.todayCol)}
                  <div className="grid justify-items-center" style={{ marginTop: 10, gridTemplateColumns: "repeat(7, 1fr)", rowGap: 10 }}>
                    {cal.month.cells.map((cell, i) =>
                      cell ? button("cell", cell) : <span key={`blank-${i}`} aria-hidden style={{ width: VARIANT.cell.size, height: VARIANT.cell.size }} />,
                    )}
                  </div>
                </motion.div>
              ) : null}
              {view === "week" ? (
                <motion.div key="week" className="absolute inset-x-0 bottom-0" style={{ marginInline: -GRID_BLEED, paddingBottom: 2 }} {...fade(reduce)}>
                  {labelRow(todayWeekCol)}
                  <div className="grid justify-items-center" style={{ marginTop: 10, gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {cal.week.cells.map((cell) => button("week", cell))}
                  </div>
                </motion.div>
              ) : null}
              {view === "day" ? (
                <motion.div key="day" className="absolute inset-x-0 bottom-0 flex flex-col items-center" style={{ paddingBottom: 56 }} {...fade(reduce)}>
                  {button("day", todayCell)}
                  <div style={{ marginTop: 18, fontWeight: 400, fontSize: 16, lineHeight: "22px", opacity: 0.75 }}>{cal.day.label}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── the Day / Week / Month switch ───────────────────────────── */

function ViewSwitch({ view, onChange, uid }: { view: View; onChange: (v: View) => void; uid: string }) {
  const tabs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (event: React.KeyboardEvent) => {
    const i = VIEWS.findIndex((v) => v.id === view);
    const next = event.key === "ArrowRight" ? (i + 1) % VIEWS.length : event.key === "ArrowLeft" ? (i + VIEWS.length - 1) % VIEWS.length : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(VIEWS[next].id);
    tabs.current[VIEWS[next].id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="View"
      onKeyDown={onKeyDown}
      className="absolute flex rounded-full"
      style={{ top: SWITCH_TOP, left: "50%", width: SWITCH_W, height: SWITCH_H, marginLeft: -SWITCH_W / 2, padding: 3, background: "rgba(43,42,51,0.06)", zIndex: 10 }}
    >
      {VIEWS.map((v) => {
        const active = v.id === view;
        return (
          <button
            key={v.id}
            ref={(el) => {
              tabs.current[v.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className="st-tab relative flex-1 rounded-full"
            onClick={() => onChange(v.id)}
            style={{ border: 0, background: "transparent", cursor: "pointer", fontFamily: FONT, fontWeight: 500, fontSize: 13, color: INK, padding: 0 }}
          >
            {active ? (
              <motion.span
                layoutId={`${uid}-thumb`}
                className="absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
              />
            ) : null}
            <span className="relative" style={{ opacity: active ? 0.9 : 0.45, transition: "opacity 200ms ease" }}>
              {v.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── the deck ───────────────────────────── */

export function StampTracker({ today = DEFAULT_TODAY, loop = false, onChange, className }: StampTrackerProps) {
  const reduce = !!useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const year = today.getFullYear();
  const month = today.getMonth();
  const dom = today.getDate();
  const todayIso = isoOf(today);

  // Everything the cards need to draw this month, this week and today.
  const cal = React.useMemo<Calendar>(() => {
    const spokenOf = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    const cellOf = (d: Date): Cell => ({ iso: isoOf(d), day: d.getDate(), spoken: spokenOf(d) });
    const firstCol = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const days = new Date(year, month + 1, 0).getDate();
    const cells: (Cell | null)[] = [];
    // Whole rows only: blanks before the 1st and after the last day, so every row has seven slots.
    for (let slot = 0; slot < Math.ceil((firstCol + days) / 7) * 7; slot += 1) {
      const day = slot - firstCol + 1;
      cells.push(day < 1 || day > days ? null : cellOf(new Date(year, month, day)));
    }
    const col = (today.getDay() + 6) % 7;
    const week = Array.from({ length: 7 }, (_, i) => cellOf(new Date(year, month, dom - col + i)));
    const first = new Date(year, month, dom - col);
    const last = new Date(year, month, dom - col + 6);
    return {
      todayIso,
      month: { name: MONTHS[month], cells, todayCol: (firstCol + dom - 1) % 7 },
      week: { range: `${MONTHS_SHORT[first.getMonth()]} ${first.getDate()} – ${MONTHS_SHORT[last.getMonth()]} ${last.getDate()}`, cells: week },
      day: { weekday: WEEKDAYS_LONG[col], label: `${MONTHS_SHORT[month]} ${dom}` },
    };
  }, [year, month, dom, today, todayIso]);

  // Past days start stamped at each habit's rate: the month so far, and any earlier days of this week.
  const [initial] = React.useState<Stamps>(() => {
    const col = (today.getDay() + 6) % 7;
    const from = Math.min(1, dom - col);
    const out = {} as Record<HabitId, Set<string>>;
    for (const habit of HABITS) {
      const set = new Set<string>();
      for (let d = from; d < dom; d += 1) {
        const iso = isoOf(new Date(year, month, d));
        if (hash01(`${habit.id}:${iso}`) < habit.seed) set.add(iso);
      }
      out[habit.id] = set;
    }
    return out;
  });
  const [stamps, setStamps] = React.useState<Stamps>(initial);
  const [view, setView] = React.useState<View>(loop ? "month" : "week");
  const [front, setFront] = React.useState(0);
  const [entered, setEntered] = React.useState(false);
  const [pressed, setPressed] = React.useState<{ habit: HabitId; iso: string; token: number } | null>(null);
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
  const peel = React.useMemo(() => motionValue(0), []);

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);

  // Scale the true-size deck down to the space it has, so it is always whole.
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

  const setStamped = React.useCallback((id: HabitId, iso: string, on: boolean, byPerson: boolean) => {
    if (stampsRef.current[id].has(iso) === on) return;
    setStamps((prev) => {
      const next = new Set(prev[id]);
      if (on) next.add(iso);
      else next.delete(iso);
      const out = { ...prev, [id]: next };
      stampsRef.current = out;
      return out;
    });
    if (on) {
      tokenRef.current += 1;
      setPressed({ habit: id, iso, token: tokenRef.current });
      if (clearRef.current !== null) window.clearTimeout(clearRef.current);
      clearRef.current = window.setTimeout(() => setPressed(null), 900);
    } else {
      setPressed(null);
    }
    if (byPerson) onChangeRef.current?.(id, iso, on);
  }, []);

  const toggle = React.useCallback(
    (id: HabitId, iso: string) => {
      setStamped(id, iso, !stampsRef.current[id].has(iso), true);
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
        if (!reduceRef.current) await animate(xs[cur], -(CARD_W + 80), { duration: 0.3, ease: [0.32, 0.72, 0, 1] });
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

  // Track how far the current front card is pulled aside.
  React.useEffect(() => {
    const fx = xs[front];
    peel.set(Math.abs(fx.get()));
    return fx.on("change", (v) => peel.set(Math.abs(v)));
  }, [front, xs, peel]);

  const touched = React.useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }, []);

  // Gallery loop: stamp today on the front card, let the stamp land, swipe to the next card;
  // when every habit is done for today, wipe the stamps back to their seed.
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
        if (!stampsRef.current[id].has(todayIso)) {
          setStamped(id, todayIso, true, false);
          await wait(900);
          if (cancelled) return;
        }
        if (HABITS.every((h) => stampsRef.current[h.id].has(todayIso))) {
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
  }, [loop, interacted, initial, setStamped, advance, todayIso]);

  const onDeckKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    void advance(event.key === "ArrowRight" ? 1 : -1);
  };

  const inkFilters = { day: `${uid}-day`, hero: `${uid}-hero`, grain: `${uid}-grain`, fleck: `${uid}-fleck` };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={uid}>
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
              .st-tab { outline: none; }
              .st-tab:focus-visible { outline: 2px solid ${INK}; outline-offset: 1px; }
            `}
          </style>

          {/* Shared textures: the stamps' ink (fine for the little ones, coarse for the big one) and the cards' paper grain. */}
          <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
            <defs>
              <filter id={inkFilters.day} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="3" result="grain" />
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="warp" />
                <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
                <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  30 0 0 0 -9" result="speck" />
                <feComposite in="rough" in2="speck" operator="in" />
              </filter>
              <filter id={inkFilters.hero} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="21" result="warp" />
                <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" result="rough" />
                <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="5" result="grain" />
                <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  30 0 0 0 -9" result="speck" />
                <feComposite in="rough" in2="speck" operator="in" />
              </filter>
              <filter id={inkFilters.grain} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.16  0 0 0 0 0.2  0 0 0 1.6 -0.35" />
              </filter>
              <filter id={inkFilters.fleck} x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" />
                <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.2 -1.25" />
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
                background: SCREEN,
                color: INK,
                fontFamily: FONT,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
              }}
            >
              <ViewSwitch view={view} onChange={setView} uid={uid} />

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
                    view={view}
                    x={xs[i]}
                    peel={peel}
                    stamps={stamps}
                    cal={cal}
                    pressed={pressed}
                    inkFilters={inkFilters}
                    reduce={reduce}
                    onToggle={toggle}
                    onSwipe={(dir) => void advance(dir)}
                    draggedRef={draggedRef}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
