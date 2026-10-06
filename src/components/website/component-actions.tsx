"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ClipboardCopy, Code, LockKeyhole } from "lucide-react";

import type { ComponentMeta } from "@/lib/component-registry";
import { writeClipboardText } from "@/lib/clipboard";
import { formatComponentPrice, getComponentOffer } from "@/lib/component-offers";
import { ComponentCodeDialog, type SourceBundle } from "@/components/website/component-code-dialog";
import {
  actionPrimaryClass,
  actionSecondaryClass,
} from "@/components/website/styles";

type ComponentActionsProps = {
  component: ComponentMeta;
  checkoutStatus?: "success" | "cancelled" | "failed";
};

export function ComponentActions({ component, checkoutStatus }: ComponentActionsProps) {
  const offer = getComponentOffer(component.id);
  const [access, setAccess] = useState<"checking" | "locked" | "unlocked" | "failed">(offer ? "checking" : "unlocked");
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [mode, setMode] = useState<"purchase" | "source" | null>(null);
  const [source, setSource] = useState<SourceBundle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedText, setFailedText] = useState("");
  const copyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (!offer) return;
    const controller = new AbortController();
    fetch(`/api/components/${component.id}/access`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setAccess(result.unlocked ? "unlocked" : "locked");
        setCheckoutAvailable(result.checkoutAvailable);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setAccess("failed");
        setError(cause instanceof Error ? cause.message : "We couldn't check your purchase. Please reload to try again.");
      });
    return () => controller.abort();
  }, [component.id, offer]);

  useEffect(() => {
    const timers = copyTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  async function loadSource() {
    if (source) return source;
    const response = await fetch(`/api/components/${component.id}/source`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 403) setAccess("locked");
      throw new Error(result.error);
    }
    setSource(result);
    return result as SourceBundle;
  }

  async function openSource() {
    if (access !== "unlocked") { setMode("purchase"); return; }
    setMode("source");
    setError(null);
    try { await loadSource(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't load your source code.");
    }
  }

  async function purchase() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: component.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.unlocked) {
        setAccess("unlocked");
        setMode("source");
        await loadSource();
      } else {
        window.location.assign(result.url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout failed. Please try again.");
    } finally { setBusy(false); }
  }

  async function copyLink() {
    const copied = await writeClipboardText(component.codeHref);

    if (copied) {
      setLinkCopyState("copied");
      copyTimers.current.push(setTimeout(() => setLinkCopyState("idle"), 1800));
    }
  }

  async function copyForAi() {
    const copied = await writeClipboardText(component.aiPrompt);

    if (copied) {
      setCopyState("copied");
      copyTimers.current.push(setTimeout(() => setCopyState("idle"), 1800));
      return;
    }

    setCopyState("failed");
    setFailedText(component.aiPrompt);
  }

  async function copySource() {
    setBusy(true);
    setError(null);
    try {
      const bundle = await loadSource();
      const copied = await writeClipboardText(`/*\n${bundle.license}\n*/\n\n${bundle.source}`);
      if (copied) {
        setCopyState("copied");
        copyTimers.current.push(setTimeout(() => setCopyState("idle"), 1800));
      } else {
        setMode("source");
        setError("Copy failed. You can select the code or download the file.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't load your source code.");
    } finally { setBusy(false); }
  }

  const locked = Boolean(offer) && access !== "unlocked";

  return (
    <div className="grid gap-3">
      {offer && checkoutStatus ? (
        <p role="status" className="text-caption text-[var(--jitter-gray-600)]">
          {access === "unlocked" ? "Payment confirmed. Your source code is unlocked." : checkoutStatus === "cancelled" ? "Checkout cancelled. Your demo is still free." : checkoutStatus === "failed" ? "We couldn't confirm payment. Try again or refresh to check your access." : access === "checking" ? "Checking your payment…" : "Payment isn't confirmed yet. Reload to check again."}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={offer ? openSource : copyLink}
          disabled={Boolean(offer) && (access === "checking" || access === "failed")}
          aria-label={offer ? locked ? "Unlock source code" : "View source code" : linkCopyState === "copied" ? "Copied link" : "Copy link"}
          title={offer ? locked ? "Source code locked" : "View source code" : linkCopyState === "copied" ? "Copied" : "Copy link"}
          className={actionSecondaryClass}
        >
          {!offer && linkCopyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Code className="size-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={offer ? locked ? () => setMode("purchase") : copySource : copyForAi}
          disabled={busy || Boolean(offer) && (access === "checking" || access === "failed")}
          className={`${actionPrimaryClass} disabled:cursor-wait disabled:opacity-50`}
        >
          {locked ? <LockKeyhole className="size-3.5" aria-hidden="true" /> : copyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <ClipboardCopy className="size-3.5" aria-hidden="true" />
          )}
          {offer ? access === "checking" ? "Checking access…" : locked ? `Purchase — ${formatComponentPrice(offer)}` : busy ? "Loading code…" : copyState === "copied" ? "Copied" : "Copy Code" : copyState === "copied" ? "Copied" : "Copy for AI"}
        </button>
      </div>
      {copyState === "failed" ? (
        <div className="grid gap-1">
          <p className="text-[10px] text-[var(--jitter-orange)]">
            Copy failed. AI prompt is below.
          </p>
          <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-2 font-mono text-[10px] leading-4 text-[var(--jitter-gray-800)] ring-1 ring-black/10">
            {failedText}
          </pre>
        </div>
      ) : null}
      {error && !mode ? <p role="alert" className="text-caption text-[var(--jitter-gray-600)]">{error}</p> : null}
      {offer ? <ComponentCodeDialog component={component} offer={offer} mode={mode} source={source} checkoutAvailable={checkoutAvailable} busy={busy} error={error} onClose={() => setMode(null)} onPurchase={purchase} /> : null}
    </div>
  );
}
