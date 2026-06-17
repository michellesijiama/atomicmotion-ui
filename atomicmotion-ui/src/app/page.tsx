import { ElasticDrag } from "@/components/ui/elastic-drag";
import { FluidTabs } from "@/components/ui/fluid-tabs";
import { MagnetButton } from "@/components/ui/magnet-button";
import { WindowLeafShadow } from "@/components/ui/window-leaf-shadow";
import { ComponentPlate } from "@/components/website/component-plate";
import { NoisyCardPlayground } from "@/components/website/noisy-card-playground";
import { SiteIndex } from "@/components/website/site-index";
import { componentRegistry } from "@/lib/component-registry";

const tabs = [
  { value: "button", label: "Button", meta: "magnet" },
  { value: "tabs", label: "Tabs", meta: "fluid" },
  { value: "drag", label: "Drag", meta: "elastic" },
];

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-[var(--jitter-bg)] text-[var(--jitter-ink)]">
      <SiteIndex />
      <div className="lg:ml-[35vw]">
        <ComponentPlate
          {...componentRegistry.magnetButton}
        >
          <div className="grid min-h-[430px] place-items-center bg-[var(--jitter-surface)] p-6 sm:min-h-[500px]">
            <div className="grid w-full max-w-2xl gap-10">
              <div className="grid grid-cols-2 gap-3 border-b border-black/10 pb-4 font-mono text-[10px] uppercase text-[var(--jitter-gray-600)] sm:grid-cols-4">
                <span>atomic</span>
                <span>pointer</span>
                <span>spring</span>
                <span>button</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-5">
                <MagnetButton>Launch Motion</MagnetButton>
                <MagnetButton className="bg-black text-white hover:bg-zinc-900">
                  Copy Component
                </MagnetButton>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["stiffness", "damping", "mass"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-white p-3 font-mono text-[10px] uppercase text-[var(--jitter-gray-600)] ring-1 ring-black/5"
                  >
                    {item}
                    <div className="mt-6 h-px bg-black/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ComponentPlate>

        <ComponentPlate
          {...componentRegistry.fluidTabs}
        >
          <div className="grid min-h-[430px] place-items-center bg-[var(--jitter-surface)] p-6 sm:min-h-[500px]">
            <div className="w-full max-w-3xl rounded-[18px] bg-[var(--jitter-ink)] p-5 text-white">
              <div className="mb-16 grid gap-3 border-b border-white/15 pb-4 text-xs text-zinc-400 sm:grid-cols-[1fr_auto]">
                <p>AtomicMotion UI</p>
                <p className="font-mono">layoutId / spring / tablist</p>
              </div>
              <div className="flex justify-center">
                <FluidTabs tabs={tabs} defaultValue="button" />
              </div>
              <div className="mt-16 grid gap-3 sm:grid-cols-3">
                {tabs.map((tab) => (
                  <div key={tab.value} className="border border-white/10 p-4">
                    <p className="text-sm text-white">{tab.label}</p>
                    <p className="mt-8 font-mono text-[10px] uppercase text-zinc-500">
                      {tab.meta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ComponentPlate>

        <ComponentPlate
          {...componentRegistry.elasticDrag}
        >
          <div className="grid min-h-[430px] place-items-center bg-[var(--jitter-surface)] p-6 sm:min-h-[500px]">
            <div className="w-full max-w-3xl">
              <div className="mb-4 grid grid-cols-[1fr_auto] border-b border-black/10 pb-3 text-xs text-[var(--jitter-gray-600)]">
                <span>gesture primitive</span>
                <span className="font-mono">dragElastic: 0.42</span>
              </div>
              <ElasticDrag className="bg-black text-white" label="Move me">
                Move me
              </ElasticDrag>
            </div>
          </div>
        </ComponentPlate>

        <ComponentPlate
          {...componentRegistry.noisyAnalogCard}
        >
          <NoisyCardPlayground />
        </ComponentPlate>

        <ComponentPlate
          {...componentRegistry.windowLeafShadow}
        >
          <WindowLeafShadow className="min-h-[430px] sm:min-h-[500px]" />
        </ComponentPlate>
      </div>
    </main>
  );
}
