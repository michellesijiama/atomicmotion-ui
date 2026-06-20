"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Expand } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { AnimatedGithubLink } from "@/components/website/animated-github-link";
import { AnimatedLogoLink } from "@/components/website/animated-logo-link";
import { ComponentActions } from "@/components/website/component-actions";
import { ExpandingAboutPanel } from "@/components/website/expanding-about-panel";
import {
  navIconButtonClass,
  navIconClass,
  navLinkClass,
} from "@/components/website/styles";

type ActivePanel = "about" | "component" | null;

export function SiteHeader({
  component,
  tagline,
}: {
  component?: ComponentMeta;
  tagline?: string;
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelOpen = activePanel !== null;

  useEffect(() => {
    if (!panelOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setActivePanel(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePanel(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen]);

  return (
    <div ref={containerRef} className="relative z-50">
      <ExpandingAboutPanel
        open={panelOpen}
        onClose={() => setActivePanel(null)}
        footer={
          activePanel === "component" && component ? (
            <ComponentActions component={component} />
          ) : undefined
        }
      >
        {activePanel === "component" && component ? (
          <div className="grid gap-3">
            <span className="font-mono text-body text-[var(--jitter-gray-600)]">
              {component.title}
            </span>
            <p>{component.description}</p>
            {component.inspiredBy ? (
              <p className="text-body text-[var(--jitter-gray-600)]">
                Inspired by{" "}
                <a
                  href={component.inspiredBy.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group/insp inline-flex items-center gap-0.5 text-[var(--jitter-ink)] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-[var(--jitter-ink)]"
                >
                  {component.inspiredBy.label}
                  <ArrowUpRight
                    className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover/insp:translate-x-0 group-hover/insp:opacity-100"
                    aria-hidden="true"
                  />
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            AtomicMotion UI is an open-source collection of copy-paste
            micro-interactions for React — each one a self-contained component you
            can drop into your project.
          </>
        )}
      </ExpandingAboutPanel>

      <div className="relative z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <AnimatedLogoLink />
          {tagline ? (
            <span className="text-body text-[var(--jitter-gray-600)]">
              {tagline}
            </span>
          ) : null}
        </div>

        <nav className="flex items-center gap-2" aria-label="Primary">
          {component ? (
            <div className="group/info relative">
              <button
                type="button"
                aria-label={`Details about ${component.title}`}
                onClick={() =>
                  setActivePanel((value) => (value === "component" ? null : "component"))
                }
                aria-expanded={activePanel === "component"}
                aria-haspopup="true"
                className={navIconButtonClass}
              >
                <Expand className={navIconClass} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() =>
              setActivePanel((value) => (value === "about" ? null : "about"))
            }
            aria-expanded={activePanel === "about"}
            aria-haspopup="true"
            className={navLinkClass}
          >
            About
          </button>
          <AnimatedGithubLink className={navLinkClass} />
        </nav>
      </div>
    </div>
  );
}
