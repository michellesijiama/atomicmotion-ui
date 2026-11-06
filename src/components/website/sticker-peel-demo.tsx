"use client";

import dynamic from "next/dynamic";

export const StickerPeelDemo = dynamic(() =>
  import("@components/play/sticker-peel").then((module) => module.StickerPeel),
);
