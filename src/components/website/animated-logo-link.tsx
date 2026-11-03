"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { EASE_OUT_EXPO } from "@/lib/motion";
import { SITE_NAME } from "@/lib/site-metadata";
import { cn } from "@/lib/utils";

// Header logo — the same ghost→ink assembly as the Geometric Logo Reveal
// component, tuned smaller/snappier. It plays once on mount: the wordmark sits
// as a light-gray ghost, then each letter's
// ink wipes in from a different edge (top/bottom/left/right, cycling) with a
// soft fade + slide on a smooth cubic-bezier ease.
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
  label = SITE_NAME,
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  const letters = React.useMemo(() => Array.from(label), [label]);

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group/logo relative inline-flex h-9 items-center font-[family-name:var(--font-plus-jakarta-sans)] text-[24px] font-medium tracking-[-0.02em] text-[var(--jitter-ink)] outline-none",
        className,
      )}
    >
      <span aria-hidden="true" className="relative inline-flex">
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
                  ease: EASE_OUT_EXPO,
                  opacity: { duration: LETTER_DUR * 0.55, delay, ease: EASE_OUT_EXPO },
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
