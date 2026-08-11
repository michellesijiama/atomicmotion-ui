"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

export type VoiceBloomProps = {
  className?: string;
  loop?: boolean;
};

type VoiceBloomPhase = "idle" | "listening" | "answering";

const response =
  "Your idea is taking shape. Start with the smallest useful version, test it, and let the next step reveal itself.";
const responseWords = response.split(" ");
const bloomEase = [0.22, 1, 0.36, 1] as const;
const expandEase = [0.65, 0, 0.35, 1] as const;

export function VoiceBloom({ className, loop = false }: VoiceBloomProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = React.useState<VoiceBloomPhase>("idle");
  const [responseKey, setResponseKey] = React.useState(0);
  const listeningTimer = React.useRef<number | null>(null);

  const clearListeningTimer = React.useCallback(() => {
    if (listeningTimer.current !== null) {
      window.clearTimeout(listeningTimer.current);
      listeningTimer.current = null;
    }
  }, []);

  const close = React.useCallback(() => {
    clearListeningTimer();
    setPhase("idle");
  }, [clearListeningTimer]);

  const startListening = React.useCallback(() => {
    clearListeningTimer();
    setPhase("listening");

    listeningTimer.current = window.setTimeout(
      () => {
        setResponseKey((current) => current + 1);
        setPhase("answering");
        listeningTimer.current = null;
      },
      reduceMotion ? 80 : 150,
    );
  }, [clearListeningTimer, reduceMotion]);

  React.useEffect(() => clearListeningTimer, [clearListeningTimer]);

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
            duration: reduceMotion ? 0 : 0.3,
            ease: expandEase,
          }}
        >
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.p
                key={`answer-${responseKey}`}
                aria-label={response}
                aria-live="polite"
                className="flex flex-wrap gap-x-[5px] gap-y-1 px-4 pb-6 pt-[76px] text-[18px] font-normal leading-[1.3] text-black"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              >
                {responseWords.map((word, index) => (
                  <motion.span
                    aria-hidden="true"
                    key={`${responseKey}-${word}-${index}`}
                    className="bg-[linear-gradient(100deg,#020006_0%,#020006_34%,#866eea_48%,#cb696b_58%,#020006_74%)] bg-[length:240%_100%] bg-clip-text text-transparent"
                    initial={
                      reduceMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 8,
                            filter: "blur(5px)",
                            backgroundPosition: "100% 50%",
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      backgroundPosition: "0% 50%",
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.48,
                      delay: reduceMotion ? 0 : 0.28 + index * 0.055,
                      ease: bloomEase,
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.p>
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
          className="absolute left-1/2 top-1/2 z-10 flex w-48 items-center justify-center overflow-visible rounded-[200px] bg-[#020006] text-white focus-visible:outline-none"
          initial={false}
          animate={{
            height: 48,
            marginLeft: -96,
            marginTop: isOpen ? -68 : -24,
          }}
          transition={{
            marginTop: { duration: reduceMotion ? 0 : 0.3, ease: expandEase },
          }}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-8px] rounded-[200px] border border-white/40"
            animate={
              shouldAnimateListening
                ? { opacity: [0, 0.28, 0], scale: [0.94, 1.1, 1.14] }
                : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
          />

          <span aria-hidden="true" className="relative z-10 block size-6 shrink-0">
            <Mic
              className={`absolute inset-0 size-6 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                isOpen ? "-translate-y-0.5 opacity-0" : "translate-y-0 opacity-100"
              }`}
              strokeWidth={2.5}
            />
            <MicOff
              className={`absolute inset-0 size-6 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                isOpen ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-0"
              }`}
              strokeWidth={2.5}
            />
          </span>
        </motion.button>
      </div>
    </div>
  );
}
