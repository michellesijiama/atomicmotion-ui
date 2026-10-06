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
  const readmeHref = `${REPO_BLOB_BASE}/${meta.codePath.slice(0, meta.codePath.lastIndexOf("/"))}/README.md`;

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
      `Setup, tested dependencies, props and asset instructions: ${readmeHref}`,
      "Requires React 19, TypeScript and Tailwind CSS 4 in the host project.",
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
    requiredAssets: [
      {
        path: "public/emoji/ (40 .svg files)",
        license: "CC BY-SA 4.0",
        credit: "OpenMoji project and contributors, v15.0.0 black SVGs. Serve at /emoji/; preserve the share-alike notice.",
      },
      {
        path: "licenses/OpenMoji-CC-BY-SA-4.0.txt",
        license: "CC BY-SA 4.0",
        credit: "Copy the attribution and share-alike notice with the SVG assets.",
      },
    ],
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
      {
        path: "public/gummy-bear-poster.png",
        license: "MIT (gallery capture)",
        credit: "Poster captured by Sijia Ma; retain the model attribution above. Used when WebGL or model loading is unavailable.",
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
  coffeeGauge: createComponentMeta({
    id: "coffee-gauge",
    index: "013",
    title: "Coffee Gauge",
    description:
      "Three hand-drawn coffee cups on a periwinkle card, each a liquid gauge that pours and drains on its own rhythm — empty they read as outlines, full they read as the solid silhouette; open the card and you can log what you actually drank",
    category: "Data Visualization",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-08-23",
    codePath: "components/data-visualization/coffee-gauge/coffee-gauge.tsx",
  }),
  halftoneBloom: createComponentMeta({
    id: "halftone-bloom",
    index: "014",
    title: "Halftone Bloom",
    description:
      "A progress indicator drawn as a stippled moon — a lunar photograph resampled into coloured dots that light left to right like a terminator crossing the disc, from new moon at nothing to full at a hundred; collapsed it sits as a glance-sized moon at the same phase",
    category: "Data Visualization",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-09-03",
    codePath: "components/data-visualization/halftone-bloom/halftone-bloom.tsx",
  }),
  blossomLight: createComponentMeta({
    id: "blossom-light",
    index: "015",
    title: "Blossom Light",
    description:
      "A square of wall whose light is the controls in the middle of it: leaf shadow on white plaster, dimmed and lifted by a brightness pill that fills line by line, turned from cool to amber by a tone slider, and sent to follow the weather outside by an Adaptive toggle, while the leaf shadow on the wall stirs in a wind — all flat frosted glass, scaling itself to fit wherever it is put",
    category: "Control",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-09-09",
    codePath: "components/control/blossom-light/blossom-light.tsx",
    requiredAssets: [
      {
        path: "public/textures/wall-shadow.jpg",
        license: "Supplied by the component author; confirm terms before redistributing",
        credit: "Leaf-shadow photograph supplied by the AtomicMotion author.",
      },
    ],
  }),
  gradientEventCard: createComponentMeta({
    id: "gradient-event-card",
    index: "016",
    title: "Gradient Event Card",
    description:
      "Eight event cards on a ring inside a phone lying on its side — swipe and they follow your finger and snap one page at a time, the neighbours turning away like cover flow. Each card is a heat-map field with circles, ellipses, arcs and coils painted onto it as heat, every shape its own halo-to-core gradient, in palettes borrowed from painters — Monet, Rothko, Hilma af Klint, O'Keeffe kept cohesive; Matisse and Delaunay loud — rippling, breathing, orbiting and swaying under printed grain",
    category: "Gradient",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-09-18",
    codePath: "components/gradient/gradient-event-card/gradient-event-card.tsx",
  }),
  stampTracker: createComponentMeta({
    id: "stamp-tracker",
    index: "017",
    title: "Stamp Tracker",
    description:
      "Four habits as a deck of tall blocks of risograph colour on a bare black phone screen — sky, cocoa, pink and mint, each with its own pattern ink — fanned like a loose stack. Swipe through water, coffee, move and read with a silky, interruptible gesture that follows a finger or a two-finger trackpad swipe, flip between Day, Week and Month, and tap a day to press a rubber stamp onto it. The middle of each card holds a loose hand-inked line drawing in the style of a Japanese tabletop illustration, with a tiny person getting up to something among the objects",
    category: "Data Visualization",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-09-30",
    codePath: "components/data-visualization/stamp-tracker/stamp-tracker.tsx",
  }),
  doodleCalendar: createComponentMeta({
    id: "doodle-calendar",
    index: "018",
    title: "Doodle Calendar",
    description:
      "A monochrome daily diary about life in Japan: coffee, bento, exercise, commuting, rainy walks and home rituals. Seven generated illustrations use thin textured black pencil strokes with fully transparent interiors. Caveat handwriting and a borderless transparent note area and a pencil action below the card make it feel like a sketchbook. Top Home and Filter buttons return to the full month and filter saved notes by everyday topics, keeping dates in place and fading non-matching entries. Each card shows the full weekday above the date number. A fixed, softly connected control below the cards places the pencil between previous and next arrows. Rounded date cards sit side by side with visible neighboring edges; swiping moves the strip and snaps to the next date. Cards gently shrink to 95% as they leave the centre and grow back to full size as they arrive, following a smooth Bézier curve; reduced motion keeps their size fixed. Empty pages show an outlined open notebook with a pencil gently writing; reduced motion keeps it still. Thursday is today: its page starts blank under a blue circle, and the drawing sketched for it is blue; other dates keep black illustrations, including when opened; Friday onward stays empty. Tapping a date grows its circle into the card and closing shrinks it back; swipes keep their speed and the drawings drift slightly behind the paper. The pencil opens a writing state: press Sketch it, the notebook keeps writing while a softly blurred, slow blue, violet, muted rose and warm yellow gradient runs along the inside of the card’s edge. The title and note remain visible while processing; the notebook fades into the new pencil strokes as color softly bleeds along them and fades back to blue for today or black for past dates. The card stays still throughout the reveal and errors appear without shaking. The looping preview types a rainy-day note, presses the black Sketch it button, and reveals an umbrella. Interaction stops the demonstration; its sample note never replaces saved entries. The demo previews a matching prepared sketch; an optional image-service callback supports real generation. Notes and illustrated calendar thumbnails stay saved on this device.",
    category: "Data Visualization",
    status: "NEW",
    statusClassName: "bg-[var(--jitter-orange)]/12 text-[var(--jitter-orange)]",
    createdAt: "2026-09-29",
    codePath: "components/data-visualization/doodle-calendar/doodle-calendar.tsx",
    requiredAssets: [
      { path: "public/illustrations/doodle-calendar-diary/coffee.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/coffee-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/bento.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/bento-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/exercise.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/exercise-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/train.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/train-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/rain.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/rain-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/home.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/home-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/shrine.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
      { path: "public/illustrations/doodle-calendar-diary/shrine-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion UI." },
    ],
  }),
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
