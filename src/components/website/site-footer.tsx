import { SITE_NAME } from "@/lib/site-metadata";

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 py-8">
      <p className="text-heading text-[var(--jitter-ink)]">{SITE_NAME}</p>
      <span className="text-caption text-[var(--jitter-gray-600)]">
        {new Date().getFullYear()} © All Rights Reserved
      </span>
    </footer>
  );
}
