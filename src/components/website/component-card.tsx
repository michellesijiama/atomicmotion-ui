import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { componentMap } from "@/lib/component-map";
import { PreviewStage } from "@/components/website/preview-stage";
import { formatComponentPrice, getComponentOffer } from "@/lib/component-offers";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const offer = getComponentOffer(component.id);
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
          <div className="absolute inset-x-0 bottom-0 top-16">
            <PreviewStage>
              <Preview loop />
            </PreviewStage>
          </div>
        )}
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
          <p className="m-0 min-w-0 flex-1 text-body leading-tight tracking-[-0.02em] text-[var(--jitter-ink)] [overflow-wrap:anywhere]">
            {component.title}
          </p>
          <div className="flex shrink-0 flex-nowrap items-end gap-1 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="shrink-0 whitespace-nowrap rounded-full bg-gray-500/40 px-2.5 py-1 text-right text-caption text-white backdrop-blur-sm">
              {component.category}
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-gray-500/40 px-2.5 py-1 text-caption lowercase first-letter:uppercase text-white backdrop-blur-sm">
              {component.status}
            </span>
          </div>
        </div>
        <span className={`pointer-events-none absolute bottom-4 right-4 z-20 inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption ${offer ? "bg-[var(--jitter-ink)] text-white" : "bg-white/80 text-[var(--jitter-gray-600)]"}`} aria-label={offer ? `Source code ${formatComponentPrice(offer)} USD` : "Free source code"}>
          {offer ? <LockKeyhole className="size-3" aria-hidden="true" /> : null}
          {offer ? formatComponentPrice(offer) : "Free"}
        </span>
      </div>
    </Link>
  );
}
