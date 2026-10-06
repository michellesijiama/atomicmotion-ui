"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, animate, cubicBezier, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, PenLine, Home, SlidersHorizontal, Check, X, ArrowUp } from "lucide-react";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Doodle Calendar — small everyday moments from a life in Japan.
// The transparent monochrome artwork assets are listed in the README.

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The kind of place a day's page is drawn from. */
export type MomentKind = "meadow" | "woodland" | "garden" | "water" | "hills" | "coast" | "sky" | "city" | "daily";

export type CalendarDay = {
  /** Day of the month, 1–31. */
  day: number;
  /** Full English weekday, e.g. "Friday". */
  weekday: string;
  kind: MomentKind;
  title: string;
  sentence: string;
};

export type DoodleCalendarProps = {
  /** The day the calendar treats as today (August 2026), 1–31. Days before it are open; days after it are charcoal rings. */
  today?: number;
  /** Demonstrate writing and submitting a rainy-day note until someone touches it. Demo notes are never saved. */
  loop?: boolean;
  /** A day's page was opened — by a click, the keyboard, or the loop. */
  onSelect?: (day: CalendarDay) => void;
  className?: string;
  /** Optional real image service. Without this, Preview sketch uses prepared demo art. */
  onGenerateImage?: (note: string, day: CalendarDay) => Promise<string>;
};

/* ───────────────────────────── palette & type ───────────────────────────── */

/** Charcoal ink keeps the interface and city drawings entirely monochrome. */
const TEXT = "#242424";
const TEXT_RGB = "36 36 36";
const TODAY_BLUE = "#0041FF";
const text = (a: number, rgb = TEXT_RGB) => `rgb(${rgb} / ${a})`;
const PAPER = "#F0F0F0";

type DayTheme = { paper: string; ink: string; inkRgb: string };
/** One monochrome theme keeps the calendar visually continuous from day to day. */
const DAY_THEMES: readonly DayTheme[] = [
  ...Array.from({ length: 14 }, () => ({ paper: PAPER, ink: TEXT, inkRgb: TEXT_RGB })),
];
const FONT_HANDWRITING = "var(--font-caveat, Caveat), 'Kaiti SC', STKaiti, cursive";

/* ───────────────────────────── layout tokens ───────────────────────────── */

// A real iPhone is about 1 : 2.06 outside and 1 : 2.17 across the glass. Everything
// hangs off these: the heading and calendar columns share PAD. Date cards have
// their own inset so neighboring cards remain visible. Circle spacing uses GAP.
const PHONE_W = 300;
const PHONE_H = 618;
const BEZEL = 0;
const SCREEN_RADIUS = 51;
const SCREEN_W = PHONE_W - BEZEL * 2;
const SCREEN_H = PHONE_H - BEZEL * 2;

const PAD = 22;
const GAP = 3;
const CELL = (SCREEN_W - PAD * 2 - GAP * 6) / 7;

const HEAD_SIZE = 44;
const HEAD_LINE = 46;
/** A little extra size keeps handwritten weekday labels easy to read. */
const WEEKDAY_SIZE = 18;
const WEEKDAY_H = 20;
const WEEKDAY_GAP = 8;
/** Gap between the last row and the bottom of the glass — the grid sits low, like a desk calendar. */
const GRID_BOTTOM = 36;

/* ───────────────────────────── the month ───────────────────────────── */

const YEAR = 2026;
const MONTH_NAME = "August";
const DAYS_IN_MONTH = 31;
/** August 1st, 2026 is a Saturday — the sixth column of a Monday-first week. */
const FIRST_COLUMN = 5;
const WEEKS = 6;

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const clampDay = (d: number) => Math.min(DAYS_IN_MONTH, Math.max(1, Math.round(d)));

// The month and its grid are one composition low on the glass, with the top of the
// screen left as quiet paper. Each opened card carries its own weekday and date.
const GRID_H = WEEKDAY_H + WEEKDAY_GAP + WEEKS * CELL + (WEEKS - 1) * GAP;
const HEAD_BLOCK = HEAD_LINE * 2 + 2;
const HEAD_GAP = 30;
const HEAD_TOP_CLOSED = SCREEN_H - GRID_BOTTOM - GRID_H - HEAD_GAP - HEAD_BLOCK;

// The card: a drawing over one date, one title and one sentence, ending well above the
// bottom of the screen.
const NAV_INSET = 32;
const NAV_TOP = 28;
const CARD_X = 28;
const CARD_BOTTOM = 70;
const ART_W = SCREEN_W - CARD_X * 2;
/** Pencil illustrations sit above each card’s diary entry. */
const ART_H = 192;
const TEXT_H = 168;
const DAY_HEADER_H = 100;
const CARD_W = ART_W;
const CARD_H = DAY_HEADER_H + ART_H + TEXT_H;
const CARD_TOP = SCREEN_H - CARD_BOTTOM - CARD_H;
const CARD_GAP = 14;
const PAGE_TRAVEL = CARD_W + CARD_GAP;
const CARD_RADIUS = 34;
const GRID_TOP = SCREEN_H - GRID_BOTTOM - GRID_H;

type Rect = { x: number; y: number; w: number; h: number };
type MorphState = { day: number; direction: "open" | "close" };
/** Where a day's circle sits on the screen, from the same constants the grid is laid out with. */
function gridCellRect(day: number): Rect {
  const index = day - 1 + FIRST_COLUMN;
  const row = Math.floor(index / 7);
  const col = index % 7;
  return { x: PAD + col * (CELL + GAP), y: GRID_TOP + WEEKDAY_H + WEEKDAY_GAP + row * (CELL + GAP), w: CELL, h: CELL };
}
const CARD_RECT: Rect = { x: CARD_X, y: CARD_TOP, w: CARD_W, h: CARD_H };
/** The square artwork is contained in ART_W × ART_H, so it draws ART_H wide, centred. */
const ART_RECT: Rect = { x: CARD_X + (ART_W - ART_H) / 2, y: CARD_TOP + DAY_HEADER_H, w: ART_H, h: ART_H };
const CARD_PAPER = "#FFFFFF";

/* ───────────────────────────── city diary artwork ───────────────────────────── */

type Scene = {
  kind: MomentKind;
  title: string;
  sentence: string;
  artwork: string;
};

// The demo treats Thursday, August 13 as today; its page starts blank for the visitor to write.
const SCENES: readonly Scene[] = [
  { kind: "daily", title: "Morning Coffee", sentence: "Stopped for a coffee at the little kissaten before work.", artwork: "coffee" },
  { kind: "daily", title: "A Little Bento", sentence: "Packed a bento with rice, tamagoyaki and vegetables for lunch.", artwork: "bento" },
  { kind: "daily", title: "Morning Movement", sentence: "Went for a short run, then stretched on the yoga mat.", artwork: "exercise" },
  { kind: "daily", title: "The Train Home", sentence: "Took the local train home and watched the stations go by.", artwork: "train" },
  { kind: "daily", title: "Rainy Afternoon", sentence: "Walked home under my umbrella after a sudden afternoon rain.", artwork: "rain" },
  { kind: "daily", title: "Laundry Day", sentence: "Did the laundry and watered the little plant on the balcony.", artwork: "home" },
  { kind: "daily", title: "A Quiet Walk", sentence: "Took a quiet walk past the neighborhood shrine after lunch.", artwork: "shrine" },
  { kind: "daily", title: "Lunch Break", sentence: "A bento on the park bench made a simple lunch feel special.", artwork: "bento" },
  { kind: "daily", title: "Slow Sunday", sentence: "Made coffee at home and let the morning go slowly.", artwork: "coffee" },
  { kind: "daily", title: "After Work Stretch", sentence: "Unrolled the yoga mat for a little exercise after work.", artwork: "exercise" },
  { kind: "daily", title: "An Umbrella Walk", sentence: "The rain made the familiar walk home feel a little different.", artwork: "rain" },
  { kind: "daily", title: "Window Seat", sentence: "Found a window seat on the train and read a few pages.", artwork: "train" },
  { kind: "daily", title: "Little Home Rituals", sentence: "Folded the laundry, watered the plant, and opened the balcony door.", artwork: "home" },
  { kind: "daily", title: "Today’s Little Moment", sentence: "Write about a small moment from your day.", artwork: "coffee" },
];

const CALENDAR_DAYS: readonly CalendarDay[] = SCENES.map((scene, i) => ({
  day: i + 1,
  weekday: WEEKDAYS_LONG[(FIRST_COLUMN + i) % 7],
  kind: scene.kind,
  title: scene.title,
  sentence: scene.sentence,
}));
const sceneOf = (day: number): Scene | undefined => SCENES[day - 1];
const ARTWORK_BASE = "/illustrations/doodle-calendar-diary/";
const STORAGE_KEY = "doodle-japan-diary-2026-08-v2";
type DiaryImage = { src: string; thumbnailSrc?: string; title: string; note: string };
const INITIAL_ENTRIES = Object.fromEntries(SCENES.slice(0, 12).map((scene, i) => [i + 1, scene.sentence]));
const INITIAL_IMAGES: Record<number, DiaryImage> = Object.fromEntries(SCENES.slice(0, 12).map((scene, i) => [i + 1, {
  src: `${ARTWORK_BASE}${scene.artwork}.webp`,
  thumbnailSrc: `${ARTWORK_BASE}${scene.artwork}-thumb.webp`,
  title: scene.title,
  note: scene.sentence,
}]));

/** The URL DiaryArtwork requests, so a preload warms the exact same cache entry. */
const artworkUrl = (source: string) => (source.startsWith(ARTWORK_BASE) ? `${source}?v=pencil-3` : source);
const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
    if (img.complete) resolve();
  });

function DiaryArtwork({ image, compact = false, blue = false }: { image: DiaryImage; compact?: boolean; blue?: boolean }) {
  const source = compact ? image.thumbnailSrc ?? image.src : image.src;
  const src = artworkUrl(source);
  if (blue) {
    return (
      <span
        role={compact ? undefined : "img"}
        aria-label={compact ? undefined : `Diary illustration: ${image.title}`}
        style={{
          display: "block",
          width: compact ? "100%" : ART_W,
          height: compact ? "100%" : ART_H,
          backgroundColor: TODAY_BLUE,
          maskImage: `url("${src}")`,
          maskSize: "contain",
          maskPosition: "center",
          maskRepeat: "no-repeat",
          pointerEvents: "none",
        }}
      />
    );
  }
  return (
    // The artwork is already sized and encoded; keep this usable in any React app.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={compact ? "" : `Black-and-white diary illustration: ${image.title}`}
      width={compact ? 128 : 960}
      height={compact ? 128 : 960}
      loading="eager"
      draggable={false}
      style={{ display: "block", width: compact ? "100%" : ART_W, height: compact ? "100%" : ART_H, objectFit: "contain", pointerEvents: "none" }}
    />
  );
}

const DIARY_TOPICS = [
  { label: "Coffee", pattern: /cof{1,2}e{1,2}|café|cafe|latte|espresso|kissaten|コーヒー|咖啡/i, artwork: "coffee", title: "A Cup of Coffee" },
  { label: "Bento", pattern: /bento|lunch|rice|tamagoyaki|弁当|便当|午饭|午餐/i, artwork: "bento", title: "A Little Bento" },
  { label: "Movement", pattern: /run|jog|exercise|gym|yoga|stretch|workout|运动|跑步|瑜伽|锻炼/i, artwork: "exercise", title: "A Little Movement" },
  { label: "Train rides", pattern: /train|commut|station|電車|电车|通勤|地铁/i, artwork: "train", title: "The Train Home" },
  { label: "Rainy days", pattern: /rain|umbrella|drizzle|雨|伞/i, artwork: "rain", title: "A Rainy Day" },
  { label: "Home rituals", pattern: /laundry|balcony|plant|watered|chores|家务|洗衣|阳台|浇花/i, artwork: "home", title: "Little Home Rituals" },
  { label: "Walks", pattern: /walk|shrine|temple|散步|神社|寺庙/i, artwork: "shrine", title: "A Quiet Walk" },
] as const;
type DiaryTopic = "all" | typeof DIARY_TOPICS[number]["artwork"];
const FILTER_OPTIONS = [{ id: "all" as const, label: "All moments" }, ...DIARY_TOPICS.map((topic) => ({ id: topic.artwork, label: topic.label }))];

// Demo matching is local and explicit; arbitrary text needs onGenerateImage.
function demoImageFor(note: string): DiaryImage | undefined {
  const topic = DIARY_TOPICS.find((topic) => topic.pattern.test(note));
  return topic ? { src: `${ARTWORK_BASE}${topic.artwork}.webp`, thumbnailSrc: `${ARTWORK_BASE}${topic.artwork}-thumb.webp`, title: topic.title, note } : undefined;
}

/* ───────────────────────────── the component ───────────────────────────── */

const HOLD_MS = 3800;
const PAUSE_MS = 700;
const DEMO_NOTE = "It rained today. I walked home under my umbrella.";
const LAYOUT = { duration: 0.6, ease: [0.22, 1, 0.36, 1] } as const;
const PAGE_SPRING = { type: "spring", stiffness: 320, damping: 34, mass: 1 } as const;
const PAGE_SCALE_EASE = cubicBezier(0.4, 0, 0.2, 1);
const PARALLAX_ART = 22;
const PARALLAX_HEAD = 10;
const SWIPE_VELOCITY = 420;
/** Even the instant demo shows the whole sketching moment. */
const SKETCH_MIN_MS = 4200;
const REVEAL_MS = 2600;
const GENERATE_TIMEOUT_MS = 8000;
const PRELOAD_TIMEOUT_MS = 3000;
const SKETCH_ERROR = "Couldn’t create the sketch. Please try again.";
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<"timeout">((resolve) => window.setTimeout(() => resolve("timeout"), ms))]);
const MORPH = { type: "spring", duration: 0.56, bounce: 0.1 } as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type DayState = "past" | "today" | "future";

export function DoodleCalendar({ today: todayProp = 13, loop = false, onSelect, className, onGenerateImage }: DoodleCalendarProps) {
  const today = Math.min(clampDay(todayProp), SCENES.length);
  const reduced = useReducedMotion() === true;
  const uid = React.useId();

  const [openDay, setOpenDay] = React.useState<number | null>(null);
  const [morph, setMorph] = React.useState<MorphState | null>(null);
  const morphRef = React.useRef<MorphState | null>(null);
  const morphTimerRef = React.useRef(0);
  const [morphCue, setMorphCue] = React.useState(false);
  const morphCueTimerRef = React.useRef(0);
  const endMorph = React.useCallback(() => {
    window.clearTimeout(morphTimerRef.current);
    window.clearTimeout(morphCueTimerRef.current);
    morphRef.current = null;
    setMorph(null);
    setMorphCue(false);
  }, []);
  const startMorph = React.useCallback((next: MorphState) => {
    window.clearTimeout(morphTimerRef.current);
    window.clearTimeout(morphCueTimerRef.current);
    morphRef.current = next;
    setMorph(next);
    setMorphCue(false);
    // The page is nearly home by now: let the text arrive over it.
    if (next.direction === "open") morphCueTimerRef.current = window.setTimeout(() => setMorphCue(true), 300);
    // Safety net: never leave the card locked if an animation callback is missed.
    morphTimerRef.current = window.setTimeout(endMorph, 1200);
  }, [endMorph]);
  React.useEffect(() => () => {
    window.clearTimeout(morphTimerRef.current);
    window.clearTimeout(morphCueTimerRef.current);
  }, []);
  const [focusDay, setFocusDay] = React.useState(today);
  const [interacted, setInteracted] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterTopic, setFilterTopic] = React.useState<DiaryTopic>("all");
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  const filterPanelRef = React.useRef<HTMLDivElement>(null);
  const filterId = `${uid}-filters`;
  const pageX = useMotionValue(0);
  /** Velocity of the finger when a swipe let go, handed to the next snap. */
  const releaseVelocityRef = React.useRef(0);
  const [entries, setEntries] = React.useState<Record<number, string>>(INITIAL_ENTRIES);
  const [images, setImages] = React.useState<Record<number, DiaryImage>>(INITIAL_IMAGES);
  const [entryErrors, setEntryErrors] = React.useState<Record<number, string>>({});
  const [composing, setComposing] = React.useState(false);
  const [sketchPhase, setSketchPhase] = React.useState<"idle" | "glow" | "reveal">("idle");
  const [demoEntry, setDemoEntry] = React.useState<{ note: string; image?: DiaryImage } | null>(null);
  const [demoPressed, setDemoPressed] = React.useState(false);
  const demoActiveRef = React.useRef(false);
  const sketchingRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  React.useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  /** Pencil button starts writing with the caret at the end; a tap keeps the browser's caret. */
  const caretToEndRef = React.useRef(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const storageReady = React.useRef(false);
  const [diaryReady, setDiaryReady] = React.useState(false);
  const hasTodayEntry = Boolean(entries[today]?.trim() || images[today]);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.entries && saved.images && typeof saved.entries === "object" && typeof saved.images === "object") {
            const cleanEntries: Record<number, string> = {};
            const cleanImages: Record<number, DiaryImage> = {};
            for (let day = 1; day <= SCENES.length; day++) {
              if (typeof saved.entries[day] === "string") cleanEntries[day] = saved.entries[day];
              const image = saved.images[day];
              if (image && typeof image.src === "string" && /^(\/illustrations\/|data:image\/|https?:\/\/)/.test(image.src) && typeof image.title === "string" && typeof image.note === "string") cleanImages[day] = image;
            }
            setEntries(cleanEntries);
            setImages(cleanImages);
          }
        }
      } catch { /* Private browsing or malformed storage keeps the sample diary available. */ }
      storageReady.current = true;
      setDiaryReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!storageReady.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, images })); }
    catch { /* The diary still works in this session if storage is unavailable. */ }
  }, [entries, images]);

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const openRef = React.useRef<number | null>(null);
  /** Set once a person, not the loop, has opened or touched the card — only then does focus move. */
  const byPersonRef = React.useRef(false);

  const failSketch = (day: number) => {
    setEntryErrors((current) => ({ ...current, [day]: SKETCH_ERROR }));
    setSketchPhase("idle");
  };

  const illustrateEntry = async (day: number) => {
    const note = entries[day]?.trim();
    if (!note || sketchingRef.current) return;
    setComposing(false);
    textareaRef.current?.blur();
    if (byPersonRef.current) dialogRef.current?.focus({ preventScroll: true });
    setEntryErrors((current) => ({ ...current, [day]: "" }));
    sketchingRef.current = true;
    setSketchPhase("glow");
    try {
      const demo = demoImageFor(note);
      const generation: Promise<DiaryImage | undefined | "timeout"> = onGenerateImage
        ? withTimeout(onGenerateImage(note, CALENDAR_DAYS[day - 1]).then((src): DiaryImage => ({ src, title: "Today’s Little Moment", note })), GENERATE_TIMEOUT_MS)
        : Promise.resolve(demo);
      const [image] = await Promise.all([generation, wait(reduced ? 300 : SKETCH_MIN_MS)]);
      if (!mountedRef.current) return;
      if (image === "timeout") {
        failSketch(day);
        return;
      }
      if (!image) {
        setSketchPhase("idle");
        return;
      }
      // Warm the thumbnail too, so the month circle never pops in late; never wait on it for long.
      await withTimeout(
        Promise.all([preloadImage(artworkUrl(image.src)), image.thumbnailSrc ? preloadImage(artworkUrl(image.thumbnailSrc)) : Promise.resolve()]),
        PRELOAD_TIMEOUT_MS,
      );
      if (!mountedRef.current) return;
      setImages((current) => ({ ...current, [day]: image }));
      setSketchPhase("reveal");
      await wait(reduced ? 200 : REVEAL_MS);
      if (!mountedRef.current) return;
      setSketchPhase("idle");
    } catch {
      if (!mountedRef.current) return;
      failSketch(day);
    } finally {
      sketchingRef.current = false;
    }
  };

  const startComposing = () => {
    if (openRef.current === null || sketchingRef.current) return;
    byPersonRef.current = true;
    caretToEndRef.current = true;
    setComposing(true);
  };
  const cancelComposing = () => {
    setComposing(false);
    textareaRef.current?.blur();
    if (byPersonRef.current) dialogRef.current?.focus({ preventScroll: true });
  };

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef(1);
  const cells = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const returnFocusRef = React.useRef<number | null>(null);
  const onSelectRef = React.useRef(onSelect);
  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Writing started from the pencil puts the caret at the end of the note; a tap keeps its own caret.
  React.useEffect(() => {
    if (!composing) return;
    if (!caretToEndRef.current) return;
    caretToEndRef.current = false;
    const field = textareaRef.current;
    if (!field) return;
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }, [composing]);

  // Scale the true-size phone down to the space it has, so it is always whole.
  React.useEffect(() => {
    const host = hostRef.current;
    const fit = fitRef.current;
    if (!host || !fit) return;
    const apply = () => {
      const scale = Math.max(0.3, Math.min(1, (host.clientWidth - 24) / PHONE_W, (host.clientHeight - 24) / PHONE_H));
      scaleRef.current = scale;
      fit.style.transform = `scale(${scale.toFixed(4)})`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // The phone is drawn under a CSS scale; tell framer's layout measuring about it
  // so the circle-to-card move starts exactly where the circle is.
  const transformPagePoint = React.useCallback((p: { x: number; y: number }) => ({ x: p.x / scaleRef.current, y: p.y / scaleRef.current }), []);

  const open = React.useCallback((day: number) => {
    if (openRef.current === null) {
      if (morphRef.current) return;
      pageX.set(-(day - 1) * PAGE_TRAVEL);
      if (!reduced) startMorph({ day, direction: "open" });
    }
    openRef.current = day;
    setOpenDay(day);
    onSelectRef.current?.(CALENDAR_DAYS[day - 1]);
  }, [pageX, reduced, startMorph]);

  const close = React.useCallback(() => {
    if (sketchingRef.current) return;
    const day = openRef.current;
    if (day === null) return;
    if (morphRef.current) return;
    if (byPersonRef.current) returnFocusRef.current = day;
    setComposing(false);
    openRef.current = null;
    setOpenDay(null);
    if (!reduced) startMorph({ day, direction: "close" });
  }, [reduced, startMorph]);

  const goToOpenDay = React.useCallback(
    (requestedDay: number): boolean => {
      const current = openRef.current;
      if (current === null) return false;
      if (sketchingRef.current) return false;
      if (morphRef.current) return false;
      const next = Math.min(today, Math.max(1, requestedDay));
      if (next === current) return false;
      byPersonRef.current = true;
      setInteracted(true);
      setComposing(false);
      open(next);
      return true;
    },
    [open, today],
  );

  const navigateOpenDay = React.useCallback(
    (delta: -1 | 1) => {
      const current = openRef.current;
      if (current === null) return;
      goToOpenDay(current + delta);
    },
    [goToOpenDay],
  );

  // A person opened it: put focus on the detail panel so Escape is immediately
  // available. Once it closes, hand focus back to the day they opened from.
  React.useEffect(() => {
    if (openDay !== null) {
      if (byPersonRef.current) dialogRef.current?.focus({ preventScroll: true });
    } else if (returnFocusRef.current !== null) {
      cells.current[returnFocusRef.current]?.focus({ preventScroll: true });
      returnFocusRef.current = null;
      byPersonRef.current = false;
    }
  }, [openDay]);

  React.useEffect(() => {
    if (openDay === null || filterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      if (sketchPhase !== "idle") return;
      if (e.key === "Escape") { if (composing) cancelComposing(); else close(); }
      else if (composing) return;
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        navigateOpenDay(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDay, filterOpen, close, navigateOpenDay, composing, sketchPhase]);

  const stopDemo = React.useCallback(() => {
    if (!demoActiveRef.current) return;
    demoActiveRef.current = false;
    sketchingRef.current = false;
    setDemoEntry(null);
    setDemoPressed(false);
    setComposing(false);
    setSketchPhase("idle");
  }, []);

  // A separate, unsaved entry demonstrates the whole flow without changing the visitor's diary.
  React.useEffect(() => {
    if (!loop || !diaryReady || interacted) return;
    // Once today's own note exists, reopen it instead of covering it with the sample.
    if (hasTodayEntry) {
      let cancelled = false;
      queueMicrotask(() => { if (!cancelled) open(today); });
      return () => { cancelled = true; };
    }
    if (reduced) return;
    let cancelled = false;
    let timer = 0;
    const pause = (ms: number) => new Promise<boolean>((resolve) => {
      timer = window.setTimeout(() => resolve(!cancelled), ms);
    });
    const show = async () => {
      if (!await pause(900)) return;
      demoActiveRef.current = true;
      const image = demoImageFor(DEMO_NOTE);
      if (!image) return;
      void preloadImage(artworkUrl(image.src));
      void preloadImage(artworkUrl(image.thumbnailSrc!));
      while (!cancelled) {
        setDemoEntry({ note: "" });
        open(today);
        if (!await pause(1300)) return;
        setComposing(true);
        if (!await pause(450)) return;
        for (let length = 1; length <= DEMO_NOTE.length; length++) {
          setDemoEntry({ note: DEMO_NOTE.slice(0, length) });
          if (!await pause(48)) return;
        }
        if (!await pause(650)) return;
        setDemoPressed(true);
        if (!await pause(180)) return;
        setDemoPressed(false);
        setComposing(false);
        sketchingRef.current = true;
        setSketchPhase("glow");
        if (!await pause(SKETCH_MIN_MS)) return;
        setDemoEntry({ note: DEMO_NOTE, image });
        setSketchPhase("reveal");
        if (!await pause(REVEAL_MS)) return;
        setSketchPhase("idle");
        sketchingRef.current = false;
        if (!await pause(HOLD_MS)) return;
        close();
        if (!await pause(1300)) return;
        setDemoEntry(null);
        if (!await pause(PAUSE_MS)) return;
      }
    };
    void show();
    return () => { cancelled = true; window.clearTimeout(timer); stopDemo(); };
  }, [loop, diaryReady, hasTodayEntry, interacted, reduced, today, open, close, stopDemo]);

  const touched = () => {
    stopDemo();
    setInteracted(true);
    if (openRef.current !== null) byPersonRef.current = true;
  };

  const matchesTopic = (day: number, topicId: DiaryTopic = filterTopic) => {
    if (topicId === "all") return true;
    const topic = DIARY_TOPICS.find((topic) => topic.artwork === topicId);
    return topic?.pattern.test(entries[day] ?? images[day]?.note ?? "") ?? false;
  };
  const matchingDays = Array.from({ length: today }, (_, index) => index + 1).filter((day) => matchesTopic(day));
  const selectTopic = (topicId: DiaryTopic) => {
    setFilterTopic(topicId);
    setFilterOpen(false);
    const first = Array.from({ length: today }, (_, index) => index + 1).find((day) => matchesTopic(day, topicId));
    if (first !== undefined) setFocusDay(first);
    byPersonRef.current = false;
    returnFocusRef.current = null;
    close();
    filterButtonRef.current?.focus({ preventScroll: true });
  };

  React.useEffect(() => {
    if (!filterOpen) return;
    filterPanelRef.current?.querySelector<HTMLButtonElement>(`[data-filter-topic="${filterTopic}"]`)?.focus({ preventScroll: true });
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setFilterOpen(false);
      filterButtonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onEscape, true);
    return () => document.removeEventListener("keydown", onEscape, true);
  }, [filterOpen, filterTopic]);

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: number | undefined;
    if (e.key in step) {
      next = focusDay + step[e.key];
      while (next >= 1 && next <= today && !matchesTopic(next)) next += step[e.key];
      if (next < 1 || next > today) next = undefined;
    } else if (e.key === "Home") next = matchingDays[0];
    else if (e.key === "End") next = matchingDays[matchingDays.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    setFocusDay(next);
    cells.current[next]?.focus({ preventScroll: true });
  };

  const scene = openDay === null ? undefined : sceneOf(openDay);
  const info = openDay === null ? undefined : CALENDAR_DAYS[openDay - 1];
  const activeTheme = openDay === null ? undefined : DAY_THEMES[openDay - 1];
  const activePaper = activeTheme?.paper ?? PAPER;
  const activeText = activeTheme?.ink ?? TEXT;
  const activeTextRgb = activeTheme?.inkRgb ?? TEXT_RGB;
  const activeBodyText = activeText;
  const titleId = `${uid}-title`;
  const canGoPrevious = openDay !== null && openDay > 1;
  const canGoNext = openDay !== null && openDay < today;
  const canSubmit = openDay !== null && Boolean((demoEntry && openDay === today ? demoEntry.note : entries[openDay])?.trim()) && sketchPhase === "idle";
  React.useEffect(() => {
    if (openDay === null) return;
    const target = -(openDay - 1) * PAGE_TRAVEL;
    const velocity = releaseVelocityRef.current;
    releaseVelocityRef.current = 0;
    if (reduced) { pageX.set(target); return; }
    const playback = animate(pageX, target, { ...PAGE_SPRING, velocity });
    return () => playback.stop();
  }, [openDay, pageX, reduced]);

  const anchorDay = openDay ?? morph?.day ?? null;
  const flying = morph?.direction === "open";
  const gridHidden = openDay !== null;
  const recedeDelay = (day: number) => {
    if (anchorDay === null || reduced) return 0;
    const a = gridCellRect(anchorDay);
    const b = gridCellRect(day);
    const distance = Math.hypot((a.x - b.x) / (CELL + GAP), (a.y - b.y) / (CELL + GAP));
    return (gridHidden ? 0 : 0.14) + distance * 0.018;
  };
  const cellMotion = (day: number) => {
    const isAnchor = day === anchorDay;
    // The opened circle hands itself to the flying page at once, and is revealed only when the page lands.
    const landing = isAnchor && morph?.direction === "close";
    const hidden = gridHidden;
    return {
      initial: false as const,
      // The landing circle is masked by React state, not an animation, so it shows in the very commit the
      // flying page unmounts (an animated opacity would only start a frame later and blink). It stays focusable.
      style: { aspectRatio: "1 / 1", clipPath: landing ? "inset(100%)" : undefined },
      animate: hidden ? { opacity: 0, scale: isAnchor ? 1 : 0.86 } : { opacity: 1, scale: 1 },
      transition: isAnchor ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT, delay: recedeDelay(day) },
    };
  };

  return (
    <MotionConfig reducedMotion="user" transformPagePoint={transformPagePoint}>
      <LayoutGroup id={uid}>
        <div
          ref={hostRef}
          className={cn("relative flex size-full min-h-[420px] items-center justify-center overflow-clip", className)}
          style={{ fontFamily: FONT_HANDWRITING }}
          onPointerDownCapture={touched}
          onKeyDownCapture={touched}
        >
          <style>
            {`
              .dc-cell { outline: none; border-radius: 50%; }
              .dc-cell:focus-visible { outline: 2px solid ${activeText}; outline-offset: 2px; }
              .dc-dialog:focus-visible { outline: none; }
              .dc-date:focus-visible { outline: 2px solid ${activeText}; outline-offset: 3px; border-radius: 8px; }
              .dc-sketch:focus-visible { outline: 2px solid ${activeText}; outline-offset: 2px; }
              .dc-entry::placeholder { color: ${text(0.42)}; opacity: 1; }
            `}
          </style>

          <div ref={fitRef} className="relative shrink-0" style={{ width: PHONE_W, height: PHONE_H, transformOrigin: "50% 50%" }}>
            {/* The screen remains one uninterrupted soft-grey field in every state. */}
            <div
              className="absolute overflow-hidden"
              style={{
                inset: BEZEL,
                borderRadius: SCREEN_RADIUS,
                backgroundColor: activePaper,
                color: activeText,
                transition: "background-color 600ms ease, color 600ms ease",
              }}
            >
              <nav aria-label="Diary navigation" className="absolute inset-x-0" style={{ top: NAV_TOP, height: 44, zIndex: 9 }}>
                <motion.button
                  type="button"
                  aria-label="Home — month view"
                  title="Back to all days"
                  onClick={() => { setFilterTopic("all"); setFilterOpen(false); byPersonRef.current = false; returnFocusRef.current = null; close(); }}
                  whileHover={{ backgroundColor: "#E8E8E8" }}
                  whileTap={reduced ? undefined : { scale: 0.94 }}
                  className="dc-sketch absolute flex size-11 items-center justify-center rounded-full border-0 bg-white p-0"
                  style={{ left: NAV_INSET, color: TEXT, cursor: "pointer" }}
                >
                  <Home size={18} strokeWidth={1.5} aria-hidden="true" />
                </motion.button>
                {filterTopic !== "all" ? <span className="absolute inset-x-20 text-center" style={{ top: 10, fontSize: 18, lineHeight: "24px" }}>{FILTER_OPTIONS.find((option) => option.id === filterTopic)?.label}</span> : null}
                <motion.button
                  ref={filterButtonRef}
                  type="button"
                  aria-label="Filter diary"
                  aria-haspopup="dialog"
                  aria-expanded={filterOpen}
                  aria-controls={filterId}
                  title="Filter by diary topic"
                  onClick={() => setFilterOpen((current) => !current)}
                  whileHover={{ backgroundColor: filterTopic === "all" ? "#E8E8E8" : "#444444" }}
                  whileTap={reduced ? undefined : { scale: 0.94 }}
                  className="dc-sketch absolute flex size-11 items-center justify-center rounded-full border-0 p-0"
                  style={{ right: NAV_INSET, backgroundColor: filterTopic === "all" ? CARD_PAPER : TEXT, color: filterTopic === "all" ? TEXT : CARD_PAPER, cursor: "pointer" }}
                >
                  <SlidersHorizontal size={18} strokeWidth={1.5} aria-hidden="true" />
                </motion.button>
              </nav>

              {/* The month heading belongs to the calendar overview only. */}
              <motion.div
                aria-hidden={openDay !== null}
                inert={openDay !== null}
                className="absolute text-left"
                initial={false}
                animate={{ opacity: openDay === null ? 1 : 0, y: openDay === null ? 0 : -10 }}
                transition={openDay === null ? { ...LAYOUT, delay: reduced ? 0 : 0.18 } : { duration: 0.32, ease: EASE_OUT }}
                style={{ left: PAD, top: HEAD_TOP_CLOSED, fontFamily: FONT_HANDWRITING, fontWeight: 400, fontSize: HEAD_SIZE, lineHeight: `${HEAD_LINE}px`, letterSpacing: "-0.02em", marginLeft: "-0.03em", color: activeText, pointerEvents: "none", zIndex: 2 }}
              >
                {MONTH_NAME}
                <span style={{ display: "block", fontWeight: 500, marginTop: 2 }}>{YEAR}</span>
              </motion.div>

              {/* The weekday row and the grid sit low on the glass: one column template, so labels stand exactly over their circles. */}
              <div
                className="absolute"
                style={{ left: PAD, right: PAD, bottom: GRID_BOTTOM, zIndex: 2 }}
                inert={openDay !== null}
              >
                <div role="grid" aria-label={`${MONTH_NAME} ${YEAR}`} onKeyDown={onGridKeyDown}>
                  <motion.div
                    role="row"
                    className="grid"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: GAP, height: WEEKDAY_H, marginBottom: WEEKDAY_GAP }}
                    initial={false}
                    animate={{ opacity: openDay === null ? 1 : 0 }}
                    transition={{ duration: 0.28, delay: openDay === null && !reduced ? 0.2 : 0 }}
                  >
                    {WEEKDAYS_SHORT.map((w, i) => (
                      <div
                        key={w}
                        role="columnheader"
                        className="text-center"
                        style={{ fontSize: WEEKDAY_SIZE, lineHeight: `${WEEKDAY_H}px`, letterSpacing: "-0.01em", color: text(0.86, activeTextRgb), whiteSpace: "nowrap" }}
                      >
                        <abbr title={WEEKDAYS_LONG[i]} style={{ textDecoration: "none" }}>
                          {w}
                        </abbr>
                      </div>
                    ))}
                  </motion.div>

                  <div className="flex flex-col" style={{ rowGap: GAP }}>
                    {Array.from({ length: WEEKS }, (_, row) => (
                      <div key={row} role="row" className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: GAP }}>
                        {Array.from({ length: 7 }, (_, col) => {
                          const day = row * 7 + col - FIRST_COLUMN + 1;
                          if (day < 1 || day > DAYS_IN_MONTH) return <div key={col} role="gridcell" aria-hidden="true" />;
                          const state: DayState = day < today ? "past" : day === today ? "today" : "future";
                          const s = sceneOf(day);
                          if (state === "future" || !s) {
                            return (
                              <motion.div
                                key={col}
                                role="gridcell"
                                aria-label={`${MONTH_NAME} ${day}, still to come`}
                                className="flex items-center justify-center"
                                {...cellMotion(day)}
                              >
                                <span
                                  aria-hidden="true"
                                  className="block size-full rounded-full"
                                  style={{ boxSizing: "border-box", border: `1.25px solid ${activeText}`, opacity: 0.86 }}
                                />
                              </motion.div>
                            );
                          }
                          return (
                            <motion.div key={col} role="gridcell" {...cellMotion(day)}>
                              <DayCell
                                day={day}
                                info={CALENDAR_DAYS[day - 1]}
                                isToday={state === "today"}
                                image={demoEntry && day === today ? demoEntry.image : images[day]}
                                dimmed={!matchesTopic(day)}
                                tabbable={focusDay === day}
                                onFocus={() => setFocusDay(day)}
                                onOpen={() => {
                                  byPersonRef.current = true;
                                  setInteracted(true);
                                  open(day);
                                }}
                                register={(el) => {
                                  cells.current[day] = el;
                                }}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tap outside the card to put it away. */}
              {scene ? <div className="absolute inset-0" style={{ zIndex: 3 }} onClick={composing ? cancelComposing : close} aria-hidden="true" /> : null}

              <AnimatePresence initial={false}>
                {scene && info && openDay !== null ? (
                  <motion.div
                    key="diary-pages"
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    className="dc-dialog absolute"
                    drag={composing || sketchPhase !== "idle" ? false : "x"}
                    dragConstraints={{ left: -(today - 1) * PAGE_TRAVEL, right: 0 }}
                    dragElastic={reduced ? 0 : 0.16}
                    dragMomentum={false}
                    onDragStart={() => pageX.stop()}
                    onDragEnd={(_, gesture) => {
                      const flick = Math.abs(gesture.velocity.x) > SWIPE_VELOCITY;
                      const projected = gesture.offset.x + gesture.velocity.x * 0.18;
                      const shouldChange = flick || Math.abs(projected) > CARD_W * 0.28;
                      const towardNext = (flick ? gesture.velocity.x : gesture.offset.x) < 0;
                      const next = shouldChange ? Math.min(today, Math.max(1, openDay + (towardNext ? 1 : -1))) : openDay;
                      let moved = false;
                      if (next !== openDay) {
                        releaseVelocityRef.current = gesture.velocity.x;
                        moved = goToOpenDay(next);
                        if (!moved) releaseVelocityRef.current = 0;
                      }
                      if (!moved) {
                        void animate(pageX, -(openDay - 1) * PAGE_TRAVEL, reduced ? { duration: 0 } : { ...PAGE_SPRING, velocity: gesture.velocity.x });
                      }
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: reduced ? 0.1 : 0 } }}
                    transition={{ duration: reduced ? 0.1 : 0 }}
                    style={{
                      x: pageX,
                      left: CARD_X,
                      top: CARD_TOP,
                      width: today * PAGE_TRAVEL - CARD_GAP,
                      height: CARD_H,
                      touchAction: "pan-y",
                      cursor: composing || sketchPhase !== "idle" ? "default" : "grab",
                      zIndex: 4,
                    }}
                  >
                    <p role="status" aria-live="polite" className="sr-only">
                      {sketchPhase === "glow" ? "Sketching your drawing…" : sketchPhase === "reveal" ? "Your drawing is ready." : ""}
                    </p>
                    {Array.from({ length: today }, (_, index) => {
                      const day = index + 1;
                      const isActive = day === openDay;
                      const image = demoEntry && day === today ? demoEntry.image : images[day];
                      const note = demoEntry && day === today ? demoEntry.note : entries[day] ?? "";
                      const error = entryErrors[day] === SKETCH_ERROR ? SKETCH_ERROR : undefined;
                      const textShown = !(isActive && flying && !morphCue);
                      return (
                          <DiaryPage
                            key={day}
                            pageX={pageX}
                            index={index}
                            reduced={reduced}
                            stationary={flying}
                            data-diary-day={day}
                            aria-hidden={isActive ? undefined : true}
                            inert={!isActive}
                            className="absolute overflow-hidden"
                            style={{
                              left: index * PAGE_TRAVEL,
                              width: CARD_W,
                              height: CARD_H,
                              borderRadius: CARD_RADIUS,
                              backgroundColor: isActive && flying ? "transparent" : CARD_PAPER,
                              opacity: flying && !isActive ? 0 : 1,
                              transition: "opacity 220ms ease",
                              pointerEvents: isActive ? "auto" : "none",
                            }}
                          >
                            <AnimatePresence>{isActive && sketchPhase !== "idle" ? <SketchGlow key="sketch-glow" reduced={reduced} fading={sketchPhase === "reveal"} /> : null}</AnimatePresence>
                            <Parallax pageX={pageX} index={index} depth={reduced ? 0 : PARALLAX_HEAD} className="absolute" style={{ left: 12, top: 12, zIndex: 1 }}>
                            <motion.button
                              type="button"
                              aria-label={`Back to ${MONTH_NAME} ${YEAR} month view`}
                              disabled={!isActive}
                              onClick={close}
                              onPointerDown={(event) => event.stopPropagation()}
                              initial={false}
                              animate={{ opacity: textShown ? 1 : 0, y: textShown ? 0 : 6 }}
                              transition={{ duration: reduced ? 0.1 : 0.22, ease: EASE_OUT }}
                              className="dc-date relative m-0 border-0 bg-transparent p-0 text-left"
                              style={{ fontFamily: FONT_HANDWRITING, fontWeight: 400, fontSize: 40, lineHeight: "42px", color: activeText, cursor: isActive ? "pointer" : "default" }}
                            >
                              {CALENDAR_DAYS[day - 1].weekday}
                              <span className="block" style={{ marginTop: 2, color: day === today ? TODAY_BLUE : activeText }}>{day}</span>
                            </motion.button>
                            </Parallax>
                            <Parallax pageX={pageX} index={index} depth={reduced ? 0 : PARALLAX_ART} className="absolute" style={{ top: DAY_HEADER_H, width: ART_W, height: ART_H, opacity: isActive && flying ? 0 : 1 }}>
                              {Math.abs(day - openDay) <= 2 ? (() => {
                                const processing = isActive && sketchPhase === "glow";
                                const art = image ? <SketchInkReveal image={image} blue={day === today} reduced={reduced} active={isActive && sketchPhase === "reveal"} /> : (
                                  <DiaryPlaceholder reduced={reduced} active={isActive && !flying} />
                                );
                                return (
                                  <div className="relative size-full">
                                    <RevealWipe reduced={reduced} active={isActive} phase={isActive ? sketchPhase : "idle"} dimmed={isActive && composing}>
                                      {art}
                                    </RevealWipe>
                                    <AnimatePresence>
                                      {processing ? <motion.div
                                        key="writing-notebook"
                                        className="pointer-events-none absolute inset-0"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: reduced ? 0.1 : 0.45 }}
                                      >
                                        <DiaryPlaceholder reduced={reduced} active />
                                      </motion.div> : null}
                                    </AnimatePresence>
                                  </div>
                                );
                              })() : null}
                            </Parallax>
                            <motion.div
                              className="absolute inset-x-0 bottom-0 flex flex-col"
                              style={{ top: DAY_HEADER_H + ART_H, padding: "10px 12px 8px" }}
                              initial={false}
                              animate={{ opacity: textShown ? 1 : 0, y: textShown ? 0 : 6 }}
                              transition={{ duration: reduced ? 0.1 : 0.22, ease: EASE_OUT }}
                            >
                              <div className="flex items-center gap-1" style={{ marginTop: 6 }}>
                                <h3
                                  id={isActive ? titleId : undefined}
                                  className="m-0 min-w-0"
                                  style={{ fontFamily: FONT_HANDWRITING, fontWeight: 500, fontSize: 25, lineHeight: "28px", letterSpacing: "0", color: activeText }}
                                >
                                  {image?.title ?? "Today’s Little Moment"}
                                </h3>
                              </div>
                              {isActive ? <textarea
                                aria-label="Write about this day"
                                value={note}
                                onChange={(event) => { setEntries((current) => ({ ...current, [day]: event.target.value })); setEntryErrors((current) => ({ ...current, [day]: "" })); }}
                                onPointerDown={(event) => event.stopPropagation()}
                                ref={textareaRef}
                                readOnly={sketchPhase !== "idle"}
                                onFocus={() => { if (sketchPhase === "idle") setComposing(true); }}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                  if (event.key === "Escape" && composing) { event.preventDefault(); cancelComposing(); }
                                  else if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && composing) { event.preventDefault(); void illustrateEntry(day); }
                                }}
                                placeholder="A coffee, a bento, a little exercise… what made today yours?"
                                rows={error ? 2 : 3}
                                className="dc-entry w-full resize-none outline-none"
                                style={{ fontFamily: FONT_HANDWRITING, fontWeight: 400, fontSize: 19, lineHeight: "23px", color: activeBodyText, backgroundColor: "transparent", border: 0, borderRadius: 0, marginTop: 8, minHeight: error ? 62 : 85, padding: "4px 0 8px", cursor: "text" }}
                              /> : <p className="m-0 mt-2" style={{ fontSize: 19, lineHeight: "23px", paddingTop: 4 }}>{note}</p>}
                              {isActive && error ? <p role="alert" className="m-0 mt-1" style={{ fontSize: 14, lineHeight: "16px" }}>{error}</p> : null}
                            </motion.div>
                          </DiaryPage>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {morph ? (
                <MorphLayer
                  key={`${morph.direction}-${morph.day}`}
                  day={morph.day}
                  direction={morph.direction}
                  image={demoEntry && morph.day === today ? demoEntry.image : images[morph.day]}
                  blue={morph.day === today}
                  onDone={endMorph}
                />
              ) : null}
              <AnimatePresence mode="popLayout">
                {openDay !== null && !composing && sketchPhase === "idle" ? (
                  <motion.nav
                    key="date-nav"
                    aria-label="Navigate completed dates"
                    className="absolute"
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                    transition={{ duration: reduced ? 0.1 : 0.24, delay: reduced || openDay === null ? 0 : 0.22 }}
                    style={{ left: (SCREEN_W - 192) / 2, bottom: 18, width: 192, height: 44, zIndex: 6, color: activeBodyText }}
                  >
                    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 192 44">
                      <path d="M22 0 C30 0 36 5 40 11 C44 18 48 18 52 11 C56 4 64 0 74 0 H118 C128 0 136 4 140 11 C144 18 148 18 152 11 C156 4 162 0 170 0 A22 22 0 0 1 170 44 C162 44 156 40 152 33 C148 26 144 26 140 33 C136 40 128 44 118 44 H74 C64 44 56 40 52 33 C48 26 44 26 40 33 C36 40 30 44 22 44 A22 22 0 0 1 22 0 Z" fill={CARD_PAPER} />
                    </svg>
                    <motion.button
                      type="button"
                      aria-label="Previous completed date"
                      disabled={!canGoPrevious}
                      onClick={() => navigateOpenDay(-1)}
                      initial="rest"
                      whileHover={canGoPrevious ? "hover" : undefined}
                      whileTap={canGoPrevious && !reduced ? { scale: 0.94 } : undefined}
                      className="dc-sketch absolute left-0 top-0 flex size-11 items-center justify-center rounded-full border-0 bg-transparent p-0 disabled:opacity-28"
                      style={{ color: activeBodyText, cursor: canGoPrevious ? "pointer" : "default" }}
                    >
                      <motion.span
                        className="flex"
                        variants={{ rest: { x: 0 }, hover: { x: reduced ? 0 : -1.5 } }}
                        transition={{ duration: 0.16 }}
                      >
                        <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.6} />
                      </motion.span>
                    </motion.button>
                    <motion.button
                      type="button"
                      aria-label="Write a note"
                      title="Write a note, then sketch it"
                      onClick={startComposing}
                      disabled={sketchPhase !== "idle"}
                      initial="rest"
                      whileHover={sketchPhase === "idle" ? "hover" : undefined}
                      whileTap={sketchPhase === "idle" && !reduced ? "pressed" : undefined}
                      transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      className="dc-sketch absolute top-0 flex items-center justify-center rounded-full border-0 bg-transparent p-0 disabled:opacity-35"
                      style={{ left: 52, width: 88, height: 44, color: activeText, cursor: sketchPhase === "idle" ? "pointer" : "default" }}
                    >
                      <motion.span
                        className="flex"
                        variants={{ rest: { scale: 1, rotate: 0, y: 0 }, hover: reduced ? { scale: 1, rotate: 0, y: 0 } : { scale: 1.08, rotate: -5, y: -1 }, pressed: { scale: 0.96, rotate: 0, y: 0 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      >
                        <PenLine size={20} strokeWidth={1.4} aria-hidden="true" />
                      </motion.span>
                    </motion.button>
                    <motion.button
                      type="button"
                      aria-label="Next completed date"
                      disabled={!canGoNext}
                      onClick={() => navigateOpenDay(1)}
                      initial="rest"
                      whileHover={canGoNext ? "hover" : undefined}
                      whileTap={canGoNext && !reduced ? { scale: 0.94 } : undefined}
                      className="dc-sketch absolute right-0 top-0 flex size-11 items-center justify-center rounded-full border-0 bg-transparent p-0 disabled:opacity-28"
                      style={{ color: activeBodyText, cursor: canGoNext ? "pointer" : "default" }}
                    >
                      <motion.span
                        className="flex"
                        variants={{ rest: { x: 0 }, hover: { x: reduced ? 0 : 1.5 } }}
                        transition={{ duration: 0.16 }}
                      >
                        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.6} />
                      </motion.span>
                    </motion.button>
                  </motion.nav>
                ) : null}
                {openDay !== null && composing ? (
                  <motion.div
                    key="write-bar"
                    role="group"
                    aria-label="Sketch this note"
                    className="absolute flex items-center"
                    initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.96 }}
                    transition={{ duration: reduced ? 0.1 : 0.22, ease: EASE_OUT }}
                    style={{ left: (SCREEN_W - 192) / 2, bottom: 18, width: 192, height: 44, gap: 8, zIndex: 6 }}
                  >
                    <motion.button
                      type="button"
                      aria-label="Cancel writing"
                      onClick={cancelComposing}
                      whileHover={{ backgroundColor: "#E8E8E8" }}
                      whileTap={reduced ? undefined : { scale: 0.94 }}
                      className="dc-sketch flex size-11 shrink-0 items-center justify-center rounded-full border-0 p-0"
                      style={{ backgroundColor: CARD_PAPER, color: TEXT, cursor: "pointer" }}
                    >
                      <X size={18} strokeWidth={1.5} aria-hidden="true" />
                    </motion.button>
                    <motion.button
                      type="button"
                      aria-label={onGenerateImage ? "Generate sketch" : "Preview sketch (demo)"}
                      title={onGenerateImage ? "Generate an illustration from this note" : "Preview a prepared demo illustration from this note"}
                      disabled={!canSubmit}
                      animate={{ scale: demoPressed ? 0.96 : 1 }}
                      onClick={() => void illustrateEntry(openDay)}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Escape") { event.preventDefault(); cancelComposing(); }
                      }}
                      whileTap={canSubmit && !reduced ? { scale: 0.96 } : undefined}
                      className="dc-sketch flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border-0 px-4"
                      style={{ backgroundColor: "#000000", color: "#FFFFFF", fontFamily: FONT_HANDWRITING, fontSize: 21, lineHeight: "24px", cursor: canSubmit ? "pointer" : "default" }}
                    >
                      Sketch it
                      <ArrowUp size={16} strokeWidth={1.6} aria-hidden="true" />
                    </motion.button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <AnimatePresence>
                {filterOpen ? <React.Fragment>
                  <div aria-hidden="true" className="absolute inset-0" style={{ zIndex: 11 }} onClick={() => { setFilterOpen(false); filterButtonRef.current?.focus({ preventScroll: true }); }} />
                  <motion.div
                    id={filterId}
                    ref={filterPanelRef}
                    role="dialog"
                    aria-label="Filter diary topics"
                    className="absolute"
                    initial={{ opacity: 0, y: reduced ? 0 : -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -4 }}
                    transition={{ duration: reduced ? 0.1 : 0.16 }}
                    style={{ top: NAV_TOP + 56, left: PAD, right: PAD, padding: 14, border: "1px solid #D4D4D4", borderRadius: 22, backgroundColor: CARD_PAPER, zIndex: 12 }}
                  >
                    <p className="m-0 mb-2" style={{ fontSize: 24, lineHeight: "28px" }}>Show moments</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FILTER_OPTIONS.map((option) => <button
                        key={option.id}
                        type="button"
                        data-filter-topic={option.id}
                        aria-pressed={filterTopic === option.id}
                        onClick={() => selectTopic(option.id)}
                        className="dc-sketch flex items-center justify-between gap-1 rounded-xl border-0 px-2 py-2 text-left"
                        style={{ fontFamily: FONT_HANDWRITING, fontSize: 18, lineHeight: "22px", color: TEXT, backgroundColor: filterTopic === option.id ? PAPER : "transparent", cursor: "pointer" }}
                      >
                        {option.label}
                        {filterTopic === option.id ? <Check size={13} strokeWidth={1.6} aria-hidden="true" /> : null}
                      </button>)}
                    </div>
                    <p role="status" className="m-0 mt-2" style={{ fontSize: 15, lineHeight: "18px", color: text(0.55) }}>{matchingDays.length} matching {matchingDays.length === 1 ? "day" : "days"}</p>
                  </motion.div>
                </React.Fragment> : null}
              </AnimatePresence>

              <span
                aria-hidden="true"
                className="dc-app-outline pointer-events-none absolute inset-0"
                style={{ border: "1.25px solid #BEBEBE", borderRadius: SCREEN_RADIUS, zIndex: 10 }}
              />
            </div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

/** A quiet empty page, with the pencil following the line as it is written. */
function DiaryPlaceholder({ reduced, active }: { reduced: boolean; active: boolean }) {
  const writing = active && !reduced;
  const cycle = { duration: 3.6, repeat: Infinity, ease: "linear" as const };
  const times = [0, 0.16, 0.32, 0.48, 0.64, 0.82, 1];

  return (
    <div
      role="img"
      aria-label="An open notebook with a pencil writing on the page"
      className="flex size-full items-center justify-center"
      style={{ color: text(0.46, TEXT_RGB) }}
    >
      <svg width="176" height="142" viewBox="0 0 176 142" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M24 43 Q55 34 87 44 Q117 34 150 43 L155 108 Q120 100 87 111 Q55 100 19 108 Z" />
        <path d="M87 44 Q84 76 87 111 M24 47 L16 112 Q53 105 87 115 Q120 105 158 112 L150 47 M87 111 L87 115" opacity="0.65" />
        <g opacity="0.38">
          <path d="M35 59 Q54 55 73 59 M33 70 Q54 66 73 71 M32 82 Q51 78 72 83 M31 94 Q51 90 71 95" />
          <path d="M99 82 Q116 78 137 82 M99 94 Q117 90 139 94" />
        </g>
        <motion.path
          d="M99 67 q2 -4 4 -1 t4 0 t4 -1 t4 1 t4 0 t4 0"
          initial={false}
          animate={writing ? { pathLength: [0, 0.25, 0.5, 0.75, 1, 1, 0], opacity: [1, 1, 1, 1, 1, 0, 0] } : { pathLength: 1, opacity: 1 }}
          transition={writing ? { ...cycle, times } : { duration: 0 }}
        />
        <motion.g
          initial={false}
          animate={writing ? { x: [0, 6, 12, 18, 24, 24, 0], y: [0, -1, 1, -1, 0, -8, 0], rotate: [0, -2, 1, -2, 0, -5, 0] } : { x: 0, y: 0, rotate: 0 }}
          transition={writing ? { ...cycle, times } : { duration: 0 }}
          style={{ transformOrigin: "99px 67px" }}
        >
          <path d="M99 67 L103 56 L127 24 Q129 21 132 23 L135 25 Q138 27 135 30 L110 62 Z M103 56 L110 62 M106 59 L131 26 M126 26 L133 32 M99 67 L102 64" />
        </motion.g>
      </svg>
    </div>
  );
}

const GLOW_RING = 14; // thickness of the lit band along the inner edge, before blur
const GLOW_BLUR = 10;
const GEMINI_CONIC = "conic-gradient(from 0deg at 50% 50%, rgba(159,125,175,0.94) 0deg, rgba(56,123,213,0.96) 50deg, rgba(195,155,168,0.94) 110deg, rgba(206,170,152,0.92) 150deg, rgba(224,215,165,0.96) 180deg, rgba(206,170,152,0.92) 210deg, rgba(195,155,168,0.94) 250deg, rgba(56,123,213,0.96) 310deg, rgba(159,125,175,0.94) 360deg)";

/** Gemini-style light that runs along the inside of the card's edge while a drawing is being made. */
function SketchGlow({ reduced, fading }: { reduced: boolean; fading: boolean }) {
  const side = Math.hypot(CARD_W, CARD_H) + 180; // covers the card throughout rotation and the wider drift
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: fading ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: fading ? 0.8 : 0.5, ease: "easeInOut" }}
      style={{ filter: `blur(${GLOW_BLUR}px)` }}
    >
      {/* A ring the shape of the card: everything but the inner area, so only the edge band is lit. */}
      <div
        className="absolute overflow-hidden"
        style={{
          inset: -GLOW_BLUR,
          borderRadius: CARD_RADIUS + GLOW_BLUR,
          padding: GLOW_RING + GLOW_BLUR,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      >
        <motion.span
          className="absolute left-1/2 top-1/2 block"
          style={{ width: side, height: side, marginLeft: -side / 2, marginTop: -side / 2, background: GEMINI_CONIC }}
          animate={reduced ? { opacity: 0.9, rotate: 0, x: 0, y: 0 } : { rotate: [0, 360], x: [-44, 44, -44], y: [0, -56, 0, 56, 0], opacity: [0.9, 1, 0.9] }}
          transition={reduced ? { duration: 0.2 } : { rotate: { duration: 6.4, ease: "linear", repeat: Infinity }, x: { duration: 6.4, ease: "easeInOut", repeat: Infinity }, y: { duration: 7.2, ease: "easeInOut", repeat: Infinity }, opacity: { duration: 5.8, ease: "easeInOut", repeat: Infinity } }}
        />
      </div>
    </motion.div>
  );
}

/** Color briefly bleeds from the pencil strokes, then settles back to the day's ink. */
function SketchInkReveal({ image, blue, reduced, active }: { image: DiaryImage; blue: boolean; reduced: boolean; active: boolean }) {
  const src = artworkUrl(image.src);
  const inkMask: React.CSSProperties = {
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: "contain",
    maskPosition: "center",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    backgroundImage: GEMINI_CONIC,
  };
  const transition = { duration: REVEAL_MS / 1000, times: [0, 0.15, 0.42, 0.72, 1], ease: "easeInOut" as const };

  return (
    <div className="relative size-full">
      <motion.div
        className="size-full"
        initial={false}
        animate={{ opacity: active && !reduced ? [0.25, 0.3, 0.5, 0.85, 1] : 1 }}
        transition={active && !reduced ? transition : { duration: 0.15 }}
      >
        <DiaryArtwork image={image} blue={blue} />
      </motion.div>
      {active && !reduced ? (
        <span aria-hidden="true" className="dc-ink-bleed pointer-events-none absolute inset-0">
          <motion.span
            className="absolute inset-0 block"
            style={inkMask}
            initial={{ opacity: 0, filter: "blur(3px)" }}
            animate={{ opacity: [0, 0.85, 0.75, 0.35, 0], filter: ["blur(3px)", "blur(2.5px)", "blur(1.5px)", "blur(0.5px)", "blur(0px)"] }}
            transition={transition}
          />
          <motion.span
            className="absolute inset-0 block"
            style={inkMask}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.95, 0.45, 0] }}
            transition={transition}
          />
        </span>
      ) : null}
    </div>
  );
}

/**
 * One wrapper for the whole sketch flow so the artwork never remounts: hidden while
 * the glow gathers, wiped in from top-left like a pencil passing over the page, then rests.
 */
function RevealWipe({ reduced, active, phase, dimmed, children }: { reduced: boolean; active: boolean; phase: "idle" | "glow" | "reveal"; dimmed: boolean; children: React.ReactNode }) {
  const mask = "linear-gradient(115deg, #000 42%, transparent 58%)";
  const wiping = active && phase === "reveal";
  const resting = { opacity: dimmed ? 0.28 : 1, filter: "blur(0px)", scale: 1, maskPosition: "0% 0%" };
  const animateTo = active && phase === "glow"
    ? { opacity: 0, filter: "blur(8px)", scale: 1, maskPosition: "0% 0%" }
    : wiping
      ? reduced
        ? { opacity: [0, 1], filter: "blur(0px)", scale: 1, maskPosition: "0% 0%" }
        : { opacity: [1, 1], filter: ["blur(2px)", "blur(0px)"], scale: 1, maskPosition: ["100% 0%", "0% 0%"] }
      : resting;
  const transition = wiping
    ? { duration: reduced ? 0.2 : 0.85, ease: [0.4, 0, 0.2, 1] as const, opacity: { duration: reduced ? 0.2 : 0 } }
    : { duration: 0.45, ease: EASE_OUT };
  return (
    <motion.div
      className="size-full"
      initial={false}
      animate={animateTo}
      transition={transition}
      style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: "260% 100%", WebkitMaskSize: "260% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}
    >
      {children}
    </motion.div>
  );
}

/** The page's distance from the centre controls its size, so the motion follows the finger. */
function DiaryPage({ pageX, index, reduced, stationary, style, ...props }: React.ComponentProps<typeof motion.section> & { pageX: MotionValue<number>; index: number; reduced: boolean; stationary: boolean }) {
  const scale = useTransform(pageX, (value) => {
    if (reduced || stationary) return 1;
    const distance = Math.min(1, Math.abs((value + index * PAGE_TRAVEL) / PAGE_TRAVEL));
    return 1 - 0.05 * PAGE_SCALE_EASE(distance);
  });
  return <motion.section {...props} style={{ ...style, scale, transformOrigin: "50% 50%" }} />;
}

type ParallaxProps = {
  pageX: MotionValue<number>;
  index: number;
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** Content that trails its page a little as the strip slides, so the page feels like paper over a drawing. */
function Parallax({ pageX, index, depth, className, style, children }: ParallaxProps) {
  const x = useTransform(pageX, (value) => {
    const progress = Math.max(-1.5, Math.min(1.5, (value + index * PAGE_TRAVEL) / PAGE_TRAVEL));
    return -progress * depth;
  });
  return <motion.div className={className} style={{ ...style, x }}>{children}</motion.div>;
}

type MorphLayerProps = {
  day: number;
  direction: "open" | "close";
  image?: DiaryImage;
  blue: boolean;
  onDone: () => void;
};

/** A white page and its drawing that fly between a month circle and the card. */
function MorphLayer({ day, direction, image, blue, onDone }: MorphLayerProps) {
  const cell = gridCellRect(day);
  const inset = blue && image ? 3 : 0;
  const artCell: Rect = { x: cell.x + inset, y: cell.y + inset, w: cell.w - inset * 2, h: cell.h - inset * 2 };
  const opening = direction === "open";
  const paperFrom = opening ? { x: cell.x, y: cell.y, width: cell.w, height: cell.h, borderRadius: cell.w / 2 } : { x: CARD_RECT.x, y: CARD_RECT.y, width: CARD_RECT.w, height: CARD_RECT.h, borderRadius: CARD_RADIUS };
  const paperTo = opening ? { x: CARD_RECT.x, y: CARD_RECT.y, width: CARD_RECT.w, height: CARD_RECT.h, borderRadius: CARD_RADIUS } : { x: cell.x, y: cell.y, width: cell.w, height: cell.h, borderRadius: cell.w / 2 };
  const artAt = (r: Rect) => ({ x: r.x, y: r.y, scale: r.w / ART_RECT.w });
  const artFrom = artAt(opening ? artCell : ART_RECT);
  const artTo = artAt(opening ? ART_RECT : artCell);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ zIndex: 3 }}>
      <motion.div
        className="absolute left-0 top-0"
        initial={{ ...paperFrom, opacity: opening ? 0 : 1 }}
        animate={{ ...paperTo, opacity: opening ? 1 : 0 }}
        transition={{ ...MORPH, restDelta: 0.5, restSpeed: 10, opacity: { duration: 0.18, delay: opening ? 0 : 0.36, ease: "linear" } }}
        style={{ backgroundColor: CARD_PAPER }}
        onAnimationComplete={onDone}
      />
      {image ? (
        <motion.div
          className="absolute left-0 top-0"
          initial={artFrom}
          animate={artTo}
          transition={MORPH}
          style={{ width: ART_RECT.w, height: ART_RECT.h, transformOrigin: "0 0" }}
        >
          {/* The thumbnail is already loaded from the grid; the full drawing settles on top. */}
          <motion.span className="absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.12, delay: 0.12 }}><DiaryArtwork image={image} compact blue={blue} /></motion.span>
          <span className="absolute inset-0"><DiaryArtwork image={{ ...image, thumbnailSrc: undefined }} compact blue={blue} /></span>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── one day ───────────────────────────── */

type DayCellProps = {
  day: number;
  info: CalendarDay;
  isToday: boolean;
  image?: DiaryImage;
  dimmed: boolean;
  tabbable: boolean;
  onFocus: () => void;
  onOpen: () => void;
  register: (el: HTMLButtonElement | null) => void;
};

const DayCell = React.memo(function DayCell({ day, info, isToday, image, dimmed, tabbable, onFocus, onOpen, register }: DayCellProps) {
  return (
    <motion.button
      type="button"
      ref={register}
      className="dc-cell relative block size-full cursor-pointer border-0 bg-transparent p-0"
      tabIndex={tabbable && !dimmed ? 0 : -1}
      disabled={dimmed}
      aria-haspopup="dialog"
      aria-current={isToday ? "date" : undefined}
      style={{ color: isToday ? TODAY_BLUE : TEXT, opacity: dimmed ? 0.2 : 1 }}
      aria-label={`${info.weekday}, ${MONTH_NAME} ${day} — ${image?.title ?? info.title}`}
      onFocus={onFocus}
      onClick={onOpen}
      whileTap={{ scale: 0.94 }}
    >
      {/* Today has both a blue illustration and a blue circle, with no date badge. */}
      {isToday ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1.6px solid ${TODAY_BLUE}` }} /> : null}
      <span className="pointer-events-none absolute inset-0 block" style={{ zIndex: 3, padding: isToday && image ? 3 : 0 }} aria-hidden="true">
        {image ? <DiaryArtwork image={image} compact blue={isToday} /> : (
          <span className="flex size-full items-center justify-center rounded-full" style={{ border: isToday ? undefined : "1.25px solid currentColor" }}>
            <Plus size={14} strokeWidth={1.3} />
          </span>
        )}
      </span>
    </motion.button>
  );
});
