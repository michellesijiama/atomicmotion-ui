import { ComponentCard } from "@/components/website/component-card";
import { Reveal } from "@/components/website/reveal";
import { RotatingWord } from "@/components/website/rotating-word";
import { SiteFooter } from "@/components/website/site-footer";
import { SiteHeader } from "@/components/website/site-header";
import { componentList } from "@/lib/component-registry";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="grid min-h-[calc(100vh-4rem)] content-between gap-16">
        <div>
          <Reveal>
            <header className="relative z-50 border-b border-[var(--am-header-border)] bg-[var(--am-header-bg)] pb-8">
              <SiteHeader />
            </header>
          </Reveal>

          <section className="py-20 sm:py-28 lg:py-32" aria-label="Introduction">
            <Reveal delay={0.1}>
              <h1 className="mx-auto max-w-none whitespace-nowrap text-center text-[26px] leading-[1.3] tracking-[-0.02em] text-[var(--jitter-ink)]">
                Open-sourced interaction inspirations designed for{" "}
                <RotatingWord words={["designers", "agents"]} />
              </h1>
            </Reveal>
          </section>

          <section className="pb-10" aria-label="UI components">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {componentList.map((component, index) => (
                <Reveal key={component.id} delay={0.2 + index * 0.07}>
                  <ComponentCard component={component} />
                </Reveal>
              ))}
            </div>
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
