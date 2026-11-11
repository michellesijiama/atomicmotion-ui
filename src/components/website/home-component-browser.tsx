"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import { ComponentCard, type GalleryComponent } from "@/components/website/component-card";

type HomeComponentBrowserProps = {
  components: GalleryComponent[];
};

function sortByCreatedDate(components: GalleryComponent[]) {
  return [...components].sort((a, b) => {
    const byDate = b.createdAt.localeCompare(a.createdAt);
    if (byDate !== 0) return byDate;

    return b.index.localeCompare(a.index);
  });
}

export function HomeComponentBrowser({ components }: HomeComponentBrowserProps) {
  const sortedComponents = useMemo(() => sortByCreatedDate(components), [components]);
  const reducedMotion = useReducedMotion();

  return (
    <section className="pb-10" aria-label="UI components">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {sortedComponents.map((component) => (
          <ComponentCard key={component.id} component={component} animatePreview={!reducedMotion} />
        ))}
      </div>
    </section>
  );
}
