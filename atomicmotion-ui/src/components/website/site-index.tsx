import { ArrowUpRight, GitBranch, Package } from "lucide-react";

const components = [
  { name: "Magnet Button", year: "001", href: "#magnet-button" },
  { name: "Fluid Tabs", year: "002", href: "#fluid-tabs" },
  { name: "Elastic Drag", year: "003", href: "#elastic-drag" },
];

export function SiteIndex() {
  const now = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date("2026-06-14T00:00:00-05:00"));

  return (
    <aside className="border-white/15 bg-black px-6 py-8 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[35vw] lg:border-r">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <a href="#top" className="w-fit text-2xl font-medium tracking-normal">
          AtomicMotion UI
        </a>

        <div className="mt-7 border-t border-white/15 pt-5 text-sm leading-5 text-zinc-200">
          <p>Premium micro-interactions for copy-paste React interfaces.</p>
          <p className="mt-3 text-zinc-400">Next.js / TypeScript / Framer Motion</p>
        </div>

        <nav className="mt-8 border-t border-white/15 pt-5" aria-label="Component index">
          <div className="space-y-1">
            {components.map((component) => (
              <a
                key={component.name}
                href={component.href}
                className="group grid grid-cols-[1fr_auto] gap-6 py-2 text-sm text-zinc-300 transition-colors hover:text-white"
              >
                <span>{component.name}</span>
                <span className="font-mono text-xs text-zinc-500 group-hover:text-zinc-200">
                  {component.year}
                </span>
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-9 space-y-3 border-t border-white/15 pt-5">
          <a
            href="https://github.com/michellesijiama/atomicmotion-ui"
            className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <GitBranch className="h-4 w-4" />
            Private GitHub repo
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
            <Package className="h-3.5 w-3.5" />
            npx shadcn-style copy-paste architecture
          </div>
          <pre className="overflow-x-auto rounded border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-zinc-300">
            npm install framer-motion clsx tailwind-merge
          </pre>
        </div>

        <div className="mt-auto pt-16 font-mono text-xs leading-6 text-zinc-400">
          <p>{now}</p>
          <p>San Jose, California</p>
        </div>
      </div>
    </aside>
  );
}
