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
      <source media="(prefers-reduced-motion: reduce)" srcSet={model.image} />
      {/* GIF is the requested preview format; serve its original animated bytes. */}
      <img
        src={model.gif}
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
