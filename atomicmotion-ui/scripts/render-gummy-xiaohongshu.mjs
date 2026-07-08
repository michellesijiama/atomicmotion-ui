import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const frameDir = resolve(projectRoot, ".tmp/gummy-xiaohongshu-frames");
const outputPath = resolve(projectRoot, "public/gummy-bear-xiaohongshu.mp4");
const width = 1080;
const height = 1920;
const fps = 24;
const seconds = 6;
const totalFrames = fps * seconds;

mkdirSync(frameDir, { recursive: true });
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });

function framePath(index) {
  return resolve(frameDir, `frame-${String(index).padStart(4, "0")}.png`);
}

async function prepareVideoPage(page) {
  await page.evaluate(() => {
    document.body.style.background = "#ffffff";
    document.body.style.overflow = "hidden";
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
  });
}

function pointerForFrame(index) {
  const t = index / (totalFrames - 1);
  const angle = Math.PI * 2 * t;
  const radiusX = 250;
  const radiusY = 360;
  return {
    x: width / 2 + Math.cos(angle) * radiusX,
    y: height / 2 + Math.sin(angle * 1.15) * radiusY,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});

try {
  await page.goto(`${baseUrl}/components/gradient-aura`, { waitUntil: "domcontentloaded" });
  await prepareVideoPage(page);
  await page.waitForTimeout(2600);

  for (let i = 0; i < totalFrames; i++) {
    const point = pointerForFrame(i);
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(1000 / fps);
    await page.screenshot({
      path: framePath(i),
      clip: { x: 0, y: 0, width, height },
    });
    if ((i + 1) % fps === 0) {
      console.log(`captured ${Math.round((i + 1) / fps)}s/${seconds}s`);
    }
  }
} finally {
  await browser.close();
}

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
  "18",
  "-pix_fmt",
  "yuv420p",
  outputPath,
]);

rmSync(frameDir, { recursive: true, force: true });
console.log(`rendered ${outputPath}`);
