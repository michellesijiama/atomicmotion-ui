import Link from "next/link";

import { cn } from "@/lib/utils";

export function AnimatedLogoLink({
  className,
  emoji = "🖤",
  href = "/",
  label = "AtomicMotion",
}: {
  className?: string;
  emoji?: string;
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/logo relative inline-flex h-9 min-w-[210px] items-center overflow-hidden text-[24px] text-[var(--jitter-ink)] outline-none",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 -translate-x-8 -translate-y-1/2 opacity-0 transition-all duration-500 ease-out group-hover/logo:translate-x-0 group-hover/logo:opacity-100 group-focus-visible/logo:translate-x-0 group-focus-visible/logo:opacity-100"
      >
        {emoji}
      </span>
      <span className="relative transition-transform duration-500 ease-out group-hover/logo:translate-x-8 group-focus-visible/logo:translate-x-8">
        {label}
      </span>
    </Link>
  );
}
