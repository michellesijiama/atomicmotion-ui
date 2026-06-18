"use client";

import { useState } from "react";
import { Check, ClipboardCopy, ExternalLink, Link2 } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";

type ComponentActionsProps = {
  component: ComponentMeta;
};

export function ComponentActions({ component }: ComponentActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "copied">("idle");

  async function copyLink() {
    const copied = await writeClipboardText(component.codeHref);

    if (copied) {
      setLinkCopyState("copied");
      window.setTimeout(() => setLinkCopyState("idle"), 1800);
    }
  }

  async function copyForAi() {
    const copied = await writeClipboardText(component.aiPrompt);

    if (copied) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
      return;
    }

    setCopyState("failed");
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={component.codeHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-[var(--jitter-ink)] ring-1 ring-black/10 transition hover:bg-[var(--jitter-gray-100)]"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          View code
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-[var(--jitter-ink)] ring-1 ring-black/10 transition hover:bg-[var(--jitter-gray-100)]"
        >
          {linkCopyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Link2 className="size-3.5" aria-hidden="true" />
          )}
          {linkCopyState === "copied" ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={copyForAi}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--jitter-ink)] px-3 text-sm font-medium text-white shadow-[0_8px_22px_rgba(14,16,17,0.12)] transition-all hover:scale-[1.02] hover:bg-black hover:shadow-[0_12px_28px_rgba(14,16,17,0.16)] active:scale-[0.98]"
        >
          {copyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <ClipboardCopy className="size-3.5" aria-hidden="true" />
          )}
          {copyState === "copied" ? "Copied" : "Copy for AI"}
        </button>
      </div>
      {copyState === "failed" ? (
        <div className="grid gap-1">
          <p className="text-[10px] text-[var(--jitter-orange)]">
            Copy failed. AI prompt is below.
          </p>
          <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-2 font-mono text-[10px] leading-4 text-[var(--jitter-gray-800)] ring-1 ring-black/10">
            {component.aiPrompt}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
