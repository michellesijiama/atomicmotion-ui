import Image from "next/image";
import Link from "next/link";

import { RotatingWord } from "@/components/website/rotating-word";
import { componentRegistry } from "@/lib/component-registry";
import { SITE_NAME } from "@/lib/site-metadata";

import styles from "./home-hero.module.css";

const pieces = [
  { component: componentRegistry.pocketPiggy, style: styles.piggy, width: 960, height: 1200 },
  { component: componentRegistry.stickerPeel, style: styles.stickers, width: 960, height: 1200 },
  { component: componentRegistry.doodleCalendar, style: styles.diary, width: 400, height: 508 },
  { component: componentRegistry.jardinOpening, style: styles.garden, width: 789, height: 613 },
  { component: componentRegistry.digitalStressReliever, style: styles.bunny, width: 500, height: 600 },
  { component: componentRegistry.beadClub, style: styles.beads, width: 960, height: 1200 },
];

export function HomeHero() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>{SITE_NAME}</h1>
      <p className={styles.subtitle}>
        A design library for{" "}
        <RotatingWord words={["designers", "frontend developers"]} />
      </p>

      <ul className={styles.collage} aria-label="Selected interfaces">
        {pieces.map(({ component, style, width, height }) => (
          <li key={component.id} className={`${styles.piece} ${style}`}>
            <Link
              href={`/components/${component.id}`}
              aria-label={`Explore ${component.title}`}
              className={styles.link}
              prefetch={false}
            >
              <span className={styles.crop}>
                <Image
                  src={component.previewImage}
                  alt=""
                  width={width}
                  height={height}
                  sizes="(max-width: 640px) 48vw, 400px"
                  className={styles.image}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
