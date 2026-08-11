"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type GeometricLogoRevealProps = {
  className?: string;
  loop?: boolean;
  /** The wordmark to assemble. Defaults to the Form&Fun homage. */
  text?: string;
  /** Small superscript after the wordmark (e.g. a trademark). */
  mark?: string;
};

// Form&Fun's signature landing: a geometric wordmark sits as a light-gray
// "ghost", then its letters fill to ink in a staggered left-to-right cascade
// (a clip-wipe within each glyph), settling into the solid logo.
//
// Self-contained: scoped --glr-* tokens, container-query sizing so the wordmark
// scales to the component's own width in both the card preview and full page.

// Smooth, soft-landing ease-out (easeOutExpo-ish) for a graceful settle.
const revealEase = [0.22, 1, 0.36, 1] as const;

const WORD_START = 0.28;
const LETTER_STAGGER = 0.11;
const LETTER_DUR = 1.05;

// Each letter's ink wipes in from a different edge, with a small matching slide,
// so the wordmark assembles from mixed directions instead of a single sweep.
// clipPath inset order is (top right bottom left); the 100% side is the hidden
// edge the fill grows away from.
const REVEAL_DIRECTIONS = [
  { clip: "inset(0 0 100% 0)", x: 0, y: -8 }, // top → bottom
  { clip: "inset(100% 0 0 0)", x: 0, y: 8 }, //  bottom → top
  { clip: "inset(0 0 0 100%)", x: 8, y: 0 }, //  right → left
  { clip: "inset(0 100% 0 0)", x: -8, y: 0 }, // left → right
] as const;

export function GeometricLogoReveal({
  className,
  loop = true,
  text = "Atomic&Motion",
  mark = "™",
}: GeometricLogoRevealProps) {
  const letters = React.useMemo(() => Array.from(text), [text]);
  const lastLetterDelay = WORD_START + (letters.length - 1) * LETTER_STAGGER;
  const wordDone = lastLetterDelay + LETTER_DUR;

  // Bumping runId re-keys the animated subtree so the whole reveal replays.
  const [runId, setRunId] = React.useState(0);
  React.useEffect(() => {
    if (!loop) return;
    const cycleMs = Math.round((wordDone + 2) * 1000);
    const interval = setInterval(() => setRunId((id) => id + 1), cycleMs);
    return () => clearInterval(interval);
  }, [loop, wordDone]);

  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent",
        className,
      )}
      style={
        {
          "--glr-ink": "var(--jitter-ink, #0e1011)",
          "--glr-ghost": "var(--jitter-gray-200, #cccccc)",
        } as React.CSSProperties
      }
    >
      <div
        key={runId}
        className="relative flex h-full w-full max-w-[1040px] items-center justify-center px-[5%] py-[4%]"
        style={{ containerType: "inline-size" }}
      >
        {/* The wordmark that assembles from its ghost. */}
        <div
          className="relative flex items-start font-[family-name:var(--font-plus-jakarta-sans)] text-[clamp(28px,9.5cqw,120px)] font-medium leading-[0.9] tracking-[-0.04em]"
          aria-label={text}
        >
          {letters.map((ch, i) => {
            const from = REVEAL_DIRECTIONS[i % REVEAL_DIRECTIONS.length];
            return (
              <span
                key={`${ch}-${i}`}
                aria-hidden="true"
                className="relative inline-block whitespace-pre"
              >
                {/* Ghost letter — the light-gray silhouette. */}
                <span className="text-[var(--glr-ghost)]">{ch}</span>
                {/* Ink letter — wipes in over the ghost from this letter's edge. */}
                <motion.span
                  className="absolute inset-0 text-[var(--glr-ink)]"
                  initial={{ clipPath: from.clip, x: from.x, y: from.y, opacity: 0 }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)", x: 0, y: 0, opacity: 1 }}
                  transition={{
                    duration: LETTER_DUR,
                    delay: WORD_START + i * LETTER_STAGGER,
                    ease: revealEase,
                    // Fade in over the first part of the move so the sliding ink
                    // never reads as a hard echo over the ghost.
                    opacity: {
                      duration: LETTER_DUR * 0.55,
                      delay: WORD_START + i * LETTER_STAGGER,
                      ease: revealEase,
                    },
                  }}
                >
                  {ch}
                </motion.span>
              </span>
            );
          })}

          {mark ? (
            <motion.span
              aria-hidden="true"
              className="ml-[0.4cqw] mt-[1cqw] text-[2.4cqw] leading-none text-[var(--glr-ink)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: wordDone - 0.15, ease: revealEase }}
            >
              {mark}
            </motion.span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
