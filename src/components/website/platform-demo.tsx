"use client";

import { useState, type ReactNode } from "react";
import { StageHeader } from "@/components/website/component-stage";
import { SiteHeader } from "@/components/website/site-header";
import type { ComponentMeta } from "@/lib/component-registry";
import { swiftUIComponents, type SwiftUIComponentId } from "@/lib/swiftui-components";

export function PlatformDemo({
  id,
  component,
  children,
}: {
  id: SwiftUIComponentId;
  component: ComponentMeta;
  children: ReactNode;
}) {
  const [platform, setPlatform] = useState<"React" | "SwiftUI">("React");
  const native = platform === "SwiftUI";

  return (
    <>
      <StageHeader>
        <SiteHeader component={component} swiftUIId={native ? id : undefined} />
      </StageHeader>
      <div className="am-reveal flex shrink-0 justify-center px-6 pb-3">
        <div role="group" aria-label="Implementation platform" className="flex rounded-full border border-black/10 p-1">
          {(["React", "SwiftUI"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={platform === option}
              onClick={() => setPlatform(option)}
              className="min-h-11 rounded-full px-4 text-sm text-[var(--jitter-ink)] outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-black/30 aria-pressed:bg-[var(--jitter-ink)] aria-pressed:text-white sm:min-h-8"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div
        hidden={native}
        className="am-reveal @container grid min-h-0 flex-1 grid-cols-1 overflow-x-hidden overflow-y-auto px-6 pb-6 sm:px-8 lg:px-12"
        style={{ animationDelay: "0.1s" }}
      >
        {children}
      </div>
      {native && <SwiftUIPreview id={id} title={component.title} />}
    </>
  );
}

function SwiftUIPreview({ id, title }: { id: SwiftUIComponentId; title: string }) {
  const preview = `/previews/swiftui/${id}`;
  const description = swiftUIComponents[id].previewDescription;

  return (
    <section aria-label={`${title} for SwiftUI`} className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-4">
      <div className="mx-auto grid max-w-[820px] items-center gap-6 sm:min-h-full sm:grid-cols-[minmax(0,1fr)_minmax(230px,310px)] sm:gap-12">
        <div className="grid content-center gap-3">
          <p className="font-mono text-xs text-[var(--jitter-gray-600)]">SwiftUI · iOS 17+</p>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--jitter-ink)]">{title}</h1>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--jitter-gray-600)]">{description}</p>
        </div>
        <figure className="mx-auto w-full max-w-[310px]">
          <video
            src={`${preview}.mp4`}
            poster={`${preview}.webp`}
            width={390}
            height={846}
            controls
            muted
            playsInline
            preload="none"
            aria-label={`${title} recorded on the iPhone simulator`}
            className="mx-auto w-full max-h-[62dvh] rounded-[18px] bg-[var(--jitter-card)] object-contain"
          />
          <figcaption className="mt-2 text-center text-xs text-[var(--jitter-gray-600)]">iPhone simulator recording</figcaption>
        </figure>
      </div>
    </section>
  );
}
