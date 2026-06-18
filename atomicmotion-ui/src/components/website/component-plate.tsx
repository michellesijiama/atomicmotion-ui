import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ComponentPlateProps = {
  id: string;
  children: ReactNode;
  className?: string;
  framelessPlate?: boolean;
  framelessPreview?: boolean;
};

export function ComponentPlate({
  id,
  children,
  className,
  framelessPlate = false,
  framelessPreview = false,
}: ComponentPlateProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-8 px-4 py-5 sm:px-6 lg:min-h-screen lg:px-10 lg:py-8",
        className,
      )}
    >
      <div
        className={cn(
          "grid gap-4",
          framelessPlate
            ? "bg-transparent p-0 shadow-none ring-0"
            : "rounded-[22px] bg-white p-3 shadow-[0_18px_60px_rgba(14,16,17,0.06)] ring-1 ring-black/5 sm:p-4",
        )}
      >
        <div
          className={cn(
            "min-h-[calc(100vh-2.5rem)] text-black lg:min-h-[calc(100vh-4rem)]",
            framelessPreview
              ? "overflow-visible bg-transparent"
              : "overflow-hidden rounded-[18px] bg-[var(--jitter-surface)] ring-1 ring-black/5",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
