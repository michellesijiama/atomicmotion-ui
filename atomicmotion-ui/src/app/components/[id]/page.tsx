import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComponentPlate } from "@/components/website/component-plate";
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

  return (
    <div className="min-h-screen">
      <div className="border-b border-black/10 px-5 py-6 sm:px-8 lg:px-12">
        <SiteHeader component={component} />
      </div>

      <div className="px-5 sm:px-8 lg:px-12">
        <ComponentPlate id={component.id} framelessPlate framelessPreview>
          <Preview />
        </ComponentPlate>
      </div>
    </div>
  );
}
