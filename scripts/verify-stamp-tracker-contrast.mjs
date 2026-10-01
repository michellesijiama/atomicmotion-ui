import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Checks the Stamp Tracker's colours against WCAG 2.x: card text (4.5:1), the grey subtitle at 0.8 opacity (3:1, it
// is 24px semibold, so "large text"), the day rings at 0.8 opacity (3:1, non-text UI), and the Day / Week / Month
// switch's inactive labels on its track over the black screen (4.5:1). Exits non-zero if anything falls short.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "components/data-visualization/stamp-tracker/stamp-tracker.tsx"), "utf8");

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

const failures = [];
const check = (name, value, min) => {
  const ok = value >= min;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${value.toFixed(2)}:1 (needs ${min})`);
  if (!ok) failures.push(name);
};

const habits = [...source.matchAll(/id: "(\w+)",[^}]*?card: "(#[0-9A-Fa-f]{6})", text: "(#[0-9A-Fa-f]{6})"/g)];
if (habits.length === 0) throw new Error("No habits found in the Stamp Tracker source.");
for (const [, id, card, text] of habits) {
  const bg = hex(card);
  const fg = hex(text);
  check(`${id} text on card`, ratio(fg, bg), 4.5);
  check(`${id} subtitle at 0.8`, ratio(over(fg, 0.8, bg), bg), 3);
  check(`${id} ring at 0.8`, ratio(over(fg, 0.8, bg), bg), 3);
}

const screen = source.match(/const SCREEN = "(#[0-9A-Fa-f]{6})"/);
const sw = source.match(/const SWITCH = \{[^}]*?track: "rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)"[^}]*?inactive: "rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)"/s);
if (screen && sw) {
  const track = over([+sw[1], +sw[2], +sw[3]], +sw[4], hex(screen[1]));
  const label = over([+sw[5], +sw[6], +sw[7]], +sw[8], track);
  check("switch inactive label on its track", ratio(label, track), 4.5);
} else {
  failures.push("could not read the switch colours");
}

if (failures.length) {
  console.error(`verify-stamp-tracker-contrast: FAILED (${failures.join(", ")})`);
  process.exit(1);
}
console.log("verify-stamp-tracker-contrast: OK");
