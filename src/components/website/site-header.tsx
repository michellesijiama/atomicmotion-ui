"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Expand } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { SITE_NAME } from "@/lib/site-metadata";
import { swiftUIComponents, type SwiftUIComponentId } from "@/lib/swiftui-components";
import { AnimatedLogoLink } from "@/components/website/animated-logo-link";
import { ComponentActions } from "@/components/website/component-actions";
import { ExpandingAboutPanel } from "@/components/website/expanding-about-panel";
import {
  navIconButtonClass,
  navIconClass,
  navLinkClass,
  sectionNavLinkClass,
} from "@/components/website/styles";

type ActivePanel = "about" | "component" | null;

export function SiteHeader({
  component,
  swiftUIId,
  native = false,
  section = "interfaces",
}: {
  component?: ComponentMeta;
  swiftUIId?: SwiftUIComponentId;
  native?: boolean;
  section?: "interfaces" | "3d-studio";
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelOpen = activePanel !== null;

  useEffect(() => {
    if (!panelOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setActivePanel(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof Element && event.target.closest("dialog")) return;
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
        id={panelId}
        open={panelOpen}
        onClose={() => setActivePanel(null)}
        footer={
          activePanel === "component" && component ? (
            <ComponentActions
              key={native ? `${component.id}-swiftui` : component.id}
              component={component}
              swiftUIId={swiftUIId}
              native={native}
            />
          ) : undefined
        }
      >
        {activePanel === "component" && component ? (
          <div className="grid gap-3">
            <span className="font-mono text-body text-[var(--jitter-gray-600)]">
              {component.title}{native && " · SwiftUI"}
            </span>
            <p>{native && swiftUIId ? swiftUIComponents[swiftUIId].previewDescription : component.description}</p>
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
            {SITE_NAME} is a design library of expressive interfaces and
            interactions, and 3D scenes. Explore live demos, copy
            component source code, and download editable Blender scenes.
          </>
        )}
      </ExpandingAboutPanel>

      <div className="relative z-50 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <AnimatedLogoLink />
        </div>

        <nav className="flex max-w-full flex-wrap items-center gap-2" aria-label="Primary">
          <Link href="/" aria-current={section === "interfaces" ? "true" : undefined} className={sectionNavLinkClass}>
            Interfaces
          </Link>
          <Link href="/3d-studio" aria-current={section === "3d-studio" ? "true" : undefined} className={sectionNavLinkClass}>
            3D Studio
          </Link>
          {component ? (
            <div className="group/info relative">
              <button
                type="button"
                aria-label={`Details about ${component.title}`}
                onClick={() =>
                  setActivePanel((value) => value === "component" ? null : "component")
                }
                aria-expanded={activePanel === "component"}
                aria-controls={panelId}
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
            aria-controls={panelId}
            aria-haspopup="true"
            className={navLinkClass}
          >
            About
          </button>
        </nav>
      </div>
    </div>
  );
}
