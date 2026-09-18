"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Inlined so this folder is self-contained — copy it anywhere and it works.
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type FrostedEventCardProps = {
  /** Title lines; each entry is one line. */
  title?: string[];
  subtitle?: string;
  /** The date badge. `dateTime` is the machine-readable ISO date. */
  date?: { month: string; day: string; weekday: string; dateTime: string };
  /** Button label before signing up. */
  cta?: string;
  /** Button label once signed up. */
  ctaDone?: string;
  /** A photo for the frosted picture. Without one, a blurred pagoda is drawn. */
  image?: string;
  imageAlt?: string;
  /** Sign up and un-sign on its own until someone takes over (the gallery card sets it). */
  loop?: boolean;
  onSignUp?: (signedUp: boolean) => void;
  onShare?: () => void;
  className?: string;
};

// Reads the host's fonts if it exposes them (the gallery does, via next/font),
// falls back to installed faces, then to the system stacks.
const FONT_SANS = "var(--font-manrope, Manrope), Manrope, ui-sans-serif, system-ui, sans-serif";
const FONT_SERIF = "var(--font-instrument-serif, 'Instrument Serif'), 'Instrument Serif', Georgia, 'Times New Roman', serif";

const CARD_W = 320;
const CARD_H = 416;
const CARD_RADIUS = 28;
const PAD = 16;
const CTA_H = 58;
/** Gallery card: how often the button signs up / un-signs on its own. */
const LOOP_EVERY = 2600;

const INK = "#08080A";
const LAVENDER = "#E6E0FF";

const SOFT = { type: "spring", stiffness: 220, damping: 26 } as const;
const PRESS = { type: "spring", stiffness: 500, damping: 30 } as const;
const bell = [0.45, 0, 0.55, 1] as const;

const DEFAULT_TITLE = ["The Autumn", "Book Salon"];
const DEFAULT_SUBTITLE = "This season's pick: The Remains of the Day by Kazuo Ishiguro";
const DEFAULT_DATE = { month: "OCT", day: "14", weekday: "Wed", dateTime: "2026-10-14" };

/**
 * The picture when no photo is given: a pale sky, four soft colour halos, and a
 * three-tier pagoda blurred until it reads as a memory of one. Static — the
 * layer above it moves, this never re-renders.
 */
function PagodaBloom({ id }: { id: string }) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3E0E8" />
          <stop offset="0.45" stopColor="#F1EDF0" />
          <stop offset="1" stopColor="#C9C5D2" />
        </linearGradient>
        <radialGradient id={`${id}-violet`}>
          <stop offset="0" stopColor="#8A78E6" stopOpacity="0.7" />
          <stop offset="1" stopColor="#6A58C8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-peach`}>
          <stop offset="0" stopColor="#F8D4B4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F6CBA6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-rose`}>
          <stop offset="0" stopColor="#F0C3D6" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ECB7CE" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-slate`}>
          <stop offset="0" stopColor="#AEB6CA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#98A2BA" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-haze`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
      </defs>
      <rect width={CARD_W} height={CARD_H} fill={`url(#${id}-sky)`} />
      <g filter={`url(#${id}-haze)`}>
        <ellipse cx="150" cy="72" rx="96" ry="62" fill={`url(#${id}-violet)`} />
        <ellipse cx="266" cy="150" rx="92" ry="84" fill={`url(#${id}-peach)`} />
        <ellipse cx="56" cy="214" rx="92" ry="72" fill={`url(#${id}-rose)`} />
        <ellipse cx="200" cy="252" rx="134" ry="72" fill={`url(#${id}-slate)`} />
      </g>
      <g filter={`url(#${id}-soft)`} transform="translate(160 40) scale(0.92) translate(-160 -40)">
        <rect x="157" y="34" width="6" height="26" rx="3" fill="#6E63A6" />
        <path d="M160 44 C 176 68, 198 84, 222 90 L 98 90 C 122 84, 144 68, 160 44 Z" fill="#544A8E" />
        <rect x="122" y="88" width="76" height="30" fill="#BDB6D0" />
        <path d="M160 82 C 195 112, 232 130, 268 136 L 52 136 C 88 130, 125 112, 160 82 Z" fill="#615B78" />
        <rect x="96" y="134" width="128" height="40" fill="#C6C0D4" />
        <path d="M160 128 C 205 160, 255 180, 300 186 L 20 186 C 65 180, 115 160, 160 128 Z" fill="#767088" />
        <rect x="70" y="184" width="180" height="70" fill="#9E98B0" />
      </g>
    </svg>
  );
}

/** A dense, static speckle laid over the picture so it reads as frosted film. */
function Grain({ id }: { id: string }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "overlay", opacity: 0.7 }}
    >
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" />
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

/** The check that draws itself when the button flips to signed. */
function Check() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" stroke="#3A2E7A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M3.5 9.5l3.5 3.5 7.5-8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.1, ease: bell }}
      />
    </svg>
  );
}

export function FrostedEventCard({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  date = DEFAULT_DATE,
  cta = "Sign up to this event",
  ctaDone = "You're on the list",
  image,
  imageAlt,
  loop = false,
  onSignUp,
  onShare,
  className,
}: FrostedEventCardProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [signedUp, setSignedUp] = React.useState(false);
  const [interacted, setInteracted] = React.useState(false);

  // Gallery card: flip the button on its own until someone takes over.
  React.useEffect(() => {
    if (!loop || interacted) return;
    const id = window.setInterval(() => setSignedUp((s) => !s), LOOP_EVERY);
    return () => window.clearInterval(id);
  }, [loop, interacted]);

  const toggle = () => {
    setInteracted(true);
    setSignedUp((s) => {
      onSignUp?.(!s);
      return !s;
    });
  };

  const share = () => {
    setInteracted(true);
    onShare?.();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("relative flex h-full min-h-[460px] w-full items-center justify-center bg-transparent", className)}
        style={{ fontFamily: FONT_SANS }}
      >
        <motion.article
          initial="rest"
          animate="rest"
          whileHover="hover"
          className="relative overflow-hidden"
          style={{
            width: CARD_W,
            height: CARD_H,
            borderRadius: CARD_RADIUS,
            background: INK,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 30px 60px -24px rgba(20,18,30,0.45)",
          }}
        >
          {/* The picture: it breathes on its own and leans in on hover. */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
            transition={SOFT}
            style={{ transformOrigin: "50% 35%" }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ x: [0, 3, 0], y: [0, -6, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            >
              {image ? (
                // A plain <img>: this file is meant to be copied out of Next.js.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={imageAlt ?? ""} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <PagodaBloom id={`${uid}-bloom`} />
              )}
            </motion.div>
            <Grain id={`${uid}-grain`} />
          </motion.div>

          {/* The fade into black that the type sits on. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: `linear-gradient(to bottom, transparent 40%, rgba(8,8,10,0.85) 62%, ${INK} 74%)` }}
          />

          {/* Date badge */}
          <time
            dateTime={date.dateTime}
            className="absolute flex flex-col items-center overflow-hidden bg-white text-center"
            style={{ left: PAD, top: PAD, width: 64, height: 80, borderRadius: 14, boxShadow: "0 8px 20px -10px rgba(0,0,0,0.5)" }}
          >
            <span className="flex w-full items-center justify-center text-[10px] font-bold uppercase text-white" style={{ height: 22, background: "#0E0E10", letterSpacing: "0.1em" }}>
              {date.month}
            </span>
            <span className="mt-[7px] text-[17px] font-semibold leading-none" style={{ color: "#111" }}>
              {date.day}
            </span>
            <span className="mt-[5px] text-[12px] leading-none" style={{ color: "#7A7A80" }}>
              {date.weekday}
            </span>
          </time>

          {/* Share */}
          <motion.button
            type="button"
            aria-label="Share event"
            onClick={share}
            whileTap={{ scale: 0.94 }}
            transition={PRESS}
            className="absolute flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              right: PAD,
              top: PAD,
              width: 64,
              height: 80,
              borderRadius: 18,
              background: "rgba(255,255,255,0.22)",
              backdropFilter: "blur(14px) saturate(140%)",
              WebkitBackdropFilter: "blur(14px) saturate(140%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
            }}
          >
            <ShareGlyph />
          </motion.button>

          {/* Copy */}
          <div className="absolute inset-x-0" style={{ bottom: PAD + CTA_H + 26, paddingInline: 20 }}>
            <h3
              className="text-white"
              style={{ fontFamily: FONT_SERIF, fontSize: 38, lineHeight: 1.02, letterSpacing: "-0.01em", fontWeight: 400 }}
            >
              {title.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h3>
            <p className="mt-[10px] text-[13px]" style={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.4, maxWidth: 250 }}>
              {subtitle}
            </p>
          </div>

          {/* CTA */}
          <motion.button
            type="button"
            aria-pressed={signedUp}
            onClick={toggle}
            whileTap={{ scale: 0.98 }}
            animate={{ background: signedUp ? LAVENDER : "#FFFFFF" }}
            transition={{ duration: 0.26, ease: bell }}
            className="absolute flex items-center justify-center overflow-hidden text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ left: PAD, right: PAD, bottom: PAD, height: CTA_H, borderRadius: 18, color: signedUp ? "#3A2E7A" : "#111" }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={signedUp ? "done" : "idle"}
                className="flex items-center gap-2"
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.22, ease: bell }}
              >
                {signedUp && <Check />}
                {signedUp ? ctaDone : cta}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.article>
      </div>
    </MotionConfig>
  );
}
