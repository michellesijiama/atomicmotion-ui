"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type ElasticDragProps = {
  label?: string;
  className?: string;
  children?: React.ReactNode;
};

export function ElasticDrag({
  label = "drag",
  className,
  children,
}: ElasticDragProps) {
  const constraintsRef = React.useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div
      ref={constraintsRef}
      className={cn(
        "relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_42%,transparent_72%)]",
        className,
      )}
    >
      <div className="absolute inset-x-8 top-1/2 h-px bg-white/10" />
      <div className="absolute inset-y-8 left-1/2 w-px bg-white/10" />
      <motion.div
        drag={!reduceMotion}
        dragConstraints={constraintsRef}
        dragElastic={0.42}
        dragMomentum={false}
        className="relative grid h-28 w-28 cursor-grab place-items-center rounded-md border border-white/20 bg-white text-center text-black shadow-[0_30px_80px_rgba(255,255,255,0.16)] active:cursor-grabbing"
        whileDrag={
          reduceMotion
            ? undefined
            : {
                scaleX: 1.14,
                scaleY: 0.9,
                rotate: -6,
              }
        }
        transition={{ type: "spring", stiffness: 360, damping: 24, mass: 0.6 }}
        tabIndex={0}
        role="button"
        aria-label={`Elastic draggable object: ${label}`}
      >
        <div className="space-y-1 px-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">
            elastic
          </span>
          <span className="block text-sm font-semibold">{children ?? label}</span>
        </div>
      </motion.div>
    </div>
  );
}
