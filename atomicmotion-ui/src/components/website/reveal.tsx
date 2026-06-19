import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

// rico-style entrance: fade + subtle slide-up, staggered. CSS-driven (.am-reveal)
// so it runs reliably and never leaves content stuck hidden if JS doesn't run.
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <div className={cn("am-reveal", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}
