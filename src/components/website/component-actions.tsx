"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, Code } from "lucide-react";
import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { actionPrimaryClass, actionSecondaryClass } from "@/components/website/styles";

export function ComponentActions({ component }: { component: ComponentMeta }) {
  const [failedText, setFailedText] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    if (linkCopyState !== "copied") return;
    const timer = setTimeout(() => setLinkCopyState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [linkCopyState]);

  async function copyLink() {
    const copied = await writeClipboardText(component.codeHref);

    if (copied) {
      setLinkCopyState("copied");
      setFailedText("");
    } else {
      setFailedText(component.codeHref);
    }
  }

  async function copyForAi() {
    const copied = await writeClipboardText(component.aiPrompt);

    if (copied) {
      setCopyState("copied");
      setFailedText("");
      return;
    }

    setCopyState("failed");
    setFailedText(component.aiPrompt);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyLink}
          aria-label={linkCopyState === "copied" ? "Copied link" : "Copy link"}
          title={linkCopyState === "copied" ? "Copied" : "Copy link"}
          className={actionSecondaryClass}>
          {linkCopyState === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <Code className="size-3.5" aria-hidden="true" />}
        </button>
        <button type="button" onClick={copyForAi} className={actionPrimaryClass}>
          {copyState === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <ClipboardCopy className="size-3.5" aria-hidden="true" />}
          {copyState === "copied" ? "Copied" : "Copy for AI"}
        </button>
      </div>
      <span className="sr-only" role="status">{copyState === "copied" ? "AI context copied." : linkCopyState === "copied" ? "Source link copied." : ""}</span>
      {failedText ? (
        <div className="grid gap-1">
          <p className="text-[10px] text-[var(--jitter-orange)]">Copy unavailable. Select and copy the text below.</p>
          <textarea readOnly value={failedText} aria-label="Text to copy" onFocus={(event) => event.currentTarget.select()} rows={3} className="w-full resize-none rounded-xl bg-white p-2 font-mono text-[10px] leading-4 text-[var(--jitter-gray-800)] ring-1 ring-black/10" />
        </div>
      ) : null}
    </div>
  );
}
