"use client";

import * as React from "react";
import { MotionConfig, motion } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type GlassTabMenuProps = {
  /** Which tab wears the pill at first. Default "shop". */
  defaultTab?: "shop" | "features";
  /** A photo for the Features card. Without one, a dark glossy placeholder is drawn. */
  featureImage?: string;
  /** Alt text for that photo. */
  featureAlt?: string;
  /** Walk the tabs on their own, panel open, until someone takes over (the gallery card sets it). */
  loop?: boolean;
  className?: string;
};

type TabId = "shop" | "features";

type Tab =
  | { id: TabId; label: string; eyebrow: string; kind: "list"; items: string[] }
  | { id: TabId; label: string; eyebrow: string; kind: "media" };

const TABS: Tab[] = [
  { id: "shop", label: "Shop", eyebrow: "By Activity", kind: "list", items: ["Lifestyle", "Commute", "Active", "Walking", "Everyday"] },
  { id: "features", label: "Features", eyebrow: "100% Waterproof", kind: "media" },
];

const SKIN = {
  ink: "#3A3560",
  inkMuted: "rgba(58,53,96,0.55)",
  pill: "#F2C4E3",
  pillInk: "#4A2A48",
};

// Reads the host's Manrope if it exposes one (the gallery does, via next/font),
// falls back to an installed Manrope, then to the system stack.
const FONT = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";

const BAR_H = 40;
const PANEL_W = 300;
const PANEL_PAD = 20;
const PANEL_H_LIST = 236;
const PANEL_H_MEDIA = 292;
const PANEL_GAP = 10;
const PANEL_RADIUS = 18;
const ROW_H = 34;
/** How long the pointer may be off the cluster before the panel folds. */
const CLOSE_DELAY = 140;
/** Gallery card: how often activation walks to the next tab. */
const LOOP_EVERY = 2600;

const bell = [0.45, 0, 0.55, 1] as const;
/** The springs the pills slide on. */
const SLIDE = { type: "spring", stiffness: 420, damping: 34 } as const;
const PUSH = { type: "spring", stiffness: 380, damping: 32 } as const;

const panelHeight = (tab: Tab) => (tab.kind === "media" ? PANEL_H_MEDIA : PANEL_H_LIST);

/**
 * Frosted pink-lavender glass. Reads as glass on a flat host too — a bloom of
 * periwinkle and pink through the tint, a 1px rim of light along the top
 * edge — and over anything colourful the backdrop blur takes over.
 */
const GLASS: React.CSSProperties = {
  background:
    "radial-gradient(90% 120% at 18% 10%, rgba(242,196,227,0.55) 0%, transparent 55%), radial-gradient(80% 110% at 85% 90%, rgba(150,170,255,0.5) 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) 100%), rgba(196,190,240,0.62)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), inset 0 0 0 1px rgba(255,255,255,0.35)",
};

/** Lighter glass laid on the dark glass: the row-hover pill and the arrow. */
const GLASS_LIFT: React.CSSProperties = {
  background: "rgba(255,255,255,0.5)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
};

/** A fine static grain over one pane of glass. Nothing here ever animates. */
function Grain() {
  const id = `grain-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "soft-light", opacity: 0.45 }}
    >
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" />
        <feColorMatrix
          type="matrix"
          values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-medium tracking-[0.02em]" style={{ color: SKIN.inkMuted }}>
      {children}
    </span>
  );
}

type ListPanelProps = { items: string[]; uid: string; onInteract: () => void };

/**
 * The list: whichever row the pointer or focus is on gets a lighter glass
 * pill that slides between rows, with a round arrow at its end, while the
 * other rows dim. Hover state lives here so it resets when the panel swaps.
 */
function ListPanel({ items, uid, onInteract }: ListPanelProps) {
  const [hovered, setHovered] = React.useState<string | null>(null);
  return (
    <ul
      className="mt-5 flex-1 overflow-hidden"
      onPointerLeave={() => setHovered(null)}
      style={{
        maskImage: "linear-gradient(to bottom, #000 50%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 50%, transparent 100%)",
      }}
    >
      {items.map((item) => {
        const isHovered = hovered === item;
        return (
          <li key={item} className="relative">
            {isHovered && (
              <motion.span
                aria-hidden="true"
                layoutId={`${uid}-row`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={PUSH}
                className="absolute -inset-x-2 inset-y-0 rounded-[10px]"
                style={GLASS_LIFT}
              />
            )}
            <button
              type="button"
              onPointerEnter={() => setHovered(item)}
              onFocus={() => setHovered(item)}
              onBlur={() => setHovered((h) => (h === item ? null : h))}
              onClick={onInteract}
              className="relative flex w-full items-center justify-between rounded-md text-left text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#3A3560]/50"
              style={{
                height: ROW_H,
                color: SKIN.ink,
                opacity: hovered === null ? 0.85 : isHovered ? 1 : 0.45,
                transition: "opacity 220ms ease",
              }}
            >
              <span>{item}</span>
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -6, scale: isHovered ? 1 : 0.8 }}
                transition={{ duration: 0.22, ease: bell }}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.7)" }}
              >
                <svg width={14} height={14} viewBox="0 0 14 14">
                  <path d="M2.5 7h9M7.5 3l4 4-4 4" fill="none" stroke={SKIN.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type MediaPanelProps = { image?: string; alt?: string };

/** The Features card: a real photo when given one, otherwise a soft pink-lavender bloom. */
function MediaPanel({ image, alt }: MediaPanelProps) {
  return (
    <div
      className="relative mt-4 flex-1 overflow-hidden rounded-[12px]"
      style={{
        background:
          "radial-gradient(70% 60% at 30% 30%, rgba(255,214,236,0.95) 0%, transparent 60%), radial-gradient(70% 70% at 75% 70%, rgba(150,170,255,0.9) 0%, transparent 65%), linear-gradient(160deg, #E6E2FA 0%, #C9C6F0 60%, #B7BEF2 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {image ? (
        // A plain <img>: this file is meant to be copied out of Next.js.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={alt ?? ""} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <Grain />
    </div>
  );
}

export function GlassTabMenu({ defaultTab = "shop", featureImage, featureAlt, loop = false, className }: GlassTabMenuProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = React.useState<TabId>(defaultTab);
  /** Which tab's panel is showing. Hover and focus drive this; clicks drive `active`. */
  const [open, setOpen] = React.useState<TabId | null>(loop ? defaultTab : null);
  const [interacted, setInteracted] = React.useState(false);
  const activeRef = React.useRef(active);
  React.useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const tabRefs = React.useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef(0);

  const show = React.useCallback((id: TabId) => {
    window.clearTimeout(closeTimer.current);
    setOpen(id);
  }, []);

  // A short grace so crossing the gap between bar and panel doesn't flicker.
  const hide = React.useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY);
  }, []);

  React.useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Gallery card: walk the tabs on its own until someone takes over.
  React.useEffect(() => {
    if (!loop || interacted) return;
    const id = window.setInterval(() => {
      const i = TABS.findIndex((t) => t.id === activeRef.current);
      const next = TABS[(i + 1) % TABS.length].id;
      setActive(next);
      setOpen(next);
    }, LOOP_EVERY);
    return () => window.clearInterval(id);
  }, [loop, interacted]);

  const takeOver = React.useCallback(() => setInteracted(true), []);

  const activate = (id: TabId) => {
    setInteracted(true);
    setActive(id);
    show(id);
    tabRefs.current[id]?.focus();
  };

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, id: TabId) => {
    const i = TABS.findIndex((t) => t.id === id);
    const moves: Record<string, () => void> = {
      "ArrowRight": () => activate(TABS[(i + 1) % TABS.length].id),
      "ArrowLeft": () => activate(TABS[(i - 1 + TABS.length) % TABS.length].id),
      "Home": () => activate(TABS[0].id),
      "End": () => activate(TABS[TABS.length - 1].id),
      "ArrowDown": () => {
        show(id);
        // The rows mount on the next render; focus the first one after that.
        window.requestAnimationFrame(() => panelRef.current?.querySelector("button")?.focus());
      },
    };
    const run = moves[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  const onClusterKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    // Focus first: the tab's onFocus reopens the panel, and the close below
    // has to be the last word in this batch.
    tabRefs.current[active]?.focus();
    window.clearTimeout(closeTimer.current);
    setOpen(null);
  };

  const onClusterBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    hide();
  };

  const shown = TABS.find((t) => t.id === open) ?? null;
  const tallest = Math.max(...TABS.map(panelHeight));

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("relative flex h-full min-h-[420px] w-full items-center justify-center bg-transparent", className)}
        style={{ fontFamily: FONT }}
      >
        {/* The cluster: bar, gap, panel. Pointer and focus leaving it fold the panel. */}
        {/* Extra top margin equal to the panel's reach, so the bar itself sits at the host's centre and the panel hangs below it. */}
        <div
          className="relative"
          style={{ width: PANEL_W, height: BAR_H + PANEL_GAP + tallest, marginTop: PANEL_GAP + tallest }}
          onPointerLeave={hide}
          onBlur={onClusterBlur}
          onKeyDown={onClusterKey}
        >
          <nav
            aria-label="Primary"
            role="tablist"
            className="relative inline-flex items-center overflow-hidden rounded-full p-1"
            style={{ height: BAR_H, ...GLASS }}
          >
            <Grain />
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`${uid}-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onPointerEnter={() => show(tab.id)}
                  onFocus={() => show(tab.id)}
                  onClick={() => activate(tab.id)}
                  onKeyDown={(e) => onTabKey(e, tab.id)}
                  className={cn(
                    "relative z-10 rounded-full px-[18px] text-[15px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#3A3560]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E4E0F6]",
                    !isActive && "hover:bg-white/40"
                  )}
                  style={{ height: BAR_H - 8, color: isActive ? SKIN.pillInk : SKIN.ink }}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`${uid}-pill`}
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{ background: SKIN.pill, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
                      transition={SLIDE}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <motion.div
            ref={panelRef}
            id={`${uid}-panel`}
            role="tabpanel"
            aria-labelledby={shown ? `${uid}-tab-${shown.id}` : undefined}
            aria-hidden={!shown}
            initial={false}
            animate={{ height: shown ? panelHeight(shown) : 0, opacity: shown ? 1 : 0, y: shown ? 0 : -8 }}
            transition={{ duration: shown ? 0.5 : 0.28, ease: bell }}
            className="absolute left-0 overflow-hidden"
            style={{
              top: BAR_H + PANEL_GAP,
              width: PANEL_W,
              borderRadius: PANEL_RADIUS,
              pointerEvents: shown ? "auto" : "none",
              ...GLASS,
            }}
          >
            <Grain />
            {shown && (
              <motion.div
                key={shown.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: bell }}
                className="relative flex h-full flex-col pt-4"
                style={{ paddingLeft: PANEL_PAD, paddingRight: PANEL_PAD, paddingBottom: shown.kind === "media" ? PANEL_PAD : 0 }}
              >
                <Eyebrow>{shown.eyebrow}</Eyebrow>
                {shown.kind === "list" ? (
                  <ListPanel items={shown.items} uid={uid} onInteract={takeOver} />
                ) : (
                  <MediaPanel image={featureImage} alt={featureAlt} />
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
