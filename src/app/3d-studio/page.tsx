import type { Metadata } from "next";
import { Reveal } from "@/components/website/reveal";
import { SiteFooter } from "@/components/website/site-footer";
import { SiteHeader } from "@/components/website/site-header";
import { StudioModelBrowser } from "@/components/website/studio-model-browser";
import { studioModels } from "@/lib/model-registry";

export const metadata: Metadata = {
  metadataBase: new URL("https://atomicmotion.dev"),
  title: "3D Studio — AtomicMotion",
  description: "Explore creative AI-generated animations and download the editable Blender files.",
  openGraph: {
    title: "3D Studio — AtomicMotion",
    images: [{ url: studioModels[0].image, width: studioModels[0].width, height: studioModels[0].height }],
  },
};

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 content-between gap-16">
        <div className="min-w-0">
          <Reveal>
            <header className="relative z-50 border-b border-[var(--am-header-border)] bg-[var(--am-header-bg)] pb-8">
              <SiteHeader section="3d-studio" />
            </header>
          </Reveal>
          <section className="pb-20 sm:pb-28 lg:pb-32" aria-label="Introduction">
            <div className="py-20 sm:py-28 lg:py-32">
              <Reveal delay={0.1}>
                <h1 className="mx-auto max-w-3xl text-balance text-center text-[26px] leading-[1.3] tracking-[-0.02em]">
                  Explore creative AI-generated animations.
                </h1>
              </Reveal>
            </div>
            <Reveal delay={0.18}>
              <StudioModelBrowser models={studioModels} />
            </Reveal>
          </section>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}
