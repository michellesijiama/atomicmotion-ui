import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComponentActions } from "@/components/website/component-actions";
import { ComponentPlate } from "@/components/website/component-plate";
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
    <div className="grid min-h-screen lg:grid-cols-[360px_1fr] xl:grid-cols-[420px_1fr]">
      <aside className="border-black/10 px-6 py-8 lg:border-r">
        <div className="flex min-h-full flex-col">
          <Link
            href="/"
            className="w-fit font-mono text-xs uppercase text-[var(--jitter-gray-600)] transition-colors hover:text-[var(--jitter-ink)]"
          >
            Back
          </Link>

          <div className="mt-12 border-t border-black/10 pt-6">
            <span className="font-mono text-xs text-[var(--jitter-gray-600)]">
              {component.index}
            </span>
            <h1 className="mt-8 text-2xl font-semibold tracking-normal">{component.title}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--jitter-gray-600)]">
              {component.description}
            </p>
            <div className="mt-6">
              <ComponentActions component={component} />
            </div>
          </div>

          <div className="mt-auto" />
        </div>
      </aside>

      <ComponentPlate id={component.id} framelessPlate framelessPreview>
        <Preview />
      </ComponentPlate>
    </div>
  );
}
