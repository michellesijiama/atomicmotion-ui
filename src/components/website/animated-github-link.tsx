import { ArrowUpRight } from "lucide-react";

import { navIconClass } from "@/components/website/styles";

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
    <a href={href} className={`${className ?? ""} group/github`.trim()}>
      {label}
      <ArrowUpRight
        className={`${navIconClass} transition-transform duration-300 ease-out group-hover/github:-translate-y-0.5 group-hover/github:translate-x-0.5 group-hover/github:rotate-6`}
        aria-hidden="true"
      />
    </a>
  );
}
