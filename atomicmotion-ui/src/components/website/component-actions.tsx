"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Code } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import {
  actionPrimaryClass,
  actionSecondaryClass,
} from "@/components/website/styles";

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
        <button
          type="button"
          onClick={copyLink}
          aria-label={linkCopyState === "copied" ? "Copied link" : "Copy link"}
          title={linkCopyState === "copied" ? "Copied" : "Copy link"}
          className={actionSecondaryClass}
        >
          {linkCopyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Code className="size-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={copyForAi}
          className={actionPrimaryClass}
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
