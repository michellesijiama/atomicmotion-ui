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
    const hideDevChrome = document.createElement("style");
    hideDevChrome.textContent = `
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      [data-nextjs-errors],
      [data-nextjs-dev-tools-button] {
        display: none !important;
      }
    `;
    document.head.appendChild(hideDevChrome);
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

    const cursor = document.createElement("div");
    cursor.setAttribute("data-xhs-cursor", "true");
    cursor.style.position = "fixed";
    cursor.style.left = "0";
    cursor.style.top = "0";
    cursor.style.zIndex = "999999";
    cursor.style.width = "34px";
    cursor.style.height = "34px";
    cursor.style.pointerEvents = "none";
    cursor.style.background = "#111111";
    cursor.style.clipPath = "polygon(0 0, 0 88%, 26% 63%, 42% 100%, 58% 92%, 43% 58%, 74% 58%)";
    cursor.style.filter = "drop-shadow(0 2px 3px rgba(255,255,255,0.85)) drop-shadow(0 3px 8px rgba(0,0,0,0.25))";
    cursor.style.transform = "translate3d(-100px, -100px, 0)";
    document.body.appendChild(cursor);

    window.__setXhsCursor = (x, y) => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
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
    await page.evaluate(({ x, y }) => {
      window.__setXhsCursor?.(x, y);
    }, point);
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
