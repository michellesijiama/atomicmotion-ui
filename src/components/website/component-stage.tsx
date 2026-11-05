"use client";

import * as React from "react";

import type { StageBackground } from "@/lib/component-registry";

const STAGE_BACKGROUNDS: Record<StageBackground, string> = {
  white: "var(--jitter-bg)",
  gray: "var(--jitter-card)",
};

type ComponentStageProps = {
  children: React.ReactNode;
  /** The colour this component is demoed on, from its registry entry. */
  background?: StageBackground;
};

/**
 * Full-screen container for a component detail page. It starts on the colour
 * the component asks for, white by default. Pressing Shift+G toggles the stage
 * between white (`--jitter-bg`) and the design-system gray (`--jitter-card`) so a
 * component can be inspected on both surfaces. The toggle is local, so it resets
 * whenever you navigate to another component or reload the page.
 */
export function ComponentStage({ children, background = "white" }: ComponentStageProps) {
  const [tone, setTone] = React.useState(background);

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
      setTone((prev) => (prev === "gray" ? "white" : "gray"));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden transition-colors duration-300 ease-out"
      style={{
        backgroundColor: STAGE_BACKGROUNDS[tone],
      }}
    >
      {children}
    </div>
  );
}

/** Fixed header band above a detail page's scrolling content. */
export function StageHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="am-reveal relative z-50 shrink-0 bg-[var(--am-header-bg)] px-6 py-8 sm:px-8 lg:px-12">
      {children}
    </div>
  );
}
