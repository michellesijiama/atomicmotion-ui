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
      "Two soft, sleepy piglet scoops stack in a blue lace bowl. Grainy colored-pencil outlines, sparse pink and blue fill, fibrous paper, floating ink-like notes and twinkling stars. Soft little hops and a slow frontal sway keep the illustration gently moving. Download the editable Blender scene or looping GIF.",
    image: "/studio/little-nap/little-nap.webp",
    gif: "/studio/little-nap/little-nap-soft-hops.gif",
    imageAlt:
      "Two soft, asymmetrical sleeping pigs stack in a blue lace bowl, viewed from the front. Textured colored-pencil outlines and very pale fill on fibrous white paper, with floating English ink lettering and small four-point stars around the bowl.",
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
