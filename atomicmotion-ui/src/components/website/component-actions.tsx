"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";

type ComponentActionsProps = {
  component: ComponentMeta;
};

export function ComponentActions({ component }: ComponentActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function writeClipboardText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
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
          onClick={copyForAi}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--jitter-ink)] px-3 text-sm font-medium text-white transition hover:bg-black"
        >
          {copyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
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
