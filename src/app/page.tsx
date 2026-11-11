import { HomeComponentBrowser } from "@/components/website/home-component-browser";
import { RotatingWord } from "@/components/website/rotating-word";
import { SitePage } from "@/components/website/site-page";
import { componentList } from "@/lib/component-registry";

const homeComponents = componentList.map(({
  id, title, category, index, createdAt, previewImage, previewVideo, previewStatic, previewInset,
}) => ({
  id, title, category, index, createdAt, previewImage, previewVideo, previewStatic, previewInset,
}));

export default function Home() {
  return (
    <SitePage
      heading={
        <>
          A design library for{" "}
          <RotatingWord words={["designers", "frontend developers"]} />
        </>
      }
    >
      <HomeComponentBrowser components={homeComponents} />
    </SitePage>
  );
}
