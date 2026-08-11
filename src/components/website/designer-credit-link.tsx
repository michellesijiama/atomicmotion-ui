import { cn } from "@/lib/utils";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.28 8.04h4.43V23H.28V8.04Zm7.36 0h4.25v2.04h.06c.59-1.12 2.04-2.3 4.2-2.3 4.49 0 5.32 2.96 5.32 6.8V23h-4.43v-7.47c0-1.78-.03-4.07-2.48-4.07-2.48 0-2.86 1.94-2.86 3.94V23H7.64V8.04Z" />
    </svg>
  );
}

export function DesignerCreditLink({
  className,
  href = "https://www.linkedin.com/in/michellesijiama/",
  label = "Designed by Sijia Ma",
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Sijia Ma on LinkedIn"
      className={cn(
        "group/linkedin inline-flex items-baseline gap-2 transition hover:text-[var(--jitter-ink)]",
        className,
      )}
    >
      <span>{label}</span>
      <LinkedInIcon className="relative top-[2px] size-4 transition-transform duration-300 ease-out group-hover/linkedin:-translate-y-0.5 group-hover/linkedin:rotate-3 group-hover/linkedin:scale-110" />
    </a>
  );
}
