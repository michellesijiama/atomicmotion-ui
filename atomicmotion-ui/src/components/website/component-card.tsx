import Link from "next/link";

import type { ComponentMeta } from "@/lib/component-registry";
import { componentMap } from "@/lib/component-map";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const Preview = componentMap[component.id];
  const componentHref = `/components/${component.id}`;
  const cardClassName = Preview
    ? "group relative block text-[var(--jitter-ink)]"
    : "group block text-[var(--jitter-ink)]";
  const previewClassName =
    "relative aspect-[4/5] overflow-hidden rounded-[15px] bg-[#f2f2f4]";

  if (!Preview) {
    return (
      <div className={cardClassName}>
        <div className={previewClassName}>
          <div className="flex size-full items-center justify-center bg-[#f2f2f4] text-body text-[var(--jitter-gray-400)]">
            Coming soon
          </div>
        </div>
        <div className="px-1 pt-3">
          <p className="text-heading text-[var(--jitter-ink)] transition-transform duration-200 ease-out will-change-transform group-hover:translate-x-1.5">
            {component.title}
          </p>
        </div>
      </div>
    );
  }

  // The whole card is a link: clicking anywhere opens the detail page, while the
  // preview's pointer-move interaction (light/shadow) still works — move to play,
  // click to enter. (A wrapping <Link> doesn't intercept pointermove events.)
  return (
    <Link href={componentHref} className={cardClassName}>
      <div className={previewClassName}>
        <div className="absolute left-1/2 top-1/2 h-[760px] w-[960px] -translate-x-1/2 -translate-y-1/2 scale-[0.52]">
          <Preview loop />
        </div>
        <div className="pointer-events-none absolute left-[15px] top-[15px] z-20 flex flex-wrap gap-1 opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-full bg-gray-500/40 px-2.5 py-1 text-caption text-white backdrop-blur-sm">
            {component.category}
          </span>
          <span className="rounded-full bg-gray-500/40 px-2.5 py-1 text-caption lowercase first-letter:uppercase text-white backdrop-blur-sm">
            {component.status}
          </span>
        </div>
      </div>
      <p className="mt-3 px-1 text-heading text-[var(--jitter-ink)] transition-transform duration-200 ease-out will-change-transform group-hover:translate-x-1.5">
        {component.title}
      </p>
    </Link>
  );
}
