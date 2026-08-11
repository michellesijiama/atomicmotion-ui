import type { ReactNode } from "react";

type ComponentDetailLayoutProps = {
  children: ReactNode;
};

export default function ComponentDetailLayout({ children }: ComponentDetailLayoutProps) {
  return (
    <main className="min-h-screen bg-[var(--jitter-bg)] text-[var(--jitter-ink)]">
      {children}
    </main>
  );
}
