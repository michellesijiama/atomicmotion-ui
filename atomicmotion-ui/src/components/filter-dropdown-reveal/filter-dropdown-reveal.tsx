"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type FilterDropdownRevealProps = {
  className?: string;
  loop?: boolean;
};

const FILTER_GROUPS = [
  {
    label: "Location",
    options: [
      "Beijing",
      "Los Angeles",
      "Milan",
      "Paris",
      "Rotterdam",
      "Shanghai",
      "Tokyo",
      "Toronto",
    ],
  },
  {
    label: "Status",
    options: ["Built", "Concept", "Exhibition", "In Progress", "Published", "Research"],
  },
  {
    label: "Typology",
    options: [
      "Adaptive Reuse",
      "Civic",
      "Culture",
      "Education",
      "Exhibition",
      "Gallery",
      "Hospitality",
      "Infrastructure",
      "Installation",
      "Mixed Use",
      "Office",
      "Product",
      "Residential",
      "Sports Infrastructure",
      "Transportation",
    ],
  },
] as const;

type FilterGroup = (typeof FILTER_GROUPS)[number]["label"];

const bellCurveEase = [0.45, 0, 0.55, 1] as const;

const panelTransition = {
  duration: 0.48,
  ease: bellCurveEase,
} as const;

export function FilterDropdownReveal({ className, loop = false }: FilterDropdownRevealProps) {
  const [activeGroup, setActiveGroup] = React.useState<FilterGroup | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!loop) return;

    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const openPanel = () => {
      setActiveGroup("Typology");
      closeTimer = setTimeout(() => setActiveGroup(null), 2300);
    };

    const startTimer = setTimeout(openPanel, 650);
    const interval = setInterval(openPanel, 5000);

    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [loop]);

  React.useEffect(() => {
    if (!activeGroup || loop) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setActiveGroup(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveGroup(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeGroup, loop]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent px-5 py-5 text-[var(--filterdrop-ink)]",
        className,
      )}
      style={
        {
          "--filterdrop-ink": "var(--jitter-ink, #0e1011)",
          "--filterdrop-muted": "var(--jitter-gray-600, #666)",
        } as React.CSSProperties
      }
    >
      <div className="relative w-full max-w-[620px] -translate-y-24">
        <div className="relative z-10 flex flex-wrap items-start gap-3">
          {FILTER_GROUPS.map((group) => {
            const isActive = activeGroup === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveGroup(isActive ? null : group.label)}
                  aria-expanded={isActive}
                  aria-haspopup="true"
                  className={cn(
                    "group inline-flex h-[42px] min-w-[112px] items-center justify-between gap-5 rounded-xl px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
                    isActive
                      ? "bg-[#999999] text-white"
                      : "bg-[#e6e6e6] text-[var(--filterdrop-ink)] hover:bg-[#dcdcdc]",
                  )}
                >
                  <span>{group.label}</span>
                  <span className="text-[25px] font-normal leading-none">
                    {isActive ? "-" : "+"}
                  </span>
                </button>

                <motion.div
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : 20,
                  }}
                  transition={panelTransition}
                  className="absolute left-0 top-[calc(100%+12px)] z-50 w-[min(360px,calc(100vw-48px))] overflow-hidden rounded-xl bg-[rgba(1,1,1,0.4)] p-6 text-white shadow-none backdrop-blur-[2px] will-change-transform"
                  aria-hidden={!isActive}
                  style={{ pointerEvents: isActive ? "auto" : "none" }}
                >
                  <div className="grid grid-cols-2 gap-x-3">
                    {group.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setActiveGroup(null)}
                        className="relative z-10 flex min-h-[31px] w-[150px] items-center overflow-hidden py-1.5 text-left text-[16px] leading-[1.2] text-white/50 transition-all duration-150 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      >
                        <span className="block overflow-hidden">
                          <motion.span
                            initial={false}
                            animate={{
                              opacity: isActive ? 1 : 0,
                              y: isActive ? 0 : "115%",
                            }}
                            transition={{
                              duration: isActive ? 0.42 : 0.18,
                              delay: isActive ? 0.1 + optionIndex * 0.018 : 0,
                              ease: bellCurveEase,
                            }}
                            className="block will-change-transform"
                          >
                            {option}
                          </motion.span>
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
