import Link from "next/link";

import type { ComponentMeta } from "@/lib/component-registry";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const componentHref = `/components/${component.id}`;
  const cardClassName = "group relative block text-[var(--jitter-ink)]";
  const previewClassName =
    "relative aspect-[4/5] overflow-hidden rounded-[15px] bg-[#f2f2f4]";

  // The home gallery uses static generated posters so deployment never mounts
  // every animated preview, video, or WebGL scene at once. Detail pages still
  // render the full interactive component.
  return (
    <Link href={componentHref} className={cardClassName}>
      <div className={previewClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={component.previewImage}
          alt={`${component.title} preview`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap gap-1 opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
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
