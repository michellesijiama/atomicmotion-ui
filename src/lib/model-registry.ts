export type StudioModel = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  gif?: string;
  blend: string;
  still: string;
  license: string;
  width: number;
  height: number;
  blenderVersion: string;
  renderEngine: string;
};

export const studioModels: StudioModel[] = [
  {
    id: "mango-on-silver",
    title: "Mango on Silver",
    description:
      "A mango crepe cake inspired by Little Bead Club stands on a rose-embossed silver plate. Golden yellow, cream and orange beads catch tiny glints against a grainy deep-blue backdrop.",
    image: "/studio/mango-on-silver/mango-on-silver.webp",
    imageAlt:
      "A flat pixel-art slice of golden yellow and orange mango cake stands upright on a scalloped silver plate with embossed roses, against a grainy deep-blue backdrop with soft photographic focus.",
    blend: "/studio/mango-on-silver/mango-on-silver.blend",
    still: "/studio/mango-on-silver/mango-on-silver.png",
    license: "/studio/mango-on-silver/LICENSE.txt",
    width: 1080,
    height: 1339,
    blenderVersion: "5.2.2",
    renderEngine: "Cycles",
  },
  {
    id: "little-nap",
    title: "Little Nap",
    description:
      "A blue lace bowl slides into view, giving five little piglet dumplings a tiny fright. They blink, wobble and settle into their own gentle floating rhythms, surrounded by pencil grain, ripples, twinkling stars and ink notes along the rim.",
    image: "/studio/little-nap/little-nap.webp",
    gif: "/studio/little-nap/little-nap-soft-hops.gif",
    imageAlt:
      "Five whole, round piglet rice dumplings float in clear water in a blue lace bowl, sliding into view before briefly opening their eyes in surprise, then gently swaying in their own rhythms. A fixed front view, grainy pencil washes, soft ripples, golden stars and rim-following ink notes sit on fibrous white paper.",
    blend: "/studio/little-nap/little-nap.blend",
    still: "/studio/little-nap/little-nap.png",
    license: "/studio/little-nap/LICENSE.txt",
    width: 1080,
    height: 1440,
    blenderVersion: "5.2.2",
    renderEngine: "Cycles",
  },
];

export function getStudioModel(id: string) {
  return studioModels.find((model) => model.id === id);
}
