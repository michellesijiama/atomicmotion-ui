export const REPO_OWNER = "michellesijiama";
export const REPO_NAME = "atomicmotion-ui";
export const REPO_BRANCH = "main";

const REPO_BLOB_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}`;

// Components whose home-gallery card plays a looping video (`/previews/<id>.mp4`)
// instead of the static poster — heavy 3D scenes we don't mount live in the grid.
const COMPONENTS_WITH_PREVIEW_VIDEO = new Set(["gradient-gummy-bear", "showreel-sphere"]);

/**
 * A file outside the component's own folder that the component loads at
 * runtime (a 3D model, a texture, …). Copying the folder alone is not enough
 * for these components, and the licence travels with the asset — so both the
 * generated README and the "Copy for AI" prompt have to say so.
 */
export type RequiredAsset = {
  /** Repo-relative path, e.g. "public/models/gummy-bear.glb". */
  path: string;
  /** Licence the asset ships under, e.g. "CC-BY 3.0". */
  license: string;
  /** Attribution line that must survive redistribution. */
  credit: string;
};

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
  /**
   * Files outside this component's folder that it loads at runtime. Present
   * only for components that are not fully self-contained — see RequiredAsset.
   */
  requiredAssets?: RequiredAsset[];
  /** Credit + link to the site/work that inspired this component. */
  inspiredBy?: { label: string; href: string };
};

type ComponentMetaInput = Omit<
  ComponentMeta,
  "codeHref" | "previewImage" | "previewVideo" | "aiPrompt"
>;

function createComponentMeta(meta: ComponentMetaInput): ComponentMeta {
  const fileName = meta.codePath.split("/").at(-1) ?? meta.codePath;
  const codeHref = `${REPO_BLOB_BASE}/${meta.codePath}`;
  const requiredAssets = meta.requiredAssets ?? [];

  // Only claim self-containment when it is actually true: a component that
  // fetches a model or texture at runtime needs those files copied too, and
  // their licence comes with them.
  const selfContainment =
    requiredAssets.length === 0
      ? ["This component is self-contained — the entire component is that one file."]
      : [
          "The component code is that one file, but it is NOT fully self-contained:",
          "it loads these files at runtime, so copy them across as well and keep",
          "their attribution:",
          ...requiredAssets.map(
            (asset) => `- ${asset.path} — ${asset.license}. ${asset.credit}`
          ),
        ];

  return {
    ...meta,
    codeHref,
    previewImage: `/previews/${meta.id}.png`,
    previewVideo: COMPONENTS_WITH_PREVIEW_VIDEO.has(meta.id)
      ? `/previews/${meta.id}.mp4`
      : undefined,
    aiPrompt: [
      `Use AtomicMotion UI's ${meta.title} component.`,
      `Source: ${codeHref}`,
      `File: ${fileName}`,
      "",
      ...selfContainment,
      "Install any dependencies imported by the component if they are missing.",
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
    codePath: "components/tool/emoji-sketch/emoji-sketch.tsx",
    inspiredBy: { label: "Getty × Gehry", href: "https://gehry.getty.edu" },
  }),
  softMenuReveal: createComponentMeta({
    id: "soft-menu-reveal",
    index: "002",
    title: "Soft Menu Reveal",
    description:
      "A frosted menu that unfolds from a stable nav row with a smooth bell-curve transition",
    category: "Navigation",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-06-20",
    codePath: "components/navigation/soft-menu-reveal/soft-menu-reveal.tsx",
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
    codePath: "components/navigation/filter-dropdown-reveal/filter-dropdown-reveal.tsx",
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
      "components/typography/scroll-scrubbed-typography/scroll-scrubbed-typography.tsx",
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
    codePath: "components/navigation/codex-sidebar-reveal/codex-sidebar-reveal.tsx",
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
    codePath: "components/ai/gemini-live/gemini-live.tsx",
    inspiredBy: { label: "Gemini", href: "https://gemini.google.com" },
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
    codePath: "components/typography/geometric-logo-reveal/geometric-logo-reveal.tsx",
    inspiredBy: { label: "Form&Fun", href: "https://www.formandfun.co" },
  }),
  gradientGummyBear: createComponentMeta({
    id: "gradient-gummy-bear",
    index: "009",
    title: "Gradient Gummy Bear",
    description:
      "A translucent 3D gummy bear (Three.js) with a soft pink gradient, light glowing through the jelly, and cursor parallax",
    category: "3D",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-07-08",
    codePath: "components/3d/gradient-gummy-bear/gradient-gummy-bear.tsx",
    // The component fetches this GLB at runtime, so the folder alone is not
    // enough — and the model is CC-BY, so the credit has to travel with it.
    requiredAssets: [
      {
        path: "public/models/gummy-bear.glb",
        license: "CC-BY 3.0",
        credit:
          '"Gummy Bear" by Poly by Google, via Poly Pizza (https://poly.pizza/m/5zl16PPAItW) — attribution required.',
      },
    ],
    // Heavy Three.js scene — show the looping video poster in the gallery
    // instead of mounting the live WebGL preview (avoids the load regression).
    previewStatic: true,
  }),
  scrollPhaseCursor: createComponentMeta({
    id: "scroll-phase-cursor",
    index: "010",
    title: "Scroll Phase Cursor",
    description:
      "A circular pointer whose ring fills with page progress while a sculpted 3D form rotates with the scroll",
    category: "Cursor",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-08-06",
    codePath: "components/cursor/scroll-phase-cursor/scroll-phase-cursor.tsx",
    inspiredBy: { label: "Inversa", href: "https://inversa.com" },
  }),
  voiceBloom: createComponentMeta({
    id: "voice-bloom",
    index: "011",
    title: "Voice Bloom",
    description:
      "A conversational microphone that blooms into an AI response panel, reveals replies word by word, and offers copy or regenerate actions",
    category: "AI",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-08-11",
    codePath: "components/ai/voice-bloom/voice-bloom.tsx",
    inspiredBy: { label: "Atomic Motion", href: "https://www.figma.com/design/RREH9uRHTK7iWVvcWmXm0l/Atomic-Motion" },
  }),
  showreelSphere: createComponentMeta({
    id: "showreel-sphere",
    index: "012",
    title: "Showreel Sphere",
    description:
      "A studio landing page whose whole hero is one draggable 3D sphere, wrapped in a Renaissance painting that the next one sweeps around to replace every four seconds",
    category: "3D",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-08-17",
    codePath: "components/3d/showreel-sphere/showreel-sphere.tsx",
    inspiredBy: { label: "Little Troop", href: "https://littletroop.com" },
    // Composited into the sphere texture at runtime, so the folder alone is not
    // enough. CC0 means no attribution is legally required, but the provenance
    // travels with the files anyway.
    requiredAssets: [
      {
        path: "public/paintings/ (4 .jpg files)",
        license: "CC0 1.0 Universal (public domain dedication)",
        credit:
          'Renaissance panels from The Metropolitan Museum of Art Open Access (metmuseum.org/art/collection), downscaled reproductions of public-domain works: Fra Carnevale, "The Birth of the Virgin" (1467, object 435848); Pieter Bruegel the Elder, "The Harvesters" (1565, object 435809); Joachim Patinir, "The Penitence of Saint Jerome" (ca. 1515, object 437261); Hieronymus Bosch, "The Adoration of the Magi" (ca. 1475, object 435724).',
      },
    ],
    // Heavy Three.js scene — the gallery card plays the captured loop rather
    // than mounting a live WebGL context in the grid. The clip is one exact
    // 360° revolution, so its last frame is pixel-identical to its first and
    // the loop has no visible seam.
    previewStatic: true,
  }),
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
