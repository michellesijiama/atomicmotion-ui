"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, animate, useMotionValue, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, PenLine, LoaderCircle, Home, SlidersHorizontal, Check } from "lucide-react";

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
  /** Open the days one after another until someone touches it (the gallery card sets it). */
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
const CARD_PAPER = "#FFFFFF";

/* ───────────────────────────── city diary artwork ───────────────────────────── */

type Scene = {
  kind: MomentKind;
  title: string;
  sentence: string;
  artwork: string;
};

// The demo treats Thursday, August 13 as today; Friday has not been written yet.
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
const STORAGE_KEY = "doodle-japan-diary-2026-08-v1";
type DiaryImage = { src: string; thumbnailSrc?: string; title: string; note: string };
const INITIAL_ENTRIES = Object.fromEntries(SCENES.slice(0, 13).map((scene, i) => [i + 1, scene.sentence]));
const INITIAL_IMAGES: Record<number, DiaryImage> = Object.fromEntries(SCENES.slice(0, 13).map((scene, i) => [i + 1, {
  src: `${ARTWORK_BASE}${scene.artwork}.webp`,
  thumbnailSrc: `${ARTWORK_BASE}${scene.artwork}-thumb.webp`,
  title: scene.title,
  note: scene.sentence,
}]));

function DiaryArtwork({ image, compact = false, blue = false }: { image: DiaryImage; compact?: boolean; blue?: boolean }) {
  const source = compact ? image.thumbnailSrc ?? image.src : image.src;
  const src = source.startsWith(ARTWORK_BASE) ? `${source}?v=pencil-3` : source;
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
  { label: "Coffee", pattern: /coffee|café|cafe|latte|espresso|kissaten|コーヒー|咖啡/i, artwork: "coffee", title: "A Cup of Coffee" },
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
const LAYOUT = { duration: 0.6, ease: [0.22, 1, 0.36, 1] } as const;
const PAGE_TRANSITION = { duration: 0.46, ease: [0.22, 1, 0.36, 1] } as const;

type DayState = "past" | "today" | "future";

export function DoodleCalendar({ today: todayProp = 13, loop = false, onSelect, className, onGenerateImage }: DoodleCalendarProps) {
  const today = Math.min(clampDay(todayProp), SCENES.length);
  const reduced = useReducedMotion() === true;
  const uid = React.useId();

  const [openDay, setOpenDay] = React.useState<number | null>(null);
  const [focusDay, setFocusDay] = React.useState(today);
  const [interacted, setInteracted] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterTopic, setFilterTopic] = React.useState<DiaryTopic>("all");
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  const filterPanelRef = React.useRef<HTMLDivElement>(null);
  const filterId = `${uid}-filters`;
  const pageX = useMotionValue(0);
  const [entries, setEntries] = React.useState<Record<number, string>>(INITIAL_ENTRIES);
  const [images, setImages] = React.useState<Record<number, DiaryImage>>(INITIAL_IMAGES);
  const [generatingDay, setGeneratingDay] = React.useState<number | null>(null);
  const [entryErrors, setEntryErrors] = React.useState<Record<number, string>>({});
  const storageReady = React.useRef(false);

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
    });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!storageReady.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, images })); }
    catch { /* The diary still works in this session if storage is unavailable. */ }
  }, [entries, images]);

  const illustrateEntry = async (day: number) => {
    const note = entries[day]?.trim();
    if (!note || generatingDay !== null) return;
    setEntryErrors((current) => ({ ...current, [day]: "" }));
    setGeneratingDay(day);
    try {
      const demo = demoImageFor(note);
      const image = onGenerateImage
        ? { src: await onGenerateImage(note, CALENDAR_DAYS[day - 1]), title: "Today’s Little Moment", note }
        : demo;
      if (!image) {
        setEntryErrors((current) => ({ ...current, [day]: "Try coffee, bento, exercise, trains, rain, home or a walk in this preview." }));
        return;
      }
      setImages((current) => ({ ...current, [day]: image }));
    } catch {
      setEntryErrors((current) => ({ ...current, [day]: "Couldn’t create the sketch. Please try again." }));
    } finally { setGeneratingDay(null); }
  };

  const hostRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef(1);
  const cells = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const openRef = React.useRef<number | null>(null);
  /** Set once a person, not the loop, has opened or touched the card — only then does focus move. */
  const byPersonRef = React.useRef(false);
  const returnFocusRef = React.useRef<number | null>(null);
  const onSelectRef = React.useRef(onSelect);
  React.useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
    if (openRef.current === null) pageX.set(-(day - 1) * PAGE_TRAVEL);
    openRef.current = day;
    setOpenDay(day);
    onSelectRef.current?.(CALENDAR_DAYS[day - 1]);
  }, [pageX]);

  const close = React.useCallback(() => {
    if (byPersonRef.current) returnFocusRef.current = openRef.current;
    openRef.current = null;
    setOpenDay(null);
  }, []);

  const goToOpenDay = React.useCallback(
    (requestedDay: number) => {
      const current = openRef.current;
      if (current === null) return;
      const next = Math.min(today, Math.max(1, requestedDay));
      if (next === current) return;
      byPersonRef.current = true;
      setInteracted(true);
      open(next);
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
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        navigateOpenDay(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDay, filterOpen, close, navigateOpenDay]);

  // The gallery card: open today's page, then each earlier day in turn, until touched.
  React.useEffect(() => {
    if (!loop || interacted || reduced) return;
    const order = [today, ...Array.from({ length: today - 1 }, (_, i) => i + 1)];
    let i = 0;
    let timer = 0;
    const show = () => {
      open(order[i % order.length]);
      timer = window.setTimeout(() => {
        openRef.current = null;
        setOpenDay(null);
        i += 1;
        timer = window.setTimeout(show, PAUSE_MS);
      }, HOLD_MS);
    };
    timer = window.setTimeout(show, 900);
    return () => window.clearTimeout(timer);
  }, [loop, interacted, reduced, today, open]);

  const touched = () => {
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
  const canSketch = openDay !== null && Boolean(entries[openDay]?.trim()) && generatingDay === null;
  React.useEffect(() => {
    if (openDay === null) return;
    const target = -(openDay - 1) * PAGE_TRAVEL;
    if (reduced) { pageX.set(target); return; }
    const playback = animate(pageX, target, PAGE_TRANSITION);
    return () => playback.stop();
  }, [openDay, pageX, reduced]);

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
                animate={{ opacity: openDay === null ? 1 : 0 }}
                transition={LAYOUT}
                style={{ left: PAD, top: HEAD_TOP_CLOSED, fontFamily: FONT_HANDWRITING, fontWeight: 400, fontSize: HEAD_SIZE, lineHeight: `${HEAD_LINE}px`, letterSpacing: "-0.02em", marginLeft: "-0.03em", color: activeText, pointerEvents: "none", zIndex: 2 }}
              >
                {MONTH_NAME}
                <span style={{ display: "block", fontWeight: 500, marginTop: 2 }}>{YEAR}</span>
              </motion.div>

              {/* The weekday row and the grid sit low on the glass: one column template, so labels stand exactly over their circles. */}
              <motion.div
                className="absolute"
                style={{ left: PAD, right: PAD, bottom: GRID_BOTTOM, zIndex: 2 }}
                animate={{ opacity: openDay === null ? 1 : 0 }}
                transition={openDay === null ? { duration: 0.22 } : { duration: 0.28 }}
                inert={openDay !== null}
              >
                <div role="grid" aria-label={`${MONTH_NAME} ${YEAR}`} onKeyDown={onGridKeyDown}>
                  <div
                    role="row"
                    className="grid"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)", columnGap: GAP, height: WEEKDAY_H, marginBottom: WEEKDAY_GAP }}
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
                  </div>

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
                              <div
                                key={col}
                                role="gridcell"
                                aria-label={`${MONTH_NAME} ${day}, still to come`}
                                className="flex items-center justify-center"
                                style={{ aspectRatio: "1 / 1" }}
                              >
                                <span
                                  aria-hidden="true"
                                  className="block size-full rounded-full"
                                  style={{ boxSizing: "border-box", border: `1.25px solid ${activeText}`, opacity: 0.86 }}
                                />
                              </div>
                            );
                          }
                          return (
                            <div key={col} role="gridcell" style={{ aspectRatio: "1 / 1" }}>
                              <DayCell
                                day={day}
                                info={CALENDAR_DAYS[day - 1]}
                                isToday={state === "today"}
                                image={images[day]}
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
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Tap outside the card to put it away. */}
              {scene ? <div className="absolute inset-0" style={{ zIndex: 3 }} onClick={close} aria-hidden="true" /> : null}

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
                    drag="x"
                    dragConstraints={{ left: -(today - 1) * PAGE_TRAVEL, right: 0 }}
                    dragElastic={reduced ? 0 : 0.025}
                    dragMomentum={false}
                    onDragStart={() => pageX.stop()}
                    onDragEnd={(_, gesture) => {
                      const shouldChange = Math.abs(gesture.offset.x) > CARD_W * 0.2 || Math.abs(gesture.velocity.x) > 360;
                      const next = shouldChange ? Math.min(today, Math.max(1, openDay + (gesture.offset.x < 0 ? 1 : -1))) : openDay;
                      if (next !== openDay) goToOpenDay(next);
                      else void animate(pageX, -(openDay - 1) * PAGE_TRAVEL, reduced ? { duration: 0 } : PAGE_TRANSITION);
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduced ? 0.1 : 0.22 }}
                    style={{
                      x: pageX,
                      left: CARD_X,
                      top: CARD_TOP,
                      width: today * PAGE_TRAVEL - CARD_GAP,
                      height: CARD_H,
                      touchAction: "pan-y",
                      cursor: "grab",
                      zIndex: 4,
                    }}
                  >
                    {Array.from({ length: today }, (_, index) => {
                      const day = index + 1;
                      const isActive = day === openDay;
                      const image = images[day];
                      const note = entries[day] ?? "";
                      const error = entryErrors[day];
                      return (
                        <React.Fragment key={day}>
                          <section
                            data-diary-day={day}
                            aria-hidden={isActive ? undefined : true}
                            inert={!isActive}
                            className="absolute overflow-hidden"
                            style={{
                              left: index * PAGE_TRAVEL,
                              width: CARD_W,
                              height: CARD_H,
                              borderRadius: CARD_RADIUS,
                              backgroundColor: CARD_PAPER,
                              pointerEvents: isActive ? "auto" : "none",
                            }}
                          >
                            <button
                              type="button"
                              aria-label={`Back to ${MONTH_NAME} ${YEAR} month view`}
                              disabled={!isActive}
                              onClick={close}
                              onPointerDown={(event) => event.stopPropagation()}
                              className="dc-date absolute m-0 border-0 bg-transparent p-0 text-left"
                              style={{ left: 12, top: 12, fontFamily: FONT_HANDWRITING, fontWeight: 400, fontSize: 40, lineHeight: "42px", color: activeText, cursor: isActive ? "pointer" : "default", zIndex: 1 }}
                            >
                              {CALENDAR_DAYS[day - 1].weekday}
                              <span className="block" style={{ marginTop: 2, color: day === today ? TODAY_BLUE : activeText }}>{day}</span>
                            </button>
                            <div className="absolute" style={{ top: DAY_HEADER_H, width: ART_W, height: ART_H }}>
                              {Math.abs(day - openDay) <= 1 ? image ? <DiaryArtwork image={image} blue={day === today} /> : (
                                <div className="flex size-full flex-col items-center justify-center gap-3" style={{ color: text(0.42, TEXT_RGB) }}>
                                  <PenLine size={28} strokeWidth={1.2} aria-hidden="true" />
                                  <span style={{ fontSize: 18 }}>A little moment from today.</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 flex flex-col" style={{ top: DAY_HEADER_H + ART_H, padding: "10px 12px 8px" }}>
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
                                onKeyDown={(event) => event.stopPropagation()}
                                placeholder="A coffee, a bento, a little exercise… what made today yours?"
                                rows={error ? 2 : 3}
                                className="dc-entry w-full resize-none outline-none"
                                style={{ fontFamily: FONT_HANDWRITING, fontWeight: 400, fontSize: 19, lineHeight: "23px", color: activeBodyText, backgroundColor: "transparent", border: 0, borderRadius: 0, marginTop: 8, minHeight: error ? 62 : 85, padding: "4px 0 8px", cursor: "text" }}
                              /> : <p className="m-0 mt-2" style={{ fontSize: 19, lineHeight: "23px", paddingTop: 4 }}>{note}</p>}
                              {isActive && error ? <p role="alert" className="m-0 mt-1" style={{ fontSize: 14, lineHeight: "16px" }}>{error}</p> : null}
                            </div>
                          </section>
                          {day < today ? (
                            <svg
                              aria-hidden="true"
                              className="pointer-events-none absolute"
                              width={CARD_GAP + 2}
                              height={60}
                              viewBox="0 0 16 60"
                              style={{ left: index * PAGE_TRAVEL + CARD_W - 1, top: CARD_H / 2 - 30 }}
                            >
                              <path d="M0 0 C1 19 4 26 8 26 C12 26 15 19 16 0 L16 60 C15 41 12 34 8 34 C4 34 1 41 0 60 Z" fill={CARD_PAPER} />
                            </svg>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <AnimatePresence>
                {openDay !== null ? (
                  <motion.nav
                    aria-label="Navigate completed dates"
                    className="absolute"
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                    transition={{ duration: reduced ? 0.1 : 0.2 }}
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
                      aria-label={generatingDay === openDay ? "Creating sketch" : onGenerateImage ? "Generate sketch" : "Preview sketch (demo)"}
                      title={onGenerateImage ? "Generate an illustration from this note" : "Preview a prepared demo illustration from this note"}
                      onClick={() => void illustrateEntry(openDay)}
                      onKeyDown={(event) => event.stopPropagation()}
                      disabled={!canSketch}
                      initial="rest"
                      whileHover={canSketch ? "hover" : undefined}
                      whileTap={canSketch && !reduced ? "pressed" : undefined}
                      transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      className="dc-sketch absolute top-0 flex items-center justify-center rounded-full border-0 bg-transparent p-0 disabled:opacity-35"
                      style={{ left: 52, width: 88, height: 44, color: activeText, cursor: canSketch ? "pointer" : "default" }}
                    >
                      <motion.span
                        className="flex"
                        variants={{ rest: { scale: 1, rotate: 0, y: 0 }, hover: reduced ? { scale: 1, rotate: 0, y: 0 } : { scale: 1.08, rotate: -5, y: -1 }, pressed: { scale: 0.96, rotate: 0, y: 0 } }}
                        transition={{ type: "spring", stiffness: 420, damping: 24 }}
                      >
                        {generatingDay === openDay ? <LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <PenLine size={20} strokeWidth={1.4} aria-hidden="true" />}
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
