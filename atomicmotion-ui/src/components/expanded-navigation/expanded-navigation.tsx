"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type ExpandedNavigationProps = {
  className?: string;
  loop?: boolean;
};

const MENU_ROWS = [
  { label: "Work", index: "01" },
  { label: "Studio", index: "02" },
  { label: "Journal", index: "03" },
];

const bellCurveEase = [0.45, 0, 0.55, 1] as const;

const panelTransition = {
  duration: 0.78,
  ease: bellCurveEase,
} as const;

// Frosted "mega menu" that expands over the page — the nav row sits inside the
// panel (madewithjitter-style), and the surface blurs the content behind it.
// Self-contained: scoped --expnav-* tokens, inline keyframes, no global CSS.
export function ExpandedNavigation({ className, loop = false }: ExpandedNavigationProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!loop) return;

    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const openPanel = () => {
      setOpen(true);
      closeTimer = setTimeout(() => setOpen(false), 2600);
    };

    const startTimer = setTimeout(openPanel, 700);
    const interval = setInterval(openPanel, 5400);

    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [loop]);

  React.useEffect(() => {
    if (!open || loop) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [loop, open, uid]);

  const Logo = (
    <span className="text-[18px] font-medium tracking-[-0.02em] text-[var(--expnav-ink)]">
      Atelier°
    </span>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent px-5 py-5 text-[var(--expnav-ink)]",
        className,
      )}
      style={
        {
          "--expnav-ink": "var(--jitter-ink, #0e1011)",
          "--expnav-muted": "var(--jitter-gray-600, #666)",
        } as React.CSSProperties
      }
    >
      <div className="relative w-full max-w-[460px] -translate-y-[142px]">
        {/* The nav row stays mounted and in-place; the panel expands behind it. */}
        <nav
          className="relative z-40 flex h-14 items-center justify-between px-6"
        >
          {Logo}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
            className={cn(
              "inline-flex h-7 w-[68px] shrink-0 items-center justify-center rounded-full text-[13px] text-[var(--expnav-ink)] transition-colors",
              open
                ? "bg-transparent hover:text-[var(--jitter-gray-600)]"
                : "bg-[#f5f5f5]/85 backdrop-blur-[72px] backdrop-saturate-150 hover:bg-[#eeeeee]/85",
            )}
          >
            Menu
          </button>
        </nav>

        {/* Expanded frosted panel, using the same reveal language as the site About panel. */}
        <motion.div
          id={`expnav-panel-${uid}`}
          initial={false}
          animate={{
            height: open ? 340 : 56,
            opacity: open ? 1 : 0,
          }}
          transition={panelTransition}
          className="absolute inset-x-0 top-0 z-30 overflow-hidden rounded-[28px] bg-[#f5f5f5]/85 backdrop-blur-[72px] backdrop-saturate-150"
          aria-hidden={!open}
          style={{ pointerEvents: open ? "auto" : "none" }}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: open ? 1 : 0,
              y: open ? 0 : 18,
            }}
            transition={{
              duration: open ? 0.58 : 0.22,
              delay: open ? 0.18 : 0,
              ease: bellCurveEase,
            }}
            className="flex h-full flex-col px-6 pb-6 pt-24"
          >
            <div>
              {MENU_ROWS.map((row) => (
                <button
                  key={row.index}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="group flex h-12 w-full items-center justify-between border-b border-black/10 text-left text-[15px] text-[var(--expnav-ink)] transition-colors hover:text-[var(--jitter-gray-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
                >
                  <span>{row.label}</span>
                  <span className="font-mono text-[13px] text-[var(--expnav-muted)]">
                    {row.index}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between text-[13px] text-[var(--jitter-gray-800)]">
              <a
                href="mailto:hello@atomicmotion.dev"
                className="transition-colors hover:text-[var(--expnav-ink)]"
              >
                hello@atomicmotion.dev
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="transition-colors hover:text-[var(--expnav-muted)]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
