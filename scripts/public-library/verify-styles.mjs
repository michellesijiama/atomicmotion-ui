#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const result = await postcss([tailwind()]).process('@import "tailwindcss";\n@source "./components";\n', { from: resolve("verification.css") });
assert.ok(result.css.includes(".h-full"), "Component layout utilities were not compiled");
assert.ok(result.css.includes("container-type: inline-size"), "Tailwind container queries were not compiled");
assert.equal(result.warnings().length, 0, "Tailwind compilation produced warnings");
console.log("Tailwind CSS 4 compiled the free components successfully.");
