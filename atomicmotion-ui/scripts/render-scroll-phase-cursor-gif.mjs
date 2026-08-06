import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

// Renders a looping GIF of the Scroll Phase Cursor for social posts: the
// pointer drifts across the slide stack while the ring fills with scroll
// progress, then unwinds back to zero so the loop is seamless.

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const frameDir = resolve(projectRoot, ".tmp/scroll-phase-cursor-frames");
const outputPath = resolve(projectRoot, "public/scroll-phase-cursor.gif");

const width = 1200;
const height = 1600;
const fps = 20;
const seconds = 9;
const totalFrames = fps * seconds;

rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });

const framePath = (index) => resolve(frameDir, `frame-${String(index).padStart(4, "0")}.png`);

// Out and back, with a long hold near the top of the stroke.
function progressForFrame(index) {
  const t = index / totalFrames;
  const eased = t < 0.78 ? t / 0.78 : 1 - (t - 0.78) / 0.22;
  return eased * eased * (3 - 2 * eased);
}

async function preparePage(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      [data-nextjs-errors],
      [data-nextjs-dev-tools-button] { display: none !important; }
      .am-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
    `;
    document.head.appendChild(style);

    const scroller = document.querySelector("div.overflow-y-auto");
    if (scroller) scroller.style.scrollBehavior = "auto";
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

try {
  await page.goto(`${baseUrl}/components/scroll-phase-cursor`, { waitUntil: "networkidle" });
  await preparePage(page);
  await page.waitForTimeout(1200);

  const surface = await page.locator(".scroll-phase-surface").boundingBox();
  if (!surface) throw new Error("scroll surface not found");

  // Crop tight to the component (plus a breathing margin) so the post is the
  // component, not the page around it.
  const margin = 48;
  const clip = {
    x: Math.max(0, surface.x - margin),
    y: Math.max(0, surface.y - margin),
    width: Math.min(width, surface.width + margin * 2),
    height: Math.min(height, surface.height + margin * 2),
  };

  for (let i = 0; i < totalFrames; i++) {
    const progress = progressForFrame(i);
    const t = i / totalFrames;

    // Keep the pointer inside the surface so the ring cursor stays visible.
    const x = surface.x + surface.width * (0.5 + Math.cos(t * Math.PI * 2) * 0.26);
    const y = surface.y + surface.height * (0.5 + Math.sin(t * Math.PI * 4) * 0.22);

    await page.evaluate((value) => {
      const scroller = document.querySelector("div.overflow-y-auto");
      if (!scroller) return;
      scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * value;
    }, progress);
    await page.mouse.move(x, y);
    await page.waitForTimeout(1000 / fps);
    await page.screenshot({ path: framePath(i), clip });

    if ((i + 1) % fps === 0) console.log(`captured ${(i + 1) / fps}s/${seconds}s`);
  }
} finally {
  await browser.close();
}

const palettePath = resolve(frameDir, "palette.png");
// Scale to a 900px-wide post and letterbox onto a 3:4 white canvas, the shape
// RedNote gives the most room to.
const scale = "scale=900:-2:flags=lanczos,pad=900:1200:0:(1200-ih)/2:white";

await execFileAsync(ffmpeg.path, [
  "-y",
  "-framerate", String(fps),
  "-i", resolve(frameDir, "frame-%04d.png"),
  "-vf", `${scale},palettegen=stats_mode=diff`,
  palettePath,
]);

await execFileAsync(ffmpeg.path, [
  "-y",
  "-framerate", String(fps),
  "-i", resolve(frameDir, "frame-%04d.png"),
  "-i", palettePath,
  "-lavfi", `${scale}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  "-loop", "0",
  outputPath,
]);

rmSync(frameDir, { recursive: true, force: true });
console.log(`rendered ${outputPath}`);
