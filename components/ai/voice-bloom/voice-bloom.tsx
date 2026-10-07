"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

export type VoiceBloomProps = {
  className?: string;
  loop?: boolean;
};

type VoiceBloomPhase = "idle" | "listening" | "answering";

const responses = [
  "Your idea is taking shape. Start small, test it, and see what comes next.",
  "That sounds promising. What part would you like to explore next?",
] as const;
const bloomEase = [0.22, 1, 0.36, 1] as const;
const panelSpring = {
  type: "spring",
  stiffness: 280,
  damping: 30,
  mass: 0.78,
} as const;

type RollingActionProps = {
  label: string;
  onClick: () => void;
};

function fallbackCopy(text: string) {
  const copyField = document.createElement("textarea");
  copyField.value = text;
  copyField.setAttribute("readonly", "");
  copyField.style.position = "fixed";
  copyField.style.opacity = "0";
  document.body.appendChild(copyField);
  copyField.select();
  document.execCommand("copy");
  copyField.remove();
}

function copyText(text: string) {
  const copyRequest = navigator.clipboard?.writeText(text);

  if (copyRequest) {
    void copyRequest.catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function RollingAction({ label, onClick }: RollingActionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-5 overflow-hidden bg-transparent p-0 text-[12px] font-medium leading-5 text-black/65 transition-colors duration-300 hover:text-black focus-visible:text-black focus-visible:outline-none"
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
    >
      <motion.span
        aria-hidden="true"
        className="flex flex-col"
        variants={{
          rest: { y: 0 },
          hover: { y: reduceMotion ? 0 : "-50%" },
        }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: bloomEase }}
      >
        <span className="h-5">{label}</span>
        <span className="h-5">{label}</span>
      </motion.span>
    </motion.button>
  );
}

export function VoiceBloom({ className, loop = false }: VoiceBloomProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = React.useState<VoiceBloomPhase>("idle");
  const [activeResponseIndex, setActiveResponseIndex] = React.useState(0);
  const [responseKey, setResponseKey] = React.useState(0);
  const [hasCopied, setHasCopied] = React.useState(false);
  const listeningTimer = React.useRef<number | null>(null);
  const followUpTimer = React.useRef<number | null>(null);
  const copiedTimer = React.useRef<number | null>(null);

  const clearListeningTimer = React.useCallback(() => {
    if (listeningTimer.current !== null) {
      window.clearTimeout(listeningTimer.current);
      listeningTimer.current = null;
    }
  }, []);

  const clearFollowUpTimer = React.useCallback(() => {
    if (followUpTimer.current !== null) {
      window.clearTimeout(followUpTimer.current);
      followUpTimer.current = null;
    }
  }, []);

  const clearCopiedTimer = React.useCallback(() => {
    if (copiedTimer.current !== null) {
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = null;
    }
  }, []);

  const clearTimers = React.useCallback(() => {
    clearListeningTimer();
    clearFollowUpTimer();
    clearCopiedTimer();
  }, [clearCopiedTimer, clearFollowUpTimer, clearListeningTimer]);

  const close = React.useCallback(() => {
    clearTimers();
    setHasCopied(false);
    setPhase("idle");
  }, [clearTimers]);

  const startListening = React.useCallback(() => {
    clearTimers();
    setHasCopied(false);
    setActiveResponseIndex(0);
    setPhase("listening");

    listeningTimer.current = window.setTimeout(
      () => {
        setResponseKey((current) => current + 1);
        setPhase("answering");
        listeningTimer.current = null;
      },
      reduceMotion ? 80 : 150,
    );
  }, [clearTimers, reduceMotion]);

  React.useEffect(() => clearTimers, [clearTimers]);

  React.useEffect(() => {
    if (phase !== "answering" || activeResponseIndex !== 0) return;

    followUpTimer.current = window.setTimeout(
      () => {
        setActiveResponseIndex(1);
        setResponseKey((current) => current + 1);
        followUpTimer.current = null;
      },
      reduceMotion ? 1200 : 4650,
    );

    return clearFollowUpTimer;
  }, [activeResponseIndex, clearFollowUpTimer, phase, reduceMotion]);

  React.useEffect(() => {
    if (!loop) return;

    const initial = window.setTimeout(startListening, 250);
    const interval = window.setInterval(startListening, reduceMotion ? 4200 : 7600);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [loop, reduceMotion, startListening]);

  const isOpen = phase === "answering";
  const isListening = phase === "listening";
  const shouldAnimateListening = isListening && !reduceMotion;
  const response = responses[activeResponseIndex];
  const responseWords = response.split(" ");

  const copyResponse = React.useCallback(() => {
    clearCopiedTimer();
    setHasCopied(true);
    copiedTimer.current = window.setTimeout(() => {
      setHasCopied(false);
      copiedTimer.current = null;
    }, 1600);

    copyText(response);
  }, [clearCopiedTimer, response]);

  const regenerateResponse = React.useCallback(() => {
    clearFollowUpTimer();
    clearCopiedTimer();
    setHasCopied(false);
    setActiveResponseIndex((current) => (current + 1) % responses.length);
    setResponseKey((current) => current + 1);
  }, [clearCopiedTimer, clearFollowUpTimer]);

  return (
    <div
      className={[
        "flex size-full min-h-0 items-center justify-center overflow-hidden bg-transparent p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="relative size-full" data-state={phase}>
        <motion.div
          aria-hidden={!isOpen}
          className="absolute left-1/2 top-1/2 max-h-full max-w-full overflow-hidden rounded-[24px] bg-[#d4d2d5]"
          initial={false}
          animate={{
            width: isOpen ? 400 : 192,
            height: isOpen ? 224 : 48,
            marginLeft: isOpen ? -200 : -96,
            marginTop: isOpen ? -76 : -24,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{
            width: reduceMotion ? { duration: 0 } : panelSpring,
            height: reduceMotion ? { duration: 0 } : panelSpring,
            marginLeft: reduceMotion ? { duration: 0 } : panelSpring,
            marginTop: reduceMotion ? { duration: 0 } : panelSpring,
            opacity: {
              duration: reduceMotion ? 0 : 0.24,
              ease: bloomEase,
            },
          }}
        >
          <AnimatePresence initial={false} mode="wait">
            {isOpen ? (
              <motion.p
                key={`answer-${responseKey}`}
                aria-label={response}
                aria-live="polite"
                className="relative z-10 flex flex-wrap gap-x-[5px] gap-y-1 px-4 pb-6 pt-[76px] font-mono text-[17px] font-medium leading-[1.35] tracking-[-0.025em] text-black"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: bloomEase }}
              >
                {responseWords.map((word, index) => (
                  <motion.span
                    aria-hidden="true"
                    key={`${responseKey}-${word}-${index}`}
                    className="text-black"
                    initial={
                      reduceMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 8,
                            filter: "blur(5px)",
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.66,
                      delay: reduceMotion ? 0 : 0.38 + index * 0.075,
                      ease: bloomEase,
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.nav
                aria-label="AI response actions"
                className="absolute inset-x-0 bottom-0 z-20 flex h-11 items-center justify-between border-t border-black/10 px-4 font-sans"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 4 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.42,
                  delay: reduceMotion ? 0 : 0.5,
                  ease: bloomEase,
                }}
              >
                <span className="text-[9px] font-normal leading-none text-black/35">
                  AI response
                </span>
                <div className="flex items-center gap-4">
                  <RollingAction label={hasCopied ? "Copied" : "Copy"} onClick={copyResponse} />
                  <RollingAction label="Regenerate" onClick={regenerateResponse} />
                </div>
              </motion.nav>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <motion.button
          type="button"
          onClick={phase === "idle" ? startListening : close}
          aria-label={
            isOpen ? "Stop voice response" : isListening ? "Listening" : "Start voice input"
          }
          aria-pressed={isListening}
          className="absolute left-1/2 top-1/2 z-10 flex w-48 items-center justify-center overflow-visible rounded-[200px] bg-[#020006] text-white focus-visible:bg-[#17151d] focus-visible:outline-none"
          initial={false}
          animate={{
            height: 48,
            marginLeft: -96,
            marginTop: isOpen ? -68 : -24,
          }}
          transition={{
            marginTop: reduceMotion ? { duration: 0 } : panelSpring,
          }}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-8px] -z-10 rounded-[200px] bg-[#020006]/20"
            animate={
              shouldAnimateListening
                ? { opacity: [0, 0.28, 0], scale: [0.94, 1.1, 1.14] }
                : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
          />

          <span aria-hidden="true" className="relative z-10 block size-6 shrink-0">
            <Mic
              className={`absolute inset-0 size-6 transition-[opacity,transform] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                isOpen ? "-translate-y-0.5 opacity-0" : "translate-y-0 opacity-100"
              }`}
              strokeWidth={1}
            />
            <MicOff
              className={`absolute inset-0 size-6 transition-[opacity,transform] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                isOpen ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-0"
              }`}
              strokeWidth={1}
            />
          </span>
        </motion.button>
      </div>
    </div>
  );
}
