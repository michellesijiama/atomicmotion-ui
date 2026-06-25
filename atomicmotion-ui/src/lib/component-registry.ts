export const REPO_OWNER = "michellesijiama";
export const REPO_NAME = "atomicmotion-ui";
export const REPO_BRANCH = "main";
export const REPO_PROJECT_ROOT = "atomicmotion-ui";

const REPO_BLOB_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}`;
const DEPENDENCY_HINT = "framer-motion, lucide-react, clsx, tailwind-merge";

export type ComponentMeta = {
  id: string;
  index: string;
  title: string;
  description: string;
  category: string;
  status: string;
  statusClassName: string;
  createdAt: string;
  codePath: string;
  codeHref: string;
  aiPrompt: string;
  /** Credit + link to the site/work that inspired this component. */
  inspiredBy?: { label: string; href: string };
};

type ComponentMetaInput = Omit<
  ComponentMeta,
  "codeHref" | "aiPrompt"
>;

function createComponentMeta(meta: ComponentMetaInput): ComponentMeta {
  const fileName = meta.codePath.split("/").at(-1) ?? meta.codePath;
  const repoPath = `${REPO_PROJECT_ROOT}/${meta.codePath}`;
  const codeHref = `${REPO_BLOB_BASE}/${repoPath}`;

  return {
    ...meta,
    codeHref,
    aiPrompt: [
      `Use AtomicMotion UI's ${meta.title} component.`,
      `Source: ${codeHref}`,
      `File: ${fileName}`,
      "",
      `Install required dependencies if missing: ${DEPENDENCY_HINT}.`,
      "Copy the component into my project and adapt styling only where necessary.",
    ].join("\n"),
  };
}

export const componentRegistry = {
  emojiSketch: createComponentMeta({
    id: "emoji-sketch",
    index: "001",
    title: "Emoji Sketch",
    description:
      "Pick an emoji and watch it drawn on, stroke by stroke, as a hand-sketched line animation — real OpenMoji vector paths self-drawing with a subtle pencil wobble.",
    category: "Tool",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-20",
    codePath: "src/components/emoji-sketch/emoji-sketch.tsx",
    inspiredBy: { label: "Getty × Gehry", href: "https://gehry.getty.edu" },
  }),
  expandedNavigation: createComponentMeta({
    id: "expanded-navigation",
    index: "002",
    title: "Soft Menu Reveal",
    description:
      "A frosted menu that unfolds from a stable nav row with a smooth bell-curve transition",
    category: "Navigation",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-20",
    codePath: "src/components/expanded-navigation/expanded-navigation.tsx",
    inspiredBy: { label: "Jitter", href: "https://madewithjitter.com" },
  }),
  filterDropdownReveal: createComponentMeta({
    id: "filter-dropdown-reveal",
    index: "003",
    title: "Filter Dropdown Reveal",
    description:
      "A project filter bar with a soft gray dropdown and clipped text reveal",
    category: "Navigation",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-22",
    codePath: "src/components/filter-dropdown-reveal/filter-dropdown-reveal.tsx",
    inspiredBy: { label: "MAD", href: "https://www.i-mad.com/projects?page=2" },
  }),
  scrollScrubbedTypography: createComponentMeta({
    id: "scroll-scrubbed-typography",
    index: "004",
    title: "Scroll-Scrubbed Typography",
    description:
      "A sticky editorial title that stretches tall, then compresses as scroll progress scrubs its vertical scale",
    category: "Typography",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-22",
    codePath:
      "src/components/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx",
    inspiredBy: { label: "Getty × Gehry", href: "https://gehry.getty.edu" },
  }),
  codexSidebarReveal: createComponentMeta({
    id: "codex-sidebar-reveal",
    index: "005",
    title: "Codex Sidebar Reveal",
    description:
      "A compact app shell where a top-left icon press expands the left sidebar and shifts the workspace",
    category: "Navigation",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-25",
    codePath: "src/components/codex-sidebar-reveal/codex-sidebar-reveal.tsx",
    inspiredBy: { label: "Codex", href: "https://openai.com/codex" },
  }),
  placeholderFour: createComponentMeta({
    id: "placeholder-four",
    index: "006",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    createdAt: "2026-06-16",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderFive: createComponentMeta({
    id: "placeholder-five",
    index: "007",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    createdAt: "2026-06-16",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderSix: createComponentMeta({
    id: "placeholder-six",
    index: "008",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    createdAt: "2026-06-16",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderSeven: createComponentMeta({
    id: "placeholder-seven",
    index: "009",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    createdAt: "2026-06-16",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
