import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const outputDir = resolve(projectRoot, "public/previews");
const registry = readFileSync(resolve(projectRoot, "src/lib/component-registry.ts"), "utf8");
const allIds = [...new Set(Array.from(registry.matchAll(/id: "([^"]+)"/g)).map((match) => match[1]))];

// Optional CLI filter: `node capture-home-previews.mjs gradient-aura liquid-vinyl`
// regenerates only those posters. With no args it captures every component.
const requested = process.argv.slice(2);
const ids = requested.length ? allIds.filter((id) => requested.includes(id)) : allIds;

if (ids.length === 0) {
  throw new Error("No component ids to capture.");
}

// Cards sit on the design-system gray (--jitter-card). Capture posters on that
// gray so transparent (e.g. WebGL) previews blend into the card, not show a box.
const captureBackground = "#f2f2f4";

mkdirSync(outputDir, { recursive: true });

function previewPath(id) {
  return resolve(outputDir, `${id}.png`);
}

// The Next.js dev-tools indicator ("N · 1 Issue") renders into <nextjs-portal>
// custom elements. Because captures run against the dev server, it would
// otherwise be baked into every poster. Hide any dev overlay before shooting.
function hideDevOverlay(page) {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll("nextjs-portal")) {
      el.style.display = "none";
    }
  });
}

async function prepareCapturePage(page) {
  await page.evaluate((bg) => {
    document.body.style.background = bg;
    // The detail-page <main> carries the white --jitter-bg, which would cover
    // the body color behind a transparent (e.g. WebGL) preview. Force it to the
    // capture background so those posters match the gray gallery.
    const main = document.querySelector("main");
    if (main) main.style.background = bg;
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
    await hideDevOverlay(page);
    await page.screenshot({
      path: previewPath(id),
      clip: { x: 0, y: 0, width: 960, height: 1200 },
    });
    console.log(`captured ${id}`);
  }
} finally {
  await browser.close();
}
