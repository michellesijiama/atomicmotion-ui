import type { Metadata } from "next";
import { galleryDescription } from "@/components/website/gallery-intro";
import { HomeComponentBrowser } from "@/components/website/home-component-browser";
import { SitePage } from "@/components/website/site-page";
import { visibleComponentList } from "@/lib/component-registry";
import { SITE_NAME, pageMetadata, pageTitle } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: pageTitle(SITE_NAME, "Design Library"),
  description: galleryDescription,
});

const homeComponents = visibleComponentList.map(({
  id, title, category, index, createdAt, previewImage, previewVideo, previewStatic, previewInset,
}) => ({
  id, title, category, index, createdAt, previewImage, previewVideo, previewStatic, previewInset,
}));

export default function Home() {
  return (
    <SitePage>
      <HomeComponentBrowser components={homeComponents} />
    </SitePage>
  );
}
