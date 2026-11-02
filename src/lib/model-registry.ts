export type StudioModel = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  gif: string;
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
    id: "little-nap",
    title: "Little Nap",
    description:
      "Five sleepy piglet dumplings float in a blue lace bowl, each with a tiny wobble of its own. Gentle ripples, soft pencil grain and twinkling stars bring this little daydream to life, with ink notes following the rim.",
    image: "/studio/little-nap/little-nap.webp",
    gif: "/studio/little-nap/little-nap-soft-hops.gif",
    imageAlt:
      "Five whole, round piglet rice dumplings float in clear water in a blue lace bowl, each gently swaying in its own rhythm. A fixed front view, grainy pencil washes, soft ripples, golden stars and rim-following ink notes sit on fibrous white paper.",
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
