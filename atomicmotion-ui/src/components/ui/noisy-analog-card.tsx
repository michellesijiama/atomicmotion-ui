"use client";

import * as React from "react";
import {
  type HTMLMotionProps,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

import { cn } from "@/lib/utils";

type NoisyAnalogCardProps = Omit<HTMLMotionProps<"div">, "children"> & {
  opacity?: number;
  blur?: number;
  grain?: number;
  grainScale?: number;
  tint?: string;
  highlight?: string;
  borderOpacity?: number;
  hoverTilt?: number;
  children?: React.ReactNode;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function NoisyAnalogCard({
  opacity = 0.34,
  blur = 18,
  grain = 0.48,
  grainScale = 1.2,
  tint = "#b8fff1",
  highlight = "#ffffff",
  borderOpacity = 0.24,
  hoverTilt = 5,
  className,
  children,
  onPointerLeave,
  onPointerMove,
  style,
  ...props
}: NoisyAnalogCardProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [hoverTilt, -hoverTilt]), {
    stiffness: 220,
    damping: 22,
    mass: 0.5,
  });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-hoverTilt, hoverTilt]), {
    stiffness: 220,
    damping: 22,
    mass: 0.5,
  });

  const cardStyle = {
    "--noisy-opacity": clamp(opacity, 0, 1),
    "--noisy-blur": `${clamp(blur, 0, 40)}px`,
    "--noisy-grain": clamp(grain, 0, 1),
    "--noisy-grain-scale": clamp(grainScale, 0.35, 3),
    "--noisy-tint": tint,
    "--noisy-highlight": highlight,
    "--noisy-border": clamp(borderOpacity, 0, 1),
    ...style,
  } as React.CSSProperties;

  return (
    <motion.div
      className={cn(
        "group/noisy relative isolate min-h-72 overflow-hidden rounded-md border p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.38)] outline-none",
        "border-[color:rgb(255_255_255_/_calc(var(--noisy-border)*1))]",
        "bg-[linear-gradient(135deg,rgb(255_255_255_/_calc(var(--noisy-opacity)*.45)),rgb(255_255_255_/_calc(var(--noisy-opacity)*.08)))]",
        "backdrop-blur-[var(--noisy-blur)]",
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        className,
      )}
      style={
        reduceMotion
          ? cardStyle
          : {
              ...cardStyle,
              rotateX,
              rotateY,
              transformPerspective: 900,
            }
      }
      tabIndex={props.tabIndex ?? 0}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (reduceMotion || hoverTilt <= 0) return;

        const rect = event.currentTarget.getBoundingClientRect();
        pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
        pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        pointerX.set(0);
        pointerY.set(0);
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(circle_at_18%_12%,color-mix(in_srgb,var(--noisy-highlight)_34%,transparent),transparent_30%),radial-gradient(circle_at_82%_78%,color-mix(in_srgb,var(--noisy-tint)_42%,transparent),transparent_34%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 opacity-[var(--noisy-grain)] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.68'/%3E%3C/svg%3E\")",
          backgroundSize: `calc(150px * var(--noisy-grain-scale)) calc(150px * var(--noisy-grain-scale))`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-px -z-10 rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-24px_90px_rgba(255,255,255,0.08)]"
      />
      {children}
    </motion.div>
  );
}
