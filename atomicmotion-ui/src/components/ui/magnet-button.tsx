"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

import { cn } from "@/lib/utils";

type MagnetButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  strength?: number;
};

export const MagnetButton = React.forwardRef<HTMLButtonElement, MagnetButtonProps>(
  (
    {
      children,
      className,
      strength = 18,
      onPointerLeave,
      onPointerMove,
      type = "button",
      ...props
    },
    forwardedRef,
  ) => {
    const localRef = React.useRef<HTMLButtonElement | null>(null);
    const reduceMotion = useReducedMotion();
    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const springX = useSpring(pointerX, { stiffness: 220, damping: 18, mass: 0.35 });
    const springY = useSpring(pointerY, { stiffness: 220, damping: 18, mass: 0.35 });
    const glowX = useTransform(pointerX, [-strength, strength], ["20%", "80%"]);
    const glowY = useTransform(pointerY, [-strength, strength], ["20%", "80%"]);
    const glowBackground = useMotionTemplate`radial-gradient(circle at ${glowX} ${glowY}, rgba(255,255,255,0.95), rgba(255,255,255,0.22) 26%, transparent 58%)`;

    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    return (
      <motion.button
        ref={setRefs}
        type={type}
        className={cn(
          "group relative isolate inline-flex h-12 min-w-44 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-white px-5 text-sm font-medium text-black shadow-[0_0_50px_rgba(255,255,255,0.08)] outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (reduceMotion || !localRef.current) return;

          const rect = localRef.current.getBoundingClientRect();
          const nextX = ((event.clientX - rect.left) / rect.width - 0.5) * strength * 2;
          const nextY = ((event.clientY - rect.top) / rect.height - 0.5) * strength * 2;

          pointerX.set(nextX);
          pointerY.set(nextY);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          pointerX.set(0);
          pointerY.set(0);
        }}
        style={reduceMotion ? undefined : { x: springX, y: springY }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        {...props}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: glowBackground }}
        />
        <span className="relative">{children}</span>
      </motion.button>
    );
  },
);

MagnetButton.displayName = "MagnetButton";
