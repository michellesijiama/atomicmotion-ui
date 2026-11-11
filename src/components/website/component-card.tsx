import { lazy, Suspense, useId, useRef } from "react";
import { useInView } from "framer-motion";
import Link from "next/link";

import type { ComponentMeta } from "@/lib/component-registry";

const LiveCardPreview = lazy(() => import("@/components/website/live-card-preview"));

export type GalleryComponent = Pick<
  ComponentMeta,
  "id" | "title" | "category" | "index" | "createdAt" | "previewImage" | "previewVideo" | "previewStatic" | "previewInset"
>;

type ComponentCardProps = {
  component: GalleryComponent;
  animatePreview: boolean;
};

export function ComponentCard({ component, animatePreview }: ComponentCardProps) {
  const componentHref = `/components/${component.id}`;
  const titleId = useId();
  const artworkRef = useRef<HTMLDivElement>(null);
  const canAnimate = animatePreview && (!component.previewStatic || Boolean(component.previewVideo));
  const inView = useInView(artworkRef, { amount: 0.15 });
  // `bg-card` is the design-system surface for gallery cards (see --color-card /
  // --jitter-card). Every card renders through this component, so setting it
  // here guarantees a consistent gray across the whole gallery.
  const previewClassName =
    "relative aspect-[4/5] overflow-hidden rounded-[15px] bg-card";
  const mediaClassName = component.previewInset
    ? "size-full scale-[0.63] object-contain"
    : "size-full object-cover";
  const poster = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={component.previewImage}
      alt=""
      loading="lazy"
      decoding="async"
      className={mediaClassName}
    />
  );

  return (
    <div className="group relative">
      <div
        ref={canAnimate ? artworkRef : undefined}
        className={previewClassName}
        aria-hidden="true"
        inert
      >
        {canAnimate && inView ? (
          component.previewVideo ? (
            <video
              src={component.previewVideo}
              poster={component.previewImage}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              className={mediaClassName}
            />
          ) : (
            <Suspense fallback={poster}>
              <LiveCardPreview componentId={component.id} fallback={poster} />
            </Suspense>
          )
        ) : poster}
      </div>
      <Link
        href={componentHref}
        prefetch={false}
        aria-labelledby={titleId}
        className="absolute inset-0 z-20 rounded-[15px] text-[var(--jitter-ink)] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <p id={titleId} className="m-0 min-w-0 flex-1 break-normal text-body leading-tight tracking-[-0.02em] text-[var(--jitter-ink)]">
            {component.title}
          </p>
          <div className="flex shrink-0 flex-nowrap items-end gap-1 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="shrink-0 whitespace-nowrap rounded-full bg-gray-500/40 px-2.5 py-1 text-caption text-white backdrop-blur-sm">
              {component.category}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
