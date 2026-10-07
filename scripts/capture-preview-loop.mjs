#!/usr/bin/env node
// Records the looping gallery video for a heavy WebGL component
// (public/previews/<id>.mp4) — the clip the home card plays instead of mounting
// a live GL context.
//
// This records in REAL TIME rather than stepping frames, which is the only
// option available. The obvious approach — mock the clock and advance it a
// frame at a time — does not work here: Playwright's clock does not mock
// performance.now(), and THREE.Clock reads it, so the component's animation
// accrues wall-clock time regardless of how the fake clock is driven. Stepping
// frames just desynchronises the texture cycle from the frame index.
//
// What still IS deterministic is rotation, because the component suppresses its
// idle drift while a pointer is down. So the capture holds a drag and moves it
// at a constant rate calculated to complete exactly one revolution over the
// clip, which makes the rotation line up at the loop point. The texture cycle
// lines up because CLIP_SECONDS is a whole number of its periods.
//
// Requires: a dev server on PREVIEW_BASE_URL and ffmpeg on PATH.
// Usage: node scripts/capture-preview-loop.mjs [component-id]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const id = process.argv[2] ?? "showreel-sphere";
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const output = resolve(`public/previews/${id}.mp4`);

// One full cycle of everything the component animates. showreel-sphere holds
// four paintings for four seconds each, so sixteen seconds covers the lot.
const CLIP_SECONDS = 16;
const FPS = 25;
const DRAG_SENSITIVITY = 0.0062; // rad per px, from the component
// Drag at a constant 2*PI per CLIP_SECONDS, but keep dragging for longer than
// the clip. At a constant rate ANY window of CLIP_SECONDS contains exactly one
// revolution, so the trim does not have to hit an exact offset to close the
// rotation — it only has to land inside the drag.
const DRAG_SECONDS = CLIP_SECONDS + 3;
const DRAG_RATE_PX = (Math.PI * 2) / DRAG_SENSITIVITY / CLIP_SECONDS;
// Recorded small on purpose. The component clamps its frame delta to 50ms to
// survive tab-switches; under heavy capture load frames get slower than that
// and the clamp silently eats time, so its texture cycle runs behind real time
// and no longer fits a whole number of periods into the clip. A lighter frame
// keeps deltas under the clamp. The card renders this at ~300px wide anyway.
const SIZE = { width: 640, height: 800 };
const CARD_GRAY = "#f2f2f4"; // --jitter-card

const workDir = mkdtempSync(join(tmpdir(), `preview-loop-${id}-`));

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: workDir, size: SIZE },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/components/${id}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas");

  await page.evaluate((gray) => {
    document.body.style.background = gray;
    const main = document.querySelector("main");
    if (main) main.style.background = gray;
    const reveals = Array.from(document.querySelectorAll(".am-reveal"));
    if (reveals[0]) reveals[0].style.display = "none";
    if (reveals[1]) {
      reveals[1].style.padding = "0";
      reveals[1].style.animation = "none";
      reveals[1].style.opacity = "1";
      reveals[1].style.transform = "none";
    }
    const root = document.querySelector("body > div");
    if (root) root.style.height = "100vh";
    for (const el of document.querySelectorAll("nextjs-portal")) el.style.display = "none";
    // Affordance hints belong on the live page, not in a poster loop.
    for (const p of document.querySelectorAll("p")) {
      if (p.textContent.trim() === "Drag to spin") p.style.display = "none";
    }
    // CSS loops have their own periods that do not divide CLIP_SECONDS, so they
    // would not line up at the loop point. Park them at their resting pose.
    const style = document.createElement("style");
    style.textContent = "*, *::before, *::after { animation: none !important; }";
    document.head.appendChild(style);
  }, CARD_GRAY);

  // The stage paints over document.body; its own Shift+G puts it on the card gray.
  await page.keyboard.press("Shift+G");
  await page.waitForTimeout(2500); // let the paintings decode and the ball settle

  const box = await page.locator("canvas").boundingBox();
  const originX = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(originX, y);
  await page.mouse.down();

  // Drive the drag off the wall clock, not off a step count, so the rotation
  // tracks real elapsed time exactly like the texture cycle does.
  const startedAt = Date.now();
  for (;;) {
    const t = (Date.now() - startedAt) / 1000;
    if (t >= DRAG_SECONDS) break;
    await page.mouse.move(originX + t * DRAG_RATE_PX, y);
    await page.waitForTimeout(1000 / 60);
  }
  await page.mouse.up();

  const videoPath = await page.video().path();
  await context.close(); // flushes the video file

  // Take a window that ends before the drag does, so no post-release idle spin
  // leaks in — the release would break the constant rotation rate.
  const trimmed = join(workDir, "trimmed.mp4");
  execFileSync("ffmpeg", [
    "-y", "-v", "error",
    "-sseof", `-${CLIP_SECONDS + 2}`, "-t", String(CLIP_SECONDS),
    "-i", videoPath,
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-r", String(FPS), "-crf", "26", "-preset", "slow",
    "-movflags", "+faststart",
    trimmed,
  ]);
  renameSync(trimmed, output);

  // Report how well the loop actually closes. Real-time capture cannot be
  // pixel-exact the way frame-stepping a purely mouse-driven scene was, so this
  // is a reported measurement rather than a hard gate.
  const frames = join(workDir, "seam-%1d.png");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", output, "-vf",
    `select='eq(n\\,0)+eq(n\\,${CLIP_SECONDS * FPS - 1})'`, "-vsync", "0", frames]);
  const ssim = execFileSync("ffmpeg", ["-v", "error",
    "-i", join(workDir, "seam-1.png"), "-i", join(workDir, "seam-2.png"),
    "-lavfi", "ssim=stats_file=-", "-f", "null", "-"], { encoding: "utf8" });
  const score = Number(ssim.match(/All:([0-9.]+)/)?.[1] ?? 0);
  console.log(`capture-preview-loop: wrote ${output}`);
  console.log(`capture-preview-loop: loop seam SSIM ${score.toFixed(4)} (1.0 = perfect)`);
  if (score < 0.9) {
    console.warn("capture-preview-loop: WARNING — visible jump at the loop point.");
  }
} finally {
  await browser.close();
  rmSync(workDir, { recursive: true, force: true });
}
