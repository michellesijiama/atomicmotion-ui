"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, Code } from "lucide-react";
import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { actionPrimaryClass, actionSecondaryClass } from "@/components/website/styles";
import { SITE_URL } from "@/lib/site-metadata";
import { SWIFT_PACKAGE_REPO, swiftUIComponents, type SwiftUIComponentId } from "@/lib/swiftui-components";

const COPY_FEEDBACK_MS = 1800;
type CodePlatform = "React" | "SwiftUI";

function useCopyFeedback<T extends string>() {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => setValue(null), COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return [value, setValue] as const;
}

export function ComponentActions({
  component,
  swiftUIId,
}: {
  component: ComponentMeta;
  swiftUIId?: SwiftUIComponentId;
}) {
  const [failedText, setFailedText] = useState("");
  const [copiedPlatform, setCopiedPlatform] = useCopyFeedback<CodePlatform>();
  const [linkCopyState, setLinkCopyState] = useCopyFeedback<"copied">();
  const platforms: readonly CodePlatform[] = swiftUIId ? ["React", "SwiftUI"] : ["React"];
  const reactRepository = component.codeHref.split("/blob/")[0];
  // Dual-platform components share the Swift package's repository and its current React sources.
  const sourceLink = swiftUIId ? component.codeHref.replace(reactRepository, SWIFT_PACKAGE_REPO) : component.codeHref;

  async function copyLink() {
    const copied = await writeClipboardText(sourceLink);

    if (copied) {
      setLinkCopyState("copied");
      setFailedText("");
    } else {
      setFailedText(sourceLink);
    }
  }

  async function copyForAi(platform: CodePlatform) {
    const prompt = platform === "SwiftUI" && swiftUIId
      ? [
          `Integrate ${component.title} from AtomicMotionUI as a native SwiftUI component for iOS or iPadOS 17+.`,
          `In Xcode, add the Swift package ${SWIFT_PACKAGE_REPO}.git using the main branch. Add the AtomicMotionUI product to the app target and import AtomicMotionUI.`,
          "Use the package so its bundled resources resolve correctly.",
          swiftUIComponents[swiftUIId].usage,
          `Component source: ${SITE_URL}/components/${swiftUIId}/swiftui`,
          `iOS simulator preview: ${SITE_URL}/previews/swiftui/${swiftUIId}.mp4\n${swiftUIComponents[swiftUIId].previewDescription}`,
        ].join("\n\n")
      : swiftUIId
        ? `${component.aiPrompt.replaceAll(reactRepository, SWIFT_PACKAGE_REPO)}\n\nDirect React source download: ${SITE_URL}/components/${component.id}/react`
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
