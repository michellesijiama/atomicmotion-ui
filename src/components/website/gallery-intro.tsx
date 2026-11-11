import { Fragment, type ReactNode } from "react";

import { SITE_NAME } from "@/lib/site-metadata";

import styles from "./gallery-intro.module.css";

export const galleryDescription = `${SITE_NAME} is an open-source library where you can explore Blender scenes and renders, React components, and native SwiftUI code for iOS`;

const highlights: Readonly<Record<string, ReactNode>> = {
  "open-source": null,
  Blender: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      {/* Blender mark from Simple Icons */}
      <path d="M12.51 13.214c.046-.8.438-1.506 1.03-2.006a3.424 3.424 0 0 1 2.212-.79c.85 0 1.631.3 2.211.79.592.5.983 1.206 1.028 2.005.045.823-.285 1.586-.865 2.153a3.389 3.389 0 0 1-2.374.938 3.393 3.393 0 0 1-2.376-.938c-.58-.567-.91-1.33-.865-2.152M7.35 14.831c.006.314.106.922.256 1.398a7.372 7.372 0 0 0 1.593 2.757 8.227 8.227 0 0 0 2.787 2.001 8.947 8.947 0 0 0 3.66.76 8.964 8.964 0 0 0 3.657-.772 8.285 8.285 0 0 0 2.785-2.01 7.428 7.428 0 0 0 1.592-2.762 6.964 6.964 0 0 0 .25-3.074 7.123 7.123 0 0 0-1.016-2.779 7.764 7.764 0 0 0-1.852-2.043h.002L13.566 2.55l-.02-.015c-.492-.378-1.319-.376-1.86.002-.547.382-.609 1.015-.123 1.415l-.001.001 3.126 2.543-9.53.01h-.013c-.788.001-1.545.518-1.695 1.172-.154.665.38 1.217 1.2 1.22V8.9l4.83-.01-8.62 6.617-.034.025c-.813.622-1.075 1.658-.563 2.313.52.667 1.625.668 2.447.004L7.414 14s-.069.52-.063.831zm12.09 1.741c-.97.988-2.326 1.548-3.795 1.55-1.47.004-2.827-.552-3.797-1.538a4.51 4.51 0 0 1-1.036-1.622 4.282 4.282 0 0 1 .282-3.519 4.702 4.702 0 0 1 1.153-1.371c.942-.768 2.141-1.183 3.396-1.185 1.256-.002 2.455.41 3.398 1.175.48.391.87.854 1.152 1.367a4.28 4.28 0 0 1 .522 1.706 4.236 4.236 0 0 1-.239 1.811 4.54 4.54 0 0 1-1.035 1.626" />
    </svg>
  ),
  React: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.15">
        <ellipse cx="12" cy="12" rx="11" ry="4.25" />
        <ellipse cx="12" cy="12" rx="11" ry="4.25" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="11" ry="4.25" transform="rotate(120 12 12)" />
      </g>
    </svg>
  ),
  SwiftUI: (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">
      {/* Swift mark from swift.org/assets/images/icon-swift.svg */}
      <path
          d="m46.955 36.578c-.002-.002-.003-.003-.005-.005.066-.223.134-.445.191-.673 2.46-9.799-3.543-21.384-13.701-27.484 4.452 6.035 6.42 13.344 4.671 19.735-.156.571-.343 1.118-.55 1.65-.225-.148-.509-.316-.889-.526 0 0-10.104-6.238-21.055-17.273-.288-.29 5.839 8.757 12.793 16.104-3.276-1.839-12.406-8.482-18.186-13.772.71 1.185 1.555 2.325 2.483 3.423 4.827 6.121 11.121 13.673 18.662 19.473-5.298 3.242-12.785 3.494-20.239.003-1.844-.864-3.577-1.907-5.182-3.091 3.156 5.047 8.015 9.401 13.93 11.943 7.054 3.032 14.068 2.826 19.292.05l-.004.006c.024-.015.054-.031.079-.047.214-.115.427-.232.636-.356 2.51-1.303 7.467-2.625 10.129 2.553.651 1.267 2.036-5.448-3.055-11.713z"
          transform="matrix(.351937 0 0 .351937 -1.96558 -2.00601)"
      />
    </svg>
  ),
};

export function GalleryIntro() {
  return (
    <h1 className={styles.intro}>
      {galleryDescription.split(" ").map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 && " "}
          <span className={styles.word} style={{ animationDelay: `${index * 45}ms` }}>
            {Object.hasOwn(highlights, word) ? (
              <span className={styles.emphasis}>
                {highlights[word]}
                {word}
              </span>
            ) : word}
          </span>
        </Fragment>
      ))}
    </h1>
  );
}
