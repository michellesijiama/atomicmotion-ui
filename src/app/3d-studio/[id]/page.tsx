import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentStage } from "@/components/website/component-stage";
import { ModelPreview } from "@/components/website/model-preview";
import { ModelActions } from "@/components/website/model-actions";
import { SiteHeader } from "@/components/website/site-header";
import { getStudioModel, studioModels } from "@/lib/model-registry";
import { pageMetadata } from "@/lib/site-metadata";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return studioModels.map((model) => ({ id: model.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = getStudioModel((await params).id);
  if (!model) return { title: "Model not found — AtomicMotion" };
  return pageMetadata({
    path: `/3d-studio/${model.id}`,
    title: `${model.title} — AtomicMotion`,
    description: model.description,
    image: model.image,
  });
}

export default async function ModelPage({ params }: Props) {
  const model = getStudioModel((await params).id);
  if (!model) notFound();

  return (
    <ComponentStage>
      <div className="am-reveal relative z-50 shrink-0 border-b border-[var(--am-header-border)] bg-[var(--am-header-bg)] px-6 py-8 sm:px-8 lg:px-12">
        <SiteHeader section="3d-studio" />
      </div>
      <main className="am-reveal min-h-0 flex-1 overflow-y-auto px-6 py-10 sm:px-8 lg:px-12" style={{ animationDelay: "0.1s" }}>
        <div className="mx-auto grid min-h-full w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          <div className="flex min-w-0 justify-center lg:justify-end">
            <ModelPreview model={model} eager frameClassName="flex min-w-0 w-full max-w-[30rem] justify-center lg:justify-end" className="block h-auto w-full max-w-full rounded-[15px] object-contain lg:max-h-[calc(100dvh-12rem)] lg:w-auto" />
          </div>
          <section aria-labelledby="model-title" className="grid min-w-0 gap-7 lg:max-w-md">
            <div className="grid gap-5">
              <h1 id="model-title" className="text-[30px] leading-[1.1] tracking-[-0.035em] sm:text-[36px]">{model.title}</h1>
              <p className="text-[18px] leading-[1.6] tracking-[-0.015em] text-[var(--jitter-gray-800)]">{model.description}</p>
            </div>
            <ModelActions model={model} />
          </section>
        </div>
      </main>
    </ComponentStage>
  );
}
