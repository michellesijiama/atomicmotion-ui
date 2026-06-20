"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type ExpandedNavigationProps = {
  className?: string;
};

const NAV_LINKS = ["Work", "Studio", "Journal"];

const MENU = [
  {
    heading: "Work",
    items: ["Selected projects", "Case studies", "Motion reels", "Archive"],
  },
  {
    heading: "Studio",
    items: ["About us", "Approach", "Careers", "Press kit"],
  },
  {
    heading: "Connect",
    items: ["Start a project", "Newsletter", "Instagram", "LinkedIn"],
  },
];

// Frosted "mega menu" that expands over the page — the nav row sits inside the
// panel (madewithjitter-style), and the surface blurs the content behind it.
// Self-contained: scoped --expnav-* tokens, inline keyframes, no global CSS.
export function ExpandedNavigation({ className }: ExpandedNavigationProps) {
  const uid = React.useId().replace(/[:]/g, "");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const panel = document.getElementById(`expnav-panel-${uid}`);
      if (panel && !panel.contains(event.target as Node)) setOpen(false);
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
  }, [open, uid]);

  const Logo = (
    <span className="text-[18px] font-medium tracking-[-0.02em] text-[var(--expnav-ink)]">
      Atelier°
    </span>
  );

  const navPillClass =
    "inline-flex h-9 items-center gap-2 rounded-full bg-white/70 px-2 pl-4 ring-1 ring-black/5 backdrop-blur-xl";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative isolate flex h-full min-h-full w-full flex-col overflow-hidden bg-[var(--expnav-surface)] px-5 py-5 text-[var(--expnav-ink)]",
        className,
      )}
      style={
        {
          "--expnav-ink": "var(--jitter-ink, #0e1011)",
          "--expnav-muted": "var(--jitter-gray-600, #666)",
          "--expnav-surface": "#ededec",
        } as React.CSSProperties
      }
    >
      <style>
        {`
          @keyframes expnav-fade-${uid} { from { opacity: 0 } to { opacity: 1 } }
          @keyframes expnav-rise-${uid} {
            from { opacity: 0; transform: translateY(14px) }
            to { opacity: 1; transform: translateY(0) }
          }
          .expnav-panel-${uid} { animation: expnav-fade-${uid} 0.3s cubic-bezier(0.22,1,0.36,1) both; }
          .expnav-item-${uid} { animation: expnav-rise-${uid} 0.5s cubic-bezier(0.22,1,0.36,1) both; }
          @media (prefers-reduced-motion: reduce) {
            .expnav-panel-${uid}, .expnav-item-${uid} { animation: none; }
          }
        `}
      </style>

      {/* Faux page content — sits behind the panel so the blur is visible. */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none px-6 pt-24">
        <p className="max-w-md text-[clamp(28px,6vw,54px)] font-medium leading-[1.05] tracking-[-0.03em] text-[var(--expnav-ink)]">
          Design studio for motion &amp; interface.
        </p>
        <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-white/60 ring-1 ring-black/5" />
          ))}
        </div>
      </div>

      {/* Collapsed top nav (hidden while the panel is open to avoid doubling). */}
      <nav
        className={cn(
          "relative z-10 flex items-center justify-between transition-opacity duration-200",
          open && "pointer-events-none opacity-0",
        )}
      >
        {Logo}
        <div className={navPillClass}>
          <ul className="hidden items-center gap-4 text-[14px] text-[var(--expnav-muted)] sm:flex">
            {NAV_LINKS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
            className="inline-flex h-7 items-center rounded-full bg-[var(--expnav-ink)] px-3.5 text-[13px] text-white transition-colors hover:bg-[var(--jitter-gray-800,#333)]"
          >
            Menu
          </button>
        </div>
      </nav>

      {/* Expanded frosted panel. */}
      {open ? (
        <div
          id={`expnav-panel-${uid}`}
          className={`expnav-panel-${uid} absolute inset-x-4 top-4 z-30`}
        >
          <div className="overflow-hidden rounded-[26px] bg-[#f1f1f1]/55 shadow-[0_24px_70px_rgba(0,0,0,0.12)] ring-1 ring-white/40 backdrop-blur-[60px] backdrop-saturate-150">
            {/* Nav row, now wrapped inside the panel. */}
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              {Logo}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 items-center rounded-full bg-[var(--expnav-ink)] px-3.5 text-[13px] text-white transition-colors hover:bg-[var(--jitter-gray-800,#333)]"
              >
                Close
              </button>
            </div>

            {/* Mega-menu content. */}
            <div className="grid grid-cols-3 gap-5 px-6 py-8 sm:gap-8 sm:px-8">
              {MENU.map((col, ci) => (
                <div
                  key={col.heading}
                  className={`expnav-item-${uid}`}
                  style={{ animationDelay: `${0.06 + ci * 0.05}s` }}
                >
                  <p className="mb-3 text-[12px] uppercase tracking-[0.12em] text-[var(--expnav-muted)]">
                    {col.heading}
                  </p>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          onClick={(e) => e.preventDefault()}
                          className="group inline-flex items-center gap-1 text-[15px] tracking-[-0.01em] text-[var(--expnav-ink)] transition-opacity hover:opacity-60 sm:text-[20px]"
                        >
                          {item}
                          <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
