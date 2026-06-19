import { ComponentCard } from "@/components/website/component-card";
import { SiteHeader } from "@/components/website/site-header";
import { componentList } from "@/lib/component-registry";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="grid min-h-[calc(100vh-4rem)] content-between gap-16">
        <div>
          <header className="grid gap-4 border-b border-black/10 pb-8">
            <SiteHeader />
            <p className="max-w-xl text-body text-[var(--jitter-gray-600)]">
              Micro-interactions designed for your agent to grab and share
            </p>
          </header>

          <section className="py-10" aria-label="UI components">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {componentList.map((component) => (
                <ComponentCard key={component.id} component={component} />
              ))}
            </div>
          </section>
        </div>

        <footer className="grid justify-start border-t border-black/10 pt-5 text-sm text-[var(--jitter-gray-800)] sm:justify-end">
          <pre className="overflow-x-auto rounded-xl bg-white px-3 py-2 font-mono text-caption text-[var(--jitter-gray-800)] ring-1 ring-black/5">
            npm install framer-motion clsx tailwind-merge
          </pre>
        </footer>
      </div>
    </main>
  );
}
