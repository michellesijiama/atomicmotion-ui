"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type GeminiLiveProps = {
  className?: string;
  loop?: boolean;
};

const ease = [0.45, 0, 0.55, 1] as const;
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

const m3IconButtonClassName =
  "inline-flex size-10 items-center justify-center rounded-full text-[var(--m3-on-surface-variant)] transition-colors hover:bg-white/8 hover:text-[var(--m3-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m3-primary)]";

type MaterialSymbolName =
  | "article"
  | "close"
  | "keyboard"
  | "more_vert"
  | "pause"
  | "play_arrow";

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

  if (name === "play_arrow") {
    return (
      <svg {...commonProps}>
        <path d="M8 18.3V5.7c0-.78.86-1.25 1.52-.83l9.9 6.3c.61.39.61 1.27 0 1.66l-9.9 6.3C8.86 19.55 8 19.08 8 18.3Z" />
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

export function GeminiLive({ className, loop = false }: GeminiLiveProps) {
  const [isListening, setIsListening] = React.useState(true);

  React.useEffect(() => {
    if (!loop) return;

    const interval = setInterval(() => {
      setIsListening((value) => !value);
    }, 2600);

    return () => clearInterval(interval);
  }, [loop]);

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
        initial={false}
        animate={{
          scale: isListening ? 1 : 0.992,
          boxShadow: isListening
            ? "0 22px 54px rgba(4,8,18,0.28)"
            : "0 18px 48px rgba(4,8,18,0.24)",
        }}
        transition={{ duration: 0.5, ease }}
        className={cn(
          "relative h-[min(78vh,520px)] w-[min(100%,920px)] overflow-hidden rounded-[28px] ring-1",
          loop && "h-[560px] w-[430px]",
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
          className="absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(208,188,255,0.08), rgba(98,91,113,0.04) 42%, rgba(29,27,32,0) 72%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col px-4 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <motion.p
              initial={false}
              animate={{ opacity: isListening ? 1 : 0.62 }}
              transition={{ duration: 0.28, ease }}
              className="text-[24px] font-medium leading-none sm:text-[26px]"
              style={{ color: m3ColorScheme.onSurface }}
            >
              {isListening ? "Listening..." : "Paused"}
            </motion.p>

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

          <div className="pointer-events-none mt-12 flex flex-1 items-center justify-center">
            <span className="sr-only">Material 3 live surface center area</span>
          </div>

          <div className="mt-auto flex justify-end">
            <div
              className="inline-flex h-16 items-center gap-3 rounded-[28px] px-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-1"
              style={{
                backgroundColor: m3ColorScheme.surfaceContainerHigh,
                borderColor: m3ColorScheme.outlineVariant,
                color: m3ColorScheme.onSurface,
              }}
            >
              <button
                type="button"
                aria-label={isListening ? "Pause" : "Resume"}
                onClick={() => setIsListening((value) => !value)}
                className={m3IconButtonClassName}
              >
                {isListening ? (
                  <MaterialSymbolIcon name="pause" />
                ) : (
                  <MaterialSymbolIcon name="play_arrow" />
                )}
                <span className="sr-only">{isListening ? "Pause" : "Resume"}</span>
              </button>
              <span
                className="h-8 w-px"
                style={{ backgroundColor: m3ColorScheme.outlineVariant }}
                aria-hidden="true"
              />
              <button
                type="button"
                aria-label="Keyboard"
                className={m3IconButtonClassName}
              >
                <MaterialSymbolIcon name="keyboard" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
