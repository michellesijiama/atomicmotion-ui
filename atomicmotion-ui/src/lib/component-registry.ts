export const REPO_OWNER = "michellesijiama";
export const REPO_NAME = "atomicmotion-ui";
export const REPO_BRANCH = "codex/aircenter-design-system";
export const REPO_PROJECT_ROOT = "atomicmotion-ui";

const REPO_BLOB_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}`;
const REPO_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/refs/heads/${REPO_BRANCH}`;
const DEPENDENCY_HINT = "framer-motion, lucide-react, clsx, tailwind-merge";

export type ComponentMeta = {
  id: string;
  index: string;
  title: string;
  description: string;
  command: string;
  category: string;
  status: string;
  statusClassName: string;
  codePath: string;
  codeHref: string;
  downloadHref: string;
  downloadLabel: string;
  aiPrompt: string;
};

type ComponentMetaInput = Omit<
  ComponentMeta,
  "codeHref" | "downloadHref" | "downloadLabel" | "aiPrompt"
>;

function createComponentMeta(meta: ComponentMetaInput): ComponentMeta {
  const fileName = meta.codePath.split("/").at(-1) ?? meta.codePath;
  const repoPath = `${REPO_PROJECT_ROOT}/${meta.codePath}`;
  const codeHref = `${REPO_BLOB_BASE}/${repoPath}`;
  const downloadHref = `${REPO_RAW_BASE}/${repoPath}`;

  return {
    ...meta,
    codeHref,
    downloadHref,
    downloadLabel: `Open raw ${fileName} on GitHub`,
    aiPrompt: [
      `Use AtomicMotion UI's ${meta.title} component.`,
      `Source: ${codeHref}`,
      `Raw TSX: ${downloadHref}`,
      "",
      `Install required dependencies if missing: ${DEPENDENCY_HINT}.`,
      "Copy the component into my project and adapt styling only where necessary.",
    ].join("\n"),
  };
}

export const componentRegistry = {
  magnetButton: createComponentMeta({
    id: "magnet-button",
    index: "001",
    title: "Magnet Button",
    description:
      "A pointer-aware command surface with subtle spring pull and a reactive highlight field.",
    command: "copy magnet-button.tsx",
    category: "Component",
    status: "FREE",
    statusClassName: "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
    codePath: "src/components/ui/magnet-button.tsx",
  }),
  fluidTabs: createComponentMeta({
    id: "fluid-tabs",
    index: "002",
    title: "Fluid Tabs",
    description:
      "A compact tab primitive with a liquid active indicator and keyboard-accessible roving selection.",
    command: "copy fluid-tabs.tsx",
    category: "Template",
    status: "PRO",
    statusClassName: "bg-[var(--jitter-purple)]/12 text-[var(--jitter-purple)]",
    codePath: "src/components/ui/fluid-tabs.tsx",
  }),
  elasticDrag: createComponentMeta({
    id: "elastic-drag",
    index: "003",
    title: "Elastic Drag",
    description:
      "A draggable motion object tuned for tactile resistance, visual stretch, and spring return.",
    command: "copy elastic-drag.tsx",
    category: "Interaction",
    status: "RE-MADE",
    statusClassName: "bg-[var(--jitter-blue)]/12 text-[var(--jitter-blue)]",
    codePath: "src/components/ui/elastic-drag.tsx",
  }),
  noisyAnalogCard: createComponentMeta({
    id: "noisy-analog-card",
    index: "004",
    title: "Noisy Analog Card",
    description:
      "A frosted analog card with generated grain, adjustable transparency, tint, highlight, and hover depth.",
    command: "copy noisy-analog-card.tsx",
    category: "Material",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    codePath: "src/components/ui/noisy-analog-card.tsx",
  }),
} satisfies Record<string, ComponentMeta>;
