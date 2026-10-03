"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [loopPressedGroup, setLoopPressedGroup] = React.useState<FilterGroup | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  // Below 760px of usable space, keep the panel in flow so every option can scroll.
  // The authored loop preview retains its original two-column composition.
  const panelClassName = cn(
    "absolute top-[calc(100%+12px)] z-50 overflow-hidden rounded-xl bg-[rgba(1,1,1,0.4)] text-white shadow-none backdrop-blur-[2px] will-change-transform",
    loop
      ? "left-[calc(50%-328px)] w-[336px] p-5"
      : "left-0 w-[min(360px,calc(100vw-48px))] p-6 @max-[760px]:relative @max-[760px]:top-auto @max-[760px]:order-2 @max-[760px]:w-full @max-[760px]:basis-full @max-[760px]:p-4",
  );
  const contentClassName = cn(
    "relative w-full",
    loop ? "max-w-[560px] -translate-y-24" : "max-w-[620px] -translate-y-24 @max-[760px]:max-h-full @max-[760px]:translate-y-0 @max-[760px]:overflow-y-auto @max-[760px]:overscroll-contain",
  );
  const filterRowClassName = cn(
    "relative z-10 flex items-start justify-center gap-3",
    loop ? "flex-nowrap" : "flex-wrap",
  );

  React.useEffect(() => {
    if (!loop) return;

    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const openPanel = () => {
      setActiveGroup(null);
      setLoopPressedGroup("Typology");

      openTimer = setTimeout(() => {
        setLoopPressedGroup(null);
        setActiveGroup("Typology");
        closeTimer = setTimeout(() => setActiveGroup(null), 2300);
      }, 190);
    };

    const pressTimer = setTimeout(openPanel, 2000);
    const interval = setInterval(openPanel, 5000);

    return () => {
      if (pressTimer) clearTimeout(pressTimer);
      if (openTimer) clearTimeout(openTimer);
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
        !loop && "@container",
        className,
      )}
      style={
        {
          "--filterdrop-ink": "var(--jitter-ink, #0e1011)",
          "--filterdrop-muted": "var(--jitter-gray-600, #666)",
        } as React.CSSProperties
      }
    >
      <div className={contentClassName}>
        <div className={filterRowClassName}>
          {FILTER_GROUPS.map((group) => {
            const isActive = activeGroup === group.label;
            const isLoopPressed = loopPressedGroup === group.label;

            return (
              <div key={group.label} className={cn("relative", !loop && "@max-[760px]:contents")}>
                <motion.button
                  type="button"
                  onClick={() => setActiveGroup(isActive ? null : group.label)}
                  aria-expanded={isActive}
                  aria-haspopup="true"
                  animate={{
                    scale: isLoopPressed ? 0.96 : 1,
                    y: isLoopPressed ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.18,
                    ease: bellCurveEase,
                  }}
                  whileTap={{ scale: 0.96, y: 1 }}
                  className={cn(
                    "group inline-flex h-[42px] min-w-[112px] items-center justify-between gap-5 rounded-xl px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
                    !loop && "@max-[760px]:order-1 @max-[760px]:h-11",
                    isActive
                      ? "bg-[#999999] text-white"
                      : "bg-[#e6e6e6] text-[var(--filterdrop-ink)] hover:bg-[#dcdcdc]",
                  )}
                >
                  <span>{group.label}</span>
                  <span className="text-[25px] font-normal leading-none">
                    {isActive ? "-" : "+"}
                  </span>
                </motion.button>

                <motion.div
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : 20,
                  }}
                  transition={panelTransition}
                  className={cn(panelClassName, !loop && !isActive && "@max-[760px]:hidden")}
                  aria-hidden={!isActive}
                  inert={!isActive}
                  style={{ pointerEvents: isActive ? "auto" : "none" }}
                >
                  <div className={cn("grid grid-cols-2 gap-x-3", !loop && "@max-[360px]:grid-cols-1")}>
                    {group.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => setActiveGroup(null)}
                        className={cn(
                          "relative z-10 flex min-h-[31px] items-center overflow-hidden py-1.5 text-left text-[16px] leading-[1.2] text-white/50 transition-all duration-150 ease-out hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                          loop ? "w-[136px]" : "w-[150px] @max-[760px]:min-h-11 @max-[760px]:w-full @max-[760px]:min-w-0 @max-[760px]:break-words",
                        )}
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
