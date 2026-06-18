"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type WindowLeafShadowTone = "linen" | "mist" | "sage";

export type WindowLeafShadowProps = {
  tone?: WindowLeafShadowTone;
  grain?: number;
  blur?: number;
  shadeOpacity?: number;
  shadowOpacity?: number;
  interactive?: boolean;
  wind?: boolean;
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
    base: "var(--jitter-bg, #f5f5f5)",
    light: "#f7f8f4",
    shade: "#bfc9c8",
    leaf: "#4f6161",
    leafSoft: "#858f90",
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
  motion = "mid",
  sway = "a",
}: {
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
  motion?: "near" | "mid" | "far";
  sway?: "a" | "b" | "c";
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
      <g className={`window-leaf-wind window-leaf-wind-${sway}`}>
        <g
          className="transition-transform duration-300 ease-out"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transform: `translate3d(var(--window-leaf-${motion}-x), var(--window-leaf-${motion}-y), 0) rotate(var(--window-leaf-${motion}-rotate))`,
          }}
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
      </g>
    </g>
  );
}

export function WindowLeafShadow({
  tone = "mist",
  grain = 0.12,
  blur = 9,
  shadeOpacity = 0,
  shadowOpacity = 0.52,
  interactive = true,
  wind = true,
  className,
  children,
}: WindowLeafShadowProps) {
  const palette = tones[tone];
  const resetPointer = React.useCallback(
    (node: HTMLDivElement) => {
      if (!interactive) return;
      node.style.setProperty("--window-cursor-wind", "0");
      for (const depth of ["near", "mid", "far"]) {
        node.style.setProperty(`--window-leaf-${depth}-x`, "0px");
        node.style.setProperty(`--window-leaf-${depth}-y`, "0px");
        node.style.setProperty(`--window-leaf-${depth}-rotate`, "0deg");
      }
    },
    [interactive],
  );
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
      const y = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);

      event.currentTarget.style.setProperty("--window-cursor-wind", "1");
      event.currentTarget.style.setProperty("--window-leaf-near-x", `${(x * -10).toFixed(2)}px`);
      event.currentTarget.style.setProperty("--window-leaf-near-y", `${(y * -7).toFixed(2)}px`);
      event.currentTarget.style.setProperty("--window-leaf-near-rotate", `${(x * 1.4).toFixed(2)}deg`);
      event.currentTarget.style.setProperty("--window-leaf-mid-x", `${(x * 7).toFixed(2)}px`);
      event.currentTarget.style.setProperty("--window-leaf-mid-y", `${(y * -5).toFixed(2)}px`);
      event.currentTarget.style.setProperty("--window-leaf-mid-rotate", `${(x * -0.9).toFixed(2)}deg`);
      event.currentTarget.style.setProperty("--window-leaf-far-x", `${(x * -4).toFixed(2)}px`);
      event.currentTarget.style.setProperty("--window-leaf-far-y", `${(y * 3).toFixed(2)}px`);
      event.currentTarget.style.setProperty("--window-leaf-far-rotate", `${(x * 0.5).toFixed(2)}deg`);
    },
    [interactive],
  );
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
    "--window-cursor-wind": 0,
    "--window-leaf-near-x": "0px",
    "--window-leaf-near-y": "0px",
    "--window-leaf-near-rotate": "0deg",
    "--window-leaf-mid-x": "0px",
    "--window-leaf-mid-y": "0px",
    "--window-leaf-mid-rotate": "0deg",
    "--window-leaf-far-x": "0px",
    "--window-leaf-far-y": "0px",
    "--window-leaf-far-rotate": "0deg",
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate min-h-[430px] overflow-hidden bg-transparent text-[var(--jitter-ink)] sm:min-h-[500px]",
        className,
      )}
      style={visualStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => resetPointer(event.currentTarget)}
    >
      <style>
        {`
          @keyframes window-leaf-sway-a {
            0%, 100% { transform: translate3d(-1px, 0, 0) rotate(-0.45deg); }
            32% { transform: translate3d(calc(4px + var(--window-cursor-wind) * 5px), -2px, 0) rotate(calc(0.75deg + var(--window-cursor-wind) * 0.9deg)); }
            67% { transform: translate3d(calc(-3px - var(--window-cursor-wind) * 3px), 1px, 0) rotate(calc(-0.25deg - var(--window-cursor-wind) * 0.6deg)); }
          }

          @keyframes window-leaf-sway-b {
            0%, 100% { transform: translate3d(1px, 1px, 0) rotate(0.35deg); }
            38% { transform: translate3d(calc(-5px - var(--window-cursor-wind) * 6px), 2px, 0) rotate(calc(-0.9deg - var(--window-cursor-wind) * 0.8deg)); }
            72% { transform: translate3d(calc(3px + var(--window-cursor-wind) * 4px), -1px, 0) rotate(calc(0.2deg + var(--window-cursor-wind) * 0.5deg)); }
          }

          @keyframes window-leaf-sway-c {
            0%, 100% { transform: translate3d(0, -1px, 0) rotate(-0.2deg); }
            45% { transform: translate3d(calc(2px + var(--window-cursor-wind) * 3px), 2px, 0) rotate(calc(0.45deg + var(--window-cursor-wind) * 0.5deg)); }
            76% { transform: translate3d(calc(-2px - var(--window-cursor-wind) * 4px), -2px, 0) rotate(calc(-0.65deg - var(--window-cursor-wind) * 0.7deg)); }
          }

          .window-leaf-wind {
            animation-duration: 8.8s;
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
            transform-box: fill-box;
            transform-origin: center;
            will-change: transform;
          }

          .window-leaf-wind-a {
            animation-name: window-leaf-sway-a;
            animation-delay: -1.4s;
          }

          .window-leaf-wind-b {
            animation-name: window-leaf-sway-b;
            animation-delay: -4.1s;
            animation-duration: 10.6s;
          }

          .window-leaf-wind-c {
            animation-name: window-leaf-sway-c;
            animation-delay: -6.8s;
            animation-duration: 12.2s;
          }

          .window-leaf-shadow-still .window-leaf-wind {
            animation-play-state: paused;
          }
        `}
      </style>
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-50 bg-[radial-gradient(circle_at_18%_18%,color-mix(in_srgb,var(--window-light)_76%,transparent)_0_20%,transparent_46%),radial-gradient(circle_at_82%_76%,color-mix(in_srgb,var(--window-light)_58%,transparent)_0_18%,transparent_44%),linear-gradient(140deg,transparent_0%,color-mix(in_srgb,var(--window-light)_36%,transparent)_34%,transparent_78%)]"
      />
      <svg
        aria-hidden="true"
        className={cn(
          "absolute -inset-[13%] -z-40 h-[126%] w-[126%] text-[var(--window-leaf)] opacity-[var(--window-shadow-opacity)] mix-blend-multiply blur-[calc(var(--window-blur)*1.35)]",
          !wind && "window-leaf-shadow-still",
        )}
        viewBox="0 0 1200 760"
        preserveAspectRatio="none"
      >
        <LeafCluster x={205} y={280} rotate={-27} scale={2.45} opacity={0.78} motion="near" sway="a" />
        <LeafCluster x={390} y={245} rotate={18} scale={2.05} opacity={0.58} motion="mid" sway="b" />
        <LeafCluster x={640} y={255} rotate={-12} scale={2.35} opacity={0.72} motion="near" sway="c" />
        <LeafCluster x={870} y={350} rotate={34} scale={2.05} opacity={0.58} motion="mid" sway="a" />
        <LeafCluster x={520} y={510} rotate={-48} scale={2.45} opacity={0.66} motion="near" sway="b" />
        <LeafCluster x={755} y={565} rotate={20} scale={1.85} opacity={0.48} motion="far" sway="c" />
        <LeafCluster x={1040} y={600} rotate={-18} scale={1.65} opacity={0.4} motion="far" sway="a" />
        <LeafCluster x={65} y={450} rotate={42} scale={1.6} opacity={0.38} motion="mid" sway="b" />
      </svg>
      <svg
        aria-hidden="true"
        className={cn(
          "absolute -inset-[10%] -z-30 h-[120%] w-[120%] text-[var(--window-leaf-soft)] opacity-[calc(var(--window-shadow-opacity)*0.68)] mix-blend-multiply blur-[calc(var(--window-blur)*1.85)]",
          !wind && "window-leaf-shadow-still",
        )}
        viewBox="0 0 1200 760"
        preserveAspectRatio="none"
      >
        <LeafCluster x={105} y={620} rotate={22} scale={2.8} opacity={0.36} motion="far" sway="b" />
        <LeafCluster x={1020} y={130} rotate={-36} scale={2.2} opacity={0.3} motion="far" sway="c" />
        <LeafCluster x={680} y={500} rotate={12} scale={1.5} opacity={0.34} motion="mid" sway="a" />
        <LeafCluster x={290} y={95} rotate={-10} scale={1.55} opacity={0.28} motion="far" sway="b" />
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
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,transparent_0_64%,rgba(80,92,92,.08)_100%),linear-gradient(180deg,rgba(255,255,255,.28),transparent_20%,rgba(80,92,92,.06)_100%)]"
      />
      {children}
    </div>
  );
}
