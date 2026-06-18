import type { ComponentType } from "react";

import { SunlitBookPage } from "@/components/ui/sunlit-book-page";

function SunlitBookPagePreview() {
  return (
    <SunlitBookPage>
      <div className="grid gap-3 font-serif text-[13px] leading-7 text-[var(--jitter-ink)] sm:text-sm">
        <p>
          Sunlight gathered on the page, warm enough to make the paper feel almost alive
          beneath the sentence.
        </p>
        <p>
          The shadow of a branch moved across the margin and briefly covered three words
          before the wind gave them back.
        </p>
        <p>
          Reading became slower there, not because the book asked for it, but because the
          afternoon did.
        </p>
      </div>
    </SunlitBookPage>
  );
}

export const componentMap: Record<string, ComponentType> = {
  "sunlit-book-page": SunlitBookPagePreview,
};
