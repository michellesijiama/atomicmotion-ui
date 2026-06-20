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
    codePath: "src/components/emoji-sketch/emoji-sketch.tsx",
    inspiredBy: { label: "Getty × Gehry", href: "https://gehry.getty.edu" },
  }),
  expandedNavigation: createComponentMeta({
    id: "expanded-navigation",
    index: "002",
    title: "Expanded Navigation",
    description:
      "A frosted mega-menu that expands over the page — the nav row wraps inside the panel and the glass blurs the content behind it. Click to open, outside-click or Escape to close.",
    category: "Navigation",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    codePath: "src/components/expanded-navigation/expanded-navigation.tsx",
    inspiredBy: { label: "Jitter", href: "https://madewithjitter.com" },
  }),
  placeholderTwo: createComponentMeta({
    id: "placeholder-two",
    index: "003",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderThree: createComponentMeta({
    id: "placeholder-three",
    index: "004",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderFour: createComponentMeta({
    id: "placeholder-four",
    index: "005",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderFive: createComponentMeta({
    id: "placeholder-five",
    index: "006",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderSix: createComponentMeta({
    id: "placeholder-six",
    index: "007",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
  placeholderSeven: createComponentMeta({
    id: "placeholder-seven",
    index: "008",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
  }),
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
