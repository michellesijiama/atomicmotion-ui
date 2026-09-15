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
  defaultTab?: "shop" | "features" | "about";
  /** Walk the tabs on their own, panel open, until someone clicks (the gallery card sets it). */
  loop?: boolean;
  className?: string;
};

type Tab = { id: "shop" | "features" | "about"; label: string; eyebrow: string; items: string[] };

const TABS: Tab[] = [
  { id: "shop", label: "Shop", eyebrow: "By Activity", items: ["Lifestyle", "Commute", "Active", "Walking", "Everyday"] },
  { id: "features", label: "Features", eyebrow: "Why it works", items: ["Waterproof", "Breathable", "Featherlight", "Grip", "Warmth"] },
  { id: "about", label: "About", eyebrow: "The studio", items: ["Story", "Materials", "Journal", "Stockists", "Contact"] },
];

const SKIN = {
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.6)",
  lime: "#D7F542",
  limeInk: "#1B2007",
};

// Reads the host's Manrope if it exposes one (the gallery does, via next/font),
// falls back to an installed Manrope, then to the system stack.
const FONT = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";

const BAR_H = 40;
const PANEL_W = 300;
const PANEL_H = 236;
const PANEL_GAP = 10;
const PANEL_RADIUS = 18;
const ROW_H = 34;
/** How long the pointer may be off the cluster before the panel folds. */
const CLOSE_DELAY = 140;
/** Gallery card: how often activation walks to the next tab. */
const LOOP_EVERY = 2600;

const bell = [0.45, 0, 0.55, 1] as const;

/**
 * Dark smoky glass. Reads as glass on a flat host too — a diagonal sheen, a
 * 1px rim of light along the top edge, a soft shadow — and over anything
 * colourful the backdrop blur takes over.
 */
const GLASS: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.09) 100%), rgba(44,46,42,0.6)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(255,255,255,0.07), 0 14px 36px rgba(0,0,0,0.2)",
};

/** A fine static grain over one pane of glass. Nothing here ever animates. */
function Grain() {
  const id = `grain-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "overlay", opacity: 0.16 }}
    >
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
        <feColorMatrix
          type="matrix"
          values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

export function GlassTabMenu({ defaultTab = "shop", loop = false, className }: GlassTabMenuProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = React.useState<Tab["id"]>(defaultTab);
  /** Which tab's panel is showing. Hover and focus drive this; clicks drive `active`. */
  const [open, setOpen] = React.useState<Tab["id"] | null>(loop ? defaultTab : null);
  const [interacted, setInteracted] = React.useState(false);
  const activeRef = React.useRef(active);
  React.useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const tabRefs = React.useRef<Partial<Record<Tab["id"], HTMLButtonElement | null>>>({});
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef(0);

  const show = React.useCallback((id: Tab["id"]) => {
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

  const activate = (id: Tab["id"]) => {
    setInteracted(true);
    setActive(id);
    show(id);
    tabRefs.current[id]?.focus();
  };

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, id: Tab["id"]) => {
    const i = TABS.findIndex((t) => t.id === id);
    const moves: Record<string, () => void> = {
      "ArrowRight": () => activate(TABS[(i + 1) % TABS.length].id),
      "ArrowLeft": () => activate(TABS[(i - 1 + TABS.length) % TABS.length].id),
      Home: () => activate(TABS[0].id),
      End: () => activate(TABS[TABS.length - 1].id),
      "ArrowDown": () => panelRef.current?.querySelector("button")?.focus(),
    };
    const run = moves[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  const onClusterKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    setOpen(null);
    tabRefs.current[active]?.focus();
  };

  const onClusterBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    hide();
  };

  const shown = TABS.find((t) => t.id === open) ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("relative flex h-full min-h-[420px] w-full items-center justify-center bg-transparent", className)}
        style={{ fontFamily: FONT }}
      >
        {/* The cluster: bar, gap, panel. Pointer and focus leaving it fold the panel. */}
        <div
          className="relative"
          style={{ width: PANEL_W, height: BAR_H + PANEL_GAP + PANEL_H }}
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
                  className="relative z-10 rounded-full px-[18px] text-[15px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/60"
                  style={{ height: BAR_H - 8, color: isActive ? SKIN.limeInk : SKIN.text }}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`${uid}-pill`}
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{ background: SKIN.lime, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
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
            animate={{ height: shown ? PANEL_H : 0, opacity: shown ? 1 : 0, y: shown ? 0 : -8 }}
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
                className="relative flex h-full flex-col px-5 pt-4"
              >
                <span className="text-[9px] font-medium tracking-[0.02em]" style={{ color: SKIN.textMuted }}>
                  {shown.eyebrow}
                </span>
                <ul
                  className="mt-5 flex-1 overflow-hidden"
                  style={{
                    maskImage: "linear-gradient(to bottom, #000 50%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, #000 50%, transparent 100%)",
                  }}
                >
                  {shown.items.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => setInteracted(true)}
                        className="flex w-full items-center text-left text-[15px] font-medium opacity-85 outline-none transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 rounded-md"
                        style={{ height: ROW_H, color: SKIN.text }}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
