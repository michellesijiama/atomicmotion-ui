"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const triggerClass =
  "inline-flex h-8 items-center rounded-full px-3 text-body text-[var(--jitter-gray-800)] ring-1 ring-black/10 transition hover:bg-[var(--jitter-gray-100)] hover:text-[var(--jitter-ink)]";

type RevealPanelProps = {
  label: string;
  children: ReactNode;
  // Render prop — receives onClose so the header nav can wire a close action.
  header?: (onClose: () => void) => ReactNode;
};

// Reusable click-to-open frosted panel (madewithjitter-style mega menu).
// The panel card wraps the nav row (via `header`) + content (`children`).
// Closes on outside click or Escape. No transform on the panel wrapper so
// backdrop-filter blur is not broken by an ancestor transform.
export function RevealPanel({ label, children, header }: RevealPanelProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="static">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={triggerClass}
      >
        {label}
      </button>

      {open ? (
        <div className="am-panel fixed inset-x-3 top-3 z-40 sm:inset-x-4 sm:top-4">
          <div className="overflow-hidden rounded-[28px] bg-[#f1f1f1]/60 backdrop-blur-[80px] backdrop-saturate-150">
            {/* Nav row lives inside the panel card — matches madewithjitter layout */}
            {header ? (
              <div className="border-b border-black/10 px-6 py-6 sm:px-10">
                {header(() => setOpen(false))}
              </div>
            ) : null}
            <div className="am-reveal px-6 pb-10 pt-8 sm:px-10">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
