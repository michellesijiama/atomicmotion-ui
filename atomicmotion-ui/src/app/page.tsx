import { ElasticDrag } from "@/components/ui/elastic-drag";
import { FluidTabs } from "@/components/ui/fluid-tabs";
import { MagnetButton } from "@/components/ui/magnet-button";
import { ComponentPlate } from "@/components/website/component-plate";
import { SiteIndex } from "@/components/website/site-index";

const tabs = [
  { value: "button", label: "Button", meta: "magnet" },
  { value: "tabs", label: "Tabs", meta: "fluid" },
  { value: "drag", label: "Drag", meta: "elastic" },
];

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-black text-white">
      <SiteIndex />
      <div className="lg:ml-[35vw]">
        <ComponentPlate
          id="magnet-button"
          index="001"
          title="Magnet Button"
          description="A pointer-aware command surface with subtle spring pull and a reactive highlight field."
          command="copy magnet-button.tsx"
        >
          <div className="grid min-h-[430px] place-items-center bg-white p-6 sm:min-h-[500px]">
            <div className="grid w-full max-w-2xl gap-10">
              <div className="grid grid-cols-2 gap-3 border-b border-black/10 pb-4 font-mono text-[10px] uppercase text-black/45 sm:grid-cols-4">
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
                    className="border border-black/10 p-3 font-mono text-[10px] uppercase text-black/50"
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
          id="fluid-tabs"
          index="002"
          title="Fluid Tabs"
          description="A compact tab primitive with a liquid active indicator and keyboard-accessible roving selection."
          command="copy fluid-tabs.tsx"
        >
          <div className="grid min-h-[430px] place-items-center bg-white p-6 sm:min-h-[500px]">
            <div className="w-full max-w-3xl border border-black/10 bg-black p-5 text-white">
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
          id="elastic-drag"
          index="003"
          title="Elastic Drag"
          description="A draggable motion object tuned for tactile resistance, visual stretch, and spring return."
          command="copy elastic-drag.tsx"
        >
          <div className="grid min-h-[430px] place-items-center bg-white p-6 sm:min-h-[500px]">
            <div className="w-full max-w-3xl">
              <div className="mb-4 grid grid-cols-[1fr_auto] border-b border-black/10 pb-3 text-xs text-black/45">
                <span>gesture primitive</span>
                <span className="font-mono">dragElastic: 0.42</span>
              </div>
              <ElasticDrag className="bg-black text-white" label="Move me">
                Move me
              </ElasticDrag>
            </div>
          </div>
        </ComponentPlate>
      </div>
    </main>
  );
}
