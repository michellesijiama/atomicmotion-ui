"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, Code } from "lucide-react";
import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { actionPrimaryClass, actionSecondaryClass } from "@/components/website/styles";
import { SITE_URL } from "@/lib/site-metadata";
import { swiftUIComponents, type SwiftUIComponentId } from "@/lib/swiftui-components";

const COPY_FEEDBACK_MS = 1800;
const SWIFT_PACKAGE_URL = "https://github.com/michellesijiama/atomicmotion-ui.git";
type CodePlatform = "React" | "SwiftUI";

/** Sets `state` back to `to` once `COPY_FEEDBACK_MS` after it becomes `from`. */
function useResetAfter<T>(state: T, from: T, to: T, setState: (value: T) => void) {
  useEffect(() => {
    if (state !== from) return;
    const timer = setTimeout(() => setState(to), COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [state, from, to, setState]);
}

export function ComponentActions({
  component,
  swiftUIId,
}: {
  component: ComponentMeta;
  swiftUIId?: SwiftUIComponentId;
}) {
  const [failedText, setFailedText] = useState("");
  const [copiedPlatform, setCopiedPlatform] = useState<CodePlatform | null>(null);
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "copied">("idle");
  const platforms: readonly CodePlatform[] = swiftUIId ? ["React", "SwiftUI"] : ["React"];

  useResetAfter(copiedPlatform, "React", null, setCopiedPlatform);
  useResetAfter(copiedPlatform, "SwiftUI", null, setCopiedPlatform);
  useResetAfter(linkCopyState, "copied", "idle", setLinkCopyState);

  async function copyLink() {
    const copied = await writeClipboardText(component.codeHref);

    if (copied) {
      setLinkCopyState("copied");
      setFailedText("");
    } else {
      setFailedText(component.codeHref);
    }
  }

  async function copyForAi(platform: CodePlatform) {
    const prompt = platform === "SwiftUI" && swiftUIId
      ? [
          `Integrate ${component.title} from AtomicMotionUI as a native SwiftUI component for iOS or iPadOS 17+.`,
          `In Xcode, add the Swift package ${SWIFT_PACKAGE_URL} using the main branch. Add the AtomicMotionUI product to the app target and import AtomicMotionUI.`,
          "Use the package so its bundled resources resolve correctly.",
          swiftUIId === "sticker-peel"
            ? "Declare @State private var stickers: [StickerPeel.Placement] = [] and render StickerPeel(placements: $stickers)."
            : "Declare @State private var menuOpen = false and render SoftMenuReveal(isOpen: $menuOpen).",
          `Component source: ${SITE_URL}/components/${swiftUIId}/swiftui`,
          `iPhone simulator preview: ${SITE_URL}/previews/swiftui/${swiftUIId}.mp4\n${swiftUIComponents[swiftUIId].previewDescription}`,
        ].join("\n\n")
      : swiftUIId
        ? `${component.aiPrompt}\n\nDirect React source download: ${SITE_URL}/components/${component.id}/react`
        : component.aiPrompt;
    const copied = await writeClipboardText(prompt);

    if (copied) {
      setCopiedPlatform(platform);
      setFailedText("");
      return;
    }

    setFailedText(prompt);
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyLink}
          aria-label={linkCopyState === "copied" ? "Copied link" : "Copy link"}
          title={linkCopyState === "copied" ? "Copied" : "Copy link"}
          className={actionSecondaryClass}>
          {linkCopyState === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <Code className="size-3.5" aria-hidden="true" />}
        </button>
        {platforms.map((platform) => {
          const copied = copiedPlatform === platform;
          const Icon = copied ? Check : ClipboardCopy;
          const language = platform === "SwiftUI" ? "Swift" : platform;

          return (
            <button key={platform} type="button" onClick={() => void copyForAi(platform)}
              title={swiftUIId ? `Copy ${language} prompt` : undefined}
              className={actionPrimaryClass}>
              <Icon className="size-3.5" aria-hidden="true" />
              {swiftUIId ? language : copied ? "Copied" : "Copy for AI"}
            </button>
          );
        })}
      </div>
      <span className="sr-only" role="status">{copiedPlatform ? `${copiedPlatform} AI context copied.` : linkCopyState === "copied" ? "Source link copied." : ""}</span>
      {failedText && (
        <div className="grid gap-1">
          <p className="text-[10px] text-[var(--jitter-orange)]">Copy unavailable. Select and copy the text below.</p>
          <textarea readOnly value={failedText} aria-label="Text to copy" onFocus={(event) => event.currentTarget.select()} rows={3} className="w-full resize-none rounded-xl bg-white p-2 font-mono text-[10px] leading-4 text-[var(--jitter-gray-800)] ring-1 ring-black/10" />
        </div>
      )}
    </div>
  );
}
