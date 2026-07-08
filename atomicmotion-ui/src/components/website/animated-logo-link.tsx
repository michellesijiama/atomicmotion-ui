"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

// Header logo — the same ghost→ink assembly as the Geometric Logo Reveal
// component, tuned smaller/snappier and playing once on mount. The wordmark
// sits as a light-gray ghost, then each letter's ink wipes in from a different
// edge (top/bottom/left/right, cycling) with a soft fade + slide on a smooth
// cubic-bezier ease. Link + hover behaviour is preserved.
const revealEase = [0.22, 1, 0.36, 1] as const;
const WORD_START = 0.08;
const LETTER_STAGGER = 0.045;
const LETTER_DUR = 0.5;

const REVEAL_DIRECTIONS = [
  { clip: "inset(0 0 100% 0)", x: 0, y: -4 }, // top → bottom
  { clip: "inset(100% 0 0 0)", x: 0, y: 4 }, //  bottom → top
  { clip: "inset(0 0 0 100%)", x: 4, y: 0 }, //  right → left
  { clip: "inset(0 100% 0 0)", x: -4, y: 0 }, // left → right
] as const;

export function AnimatedLogoLink({
  className,
  emoji = "🖤",
  href = "/",
  label = "AtomicMotion",
}: {
  className?: string;
  emoji?: string;
  href?: string;
  label?: string;
}) {
  const letters = React.useMemo(() => Array.from(label), [label]);

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group/logo relative inline-flex h-9 min-w-[210px] items-center overflow-hidden font-[family-name:var(--font-plus-jakarta-sans)] text-[24px] font-medium tracking-[-0.02em] text-[var(--jitter-ink)] outline-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 -translate-x-8 -translate-y-1/2 opacity-0 transition-all duration-500 ease-out group-hover/logo:translate-x-0 group-hover/logo:opacity-100 group-focus-visible/logo:translate-x-0 group-focus-visible/logo:opacity-100"
      >
        {emoji}
      </span>

      <span
        aria-hidden="true"
        className="relative inline-flex transition-transform duration-500 ease-out group-hover/logo:translate-x-8 group-focus-visible/logo:translate-x-8"
      >
        {letters.map((ch, i) => {
          const from = REVEAL_DIRECTIONS[i % REVEAL_DIRECTIONS.length];
          const delay = WORD_START + i * LETTER_STAGGER;
          return (
            <span key={`${ch}-${i}`} className="relative inline-block whitespace-pre">
              {/* Ghost letter — the light-gray silhouette. */}
              <span className="text-[var(--jitter-gray-200)]">{ch}</span>
              {/* Ink letter — wipes in over the ghost from this letter's edge. */}
              <motion.span
                className="absolute inset-0 text-[var(--jitter-ink)]"
                initial={{ clipPath: from.clip, x: from.x, y: from.y, opacity: 0 }}
                animate={{ clipPath: "inset(0% 0% 0% 0%)", x: 0, y: 0, opacity: 1 }}
                transition={{
                  duration: LETTER_DUR,
                  delay,
                  ease: revealEase,
                  opacity: { duration: LETTER_DUR * 0.55, delay, ease: revealEase },
                }}
              >
                {ch}
              </motion.span>
            </span>
          );
        })}
      </span>
    </Link>
  );
}
