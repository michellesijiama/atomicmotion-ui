"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { flushSync } from "react-dom";
import type { MotionValue } from "framer-motion";
import { animate, AnimatePresence, motion, useIsPresent, useMotionValue, usePresence, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, Mic, Play, Square } from "lucide-react";

export type OrganicUIProps = {
  className?: string;
  /** Show the podcast search assistant. Pass false for the original Kyoto demo. */
  podcastAssistant?: boolean;
  /** @deprecated Use podcastAssistant. */
  makeupAssistant?: boolean;
  /** @deprecated Use podcastAssistant. */
  coffeeAssistant?: boolean;
};

type Phase = "idle" | "listening" | "transcript" | "places" | "generating" | "image";

const width = 500;
const height = 200;
const center = width / 2;
const restingHeight = 150;
const promptCoreDiameter = 48;
const promptMicX = 419;
const generationDuration = 2400;
const resultPanel = { attrX: 20, attrY: 12, width: 336, height: 176 };
const promptPanel = { attrX: 35, attrY: 61, width: 430, height: 78, rx: 65, ry: 39 };
const ease = [0.25, 0.8, 0.25, 1] as const;

const places = [
  { title: "Kamo River", href: "https://www.japan.travel/en/spot/1183/", image: "/components/organic-ui/kyoto-river.webp" },
  { title: "Kyoto City Museum of Art", href: "https://kyotocity-kyocera.museum/en/", image: "/components/organic-ui/kyoto-gallery.webp" },
] as const;

const demoImage = { title: "Kyoto after dark", image: "/components/organic-ui/kyoto-night.webp" };

const position = (x: number) => `${(x / width) * 100}%`;
const focusStyle = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70";
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

function joinContour(panel: typeof resultPanel & { rx: number; ry: number }, circleX: number, rx: number, ry: number) {
  const centerY = height / 2;
  const angle = Math.PI * 0.26;
  const startX = panel.attrX + panel.width - 0.75;
  const startY = Math.max(panel.attrY + panel.ry, centerY - ry * 1.16);
  const endX = circleX - rx * Math.cos(angle);
  const endY = centerY - ry * Math.sin(angle);
  if (panel.rx <= 0 || endX <= startX + 1) return "";

  // Match the vertical panel edge and the tangent to the ellipse at the join.
  const edgeHandleY = startY + (centerY - startY) * 0.8;
  const circleHandleX = Math.min((endX - startX) * 0.46, rx * 0.5);
  const circleHandleY = circleHandleX * (ry / rx) / Math.tan(angle);

  return `M ${startX} ${startY}
    C ${startX} ${edgeHandleY} ${endX - circleHandleX} ${endY + circleHandleY} ${endX} ${endY}
    L ${endX} ${height - endY}
    C ${endX - circleHandleX} ${height - endY - circleHandleY} ${startX} ${height - edgeHandleY} ${startX} ${height - startY} Z`;
}

function VoiceWave({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <span aria-hidden="true" className="flex h-6 items-center justify-center gap-[3px]">
      {[9, 15, 21, 15, 9].map((barHeight, index) => (
        <motion.span
          key={index}
          style={{ height: barHeight }}
          animate={{ scaleY: reducedMotion ? 1 : [0.4, 1, 0.55, 0.85, 0.4] }}
          transition={{ duration: reducedMotion ? 0 : 0.85, delay: reducedMotion ? 0 : index * 0.1, repeat: reducedMotion ? 0 : Infinity, ease: "easeInOut" }}
          className="w-[3px] rounded-full bg-current"
        />
      ))}
    </span>
  );
}

type AgentState = "resting" | "listening" | "searching" | "reviewing" | "ready";
const podcastEase = [0.42, 0, 0.3, 1] as const;
const smoothProgress = (value: number) => value * value * (3 - 2 * value);

function dotPoint(angle: number, radius: number) {
  return { x: 16 + radius * Math.cos(angle), y: 16 + radius * Math.sin(angle) };
}

const agentDots = Array.from({ length: 24 }, (_, index) => {
  const angle = index * Math.PI / 12;
  const inner = index % 2 === 0;
  return {
    index,
    angle,
    arc: dotPoint(angle + (inner ? 0.48 : -0.23), inner ? 8.2 : 13.6),
    sweep: dotPoint(angle + (inner ? 0.7 : -0.34), inner ? 9.1 : 13.5),
  };
});

function AgentParticle({ dot, expansion, gather, orbit, radius, voiceEnergy }: {
  dot: (typeof agentDots)[number];
  expansion: MotionValue<number>;
  gather: MotionValue<number>;
  orbit: MotionValue<number>;
  radius: MotionValue<number>;
  voiceEnergy: MotionValue<number>;
}) {
  function coordinate(axis: "x" | "y") {
    const wave = (1 - Math.cos(2 * Math.PI * (orbit.get() - dot.index / agentDots.length))) / 2;
    const curve = mix(dot.arc[axis], dot.sweep[axis], wave);
    const breath = voiceEnergy.get();
    const ripple = breath * Math.sin(2 * dot.angle - Math.PI * breath);
    const listening = dotPoint(dot.angle + 0.064 * breath, 13.5 + 0.85 * ripple);
    const offset = mix(listening[axis], curve, gather.get() * (0.54 + 0.46 * wave));
    return mix(16, offset, expansion.get());
  }
  const cx = useTransform(() => coordinate("x"));
  const cy = useTransform(() => coordinate("y"));

  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={radius}
      fill="#c4ddfa"
    />
  );
}

function DotAgent({ state, reducedMotion, voiceEnergy }: { state: AgentState; reducedMotion: boolean; voiceEnergy: MotionValue<number> }) {
  const gradient = useId();
  const expanded = state !== "resting";
  const gathering = state === "searching";
  const inSearch = gathering || state === "reviewing";
  const expansion = useMotionValue(expanded ? 1 : 0);
  const gather = useSpring(0, { stiffness: 112, damping: 22, mass: 1 });
  const orbit = useMotionValue(0);
  const ringOpacity = useTransform(expansion, [0.15, 0.7], [0, 1], { ease: smoothProgress });
  const radius = useTransform(voiceEnergy, [0, 1], [1.08, 1.34]);
  const coreOpacity = useTransform(expansion, [0.17, 0.57], [1, 0], { ease: smoothProgress });
  const coreRadius = useTransform(expansion, [0, 0.5], [4, 2]);

  useEffect(() => {
    if (reducedMotion) { expansion.set(expanded ? 1 : 0); return; }
    const animation = animate(expansion, expanded ? 1 : 0, { duration: expanded ? 0.7 : 0.5, ease: podcastEase });
    return () => animation.stop();
  }, [expanded, expansion, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) gather.jump(0);
    else gather.set(gathering ? 1 : 0);
  }, [gather, gathering, reducedMotion]);

  useEffect(() => {
    if (!inSearch || reducedMotion) return;
    const animation = animate(orbit, [0, 1], { duration: 2.05, repeat: Infinity, ease: "linear" });
    return () => animation.stop();
  }, [inSearch, orbit, reducedMotion]);

  return (
    <span aria-hidden="true" data-agent-state={state} className="relative grid size-8 shrink-0 place-items-center">
      <svg className="absolute inset-0 size-full" viewBox="0 0 32 32">
        <defs>
          <radialGradient id={gradient} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a8c8f1" />
            <stop offset="100%" stopColor="#749bce" />
          </radialGradient>
        </defs>
        <motion.circle data-agent-core cx={16} cy={16} r={coreRadius} fill={`url(#${gradient})`} style={{ opacity: coreOpacity }} />
        <motion.g style={{ opacity: ringOpacity }}>
          {agentDots.map((dot) => (
            <AgentParticle key={dot.index} {...{ dot, expansion, gather, orbit, radius, voiceEnergy }} />
          ))}
        </motion.g>
      </svg>
    </span>
  );
}

const podcastEpisodes = [
  {
    id: "windows",
    name: "Windows startup sounds",
    show: "Twenty Thousand Hertz",
    seconds: 1576,
    topic: "sound",
    photo: "podcast-windows.webp",
    cover: "https://images.squarespace-cdn.com/content/v1/580fbaac440243d8731ffc57/322ef7e8-a834-429e-9384-4c237adc0150/20K_WindowsStartup_Part1.jpg?format=750w",
    description: "How Microsoft used a few seconds of sound to give each version of Windows its own personality.",
    url: "https://www.20k.org/episodes/tadaitswindows",
  },
  {
    id: "kitchen",
    name: "The Frankfurt Kitchen",
    show: "99% Invisible",
    seconds: 2063,
    topic: "architecture",
    photo: "podcast-kitchen.webp",
    cover: "https://99percentinvisible.org/wp-content/uploads/2023/05/frankfurt-main.jpg",
    description: "How a compact kitchen in 1920s Frankfurt helped shape the way we design kitchens today.",
    url: "https://99percentinvisible.org/episode/541-the-frankfurt-kitchen/",
  },
  {
    id: "screens",
    name: "Future Screens Are Mostly Blue",
    show: "99% Invisible",
    seconds: 1194,
    topic: "technology",
    photo: "podcast-screens.webp",
    cover: "https://99percentinvisible.org/wp-content/uploads/2013/11/7801464974_4fbd765dd9_o.jpg",
    description: "Why sci-fi interfaces keep turning blue, and what their designers imagine screens will do next.",
    url: "https://99percentinvisible.org/episode/future-screens-are-mostly-blue/",
  },
  {
    id: "artificial-sound",
    name: "The Sound of the Artificial World",
    show: "99% Invisible",
    seconds: 319,
    topic: "sound",
    photo: "podcast-artificial-sound.webp",
    cover: "https://99percentinvisible.org/wp-content/uploads/2011/02/3341668133_f0a11049a1_b.jpg",
    description: "Sound designer Jim McKee explains how a digital button gets the feel of a physical click.",
    url: "https://99percentinvisible.org/episode/episode-15-the-sound-of-the-artificial-world/",
  },
] as const;

type Episode = (typeof podcastEpisodes)[number];
type PodcastPreferences = { maxMinutes: number | null; topic: Episode["topic"] | null };
const defaultPreferences: PodcastPreferences = { maxMinutes: null, topic: null };
const readableBody = "text-[max(1.0625rem,calc(12px/var(--phone-preview-scale,1)))]";
const readableTitle = "text-[max(1.25rem,calc(14px/var(--phone-preview-scale,1)))]";
const episodeGlass = "bg-[#171424]/[0.15]";
const episodePhoto = (file: string) => `/components/organic-ui/${file}`;

function episodeDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function refinePodcastSearch(preferences: PodcastPreferences, request: string): PodcastPreferences {
  const duration = request.match(/\b(\d{1,3})[\s-]*(?:minutes?|mins?)\b|(\d{1,3})\s*分钟/i);
  let { maxMinutes, topic } = preferences;
  if (/\b(?:any length|no time limit)\b|时长不限/i.test(request)) maxMinutes = null;
  else if (duration) maxMinutes = Number(duration[1] ?? duration[2]);

  if (/\b(?:any topic|all topics)\b|主题不限/i.test(request)) topic = null;
  else if (/\b(?:sound|audio|chimes?)\b|声音|音效/i.test(request)) topic = "sound";
  else if (/\b(?:architecture|kitchens?|interiors?)\b|建筑|厨房/i.test(request)) topic = "architecture";
  else if (/\b(?:technology|screens?|interfaces?)\b|科技|屏幕|界面/i.test(request)) topic = "technology";

  return { maxMinutes, topic };
}

function matchEpisodes(preferences: PodcastPreferences) {
  return podcastEpisodes.filter(episode => (preferences.maxMinutes === null || episode.seconds <= preferences.maxMinutes * 60)
    && (!preferences.topic || episode.topic === preferences.topic));
}

function PodcastCover({ episode, className }: { episode: Episode; className: string }) {
  const fallback = episodePhoto(episode.photo);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- publisher artwork with a local fallback for the standalone component.
    <img
      src={episode.cover}
      alt=""
      draggable={false}
      referrerPolicy="no-referrer"
      className={className}
      onError={({ currentTarget }) => {
        if (currentTarget.getAttribute("src") !== fallback) currentTarget.src = fallback;
      }}
    />
  );
}

function PodcastBackdrop({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#eeecef] text-[#211d28] ${className}`}>
      <div className="absolute inset-x-0 bottom-0 h-[min(100%,519px)] px-6 pt-14">
        <h2 className="text-[32px] leading-none font-semibold tracking-tight">Podcasts</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {podcastEpisodes.slice(0, 2).map(episode => (
            <div key={episode.id} className="min-w-0">
              <PodcastCover episode={episode} className="aspect-square w-full rounded-[17px] bg-black/10 object-cover" />
              <p className="mt-2 truncate text-[15px] leading-tight font-semibold">{episode.show}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-4 text-[20px] leading-tight font-semibold tracking-tight">Up Next</h3>
        <div className="mt-1">
          {podcastEpisodes.slice(2).map(episode => (
            <div key={episode.id} className="flex items-center gap-3 border-b border-black/8 py-1.5 last:border-0">
              <PodcastCover episode={episode} className="size-9 shrink-0 rounded-[9px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] leading-tight font-semibold">{episode.name}</p>
                <p className="mt-0.5 text-[13px] text-[#655e6a]">{episode.show} · {episodeDuration(episode.seconds)}</p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/6">
                <Play size={12} fill="currentColor" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PodcastFog({ expanded, opacity }: { expanded?: boolean; opacity?: MotionValue<number> }) {
  const extent = expanded ? 420 : 210;
  return (
    <motion.div
      aria-hidden="true"
      data-podcast-fog
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        opacity,
        maskImage: `linear-gradient(to top, #000 ${extent - 140}px, rgb(0 0 0 / .78) ${extent - 96}px, rgb(0 0 0 / .27) ${extent - 43}px, transparent ${extent}px)`,
      }}
    >
      <PodcastBackdrop className="blur-[14px]" />
      <div className="absolute inset-0 bg-[rgb(29_25_43_/_0.57)]" />
    </motion.div>
  );
}

function PodcastScene({ origin, opening, resultTravel }: {
  origin: { x: number; y: number };
  opening: MotionValue<number>;
  resultTravel: MotionValue<number>;
}) {
  const fogOpacity = useTransform(opening, [0, 0.2, 0.58, 1], [0, 0.37, 0.89, 1]);
  const resultFogOpacity = useTransform(resultTravel, [0.12, 1], [0, 1]);
  const fogMask = useTransform(opening, (progress) => {
    const width = 0.1 + 205 * progress;
    const height = 0.1 + 125 * progress;
    return `radial-gradient(ellipse ${width}% ${height}% at ${origin.x * 100}% ${origin.y * 100}%, #000 54%, rgb(0 0 0 / .75) 68%, rgb(0 0 0 / .2) 88%, transparent 100%)`;
  });

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <PodcastBackdrop />
      <motion.div data-podcast-scene className="absolute inset-0" style={{ maskImage: fogMask, opacity: fogOpacity }}>
        <PodcastFog />
        <PodcastFog expanded opacity={resultFogOpacity} />
      </motion.div>
    </div>
  );
}

function EpisodeCard({ episode, index, position, reducedMotion, onOpen }: {
  episode: Episode;
  index: number;
  position: MotionValue<number>;
  reducedMotion: boolean;
  onOpen: () => void;
}) {
  const swipeScale = useTransform(position, (value) => 1 - Math.min(1, Math.abs(value - index)) * 0.08);
  const scale = useSpring(swipeScale, { stiffness: 300, damping: 34 });

  return (
    <motion.button
      type="button"
      aria-label={`View ${episode.name}, ${episode.show}`}
      onClick={onOpen}
      style={reducedMotion ? undefined : { scale }}
      className={`flex min-h-[152px] w-full cursor-grab select-none items-stretch gap-3 rounded-[25px] ${episodeGlass} p-2.5 text-left text-white active:cursor-grabbing ${focusStyle}`}
    >
      <span className="relative aspect-square w-[38%] shrink-0 self-center overflow-hidden rounded-[15px] bg-white/10">
        <PodcastCover episode={episode} className="absolute inset-0 size-full object-cover" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col py-1 pr-1">
        <span className={`${readableTitle} leading-[1.1] font-semibold tracking-tight`}>{episode.name}</span>
        <span className={`mt-1.5 ${readableBody} leading-tight text-white/90`}>{episode.show}</span>
        <span className={`mt-auto pt-2 ${readableBody} leading-tight text-white/90 tabular-nums`}>
          {episodeDuration(episode.seconds)}
        </span>
      </span>
    </motion.button>
  );
}

function episodeSpacing(track: HTMLDivElement) {
  const first = track.firstElementChild as HTMLElement | null;
  return first ? first.offsetWidth + 12 : track.clientWidth || 1;
}

function EpisodeCarousel({ matches, anchorId, reducedMotion, inactive, onOpen, trackRef }: {
  matches: Episode[];
  anchorId: string | null;
  reducedMotion: boolean;
  inactive: boolean;
  onOpen: (episode: Episode) => void;
  trackRef: RefObject<HTMLDivElement | null>;
}) {
  const pointer = useRef<{ id: number; x: number; scrollLeft: number } | null>(null);
  const dragged = useRef(false);
  const position = useMotionValue(0);
  const isPresent = useIsPresent();

  const anchorIndex = matches.findIndex(episode => episode.id === anchorId);
  const firstEpisodeId = matches[0]?.id;
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || anchorIndex < 0) return;
    track.scrollTo({ left: anchorIndex * episodeSpacing(track), behavior: "instant" });
    position.jump(anchorIndex);
  }, [anchorIndex, anchorId, firstEpisodeId, position, trackRef]);

  function goTo(track: HTMLDivElement, index: number) {
    const target = Math.max(0, Math.min(matches.length - 1, index));
    track.scrollTo({ left: target * episodeSpacing(track), behavior: reducedMotion ? "instant" : "smooth" });
    return target;
  }

  function finishDrag(track: HTMLDivElement, pointerId: number) {
    const start = pointer.current;
    if (start?.id !== pointerId) return;
    pointer.current = null;
    if (!dragged.current) return;
    const spacing = episodeSpacing(track);
    const startIndex = Math.round(start.scrollLeft / spacing);
    const nearest = Math.round(track.scrollLeft / spacing);
    const distance = track.scrollLeft - start.scrollLeft;
    const target = nearest === startIndex && Math.abs(distance) >= 25 ? startIndex + Math.sign(distance) : nearest;
    track.style.scrollSnapType = "";
    if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
    goTo(track, target);
  }

  return (
    <motion.div
      layoutScroll
      ref={trackRef}
      inert={!isPresent || inactive || matches.length === 0}
      role="group"
      aria-label="Matching podcast episodes. Swipe left or right, or use the arrow keys."
      tabIndex={0}
      onScroll={(event) => {
        const track = event.currentTarget;
        position.set(track.scrollLeft / episodeSpacing(track));
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const track = event.currentTarget;
        const button = event.target instanceof HTMLButtonElement ? event.target : null;
        const current = button
          ? matches.findIndex(episode => episode.id === button.parentElement?.dataset.episode)
          : Math.round(track.scrollLeft / episodeSpacing(track));
        const next = goTo(track, current + (event.key === "ArrowRight" ? 1 : -1));
        if (button) track.querySelector<HTMLButtonElement>(`[data-episode="${matches[next]?.id}"] button`)?.focus({ preventScroll: true });
      }}
      onPointerDown={(event) => {
        dragged.current = false;
        if (matches.length < 2 || event.pointerType !== "mouse" || event.button !== 0) return;
        pointer.current = { id: event.pointerId, x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
      }}
      onPointerMove={(event) => {
        const start = pointer.current;
        if (start?.id !== event.pointerId || event.buttons !== 1) return;
        const distance = event.clientX - start.x;
        const track = event.currentTarget;
        if (!dragged.current) {
          if (Math.abs(distance) < 5) return;
          dragged.current = true;
          track.setPointerCapture(event.pointerId);
          track.style.scrollSnapType = "none";
        }
        track.scrollLeft = start.scrollLeft - distance * track.clientWidth / track.getBoundingClientRect().width;
      }}
      onPointerUp={(event) => finishDrag(event.currentTarget, event.pointerId)}
      onPointerCancel={(event) => finishDrag(event.currentTarget, event.pointerId)}
      onLostPointerCapture={(event) => finishDrag(event.currentTarget, event.pointerId)}
      onClickCapture={(event) => {
        if (dragged.current && event.detail !== 0) event.stopPropagation();
      }}
      className={`relative -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-6 py-1 [scrollbar-width:none] scroll-px-6 ${inactive ? "invisible" : ""} ${focusStyle}`}
    >
      {matches.map((episode, index) => (
        <div
          key={episode.id}
          data-episode={episode.id}
          className={`min-w-0 shrink-0 snap-start ${matches.length === 1 ? "basis-full" : "basis-[calc(100%-42px)] last:mr-[42px]"}`}
        >
          <EpisodeCard episode={episode} index={index} position={position} reducedMotion={reducedMotion} onOpen={() => onOpen(episode)} />
        </div>
      ))}
    </motion.div>
  );
}

function PodcastResultShelf({ matches, anchorId, travel, reducedMotion, busy, detailOpen, onOpen, trackRef }: {
  matches: Episode[];
  anchorId: string | null;
  travel: MotionValue<number>;
  reducedMotion: boolean;
  busy: boolean;
  detailOpen: boolean;
  onOpen: (episode: Episode) => void;
  trackRef: RefObject<HTMLDivElement | null>;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const shelfRef = useRef<HTMLDivElement>(null);
  const naturalHeight = useMotionValue(0);
  const height = useTransform(() => naturalHeight.get() * travel.get());
  const opacity = useTransform(travel, [0.31, 1], [0, 1], { ease: smoothProgress });
  const lift = useTransform(travel, [0.31, 1], [10, 0], { ease: smoothProgress });

  useLayoutEffect(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const measure = () => naturalHeight.set(shelf.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shelf);
    return () => observer.disconnect();
  }, [naturalHeight]);

  useEffect(() => {
    if (reducedMotion) {
      travel.jump(isPresent ? 1 : 0);
      if (!isPresent) safeToRemove?.();
      return;
    }
    const target = isPresent ? 1 : 0;
    const distance = Math.abs(target - travel.get());
    if (distance < 0.001) {
      travel.set(target);
      if (!isPresent) safeToRemove?.();
      return;
    }
    const animation = animate(travel, target, {
      duration: (isPresent ? 0.88 : 0.46) * Math.max(0.4, distance),
      ease: podcastEase,
      onComplete: isPresent ? undefined : safeToRemove,
    });
    return () => animation.stop();
  }, [isPresent, reducedMotion, safeToRemove, travel]);

  return (
    <motion.div
      data-podcast-shelf
      className={detailOpen ? "invisible absolute inset-x-0 bottom-0" : "relative"}
      style={reducedMotion ? undefined : { height }}
      inert={!isPresent || busy || detailOpen}
    >
      <div ref={shelfRef} className={reducedMotion ? "pb-[52px]" : "absolute inset-x-0 bottom-0 pb-[52px]"}>
        {matches.length > 0 && (
          <motion.div data-podcast-reveal className="pt-2.5" style={reducedMotion ? undefined : { opacity, y: lift }}>
            <EpisodeCarousel matches={matches} anchorId={anchorId} reducedMotion={reducedMotion} inactive={detailOpen} onOpen={onOpen} trackRef={trackRef} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

type PodcastPhase = "idle" | "opening" | "listening" | "searching" | "reviewing" | "results";

const podcastMicSize = "size-[max(1.25rem,calc(18px/var(--phone-preview-scale,1)))]";

const voicePace = {
  listening: 3100,
  searching: 1410,
  reviewing: 1320,
};

function PodcastStatus({ text, reply, reducedMotion }: { text: string; reply: boolean; reducedMotion: boolean }) {
  return (
    <div aria-hidden="true" className={`relative min-w-0 ${readableBody} leading-tight text-white`}>
      <span className="invisible block">{text || "\u00a0"}</span>
      <AnimatePresence initial={false}>
        {text && (
          <motion.p
            key={text}
            className="absolute inset-x-0 bottom-0"
            initial={reducedMotion ? false : { opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -1.5, transition: { duration: reducedMotion ? 0 : 0.14, ease: podcastEase } }}
            transition={{ duration: reducedMotion ? 0 : 0.3, delay: reducedMotion ? 0 : 0.06, ease: podcastEase }}
          >
            {reply && !reducedMotion ? text.split(" ").map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.24, delay: index * 0.042, ease: podcastEase }}
              >
                {index > 0 ? " " : ""}{word}
              </motion.span>
            )) : text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PodcastAssistant({ className }: Pick<OrganicUIProps, "className">) {
  const [phase, setPhase] = useState<PodcastPhase>("idle");
  const [request, setRequest] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [hasResults, setHasResults] = useState(false);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [opened, setOpened] = useState<Episode | null>(null);
  const [openingOrigin, setOpeningOrigin] = useState({ x: 0.12, y: 0.94 });
  const screenRef = useRef<HTMLElement>(null);
  const activateRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const resultTravel = useMotionValue(0);
  const voiceEnergy = useMotionValue(0);
  const sceneOpening = useMotionValue(0);
  const matches = hasResults ? matchEpisodes(preferences) : [];
  const searching = phase === "searching" || phase === "reviewing";
  const opening = phase === "opening";
  const busy = opening || phase === "listening" || searching;
  const resting = phase === "idle";

  useEffect(() => {
    if (opening) {
      const animation = animate(sceneOpening, 1, {
        duration: 1.02,
        ease: podcastEase,
        onComplete: () => setPhase("listening"),
      });
      return () => animation.stop();
    }
    if (!resting || sceneOpening.get() === 0) return;
    if (reducedMotion) {
      sceneOpening.set(0);
      return;
    }
    const animation = animate(sceneOpening, 0, { duration: 0.52, ease: podcastEase });
    return () => animation.stop();
  }, [opening, reducedMotion, resting, sceneOpening]);

  useEffect(() => {
    if (phase !== "searching") return;
    const timeout = window.setTimeout(() => setPhase("reviewing"), reducedMotion ? 600 : voicePace.searching);
    return () => window.clearTimeout(timeout);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "reviewing") return;
    const next = refinePodcastSearch(preferences, request);
    const previousEpisodes = hasResults ? matchEpisodes(preferences) : [];
    const nextEpisodes = matchEpisodes(next);
    const track = trackRef.current;
    const spacing = track ? episodeSpacing(track) : 1;
    const currentIndex = track ? Math.round(track.scrollLeft / spacing) : 0;
    const retained = previousEpisodes
      .map((episode, index) => ({ episode, index }))
      .filter(({ episode }) => nextEpisodes.includes(episode))
      .sort((a, b) => Math.abs(a.index - currentIndex) - Math.abs(b.index - currentIndex))[0];
    const align = !reducedMotion && track && retained && retained.index !== currentIndex
      ? window.setTimeout(() => track.scrollTo({ left: retained.index * spacing, behavior: "smooth" }), 550)
      : undefined;
    const timeout = window.setTimeout(() => {
      setAnchorId(retained?.episode.id ?? nextEpisodes[0]?.id ?? null);
      setPreferences(next);
      setHasResults(true);
      setPhase("results");
    }, reducedMotion ? 600 : voicePace.reviewing);
    return () => {
      window.clearTimeout(align);
      window.clearTimeout(timeout);
    };
  }, [hasResults, phase, preferences, reducedMotion, request]);

  useEffect(() => {
    if (phase !== "listening") return;
    if (reducedMotion) {
      const timeout = window.setTimeout(() => setPhase("searching"), 500);
      return () => window.clearTimeout(timeout);
    }

    const animation = animate(voiceEnergy, [0, 0, 1, 0, 0], {
      duration: voicePace.listening / 1000,
      times: [0, 0.18, 0.52, 0.9, 1],
      ease: podcastEase,
      onComplete: () => setPhase("searching"),
    });

    return () => {
      animation.stop();
      voiceEnergy.set(0);
    };
  }, [phase, reducedMotion, voiceEnergy]);

  useEffect(() => {
    if (opened) backRef.current?.focus({ preventScroll: true });
  }, [opened]);

  useEffect(() => {
    if (phase === "listening" || (phase === "results" && document.activeElement === document.body)) {
      micRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  useEffect(() => {
    if (resting) return;
    function dismiss(event: PointerEvent) {
      if (!(event.target instanceof Node) || cardRef.current?.contains(event.target)) return;
      setOpened(null);
      setHasResults(false);
      setPreferences(defaultPreferences);
      setPhase("idle");
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [resting]);

  function startVoice() {
    if (busy) return;
    const example = !hasResults ? "Find a podcast about everyday design."
      : preferences.maxMinutes === null ? "Keep it under 20 minutes."
      : preferences.topic ? "Any topic." : "Something about sound.";
    setRequest(example);
    if (resting) {
      const screen = screenRef.current?.getBoundingClientRect();
      const button = activateRef.current?.getBoundingClientRect();
      if (screen && button && screen.width && screen.height) {
        setOpeningOrigin({
          x: (button.x + button.width / 2 - screen.x) / screen.width,
          y: (button.y + button.height / 2 - screen.y) / screen.height,
        });
      }
      if (!reducedMotion) {
        setPhase("opening");
        return;
      }
      sceneOpening.set(1);
    }
    setPhase("listening");
  }

  function cancelRequest() {
    flushSync(() => {
      setPhase(hasResults ? "results" : "idle");
    });
    (hasResults ? micRef : activateRef).current?.focus({ preventScroll: true });
  }

  function closeEpisode() {
    const id = opened?.id;
    flushSync(() => setOpened(null));
    trackRef.current?.querySelector<HTMLButtonElement>(`[data-episode="${id}"] button`)?.focus({ preventScroll: true });
  }

  const subject = matches.length === 1 ? "an episode" : matches.length === 2 ? "two episodes" : "a few episodes";
  const topicLabel = preferences.topic === "sound" ? "sound design" : preferences.topic;
  const reply = !matches.length ? "I couldn’t find an episode that fits. Try a longer listen."
    : topicLabel ? `I found ${subject} about ${topicLabel}.`
    : preferences.maxMinutes !== null ? `I found ${subject} under ${preferences.maxMinutes} minutes.`
    : "I found a few stories about everyday design.";
  const requestedPreferences = searching ? refinePodcastSearch(preferences, request) : preferences;
  const reviewMessage = requestedPreferences.maxMinutes !== preferences.maxMinutes ? "Checking episode lengths…"
    : requestedPreferences.topic !== preferences.topic ? "Checking which episodes match the topic…"
    : "Picking a few stories about everyday design…";
  const progressMessage = phase === "reviewing" ? reviewMessage : "Looking for episodes…";
  const status = phase === "listening" ? "Listening…"
    : searching ? progressMessage : hasResults ? reply : "";
  const dotState = resting || opening ? "resting" : phase === "results" ? "ready" : phase;

  const voiceControl = (
    <button
      ref={micRef}
      type="button"
      aria-label={phase === "listening" ? "Stop listening" : searching ? "Stop searching" : "Refine with voice demo"}
      onClick={busy ? cancelRequest : startVoice}
      className={`absolute right-0 bottom-0 z-20 grid size-11 cursor-pointer place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10 motion-reduce:transition-none ${focusStyle}`}
    >
      {[false, true].map((stopIcon) => (
        <motion.span
          key={stopIcon ? "stop" : "mic"}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center"
          initial={false}
          animate={{ opacity: busy === stopIcon ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.26, ease: podcastEase }}
        >
          {stopIcon ? <Square size={13} fill="currentColor" /> : <Mic className={podcastMicSize} />}
        </motion.span>
      ))}
    </button>
  );

  return (
    <section ref={screenRef} aria-label="Organic UI podcast search" data-phase={phase} className={`relative isolate mx-auto flex h-full min-h-[460px] w-full flex-col justify-end overflow-clip bg-[#eeecef] text-white [color-scheme:dark] ${className ?? ""}`}>
      <PodcastScene origin={openingOrigin} opening={sceneOpening} resultTravel={resultTravel} />
      <div
        ref={cardRef}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          if (opened) {
            closeEpisode();
          } else if (busy) {
            cancelRequest();
          } else if (!resting) {
            flushSync(() => {
              setHasResults(false);
              setPreferences(defaultPreferences);
              setPhase("idle");
            });
            activateRef.current?.focus({ preventScroll: true });
          }
        }}
        className="relative px-6 pt-6 pb-7"
      >
        <span role="status" className="sr-only">{status}</span>
        <div className="relative">
          {!opened && (
            <div data-podcast-reply className="relative z-10 flex min-h-11 items-end gap-2 pr-12">
              <div className="relative grid size-11 shrink-0 place-items-center">
                <motion.span
                  aria-hidden="true"
                  data-agent-button-surface
                  className="pointer-events-none absolute size-9 rounded-full bg-[rgb(204_204_208_/_0.76)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.44)] backdrop-blur-[8px]"
                  initial={false}
                  animate={{ opacity: resting || opening ? 1 : 0, scale: opening ? 0.92 : resting ? 1 : 1.08 }}
                  transition={{ duration: reducedMotion ? 0 : 0.46, ease: podcastEase }}
                />
                <DotAgent state={dotState} reducedMotion={reducedMotion} voiceEnergy={voiceEnergy} />
                {(resting || opening) && (
                  <button ref={activateRef} type="button" aria-label="Activate voice search demo" aria-disabled={opening} onClick={startVoice} className="absolute inset-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5076a8]" />
                )}
              </div>
              <div className="grid min-h-11 min-w-0 flex-1 items-center">
                <PodcastStatus text={status} reply={phase === "results"} reducedMotion={reducedMotion} />
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {hasResults && (
              <PodcastResultShelf
                key="podcast-results"
                matches={matches}
                anchorId={anchorId}
                travel={resultTravel}
                reducedMotion={reducedMotion}
                busy={busy}
                detailOpen={Boolean(opened)}
                onOpen={setOpened}
                trackRef={trackRef}
              />
            )}
          </AnimatePresence>

          <AnimatePresence initial={false} mode="popLayout">
            {opened && (
              <motion.div
                key={opened.id}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.99, pointerEvents: "none" }}
                transition={{ duration: reducedMotion ? 0 : 0.3, ease: podcastEase }}
                className={`relative rounded-[25px] ${episodeGlass} p-3`}
              >
                <div className="flex gap-3">
                  <div className="relative aspect-square w-[38%] shrink-0 self-start overflow-hidden rounded-[17px] bg-white/10">
                    <PodcastCover episode={opened} className="absolute inset-0 size-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button ref={backRef} type="button" onClick={closeEpisode} aria-label="Back to podcast episodes" className={`mb-1 grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/10 ${focusStyle}`}><ChevronLeft size={19} aria-hidden="true" /></button>
                    <h3 className={`${readableTitle} leading-tight font-semibold`}>{opened.name}</h3>
                    <p className={`mt-2 ${readableBody} leading-snug text-white/95`}>{opened.description}</p>
                  </div>
                </div>
                <a
                  href={opened.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Listen to ${opened.name} on ${opened.show}`}
                  className={`mt-3 flex min-h-10 items-center justify-between rounded-full bg-white/12 px-3 ${readableBody} ${focusStyle}`}
                >
                  <span className="flex items-center gap-2"><Play size={14} fill="currentColor" aria-hidden="true" /> Listen</span>
                  <span className="flex items-center gap-2 tabular-nums">{episodeDuration(opened.seconds)} <ArrowUpRight size={15} aria-hidden="true" /></span>
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          {!opened && !resting && !opening && voiceControl}
        </div>
      </div>
    </section>
  );
}

export function OrganicUI({ className, podcastAssistant, makeupAssistant, coffeeAssistant }: OrganicUIProps) {
  return (podcastAssistant ?? makeupAssistant ?? coffeeAssistant ?? true) ? <PodcastAssistant className={className} /> : <KyotoAssistant className={className} />;
}

function KyotoAssistant({ className }: Pick<OrganicUIProps, "className">) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [placeIndex, setPlaceIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [surfaceWidth, setSurfaceWidth] = useState(width);
  const [returnPhase, setReturnPhase] = useState<"idle" | "places">("idle");
  const surfaceRef = useRef<HTMLDivElement>(null);
  const promptInput = useRef<HTMLInputElement>(null);
  const keyboardButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const placeButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const restoreFocus = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const maskId = useId();

  const place = placeIndex === null ? null : places[placeIndex];
  const playing = phase === "listening" || phase === "transcript";
  const generating = phase === "generating";
  const busy = playing || generating;
  const expanded = phase === "places" || phase === "image" || generating;
  const largeImage = Boolean(place) || phase === "image";
  const composing = phase === "idle" && composerOpen;
  const showPromptButton = phase === "idle" && !composerOpen;
  const showComposer = expanded || composing;
  const showPanel = showPromptButton || showComposer;
  const unitsPerPixel = width / surfaceWidth;
  const circleX = expanded ? promptMicX : center;
  const canvasHeight = largeImage ? 360 : expanded ? 270 : restingHeight;
  const diameter = expanded ? Math.min(76, surfaceWidth * 0.21) : showPanel ? promptCoreDiameter : phase === "listening" ? 86 : 76;
  const resultRadius = Math.min(48, surfaceWidth * 0.16);
  const micOffset = showPromptButton ? promptMicX - center : 0;
  const duration = reducedMotion ? 0 : 0.95;
  const morph = { duration, ease };
  const stageHeight = useMotionValue(restingHeight);
  const circleDiameter = useMotionValue(promptCoreDiameter);
  const centerX = useMotionValue(center);
  const iconOffset = useMotionValue(promptMicX - center);
  const panelProgress = useMotionValue(1);
  const resultProgress = useMotionValue(0);
  const radiusX = useTransform(circleDiameter, (value) => (value * unitsPerPixel) / 2);
  const radiusY = useTransform(() => (circleDiameter.get() * height) / (stageHeight.get() * 2));
  const microphoneLeft = useTransform(() => position(centerX.get() + iconOffset.get()));
  const circleLeft = useTransform(centerX, position);
  const panelBounds = useTransform(() => {
    const open = panelProgress.get();
    const result = resultProgress.get();
    return {
      attrX: mix(center, mix(promptPanel.attrX, resultPanel.attrX, result), open),
      attrY: mix(height / 2, mix(promptPanel.attrY, resultPanel.attrY, result), open),
      width: mix(promptPanel.width, resultPanel.width, result) * open,
      height: mix(promptPanel.height, resultPanel.height, result) * open,
      rx: mix(promptPanel.rx, resultRadius * unitsPerPixel, result) * open,
      ry: mix(promptPanel.ry, resultRadius * height / stageHeight.get(), result) * open,
    };
  });
  const panelX = useTransform(panelBounds, (bounds) => bounds.attrX);
  const panelY = useTransform(panelBounds, (bounds) => bounds.attrY);
  const panelWidth = useTransform(panelBounds, (bounds) => bounds.width);
  const panelHeight = useTransform(panelBounds, (bounds) => bounds.height);
  const panelRadiusX = useTransform(panelBounds, (bounds) => bounds.rx);
  const panelRadiusY = useTransform(panelBounds, (bounds) => bounds.ry);
  // Follow the live geometry so the bridge stays attached during a resize or reversal.
  const contour = useTransform(() => joinContour(panelBounds.get(), centerX.get(), radiusX.get(), radiusY.get()));
  const appear = { duration: reducedMotion ? 0 : 0.36 };
  const disappear = { duration: reducedMotion ? 0 : 0.14 };
  const status = phase === "idle" ? ""
    : phase === "listening" ? "Listening…"
    : phase === "generating" ? "Generating demo image…"
    : "“Find me a quiet afternoon in Kyoto.”";

  useEffect(() => {
    const options = { duration, ease };
    const animations = [
      animate(stageHeight, canvasHeight, options),
      animate(circleDiameter, diameter, options),
      animate(centerX, circleX, options),
      animate(iconOffset, micOffset, options),
      animate(panelProgress, showPanel ? 1 : 0, options),
      animate(resultProgress, expanded ? 1 : 0, options),
    ];
    return () => animations.forEach((animation) => animation.stop());
  }, [canvasHeight, centerX, circleDiameter, circleX, diameter, duration, expanded, iconOffset, micOffset, panelProgress, resultProgress, showPanel, stageHeight]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const measure = () => setSurfaceWidth(surface.clientWidth || width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const next = phase === "listening" ? ["transcript", 2200] as const
      : phase === "transcript" ? ["places", 1050] as const
      : phase === "generating" ? ["image", generationDuration] as const
      : null;
    if (!next) return;
    const timeout = window.setTimeout(() => setPhase(next[0]), next[1]);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (placeIndex !== null) {
      backButton.current?.focus({ preventScroll: true });
    } else if (restoreFocus.current !== null) {
      placeButtons.current[restoreFocus.current]?.focus({ preventScroll: true });
      restoreFocus.current = null;
    }
  }, [placeIndex]);

  function play() {
    if (busy) return;
    setPlaceIndex(null);
    setComposerOpen(false);
    setPhase("listening");
  }

  function openComposer() {
    flushSync(() => setComposerOpen(true));
    promptInput.current?.focus({ preventScroll: true });
  }

  function closeComposer() {
    flushSync(() => setComposerOpen(false));
    keyboardButton.current?.focus({ preventScroll: true });
  }

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    if (phase === "idle" || phase === "places") setReturnPhase(phase);
    setPlaceIndex(null);
    setPhase("generating");
  }

  function closePlace() {
    restoreFocus.current = placeIndex;
    setPlaceIndex(null);
  }

  return (
    <section aria-label="Organic UI" data-phase={phase} className={`mx-auto my-auto w-full min-w-0 max-w-[500px] pb-10 text-[#f2f2f4] [color-scheme:dark] ${className ?? ""}`}>
      <motion.div
        ref={surfaceRef}
        style={{ height: stageHeight }}
        className="relative isolate"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[#10131c]/60 backdrop-blur-[32px]"
          style={{ maskImage: `url(#${maskId})` }}
        />
        <svg aria-hidden="true" className="pointer-events-none absolute size-0">
          <defs>
            <mask id={maskId} maskContentUnits="objectBoundingBox">
              <g transform={`scale(${1 / width} ${1 / height})`} fill="white">
                <motion.ellipse cx={centerX} cy={height / 2} rx={radiusX} ry={radiusY} />
                <motion.path d={contour} />
                <motion.rect
                  x={panelX}
                  y={panelY}
                  width={panelWidth}
                  height={panelHeight}
                  rx={panelRadiusX}
                  ry={panelRadiusY}
                />
              </g>
            </mask>
          </defs>
        </svg>

        <AnimatePresence>
          {busy && (
            <motion.div
              aria-hidden="true"
              key="voice-activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.4 }}
              style={{ left: circleLeft, width: circleDiameter, height: circleDiameter }}
              className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
            >
              <motion.div
                initial={false}
                animate={{ rotate: reducedMotion ? 0 : 360, scale: reducedMotion ? 1 : [1, 1.12, 1] }}
                transition={{ duration: reducedMotion ? 0 : 5, ease: "linear", repeat: reducedMotion ? 0 : Infinity }}
                className="absolute -inset-1/3 bg-[conic-gradient(from_0deg,#a78bfa,#60a5fa,#f0abfc,#a78bfa)] opacity-65 blur-[14px]"
              />
              <div className="absolute inset-[16%] rounded-full bg-[#242429]/65 blur-[8px]" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          role="status"
          initial={false}
          animate={{ left: position(expanded ? 197 : center), top: expanded ? "16%" : "101%", opacity: largeImage ? 0 : 1 }}
          transition={morph}
          className={`pointer-events-none absolute w-[59%] -translate-x-1/2 -translate-y-1/2 text-[13px] leading-snug text-[#d4d4da] ${expanded ? "text-left" : "text-center"}`}
        >
          <span className={phase === "listening" || generating ? "sr-only" : undefined}>
            {largeImage ? (place ? place.title : "Demo image ready.") : status}
          </span>
        </motion.p>

        <AnimatePresence initial={false}>
          {phase === "places" && !place && (
            <motion.div
              key="places"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: disappear }}
              transition={appear}
              className="absolute top-[26%] left-[9.9%] grid w-[59%] gap-1.5"
            >
              {places.map(({ title, image }, index) => (
                <motion.button
                  key={title}
                  ref={(button) => { placeButtons.current[index] = button; }}
                  type="button"
                  onClick={() => setPlaceIndex(index)}
                  initial={reducedMotion ? false : { opacity: 0, y: 9 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...appear, delay: reducedMotion ? 0 : 0.32 + index * 0.19 }}
                  className={`grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl p-1 pr-2 text-left text-[#f2f2f4] transition-colors hover:bg-white/8 ${focusStyle}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size demo thumbnail. */}
                  <img src={image} width={384} height={384} alt="" className="size-9 rounded-[9px] object-cover" />
                  <span className="text-[11px] leading-tight font-medium sm:text-xs">{title}</span>
                  <ChevronRight aria-hidden="true" size={14} />
                </motion.button>
              ))}
              <span className="mt-0.5 pl-1 text-[10px] text-[#a3a3ad]">AI concept images</span>
            </motion.div>
          )}

          {largeImage && (
            <motion.div
              key={place ? place.href : "image"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: disappear }}
              transition={{ ...appear, delay: reducedMotion ? 0 : 0.15 }}
              className="absolute top-[11%] left-[9.9%] grid w-[59%] gap-2"
            >
              <div className="flex items-center gap-2">
                <button
                  ref={place ? backButton : undefined}
                  type="button"
                  aria-label={place ? "Back to places" : "Back from image"}
                  onClick={place ? closePlace : () => setPhase(returnPhase)}
                  className={`grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/8 ${focusStyle}`}
                >
                  <ArrowLeft aria-hidden="true" size={15} />
                </button>
                <h2 className="min-w-0 text-[11px] leading-tight font-semibold sm:text-[13px]">{place?.title ?? demoImage.title}</h2>
              </div>
              <motion.div
                initial={reducedMotion ? false : { clipPath: "inset(24% 25% round 12px)", opacity: 0 }}
                animate={{ clipPath: "inset(0% 0% round 15px)", opacity: 1 }}
                transition={{ ...morph, delay: reducedMotion ? 0 : 0.18 }}
                className="h-[128px] overflow-hidden rounded-[15px] sm:h-[146px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local concept image for this demo. */}
                <img src={place?.image ?? demoImage.image} alt={`AI concept image for ${place?.title ?? demoImage.title}`} className="size-full object-cover" />
              </motion.div>
              {place ? (
                <a
                  href={place.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-9 items-center justify-between gap-1.5 rounded-xl px-2.5 text-[11px] font-medium hover:bg-white/8 ${focusStyle}`}
                >
                  Official site <ArrowUpRight aria-hidden="true" size={14} />
                </a>
              ) : (
                <span className="pl-1 text-[10px] text-[#a3a3ad]">Demo image</span>
              )}
            </motion.div>
          )}

          {generating && (
            <motion.div
              key="generation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: disappear }}
              transition={appear}
              className="absolute top-[29%] left-[9.9%] grid h-[36%] w-[59%] content-center gap-3 px-2"
            >
              <span className="line-clamp-2 text-[11px] leading-snug text-[#c7c7d0]">{draft.trim()}</span>
              <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: "4%" }}
                  animate={{ width: reducedMotion ? "48%" : "100%" }}
                  transition={{ duration: reducedMotion ? 0 : generationDuration / 1000, ease: "linear" }}
                  className="h-full rounded-full bg-white/60"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showComposer && (
          <motion.form
            onSubmit={generate}
            onKeyDown={(event) => { if (event.key === "Escape" && composing) closeComposer(); }}
            initial={reducedMotion ? false : { left: position(center), top: "50%", width: "20%", opacity: 0 }}
            animate={{ left: position(composing ? center : 197), top: expanded ? (largeImage ? "83%" : "82%") : "50%", width: composing ? "78%" : "59%", opacity: 1 }}
            transition={{ ...morph, opacity: { duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.27 } }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
          >
            {composing && (
              <button type="button" aria-label="Close prompt" onClick={closeComposer} className={`grid size-8 shrink-0 place-items-center rounded-full text-white/75 hover:bg-white/8 ${focusStyle}`}>
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
            )}
            <input
              ref={promptInput}
              aria-label="Describe an image"
              maxLength={120}
              value={draft}
              readOnly={generating}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={composing ? "Search or Ask" : "Describe an image"}
              className="min-w-0 flex-1 bg-transparent text-base text-[#f2f2f4] outline-none placeholder:text-[12px] placeholder:text-white/75 sm:text-[13px]"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Generate demo image"
              className={`grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#24252a] hover:bg-white/85 disabled:bg-transparent disabled:text-white/45 ${focusStyle}`}
            >
              <ArrowUp aria-hidden="true" size={15} />
            </button>
          </motion.form>
        )}

        {showPromptButton && (
          <button
            ref={keyboardButton}
            type="button"
            aria-label="Type a prompt"
            onClick={openComposer}
            className={`absolute top-1/2 flex h-11 -translate-y-1/2 items-center rounded-full text-left text-base text-white/80 hover:text-white ${focusStyle}`}
            style={{ left: position(65), width: position(300) }}
          >
            Search or Ask
          </button>
        )}

        {!composing && <motion.button
          type="button"
          aria-label={phase === "listening" ? "Listening to demo" : busy ? "Processing demo" : expanded ? "Replay voice demo" : "Start voice demo"}
          aria-disabled={busy}
          onClick={play}
          style={{ left: microphoneLeft }}
          className={`group absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[#f2f2f4] ${focusStyle}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === "listening" ? (
              <motion.span
                key="waveform"
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
              >
                <VoiceWave reducedMotion={Boolean(reducedMotion)} />
              </motion.span>
            ) : (
              <motion.span key="microphone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}>
                <Mic aria-hidden="true" size={19} className="transition-transform group-hover:scale-110 motion-reduce:transition-none" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>}
      </motion.div>
    </section>
  );
}
