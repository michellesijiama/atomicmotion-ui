import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ComponentPlateProps = {
  id: string;
  index: string;
  title: string;
  description: string;
  command: string;
  children: ReactNode;
  className?: string;
  category?: string;
  status?: string;
  statusClassName?: string;
};

export function ComponentPlate({
  id,
  index,
  title,
  description,
  command,
  children,
  className,
  category = "Component",
  status = "FREE",
  statusClassName = "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
}: ComponentPlateProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-8 border-t border-black/10 px-4 py-5 sm:px-6 lg:min-h-screen lg:px-10 lg:py-8",
        className,
      )}
    >
      <div className="grid gap-4 rounded-[22px] bg-white p-3 shadow-[0_18px_60px_rgba(14,16,17,0.06)] ring-1 ring-black/5 sm:p-4">
        <div className="grid gap-3 border-b border-black/8 pb-3 text-xs text-[var(--jitter-gray-600)] sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <span className="font-mono text-[var(--jitter-gray-600)]">{index}</span>
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[var(--jitter-gray-100)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--jitter-gray-800)]">
                {category}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                  statusClassName,
                )}
              >
                {status}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--jitter-ink)]">{title}</h2>
            <p className="mt-1 max-w-xl leading-5">{description}</p>
          </div>
          <code className="w-fit rounded-full bg-[var(--jitter-surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--jitter-gray-800)] ring-1 ring-black/5">
            {command}
          </code>
        </div>

        <div className="min-h-[430px] overflow-hidden rounded-[18px] bg-[var(--jitter-surface)] text-black ring-1 ring-black/5 sm:min-h-[500px]">
          {children}
        </div>
      </div>
    </section>
  );
}
