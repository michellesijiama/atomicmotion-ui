import Link from "next/link";

import { PreviewStage } from "@/components/website/preview-stage";
import { componentMap } from "@/lib/component-map";
import type { ComponentMeta } from "@/lib/component-registry";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const componentHref = `/components/${component.id}`;
  const Preview = componentMap[component.id];
  const cardClassName = "group relative block text-[var(--jitter-ink)]";
  // `bg-card` is the design-system surface for gallery cards (see --color-card /
  // --jitter-card). Every card renders through this component, so setting it
  // here guarantees a consistent gray across the whole gallery.
  const previewClassName =
    "relative aspect-[4/5] overflow-hidden rounded-[15px] bg-card";

  // Heavy 3D (WebGL) components don't animate live in the gallery: one plays a
  // rendered clip, the other shows a static poster. Every other component
  // animates live in its `loop` mode.
  return (
    <Link href={componentHref} className={cardClassName}>
      <div className={previewClassName}>
        {component.previewStatic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={component.previewImage}
            alt={`${component.title} preview`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : component.previewVideo ? (
          <video
            src={component.previewVideo}
            poster={component.previewImage}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`${component.title} preview`}
            className="size-full object-cover"
          />
        ) : Preview ? (
          <PreviewStage>
            <Preview loop />
          </PreviewStage>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={component.previewImage}
            alt={`${component.title} preview`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        )}
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
