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
};

export function ComponentPlate({
  id,
  index,
  title,
  description,
  command,
  children,
  className,
}: ComponentPlateProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-8 border-t border-white/15 px-4 py-5 sm:px-6 lg:min-h-screen lg:px-10 lg:py-8",
        className,
      )}
    >
      <div className="grid gap-4 border border-white/12 bg-white/[0.015] p-3 sm:p-4">
        <div className="grid gap-3 border-b border-white/12 pb-3 text-xs text-zinc-400 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <span className="font-mono text-zinc-500">{index}</span>
          <div>
            <h2 className="text-sm font-medium text-white">{title}</h2>
            <p className="mt-1 max-w-xl leading-5">{description}</p>
          </div>
          <code className="w-fit rounded border border-white/10 bg-black px-2 py-1 font-mono text-[11px] text-zinc-300">
            {command}
          </code>
        </div>

        <div className="min-h-[430px] bg-white text-black sm:min-h-[500px]">
          {children}
        </div>
      </div>
    </section>
  );
}
