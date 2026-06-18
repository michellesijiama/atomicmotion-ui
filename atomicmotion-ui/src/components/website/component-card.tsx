import Link from "next/link";

import type { ComponentMeta } from "@/lib/component-registry";
import { componentMap } from "@/lib/component-map";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const Preview = componentMap[component.id];

  return (
    <Link
      href={`/components/${component.id}`}
      className="group block overflow-hidden rounded-2xl bg-white/70 text-[var(--jitter-ink)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_50px_rgba(14,16,17,0.08)]"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-[var(--jitter-bg)]">
        {Preview ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[960px] -translate-x-1/2 -translate-y-1/2 scale-[0.52]">
            <Preview />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
