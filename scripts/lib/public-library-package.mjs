import { readFileSync } from "node:fs";
import { readComponentCatalog } from "../component-data.mjs";
import { dependenciesFor } from "../generate-component-readmes.mjs";

// Pin the public verification environment to versions actually tested by the gallery.
export function createPublicLibraryPackage() {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const pinned = (names) => Object.fromEntries([...new Set(names)].sort().map((name) => {
    const version = lock.packages[`node_modules/${name}`]?.version;
    if (!version) throw new Error(`Missing tested dependency: ${name}`);
    return [name, version];
  }));
  const dependencies = pinned(["react", "react-dom", ...readComponentCatalog()
    .flatMap(({ codePath }) => dependenciesFor(codePath))]);
  return {
    name: "atomicmotion-free", version: "0.1.0", private: true, license: "MIT",
    description: "Copy-paste AtomicMotion components and their verified dependencies.",
    homepage: "https://atomicmotion.dev",
    scripts: {
      verify: "node scripts/verify-library.mjs",
      "test:copy-paste": "node scripts/verify-copy-paste.mjs",
      "test:styles": "node scripts/verify-styles.mjs",
      check: "npm run verify && npm run test:copy-paste && npm run test:styles && npm audit",
    },
    engines: { node: ">=24 <25" },
    dependencies,
    devDependencies: pinned(["typescript", "@types/react", "@types/react-dom", "@types/three", "tailwindcss", "@tailwindcss/postcss", "postcss"]),
    overrides: JSON.parse(readFileSync("package.json", "utf8")).overrides,
  };
}
