import type { Metadata } from "next";

export const SITE_URL = "https://atomicmotion.dev";

export function pageMetadata({
  path,
  title,
  description,
  image = "/previews/gemini-live.png",
}: {
  path: string;
  title: string;
  description: string;
  image?: string;
}): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "AtomicMotion",
      url: path,
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
