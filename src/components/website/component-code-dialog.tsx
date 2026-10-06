"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Check, ClipboardCopy, Download, LockKeyhole, X } from "lucide-react";
import type { ComponentMeta } from "@/lib/component-registry";
import { formatComponentPrice, type ComponentOffer } from "@/lib/component-offers";
import { writeClipboardText } from "@/lib/clipboard";
import { actionPrimaryClass, actionSecondaryClass } from "@/components/website/styles";

export type SourceBundle = {
  source: string;
  setup: string;
  usage: string;
  license: string;
  prompt: string;
  filename: string;
};

type CodeTab = "source" | "setup" | "usage" | "license";
const tabs: { key: CodeTab; label: string }[] = [
  { key: "source", label: "Component" },
  { key: "setup", label: "Setup" },
  { key: "usage", label: "Usage" },
  { key: "license", label: "License" },
];

type ComponentCodeDialogProps = {
  component: ComponentMeta;
  offer: ComponentOffer;
  mode: "purchase" | "source" | null;
  source: SourceBundle | null;
  checkoutAvailable: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPurchase: () => void;
};

export function ComponentCodeDialog({ component, offer, mode, source, checkoutAvailable, busy, error, onClose, onPurchase }: ComponentCodeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const tabId = useId();
  const [activeTab, setActiveTab] = useState<CodeTab>("source");
  const [copiedTab, setCopiedTab] = useState<CodeTab | null>(null);
  const [copyError, setCopyError] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mode && !dialog.open) dialog.showModal();
    if (!mode && dialog.open) dialog.close();
  }, [mode]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  async function copyCode() {
    if (!source) return;
    const text = activeTab === "source" ? `/*\n${source.license}\n*/\n\n${source.source}` : source[activeTab];
    const copied = await writeClipboardText(text);
    setCopyError(!copied);
    if (copied) {
      setCopiedTab(activeTab);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedTab(null), 1800);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClose={onClose}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-xl overflow-y-auto rounded-[24px] border border-black/10 bg-[var(--jitter-bg)] p-6 text-[var(--jitter-ink)] shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-caption text-[var(--jitter-gray-600)]">
          {mode === "source" ? <Check className="size-3.5" aria-hidden="true" /> : <LockKeyhole className="size-3.5" aria-hidden="true" />}
          {mode === "source" ? "Source code unlocked" : "Source code locked"}
        </span>
        <button type="button" onClick={onClose} aria-label="Close source code dialog" className={actionSecondaryClass}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <h2 id={titleId} className="text-display">{component.title}</h2>
      <p className="mt-2 text-body text-[var(--jitter-gray-600)]">
        {mode === "source" ? "Your interaction, ready to use." : "Try the demo for free. Get the code when you're ready."}
      </p>

      {mode === "purchase" ? (
        <>
          <div className="my-6 flex items-baseline gap-2 border-y border-black/10 py-5">
            <span className="text-[40px] leading-none tracking-[-0.04em]">{formatComponentPrice(offer)}</span>
            <span className="text-body text-[var(--jitter-gray-600)]">USD · one-time purchase</span>
          </div>
          <p className="mb-3 text-body">Includes</p>
          <ul className="grid gap-3 text-body text-[var(--jitter-gray-800)]">
            {offer.includes.map((item) => (
              <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{item}</li>
            ))}
            <li className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Setup, usage example and MIT license</li>
          </ul>
          <div className="mt-6 rounded-2xl bg-card p-4 text-caption leading-relaxed text-[var(--jitter-gray-600)]">
            <p>React · TypeScript · Tailwind CSS v4</p>
            <p className="mt-1">Dependencies: {offer.dependencies.join(", ")}</p>
            <p className="mt-2">Personal and commercial use. Access is saved in this browser.</p>
          </div>
          <button type="button" onClick={onPurchase} disabled={busy || !checkoutAvailable} className={`${actionPrimaryClass} mt-6 min-h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50`}>
            {busy ? "Opening checkout…" : checkoutAvailable ? `Purchase — ${formatComponentPrice(offer)}` : "Purchases coming soon"}
            {busy ? null : <ArrowUpRight className="size-4" aria-hidden="true" />}
          </button>
          <p className="mt-3 text-center text-caption text-[var(--jitter-gray-600)]">
            {checkoutAvailable ? "Secure checkout. Code unlocks after payment." : "The live demo is always free to explore."}
          </p>
        </>
      ) : source ? (
        <>
          <div role="tablist" aria-label="Source code files" className="my-5 flex gap-1 overflow-x-auto rounded-full bg-card p-1">
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                role="tab"
                type="button"
                id={`${tabId}-${tab.key}`}
                aria-controls={`${tabId}-panel`}
                aria-selected={activeTab === tab.key}
                tabIndex={activeTab === tab.key ? 0 : -1}
                onClick={() => { setActiveTab(tab.key); setCopyError(false); }}
                onKeyDown={(event) => {
                  let nextIndex: number | undefined;
                  if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
                  if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
                  if (event.key === "Home") nextIndex = 0;
                  if (event.key === "End") nextIndex = tabs.length - 1;
                  if (nextIndex !== undefined) {
                    event.preventDefault();
                    setActiveTab(tabs[nextIndex].key);
                    document.getElementById(`${tabId}-${tabs[nextIndex].key}`)?.focus();
                  }
                }}
                className={`min-h-9 flex-1 rounded-full px-3 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${activeTab === tab.key ? "bg-[var(--jitter-ink)] text-white" : "text-[var(--jitter-gray-600)] hover:text-[var(--jitter-ink)]"}`}
              >{tab.label}</button>
            ))}
          </div>
          <pre id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${activeTab}`} tabIndex={0} className="max-h-[40dvh] overflow-auto whitespace-pre rounded-2xl bg-card p-4 font-mono text-caption leading-5"><code>{source[activeTab]}</code></pre>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copyCode} className={actionPrimaryClass}>
              {copiedTab === activeTab ? <Check className="size-3.5" aria-hidden="true" /> : <ClipboardCopy className="size-3.5" aria-hidden="true" />}
              {copiedTab === activeTab ? "Copied" : "Copy code"}
            </button>
            <a href={`/api/components/${component.id}/source?download=1`} className="inline-flex items-center gap-1.5 text-body hover:underline"><Download className="size-3.5" aria-hidden="true" />Download .tsx</a>
          </div>
          {copyError ? <p role="status" className="mt-3 text-caption">Copy failed. Select the code above and copy it manually.</p> : null}
        </>
      ) : <p role="status" className="mt-6 text-body text-[var(--jitter-gray-600)]">Loading source code…</p>}
      {error ? <p role="alert" className="mt-4 text-body text-[var(--jitter-gray-800)]">{error}</p> : null}
    </dialog>
  );
}
