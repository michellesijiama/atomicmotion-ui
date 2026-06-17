import * as React from "react";

import { cn } from "@/lib/utils";

export type WindowLeafShadowTone = "linen" | "mist" | "sage";

export type WindowLeafShadowProps = {
  tone?: WindowLeafShadowTone;
  grain?: number;
  blur?: number;
  shadeOpacity?: number;
  shadowOpacity?: number;
  className?: string;
  children?: React.ReactNode;
};

const tones: Record<
  WindowLeafShadowTone,
  {
    base: string;
    light: string;
    shade: string;
    leaf: string;
    leafSoft: string;
  }
> = {
  linen: {
    base: "#f3eadf",
    light: "#fffaf0",
    shade: "#d9cab8",
    leaf: "#5f6f5e",
    leafSoft: "#8d977f",
  },
  mist: {
    base: "#e8ece9",
    light: "#fbfbf4",
    shade: "#cdd8d4",
    leaf: "#526c63",
    leafSoft: "#879d94",
  },
  sage: {
    base: "#ecebdc",
    light: "#fff9e8",
    shade: "#d1d3b7",
    leaf: "#596b50",
    leafSoft: "#889276",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function LeafCluster({
  x,
  y,
  rotate = 0,
  scale = 1,
  opacity = 1,
}: {
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
}) {
  const leaves = [
    [-18, -56, -42, 20, 9],
    [12, -44, 34, 18, 8],
    [-10, -24, -28, 17, 8],
    [22, -12, 38, 16, 7],
    [-22, 8, -34, 15, 7],
    [16, 22, 30, 18, 8],
    [-4, 44, -16, 16, 7],
  ];

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}
      opacity={opacity}
    >
      <path
        d="M0 -70 C-12 -32 -12 18 3 76"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="5"
      />
      {leaves.map(([leafX, leafY, leafRotate, rx, ry]) => (
        <ellipse
          key={`${leafX}-${leafY}`}
          cx={leafX}
          cy={leafY}
          rx={rx}
          ry={ry}
          fill="currentColor"
          transform={`rotate(${leafRotate} ${leafX} ${leafY})`}
        />
      ))}
    </g>
  );
}

export function WindowLeafShadow({
  tone = "linen",
  grain = 0.12,
  blur = 9,
  shadeOpacity = 0.22,
  shadowOpacity = 0.58,
  className,
  children,
}: WindowLeafShadowProps) {
  const palette = tones[tone];
  const visualStyle = {
    "--window-base": palette.base,
    "--window-light": palette.light,
    "--window-shade": palette.shade,
    "--window-leaf": palette.leaf,
    "--window-leaf-soft": palette.leafSoft,
    "--window-grain": clamp(grain, 0, 0.42),
    "--window-blur": `${clamp(blur, 8, 44)}px`,
    "--window-shade-opacity": clamp(shadeOpacity, 0, 0.7),
    "--window-shadow-opacity": clamp(shadowOpacity, 0, 0.8),
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate min-h-[430px] overflow-hidden bg-[var(--window-base)] text-[var(--jitter-ink)] sm:min-h-[500px]",
        className,
      )}
      style={visualStyle}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-50 bg-[radial-gradient(circle_at_18%_18%,color-mix(in_srgb,var(--window-light)_95%,transparent)_0_24%,transparent_46%),radial-gradient(circle_at_82%_76%,color-mix(in_srgb,var(--window-light)_76%,transparent)_0_20%,transparent_42%),linear-gradient(140deg,var(--window-light)_0%,var(--window-base)_48%,color-mix(in_srgb,var(--window-shade)_28%,var(--window-base))_100%)]"
      />
      <svg
        aria-hidden="true"
        className="absolute -inset-[13%] -z-40 h-[126%] w-[126%] text-[var(--window-leaf)] opacity-[var(--window-shadow-opacity)] mix-blend-multiply blur-[var(--window-blur)]"
        viewBox="0 0 1200 760"
        preserveAspectRatio="none"
      >
        <LeafCluster x={205} y={280} rotate={-27} scale={2.45} opacity={0.92} />
        <LeafCluster x={390} y={245} rotate={18} scale={2.05} opacity={0.72} />
        <LeafCluster x={640} y={255} rotate={-12} scale={2.35} opacity={0.86} />
        <LeafCluster x={870} y={350} rotate={34} scale={2.05} opacity={0.72} />
        <LeafCluster x={520} y={510} rotate={-48} scale={2.45} opacity={0.82} />
        <LeafCluster x={755} y={565} rotate={20} scale={1.85} opacity={0.62} />
        <path
          d="M-40 500 C155 430 270 600 448 540 C638 474 725 330 920 374 C1050 398 1135 478 1260 430"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="28"
          opacity="0.48"
        />
      </svg>
      <svg
        aria-hidden="true"
        className="absolute -inset-[10%] -z-30 h-[120%] w-[120%] text-[var(--window-leaf-soft)] opacity-[calc(var(--window-shadow-opacity)*0.82)] mix-blend-multiply blur-[calc(var(--window-blur)*1.2)]"
        viewBox="0 0 1200 760"
        preserveAspectRatio="none"
      >
        <LeafCluster x={105} y={620} rotate={22} scale={2.8} opacity={0.44} />
        <LeafCluster x={1020} y={130} rotate={-36} scale={2.2} opacity={0.36} />
        <LeafCluster x={680} y={500} rotate={12} scale={1.5} opacity={0.42} />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-20 opacity-[var(--window-shade-opacity)] mix-blend-multiply"
        style={{
          backgroundImage:
            "repeating-linear-gradient(100deg, transparent 0 34px, color-mix(in srgb, var(--window-shade) 34%, transparent) 35px 52px, transparent 53px 118px), repeating-linear-gradient(180deg, rgba(255,255,255,.26) 0 2px, transparent 3px 44px)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[var(--window-grain)] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='.68'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,transparent_0_62%,rgba(120,106,88,.14)_100%),linear-gradient(180deg,rgba(255,255,255,.42),transparent_18%,rgba(120,106,88,.12)_100%)]"
      />
      {children}
    </div>
  );
}
