"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, Download } from "lucide-react";
import type { StudioModel } from "@/lib/model-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { getModelAiPrompt } from "@/lib/model-prompt";
import { actionPrimaryClass, actionGhostClass } from "@/components/website/styles";

export function ModelActions({ model }: { model: StudioModel }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const prompt = getModelAiPrompt(model);

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copyForAi() {
    try {
      setCopyState(await writeClipboardText(prompt) ? "copied" : "failed");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={model.blend} download className={actionPrimaryClass}>
          Download Blender file <Download className="size-4" aria-hidden="true" />
        </a>
        <button type="button" onClick={copyForAi} className={actionGhostClass}>
          {copyState === "copied" ? <Check className="size-4" aria-hidden="true" /> : <ClipboardCopy className="size-4" aria-hidden="true" />}
          {copyState === "copied" ? "Copied" : "Copy for AI"}
        </button>
        <a href={model.gif} download className={actionGhostClass}>
          Download GIF <Download className="size-4" aria-hidden="true" />
        </a>
      </div>
      <span className="sr-only" role="status">{copyState === "copied" ? "AI context copied." : ""}</span>
      {copyState === "failed" ? (
        <div className="grid gap-2">
          <p className="text-body">Copy failed. Select and copy the text below.</p>
          <textarea readOnly value={prompt} aria-label="AI context to copy" onFocus={(event) => event.currentTarget.select()} rows={4} className="w-full resize-none rounded-xl bg-white p-3 font-mono text-xs leading-5 ring-1 ring-black/10" />
        </div>
      ) : null}
    </div>
  );
}
