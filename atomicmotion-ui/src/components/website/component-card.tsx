import Link from "next/link";

import type { ComponentMeta } from "@/lib/component-registry";
import { componentMap } from "@/lib/component-map";
import { PreviewStage } from "@/components/website/preview-stage";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const componentHref = `/components/${component.id}`;
  const Preview = componentMap[component.id];
  // Light components render their live animation on the gray card (via
  // PreviewStage, which insets the preview so the `bg-card` gray frames it).
  // Heavy Three.js/WebGL scenes (`previewStatic`) show a static poster instead
  // — a looping video when available, otherwise the still image — so mounting
  // many live GL scenes in the gallery doesn't regress load performance.
  const useStaticPoster = component.previewStatic || !Preview;
  const cardClassName = "group relative block text-[var(--jitter-ink)]";
  // `bg-card` is the design-system surface for gallery cards (see --color-card /
  // --jitter-card). Every card renders through this component, so setting it
  // here guarantees a consistent gray across the whole gallery.
  const previewClassName =
    "relative aspect-[4/5] overflow-hidden rounded-[15px] bg-card";

  return (
    <Link href={componentHref} className={cardClassName}>
      <div className={previewClassName}>
        {useStaticPoster ? (
          component.previewVideo ? (
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
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={component.previewImage}
              alt={`${component.title} preview`}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          )
        ) : (
          <PreviewStage>
            <Preview loop />
          </PreviewStage>
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
