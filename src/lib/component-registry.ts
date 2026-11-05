export const REPO_OWNER = "michellesijiama";
export const REPO_NAME = process.env.NEXT_PUBLIC_FREE_REPO_NAME ?? "atomicmotion-free";
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

/**
 * The page colour behind a component on its detail page. White is the default.
 * Set `stageBackground` on an entry to demo a component on another colour; to
 * add a new colour, add it here and to STAGE_BACKGROUNDS in component-stage.tsx.
 */
export type StageBackground = "white" | "gray";

export type ComponentMeta = {
  id: string;
  index: string;
  title: string;
  description: string;
  category: string;
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
  /** The detail page colour behind this component. White when left out. */
  stageBackground?: StageBackground;
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
      ? ["This component is self-contained, the entire component is that one file."]
      : [
          "The component code is that one file, but it is NOT fully self-contained:",
          "it loads these files at runtime, so copy them across as well and keep",
          "their attribution:",
          ...requiredAssets.map(
            (asset) => `- ${asset.path} (${asset.license}). ${asset.credit}`
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
      `Use AtomicMotion's ${meta.title} component.`,
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
  stickerPeel: createComponentMeta({
    id: "sticker-peel",
    index: "023",
    title: "Sticker Peel",
    description:
      "One notepad above a tray of watercolour and oil-painted stickers that grow and show their name as you hover, with collections to switch between, then peel one off, carry it across and press it down",
    category: "Play",
    createdAt: "2026-11-04",
    codePath: "components/play/sticker-peel/sticker-peel.tsx",
    stageBackground: "gray",
  }),
  beadClub: createComponentMeta({
    id: "bead-club",
    index: "022",
    title: "Bead Club",
    description:
      "Nine cake and tart designs made of fused beads, shown in a one-column menu inside an iPhone that snaps each cake to the center with a gentle zoom, then tap one to enlarge it, swap its text for ingredient notes and tilt it with your pointer",
    category: "Play",
    createdAt: "2026-11-02",
    codePath: "components/play/bead-club/bead-club.tsx",
    previewStatic: true,
    requiredAssets: [
      {
        path: "public/components/bead-club/iphone-16-pro-white.png",
        license: "Apple Design Resources terms",
        credit:
          "Apple Inc. iPhone 16 Pro White Titanium product bezel, from Apple Design Resources, supplied via jamesjingyi/mockup-device-frames. https://developer.apple.com/design/resources/",
      },
      {
        path: "public/components/bead-club/iphone-screen-mask.svg",
        license: "Apple Design Resources terms",
        credit: "Screen-opening mask derived from the product bezel alpha, for accurate UI placement.",
      },
      {
        path: "public/components/bead-club/TERMS.txt",
        license: "Apple Design Resources terms",
        credit: "Retain the device-image terms and supplied cake-art provenance; these visual references are separate from the MIT code license.",
      },
    ],
  }),
  uiWalkthrough: createComponentMeta({
    id: "ui-walkthrough",
    index: "021",
    title: "UI Walkthrough",
    description:
      "A dark product walkthrough for portfolio case studies, an iPhone beside short captions that pushes in, taps, slides a before and after and labels a part, with one steps list to swap in your own screen",
    category: "Template",
    createdAt: "2026-10-17",
    codePath: "components/template/ui-walkthrough/ui-walkthrough.tsx",
    inspiredBy: { label: "Atomic Motion", href: "https://www.figma.com/design/RREH9uRHTK7iWVvcWmXm0l/Atomic-Motion" },
  }),
  jardinOpening: createComponentMeta({
    id: "jardin-opening",
    index: "020",
    title: "Jardin Opening",
    description:
      "A hand-illustrated New York garden on a 13-inch iPad Pro where birds fly, flowers sway and layered scenery drifts with your pointer, then a City in Bloom logo is written one ink stroke at a time before an entry button appears",
    category: "Immersive",
    createdAt: "2026-10-26",
    codePath: "components/immersive/jardin-opening/jardin-opening.tsx",
    requiredAssets: [
      { path: "public/components/jardin-living/background-nyc-sunny.png", license: "MIT", credit: "AI-edited sunny New York garden illustration with a repainted blue sky and warm daylight for AtomicMotion." },
      { path: "public/components/jardin-living/midground.png", license: "MIT", credit: "AI-generated transparent garden gate for AtomicMotion." },
      { path: "public/components/jardin-living/foreground.png", license: "MIT", credit: "AI-generated transparent botanical foreground for AtomicMotion." },
      { path: "public/components/jardin-living/flower.png", license: "MIT", credit: "AI-generated transparent flower animated at its stem for AtomicMotion." },
      { path: "public/components/jardin-living/bird-sprite.png", license: "MIT", credit: "AI-generated four-frame bird flight cycle for AtomicMotion." },
      { path: "public/components/jardin-living/city-in-bloom-logo.png", license: "MIT", credit: "AI-generated hand-lettered City in Bloom title logo with botanical flourishes and a Manhattan skyline for AtomicMotion." },
      { path: "public/components/jardin-living/garden-visitors.png", license: "MIT", credit: "AI-generated transparent groups of garden visitors for AtomicMotion." },
    ],
  }),
  emojiSketch: createComponentMeta({
    id: "emoji-sketch",
    index: "001",
    title: "Emoji Sketch",
    description:
      "A tiled grid of pastel OpenMoji stickers that draw themselves stroke by stroke in a wave, and redraw when you hover one",
    category: "Play",
    createdAt: "2026-06-20",
    codePath: "components/play/emoji-sketch/emoji-sketch.tsx",
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
    createdAt: "2026-06-28",
    codePath: "components/ai/gemini-live/gemini-live.tsx",
    inspiredBy: { label: "Gemini", href: "https://gemini.google.com" },
  }),
  geometricLogoReveal: createComponentMeta({
    id: "geometric-logo-reveal",
    index: "008",
    title: "Geometric Logo Reveal",
    description:
      "A geometric wordmark that assembles from a gray ghost, its letters filling to ink in a staggered left-to-right cascade that settles into the solid logo",
    category: "Typography",
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
    createdAt: "2026-07-08",
    codePath: "components/3d/gradient-gummy-bear/gradient-gummy-bear.tsx",
    // The component fetches this GLB at runtime, so the folder alone is not
    // enough — and the model is CC-BY, so the credit has to travel with it.
    requiredAssets: [
      {
        path: "public/models/gummy-bear.glb",
        license: "CC-BY 3.0",
        credit:
          '"Gummy Bear" by Poly by Google, via Poly Pizza (https://poly.pizza/m/5zl16PPAItW), attribution required.',
      },
      {
        path: "public/gummy-bear-poster.png",
        license: "MIT (gallery capture)",
        credit: "Poster captured by Sijia Ma; retain the model attribution above. Used as the static gallery preview.",
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
      "A ring cursor that follows your pointer and fills with scroll progress as you scroll through a deck of slide plates",
    category: "Cursor",
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
      "Three hand-drawn coffee cups on a periwinkle card, each a liquid gauge that pours and drains on its own rhythm, empty as an outline and full as a solid silhouette, with plus and minus buttons to log what you drank",
    category: "Data Visualization",
    createdAt: "2026-08-23",
    codePath: "components/data-visualization/coffee-gauge/coffee-gauge.tsx",
  }),
  halftoneBloom: createComponentMeta({
    id: "halftone-bloom",
    index: "014",
    title: "Halftone Bloom",
    description:
      "A progress indicator drawn as a stippled moon of coloured dots that light from left to right, from new moon to full, and shrinks to a small moon at the same phase when collapsed",
    category: "Data Visualization",
    createdAt: "2026-09-03",
    codePath: "components/data-visualization/halftone-bloom/halftone-bloom.tsx",
  }),
  blossomLight: createComponentMeta({
    id: "blossom-light",
    index: "015",
    title: "Blossom Light",
    description:
      "A wall of blossom shadow where a brightness pill fills line by line, a tone slider shifts the light from cool to amber and an Adaptive toggle follows the weather outside, all in flat frosted glass",
    category: "Control",
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
      "Eight event cards on a ring inside a phone on its side, swiped one page at a time like cover flow, each a glowing heat map of circles, arcs and coils in painter-inspired palettes that ripple and orbit under printed grain",
    category: "Gradient",
    createdAt: "2026-09-18",
    codePath: "components/gradient/gradient-event-card/gradient-event-card.tsx",
  }),
  stampTracker: createComponentMeta({
    id: "stamp-tracker",
    index: "017",
    title: "Stamp Tracker",
    description:
      "Four habits as a fanned deck of risograph-colored cards on a black phone screen, swipe through water, coffee, move and read, switch between Day, Week and Month, and tap a day to press a rubber stamp onto it",
    category: "Data Visualization",
    createdAt: "2026-09-30",
    codePath: "components/data-visualization/stamp-tracker/stamp-tracker.tsx",
  }),
  doodleCalendar: createComponentMeta({
    id: "doodle-calendar",
    index: "018",
    title: "Doodle Calendar",
    description:
      "A sketchbook-style diary for everyday life in Japan where you tap today's plus, write a note and tap Sketch it to preview a matching pencil illustration, with today highlighted in blue",
    category: "Data Visualization",
    createdAt: "2026-09-29",
    codePath: "components/data-visualization/doodle-calendar/doodle-calendar.tsx",
    requiredAssets: [
      { path: "public/illustrations/doodle-calendar-diary/coffee.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/coffee-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/bento.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/bento-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/exercise.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/exercise-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/train.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/train-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/rain.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/rain-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/home.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/home-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/shrine.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
      { path: "public/illustrations/doodle-calendar-diary/shrine-thumb.webp", license: "MIT", credit: "Generated monochrome diary illustration for AtomicMotion." },
    ],
  }),
  pocketPiggy: createComponentMeta({
    id: "pocket-piggy",
    index: "019",
    title: "Pocket Piggy",
    description:
      "A hand-drawn piggy lives in a tiny top-down home on a glowing CRT, and four chunky keys look after it, Sleep tucks it into bed, Feed puts an apple on the table, Home sends it back to its cushion, and Play lets you pick what it does next",
    category: "Play",
    createdAt: "2026-10-13",
    codePath: "components/play/pocket-piggy/pocket-piggy.tsx",
  }),
} satisfies Record<string, ComponentMeta>;

export const componentList = Object.values(componentRegistry);

export function getComponentById(id: string) {
  return componentList.find((component) => component.id === id);
}
