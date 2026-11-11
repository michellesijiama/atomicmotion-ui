"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { OrganicUI } from "@components/ai/organic-ui/organic-ui";

// Keep the bezel and its screen opening in the original 3× proportions.
const frameWidth = 1406 / 3;
const frameHeight = 2822 / 3;
const stageLimit = 640;

export function OrganicUIPreview() {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setSize(Math.min(element.clientWidth, element.clientHeight, stageLimit));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = size * 0.85 / frameWidth;

  return (
    <div ref={stage} className="grid min-h-0 min-w-0 place-items-center overflow-clip">
      {size > 0 && (
        <div data-organic-stage className="relative overflow-clip [mask-image:linear-gradient(to_bottom,transparent,#000_14%)]" style={{ width: size, height: size }}>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ width: frameWidth * scale, height: frameHeight * scale, bottom: size * 0.055 }}>
            <div className="absolute top-0 left-0 origin-top-left" style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})` }}>
              <div
                className="absolute isolate overflow-clip bg-[#e8e6ea]"
                style={{
                  left: 34,
                  top: 100 / 3,
                  width: 402,
                  height: 874,
                  maskImage: "url(/components/bead-club/iphone-screen-mask.svg)",
                  maskSize: "100% 100%",
                  "--phone-preview-scale": scale,
                } as CSSProperties}
              >
                <OrganicUI />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- unmodified Apple device bezel. */}
              <img src="/components/bead-club/iphone-16-pro-white.png" width={1406} height={2822} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full drop-shadow-[0_14px_18px_#161a251f]" />
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[18%] backdrop-blur-[5px] [mask-image:linear-gradient(#000,transparent)]" />
        </div>
      )}
    </div>
  );
}
