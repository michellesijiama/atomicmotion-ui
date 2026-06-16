"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

type ComponentPlateProps = {
  id: string;
  index: string;
  title: string;
  description: string;
  command: string;
  codePath: string;
  codeHref: string;
  downloadHref: string;
  downloadLabel: string;
  aiPrompt: string;
  children: ReactNode;
  className?: string;
  category?: string;
  status?: string;
  statusClassName?: string;
};

export function ComponentPlate({
  id,
  index,
  title,
  description,
  command,
  codePath,
  codeHref,
  downloadHref,
  downloadLabel,
  aiPrompt,
  children,
  className,
  category = "Component",
  status = "FREE",
  statusClassName = "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
}: ComponentPlateProps) {
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
    const copied = await writeClipboardText(aiPrompt);

    if (copied) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
      return;
    }

    setCopyState("failed");
  }

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-8 border-t border-black/10 px-4 py-5 sm:px-6 lg:min-h-screen lg:px-10 lg:py-8",
        className,
      )}
    >
      <div className="grid gap-4 rounded-[22px] bg-white p-3 shadow-[0_18px_60px_rgba(14,16,17,0.06)] ring-1 ring-black/5 sm:p-4">
        <div className="grid gap-3 border-b border-black/8 pb-3 text-xs text-[var(--jitter-gray-600)] xl:grid-cols-[auto_1fr_minmax(300px,380px)] xl:items-start">
          <span className="font-mono text-[var(--jitter-gray-600)]">{index}</span>
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[var(--jitter-gray-100)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--jitter-gray-800)]">
                {category}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                  statusClassName,
                )}
              >
                {status}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--jitter-ink)]">{title}</h2>
            <p className="mt-1 max-w-xl leading-5">{description}</p>
          </div>
          <div className="grid gap-2 rounded-[16px] bg-[var(--jitter-surface)] p-3 text-[11px] ring-1 ring-black/5">
            <div className="grid gap-1">
              <span className="font-mono uppercase text-[10px] text-[var(--jitter-gray-600)]">
                Name
              </span>
              <span className="font-medium text-[var(--jitter-ink)]">{title}</span>
            </div>
            <div className="grid gap-1">
              <span className="font-mono uppercase text-[10px] text-[var(--jitter-gray-600)]">
                What it is
              </span>
              <span className="leading-4 text-[var(--jitter-gray-800)]">{description}</span>
            </div>
            <div className="grid gap-1">
              <span className="font-mono uppercase text-[10px] text-[var(--jitter-gray-600)]">
                Source
              </span>
              <code className="break-all font-mono text-[10px] text-[var(--jitter-gray-800)]">
                {codePath}
              </code>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={codeHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 font-medium text-[var(--jitter-ink)] ring-1 ring-black/10 transition hover:bg-[var(--jitter-gray-100)]"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                View code
              </a>
              <a
                href={downloadHref}
                target="_blank"
                rel="noreferrer"
                aria-label={downloadLabel}
                title={downloadLabel}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--jitter-ink)] px-3 font-medium text-white transition hover:bg-black"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Download TSX
              </a>
              <button
                type="button"
                onClick={copyForAi}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--jitter-green)] px-3 font-medium text-white transition hover:brightness-95"
              >
                {copyState === "copied" ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
                {copyState === "copied" ? "Copied" : "Copy for AI"}
              </button>
              <code className="inline-flex h-8 items-center rounded-full bg-white px-3 font-mono text-[10px] text-[var(--jitter-gray-800)] ring-1 ring-black/10">
                {command}
              </code>
            </div>
            {copyState === "failed" ? (
              <div className="grid gap-1">
                <p className="text-[10px] text-[var(--jitter-orange)]">
                  Copy failed. AI prompt is below.
                </p>
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-2 font-mono text-[10px] leading-4 text-[var(--jitter-gray-800)] ring-1 ring-black/10">
                  {aiPrompt}
                </pre>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-[430px] overflow-hidden rounded-[18px] bg-[var(--jitter-surface)] text-black ring-1 ring-black/5 sm:min-h-[500px]">
          {children}
        </div>
      </div>
    </section>
  );
}
