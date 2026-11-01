import { Download } from "lucide-react";
import type { StudioModel } from "@/lib/model-registry";
import { actionPrimaryClass, actionGhostClass } from "@/components/website/styles";

export function ModelActions({ model }: { model: StudioModel }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={model.blend} download className={actionPrimaryClass}>
        Download Blender <Download className="size-4" aria-hidden="true" />
      </a>
      <a href={model.gif} download className={actionGhostClass}>
        Download GIF <Download className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}
