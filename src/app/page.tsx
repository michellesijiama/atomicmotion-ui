import { HomeComponentBrowser } from "@/components/website/home-component-browser";
import { HomeHero } from "@/components/website/home-hero";
import { SitePage } from "@/components/website/site-page";
import { componentList } from "@/lib/component-registry";

export default function Home() {
  return (
    <SitePage introduction={<HomeHero />}>
      <HomeComponentBrowser components={componentList} />
    </SitePage>
  );
}
