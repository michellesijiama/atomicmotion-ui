import type { ComponentType } from "react";

import { SunlitBookPage } from "@/components/sunlit-book-page";

function SunlitBookPagePreview() {
  return (
    <SunlitBookPage windIntensity={0.72}>
      <div className="grid gap-5 text-[13px] leading-7 text-[var(--jitter-ink)] sm:text-sm">
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
        <p>
          The room had gone quiet in the way bright rooms sometimes do, full of small
          movements that did not ask for attention. A curtain lifted, settled, and lifted
          again. Somewhere beyond the window, leaves arranged themselves into a loose
          language of shade.
        </p>
        <p>
          Each paragraph seemed to wait for the light to cross it. The dark shapes arrived
          softly, never interrupting the story, only changing the pace of it. A comma would
          dim, a line would brighten, and the eye would follow as if the page were breathing.
        </p>
        <p>
          It was not the kind of reading that measured progress. No one was counting pages.
          The book stayed open because the hour stayed open, and because the sun made even
          the white space feel useful.
        </p>
        <p>
          By the time the shadows had moved to the lower corner, the sentence at the center
          felt different from when it began. Nothing in the text had changed, but the day had
          touched it, and that was enough.
        </p>
      </div>
    </SunlitBookPage>
  );
}

export const componentMap: Record<string, ComponentType> = {
  "sunlit-book-page": SunlitBookPagePreview,
};
