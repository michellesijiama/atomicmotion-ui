"use client";

import * as React from "react";

type ComponentStageProps = {
  children: React.ReactNode;
};

/**
 * Full-screen container for a component detail page. Pressing Shift+G toggles
 * the stage background between white (`--jitter-bg`) and the design-system gray
 * (`--jitter-card`) so a component can be inspected on both surfaces. The state
 * is local, so it resets to white whenever you navigate to another component or
 * reload the page.
 */
export function ComponentStage({ children }: ComponentStageProps) {
  const [isGray, setIsGray] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Match the physical G key (code) or the produced character (key), so the
      // shortcut is robust across keyboard layouts and event sources.
      const isG = event.code === "KeyG" || event.key.toLowerCase() === "g";
      if (!event.shiftKey || !isG) return;

      // Don't hijack the shortcut while typing in a field.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      setIsGray((prev) => !prev);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden transition-colors duration-300 ease-out"
      style={{
        backgroundColor: isGray ? "var(--jitter-card)" : "var(--jitter-bg)",
      }}
    >
      {children}
    </div>
  );
}

/** Fixed header band above a detail page's scrolling content. */
export function StageHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="am-reveal relative z-50 shrink-0 border-b border-[var(--am-header-border)] bg-[var(--am-header-bg)] px-6 py-8 sm:px-8 lg:px-12">
      {children}
    </div>
  );
}
