// Export the printed faces of the web stickers at 3× from the live demo.
// Run against the local gallery before updating the Swift package resources.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArrowLeft, Dices, File, Folder, Moon, Sun, Trash2 } from "lucide-react";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const output = new URL("../swiftui/Sources/AtomicMotionUI/Stickers/", import.meta.url);
const design = new URL("../swiftui/Sources/AtomicMotionUI/Design/", import.meta.url);
await mkdir(output, { recursive: true });
await mkdir(design, { recursive: true });
const stickerSource = await readFile(new URL("../components/play/sticker-peel/sticker-peel.tsx", import.meta.url), "utf8");
const maxSums = new Map([...stickerSource.matchAll(/id: "([^"]+)",\s+label: "[^"]+",[\s\S]*?maxSum: (\d+),/g)]
  .map(([, id, value]) => [id, Number(value)]));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, reducedMotion: "reduce" });
  await page.goto(new URL("/components/sticker-peel", base).href);
  const collections = [
    ["Cosy days", "tea-first"], ["Soft words", "smile-cloud"],
    ["Outside", "wander"], ["Oil paintings", "carousel"],
  ];
  const groups = [];

  for (const [name, cover] of collections) {
    const menu = page.getByRole("button", { name: /^Sticker collections/ });
    if (!(await menu.getAttribute("aria-label")).includes(`${name} selected`)) {
      await menu.click();
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: `Sticker collections, ${name} selected` }).waitFor();

    const buttons = page.getByRole("button", { name: /sticker in the tray/ });
    if (await buttons.count() !== 10) throw new Error(`Expected 10 stickers in ${name}`);
    const stickers = [];

    for (const button of await buttons.all()) {
      const { id, name: label, png } = await button.evaluate(async (element) => {
        const svg = element.querySelector("svg");
        const front = svg.querySelector(":scope > g");
        const shared = [...document.querySelectorAll("filter[id]")].filter((filter) => !svg.contains(filter));
        const id = svg.querySelector("clipPath").id.replace(/^sp[^-]+-/, "").replace(/-cm$/, "");

        const clone = svg.cloneNode(false);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", "300");
        clone.setAttribute("height", "300");
        clone.removeAttribute("class");

        const defs = document.createElementNS(svg.namespaceURI, "defs");
        shared.forEach((filter) => defs.append(filter.cloneNode(true)));
        clone.append(defs);
        const art = front.cloneNode(true);
        art.removeAttribute("clip-path");
        clone.append(art);

        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 300;
          canvas.getContext("2d").drawImage(image, 0, 0);
          return {
            id,
            name: element.getAttribute("aria-label").split(" sticker in the tray")[0],
            png: canvas.toDataURL("image/png").split(",")[1],
          };
        } finally {
          URL.revokeObjectURL(url);
        }
      });
      await writeFile(new URL(`${id}.png`, output), Buffer.from(png, "base64"));
      const maxSum = maxSums.get(id);
      if (!maxSum) throw new Error(`Missing peel geometry for ${id}`);
      stickers.push({ id, name: label, maxSum });
    }
    groups.push({ name, cover, stickers });
  }

  const icons = {
    back: ArrowLeft, random: Dices, paper: File, folder: Folder, moon: Moon, sun: Sun, bin: Trash2,
  };
  for (const [name, Icon] of Object.entries(icons)) {
    const markup = renderToStaticMarkup(createElement(Icon, {
      size: 72,
      color: "#000",
      fill: name === "paper" || name === "folder" ? "currentColor" : "none",
      xmlns: "http://www.w3.org/2000/svg",
    }));
    const png = await page.evaluate(async (svg) => {
      const image = new Image();
      image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 72;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    }, markup);
    await writeFile(new URL(`sticker-${name}.png`, design), Buffer.from(png, "base64"));
  }

  await writeFile(new URL("collections.json", output), JSON.stringify(groups, null, 2) + "\n");
  console.log(`Exported ${groups.flatMap(({ stickers }) => stickers).length} SwiftUI sticker images.`);
} finally {
  await browser.close();
}
