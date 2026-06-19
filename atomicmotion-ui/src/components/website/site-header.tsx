"use client";

import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { ComponentActions } from "@/components/website/component-actions";
import { RevealPanel } from "@/components/website/reveal-panel";

const navLinkClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-body text-[var(--jitter-gray-800)] ring-1 ring-black/10 transition hover:bg-[var(--jitter-gray-100)] hover:text-[var(--jitter-ink)]";

export function SiteHeader({
  component,
  tagline,
}: {
  component?: ComponentMeta;
  tagline?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href="/"
          className="text-[24px] tracking-[-0.02em] text-[var(--jitter-ink)]"
        >
          AtomicMotion
        </Link>
        {tagline ? (
          <span className="text-body text-[var(--jitter-gray-600)]">{tagline}</span>
        ) : null}
      </div>

      <nav className="flex items-center gap-2" aria-label="Primary">
        {component ? (
          <div className="group/info relative">
            <button
              type="button"
              aria-label={`Details about ${component.title}`}
              className="inline-flex size-8 items-center justify-center rounded-full text-[var(--jitter-gray-800)] ring-1 ring-black/10 transition hover:bg-[var(--jitter-gray-100)] hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jitter-ink)]"
            >
              <Info className="size-4" aria-hidden="true" />
            </button>

            {/* Hover/focus popover — pt-2 bridges the gap so the pointer can reach it. */}
            <div className="invisible absolute right-0 top-full z-30 w-80 max-w-[90vw] pt-2 opacity-0 transition duration-200 group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100">
              <div className="grid gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_18px_50px_rgba(14,16,17,0.12)] ring-1 ring-black/5">
                <div className="grid gap-1">
                  <span className="font-mono text-caption text-[var(--jitter-gray-600)]">
                    {component.index} · {component.category}
                  </span>
                  <p className="text-body text-[var(--jitter-gray-600)]">
                    {component.description}
                  </p>
                </div>
                <ComponentActions component={component} />
              </div>
            </div>
          </div>
        ) : null}

        <RevealPanel
          label="About"
          header={(onClose) => (
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <Link href="/" className="text-[24px] tracking-[-0.02em] text-[var(--jitter-ink)]">
                AtomicMotion
              </Link>
              <nav className="flex items-center gap-2" aria-label="Panel">
                <button type="button" onClick={onClose} className={navLinkClass}>
                  About
                </button>
                <a
                  href="https://github.com/michellesijiama/atomicmotion-ui"
                  className={navLinkClass}
                >
                  Github
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              </nav>
            </div>
          )}
        >
          <p className="max-w-3xl text-title text-[var(--jitter-ink)]">
            AtomicMotion UI is an open-source collection of copy-paste
            micro-interactions for React — each one a self-contained component you can
            drop into your project.
          </p>
        </RevealPanel>
        <a
          href="https://github.com/michellesijiama/atomicmotion-ui"
          className={navLinkClass}
        >
          Github
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      </nav>
    </div>
  );
}
