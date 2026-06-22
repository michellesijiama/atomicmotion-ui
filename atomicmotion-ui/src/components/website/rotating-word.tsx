"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

// Jitter-style rotating word: the current word rolls up and out while the next
// slides in from below (with a soft blur), and the slot animates its width to
// fit each word so the surrounding text reflows smoothly.
export function RotatingWord({
  words,
  interval = 3400,
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
  // Soft spring → a slower, more natural settle than a fixed-duration ease.
  const spring = { type: "spring", stiffness: 70, damping: 18, mass: 1.1 } as const;

  return (
    // Slot is exactly one line box tall with the same line-height as the
    // surrounding text + align-bottom, so the rotating word shares the outer
    // baseline geometry (no centering offset).
    <motion.span
      layout
      transition={spring}
      className={cn(
        "relative inline-block h-[1.3em] overflow-hidden align-bottom leading-[1.3]",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          className="block whitespace-nowrap leading-[1.3]"
          initial={reduce ? false : { y: "108%", opacity: 0, filter: "blur(4px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { y: "-108%", opacity: 0, filter: "blur(4px)" }}
          transition={spring}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
