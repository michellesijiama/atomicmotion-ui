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
      "A blue lace bowl lands, then two soft pudding piglets drop in and wobble into a stack. Pencil outlines, pale color, floating notes and softly glowing stars bring this paper illustration to life.",
    image: "/studio/little-nap/little-nap.webp",
    gif: "/studio/little-nap/little-nap-soft-hops.gif",
    imageAlt:
      "Two rounded pudding piglets settle into a blue lace bowl, viewed from the front. Colored-pencil outlines and pale fill on fibrous white paper, with floating English notes and softly glowing golden stars.",
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
