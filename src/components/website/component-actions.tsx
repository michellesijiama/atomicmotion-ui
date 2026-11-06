"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, ClipboardCopy, Code, Download } from "lucide-react";
import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { actionGhostClass, actionPrimaryClass, actionSecondaryClass } from "@/components/website/styles";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<"source" | "setup" | "preview" | null>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLElement>(null);
  const detailsId = useId();
  const sourcePath = swiftUIId ? `/components/${swiftUIId}/swiftui` : null;

  useResetAfter(copiedPlatform, "React", null, setCopiedPlatform);
  useResetAfter(copiedPlatform, "SwiftUI", null, setCopiedPlatform);
  useResetAfter(linkCopyState, "copied", "idle", setLinkCopyState);

  useEffect(() => {
    if (menuOpen) menuRef.current?.scrollIntoView({ block: "nearest" });
  }, [menuOpen]);

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
    const prompt = platform === "SwiftUI" && sourcePath
      ? [
          `Integrate ${component.title} from AtomicMotionUI as a native SwiftUI component for iOS or iPadOS 17+.`,
          `In Xcode, add the Swift package ${SWIFT_PACKAGE_URL} using the main branch. Add the AtomicMotionUI product to the app target and import AtomicMotionUI.`,
          "Use the package so its bundled resources resolve correctly.",
          `Component source: ${SITE_URL}${sourcePath}`,
        ].join("\n\n")
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
    <div className={`grid min-w-0 gap-3${swiftUIId ? " flex-1 basis-60" : ""}`}>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copyLink}
          aria-label={linkCopyState === "copied" ? "Copied link" : "Copy link"}
          title={linkCopyState === "copied" ? "Copied" : "Copy link"}
          className={actionSecondaryClass}>
          {linkCopyState === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <Code className="size-3.5" aria-hidden="true" />}
        </button>
        <button type="button"
          onClick={() => swiftUIId ? setMenuOpen(!menuOpen) : void copyForAi("React")}
          aria-expanded={swiftUIId ? menuOpen : undefined}
          aria-controls={swiftUIId ? menuId : undefined}
          className={actionPrimaryClass}>
          {!swiftUIId && copiedPlatform ? <Check className="size-3.5" aria-hidden="true" /> : <ClipboardCopy className="size-3.5" aria-hidden="true" />}
          {!swiftUIId && copiedPlatform ? "Copied" : "Copy for AI"}
          {swiftUIId && <ChevronDown className={`size-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden="true" />}
        </button>
      </div>
      {swiftUIId && sourcePath && menuOpen && (
        <section ref={menuRef} id={menuId} aria-label="Code options" className="grid min-w-0 max-w-xl gap-2 rounded-xl border border-black/10 bg-white/70 p-3">
          <div className="divide-y divide-black/10">
            {([
              { platform: "React", path: `/components/${component.id}/react`, file: `${component.id}.tsx` },
              { platform: "SwiftUI", path: sourcePath, file: swiftUIComponents[swiftUIId].sourceFile },
            ] as const).map(({ platform, path, file }) => (
              <div key={platform} className="flex flex-wrap items-center justify-between gap-x-2 py-1" role="group" aria-label={platform}>
                <span className="text-sm font-medium">{platform}</span>
                <div className="flex flex-wrap items-center gap-1">
                  <button type="button" onClick={() => void copyForAi(platform)}
                    aria-label={`Copy ${platform} for AI`} className={`${actionGhostClass} px-2! text-sm!`}>
                    {copiedPlatform === platform ? "Copied" : "Copy"}
                  </button>
                  <a href={path} download={file} aria-label={`Download ${platform} code`} className={`${actionGhostClass} px-2! text-sm!`}>
                    <Download className="size-3.5" aria-hidden="true" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 border-t border-black/10 pt-1">
            {([
              { value: "source", label: "SwiftUI source" },
              { value: "setup", label: "SwiftUI setup" },
              { value: "preview", label: "iPhone preview" },
            ] as const).map(({ value, label }) => (
              <button key={value} type="button" onClick={() => setExpanded(expanded === value ? null : value)}
                aria-expanded={expanded === value} aria-controls={detailsId} className={`${actionGhostClass} px-2! text-sm!`}>
                {label}
              </button>
            ))}
          </div>
          {expanded && (
            <div id={detailsId} className="min-w-0">
              {expanded === "source" && <SwiftUISource path={sourcePath} file={swiftUIComponents[swiftUIId].sourceFile} />}
              {expanded === "setup" && <SwiftUISetup id={swiftUIId} />}
              {expanded === "preview" && <SwiftUIPreview id={swiftUIId} />}
            </div>
          )}
        </section>
      )}
      <span className="sr-only" role="status">{copiedPlatform ? `${copiedPlatform} AI context copied.` : linkCopyState === "copied" ? "Source link copied." : ""}</span>
      {failedText ? (
        <div className="grid gap-1">
          <p className="text-[10px] text-[var(--jitter-orange)]">Copy unavailable. Select and copy the text below.</p>
          <textarea readOnly value={failedText} aria-label="Text to copy" onFocus={(event) => event.currentTarget.select()} rows={3} className="w-full resize-none rounded-xl bg-white p-2 font-mono text-[10px] leading-4 text-[var(--jitter-gray-800)] ring-1 ring-black/10" />
        </div>
      ) : null}
    </div>
  );
}

function SwiftUIPreview({ id }: { id: SwiftUIComponentId }) {
  const preview = `/previews/swiftui/${id}`;

  return (
    <figure className="grid justify-items-start gap-2 p-2">
      <video src={`${preview}.mp4`} poster={`${preview}.webp`} width={390} height={846}
        controls muted playsInline preload="none" aria-label="iPhone simulator recording"
        className="h-auto max-h-[45dvh] w-auto max-w-full rounded-lg bg-[var(--jitter-card)] object-contain" />
      <figcaption className="text-xs">{swiftUIComponents[id].previewDescription}</figcaption>
    </figure>
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
