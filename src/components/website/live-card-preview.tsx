import type { ReactNode } from "react";

import { PreviewStage } from "@/components/website/preview-stage";
import { componentMap } from "@/lib/component-map";

export default function LiveCardPreview({
  componentId,
  fallback,
}: {
  componentId: string;
  fallback: ReactNode;
}) {
  const Preview = componentMap[componentId];
  if (!Preview) return fallback;

  return (
    <div className="absolute inset-x-0 bottom-0 top-16">
      <PreviewStage>
        <Preview loop />
      </PreviewStage>
    </div>
  );
}
