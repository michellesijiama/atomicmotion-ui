import { execFile } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

// Renders a looping GIF of the Coffee Gauge for social posts. The storyboard is
// the pitch in ten seconds: the card idling, the log opening, the latte drained
// to nothing, then two taps pouring it back up.
//
// Note on the levels: a latte's daily limit is 4 cups, so every tap is worth
// 25% and the reachable stops are 0/25/50/75/100. There is no 40%. Two taps off
// zero lands on 50, which is the closest the component can actually show.

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const frameDir = resolve(projectRoot, ".tmp/coffee-gauge-frames");
const outputPath = resolve(projectRoot, "public/coffee-gauge-rednote.gif");

const fps = 20;
const totalFrames = 200; // 10s
// Rendered at 3× so the 900px-wide post is sampled down, never up.
const deviceScaleFactor = 3;
const margin = 40;

rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });

const framePath = (i) => resolve(frameDir, `frame-${String(i).padStart(4, "0")}.png`);

async function hideDevOverlay(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      [data-nextjs-errors],
      [data-nextjs-dev-tools-button] { display: none !important; }
    `,
  });
}

/** The card has no class hook, so find it by the one style only it carries. */
function cardBox(page) {
  return page.evaluate(() => {
    const card = [...document.querySelectorAll("div")].find(
      (d) => d.style?.backdropFilter?.includes("blur"),
    );
    if (!card) return null;
    const { x, y, width, height } = card.getBoundingClientRect();
    return { x, y, width, height };
  });
}

/** Click only if the control is actually enabled — `−` at zero is disabled. */
async function tap(page, name) {
  const button = page.getByRole("button", { name });
  if (await button.isDisabled().catch(() => true)) return;
  await button.click({ force: true });
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1000, height: 900 },
  deviceScaleFactor,
});

try {
  // Pass one: open the log purely to measure the card at its tallest, so a
  // single fixed crop holds both states. Cropping to the collapsed card would
  // guillotine the panel the moment it opens.
  await page.goto(`${baseUrl}/components/coffee-gauge`, { waitUntil: "networkidle" });
  await hideDevOverlay(page);
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Log a drink" }).click();
  await page.waitForTimeout(900);
  const expanded = await cardBox(page);
  if (!expanded) throw new Error("card not found");

  const clip = {
    x: Math.round(expanded.x - margin),
    y: Math.round(expanded.y - margin),
    width: Math.round(expanded.width + margin * 2),
    height: Math.round(expanded.height + margin * 2),
  };

  // Pass two: reload so the cups are drifting again and nothing is logged yet —
  // the card has to open on a live idle state, not a frozen one.
  await page.reload({ waitUntil: "networkidle" });
  await hideDevOverlay(page);
  await page.waitForTimeout(900);

  const actions = new Map([
    [40, () => tap(page, "Log a drink")],
    // Four taps down guarantees zero from any committed start.
    [80, () => tap(page, "One less Latte")],
    [88, () => tap(page, "One less Latte")],
    [96, () => tap(page, "One less Latte")],
    [104, () => tap(page, "One less Latte")],
    // Back up: 0 → 25% → 50%, spaced so each pour reads.
    [130, () => tap(page, "One more Latte")],
    [150, () => tap(page, "One more Latte")],
  ]);

  for (let i = 0; i < totalFrames; i++) {
    const action = actions.get(i);
    if (action) await action();
    await page.screenshot({ path: framePath(i), clip });
    await page.waitForTimeout(1000 / fps);
    if ((i + 1) % fps === 0) console.log(`captured ${(i + 1) / fps}s/${totalFrames / fps}s`);
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
