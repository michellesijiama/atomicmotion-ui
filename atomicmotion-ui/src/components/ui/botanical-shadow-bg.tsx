import * as React from "react";

import { cn } from "@/lib/utils";

export type BotanicalShadowTone = "slate" | "warm" | "moss";

export type BotanicalShadowBackgroundProps = {
  tone?: BotanicalShadowTone;
  grain?: number;
  blur?: number;
  contrast?: number;
  className?: string;
  children?: React.ReactNode;
};

const tones: Record<
  BotanicalShadowTone,
  {
    base: string;
    shadow: string;
    shadowSoft: string;
    bloom: string;
    wash: string;
  }
> = {
  slate: {
    base: "#506266",
    shadow: "#263b3f",
    shadowSoft: "#6f7d7b",
    bloom: "#fff8eb",
    wash: "#d7d0c4",
  },
  warm: {
    base: "#776f65",
    shadow: "#3e3933",
    shadowSoft: "#92877a",
    bloom: "#fff4df",
    wash: "#dac5aa",
  },
  moss: {
    base: "#59685d",
    shadow: "#2f3f34",
    shadowSoft: "#7d8975",
    bloom: "#fff6df",
    wash: "#cfd5bd",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BotanicalShadowBackground({
  tone = "slate",
  grain = 0.24,
  blur = 28,
  contrast = 1,
  className,
  children,
}: BotanicalShadowBackgroundProps) {
  const palette = tones[tone];
  const strength = clamp(contrast, 0.72, 1.35);
  const visualStyle = {
    "--botanical-base": palette.base,
    "--botanical-shadow": palette.shadow,
    "--botanical-shadow-soft": palette.shadowSoft,
    "--botanical-bloom": palette.bloom,
    "--botanical-wash": palette.wash,
    "--botanical-grain": clamp(grain, 0, 0.7),
    "--botanical-blur": `${clamp(blur, 8, 56)}px`,
    "--botanical-contrast": strength,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate min-h-[430px] overflow-hidden bg-[var(--botanical-base)] text-white sm:min-h-[500px]",
        className,
      )}
      style={visualStyle}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-50 bg-[radial-gradient(circle_at_18%_84%,color-mix(in_srgb,var(--botanical-bloom)_82%,transparent)_0_16%,transparent_34%),radial-gradient(circle_at_42%_44%,color-mix(in_srgb,var(--botanical-bloom)_86%,transparent)_0_14%,transparent_31%),radial-gradient(circle_at_66%_41%,color-mix(in_srgb,var(--botanical-bloom)_88%,transparent)_0_11%,transparent_29%),radial-gradient(circle_at_96%_42%,color-mix(in_srgb,var(--botanical-bloom)_72%,transparent)_0_8%,transparent_24%),linear-gradient(180deg,var(--botanical-base)_0%,color-mix(in_srgb,var(--botanical-wash)_48%,var(--botanical-base))_100%)]"
      />
      <span
        aria-hidden="true"
        className="absolute -inset-[10%] -z-40 blur-[var(--botanical-blur)] contrast-[var(--botanical-contrast)]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 11% 33%, color-mix(in srgb, var(--botanical-shadow) 72%, transparent) 0 7%, transparent 17%), radial-gradient(ellipse at 23% 12%, color-mix(in srgb, var(--botanical-bloom) 72%, transparent) 0 5%, transparent 14%), radial-gradient(ellipse at 35% 17%, color-mix(in srgb, var(--botanical-bloom) 78%, transparent) 0 7%, transparent 18%), radial-gradient(ellipse at 48% 24%, color-mix(in srgb, var(--botanical-shadow-soft) 52%, transparent) 0 6%, transparent 16%), radial-gradient(ellipse at 56% 33%, color-mix(in srgb, var(--botanical-shadow) 60%, transparent) 0 9%, transparent 18%), radial-gradient(ellipse at 68% 16%, color-mix(in srgb, var(--botanical-bloom) 54%, transparent) 0 6%, transparent 14%), radial-gradient(ellipse at 88% 28%, color-mix(in srgb, var(--botanical-shadow) 58%, transparent) 0 5%, transparent 14%), radial-gradient(ellipse at 18% 58%, color-mix(in srgb, var(--botanical-bloom) 92%, transparent) 0 17%, transparent 30%), radial-gradient(ellipse at 37% 57%, color-mix(in srgb, var(--botanical-bloom) 82%, transparent) 0 16%, transparent 28%), radial-gradient(ellipse at 54% 61%, color-mix(in srgb, var(--botanical-bloom) 84%, transparent) 0 13%, transparent 25%), radial-gradient(ellipse at 70% 55%, color-mix(in srgb, var(--botanical-shadow) 64%, transparent) 0 8%, transparent 19%), radial-gradient(ellipse at 82% 65%, color-mix(in srgb, var(--botanical-bloom) 78%, transparent) 0 11%, transparent 23%), radial-gradient(ellipse at 12% 82%, color-mix(in srgb, var(--botanical-shadow-soft) 48%, transparent) 0 9%, transparent 18%), radial-gradient(ellipse at 32% 81%, color-mix(in srgb, var(--botanical-shadow) 66%, transparent) 0 10%, transparent 20%), radial-gradient(ellipse at 45% 88%, color-mix(in srgb, var(--botanical-bloom) 70%, transparent) 0 8%, transparent 20%), radial-gradient(ellipse at 59% 82%, color-mix(in srgb, var(--botanical-shadow) 68%, transparent) 0 7%, transparent 18%), radial-gradient(ellipse at 77% 84%, color-mix(in srgb, var(--botanical-bloom) 76%, transparent) 0 13%, transparent 26%), radial-gradient(ellipse at 96% 82%, color-mix(in srgb, var(--botanical-shadow-soft) 52%, transparent) 0 8%, transparent 18%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-30 opacity-70 mix-blend-multiply blur-[18px]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 38% 72%, color-mix(in srgb, var(--botanical-shadow) 78%, transparent) 0 7%, transparent 18%), radial-gradient(ellipse at 51% 74%, color-mix(in srgb, var(--botanical-shadow) 72%, transparent) 0 5%, transparent 14%), radial-gradient(ellipse at 63% 69%, color-mix(in srgb, var(--botanical-shadow) 76%, transparent) 0 6%, transparent 15%), radial-gradient(ellipse at 75% 70%, color-mix(in srgb, var(--botanical-shadow) 72%, transparent) 0 8%, transparent 17%), radial-gradient(ellipse at 83% 76%, color-mix(in srgb, var(--botanical-shadow) 64%, transparent) 0 5%, transparent 14%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-20 opacity-[var(--botanical-grain)] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='.82'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_52%,transparent_0_52%,rgba(16,26,28,.32)_100%),linear-gradient(180deg,rgba(255,255,255,.08),transparent_22%,rgba(0,0,0,.18)_100%)]"
      />
      {children}
    </div>
  );
}
