#!/usr/bin/env node
// Traces a source image into the dot grid that components/data/halftone-bloom
// prints, and splices the result into the component between its
// `// <trace>` / `// </trace>` markers.
//
// Why bake the grid in rather than load the image at runtime: every component
// in this repo claims to be one self-contained file, and a component that
// fetches a PNG is not that — it drags an asset and its licence along with it
// (see RequiredAsset in src/lib/component-registry.ts). A traced grid is data,
// it is small, and it travels inside the file that uses it.
//
// Decoding runs in headless Chromium rather than through an image library,
// because Playwright is already a devDependency here and sharp is not.
//
//   node scripts/trace-halftone.mjs <image> [--cols 96] [--rows 96] [--colors 8]
//
// The source image is NOT copied into the repo. If it is not your own work,
// record where the artwork came from in ASSETS.md before committing the trace —
// a traced grid is still a derivative of it.
import { readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const COMPONENT = "components/data/halftone-bloom/halftone-bloom.tsx";

const args = process.argv.slice(2);
const imagePath = args.find((a) => !a.startsWith("--"));
if (!imagePath) {
  console.error("usage: node scripts/trace-halftone.mjs <image> [--cols N] [--rows N] [--colors N]");
  process.exit(1);
}
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const COLS = flag("cols", 96);
const ROWS = flag("rows", 96);
const PALETTE_SIZE = flag("colors", 8);

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
const ext = extname(imagePath).toLowerCase();
if (!MIME[ext]) {
  console.error(`unsupported image type: ${ext || "(none)"}`);
  process.exit(1);
}
const dataUrl = `data:${MIME[ext]};base64,${readFileSync(resolve(imagePath)).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();

const traced = await page.evaluate(
  async ({ dataUrl, COLS, ROWS }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Clamped, so a crop box squared up past the edge of the frame reads the
    // edge pixel instead of running off the end of the buffer.
    const at = (x, y) => {
      const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
      const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
      const i = (cy * width + cx) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    // The ground is whatever the four corners agree on. Every photograph of a
    // subject against a flat field has that property, and it beats asking the
    // caller to name a colour.
    const corners = [
      at(2, 2),
      at(width - 3, 2),
      at(2, height - 3),
      at(width - 3, height - 3),
    ];
    const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / corners.length);
    const away = (r, g, b) => Math.hypot(r - bg[0], g - bg[1], b - bg[2]) / 441.67;

    // Frame the subject before sampling, so the grid spends its cells on the
    // moon rather than on the empty sky around it.
    let x0 = width;
    let y0 = height;
    let x1 = 0;
    let y1 = 0;
    const step = Math.max(1, Math.floor(Math.min(width, height) / 400));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const [r, g, b] = at(x, y);
        if (away(r, g, b) > 0.16) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 <= x0 || y1 <= y0) {
      x0 = 0;
      y0 = 0;
      x1 = width - 1;
      y1 = height - 1;
    }
    // A little air.
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;

    // Square the box about its own centre. This is the step that keeps a round
    // subject round: the box is mapped onto a COLS×ROWS grid, so any mismatch
    // between the box's aspect and the grid's is a stretch applied to the whole
    // picture — a moon comes out an egg. `at` clamps, so a box that now reaches
    // past the frame just repeats the edge, which out here is only sky.
    const side = Math.max(x1 - x0, y1 - y0);
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;
    x0 = Math.round(midX - side / 2);
    x1 = Math.round(midX + side / 2);
    y0 = Math.round(midY - side / 2);
    y1 = Math.round(midY + side / 2);

    const boxW = x1 - x0 + 1;
    const boxH = y1 - y0 + 1;

    // Resample the crop down to the grid through the browser's own filter
    // rather than box-averaging it by hand.
    //
    // Averaging each cell over its own block of source pixels sounds equivalent
    // and is not: a JPEG is compressed in 8x8 blocks, and whenever the cell
    // size lands near a multiple of 8 those block boundaries beat against the
    // sampling grid and print as banding straight across the picture. A proper
    // downscale filter is wider than one cell and washes that out.
    const small = document.createElement("canvas");
    small.width = COLS;
    small.height = ROWS;
    const sctx = small.getContext("2d", { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    // Anything the squared box reaches beyond the frame is sky, so start from
    // the ground colour and paint the real pixels over it.
    sctx.fillStyle = `rgb(${bg.map((c) => Math.round(c)).join(",")})`;
    sctx.fillRect(0, 0, COLS, ROWS);

    const sx0 = Math.max(0, x0);
    const sy0 = Math.max(0, y0);
    const sx1 = Math.min(width, x1 + 1);
    const sy1 = Math.min(height, y1 + 1);
    if (sx1 > sx0 && sy1 > sy0) {
      sctx.drawImage(
        img,
        sx0,
        sy0,
        sx1 - sx0,
        sy1 - sy0,
        ((sx0 - x0) / boxW) * COLS,
        ((sy0 - y0) / boxH) * ROWS,
        ((sx1 - sx0) / boxW) * COLS,
        ((sy1 - sy0) / boxH) * ROWS,
      );
    }
    const sd = sctx.getImageData(0, 0, COLS, ROWS).data;

    const out = [];
    let peak = 0;
    for (let i = 0; i < COLS * ROWS; i += 1) {
      const r = sd[i * 4];
      const g = sd[i * 4 + 1];
      const b = sd[i * 4 + 2];
      // Tonal distance from the ground. Not a count of differing pixels — that
      // saturates at 1 across anything solid, flattening a bright subject into
      // a silhouette and throwing away every crater inside it.
      const v = away(r, g, b);
      if (v > peak) peak = v;
      out.push({ v, rgb: v > 0.04 ? [r, g, b] : null });
    }

    // Normalise against the brightest cell, so the ramp uses its whole range
    // whatever the exposure of the source.
    if (peak > 0) for (const cell of out) cell.v = Math.min(1, cell.v / peak);
    return { cells: out, bg };
  },
  { dataUrl, COLS, ROWS },
);

await browser.close();

const cells = traced.cells;

/** Median-cut down to a small palette, so the grid encodes as one char a cell. */
function quantise(colors, size) {
  let boxes = [colors];
  while (boxes.length < size) {
    let worst = -1;
    let idx = -1;
    let channel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c += 1) {
        let lo = Infinity;
        let hi = -Infinity;
        for (const p of box) {
          if (p[c] < lo) lo = p[c];
          if (p[c] > hi) hi = p[c];
        }
        if (hi - lo > worst) {
          worst = hi - lo;
          idx = i;
          channel = c;
        }
      }
    });
    if (idx === -1) break;
    const box = boxes[idx].slice().sort((a, b) => a[channel] - b[channel]);
    const mid = box.length >> 1;
    boxes = boxes.filter((_, i) => i !== idx).concat([box.slice(0, mid), box.slice(mid)]);
  }
  return boxes
    .filter((box) => box.length)
    .map((box) => [0, 1, 2].map((c) => Math.round(box.reduce((s, p) => s + p[c], 0) / box.length)));
}

const hex = ([r, g, b]) =>
  `#${[r, g, b].map((n) => Math.round(clamp(n)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const clamp = (n) => Math.min(255, Math.max(0, n));

/**
 * Push a colour away from its own brightness.
 *
 * Mineral colour in a moon photograph is subtle at full size and survives
 * being averaged into one flat dot per cell even less well — traced straight,
 * this comes out grey with a rumour of blue in it. Rotating each cell around
 * its luminance keeps the tone exactly where the trace put it and argues only
 * with the saturation.
 */
function saturate([r, g, b], k) {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [l + (r - l) * k, l + (g - l) * k, l + (b - l) * k].map(clamp);
}

/**
 * Smallest circle enclosing a set of points (Welzl, randomised incremental).
 *
 * This is how the disc is found. A bounding box will not do it: a crescent
 * reaches the terminator horizontally but spans the whole moon vertically, so
 * its box is far taller than wide and its centre sits well inside the real
 * disc. Assume the subject fills the grid and you get a mask circle that is
 * both offset from the photographed limb and larger than it — which draws as
 * two moons, one inside the other. The outer arc of a crescent *is* the limb,
 * so the smallest circle containing the lit cells is the moon itself.
 */
function circleFrom2(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: Math.hypot(a.x - b.x, a.y - b.y) / 2 };
}
function circleFrom3(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const sa = a.x * a.x + a.y * a.y;
  const sb = b.x * b.x + b.y * b.y;
  const sc = c.x * c.x + c.y * c.y;
  const ux = (sa * (b.y - c.y) + sb * (c.y - a.y) + sc * (a.y - b.y)) / d;
  const uy = (sa * (c.x - b.x) + sb * (a.x - c.x) + sc * (b.x - a.x)) / d;
  return { x: ux, y: uy, r: Math.hypot(a.x - ux, a.y - uy) };
}
const inCircle = (c, p) => c && Math.hypot(p.x - c.x, p.y - c.y) <= c.r + 1e-7;

function smallestCircle(points) {
  const pts = points.slice();
  for (let i = pts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  let c = null;
  for (let i = 0; i < pts.length; i += 1) {
    if (inCircle(c, pts[i])) continue;
    c = { x: pts[i].x, y: pts[i].y, r: 0 };
    for (let j = 0; j < i; j += 1) {
      if (inCircle(c, pts[j])) continue;
      c = circleFrom2(pts[i], pts[j]);
      for (let k = 0; k < j; k += 1) {
        if (inCircle(c, pts[k])) continue;
        c = circleFrom3(pts[i], pts[j], pts[k]) ?? c;
      }
    }
  }
  return c;
}

const SATURATION = flag("saturate", 2.2);
for (const cell of cells) if (cell.rgb) cell.rgb = saturate(cell.rgb, SATURATION);

const lit = cells.filter((c) => c.rgb && c.v > 0.12).map((c) => c.rgb);
if (lit.length === 0) {
  console.error("traced nothing — every cell matched the ground colour");
  process.exit(1);
}
const palette = quantise(lit, PALETTE_SIZE);

const nearest = (rgb) => {
  let best = 0;
  let bestD = Infinity;
  palette.forEach((p, i) => {
    const d = (p[0] - rgb[0]) ** 2 + (p[1] - rgb[1]) ** 2 + (p[2] - rgb[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
};

// Two parallel strings, one character per cell: ink weight 0-9, and an index
// into the palette. Strings rather than arrays because 17,000 cells of JSON is
// 280 KB of source and 17,000 characters is 17 KB.
//
// The palette index is base36, NOT String(index): a palette of more than ten
// entries makes index 10 two characters wide, which shunts every cell after it
// one place along and misaligns the colours against the grid from that point
// on. It shows up as streaks and wrong hues, not as an error.
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
if (palette.length > DIGITS.length) {
  console.error(`palette of ${palette.length} exceeds the ${DIGITS.length} single-character indices`);
  process.exit(1);
}
let levels = "";
let colors = "";
for (const cell of cells) {
  const v = Math.min(9, Math.round(cell.v * 9));
  levels += String(v);
  colors += v === 0 || !cell.rgb ? "0" : DIGITS[nearest(cell.rgb)];
}
if (levels.length !== COLS * ROWS || colors.length !== COLS * ROWS) {
  console.error(
    `encoded ${levels.length}/${colors.length} characters for ${COLS * ROWS} cells`,
  );
  process.exit(1);
}

function chunk(s) {
  const out = [];
  for (let i = 0; i < s.length; i += COLS) out.push(s.slice(i, i + COLS));
  return out;
}

// The subject's disc, measured off the trace rather than assumed. `--disc 0`
// turns it off for subjects that are not round, and the component then falls
// back to the whole grid.
const DISC_LEVEL = flag("disc", 0.3);
const subject = [];
if (DISC_LEVEL > 0) {
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i].v >= DISC_LEVEL) {
      subject.push({ x: (i % COLS) + 0.5, y: Math.floor(i / COLS) + 0.5 });
    }
  }
}
const disc = subject.length > 2 ? smallestCircle(subject) : null;

const block = [
  `const TRACE_COLS = ${COLS};`,
  `const TRACE_ROWS = ${ROWS};`,
  disc
    ? `const TRACE_DISC = { x: ${disc.x.toFixed(2)}, y: ${disc.y.toFixed(2)}, r: ${disc.r.toFixed(2)} };`
    : `const TRACE_DISC = null;`,
  `const TRACE_PALETTE = [`,
  ...palette.map((p) => `  "${hex(p)}",`),
  `];`,
  `const TRACE_LEVELS =`,
  ...chunk(levels).map((line) => `  "${line}" +`),
  `  "";`,
  `const TRACE_COLORS =`,
  ...chunk(colors).map((line) => `  "${line}" +`),
  `  "";`,
].join("\n");

const source = readFileSync(COMPONENT, "utf8");
const start = source.indexOf("// <trace>");
const end = source.indexOf("// </trace>");
if (start === -1 || end === -1) {
  console.error(`${COMPONENT} has no // <trace> … // </trace> markers to splice into`);
  process.exit(1);
}
writeFileSync(
  COMPONENT,
  `${source.slice(0, start)}// <trace> generated by scripts/trace-halftone.mjs — do not edit by hand\n${block}\n${source.slice(end)}`,
);

console.log(
  [
    `traced ${imagePath} -> ${COLS}x${ROWS}`,
    `ground ${hex(traced.bg)}`,
    disc
      ? `disc centre ${disc.x.toFixed(1)},${disc.y.toFixed(1)} radius ${disc.r.toFixed(1)} (from ${subject.length} lit cells)`
      : "disc none",
    `palette ${palette.map(hex).join(" ")}`,
  ].join("\n"),
);
