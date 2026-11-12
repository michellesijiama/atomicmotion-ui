import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ComponentStage, StageHeader } from "@/components/website/component-stage";
import { SiteHeader } from "@/components/website/site-header";
import { componentMap } from "@/lib/component-map";
import { componentList, getComponentById } from "@/lib/component-registry";
import { SITE_NAME, pageMetadata, pageTitle } from "@/lib/site-metadata";
import { hasSwiftUI } from "@/lib/swiftui-components";

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
      title: pageTitle("Component not found", SITE_NAME),
    };
  }

  return pageMetadata({
    path: `/components/${component.id}`,
    title: pageTitle(component.title, SITE_NAME),
    description: component.description,
    image: component.previewImage,
  });
}

async function getLocalParticleDocument(id: string) {
  if (process.env.NODE_ENV !== "development" || id !== "design-research-agent") return;
  const host = (await headers()).get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) return;
  // The private renderer is built outside the public tree and only loaded by the local preview.
  return readFile(join(process.cwd(), ".artifacts/design-research-agent/tim-renderer.html"), "utf8")
    .catch(() => undefined);
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
  const particleDocument = await getLocalParticleDocument(id);

  // Fixed header; the preview can scroll when a short viewport needs more room.
  // Same Jitter-style cascade as the home page so entering any component page
  // reveals the header then the preview.
  return (
    <ComponentStage key={component.id} background={component.stageBackground}>
      <StageHeader>
        <SiteHeader component={component} swiftUIId={hasSwiftUI(id) ? id : undefined} />
      </StageHeader>
      <div
        className="am-reveal @container grid min-h-0 flex-1 grid-cols-1 overflow-x-hidden overflow-y-auto px-6 pb-6 sm:px-8 lg:px-12"
        style={{ animationDelay: "0.1s" }}
      >
        <Preview particleDocument={particleDocument} />
      </div>
    </ComponentStage>
  );
}
