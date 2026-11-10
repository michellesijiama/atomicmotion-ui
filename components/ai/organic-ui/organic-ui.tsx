"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { flushSync } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowLeft, ArrowUp, ArrowUpRight, ChevronRight, Keyboard, Volume2 } from "lucide-react";

export type OrganicUIProps = {
  className?: string;
};

type Phase = "idle" | "listening" | "transcript" | "places" | "generating" | "image";

const width = 500;
const height = 200;
const center = width / 2;
const restingHeight = 150;
const dockDiameter = 108;
const generationDuration = 2400;
const resultPanel = { attrX: 20, attrY: 12, width: 336, height: 176, rx: 56, ry: 40 };
const promptPanel = { attrX: 22, attrY: 47, width: 334, height: 106, rx: 58, ry: 53 };
const ease = [0.25, 0.8, 0.25, 1] as const;

const places = [
  { title: "Kamo River", href: "https://www.japan.travel/en/spot/1183/", image: "/components/organic-ui/kyoto-river.webp" },
  { title: "Kyoto City Museum of Art", href: "https://kyotocity-kyocera.museum/en/", image: "/components/organic-ui/kyoto-gallery.webp" },
] as const;

const scenes = [
  { title: "Kyoto after dark", image: "/components/organic-ui/kyoto-night.webp", matches: /night|rain|street|lane|alley|dusk|夜|雨|街|巷/i },
  { title: "Sunlit gallery", image: places[1].image, matches: /museum|gallery|art|展厅|美术馆|博物馆/i },
  { title: "Quiet riverside", image: places[0].image, matches: /river|water|kamo|河|鸭川|鴨川/i },
] as const;

const position = (x: number) => `${(x / width) * 100}%`;
const focusStyle = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#333]";
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;

function joinContour(panel: typeof resultPanel, speakerX: number, rx: number, ry: number) {
  const startX = panel.attrX + panel.width - panel.rx * 0.4;
  const startY = panel.attrY + panel.ry * 0.21;
  const endX = speakerX - rx * 0.6;
  const endY = height / 2 - ry * 0.79;
  if (panel.rx <= 0 || endX <= startX + 1) return "";
  const midX = (startX + endX) / 2;
  const neckY = height / 2 - ry * 0.54;
  const reach = (endX - startX) * 0.24;
  const leftY = startY + reach * (panel.ry / panel.rx) * 0.75;
  const rightY = endY + reach * (ry / rx) * 0.75;

  return `M ${startX} ${startY}
    C ${startX + reach} ${leftY} ${midX - reach} ${neckY} ${midX} ${neckY}
    C ${midX + reach} ${neckY} ${endX - reach} ${rightY} ${endX} ${endY}
    L ${endX} ${height - endY}
    C ${endX - reach} ${height - rightY} ${midX + reach} ${height - neckY} ${midX} ${height - neckY}
    C ${midX - reach} ${height - neckY} ${startX + reach} ${height - leftY} ${startX} ${height - startY} Z`;
}

export function OrganicUI({ className }: OrganicUIProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [placeIndex, setPlaceIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [surfaceWidth, setSurfaceWidth] = useState(width);
  const [scene, setScene] = useState<(typeof scenes)[number]>(scenes[0]);
  const [promptHelp, setPromptHelp] = useState(false);
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
  const showKeyboard = phase === "idle" && !composerOpen;
  const showComposer = expanded || composing;
  const unitsPerPixel = width / surfaceWidth;
  const circleX = showComposer ? 424 : center;
  const canvasHeight = largeImage ? 360 : expanded ? 270 : restingHeight;
  const diameter = showKeyboard ? dockDiameter : showComposer ? Math.min(84, surfaceWidth * 0.21) : phase === "listening" ? 86 : 76;
  const duration = reducedMotion ? 0 : 0.95;
  const morph = { duration, ease };
  const stageHeight = useMotionValue(restingHeight);
  const circleDiameter = useMotionValue(dockDiameter);
  const centerX = useMotionValue(center);
  const iconOffset = useMotionValue(22);
  const panelProgress = useMotionValue(0);
  const resultProgress = useMotionValue(0);
  const radiusX = useTransform(circleDiameter, (value) => (value * unitsPerPixel) / 2);
  const radiusY = useTransform(() => (circleDiameter.get() * height) / (stageHeight.get() * 2));
  const speakerLeft = useTransform(() => position(centerX.get() + iconOffset.get() * unitsPerPixel));
  const panelBounds = useTransform(() => {
    const open = panelProgress.get();
    const result = resultProgress.get();
    return {
      attrX: mix(center, mix(promptPanel.attrX, resultPanel.attrX, result), open),
      attrY: mix(height / 2, mix(promptPanel.attrY, resultPanel.attrY, result), open),
      width: mix(promptPanel.width, resultPanel.width, result) * open,
      height: mix(promptPanel.height, resultPanel.height, result) * open,
      rx: mix(promptPanel.rx, resultPanel.rx, result) * open,
      ry: mix(promptPanel.ry, resultPanel.ry, result) * open,
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
      animate(iconOffset, showKeyboard ? 22 : 0, options),
      animate(panelProgress, showComposer ? 1 : 0, options),
      animate(resultProgress, expanded ? 1 : 0, options),
    ];
    return () => animations.forEach((animation) => animation.stop());
  }, [canvasHeight, centerX, circleDiameter, circleX, diameter, duration, expanded, iconOffset, panelProgress, resultProgress, showComposer, showKeyboard, stageHeight]);

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
    const next = phase === "listening" ? ["transcript", 1250] as const
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
    setPromptHelp(false);
    setComposerOpen(false);
    setPhase("listening");
  }

  function openComposer() {
    flushSync(() => setComposerOpen(true));
    promptInput.current?.focus({ preventScroll: true });
  }

  function closeComposer() {
    flushSync(() => {
      setPromptHelp(false);
      setComposerOpen(false);
    });
    keyboardButton.current?.focus({ preventScroll: true });
  }

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !draft.trim()) return;
    const match = scenes.find(({ matches }) => matches.test(draft));
    if (!match) {
      setPromptHelp(true);
      return;
    }

    if (phase === "idle" || phase === "places") setReturnPhase(phase);
    setScene(match);
    setPlaceIndex(null);
    setPromptHelp(false);
    setPhase("generating");
  }

  function closePlace() {
    restoreFocus.current = placeIndex;
    setPlaceIndex(null);
  }

  return (
    <section aria-label="Organic UI" data-phase={phase} className={`mx-auto my-auto w-full min-w-0 max-w-[500px] pb-10 ${className ?? ""}`}>
      <motion.div
        ref={surfaceRef}
        style={{ height: stageHeight }}
        className="relative isolate"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-black/6 backdrop-blur-[24px]"
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

        <motion.p
          role="status"
          initial={false}
          animate={{ left: position(expanded ? 197 : center), top: expanded ? "14%" : "101%", opacity: largeImage ? 0 : 1 }}
          transition={morph}
          className={`pointer-events-none absolute w-[59%] -translate-x-1/2 -translate-y-1/2 text-[13px] leading-snug text-[#3e3e3e] ${expanded ? "text-left" : "text-center"}`}
        >
          {largeImage ? (place ? place.title : "Demo image ready.") : status}
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
                  className={`grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl p-1 pr-2 text-left text-[#222] transition-colors hover:bg-white/60 ${focusStyle}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size demo thumbnail. */}
                  <img src={image} width={384} height={384} alt="" className="size-9 rounded-[9px] object-cover" />
                  <span className="text-[11px] leading-tight font-medium sm:text-xs">{title}</span>
                  <ChevronRight aria-hidden="true" size={14} />
                </motion.button>
              ))}
              <span className="mt-0.5 pl-1 text-[10px] text-[#5c5c5c]">AI concept images</span>
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
                  className={`grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/60 ${focusStyle}`}
                >
                  <ArrowLeft aria-hidden="true" size={15} />
                </button>
                <h2 className="min-w-0 text-[11px] leading-tight font-semibold sm:text-[13px]">{place?.title ?? scene.title}</h2>
              </div>
              <motion.div
                initial={reducedMotion ? false : { clipPath: "inset(24% 25% round 12px)", opacity: 0 }}
                animate={{ clipPath: "inset(0% 0% round 15px)", opacity: 1 }}
                transition={{ ...morph, delay: reducedMotion ? 0 : 0.18 }}
                className="h-[128px] overflow-hidden rounded-[15px] sm:h-[146px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local concept image for this demo. */}
                <img src={place?.image ?? scene.image} alt={`AI concept image for ${place?.title ?? scene.title}`} className="size-full object-cover" />
              </motion.div>
              {place ? (
                <a
                  href={place.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-9 items-center justify-between gap-1.5 rounded-xl px-2.5 text-[11px] font-medium hover:bg-white/60 ${focusStyle}`}
                >
                  Official site <ArrowUpRight aria-hidden="true" size={14} />
                </a>
              ) : (
                <span className="pl-1 text-[10px] text-[#5c5c5c]">Demo image</span>
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
              <span className="line-clamp-2 text-[11px] leading-snug text-[#444]">{draft.trim()}</span>
              <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-black/10">
                <motion.div
                  initial={{ width: "4%" }}
                  animate={{ width: reducedMotion ? "48%" : "100%" }}
                  transition={{ duration: reducedMotion ? 0 : generationDuration / 1000, ease: "linear" }}
                  className="h-full rounded-full bg-black/45"
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
            animate={{ left: position(197), top: expanded ? (largeImage ? "83%" : "82%") : "50%", width: "59%", opacity: 1 }}
            transition={{ ...morph, opacity: { duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.27 } }}
            className="absolute grid -translate-x-1/2 -translate-y-1/2 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 py-1"
          >
            <input
              ref={promptInput}
              aria-label="Describe an image"
              aria-describedby={promptHelp ? `${maskId}-hint` : undefined}
              maxLength={120}
              value={draft}
              readOnly={generating}
              onChange={(event) => { setDraft(event.target.value); setPromptHelp(false); }}
              placeholder="Try “Kyoto at night”"
              className="min-w-0 rounded-md bg-transparent text-base text-[#222] outline-none placeholder:text-[#656565] focus-visible:bg-white/25 sm:text-[12px]"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Generate demo image"
              className={`grid size-9 place-items-center rounded-full bg-black/8 text-[#262626] hover:bg-black/12 disabled:bg-transparent disabled:text-[#777] ${focusStyle}`}
            >
              <ArrowUp aria-hidden="true" size={15} />
            </button>
            {promptHelp && (
              <span id={`${maskId}-hint`} role="alert" className="absolute top-full left-1 mt-1 w-full text-[10px] leading-tight text-[#555]">
                Try river, museum, or night street.
              </span>
            )}
          </motion.form>
        )}

        {showKeyboard && (
          <button
            ref={keyboardButton}
            type="button"
            aria-label="Type a prompt"
            onClick={openComposer}
            className={`group absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[#202020] ${focusStyle}`}
            style={{ left: position(center - 22 * unitsPerPixel) }}
          >
            <Keyboard aria-hidden="true" size={19} className="transition-transform group-hover:scale-110 motion-reduce:transition-none" />
          </button>
        )}

        <motion.button
          type="button"
          aria-label={expanded ? "Replay demo" : "Play demo"}
          aria-disabled={busy}
          onClick={play}
          style={{ left: speakerLeft }}
          className={`group absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[#202020] ${focusStyle}`}
        >
          <Volume2 aria-hidden="true" size={19} className="transition-transform group-hover:scale-110 motion-reduce:transition-none" />
        </motion.button>
      </motion.div>
    </section>
  );
}
