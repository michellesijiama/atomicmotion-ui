"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "framer-motion";

import { cn } from "@/lib/utils";

type ScrollScrubbedVideoProps = {
  className?: string;
  loop?: boolean;
};

const VIDEO_SRC = "/videos/pinterest-floral-scroll.mp4";
const CAPTION_LINES = [
  "A quiet bloom opens in slow motion",
  "Light moves across the petal like water",
  "The timeline becomes a small natural current, guided by the wheel under your hand",
];
const CAPTION_PLACEMENTS = [
  "left-5 right-9 top-8 text-left",
  "left-1/2 top-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 text-center",
  "bottom-7 left-6 right-5 text-right",
];

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getCaptionIndex(progress: number) {
  return Math.min(CAPTION_LINES.length - 1, Math.floor(clampProgress(progress) * CAPTION_LINES.length));
}

export function ScrollScrubbedVideo({
  className,
  loop = false,
}: ScrollScrubbedVideoProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const videoFrameRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [stageHeight, setStageHeight] = React.useState<number | null>(null);
  const [activeCaptionIndex, setActiveCaptionIndex] = React.useState(0);
  const [cursor, setCursor] = React.useState({ x: 0, y: 0, visible: false });
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: trackRef,
    offset: ["start start", "end end"],
  });

  React.useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const updateStageHeight = () => {
      setStageHeight(scroller.clientHeight);
    };

    updateStageHeight();
    const observer = new ResizeObserver(updateStageHeight);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncDuration = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };

    syncDuration();
    video.addEventListener("loadedmetadata", syncDuration);
    return () => video.removeEventListener("loadedmetadata", syncDuration);
  }, []);

  React.useEffect(() => {
    if (loop || shouldReduceMotion) return;

    return scrollYProgress.on("change", (latest) => {
      const nextProgress = clampProgress(latest);
      setActiveCaptionIndex(getCaptionIndex(nextProgress));

      const video = videoRef.current;
      if (!video || !duration) return;
      video.pause();
      video.currentTime = nextProgress * duration;
    });
  }, [duration, loop, scrollYProgress, shouldReduceMotion]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !loop || shouldReduceMotion) return;

    let startedAt = 0;
    const animate = (time: number) => {
      if (!startedAt) startedAt = time;

      if (duration > 0) {
        const loopDuration = Math.min(duration, 14);
        const nextTime = ((time - startedAt) / 1000) % loopDuration;
        video.currentTime = nextTime;
        setActiveCaptionIndex(getCaptionIndex(nextTime / loopDuration));
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [duration, loop, shouldReduceMotion]);

  React.useEffect(() => {
    if (!shouldReduceMotion) return;

    const video = videoRef.current;
    if (!video) return;

    const freezeFrame = () => {
      if (!Number.isFinite(video.duration)) return;
      video.pause();
      video.currentTime = Math.min(video.duration * 0.18, 8);
      setActiveCaptionIndex(0);
    };

    if (video.readyState >= 1) freezeFrame();
    video.addEventListener("loadedmetadata", freezeFrame);
    return () => video.removeEventListener("loadedmetadata", freezeFrame);
  }, [shouldReduceMotion]);

  React.useEffect(() => {
    if (loop) return;

    const hideCursor = () => {
      setCursor((current) => ({ ...current, visible: false }));
    };

    window.addEventListener("blur", hideCursor);
    return () => window.removeEventListener("blur", hideCursor);
  }, [loop]);

  const captionPlacement = CAPTION_PLACEMENTS[activeCaptionIndex % CAPTION_PLACEMENTS.length];

  return (
    <div
      className={cn(
        "relative h-full min-h-[560px] w-full overflow-hidden bg-transparent text-white",
        loop && "min-h-0",
        className,
      )}
    >
      <div
        ref={scrollRef}
        onPointerEnter={
          loop
            ? undefined
            : (event) => setCursor({ x: event.clientX, y: event.clientY, visible: true })
        }
        onPointerMove={
          loop
            ? undefined
            : (event) => setCursor({ x: event.clientX, y: event.clientY, visible: true })
        }
        onPointerLeave={
          loop ? undefined : () => setCursor((current) => ({ ...current, visible: false }))
        }
        className={cn(
          "h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          loop && "pointer-events-none overflow-hidden",
        )}
        aria-label="Scroll-controlled video playback"
      >
        <div ref={trackRef} className={cn("relative h-[360vh]", loop && "h-full")}>
          <section
            className="sticky top-0 min-h-[560px] overflow-hidden bg-transparent"
            style={{ height: loop ? "100%" : stageHeight ? `${stageHeight}px` : "100%" }}
          >
            <div
              ref={videoFrameRef}
              className="absolute left-1/2 top-1/2 h-[76%] max-w-[76%] aspect-[9/16] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover opacity-70 saturate-[0.82]"
                muted
                playsInline
                preload="metadata"
                src={VIDEO_SRC}
                onLoadedMetadata={(event) => {
                  const nextDuration = event.currentTarget.duration;
                  setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
                }}
              />

              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={`${activeCaptionIndex}-${CAPTION_LINES[activeCaptionIndex]}`}
                  className={cn(
                    "absolute z-20 font-serif text-[17px] leading-[1.08] tracking-[0] text-black sm:text-[20px]",
                    captionPlacement,
                  )}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, x: activeCaptionIndex === 0 ? -6 : 6, y: 8 }
                  }
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0, x: activeCaptionIndex === 1 ? -4 : 4, y: -6 }
                  }
                  transition={{
                    duration: 0.78,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {CAPTION_LINES[activeCaptionIndex]}
                </motion.div>
              </AnimatePresence>
            </div>

            {shouldReduceMotion && (
              <div className="absolute left-5 top-24 z-30 max-w-[250px] rounded-full bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0] text-black sm:left-8">
                prefers-reduced-motion: static frame
              </div>
            )}
          </section>
        </div>
      </div>

      {!loop && (
        <motion.div
          aria-hidden="true"
          aria-label="Scroll cursor label"
          className="pointer-events-none fixed left-0 top-0 z-[70] text-[11px] font-medium uppercase tracking-[0] text-black"
          initial={false}
          animate={{
            opacity: cursor.visible ? 1 : 0,
            x: cursor.x + 14,
            y: cursor.y + 14,
          }}
          transition={{
            opacity: { duration: 0.18, ease: "easeOut" },
            x: { type: "spring", stiffness: 520, damping: 38, mass: 0.5 },
            y: { type: "spring", stiffness: 520, damping: 38, mass: 0.5 },
          }}
        >
          scroll
        </motion.div>
      )}
    </div>
  );
}
