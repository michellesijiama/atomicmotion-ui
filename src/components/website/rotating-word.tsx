"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

// Jitter-style rotating word: the current word rolls up and out while the next
// slides in from below (with a soft blur), and the slot animates its width to
// fit each word so the surrounding text reflows smoothly and a centered
// sentence stays centered whichever word is showing.
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
  const measureRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [widths, setWidths] = React.useState<number[] | null>(null);
  const wordsKey = words.join("\u0000");

  React.useEffect(() => {
    if (words.length < 2) return;
    const id = window.setInterval(
      () => setIndex((v) => (v + 1) % words.length),
      interval,
    );
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  // Measure every word once laid out, and again when the web font arrives or
  // the type size changes, so the slot can animate to an exact pixel width.
  React.useLayoutEffect(() => {
    const measure = () =>
      setWidths(measureRefs.current.map((el) => el?.getBoundingClientRect().width ?? 0));
    measure();
    void document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    measureRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [wordsKey]);

  const word = words[index % words.length];
  // Springy but snappy → settles quickly while keeping a natural feel.
  const spring = { type: "spring", stiffness: 220, damping: 22, mass: 0.8 } as const;

  return (
    // Slot is exactly one line box tall with the same line-height as the
    // surrounding text + align-bottom, so the rotating word shares the outer
    // baseline geometry (no centering offset).
    <motion.span
      className={cn(
        "relative inline-grid h-[1.3em] overflow-hidden text-left align-bottom leading-[1.3]",
        className,
      )}
      initial={false}
      animate={widths ? { width: widths[index % words.length] } : undefined}
      transition={reduce ? { duration: 0 } : spring}
    >
      {/* Measurers: every word, out of flow, read for their widths. */}
      {words.map((w, i) => (
        <span
          key={w}
          ref={(el) => {
            measureRefs.current[i] = el;
          }}
          aria-hidden
          className="invisible absolute left-0 top-0 whitespace-nowrap leading-[1.3]"
        >
          {w}
        </span>
      ))}

      {/* Sizer: the current word, so the slot fits it before the first
          measurement (server render) without a jump once measured. */}
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 block whitespace-nowrap leading-[1.3]"
      >
        {word}
      </span>

      {/* Animated layer, absolutely filling the slot. */}
      <span className="relative col-start-1 row-start-1 block">
        {reduce ? (
          <span className="absolute inset-0 block whitespace-nowrap leading-[1.3]">
            {word}
          </span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={word}
              className="absolute inset-0 block whitespace-nowrap leading-[1.3]"
              initial={{ y: "108%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-108%", opacity: 0, filter: "blur(4px)" }}
              transition={spring}
            >
              {word}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
    </motion.span>
  );
}
