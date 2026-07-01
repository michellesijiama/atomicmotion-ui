"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type GeminiLiveProps = {
  className?: string;
  loop?: boolean;
};

const m3ColorScheme = {
  surface: "#141218",
  surfaceContainerLow: "#1d1b20",
  surfaceContainer: "#211f26",
  surfaceContainerHigh: "#2b2930",
  surfaceContainerHighest: "#36343b",
  onSurface: "#e6e0e9",
  onSurfaceVariant: "#cac4d0",
  outlineVariant: "#49454f",
  primary: "#d0bcff",
  primaryContainer: "#4f378b",
} as const;
const activeListeningBlue = "#4285f4";
const activeListeningBlueLight = "#8ab4f8";
const activeListeningRestrictedEdgeGlow = "restricted-edge-glow";
const activeListeningPulsePattern = "random-dynamic-subtle-ring";
const activeListeningFluidGradient = "fluid-conic-blue-edge-gradient";
const edgeWaveFrequencyPaths = {
  horizontal: {
    relaxed:
      "M0 24 C36 18 54 30 90 24 C126 18 144 30 180 24 C216 18 234 30 270 24 C306 18 324 30 360 24",
    active:
      "M0 24 C22 8 48 40 72 24 C96 8 122 40 144 24 C168 8 192 40 216 24 C240 8 266 40 288 24 C314 8 338 40 360 24",
    tight:
      "M0 24 C16 4 32 44 48 24 C64 4 80 44 96 24 C112 4 128 44 144 24 C160 4 176 44 192 24 C208 4 224 44 240 24 C256 4 272 44 288 24 C304 4 320 44 336 24 C344 14 352 18 360 24",
  },
  vertical: {
    relaxed:
      "M24 0 C18 26 30 42 24 68 C18 94 30 110 24 136 C18 162 30 178 24 204 C18 230 30 244 24 260",
    active:
      "M24 0 C8 18 40 38 24 56 C8 74 40 94 24 112 C8 130 40 150 24 168 C8 186 40 206 24 224 C10 240 38 248 24 260",
    tight:
      "M24 0 C4 12 44 24 24 36 C4 48 44 60 24 72 C4 84 44 96 24 108 C4 120 44 132 24 144 C4 156 44 168 24 180 C4 192 44 204 24 216 C4 228 44 240 24 252 C18 256 18 258 24 260",
  },
} as const;

const m3IconButtonClassName =
  "inline-flex size-10 items-center justify-center rounded-full text-[var(--m3-on-surface-variant)] transition-colors hover:bg-white/8 hover:text-[var(--m3-on-surface)] focus-visible:outline-none";
const m3BottomControlButtonClassName =
  "inline-flex h-8 w-[43px] items-center justify-center rounded-[10px] text-[var(--m3-on-surface-variant)] focus-visible:outline-none";
const sourceChipClassName =
  "inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#243a61] px-3 text-[15px] font-medium text-[#d8e3f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

type MaterialSymbolName =
  | "article"
  | "close"
  | "info"
  | "keyboard"
  | "more_vert"
  | "pause";

function MaterialSymbolIcon({
  name,
  className,
}: {
  name: MaterialSymbolName;
  className?: string;
}) {
  const commonProps = {
    className: cn("size-6", className),
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
  } as const;

  if (name === "more_vert") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="16" r="1.8" />
      </svg>
    );
  }

  if (name === "pause") {
    return (
      <svg {...commonProps}>
        <path d="M7 19c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h2.5c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1H7Zm7.5 0c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1H17c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1h-2.5Z" />
      </svg>
    );
  }

  if (name === "keyboard") {
    return (
      <svg {...commonProps}>
        <path d="M4.8 18c-.77 0-1.42-.27-1.96-.81A2.67 2.67 0 0 1 2 15.22V8.78c0-.77.28-1.42.84-1.97A2.73 2.73 0 0 1 4.8 6h14.4c.77 0 1.42.27 1.96.81.56.55.84 1.2.84 1.97v6.44c0 .77-.28 1.42-.84 1.97-.54.54-1.19.81-1.96.81H4.8Zm0-2h14.4c.23 0 .42-.07.58-.23.15-.15.22-.33.22-.55V8.78c0-.22-.07-.4-.22-.55A.78.78 0 0 0 19.2 8H4.8a.78.78 0 0 0-.58.23.74.74 0 0 0-.22.55v6.44c0 .22.07.4.22.55.16.16.35.23.58.23Zm1.7-5.55h2v-1.7h-2v1.7Zm3 0h2v-1.7h-2v1.7Zm3 0h2v-1.7h-2v1.7Zm3 0h2v-1.7h-2v1.7Zm-9 2.8h2v-1.7h-2v1.7Zm3 0h8v-1.7h-8v1.7Z" />
      </svg>
    );
  }

  if (name === "info") {
    return (
      <svg {...commonProps}>
        <path d="M11 17h2v-6h-2v6Zm1-8.15c.35 0 .65-.12.89-.36.24-.24.36-.54.36-.89 0-.35-.12-.65-.36-.89A1.21 1.21 0 0 0 12 6.35c-.35 0-.65.12-.89.36-.24.24-.36.54-.36.89 0 .35.12.65.36.89.24.24.54.36.89.36ZM12 22a9.73 9.73 0 0 1-3.9-.79 10.1 10.1 0 0 1-3.18-2.13 10.1 10.1 0 0 1-2.13-3.18A9.73 9.73 0 0 1 2 12c0-1.38.26-2.68.79-3.9a10.1 10.1 0 0 1 2.13-3.18A10.1 10.1 0 0 1 8.1 2.79 9.73 9.73 0 0 1 12 2c1.38 0 2.68.26 3.9.79a10.1 10.1 0 0 1 3.18 2.13 10.1 10.1 0 0 1 2.13 3.18A9.73 9.73 0 0 1 22 12c0 1.38-.26 2.68-.79 3.9a10.1 10.1 0 0 1-2.13 3.18 10.1 10.1 0 0 1-3.18 2.13A9.73 9.73 0 0 1 12 22Zm0-2c2.23 0 4.13-.78 5.68-2.32C19.22 16.13 20 14.23 20 12c0-2.23-.78-4.13-2.32-5.68C16.13 4.78 14.23 4 12 4c-2.23 0-4.13.78-5.68 2.32C4.78 7.87 4 9.77 4 12c0 2.23.78 4.13 2.32 5.68C7.87 19.22 9.77 20 12 20Z" />
      </svg>
    );
  }

  if (name === "article") {
    return (
      <svg {...commonProps}>
        <path d="M6 21c-.83 0-1.54-.29-2.12-.88A2.9 2.9 0 0 1 3 18V6c0-.83.29-1.54.88-2.12A2.9 2.9 0 0 1 6 3h12c.83 0 1.54.29 2.12.88.59.58.88 1.29.88 2.12v12c0 .83-.29 1.54-.88 2.12A2.9 2.9 0 0 1 18 21H6Zm0-2h12c.28 0 .52-.1.71-.29A.97.97 0 0 0 19 18V6a.97.97 0 0 0-.29-.71A.97.97 0 0 0 18 5H6a.97.97 0 0 0-.71.29A.97.97 0 0 0 5 6v12c0 .28.1.52.29.71.19.19.43.29.71.29Zm2-4h8v-2H8v2Zm0-4h8V9H8v2Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="m6.4 19-1.4-1.4 5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19Z" />
    </svg>
  );
}

function SourceChip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" className={sourceChipClassName}>
      {icon}
      <span>{children}</span>
      <MaterialSymbolIcon name="close" className="size-4 opacity-80" />
    </button>
  );
}

type EdgeWaveSide = "top" | "right" | "bottom" | "left";

function FluidEdgeGradient({ active }: { active: boolean }) {
  return (
    <>
      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-[-28px] z-[1] rounded-[44px] blur-[30px]",
          activeListeningFluidGradient,
        )}
        initial={false}
        animate={
          active
            ? {
                opacity: [0.72, 0.26, 0.82, 0.18, 0.64, 0.34, 0.78],
                rotate: [0, 74, 148, 221, 288, 360],
                scale: [1, 1.035, 0.995, 1.045, 1.01, 1],
              }
            : { opacity: 0.08, rotate: 0, scale: 0.99 }
        }
        style={{
          background:
            "conic-gradient(from 42deg at 50% 50%, rgba(66,133,244,0) 0deg, rgba(66,133,244,0.88) 34deg, rgba(138,180,248,0.92) 58deg, rgba(66,133,244,0.16) 92deg, rgba(66,133,244,0) 132deg, rgba(66,133,244,0.74) 188deg, rgba(138,180,248,0.82) 214deg, rgba(66,133,244,0) 258deg, rgba(66,133,244,0.72) 316deg, rgba(66,133,244,0) 360deg)",
          mixBlendMode: "screen",
        }}
        transition={{
          duration: 9.8,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.17, 0.33, 0.51, 0.7, 0.86, 1],
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[-18px] z-[1] rounded-[40px] blur-[22px]"
        initial={false}
        animate={
          active
            ? {
                opacity: [0.18, 0.54, 0.22, 0.68, 0.12, 0.48, 0.2],
                backgroundPosition: [
                  "0% 18%",
                  "84% 6%",
                  "100% 74%",
                  "18% 100%",
                  "0% 18%",
                ],
              }
            : { opacity: 0.06, backgroundPosition: "0% 18%" }
        }
        style={{
          background:
            "radial-gradient(circle at 12% 18%, rgba(138,180,248,0.86) 0 6%, rgba(66,133,244,0.24) 12%, rgba(66,133,244,0) 24%), radial-gradient(circle at 92% 28%, rgba(66,133,244,0.88) 0 7%, rgba(66,133,244,0.18) 16%, rgba(66,133,244,0) 30%), radial-gradient(circle at 62% 104%, rgba(138,180,248,0.78) 0 7%, rgba(66,133,244,0.18) 18%, rgba(66,133,244,0) 32%)",
          backgroundSize: "160% 160%",
          mixBlendMode: "screen",
        }}
        transition={{
          duration: 7.6,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.24, 0.5, 0.76, 1],
        }}
      />
    </>
  );
}

function EdgeWave({ active, side }: { active: boolean; side: EdgeWaveSide }) {
  const horizontal = side === "top" || side === "bottom";
  const paths = horizontal
    ? edgeWaveFrequencyPaths.horizontal
    : edgeWaveFrequencyPaths.vertical;
  const className = cn(
    "pointer-events-none absolute z-[3] overflow-visible",
    activeListeningPulsePattern,
    side === "top" && "left-6 right-6 top-[-15px] h-12",
    side === "bottom" && "bottom-[-15px] left-6 right-6 h-12",
    side === "right" && "bottom-6 right-[-15px] top-6 w-12",
    side === "left" && "bottom-6 left-[-15px] top-6 w-12",
  );
  const opacity =
    side === "top"
      ? [0.72, 0.1, 0.02, 0.84, 0.16, 0.04, 0.94, 0.12]
      : side === "right"
        ? [0.08, 0.62, 0.14, 0.02, 0.78, 0.1, 0.04, 0.68]
        : side === "bottom"
          ? [0.04, 0.18, 0.76, 0.08, 0.02, 0.64, 0.12, 0.04]
          : [0.1, 0.02, 0.52, 0.12, 0.82, 0.06, 0.2, 0.04];
  const translate = horizontal
    ? { x: active ? [-16, 28, -8, 36, -16] : 0 }
    : { y: active ? [-18, 24, -10, 30, -18] : 0 };

  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
      viewBox={horizontal ? "0 0 360 48" : "0 0 48 260"}
    >
      <defs>
        <linearGradient
          id={`edge-wave-${side}`}
          x1="0%"
          x2={horizontal ? "100%" : "0%"}
          y1="0%"
          y2={horizontal ? "0%" : "100%"}
        >
          <stop offset="0%" stopColor={activeListeningBlue} stopOpacity="0" />
          <stop offset="32%" stopColor={activeListeningBlueLight} stopOpacity="0.92" />
          <stop offset="54%" stopColor={activeListeningBlue} stopOpacity="0.95" />
          <stop offset="82%" stopColor={activeListeningBlue} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={paths.relaxed}
        animate={
          active
            ? {
                d: [
                  paths.relaxed,
                  paths.active,
                  paths.tight,
                  paths.relaxed,
                  paths.tight,
                  paths.active,
                  paths.relaxed,
                ],
                opacity: opacity.map((value) => value * 0.42),
                pathLength: [0.52, 0.86, 0.64, 0.94, 0.46, 0.78, 0.58],
                strokeWidth: [10, 16, 11, 18, 8, 14, 10],
                ...translate,
              }
            : { opacity: 0.03, pathLength: 0.42, strokeWidth: 10 }
        }
        fill="none"
        filter="blur(7px) drop-shadow(0 0 26px rgba(66,133,244,0.92))"
        initial={false}
        stroke={`url(#edge-wave-${side})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        transition={{
          duration:
            side === "top" ? 7.8 : side === "right" ? 9.4 : side === "bottom" ? 8.8 : 10.2,
          ease: "easeInOut",
          repeat: Infinity,
          times: [0, 0.14, 0.28, 0.45, 0.62, 0.78, 1],
        }}
      />
    </svg>
  );
}

function AnimatedListeningGlow({ active }: { active: boolean }) {
  return (
    <>
      <FluidEdgeGradient active={active} />
      <EdgeWave active={active} side="top" />
      <EdgeWave active={active} side="right" />
      <EdgeWave active={active} side="bottom" />
      <EdgeWave active={active} side="left" />
    </>
  );
}

export function GeminiLive({ className, loop = false }: GeminiLiveProps) {
  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-transparent px-5 py-5",
        "px-3 sm:px-5",
        className,
      )}
      style={{
        color: m3ColorScheme.onSurface,
      }}
    >
      <motion.div
        className={cn(
          "relative aspect-[1.95/1] w-full max-w-[920px] overflow-hidden rounded-[28px] ring-1",
          activeListeningRestrictedEdgeGlow,
          loop && "h-[300px] w-[585px]",
        )}
        style={{
          "--m3-on-surface": m3ColorScheme.onSurface,
          "--m3-on-surface-variant": m3ColorScheme.onSurfaceVariant,
          "--m3-primary": m3ColorScheme.primary,
          backgroundColor: m3ColorScheme.surfaceContainerLow,
          borderColor: m3ColorScheme.outlineVariant,
        } as React.CSSProperties}
      >
        <div
          className="absolute inset-0 z-0 rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(138,180,248,0.08), rgba(66,133,244,0.04) 42%, rgba(29,27,32,0) 72%)",
          }}
        />
        <AnimatedListeningGlow active={true} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 z-[2] rounded-[22px] blur-md"
          style={{
            background: "rgba(7,8,10,0.76)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <p
              className="text-[20px] font-normal leading-none sm:text-[22px]"
              style={{ color: m3ColorScheme.onSurface }}
            >
              Listening...
            </p>

            <div className="flex items-center gap-1 sm:gap-3">
              <button
                type="button"
                aria-label="Open transcript panel"
                className={m3IconButtonClassName}
              >
                <MaterialSymbolIcon name="article" />
              </button>
              <button
                type="button"
                aria-label="More options"
                className={m3IconButtonClassName}
              >
                <MaterialSymbolIcon name="more_vert" />
              </button>
              <button
                type="button"
                aria-label="Close Gemini Live"
                className={m3IconButtonClassName}
              >
                <MaterialSymbolIcon name="close" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <SourceChip
              icon={<MaterialSymbolIcon name="info" className="size-[18px] opacity-80" />}
            >
              {"Can't share"}
            </SourceChip>
            <SourceChip
              icon={
                <span className="inline-flex size-[22px] items-center justify-center rounded-[5px] bg-[#4285f4] text-[13px] font-bold leading-none text-white">
                  30
                </span>
              }
            >
              1 shared
            </SourceChip>
          </div>

          <div className="pointer-events-none flex flex-1 items-center justify-center">
            <span className="sr-only">Material 3 live surface center area</span>
          </div>

          <div className="mt-auto flex justify-end">
            <div
              className="inline-flex h-12 items-center gap-1 rounded-[16px] px-2 shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
              style={{
                backgroundColor: m3ColorScheme.surfaceContainerHigh,
                color: m3ColorScheme.onSurface,
              }}
            >
              <button
                type="button"
                aria-label="Pause"
                className={m3BottomControlButtonClassName}
              >
                <MaterialSymbolIcon name="pause" className="size-[22px]" />
                <span className="sr-only">Pause</span>
              </button>
              <span
                className="h-7 w-px"
                style={{ backgroundColor: m3ColorScheme.outlineVariant }}
                aria-hidden="true"
              />
              <button
                type="button"
                aria-label="Keyboard"
                className={m3BottomControlButtonClassName}
              >
                <MaterialSymbolIcon name="keyboard" className="size-[22px]" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
