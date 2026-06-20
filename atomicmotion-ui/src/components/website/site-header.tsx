"use client";

import { useEffect, useRef, useState } from "react";
import { Expand } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { AnimatedGithubLink } from "@/components/website/animated-github-link";
import { AnimatedLogoLink } from "@/components/website/animated-logo-link";
import { ComponentActions } from "@/components/website/component-actions";
import { ExpandingAboutPanel } from "@/components/website/expanding-about-panel";

const navLinkClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f5f5f5]/75 px-3 text-body text-[var(--jitter-gray-800)] backdrop-blur-[72px] backdrop-saturate-150 transition hover:bg-[#eeeeee]/85 hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10";

const navIconButtonClass =
  "inline-flex size-8 items-center justify-center rounded-full bg-[#f5f5f5]/75 text-[var(--jitter-gray-800)] backdrop-blur-[72px] backdrop-saturate-150 transition hover:bg-[#eeeeee]/85 hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10";

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
                <Expand className="size-4" aria-hidden="true" />
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
