"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

// Header logo — the same ghost→ink assembly as the Geometric Logo Reveal
// component, tuned smaller/snappier. It plays once on mount and re-plays on
// hover / focus: the wordmark sits as a light-gray ghost, then each letter's
// ink wipes in from a different edge (top/bottom/left/right, cycling) with a
// soft fade + slide on a smooth cubic-bezier ease.
const revealEase = [0.22, 1, 0.36, 1] as const;
const WORD_START = 0.06;
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
  href = "/",
  label = "AtomicMotion",
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  const letters = React.useMemo(() => Array.from(label), [label]);
  // Bumping playId re-keys the letters so the reveal replays from the ghost.
  const [playId, setPlayId] = React.useState(0);
  const replay = React.useCallback(() => setPlayId((id) => id + 1), []);

  return (
    <Link
      href={href}
      aria-label={label}
      onMouseEnter={replay}
      onFocus={replay}
      className={cn(
        "group/logo relative inline-flex h-9 items-center font-[family-name:var(--font-plus-jakarta-sans)] text-[24px] font-medium tracking-[-0.02em] text-[var(--jitter-ink)] outline-none",
        className,
      )}
    >
      <span key={playId} aria-hidden="true" className="relative inline-flex">
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
