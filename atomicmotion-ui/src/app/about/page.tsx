import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — AtomicMotion UI",
  description: "About AtomicMotion UI — copy-paste micro-interactions for React.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] px-6 py-8 text-[var(--jitter-ink)] sm:px-8 lg:px-12">
      <div className="grid min-h-[calc(100vh-4rem)] content-start gap-8">
        <Link
          href="/"
          className="w-fit font-mono text-caption uppercase text-[var(--jitter-gray-600)] transition-colors hover:text-[var(--jitter-ink)]"
        >
          Back
        </Link>

        <header className="grid gap-4 border-b border-black/10 pb-8">
          <h1 className="text-display">About</h1>
          <p className="max-w-xl text-body text-[var(--jitter-gray-600)]">
            AtomicMotion UI is an open-source collection of copy-paste micro-interactions
            for React — each one a self-contained component you can drop into your project.
          </p>
        </header>
      </div>
    </main>
  );
}
