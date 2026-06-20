import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

const githubHref = "https://github.com/michellesijiama/atomicmotion-ui";

export function AnimatedGithubLink({
  className,
  href = githubHref,
  label = "Github",
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  return (
    <a href={href} className={cn(className, "group/github")}>
      {label}
      <ArrowUpRight
        className="size-3.5 transition-transform duration-300 ease-out group-hover/github:-translate-y-0.5 group-hover/github:translate-x-0.5 group-hover/github:rotate-6"
        aria-hidden="true"
      />
    </a>
  );
}
