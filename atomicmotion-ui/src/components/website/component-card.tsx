"use client";

import Link from "next/link";
import { useState, type FocusEvent, type MouseEvent } from "react";
import { Check, Link2 } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { componentMap } from "@/lib/component-map";
import { writeClipboardText } from "@/lib/clipboard";

type ComponentCardProps = {
  component: ComponentMeta;
};

export function ComponentCard({ component }: ComponentCardProps) {
  const Preview = componentMap[component.id];
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [isHovered, setIsHovered] = useState(false);
  const componentHref = `/components/${component.id}`;
  const cardClassName = Preview
    ? "group relative block text-[var(--jitter-ink)]"
    : "block text-[var(--jitter-ink)]";
  const previewClassName = [
    "relative aspect-[3/2] overflow-hidden rounded-[15px] bg-white/70 ring-1 ring-black/5 transition duration-300",
    Preview
      ? "group-hover:-translate-y-0.5 group-hover:bg-white group-focus-within:-translate-y-0.5 group-focus-within:bg-white"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
      setIsHovered(false);
    }
  }

  async function copyLink(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const copied = await writeClipboardText(component.codeHref);

    if (copied) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  if (!Preview) {
    return (
      <div className={cardClassName}>
        <div className={previewClassName}>
          <div className="flex size-full items-center justify-center bg-[var(--jitter-surface)] text-sm text-[var(--jitter-gray-400)]">
            Coming soon
          </div>
        </div>
        <div className="px-1 pt-3">
          <p className="text-sm font-medium text-[var(--jitter-ink)]">{component.title}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cardClassName}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={handleBlur}
    >
      <div className={previewClassName}>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[960px] -translate-x-1/2 -translate-y-1/2 scale-[0.52] transition-transform duration-500 ease-out group-hover:scale-[0.55] group-focus-within:scale-[0.55] motion-reduce:transition-none motion-reduce:group-hover:scale-[0.52] motion-reduce:group-focus-within:scale-[0.52]">
          <Preview isHovered={isHovered} />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/10 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
        <div className="pointer-events-none absolute left-[15px] top-[15px] z-20 flex flex-wrap gap-1 opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="rounded-full bg-gray-500/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {component.category}
          </span>
          <span className="rounded-full bg-gray-500/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {component.status}
          </span>
        </div>
        <Link
          href={componentHref}
          className="absolute inset-0 z-10 rounded-[15px]"
          aria-label={`Open ${component.title}`}
        />
        <button
          type="button"
          onClick={copyLink}
          className="absolute bottom-3 right-3 z-20 inline-flex size-8 translate-y-1 items-center justify-center rounded-full bg-gray-500/40 text-white opacity-0 backdrop-blur-sm transition duration-300 ease-out hover:bg-gray-500/50 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
          aria-label={`Copy GitHub link for ${component.title}`}
        >
          {copyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Link2 className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      <Link href={componentHref} className="block px-1 pt-3">
        <p className="text-sm font-medium text-[var(--jitter-ink)]">{component.title}</p>
      </Link>
    </div>
  );
}
