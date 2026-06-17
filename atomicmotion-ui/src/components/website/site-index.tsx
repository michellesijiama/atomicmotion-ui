import { ArrowUpRight, GitBranch, Package } from "lucide-react";

const components = [
  {
    name: "Magnet Button",
    year: "001",
    href: "#magnet-button",
    status: "FREE",
    statusClassName: "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
  },
  {
    name: "Fluid Tabs",
    year: "002",
    href: "#fluid-tabs",
    status: "PRO",
    statusClassName: "bg-[var(--jitter-purple)]/12 text-[var(--jitter-purple)]",
  },
  {
    name: "Elastic Drag",
    year: "003",
    href: "#elastic-drag",
    status: "RE-MADE",
    statusClassName: "bg-[var(--jitter-blue)]/12 text-[var(--jitter-blue)]",
  },
  {
    name: "Noisy Analog Card",
    year: "004",
    href: "#noisy-analog-card",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
  },
  {
    name: "Window Leaf Shadow",
    year: "005",
    href: "#window-leaf-shadow",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
  },
];

export function SiteIndex() {
  const now = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date("2026-06-14T00:00:00-05:00"));

  return (
    <aside className="border-black/10 bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] lg:fixed lg:inset-y-0 lg:left-0 lg:w-[35vw] lg:border-r">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <a href="#top" className="w-fit text-2xl font-semibold tracking-normal">
          AtomicMotion UI
        </a>

        <div className="mt-7 border-t border-black/10 pt-5 text-sm leading-5 text-[var(--jitter-gray-800)]">
          <p>Premium micro-interactions for copy-paste React interfaces.</p>
          <p className="mt-3 text-[var(--jitter-gray-600)]">
            Instant component inspiration — Made and Re-made for interfaces.
          </p>
        </div>

        <nav className="mt-8 border-t border-black/10 pt-5" aria-label="Component index">
          <div className="mb-3 grid grid-cols-[1fr_auto] text-[10px] font-semibold uppercase text-[var(--jitter-gray-600)]">
            <span>Entire Archive</span>
            <span>NOW</span>
          </div>
          <div className="space-y-1.5">
            {components.map((component) => (
              <a
                key={component.name}
                href={component.href}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-[var(--jitter-gray-800)] ring-1 ring-black/5 transition-colors hover:bg-white hover:text-[var(--jitter-ink)]"
              >
                <span className="font-mono text-xs text-[var(--jitter-gray-600)]">
                  {component.year}
                </span>
                <span>{component.name}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${component.statusClassName}`}
                >
                  {component.status}
                </span>
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-9 space-y-3 border-t border-black/10 pt-5">
          <a
            href="https://github.com/michellesijiama/atomicmotion-ui"
            className="flex items-center gap-2 text-sm text-[var(--jitter-gray-800)] transition-colors hover:text-[var(--jitter-ink)]"
          >
            <GitBranch className="h-4 w-4" />
            Public GitHub repo
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--jitter-gray-600)]">
            <Package className="h-3.5 w-3.5" />
            npx shadcn-style copy-paste architecture
          </div>
          <pre className="overflow-x-auto rounded-xl bg-white p-3 font-mono text-xs text-[var(--jitter-gray-800)] ring-1 ring-black/5">
            npm install framer-motion clsx tailwind-merge
          </pre>
        </div>

        <div className="mt-auto pt-16 font-mono text-xs leading-6 text-[var(--jitter-gray-600)]">
          <p>{now}</p>
          <p>San Jose, California</p>
        </div>
      </div>
    </aside>
  );
}
