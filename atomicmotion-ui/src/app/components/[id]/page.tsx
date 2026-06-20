import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/website/site-header";
import { componentMap } from "@/lib/component-map";
import { componentList, getComponentById } from "@/lib/component-registry";

type ComponentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return componentList.map((component) => ({
    id: component.id,
  }));
}

export async function generateMetadata({
  params,
}: ComponentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const component = getComponentById(id);

  if (!component) {
    return {
      title: "Component not found — AtomicMotion UI",
    };
  }

  return {
    title: `${component.title} — AtomicMotion UI`,
    description: component.description,
  };
}

export default async function ComponentDetailPage({ params }: ComponentDetailPageProps) {
  const { id } = await params;
  const component = getComponentById(id);

  if (!component) {
    notFound();
  }

  const Preview = componentMap[component.id];

  if (!Preview) {
    notFound();
  }

  // Single screen, no scrolling: fixed-height header + preview fills the rest.
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="relative z-50 shrink-0 border-b border-[var(--am-header-border)] bg-[var(--am-header-bg)] px-6 py-8 sm:px-8 lg:px-12">
        <SiteHeader component={component} />
      </div>

      <div className="grid min-h-0 flex-1 place-items-center overflow-visible px-6 sm:px-8 lg:px-12">
        <Preview />
      </div>
    </div>
  );
}
