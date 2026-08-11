"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { DesignerCreditLink } from "@/components/website/designer-credit-link";
import { actionGhostClass } from "@/components/website/styles";

const panelTransition = {
  duration: 0.56,
  ease: [0.22, 1, 0.36, 1],
} as const;

type ExpandingAboutPanelProps = {
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
};

export function ExpandingAboutPanel({
  open,
  onClose,
  footer,
  children,
}: ExpandingAboutPanelProps) {
  return (
    <motion.div
      initial={false}
      animate={{
        height: open ? 560 : 56,
        opacity: open ? 1 : 0,
      }}
      transition={panelTransition}
      className="fixed inset-x-3 top-3 z-40 max-h-[calc(100vh-24px)] overflow-hidden rounded-[28px] bg-[#f5f5f5]/85 backdrop-blur-[72px] backdrop-saturate-150 sm:inset-x-4 sm:top-4 sm:max-h-[calc(100vh-32px)]"
      aria-hidden={!open}
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      <motion.div
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          y: open ? 0 : 18,
        }}
        transition={{
          duration: open ? 0.42 : 0.16,
          delay: open ? 0.12 : 0,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="flex h-full flex-col px-5 pb-5 pt-28 sm:px-8 sm:pb-6 sm:pt-32"
      >
        <div className="max-w-4xl text-title text-[var(--jitter-ink)] sm:text-[28px] sm:leading-[1.25]">
          {children}
        </div>

        <div className="mt-auto flex items-end justify-between gap-6 text-body text-[var(--jitter-gray-800)]">
          {footer ?? <DesignerCreditLink />}
          <button type="button" onClick={onClose} className={actionGhostClass}>
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
