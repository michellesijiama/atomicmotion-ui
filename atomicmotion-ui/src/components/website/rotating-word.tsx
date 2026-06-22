"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

// Jitter-style rotating word: the current word rolls up and out while the next
// slides in from below (with a soft blur), and the slot animates its width to
// fit each word so the surrounding text reflows smoothly.
export function RotatingWord({
  words,
  interval = 1900,
  className,
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (words.length < 2) return;
    const id = window.setInterval(
      () => setIndex((v) => (v + 1) % words.length),
      interval,
    );
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  const word = words[index % words.length];
  // Springy but snappy → settles quickly while keeping a natural feel.
  const spring = { type: "spring", stiffness: 220, damping: 22, mass: 0.8 } as const;

  return (
    // Slot is exactly one line box tall with the same line-height as the
    // surrounding text + align-bottom, so the rotating word shares the outer
    // baseline geometry (no centering offset). It is also locked to the width
    // of the WIDEST word via a hidden sizer layer (all words stacked in one
    // grid cell), so the line length never changes as words swap and the
    // centered sentence stays anchored in place.
    <span
      className={cn(
        // text-left so the (shorter) word hugs the preceding text instead of
        // centering inside the fixed-width slot — the leftover width becomes
        // invisible trailing space. Slot width stays fixed, so the sentence
        // still never shifts.
        "relative inline-grid h-[1.3em] overflow-hidden text-left align-bottom leading-[1.3]",
        className,
      )}
    >
      {/* Sizer: invisible, sets the box to the widest word's width. */}
      {words.map((w) => (
        <span
          key={w}
          aria-hidden
          className="invisible col-start-1 row-start-1 block whitespace-nowrap leading-[1.3]"
        >
          {w}
        </span>
      ))}

      {/* Animated layer, absolutely filling the fixed-width box. */}
      <span className="relative col-start-1 row-start-1 block">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={word}
            className="absolute inset-0 block whitespace-nowrap leading-[1.3]"
            initial={reduce ? false : { y: "108%", opacity: 0, filter: "blur(4px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { y: "-108%", opacity: 0, filter: "blur(4px)" }}
            transition={spring}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
