import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Renders looping home-gallery clips for the 3D (WebGL) components. Those play a
// video on the card instead of a live scene so the gallery never mounts several
// WebGL contexts at once. Frames are captured with the same 960x1200 (4:5)
// framing as capture-home-previews.mjs, so each clip lines up with its poster.

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const outputDir = resolve(projectRoot, "public/previews");
const width = 960;
const height = 1200;
const fps = 24;
// Cards sit on the design-system gray (--jitter-card). Capture on that gray so
// the scene blends into the card instead of showing a box.
const captureBackground = "#f2f2f4";

// Per-component capture plan. `spanSeconds` is the real wall-clock window the
// frames are sampled across; picking one full period of the dominant motion
// makes the clip loop seamlessly. `frames` are then played back at `fps`.
const allTargets = [
  {
    id: "gradient-aura",
    frames: 144,
    spanSeconds: 6,
    settleMs: 2600,
    orbitCursor: true,
  },
  {
    // One full record revolution (rotation.z advances 0.22 rad/s -> 2*pi/0.22).
    id: "liquid-vinyl",
    frames: 96,
    spanSeconds: 28.56,
    settleMs: 2400,
    orbitCursor: false,
  },
];

// Optional CLI filter: `node render-card-videos.mjs liquid-vinyl` re-renders
// only that clip. With no args it renders every 3D component.
const requested = process.argv.slice(2);
const targets = requested.length
  ? allTargets.filter((target) => requested.includes(target.id))
  : allTargets;

mkdirSync(outputDir, { recursive: true });

async function prepareCapturePage(page) {
  await page.evaluate((bg) => {
    document.body.style.background = bg;
    const hideDevChrome = document.createElement("style");
    hideDevChrome.textContent = `nextjs-portal { display: none !important; }`;
    document.head.appendChild(hideDevChrome);

    // Match the poster prep: drop the header reveal, freeze the preview reveal
    // in its final state, and let the preview fill the viewport.
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
  }, captureBackground);
}

function orbitPoint(index, frames) {
  // One full ellipse across the clip (frame 0 ~= last frame) for a seamless loop.
  const t = index / frames;
  const angle = Math.PI * 2 * t;
  return {
    x: width / 2 + Math.cos(angle) * width * 0.26,
    y: height / 2 + Math.sin(angle) * height * 0.22,
  };
}

// Keep headless Chromium from throttling the tab during the long WebGL captures
// — background throttling was stalling screenshots on the heavier vinyl shader.
const browser = await chromium.launch({
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion",
  ],
});

try {
  for (const target of targets) {
    const frameDir = resolve(projectRoot, `.tmp/card-video-${target.id}`);
    rmSync(frameDir, { recursive: true, force: true });
    mkdirSync(frameDir, { recursive: true });

    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    try {
      await page.goto(`${baseUrl}/components/${target.id}`, {
        waitUntil: "domcontentloaded",
      });
      await prepareCapturePage(page);
      await page.waitForTimeout(target.settleMs);

      const frameGap = (target.spanSeconds * 1000) / target.frames;
      for (let i = 0; i < target.frames; i++) {
        if (target.orbitCursor) {
          const point = orbitPoint(i, target.frames);
          await page.mouse.move(point.x, point.y);
        }
        await page.waitForTimeout(frameGap);
        await page.screenshot({
          path: resolve(frameDir, `frame-${String(i).padStart(4, "0")}.png`),
          clip: { x: 0, y: 0, width, height },
          timeout: 60000,
          animations: "allow",
        });
      }
    } finally {
      await page.close();
    }

    const outputPath = resolve(outputDir, `${target.id}.mp4`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      resolve(frameDir, "frame-%04d.png"),
      "-vf",
      "format=yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
    rmSync(frameDir, { recursive: true, force: true });
    console.log(`rendered ${outputPath}`);
  }
} finally {
  await browser.close();
}
