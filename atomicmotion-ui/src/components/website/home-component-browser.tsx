"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ComponentCard } from "@/components/website/component-card";
import type { ComponentMeta } from "@/lib/component-registry";

type HomeComponentBrowserProps = {
  components: ComponentMeta[];
};

type FilterOption = {
  label: string;
  value: string;
};

const activeFilterTransition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
} as const;

function buildFilterOptions(components: ComponentMeta[]): FilterOption[] {
  const categories = Array.from(new Set(components.map((component) => component.category)));
  return [
    { label: "All", value: "all" },
    ...categories.map((category) => ({ label: category, value: category })),
  ];
}

function sortByCreatedDate(components: ComponentMeta[]) {
  return [...components].sort((a, b) => {
    const byDate = b.createdAt.localeCompare(a.createdAt);
    if (byDate !== 0) return byDate;

    return b.index.localeCompare(a.index);
  });
}

export function HomeComponentBrowser({ components }: HomeComponentBrowserProps) {
  const sortedComponents = React.useMemo(() => sortByCreatedDate(components), [components]);
  const filterOptions = buildFilterOptions(sortedComponents);
  const [activeFilter, setActiveFilter] = React.useState("all");
  const visibleComponents =
    activeFilter === "all"
      ? sortedComponents
      : sortedComponents.filter((component) => component.category === activeFilter);

  return (
    <section className="pb-10" aria-label="UI components">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.45, 0, 0.55, 1] }}
        className="mx-auto mb-10 max-w-none rounded-[22px] border border-black/15 bg-transparent p-2"
      >
        <div className="flex gap-2 overflow-x-auto">
          {filterOptions.map((option) => {
            const isActive = activeFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveFilter(option.value)}
                className="relative inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/15 px-5 text-[15px] leading-none text-[var(--jitter-ink)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
              >
                {isActive && (
                  <motion.span
                    layoutId="home-active-filter"
                    className="absolute inset-0 rounded-full bg-[#2f64ff]"
                    transition={activeFilterTransition}
                  />
                )}
                <span className={isActive ? "relative z-10 text-white" : "relative z-10"}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {visibleComponents.map((component) => (
            <motion.div
              key={component.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.32, ease: [0.45, 0, 0.55, 1] }}
            >
              <ComponentCard component={component} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
