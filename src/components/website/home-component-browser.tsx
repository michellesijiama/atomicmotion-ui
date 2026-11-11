"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { ComponentCard, type GalleryComponent } from "@/components/website/component-card";

type HomeComponentBrowserProps = {
  components: GalleryComponent[];
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

function buildFilterOptions(components: GalleryComponent[]): FilterOption[] {
  const categories = Array.from(new Set(components.map((component) => component.category)));
  return [
    { label: "All", value: "all" },
    ...categories.map((category) => ({ label: category, value: category })),
  ];
}

function sortByCreatedDate(components: GalleryComponent[]) {
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
  const reducedMotion = useReducedMotion();
  const visibleComponents =
    activeFilter === "all"
      ? sortedComponents
      : sortedComponents.filter((component) => component.category === activeFilter);

  return (
    <section className="pb-10" aria-label="UI components">
      <div className="mx-auto mb-10 max-w-none bg-transparent p-2">
        <div className="flex flex-wrap justify-center gap-2">
          {filterOptions.map((option) => {
            const isActive = activeFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveFilter(option.value)}
                className="relative inline-flex h-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/15 px-4 text-[15px] leading-none text-[var(--jitter-ink)] focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {isActive && (
                  <motion.span
                    layoutId={reducedMotion ? undefined : "home-active-filter"}
                    className="absolute inset-0 rounded-full bg-[var(--jitter-ink)]"
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
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visibleComponents.map((component) => (
          <ComponentCard key={component.id} component={component} animatePreview={!reducedMotion} />
        ))}
      </div>
    </section>
  );
}
