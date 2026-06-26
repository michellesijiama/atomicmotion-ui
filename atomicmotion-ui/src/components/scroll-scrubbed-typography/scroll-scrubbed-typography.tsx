"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

import { cn } from "@/lib/utils";

export type ScrollScrubbedTypographyProps = {
  className?: string;
  loop?: boolean;
};

const TITLE_LINES = ["Scroll-Scrubbed", "Compression"];

export function ScrollScrubbedTypography({
  className,
  loop = false,
}: ScrollScrubbedTypographyProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const targetRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = React.useState({ x: 0, y: 0, visible: false });
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: targetRef,
    offset: ["start start", "end start"],
  });
  const compressedScale = useTransform(scrollYProgress, [0, 0.72], [1.95, 0.42]);
  const springScale = useSpring(compressedScale, {
    stiffness: 160,
    damping: 32,
    mass: 0.7,
  });

  const titleStyle = loop || shouldReduceMotion ? undefined : { scaleY: springScale };
  const titleAnimate =
    loop && !shouldReduceMotion
      ? {
          scaleY: [1.85, 0.45, 1.85],
        }
      : {
          scaleY: shouldReduceMotion ? 1 : undefined,
        };

  React.useEffect(() => {
    if (loop) return;

    const syncCursor = (event: PointerEvent) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      const visible = Boolean(
        rect &&
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom,
      );

      setCursor({ x: event.clientX, y: event.clientY, visible });
    };

    const hideCursor = () => {
      setCursor((current) => ({ ...current, visible: false }));
    };

    window.addEventListener("pointermove", syncCursor, { passive: true });
    window.addEventListener("pointerleave", hideCursor);
    window.addEventListener("blur", hideCursor);

    return () => {
      window.removeEventListener("pointermove", syncCursor);
      window.removeEventListener("pointerleave", hideCursor);
      window.removeEventListener("blur", hideCursor);
    };
  }, [loop]);

  return (
    <div
      className={cn(
        "flex h-full min-h-[520px] w-full items-center justify-center overflow-hidden bg-transparent text-black",
        className,
      )}
    >
      <div
        ref={surfaceRef}
        onPointerEnter={
          loop
            ? undefined
            : (event) => setCursor({ x: event.clientX, y: event.clientY, visible: true })
        }
        onPointerLeave={
          loop ? undefined : () => setCursor((current) => ({ ...current, visible: false }))
        }
        onPointerMove={
          loop
            ? undefined
            : (event) => setCursor({ x: event.clientX, y: event.clientY, visible: true })
        }
        className={cn(
          "relative h-[min(64vh,620px)] max-h-[620px] overflow-hidden bg-[#16a147]",
          loop
            ? "w-[min(68vw,620px)] max-w-[620px]"
            : "w-[min(86vw,760px)] max-w-[760px]",
        )}
      >
        <div
          ref={scrollRef}
          className={cn(
            "relative h-full overflow-y-auto overflow-x-hidden",
            loop && "pointer-events-none overflow-hidden",
          )}
        >
          <div ref={targetRef} className="relative h-[175vh] min-h-[920px]">
            <div className="sticky top-0 flex h-full max-h-screen flex-col items-start overflow-hidden px-5 pt-16 sm:px-7 sm:pt-20">
              <motion.div
                aria-label="Scroll-Scrubbed Compression"
                animate={titleAnimate}
                className="origin-top [font-stretch:condensed] will-change-transform"
                style={titleStyle}
                transition={{
                  duration: 5.2,
                  ease: [0.45, 0, 0.55, 1],
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }}
              >
                <div
                  className={cn(
                    "font-black uppercase",
                    loop
                      ? "text-[clamp(34px,6.2vw,70px)] leading-[0.66] tracking-[-0.055em]"
                      : "text-[clamp(42px,8vw,92px)] leading-[0.74] tracking-[-0.075em]",
                  )}
                >
                  {TITLE_LINES.map((line) => (
                    <div key={line} className="whitespace-nowrap">
                      {line}
                    </div>
                  ))}
                </div>
              </motion.div>
              {!loop && (
                <p
                  aria-label="Scroll-Scrubbed Typography description"
                  className="mt-28 max-w-[520px] text-[clamp(16px,2.4vw,24px)] font-medium leading-[1.08] tracking-[-0.035em] text-black/75"
                >
                  A sticky title compresses against the top edge as scroll
                  progress scrubs its vertical scale
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {!loop && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 rounded-full bg-black px-3 py-1.5 text-[13px] font-medium text-white"
          initial={false}
          animate={{
            opacity: cursor.visible ? 1 : 0,
            x: cursor.x + 16,
            y: cursor.y + 16,
          }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          Scroll down
        </motion.div>
      )}

      <style jsx>{`
        div::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
  );
}
