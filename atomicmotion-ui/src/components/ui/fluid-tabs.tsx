"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type FluidTabItem = {
  value: string;
  label: string;
  meta?: string;
};

type FluidTabsProps = {
  tabs: FluidTabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function FluidTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  className,
}: FluidTabsProps) {
  const id = React.useId();
  const reduceMotion = useReducedMotion();
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? tabs[0]?.value ?? "",
  );
  const activeValue = value ?? internalValue;

  function selectTab(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function moveBy(offset: number) {
    const currentIndex = Math.max(
      0,
      tabs.findIndex((tab) => tab.value === activeValue),
    );
    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (next) selectTab(next.value);
  }

  return (
    <div
      role="tablist"
      aria-label="Atomic motion components"
      className={cn(
        "inline-flex max-w-full flex-wrap gap-1 rounded-md border border-white/10 bg-white/[0.03] p-1",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveBy(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveBy(-1);
        }
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === activeValue;

        return (
          <button
            key={tab.value}
            id={`${id}-${tab.value}`}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={cn(
              "relative min-h-10 min-w-28 rounded px-4 py-2 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              active ? "text-black" : "text-zinc-400 hover:text-white",
            )}
            onClick={() => selectTab(tab.value)}
          >
            {active ? (
              <motion.span
                layoutId={`${id}-fluid-active`}
                className="absolute inset-0 rounded bg-white"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
                }
              />
            ) : null}
            <span className="relative block font-medium">{tab.label}</span>
            {tab.meta ? (
              <span className="relative mt-0.5 block font-mono text-[10px] opacity-55">
                {tab.meta}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
