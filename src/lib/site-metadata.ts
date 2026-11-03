import type { Metadata } from "next";

export const SITE_URL = "https://atomicmotion.dev";
export const SITE_NAME = "AtomicMotion";
export const LIBRARY_NAME = "AtomicMotion UI";
export const DEFAULT_SHARE_IMAGE = "/previews/gemini-live.png";
export const DESIGNER = {
  name: "Sijia Ma",
  linkedIn: "https://www.linkedin.com/in/michellesijiama/",
} as const;

export function pageMetadata({
  path,
  title,
  description,
  image = DEFAULT_SHARE_IMAGE,
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
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
