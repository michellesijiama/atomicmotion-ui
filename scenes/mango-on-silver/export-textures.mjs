import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import ts from "typescript";
import sharp from "sharp";

const source = await readFile(new URL("../../components/play/bead-club/bead-club.tsx", import.meta.url), "utf8");
const file = ts.createSourceFile("bead-club.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = file.statements.flatMap((statement) =>
  ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
);
const initializer = (name) => declarations.find((declaration) => declaration.name.getText(file) === name)?.initializer;
const functions = ["terryGrainSurface", "physicalMaterials"].map((name) => {
  const declaration = file.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  if (!declaration) throw new Error(`Bead Club no longer defines ${name}`);
  return declaration.getText(file);
});
const pattern = JSON.parse(initializer("cakePatterns").getText(file))["guava-crepe-cake"];
const base = JSON.parse(await readFile(new URL("./flat-base.json", import.meta.url), "utf8"));
pattern.rows.splice(base.startRow, base.rows.length, ...base.rows);
const mangoPalette = JSON.parse(await readFile(new URL("./mango-palette.json", import.meta.url), "utf8"));
if (mangoPalette.length !== pattern.palette.length) throw new Error("Mango colors must match the Bead Club palette slots");
pattern.palette = mangoPalette;
const grid = initializer("GRID").getText(file);
const program = ts.transpileModule(`
  const GRID = ${grid};
  let terrySurface;
  ${functions.join("\n")}
  const pattern = ${JSON.stringify(pattern)};
  const art = { beads: pattern.rows.flatMap((row, y) => [...row].flatMap((cell, x) =>
    cell === "." ? [] : [{ x, y, color: pattern.palette[parseInt(cell, 24)] }],
  )) };
  const { faces: [face] } = physicalMaterials(art);
  // Pad the unused pixels with the closest cake color to keep filtered edge pixels clean.
  // The occupied cells and all relief and glint maps retain their original UI pixels.
  const canvas = face.map.image;
  const context = canvas.getContext("2d");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const original = image.data.slice();
  const pitch = canvas.width / GRID.w;
  for (let row = 0; row < GRID.h; row++) {
    for (let column = 0; column < GRID.w; column++) {
      if (pattern.rows[row][column] !== ".") continue;
      const neighbors = art.beads.filter((bead) => Math.abs(bead.x - column) <= 1 && Math.abs(bead.y - row) <= 1);
      if (!neighbors.length) continue;
      for (let y = row * pitch; y < (row + 1) * pitch; y++) {
        for (let x = column * pitch; x < (column + 1) * pitch; x++) {
          let closest;
          let distance = Infinity;
          for (const bead of neighbors) {
            const sx = Math.min((bead.x + 1) * pitch - 2, Math.max(bead.x * pitch + 1, x));
            const sy = Math.min((bead.y + 1) * pitch - 2, Math.max(bead.y * pitch + 1, y));
            const candidate = (sx - x) ** 2 + (sy - y) ** 2;
            if (candidate < distance) {
              closest = (sy * canvas.width + sx) * 4;
              distance = candidate;
            }
          }
          image.data.set(original.subarray(closest, closest + 4), (y * canvas.width + x) * 4);
        }
      }
    }
  }
  context.putImageData(image, 0, 0);
  return Object.fromEntries([
    ["color", face.map], ["terry-normal", face.normalMap],
    ["glints", face.clearcoatMap], ["glint-normal", face.clearcoatNormalMap],
  ].map(([name, texture]) => [name, texture.image.toDataURL("image/png").split(",")[1]]));
`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const maps = await page.evaluate((program) => {
    // The UI functions only need the CanvasTexture and material constructors to carry their inputs.
    const THREE = {
      CanvasTexture: class { constructor(image) { this.image = image; } },
      MeshPhysicalMaterial: class { constructor(properties) { Object.assign(this, properties); } },
      Color: class {},
      Vector2: class {},
    };
    return Function("THREE", program)(THREE);
  }, program);
  const directory = new URL("./textures/", import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [name, base64] of Object.entries(maps)) {
    const image = sharp(Buffer.from(base64, "base64")).removeAlpha();
    const optimized = name.endsWith("normal")
      ? await image.resize(name === "terry-normal" ? 1024 : 960).webp({ quality: 93, effort: 6, smartSubsample: true }).toBuffer()
      : await image.webp({ lossless: true, effort: 6 }).toBuffer();
    await writeFile(new URL(`${name}.webp`, directory), optimized);
  }
} finally {
  await browser.close();
}
