import type { StudioModel } from "@/lib/model-registry";

export function getModelAiPrompt(model: StudioModel) {
  const source = "https://raw.githubusercontent.com/michellesijiama/atomicmotion-ui/main";

  return [
    `Help me adapt "${model.title}" from AtomicMotion's 3D Studio.`,
    "",
    model.description,
    "",
    `Editable Blender scene: ${source}/public${model.blend}`,
    `Animation preview: ${source}/public${model.gif}`,
    `Scene source and instructions: ${source}/scenes/${model.id}/README.md`,
    `License: ${source}/public${model.license}`,
    `Blender version: ${model.blenderVersion}.`,
    "",
    "Use the linked scene and source as the starting point. Keep the geometry, materials, lighting, camera, and animation editable when adapting it.",
  ].join("\n");
}
