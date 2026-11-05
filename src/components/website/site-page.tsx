import type { ReactNode } from "react";

import { Reveal } from "@/components/website/reveal";
import { SiteFooter } from "@/components/website/site-footer";
import { SiteHeader } from "@/components/website/site-header";

/**
 * Shared shell for the two gallery index pages: header, a centred headline,
 * the gallery itself, and the footer, each revealing in a short cascade.
 */
export function SitePage({
  section,
  heading,
  children,
}: {
  section?: "interfaces" | "3d-studio";
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="grid grid-cols-1 min-h-[calc(100vh-4rem)] content-between gap-16">
        <div className="min-w-0">
          <Reveal>
            <header className="relative z-50 bg-[var(--am-header-bg)] pb-8">
              <SiteHeader section={section} />
            </header>
          </Reveal>

          <section className="pb-20 sm:pb-28 lg:pb-32" aria-label="Introduction">
            <div className="py-20 sm:py-28 lg:py-32">
              <Reveal delay={0.1}>
                <h1 className="mx-auto max-w-3xl text-balance text-center text-[26px] leading-[1.3] tracking-[-0.02em] text-[var(--jitter-ink)]">
                  {heading}
                </h1>
              </Reveal>
            </div>

            <Reveal delay={0.18}>{children}</Reveal>
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
