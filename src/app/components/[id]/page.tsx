import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComponentStage, StageHeader } from "@/components/website/component-stage";
import { SiteHeader } from "@/components/website/site-header";
import { componentMap } from "@/lib/component-map";
import { componentList, getComponentById } from "@/lib/component-registry";
import { LIBRARY_NAME, pageMetadata } from "@/lib/site-metadata";

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
      title: `Component not found — ${LIBRARY_NAME}`,
    };
  }

  return pageMetadata({
    path: `/components/${component.id}`,
    title: `${component.title} — ${LIBRARY_NAME}`,
    description: component.description,
    image: component.previewImage,
  });
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

  // Fixed header; the preview can scroll when a short viewport needs more room.
  // Same Jitter-style cascade as the home page so entering any component page
  // reveals the header then the preview.
  return (
    <ComponentStage>
      <StageHeader>
        <SiteHeader component={component} />
      </StageHeader>

      <div
        className="am-reveal @container grid min-h-0 flex-1 grid-cols-1 overflow-x-hidden overflow-y-auto px-6 pb-6 sm:px-8 lg:px-12"
        style={{ animationDelay: "0.1s" }}
      >
        <Preview />
      </div>
    </ComponentStage>
  );
}
