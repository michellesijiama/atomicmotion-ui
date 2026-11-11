import type { StudioModel } from "@/lib/model-registry";

export function ModelPreview({
  model,
  className = "size-full object-contain",
  eager = false,
  frameClassName = "block size-full",
}: {
  model: StudioModel;
  className?: string;
  eager?: boolean;
  frameClassName?: string;
}) {
  return (
    <picture className={frameClassName}>
      {model.gif ? <source media="(prefers-reduced-motion: reduce)" srcSet={model.image} /> : null}
      <img
        src={model.gif ?? model.image}
        alt={model.imageAlt}
        width={model.width}
        height={model.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
