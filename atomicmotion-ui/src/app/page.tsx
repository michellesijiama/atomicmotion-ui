import { ElasticDrag } from "@/components/ui/elastic-drag";
import { FluidTabs } from "@/components/ui/fluid-tabs";
import { MagnetButton } from "@/components/ui/magnet-button";
import { ComponentPlate } from "@/components/website/component-plate";
import { NoisyCardPlayground } from "@/components/website/noisy-card-playground";
import { SiteIndex } from "@/components/website/site-index";

const tabs = [
  { value: "button", label: "Button", meta: "magnet" },
  { value: "tabs", label: "Tabs", meta: "fluid" },
  { value: "drag", label: "Drag", meta: "elastic" },
];

const repoBlobBase =
  "https://github.com/michellesijiama/atomicmotion-ui/blob/codex/aircenter-design-system";
const repoRawBase =
  "https://raw.githubusercontent.com/michellesijiama/atomicmotion-ui/refs/heads/codex/aircenter-design-system";

const sourceLinks = {
  magnetButton: {
    codePath: "src/components/ui/magnet-button.tsx",
    codeHref: `${repoBlobBase}/src/components/ui/magnet-button.tsx`,
    downloadHref: `${repoRawBase}/src/components/ui/magnet-button.tsx`,
    downloadLabel: "Download magnet-button.tsx",
  },
  fluidTabs: {
    codePath: "src/components/ui/fluid-tabs.tsx",
    codeHref: `${repoBlobBase}/src/components/ui/fluid-tabs.tsx`,
    downloadHref: `${repoRawBase}/src/components/ui/fluid-tabs.tsx`,
    downloadLabel: "Download fluid-tabs.tsx",
  },
  elasticDrag: {
    codePath: "src/components/ui/elastic-drag.tsx",
    codeHref: `${repoBlobBase}/src/components/ui/elastic-drag.tsx`,
    downloadHref: `${repoRawBase}/src/components/ui/elastic-drag.tsx`,
    downloadLabel: "Download elastic-drag.tsx",
  },
  noisyAnalogCard: {
    codePath: "src/components/ui/noisy-analog-card.tsx",
    codeHref: `${repoBlobBase}/src/components/ui/noisy-analog-card.tsx`,
    downloadHref: `${repoRawBase}/src/components/ui/noisy-analog-card.tsx`,
    downloadLabel: "Download noisy-analog-card.tsx",
  },
};

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-[var(--jitter-bg)] text-[var(--jitter-ink)]">
      <SiteIndex />
      <div className="lg:ml-[35vw]">
        <ComponentPlate
          id="magnet-button"
          index="001"
          title="Magnet Button"
          description="A pointer-aware command surface with subtle spring pull and a reactive highlight field."
          command="copy magnet-button.tsx"
          category="Component"
          status="FREE"
          statusClassName="bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]"
          {...sourceLinks.magnetButton}
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
          id="fluid-tabs"
          index="002"
          title="Fluid Tabs"
          description="A compact tab primitive with a liquid active indicator and keyboard-accessible roving selection."
          command="copy fluid-tabs.tsx"
          category="Template"
          status="PRO"
          statusClassName="bg-[var(--jitter-purple)]/12 text-[var(--jitter-purple)]"
          {...sourceLinks.fluidTabs}
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
          id="elastic-drag"
          index="003"
          title="Elastic Drag"
          description="A draggable motion object tuned for tactile resistance, visual stretch, and spring return."
          command="copy elastic-drag.tsx"
          category="Interaction"
          status="RE-MADE"
          statusClassName="bg-[var(--jitter-blue)]/12 text-[var(--jitter-blue)]"
          {...sourceLinks.elasticDrag}
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
          id="noisy-analog-card"
          index="004"
          title="Noisy Analog Card"
          description="A frosted analog card with generated grain, adjustable transparency, tint, highlight, and hover depth."
          command="copy noisy-analog-card.tsx"
          category="Material"
          status="NEW"
          statusClassName="bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]"
          {...sourceLinks.noisyAnalogCard}
        >
          <NoisyCardPlayground />
        </ComponentPlate>
      </div>
    </main>
  );
}
