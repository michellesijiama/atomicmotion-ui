"use client";

import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

export type JardinOpeningProps = {
  /** The opening title; the default uses the illustrated City in Bloom logo. */
  title?: string;
  /** Location of the scenery, flowers, bird, visitors and title logo assets. */
  assetBase?: string;
  /** Called when the visitor enters the garden. */
  onEnter?: () => void;
  /** Accepted for compatibility with the gallery preview renderer. */
  loop?: boolean;
  className?: string;
};

const SCENERY = [
  { name: "background", depth: 5, duration: "48s", delay: "-12s" },
  { name: "midground", depth: 13, duration: "37s", delay: "-8s" },
  { name: "foreground", depth: 24, duration: "29s", delay: "-4s" },
] as const;

// Centerlines are authored against the original logo pixels; each path is one pen movement.
// All completed strokes remain in the mask, so the ink accumulates without opacity fades.
const LOGO_STROKES = [
  {"group": "City", "d": "M372 332 Q494 301 494 244 Q490 181 361 243 Q240 305 171 437 Q119 559 210 568 Q316 568 386 456", "width": 94, "duration": 0.464, "delay": 3},
  {"group": "City", "d": "M94 478 Q22 514 45 549 Q72 581 146 526", "width": 34, "duration": 0.2, "delay": 3.476},
  {"group": "City", "d": "M433 400 Q414 449 409 506 Q399 569 454 516 L490 474", "width": 56, "duration": 0.192, "delay": 3.688},
  {"group": "City", "d": "M448 338 L474 326", "width": 51, "duration": 0.096, "delay": 3.892},
  {"group": "City", "d": "M553 317 Q527 359 503 454 Q474 572 551 519 L614 447", "width": 60, "duration": 0.256, "delay": 4.0},
  {"group": "City", "d": "M491 372 Q620 376 691 327", "width": 30, "duration": 0.144, "delay": 4.268},
  {"group": "City", "d": "M611 400 Q592 445 590 506 Q585 562 632 515 Q674 462 705 398", "width": 57, "duration": 0.256, "delay": 4.424},
  {"group": "City", "d": "M704 398 L689 544 Q673 635 611 691 Q548 735 538 678 Q520 615 651 546 Q740 463 782 450 Q821 448 793 499", "width": 73, "duration": 0.44, "delay": 4.692},
  {"group": "in", "d": "M850 403 Q895 384 880 421 Q861 460 855 511 Q854 565 915 509 L943 474", "width": 65, "duration": 0.2, "delay": 5.144},
  {"group": "in", "d": "M895 328 Q911 337 923 312", "width": 63, "duration": 0.096, "delay": 5.356},
  {"group": "in", "d": "M954 401 L930 537 Q965 442 1021 408 Q1080 376 991 485 Q979 558 1040 512 L1088 479 Q1117 455 1149 464", "width": 70, "duration": 0.336, "delay": 5.464},
  {"group": "Bloom", "d": "M1371 228 Q1291 285 1254 403 Q1204 528 1108 599", "width": 95, "duration": 0.344, "delay": 5.812},
  {"group": "Bloom", "d": "M1156 353 Q1071 342 1177 257 Q1276 191 1360 216 Q1497 222 1407 309 Q1352 354 1225 377", "width": 76, "duration": 0.384, "delay": 6.168},
  {"group": "Bloom", "d": "M1212 380 Q1309 353 1378 391 Q1454 439 1356 546 Q1222 642 1102 619 Q1038 610 1065 550 M1337 413 Q1273 445 1182 548", "width": 90, "duration": 0.384, "delay": 6.564},
  {"group": "Bloom", "d": "M1547 277 Q1510 302 1480 434 L1458 510 Q1458 574 1523 514 L1553 475", "width": 61, "duration": 0.256, "delay": 6.96},
  {"group": "Bloom", "d": "M1603 402 Q1560 391 1537 463 Q1507 564 1590 541 Q1659 523 1631 440 Q1616 390 1588 408 Q1565 432 1613 443 L1671 422", "width": 57, "duration": 0.304, "delay": 7.228},
  {"group": "Bloom", "d": "M1741 403 Q1701 387 1675 458 Q1640 568 1729 542 Q1800 524 1773 441 Q1755 391 1728 408 Q1706 431 1758 444 L1818 420", "width": 78, "duration": 0.304, "delay": 7.544},
  {"group": "Bloom", "d": "M1831 402 L1804 540 Q1847 439 1893 408 Q1915 396 1897 453 L1880 536", "width": 62, "duration": 0.24, "delay": 7.86},
  {"group": "Bloom", "d": "M1880 535 Q1921 450 1959 416 Q1998 383 1976 464 L1967 510", "width": 60, "duration": 0.208, "delay": 8.112},
  {"group": "Bloom", "d": "M1967 510 Q1977 595 2057 608 Q2172 642 2137 568 L2096 533", "width": 61, "duration": 0.28, "delay": 8.332},
  {"group": "skyline", "d": "M1350 373 Q1500 329 1614 291 Q1791 312 1866 297 Q1960 271 2033 249 Q2160 222 2113 269 L2087 286", "width": 44, "duration": 0.28, "delay": 8.624},
  {"group": "skyline", "d": "M1614 300 L1614 260 M1595 300 L1595 282", "width": 35, "duration": 0.088, "delay": 8.916},
  {"group": "skyline", "d": "M1643 299 L1643 280", "width": 28, "duration": 0.072, "delay": 9.016},
  {"group": "skyline", "d": "M1670 298 L1670 228 L1670 175", "width": 34, "duration": 0.12, "delay": 9.1},
  {"group": "skyline", "d": "M1706 302 L1706 272 M1694 302 L1694 281 M1727 303 L1727 289", "width": 29, "duration": 0.072, "delay": 9.232},
  {"group": "skyline", "d": "M1752 304 L1752 244", "width": 36, "duration": 0.096, "delay": 9.316},
  {"group": "skyline", "d": "M1778 305 L1778 270 M1782 305 L1782 263", "width": 25, "duration": 0.072, "delay": 9.424},
  {"group": "skyline", "d": "M1802 302 L1802 207 L1802 187", "width": 36, "duration": 0.112, "delay": 9.508},
  {"group": "skyline", "d": "M1830 300 L1830 274 M1826 300 L1826 268", "width": 38, "duration": 0.08, "delay": 9.632},
  {"group": "skyline", "d": "M1868 293 L1868 150 L1868 66", "width": 49, "duration": 0.16, "delay": 9.724},
  {"group": "skyline", "d": "M1907 284 L1907 249 M1924 278 L1924 218 M1947 271 L1947 246", "width": 36, "duration": 0.112, "delay": 9.896},
  {"group": "skyline", "d": "M1970 266 L1970 191 L1970 156", "width": 34, "duration": 0.112, "delay": 10.02},
  {"group": "botanical", "d": "M164 516 Q224 430 205 340 L170 282", "width": 32, "duration": 0.16, "delay": 10.144},
  {"group": "botanical", "d": "M170 283 Q148 251 139 232", "width": 84, "duration": 0.112, "delay": 10.316},
  {"group": "botanical", "d": "M222 326 Q253 277 277 187", "width": 72, "duration": 0.12, "delay": 10.44},
  {"group": "botanical", "d": "M177 377 Q122 341 82 348", "width": 73, "duration": 0.112, "delay": 10.572},
  {"group": "botanical", "d": "M139 487 L128 434", "width": 49, "duration": 0.096, "delay": 10.696},
  {"group": "botanical", "d": "M175 488 Q221 444 256 417", "width": 60, "duration": 0.112, "delay": 10.804},
  {"group": "botanical", "d": "M306 554 Q366 547 393 594", "width": 66, "duration": 0.12, "delay": 10.928},
  {"group": "botanical", "d": "M1987 511 Q2022 442 2086 405 L2119 394", "width": 30, "duration": 0.16, "delay": 11.06},
  {"group": "botanical", "d": "M2044 390 Q2049 350 2001 310", "width": 69, "duration": 0.12, "delay": 11.232},
  {"group": "botanical", "d": "M2081 410 L2119 381", "width": 70, "duration": 0.104, "delay": 11.364},
  {"group": "botanical", "d": "M2028 479 Q2074 463 2106 494", "width": 54, "duration": 0.112, "delay": 11.48},
  {"group": "botanical", "d": "M1918 535 Q1948 548 1953 584", "width": 56, "duration": 0.112, "delay": 11.604},
] as const;
const LOGO_WRITE_SPEED = 1.3;
const LOGO_WRITE_START = LOGO_STROKES[0].delay;
const LOGO_DRAW_END = LOGO_WRITE_START + (Math.max(...LOGO_STROKES.map((stroke) => stroke.delay + stroke.duration)) - LOGO_WRITE_START) / LOGO_WRITE_SPEED;

const STYLES = `
.jardin-opening { --jardin-ink: #253d37; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; }
.jardin-opening .jardin-device { width: var(--jardin-width, min(100%, 980px)); aspect-ratio: 2816 / 2155; padding: 0; border-radius: calc(var(--jardin-width, 980px) * .039); background: #101112; border: 1px solid #505153; box-shadow: 0 2px 0 #08090a, inset 0 0 0 3px #252628, 0 24px 46px -30px #10141270; }
.jardin-opening .jardin-camera { position:absolute; left: calc(50% - 2.5px); top: 1.55%; width: 5px; height: 5px; border-radius: 50%; background: #060709; box-shadow: inset 0 0 0 1px #232833; }
.jardin-opening .jardin-screen { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: calc(var(--jardin-width, 980px) * .940255); aspect-ratio: 2752 / 2064; border-radius: calc(var(--jardin-width, 980px) * .025); isolation: isolate; background: #f5e9dc; container-type: inline-size; }
.jardin-opening .jardin-layer { position: absolute; inset: -5%; pointer-events: none; }
.jardin-opening .jardin-layer[data-layer="midground"] { z-index: 2; }
.jardin-opening .jardin-layer[data-layer="foreground"] { z-index: 4; }
.jardin-opening .jardin-drift { width:100%; height:100%; animation: jardin-breathe var(--jardin-duration) ease-in-out infinite alternate; animation-delay: var(--jardin-delay); animation-play-state: var(--jardin-play, running); transform-origin: 50% 75%; }
.jardin-opening .jardin-art { display: block; width: 100%; height: 100%; object-fit: cover; user-select: none; }
.jardin-opening .jardin-world { position: absolute; inset: 0; transform-origin: 50% 62%; }
.jardin-opening .jardin-screen[data-ready="true"] .jardin-world { animation: jardin-arrive 11s cubic-bezier(.18,.5,.25,1) both; animation-play-state: var(--jardin-play, running); }
.jardin-opening .jardin-title { font-family: var(--font-instrument-serif, "Instrument Serif"), Georgia, serif; font-weight: 400; font-size: 14.5cqw; letter-spacing: -.035em; line-height: 1; }
.jardin-opening .jardin-title { width: 65cqw; height: 19.5cqw; color: #fff; }
.jardin-opening .jardin-logo-mark { filter: brightness(0) invert(1) drop-shadow(0 1px 3px #123d3538); }
.jardin-opening .jardin-title svg { display: block; width: 100%; height: 100%; overflow: visible; }
.jardin-opening .jardin-brush { stroke-dasharray: 1; stroke-dashoffset: 1; }
.jardin-opening .jardin-ink-stroke { stroke-dasharray: 1; stroke-dashoffset: 1; visibility: hidden; }
.jardin-opening .jardin-screen[data-ready="true"] .jardin-ink-stroke { animation: jardin-write var(--stroke-duration) cubic-bezier(.25,.05,.45,1) var(--stroke-delay) forwards; animation-play-state: var(--jardin-play, running); }
.jardin-opening .jardin-frost { opacity: 0; }
.jardin-opening .jardin-invitation { opacity: 0; visibility: hidden; }
.jardin-opening .jardin-screen[data-ready="true"] .jardin-brush { animation: jardin-paint 4.6s cubic-bezier(.32,.05,.27,1) 3s both; animation-play-state: var(--jardin-play, running); }
.jardin-opening .jardin-screen[data-ready="true"] .jardin-frost { animation: jardin-thaw 5s ease 2.5s both; animation-play-state: var(--jardin-play, running); }
.jardin-opening .jardin-screen[data-ready="true"] .jardin-invitation { animation: jardin-invite 1.4s ease var(--jardin-invite-delay, 7.6s) both; animation-play-state: var(--jardin-play, running); }
.jardin-opening .jardin-screen[data-intro-complete="true"] .jardin-invitation { animation: none; opacity: 1; visibility: visible; }
.jardin-opening .jardin-entry { min-height: 44px; gap: 16px; padding: 0 10px; font-size: max(9px, 1.1cqw); font-weight: 500; letter-spacing: .015em; }
.jardin-opening button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
.jardin-opening button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
.jardin-opening .jardin-primary { border-radius: 99px; padding: 0 23px; color: #fff; background: linear-gradient(145deg, #ffffff29, #ffffff08) #15342b24; border: 0; -webkit-backdrop-filter: blur(6px) saturate(140%); backdrop-filter: blur(6px) saturate(140%); box-shadow: 0 3px 14px #0d2d2820; text-shadow: 0 1px 4px #0c2c2866; transition: background .2s, box-shadow .2s; font-size: max(10px, 1.5cqw); }
.jardin-opening .jardin-primary:hover { background: linear-gradient(145deg, #ffffff3d, #ffffff14) #15342b24; box-shadow: 0 4px 18px #0d2d2826; }
.jardin-opening .jardin-home { position: absolute; bottom: 9px; left: 43%; width: 14%; height: 4px; border-radius: 99px; background: #253d3766; pointer-events: none; }
.jardin-opening .jardin-visitors { position: absolute; inset: 0; z-index: 1; pointer-events: none; transform: translateX(-2%) scale(.75); transform-origin: 50% 85%; }
.jardin-opening .jardin-life { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.jardin-opening .jardin-blooms { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.jardin-opening .jardin-flight { position: absolute; left: 0; top: 0; width: 7cqw; height: 5.25cqw; animation: jardin-flight 23s linear infinite; animation-delay: -5s; }
.jardin-opening .jardin-flight-alt { top: 10%; width: 5cqw; height: 3.75cqw; animation-duration: 23s; animation-delay: -16.5s; }
.jardin-opening .jardin-bird-sprite { width: 100%; height: 100%; background-size: 200% 200%; background-repeat: no-repeat; animation: jardin-wings .72s steps(1, end) infinite; }
.jardin-opening .jardin-flower-holder { position: absolute; left: -4%; bottom: -5%; width: 24cqw; height: 24cqw; }
.jardin-opening .jardin-flower-holder-alt { left: auto; right: -4%; bottom: 2%; width: 21cqw; height: 21cqw; transform: scaleX(-1); }
.jardin-opening .jardin-flower { width: 100%; height: 100%; transform-origin: 57% 98%; animation: jardin-flower-sway 5.8s ease-in-out infinite alternate; }
.jardin-opening .jardin-flower-holder-alt .jardin-flower { animation-duration: 7.2s; animation-delay: -3s; }
.jardin-opening [data-garden-animation] { animation-play-state: var(--jardin-play, running); }
@keyframes jardin-arrive { from { transform: scale(1); } to { transform: scale(1.115); } }
@keyframes jardin-write { from { visibility: visible; stroke-dashoffset: 1; } to { visibility: visible; stroke-dashoffset: 0; } }
@keyframes jardin-paint { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes jardin-thaw { 0% { opacity: 0; filter: blur(9px); } 28% { opacity: .55; filter: blur(4px); } 70% { opacity: .16; filter: blur(1px); } 100% { opacity: 0; filter: blur(0); } }
@keyframes jardin-invite { from { opacity: 0; visibility: visible; transform: translateY(7px); } to { opacity: 1; visibility: visible; transform: translateY(0); } }
@keyframes jardin-flight { 0% { transform: translate3d(-15cqw, 24cqw, 0) rotate(-8deg); } 25% { transform: translate3d(20cqw, 15.75cqw, 0) rotate(-4deg); } 50% { transform: translate3d(53cqw, 19.5cqw, 0) rotate(7deg); } 75% { transform: translate3d(85cqw, 12.75cqw, 0) rotate(-6deg); } 100% { transform: translate3d(120cqw, 8.25cqw, 0) rotate(-8deg); } }
/* Lower sprite rows need a small translation to align the generated body/foot baselines. */
@keyframes jardin-wings { 0%, 100% { background-position: 0% 0%; transform: translateY(0); } 25% { background-position: 100% 0%; transform: translateY(0); } 50% { background-position: 0% 100%; transform: translateY(14.75%); } 75% { background-position: 100% 100%; transform: translateY(14.75%); } }
@keyframes jardin-flower-sway { from { transform: rotate(-4deg) translateX(-.3cqw); } to { transform: rotate(4deg) translateX(.3cqw); } }
@keyframes jardin-breathe { 0% { transform: translate3d(-.7%, .15%, 0) rotate(-.2deg) scale(1.015); } 100% { transform: translate3d(.7%, -.5%, 0) rotate(.2deg) scale(1.035); } }
@media (max-width: 600px) { .jardin-opening .jardin-camera { width: 3px; height: 3px; left: calc(50% - 1.5px); } .jardin-opening .jardin-primary { min-height: 36px; padding: 0 16px; } .jardin-opening .jardin-home { bottom: 5px; height: 3px; } }
@media (prefers-reduced-motion: reduce) { .jardin-opening .jardin-drift, .jardin-opening [data-garden-animation], .jardin-opening .jardin-screen[data-ready="true"] .jardin-world, .jardin-opening .jardin-screen[data-ready="true"] .jardin-brush, .jardin-opening .jardin-screen[data-ready="true"] .jardin-ink-stroke, .jardin-opening .jardin-screen[data-ready="true"] .jardin-frost, .jardin-opening .jardin-screen[data-ready="true"] .jardin-invitation { animation: none; } .jardin-opening .jardin-screen[data-ready="true"] .jardin-brush, .jardin-opening .jardin-screen[data-ready="true"] .jardin-ink-stroke { stroke-dashoffset: 0; visibility: visible; } .jardin-opening .jardin-screen[data-ready="true"] .jardin-invitation { opacity: 1; visibility: visible; } .jardin-opening .jardin-flight { left: 20%; top: 24%; } .jardin-opening .jardin-flight-alt { left: 72%; top: 17%; } }
`;

/** The logo follows individual calligraphy strokes; custom titles retain the generic brush. */
function PaintedTitle({ title, logoSrc, failed }: { title: string; logoSrc?: string; failed: () => void }) {
  const id = React.useId().replace(/:/g, "");
  const [writingGroup, setWritingGroup] = React.useState("");
  const brush = Array.from({ length: 31 }, (_, i) => `${i ? "L" : "M"} ${70 + i * 22} ${i % 2 ? 12 : 232}`).join(" ");
  return (
    <h1 className="jardin-title m-0" aria-label={title} data-writing-group={writingGroup}>
      <svg viewBox={logoSrc ? "0 0 2172 724" : "0 0 800 240"} aria-hidden="true" focusable="false">
        <defs>
          <filter id={`${id}-grain`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".045 .12" numOctaves={2} seed={8} result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale={6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id={`${id}-ink`} maskUnits="userSpaceOnUse" x="0" y="0" width={logoSrc ? 2172 : 800} height={logoSrc ? 724 : 240} style={{ maskType: "luminance" }}>
            {logoSrc ? LOGO_STROKES.map((stroke, index) => (
              <path key={index} className="jardin-ink-stroke" data-stroke={index} data-stroke-group={stroke.group} onAnimationStart={() => setWritingGroup(stroke.group)} d={stroke.d} pathLength={1} fill="none" stroke="white" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" style={{ "--stroke-duration": `${(stroke.duration / LOGO_WRITE_SPEED).toFixed(3)}s`, "--stroke-delay": `${(LOGO_WRITE_START + (stroke.delay - LOGO_WRITE_START) / LOGO_WRITE_SPEED).toFixed(3)}s` } as React.CSSProperties} />
            )) : <path className="jardin-brush" d={brush} pathLength={1} fill="none" stroke="white" strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-grain)`} />}
          </mask>
        </defs>
        {logoSrc ? (
          <image className="jardin-logo-mark" href={logoSrc} x="0" y="0" width="2172" height="724" mask={`url(#${id}-ink)`} onError={failed} />
        ) : (
          <g textAnchor="middle" fontSize={Math.min(178, 1100 / Math.max(1, title.length))} letterSpacing="-.035em">
            <text className="jardin-frost" x="400" y="178" fill="#e8f5ef" stroke="#d0e6df" strokeWidth=".7">{title}</text>
            <text x="400" y="178" fill="currentColor" mask={`url(#${id}-ink)`}>{title}</text>
          </g>
        )}
      </svg>
    </h1>
  );
}

function GardenLife({ assetBase, failed }: { assetBase: string; failed: () => void }) {
  return (
    <>
      <div className="jardin-visitors" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="jardin-art" src={`${assetBase}/garden-visitors.png`} width={1448} height={1086} alt="" draggable={false} onError={failed} />
      </div>
      <div className="jardin-life" aria-hidden="true">
      {[false, true].map((alternate) => (
        <div key={String(alternate)} className={`jardin-flight ${alternate ? "jardin-flight-alt" : ""}`} data-garden-animation="flight">
          <div className="jardin-bird-sprite" data-garden-animation="wings" style={{ backgroundImage: `url("${assetBase}/bird-sprite.png")` }} />
        </div>
      ))}
      </div>
      <div className="jardin-blooms" aria-hidden="true">
      {[false, true].map((alternate) => (
        <div key={String(alternate)} className={`jardin-flower-holder ${alternate ? "jardin-flower-holder-alt" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="jardin-flower" data-garden-animation="flower" src={`${assetBase}/flower.png`} width={1254} height={1254} alt="" draggable={false} onError={failed} />
        </div>
      ))}
      </div>
    </>
  );
}

function SceneryLayer({
  layer,
  pointerX,
  pointerY,
  assetBase,
  entered,
  reduced,
  failed,
}: {
  layer: (typeof SCENERY)[number];
  pointerX: ReturnType<typeof useSpring>;
  pointerY: ReturnType<typeof useSpring>;
  assetBase: string;
  entered: boolean;
  reduced: boolean;
  failed: () => void;
}) {
  const x = useTransform(pointerX, [-1, 1], [layer.depth, -layer.depth]);
  const y = useTransform(pointerY, [-1, 1], [layer.depth * .55, -layer.depth * .55]);

  return (
    <motion.div
      className="jardin-layer"
      data-layer={layer.name}
      style={{ x, y }}
      animate={{ scale: entered ? 1 + layer.depth * .009 : 1 }}
      transition={{ duration: reduced ? 0 : 2.4, ease: [.2, .7, .2, 1] }}
      aria-hidden="true"
    >
      <div className="jardin-drift" style={{ "--jardin-duration": layer.duration, "--jardin-delay": layer.delay } as React.CSSProperties}>
        {/* Transparent scenery must retain its alpha, so use the original PNG. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="jardin-art" src={`${assetBase}/${layer.name === "background" ? "background-nyc-sunny" : layer.name}.png`} alt="" draggable={false} width={1448} height={1086} decoding="async" onError={failed} />
      </div>
    </motion.div>
  );
}

/** A living illustrated New York garden in a 13-inch iPad Pro, scaled from Apple specs.
 * Landscape body: 281.6 x 215.5 mm. Display: 2752 x 2064 px at 264 ppi.
 * https://www.apple.com/ipad-pro/specs/
 */
export function JardinOpening({
  title = "City in Bloom",
  assetBase = "/components/jardin-living",
  onEnter,
  className,
}: JardinOpeningProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [artReady, setArtReady] = React.useState(false);
  const [introStage, setIntroStage] = React.useState<"scenery" | "painting" | "ready">("scenery");
  const [entered, setEntered] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [assetError, setAssetError] = React.useState(false);
  const assetFailed = React.useCallback(() => setAssetError(true), []);
  const logoSrc = title === "City in Bloom" ? `${assetBase}/city-in-bloom-logo.png` : undefined;
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const pointerX = useSpring(targetX, { stiffness: 32, damping: 22 });
  const pointerY = useSpring(targetY, { stiffness: 32, damping: 22 });
  const still = !!reduced || !visible;
  const canEnter = artReady && (!!reduced || introStage === "ready");

  React.useEffect(() => {
    let active = true;
    const files = ["background-nyc-sunny", "midground", "foreground", "garden-visitors", "flower", "bird-sprite", "city-in-bloom-logo"];
    const artwork = files.map((file) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => { if (active) assetFailed(); resolve(); };
      image.src = `${assetBase}/${file}.png`;
    }));
    Promise.all([...artwork, document.fonts.ready]).then(() => { if (active) setArtReady(true); });
    return () => { active = false; };
  }, [assetBase, assetFailed]);

  React.useEffect(() => {
    if (entered) hostRef.current?.focus({ preventScroll: true });
  }, [entered]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const fit = () => {
      const availableHeight = Math.max(0, host.clientHeight - 56);
      host.style.setProperty("--jardin-width", `${Math.max(0, Math.min(980, host.clientWidth, availableHeight * 2816 / 2155))}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let inView = true;
    const sync = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    observer.observe(host);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);

  function resetPointer() { targetX.set(0); targetY.set(0); }

  return (
    <div ref={hostRef} tabIndex={-1} className={`jardin-opening flex h-full min-h-0 w-full flex-col items-center justify-center py-7 ${className ?? ""}`} style={{ color: "#253d37", "--jardin-play": still ? "paused" : "running", "--jardin-invite-delay": logoSrc ? `${LOGO_DRAW_END + .25}s` : "7.6s" } as React.CSSProperties}>
      <style>{STYLES}</style>
      <div className="jardin-device relative shrink-0" data-testid="jardin-device">
        <span className="jardin-camera" aria-hidden="true" />
        <div
          className="jardin-screen overflow-hidden"
          data-ready={artReady}
          data-intro-complete={canEnter}
          data-intro-stage={canEnter ? "ready" : introStage}
          onAnimationStart={(event) => { if ((event.animationName === "jardin-paint" || event.animationName === "jardin-write")) setIntroStage((stage) => stage === "scenery" ? "painting" : stage); }}
          data-testid="jardin-screen"
          data-state={entered ? "entered" : "opening"}
          data-motion={still ? "paused" : "playing"}
          onPointerMove={(event) => {
            if (still || event.pointerType === "touch") return;
            const box = event.currentTarget.getBoundingClientRect();
            targetX.set(((event.clientX - box.left) / box.width - .5) * 2);
            targetY.set(((event.clientY - box.top) / box.height - .5) * 2);
          }}
          onPointerLeave={resetPointer}
          aria-label="A living New York garden with flying birds, swaying flowers, background visitors"
        >
          <div className="jardin-world">
          {SCENERY.map((layer) => <SceneryLayer key={layer.name} layer={layer} pointerX={pointerX} pointerY={pointerY} assetBase={assetBase} entered={entered} reduced={!!reduced} failed={() => setAssetError(true)} />)}
          <GardenLife assetBase={assetBase} failed={assetFailed} />
          </div>

          <motion.div className="absolute inset-x-0 top-[18%] z-10 flex flex-col items-center" animate={{ opacity: entered ? 0 : 1, y: entered ? -12 : 0 }} transition={{ duration: reduced ? 0 : .85 }} style={{ pointerEvents: entered ? "none" : "auto" }} inert={entered}>
            <PaintedTitle title={title} logoSrc={logoSrc} failed={assetFailed} />
            <div className="jardin-invitation mt-[1.8%]" onAnimationEnd={(event) => { if (event.animationName === "jardin-invite") setIntroStage("ready"); }}>
            <button type="button" className="jardin-entry jardin-primary inline-flex items-center justify-center" tabIndex={canEnter ? 0 : -1} disabled={!canEnter} onClick={() => { resetPointer(); setEntered(true); onEnter?.(); }}>
              Step inside
            </button>
            </div>
          </motion.div>

          {assetError ? <p role="alert" className="absolute inset-x-[10%] bottom-[8%] z-30 rounded-lg bg-[#f3f1e8] p-3 text-center text-xs">The garden artwork could not load. Please reload to try again.</p> : null}
          <span className="jardin-home" aria-hidden="true" />
        </div>
      </div>

    </div>
  );
}
