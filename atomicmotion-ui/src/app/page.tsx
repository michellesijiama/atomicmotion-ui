import { ArrowUpRight } from "lucide-react";

import { ComponentCard } from "@/components/website/component-card";
import { componentList } from "@/lib/component-registry";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl content-between gap-16">
        <div>
          <header className="grid gap-4 border-b border-black/10 pb-8">
            <div className="flex items-center justify-between gap-6">
              <h1 className="text-2xl font-semibold tracking-normal">AtomicMotion UI</h1>
              <a
                href="https://github.com/michellesijiama/atomicmotion-ui"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--jitter-gray-800)] transition-colors hover:text-[var(--jitter-ink)]"
              >
                GitHub
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--jitter-gray-600)]">
              Copy-paste micro-interactions for React.
            </p>
          </header>

          <section className="py-10" aria-label="UI components">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {componentList.map((component) => (
                <ComponentCard key={component.id} component={component} />
              ))}
            </div>
          </section>
        </div>

        <footer className="grid justify-start border-t border-black/10 pt-5 text-sm text-[var(--jitter-gray-800)] sm:justify-end">
          <pre className="overflow-x-auto rounded-xl bg-white px-3 py-2 font-mono text-xs text-[var(--jitter-gray-800)] ring-1 ring-black/5">
            npm install framer-motion clsx tailwind-merge
          </pre>
        </footer>
      </div>
    </main>
  );
}
