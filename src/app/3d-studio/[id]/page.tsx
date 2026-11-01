import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentStage } from "@/components/website/component-stage";
import { ModelPreview } from "@/components/website/model-preview";
import { SiteHeader } from "@/components/website/site-header";
import { getStudioModel, studioModels } from "@/lib/model-registry";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return studioModels.map((model) => ({ id: model.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = getStudioModel((await params).id);
  return { title: `${model?.title ?? "Model not found"} — AtomicMotion`, description: model?.description };
}

export default async function ModelPage({ params }: Props) {
  const model = getStudioModel((await params).id);
  if (!model) notFound();

  return (
    <ComponentStage>
      <div className="am-reveal relative z-50 shrink-0 border-b border-[var(--am-header-border)] bg-[var(--am-header-bg)] px-6 py-8 sm:px-8 lg:px-12">
        <SiteHeader model={model} section="3d-studio" />
      </div>
      <main className="am-reveal grid min-h-0 flex-1 content-start justify-items-center overflow-y-auto px-6 py-6 sm:px-8 lg:px-12" style={{ animationDelay: "0.1s" }}>
        <h1 className="sr-only">{model.title}</h1>
        <ModelPreview model={model} eager frameClassName="block min-w-0 max-w-full" className="h-auto max-h-[calc(100dvh-12rem)] min-h-48 w-auto max-w-full rounded-[15px] object-contain" />
      </main>
    </ComponentStage>
  );
}
