"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type IconActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function IconActionButton({
  children,
  className,
  type = "button",
  ...props
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-8 items-center justify-center bg-transparent text-[var(--jitter-ink)] transition hover:text-black focus-visible:outline-none active:scale-95",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
