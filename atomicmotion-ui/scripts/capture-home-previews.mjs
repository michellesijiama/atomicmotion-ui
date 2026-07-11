import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const outputDir = resolve(projectRoot, "public/previews");
const registry = readFileSync(resolve(projectRoot, "src/lib/component-registry.ts"), "utf8");
const ids = [...new Set(Array.from(registry.matchAll(/id: "([^"]+)"/g)).map((match) => match[1]))];

if (ids.length === 0) {
  throw new Error("No component ids found in component registry.");
}

mkdirSync(outputDir, { recursive: true });

function previewPath(id) {
  return resolve(outputDir, `${id}.png`);
}

async function prepareCapturePage(page) {
  await page.evaluate(() => {
    document.body.style.background = "#ffffff";
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

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 960, height: 1200 },
  deviceScaleFactor: 1,
});

try {
  for (const id of ids) {
    await page.goto(`${baseUrl}/components/${id}`, { waitUntil: "domcontentloaded" });
    await prepareCapturePage(page);
    await page.waitForTimeout(["gradient-aura", "liquid-vinyl"].includes(id) ? 2400 : 1400);
    await page.screenshot({
      path: previewPath(id),
      clip: { x: 0, y: 0, width: 960, height: 1200 },
    });
    console.log(`captured ${id}`);
  }
} finally {
  await browser.close();
}
