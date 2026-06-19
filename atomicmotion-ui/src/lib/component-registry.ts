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
  sunlitBookPage: createComponentMeta({
    id: "sunlit-book-page",
    index: "001",
    title: "Natural Light Shadow",
    description:
      "Centered reading text on the site background with soft natural leaf shadows drifting behind the content.",
    category: "Scene",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    codePath: "src/components/sunlit-book-page/sunlit-book-page.tsx",
  }),
  placeholderOne: createComponentMeta({
    id: "placeholder-one",
    index: "002",
    title: "Placeholder",
    description: "Coming soon.",
    category: "UI",
    status: "SOON",
    statusClassName: "bg-black/5 text-[var(--jitter-gray-600)]",
    codePath: "src/components/placeholder/placeholder.tsx",
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
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
