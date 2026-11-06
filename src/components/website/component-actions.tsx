"use client";

import { useEffect, useId, useState } from "react";
import { Check, ClipboardCopy, Code } from "lucide-react";
import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { actionGhostClass, actionPrimaryClass, actionSecondaryClass } from "@/components/website/styles";
import { SITE_URL } from "@/lib/site-metadata";
import { swiftUIComponents, type SwiftUIComponentId } from "@/lib/swiftui-components";

const COPY_FEEDBACK_MS = 1800;
const SWIFT_PACKAGE_URL = "https://github.com/michellesijiama/atomicmotion-ui.git";

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
  native = false,
}: {
  component: ComponentMeta;
  swiftUIId?: SwiftUIComponentId;
  native?: boolean;
}) {
  const [failedText, setFailedText] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "copied">("idle");
  const [expanded, setExpanded] = useState<"source" | "setup" | null>(null);
  const detailsId = useId();
  const sourcePath = swiftUIId ? `/components/${swiftUIId}/swiftui` : null;

  useResetAfter(copyState, "copied", "idle", setCopyState);
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

  async function copyForAi() {
    const prompt = native && sourcePath
      ? [
          `Integrate ${component.title} from AtomicMotionUI as a native SwiftUI component for iOS or iPadOS 17+.`,
          `In Xcode, add the Swift package ${SWIFT_PACKAGE_URL} using the main branch. Add the AtomicMotionUI product to the app target and import AtomicMotionUI.`,
          "Use the package so its bundled resources resolve correctly.",
          `Component source: ${SITE_URL}${sourcePath}`,
        ].join("\n\n")
      : component.aiPrompt;
    const copied = await writeClipboardText(prompt);

    if (copied) {
      setCopyState("copied");
      setFailedText("");
      return;
    }

    setCopyState("failed");
    setFailedText(prompt);
  }

  return (
    <div className={`grid min-w-0 gap-3${swiftUIId ? " flex-1 basis-60" : ""}`}>
      <div className="flex flex-wrap gap-2">
        {!native && (
          <button type="button" onClick={copyLink}
            aria-label={linkCopyState === "copied" ? "Copied link" : "Copy link"}
            title={linkCopyState === "copied" ? "Copied" : "Copy link"}
            className={actionSecondaryClass}>
            {linkCopyState === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <Code className="size-3.5" aria-hidden="true" />}
          </button>
        )}
        <button type="button" onClick={copyForAi} className={actionPrimaryClass}>
          {copyState === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <ClipboardCopy className="size-3.5" aria-hidden="true" />}
          {copyState === "copied" ? "Copied" : "Copy for AI"}
        </button>
        {swiftUIId && (
          <>
            <button type="button" onClick={() => setExpanded(expanded === "source" ? null : "source")}
              aria-expanded={expanded === "source"} aria-controls={detailsId} className={actionGhostClass}>
              <Code className="size-3.5" aria-hidden="true" />
              SwiftUI source
            </button>
            <button type="button" onClick={() => setExpanded(expanded === "setup" ? null : "setup")}
              aria-expanded={expanded === "setup"} aria-controls={detailsId} className={actionGhostClass}>
              SwiftUI setup
            </button>
          </>
        )}
      </div>
      {swiftUIId && sourcePath && expanded && (
        <div id={detailsId} className="min-w-0">
          {expanded === "source" ? (
            <SwiftUISource path={sourcePath} file={swiftUIComponents[swiftUIId].sourceFile} />
          ) : (
            <SwiftUISetup id={swiftUIId} />
          )}
        </div>
      )}
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

function SwiftUISetup({ id }: { id: SwiftUIComponentId }) {
  const sticker = id === "sticker-peel";
  const state = sticker ? "stickers: [StickerPeel.Placement] = []" : "menuOpen = false";
  const view = sticker ? "StickerPeel(placements: $stickers)" : "SoftMenuReveal(isOpen: $menuOpen)";
  const example = `import SwiftUI
import AtomicMotionUI

struct Example: View {
    @State private var ${state}

    var body: some View {
        ${view}
    }
}`;

  return (
    <section aria-label="Swift Package setup" className="grid gap-2 rounded-xl bg-white/60 p-3 text-sm">
      <h2 className="font-medium">Swift Package setup · iOS 17+</h2>
      <ol className="list-decimal space-y-1 pl-4">
        <li>In Xcode, choose <strong>File → Add Package Dependencies</strong> and paste the package URL.</li>
        <li>Choose the <code>main</code> branch and add <strong>AtomicMotionUI</strong> to your app target.</li>
        <li>Import <code>AtomicMotionUI</code> and add the view.</li>
      </ol>
      <code className="break-all text-xs">{SWIFT_PACKAGE_URL}</code>
      <pre tabIndex={0} aria-label="SwiftUI example" className="overflow-x-auto rounded-lg bg-white p-2 text-xs"><code>{example}</code></pre>
    </section>
  );
}

function SwiftUISource({ path, file }: { path: string; file: string }) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  useResetAfter(copy, "copied", "idle", setCopy);

  useEffect(() => {
    const request = new AbortController();
    async function load() {
      try {
        const response = await fetch(path, { signal: request.signal });
        if (!response.ok) throw new Error("Could not load Swift source");
        const text = await response.text();
        if (!request.signal.aborted) setSource(text);
      } catch {
        if (!request.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => request.abort();
  }, [path]);

  return (
    <section aria-label="Swift source" className="grid min-w-0 gap-2 rounded-xl bg-white/60 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs">{file}</h2>
        {source && (
          <button type="button" className={actionGhostClass} onClick={async () => setCopy(await writeClipboardText(source) ? "copied" : "failed")}>
            {copy === "copied" ? "Source copied" : "Copy Swift source"}
          </button>
        )}
      </div>
      {source ? (
        <pre tabIndex={0} aria-label={file} className="max-h-48 overflow-auto rounded-lg bg-white p-2 text-xs">
          <code>{source}</code>
        </pre>
      ) : (
        <p role="status">{failed ? "Could not load Swift source. Reopen the source to retry." : "Loading Swift source…"}</p>
      )}
      {copy === "failed" && <p role="status">Copy unavailable. Select the code to copy it.</p>}
    </section>
  );
}
