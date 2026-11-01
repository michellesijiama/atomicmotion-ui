import Link from "next/link";
import { ModelPreview } from "@/components/website/model-preview";
import type { StudioModel } from "@/lib/model-registry";

export function StudioModelBrowser({ models }: { models: StudioModel[] }) {
  return (
    <section className="pb-10" aria-label="3D models">
      <div className="mx-auto mb-10 max-w-none border-t border-black/15 bg-transparent p-2 pt-6">
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" aria-pressed="true" className="relative inline-flex h-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/15 bg-[var(--jitter-ink)] px-5 text-[15px] leading-none text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 sm:h-10">
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {models.map((model) => (
          <Link key={model.id} href={`/3d-studio/${model.id}`} className="group relative block text-[var(--jitter-ink)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[15px] bg-card">
              <div className="absolute inset-x-0 bottom-0 top-16">
                <ModelPreview model={model} />
              </div>
              <div className="pointer-events-none absolute left-4 right-4 top-4 z-20">
                <p className="m-0 break-normal text-body leading-tight tracking-[-0.02em]">{model.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
