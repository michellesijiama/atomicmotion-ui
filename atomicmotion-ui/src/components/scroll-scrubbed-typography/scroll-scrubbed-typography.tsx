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
  const titleRef = React.useRef<HTMLDivElement>(null);
  const [titleHeight, setTitleHeight] = React.useState(0);
  const [cursor, setCursor] = React.useState({ x: 0, y: 0, visible: false });
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: targetRef,
    offset: ["start start", "end start"],
  });
  const compressedScale = useTransform(scrollYProgress, [0, 1], [1.95, 0.42]);
  const springScale = useSpring(compressedScale, {
    stiffness: 160,
    damping: 32,
    mass: 0.7,
  });

  // The title scales with `transform: scaleY` (origin-top), which doesn't change
  // its layout box. So the description below would keep a fixed layout gap while
  // the *visual* gap grows/shrinks. We measure the title's layout height and
  // translate the description by titleHeight*(scale-1) so it tracks the
  // compressed bottom edge with a constant 24px gap as scroll scrubs.
  const descriptionShift = useTransform(
    springScale,
    // Title scales from its center (origin-center), so its visual bottom moves
    // by half the height delta — match that so the 24px gap stays constant.
    (scale) => (titleHeight / 2) * (scale - 1),
  );

  // Measure the title's natural (unscaled) layout height — offsetHeight ignores
  // transforms, so this stays the layout height regardless of the scaleY scrub.
  React.useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => setTitleHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
          // container-type:inline-size → the title can size its type to THIS
          // box's width (cqw) instead of the viewport, so it always fits and is
          // never cropped, at any screen size.
          "relative h-[min(64vh,620px)] max-h-[620px] overflow-hidden bg-[#16a147] [container-type:inline-size]",
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
          <div ref={targetRef} className="relative h-[135vh] min-h-[700px]">
            <div className="sticky top-0 flex h-[min(64vh,620px)] max-h-[620px] flex-col items-start justify-center overflow-hidden px-5 sm:px-7">
              <motion.div
                ref={titleRef}
                aria-label="Scroll-Scrubbed Compression"
                animate={titleAnimate}
                className="origin-center [font-stretch:condensed] will-change-transform"
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
                      ? "text-[clamp(24px,9.5cqw,70px)] leading-[0.66] tracking-[-0.055em]"
                      : "text-[clamp(28px,9.5cqw,92px)] leading-[0.74] tracking-[-0.075em]",
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
                <motion.p
                  aria-label="Scroll-Scrubbed Typography description"
                  style={shouldReduceMotion ? undefined : { y: descriptionShift }}
                  className="mt-6 max-w-[520px] text-[clamp(16px,2.4vw,24px)] font-medium leading-[1.08] tracking-[-0.035em] text-black/75"
                >
                  A sticky title compresses against the top edge as scroll
                  progress scrubs its vertical scale
                </motion.p>
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
