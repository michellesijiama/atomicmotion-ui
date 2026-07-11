import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PREVIEW_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const consoleIssues = [];

page.on("console", (message) => {
  if (["warning", "error"].includes(message.type())) {
    consoleIssues.push({ type: message.type(), text: message.text() });
  }
});

async function canvasStats() {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas[data-liquid-vinyl-canvas=true]");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return { found: false };
    }

    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      return { found: true, context: false };
    }

    const width = Math.min(gl.drawingBufferWidth, 360);
    const height = Math.min(gl.drawingBufferHeight, 300);
    const pixels = new Uint8Array(width * height * 4);
    const x = Math.floor((gl.drawingBufferWidth - width) / 2);
    const y = Math.floor((gl.drawingBufferHeight - height) / 2);
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let hash = 2166136261;
    let coloredPixels = 0;
    let darkPixels = 0;
    let brightPixels = 0;
    let lumaSum = 0;
    let lumaSquareSum = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;

      if (spread > 7) coloredPixels++;
      if (luma < 70) darkPixels++;
      if (luma > 210) brightPixels++;
      lumaSum += luma;
      lumaSquareSum += luma * luma;
      hash ^= red + green * 3 + blue * 7;
      hash = Math.imul(hash, 16777619) >>> 0;
    }

    const count = width * height;
    const mean = lumaSum / count;
    const variance = lumaSquareSum / count - mean * mean;

    return {
      found: true,
      context: true,
      drawingBuffer: {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
      },
      sampledPixels: count,
      coloredPixels,
      darkPixels,
      brightPixels,
      lumaVariance: Math.round(variance),
      hash,
    };
  });
}

try {
  await page.goto(`${baseUrl}/components/liquid-vinyl`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1800);

  const desktopBefore = await canvasStats();
  await page.screenshot({ path: "/tmp/liquid-vinyl-desktop.png" });
  await page.mouse.move(1120, 610);
  await page.waitForTimeout(500);
  const desktopAfter = await canvasStats();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const mobile = await canvasStats();
  const mobileLayout = await page.evaluate(() => ({
    viewport: {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    scroll: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
  }));
  await page.screenshot({ path: "/tmp/liquid-vinyl-mobile.png" });

  await page.setViewportSize({ width: 960, height: 1200 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const reveals = Array.from(document.querySelectorAll(".am-reveal"));
    if (reveals[0] instanceof HTMLElement) reveals[0].style.display = "none";
    if (reveals[1] instanceof HTMLElement) {
      reveals[1].style.padding = "0";
      reveals[1].style.animation = "none";
      reveals[1].style.opacity = "1";
      reveals[1].style.transform = "none";
    }
    document.querySelectorAll("nextjs-portal").forEach((portal) => portal.remove());
  });
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: resolve("public/previews/liquid-vinyl.png"),
    clip: { x: 0, y: 0, width: 960, height: 1200 },
  });

  const result = {
    desktop: {
      before: desktopBefore,
      after: desktopAfter,
      animationChanged: desktopBefore.hash !== desktopAfter.hash,
      screenshot: "/tmp/liquid-vinyl-desktop.png",
    },
    mobile: {
      canvas: mobile,
      layout: mobileLayout,
      screenshot: "/tmp/liquid-vinyl-mobile.png",
      noHorizontalOverflow: mobileLayout.scroll.width === mobileLayout.viewport.width,
    },
    preview: resolve("public/previews/liquid-vinyl.png"),
    consoleIssues: consoleIssues.filter(
      (issue) => !issue.text.includes("GPU stall due to ReadPixels"),
    ),
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
