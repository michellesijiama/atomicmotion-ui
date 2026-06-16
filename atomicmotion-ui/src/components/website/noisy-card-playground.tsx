"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { NoisyAnalogCard } from "@/components/ui/noisy-analog-card";
import { cn } from "@/lib/utils";

const defaults = {
  opacity: 0.34,
  blur: 18,
  grain: 0.48,
  grainScale: 1.2,
  borderOpacity: 0.24,
  hoverTilt: 5,
  tint: "#15bc64",
  highlight: "#ffffff",
};

const tintSwatches = ["#15bc64", "#7a40ed", "#1377e4", "#ff8316"];
const highlightSwatches = ["#ffffff", "#d0f1e0", "#cee4fb", "#e4d8fb"];

type SettingKey = keyof typeof defaults;

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  const inputId = React.useId();

  return (
    <div className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <label
        htmlFor={inputId}
        className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase text-[var(--jitter-gray-600)]"
      >
        {label}
        <span className="text-[var(--jitter-ink)]">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </label>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full accent-[var(--jitter-ink)]"
      />
    </div>
  );
}

type SwatchGroupProps = {
  label: string;
  value: string;
  swatches: string[];
  onChange: (value: string) => void;
};

function SwatchGroup({ label, value, swatches, onChange }: SwatchGroupProps) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <p className="mb-3 font-mono text-[10px] uppercase text-[var(--jitter-gray-600)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`${label} ${swatch}`}
            onClick={() => onChange(swatch)}
            className={cn(
              "h-8 w-8 rounded-lg border border-black/10 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[var(--jitter-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              value === swatch
                ? "scale-110 ring-2 ring-[var(--jitter-ink)]"
                : "hover:scale-105",
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </div>
  );
}

export function NoisyCardPlayground() {
  const [settings, setSettings] = React.useState(defaults);

  function setSetting<T extends SettingKey>(key: T, value: (typeof defaults)[T]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid min-h-[430px] gap-4 bg-[var(--jitter-surface)] p-4 text-[var(--jitter-ink)] sm:min-h-[560px] lg:grid-cols-[1fr_290px]">
      <div className="grid place-items-center overflow-hidden rounded-[18px] bg-[var(--jitter-ink)] p-5">
        <div className="w-full max-w-xl">
          <div className="mb-4 grid grid-cols-[1fr_auto] border-b border-white/10 pb-3 font-mono text-[10px] uppercase text-zinc-500">
            <span>analog material</span>
            <span>grain {settings.grain.toFixed(2)}</span>
          </div>
          <NoisyAnalogCard {...settings}>
            <div className="flex min-h-64 flex-col justify-between">
              <div className="flex items-start justify-between gap-6 font-mono text-[10px] uppercase text-white/55">
                <span>noisy signal</span>
                <span>{settings.tint}</span>
              </div>
              <div>
                <p className="text-3xl font-medium tracking-normal text-white">
                  Noisy Glass
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/62">
                  A frosted analog surface with soft static, color wash, and
                  pointer-reactive depth.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase text-white/45">
                <span>opacity</span>
                <span>blur</span>
                <span>border</span>
              </div>
            </div>
          </NoisyAnalogCard>
        </div>
      </div>

      <div className="grid content-start gap-3 rounded-[18px] bg-[var(--jitter-bg)] p-4 ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
          <div>
            <div className="mb-2 flex gap-1.5">
              <span className="rounded-full bg-[var(--jitter-orange)]/12 px-2 py-1 text-[10px] font-semibold uppercase text-[var(--jitter-orange)]">
                NEW
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase text-[var(--jitter-gray-800)] ring-1 ring-black/5">
                Material
              </span>
            </div>
            <p className="text-sm font-semibold text-[var(--jitter-ink)]">
              Noisy controls
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--jitter-gray-600)]">
              Adjust material properties in real time.
            </p>
          </div>
          <button
            type="button"
            aria-label="Reset noisy card controls"
            onClick={() => setSettings(defaults)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-[var(--jitter-gray-600)] outline-none ring-1 ring-black/5 transition-colors hover:text-[var(--jitter-ink)] focus-visible:ring-2 focus-visible:ring-[var(--jitter-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <Slider
          label="Opacity"
          value={settings.opacity}
          min={0.1}
          max={0.9}
          step={0.01}
          onChange={(value) => setSetting("opacity", value)}
        />
        <Slider
          label="Blur"
          value={settings.blur}
          min={0}
          max={28}
          step={1}
          onChange={(value) => setSetting("blur", value)}
        />
        <Slider
          label="Grain"
          value={settings.grain}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setSetting("grain", value)}
        />
        <Slider
          label="Grain scale"
          value={settings.grainScale}
          min={0.5}
          max={2.5}
          step={0.05}
          onChange={(value) => setSetting("grainScale", value)}
        />
        <Slider
          label="Border"
          value={settings.borderOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setSetting("borderOpacity", value)}
        />
        <Slider
          label="Hover tilt"
          value={settings.hoverTilt}
          min={0}
          max={10}
          step={1}
          onChange={(value) => setSetting("hoverTilt", value)}
        />
        <SwatchGroup
          label="Tint"
          value={settings.tint}
          swatches={tintSwatches}
          onChange={(value) => setSetting("tint", value)}
        />
        <SwatchGroup
          label="Highlight"
          value={settings.highlight}
          swatches={highlightSwatches}
          onChange={(value) => setSetting("highlight", value)}
        />
      </div>
    </div>
  );
}
