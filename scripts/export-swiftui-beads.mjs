// Export the rendered cake faces and menu copy from the React implementation.
// Run against the local gallery before updating the Swift package resources.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import ts from "typescript";

const base = process.argv[2] ?? "http://localhost:3100";
const output = new URL("../swiftui/Sources/AtomicMotionUI/Beads/", import.meta.url);
const source = await readFile(new URL("../components/play/bead-club/bead-club.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("bead-club.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ast.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations]);
const initializer = (name) => declarations.find((declaration) => declaration.name.getText(ast) === name)?.initializer;
const menu = initializer("cakeMenu");
if (!menu || !ts.isArrayLiteralExpression(menu)) throw new Error("Missing Bead Club menu");
const patterns = JSON.parse(initializer("cakePatterns").getText(ast));
const cakes = menu.elements.map((item) => {
  if (!ts.isObjectLiteralExpression(item)) throw new Error("Expected a cake object");
  const cake = Object.fromEntries(item.properties.map((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) {
      throw new Error("Expected a cake field with a string value");
    }
    return [property.name.getText(ast), property.initializer.text];
  }));
  // Use the same cells and square-camera framing as the Three.js renderer.
  const glints = patterns[cake.id].rows.flatMap((row, y) => [...row].flatMap((cell, x) => {
    const seed = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    if (cell === "." || seed % 19 !== 0) return [];
    return [{ x: (x + 0.5 - 20) / 45 + 0.5, y: (y + 0.5 - 21) / 45 + 0.5, phase: (seed % 628) / 100 }];
  }));
  return { ...cake, glints };
});

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.BEAD_EXPORT_CHROME ? { executablePath: process.env.BEAD_EXPORT_CHROME } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 2 });
  await page.goto(new URL("/components/bead-club", base).href);
  const cards = page.locator(".bc-art-3d");
  if (await cards.count() !== cakes.length) throw new Error("Cake menu and rendered artwork differ");
  await page.waitForFunction(
    (count) => document.querySelectorAll('.bc-art-3d[data-render-mode="physical"]').length === count,
    cakes.length,
  );
  for (const [index, cake] of cakes.entries()) {
    const png = await cards.nth(index).evaluate((art, expectedName) => {
      if (!art.getAttribute("aria-label")?.startsWith(expectedName + ",")) throw new Error("Cake order changed");
      return art.querySelector("canvas").toDataURL("image/png").split(",")[1];
    }, cake.name);
    await writeFile(new URL(`${cake.id}.png`, output), Buffer.from(png, "base64"));
  }
  await writeFile(new URL("cakes.json", output), JSON.stringify(cakes, null, 2) + "\n");
  await writeFile(new URL("BeadArtwork-TERMS.txt", output), await readFile(
    new URL("../public/components/bead-club/TERMS.txt", import.meta.url),
  ));
  console.log(`Exported ${cakes.length} SwiftUI cake images.`);
} finally {
  await browser.close();
}
