import type { Metadata } from "next";
import { SitePage } from "@/components/website/site-page";
import { StudioModelBrowser } from "@/components/website/studio-model-browser";
import { studioModels } from "@/lib/model-registry";
import { SITE_NAME, pageMetadata, pageTitle } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/3d-studio",
  title: pageTitle("3D Studio", SITE_NAME),
  description: "Explore 3D still lifes and animations and download the editable Blender files.",
  image: studioModels[0]?.image,
});

export default function StudioPage() {
  return (
    <SitePage section="3d-studio">
      <StudioModelBrowser models={studioModels} />
    </SitePage>
  );
}
