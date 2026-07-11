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
  previewImage: string;
  /**
   * Looping video used for the home gallery card instead of a live preview,
   * for heavy WebGL scenes we don't want mounting live in the gallery.
   */
  previewVideo?: string;
  /**
   * Render the static poster on the home card instead of a live or video
   * preview — used for heavy 3D components that should not animate in the
   * gallery.
   */
  previewStatic?: boolean;
  aiPrompt: string;
  /** Credit + link to the site/work that inspired this component. */
  inspiredBy?: { label: string; href: string };
};

type ComponentMetaInput = Omit<
  ComponentMeta,
  "codeHref" | "previewImage" | "previewVideo" | "aiPrompt"
>;

function createComponentMeta(meta: ComponentMetaInput): ComponentMeta {
  const fileName = meta.codePath.split("/").at(-1) ?? meta.codePath;
  const repoPath = `${REPO_PROJECT_ROOT}/${meta.codePath}`;
  const codeHref = `${REPO_BLOB_BASE}/${repoPath}`;

  return {
    ...meta,
    codeHref,
    previewImage: `/previews/${meta.id}.png`,
    previewVideo: meta.id === "gradient-aura" ? `/previews/${meta.id}.mp4` : undefined,
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
  geminiLive: createComponentMeta({
    id: "gemini-live",
    index: "006",
    title: "Gemini Live",
    description:
      "A floating live-assistant panel with source chips, blue edge glow, listening pulses, and compact pause and keyboard controls",
    category: "AI",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-28",
    codePath: "src/components/gemini-live/gemini-live.tsx",
    inspiredBy: { label: "Gemini", href: "https://gemini.google.com" },
  }),
  scrollScrubbedVideo: createComponentMeta({
    id: "scroll-scrubbed-video",
    index: "007",
    title: "Scroll-Scrubbed Video",
    description:
      "A full-bleed editorial video stage where wheel direction scrubs the film forward or backward through a sticky timeline",
    category: "Video",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-07-06",
    codePath: "src/components/scroll-scrubbed-video/scroll-scrubbed-video.tsx",
    inspiredBy: { label: "Getty × Gehry", href: "https://gehry.getty.edu" },
  }),
  geometricLogoReveal: createComponentMeta({
    id: "geometric-logo-reveal",
    index: "008",
    title: "Geometric Logo Reveal",
    description:
      "A geometric wordmark assembles from a gray ghost — letters fill to ink in a staggered left-to-right cascade, settling into the solid logo",
    category: "Typography",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-07-08",
    codePath: "src/components/geometric-logo-reveal/geometric-logo-reveal.tsx",
    inspiredBy: { label: "Form&Fun", href: "https://www.formandfun.co" },
  }),
  gradientAura: createComponentMeta({
    id: "gradient-aura",
    index: "009",
    title: "Gradient Gummy Bear",
    description:
      "A translucent 3D gummy bear (Three.js) with a soft pink gradient, light glowing through the jelly, and cursor parallax",
    category: "3D",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-07-08",
    codePath: "src/components/gradient-aura/gradient-aura.tsx",
  }),
  liquidVinyl: createComponentMeta({
    id: "liquid-vinyl",
    index: "010",
    title: "Liquid Vinyl",
    description:
      "A transparent Three.js vinyl filled with image-colored liquid, fine pressed grooves, fluid caustics, and cursor-responsive refraction",
    category: "3D",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-07-10",
    codePath: "src/components/liquid-vinyl/liquid-vinyl.tsx",
    previewStatic: true,
  }),
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
