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
        "scroll-mt-8 border-t border-black/15 px-4 py-5 sm:px-6 lg:min-h-screen lg:px-10 lg:py-8",
        className,
      )}
    >
      <div className="grid gap-4 border border-black/12 bg-[#fbfaf7] p-3 sm:p-4">
        <div className="grid gap-3 border-b border-black/12 pb-3 text-xs text-zinc-500 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <span className="font-mono text-zinc-500">{index}</span>
          <div>
            <h2 className="text-sm font-medium text-zinc-950">{title}</h2>
            <p className="mt-1 max-w-xl leading-5">{description}</p>
          </div>
          <code className="w-fit rounded border border-black/10 bg-white px-2 py-1 font-mono text-[11px] text-zinc-700">
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
