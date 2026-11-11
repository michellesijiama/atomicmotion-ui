import type { ReactNode } from "react";

import { GalleryIntro } from "@/components/website/gallery-intro";
import { SiteFooter } from "@/components/website/site-footer";
import { SiteHeader } from "@/components/website/site-header";

/**
 * Shared shell for the two gallery index pages. The heading reveals while
 * navigation and gallery controls stay in place from the first paint.
 */
export function SitePage({
  section,
  children,
}: {
  section?: "interfaces" | "3d-studio";
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="grid grid-cols-1 min-h-[calc(100vh-4rem)] content-between gap-16">
        <div className="min-w-0">
          <header className="relative z-50 bg-[var(--am-header-bg)] pb-8">
            <SiteHeader section={section} />
          </header>

          <section className="pb-20 sm:pb-28 lg:pb-32" aria-label="Introduction">
            <GalleryIntro />
            {children}
          </section>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
