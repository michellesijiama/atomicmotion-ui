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
    id: "apple-club",
    title: "Apple Club",
    description:
      "A colored-pencil apple still life that turns through 360°. Download the editable Blender scene with its animation, procedural materials, and lighting, or take the looping GIF.",
    image: "/still-life/apple-club/apple-club.webp",
    gif: "/still-life/apple-club/apple-club-rotation.gif",
    imageAlt:
      "A red apple in a translucent blue polka-dot bowl, with an ivory apple cross-section and brown seeds floating above. Colored-pencil grain and small typewriter captions on white textured paper.",
    blend: "/still-life/apple-club/apple-club.blend",
    still: "/still-life/apple-club/apple-club.png",
    license: "/still-life/apple-club/LICENSE.txt",
    width: 1080,
    height: 1440,
    blenderVersion: "5.2.2",
    renderEngine: "Cycles",
  },
];

export function getStudioModel(id: string) {
  return studioModels.find((model) => model.id === id);
}
