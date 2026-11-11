#!/usr/bin/env node
// Real browser checks for viewport overflow and reachable expanded controls.
// With no RESPONSIVE_BASE_URL, run the production build on a temporary port.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { readRegistry } from "./lib/registry.mjs";
import { readComponentData } from "./component-data.mjs";


let base = process.env.RESPONSIVE_BASE_URL;
let server;
let browser;
let logs = "";
const evidence = process.env.RESPONSIVE_EVIDENCE_DIR;
const report = [];
const errors = [];

async function visit(page, path) {
  console.log(`Visit ${path}`);
  const response = await page.goto(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  await page.locator('a[aria-label="AtomicMotion"]').waitFor();
  // Site entrance and disclosure animations must finish before measuring.
  await page.waitForTimeout(1300);
}

async function checkWidth(page, label) {
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(sizes.scrollWidth <= sizes.width + 1, `${label}: horizontal overflow ${JSON.stringify(sizes)}`);
  report.push({ page: label, ...sizes });
}

async function measureReachability(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const clipped = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const box = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX) && (rect.left < box.left - 2 || rect.right > box.right + 2)) clipped.push("horizontal");
      if (["hidden", "clip", "auto", "scroll"].includes(style.overflowY) && (rect.top < box.top - 2 || rect.bottom > box.bottom + 2)) clipped.push("vertical");
    }
    return { clipped, visible: rect.width > 0 && rect.height > 0 && rect.top >= -2 && rect.bottom <= innerHeight + 2 };
  });
}

async function reachable(locator, label, { click = false, measurement } = {}) {
  let result = measurement ?? await measureReachability(locator);
  // Already-visible controls need no scrolling. Waiting for scroll stability
  // on every fixed header button can stall CPU-only animated browser runs.
  if (!result.visible || result.clipped.length > 0) {
    await locator.scrollIntoViewIfNeeded();
    result = await measureReachability(locator);
  }
  assert.ok(result.visible && result.clipped.length === 0, `${label}: inaccessible control ${JSON.stringify(result)}`);
  if (click) await locator.click();
}

async function capture(page, name) {
  if (!evidence) return;
  // Exclude the development-only Next toolbar from evidence.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `${evidence}/${name}.png` });
}

try {
  if (evidence) await mkdir(evidence, { recursive: true });
  if (!base) {
    const listener = createServer();
    listener.listen(0, "127.0.0.1");
    await once(listener, "listening");
    const port = listener.address().port;
    await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
    server.on("error", (error) => { logs += error.message; });
    for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { logs = (logs + chunk).slice(-4000); });
    base = `http://127.0.0.1:${port}`;
  }
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server && server.exitCode !== null) throw new Error(`Production server stopped: ${logs}`);
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(5000) });
      await response.arrayBuffer();
      ready = response.ok;
      if (ready) break;
    } catch { /* Await startup below. */ }
    await delay(100);
  }
  assert.ok(ready, `Server did not become ready: ${logs}`);
  // Use the full Chromium headless renderer: headless-shell can spend minutes
  // rasterising the animated gallery on CPU-only CI runners. Limit SwiftShader
  // to WebGL so ordinary SVG/CSS painting does not use the emulated GPU.
  browser = await chromium.launch({
    channel: "chromium",
    args: ["--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const { entries } = readRegistry();
  const { studioModels } = readComponentData("src/lib/model-registry.ts");
  const { hasSwiftUI } = readComponentData("src/lib/swiftui-components.ts");
  const homeWidths = [320, 375, 390, 430, 480, 639, 640, 641, 768, 960, 1007, 1008, 1023, 1024, 1280, 1366, 1920, 2560];
  // Limit category/header queries to their controls, rather than repeatedly
  // walking thousands of animated SVG nodes inside the gallery previews.
  const categories = page.locator('section[aria-label="UI components"] > div').first();
  const homeAbout = page.locator('nav[aria-label="Primary"]').getByRole("button", { name: "About", exact: true });
  await visit(page, "/");
  for (const width of homeWidths) {
    console.log(`Check home width ${width}`);
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(200);
    const all = categories.getByRole("button", { name: "All", exact: true });
    const filterStrip = all.locator("..");
    // These reads are independent. Queue them together so the animated page
    // need not flush a fresh layout/paint for each separate browser round trip.
    const [, filtersFit, aboutMeasurement, allMeasurement] = await Promise.all([
      checkWidth(page, "home"),
      filterStrip.evaluate((element) => element.scrollWidth <= element.clientWidth),
      measureReachability(homeAbout),
      measureReachability(all),
    ]);
    assert.ok(filtersFit, `home ${width}: category buttons fit without horizontal scrolling`);
    await reachable(homeAbout, `home ${width}: About`, { measurement: aboutMeasurement });
    await reachable(all, `home ${width}: All`, { measurement: allMeasurement });
    if ([768, 1280].includes(width)) {
      await reachable(categories.getByRole("button").last(), `home ${width}: final category is clickable`, { click: true });
      await all.click();
    }
    if ([390, 1280].includes(width)) await capture(page, `home-${width}`);
  }
  // Active filters survive changing between one and several card columns.
  const navigation = categories.getByRole("button", { name: "Navigation", exact: true });
  await navigation.click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await navigation.getAttribute("aria-pressed"), "true");
  const menuCard = page.getByRole("link", { name: "Soft Menu Reveal", exact: true });
  await menuCard.scrollIntoViewIfNeeded();
  const menuArtwork = menuCard.locator("xpath=preceding-sibling::*[1]");
  await menuArtwork.locator("button").first().waitFor({ state: "attached" });
  assert.equal(await menuArtwork.getAttribute("inert"), "", "the live artwork cannot intercept card interactions");
  await menuCard.click();
  await page.waitForURL("**/components/soft-menu-reveal");

  const viewports = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }];
  console.log("Home widths, preserved filter selection and live card navigation: OK");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const { id, title } of entries) {
      await visit(page, `/components/${id}`);
      await checkWidth(page, id);
      await reachable(page.getByRole("button", { name: `Details about ${title}`, exact: true }), `${id}: details button`);
      if (viewport.width === 320) {
        await page.getByRole("button", { name: `Details about ${title}`, exact: true }).click();
        await page.waitForTimeout(650);
        const actions = hasSwiftUI(id) ? ["React", "Swift"] : ["Copy for AI"];
        for (const action of actions) {
          await reachable(page.getByRole("button", { name: action, exact: true }), `${id}: ${action} source action`);
        }
        await reachable(page.getByRole("button", { name: "Close", exact: true }), `${id}: close details`, { click: true });
        await page.waitForTimeout(650);
      }
      if (viewport.width === 390) await capture(page, id);
    }
    console.log(`All component routes at ${viewport.width}×${viewport.height}: OK`);
    await visit(page, "/3d-studio");
    await checkWidth(page, "3D Studio");
    assert.equal(await page.getByRole("button", { name: "All", exact: true }).count(), 0, "Studio has no category filter");
    for (const model of studioModels) {
      const card = page.locator(`a[href="/3d-studio/${model.id}"]`);
      const filled = await card.locator("img").evaluate((image) => {
        const frame = image.closest("picture").parentElement.getBoundingClientRect();
        const bounds = image.getBoundingClientRect();
        return getComputedStyle(image).objectFit === "cover" && Math.abs(frame.width - bounds.width) < 1 && Math.abs(frame.height - bounds.height) < 1;
      });
      assert.ok(filled, `${model.id}: artwork fills its gallery card`);
      await visit(page, `/3d-studio/${model.id}`);
      await checkWidth(page, model.id);
      assert.equal(await page.getByRole("button", { name: `Details about ${model.title}`, exact: true }).count(), 0, `${model.id}: details are inline`);
      const order = await page.locator('main').evaluate((main) => {
        const image = main.querySelector('img').getBoundingClientRect();
        const details = main.querySelector('section[aria-labelledby="model-title"]').getBoundingClientRect();
        return { imageBottom: image.bottom, detailsTop: details.top };
      });
      assert.ok(order.imageBottom <= order.detailsTop, `${model.id}: information follows artwork on mobile`);
      await reachable(page.getByRole("link", { name: "Download Blender file", exact: true }), `${model.id}: Blender download`);
      assert.equal(await page.getByRole("button", { name: "Copy for AI", exact: true }).count(), 0, `${model.id}: no AI action`);
      await reachable(page.getByRole("link", { name: model.gif ? "Download GIF" : "Download PNG", exact: true }), `${model.id}: preview download`);
      assert.equal(await page.getByRole("link", { name: "License", exact: true }).count(), 0, `${model.id}: no license action`);
      if (viewport.width === 390) await capture(page, model.id);
      await visit(page, "/3d-studio");
    }
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  for (const model of studioModels) {
    await visit(page, `/3d-studio/${model.id}`);
    const columns = await page.locator('main').evaluate((main) => {
      const image = main.querySelector('img').getBoundingClientRect();
      const details = main.querySelector('section[aria-labelledby="model-title"]').getBoundingClientRect();
      return { imageRight: image.right, detailsLeft: details.left, imageTop: image.top, imageBottom: image.bottom, detailsTop: details.top, detailsBottom: details.bottom };
    });
    assert.ok(columns.imageRight < columns.detailsLeft, `${model.id}: artwork is left of information`);
    assert.ok(columns.imageTop < columns.detailsBottom && columns.detailsTop < columns.imageBottom, `${model.id}: columns sit side by side`);
    await reachable(page.getByRole("link", { name: "Download Blender file", exact: true }), `${model.id}: desktop download`);
    await reachable(page.getByRole("link", { name: model.gif ? "Download GIF" : "Download PNG", exact: true }), `${model.id}: desktop preview download`);
    await checkWidth(page, `${model.id}: desktop columns`);
    await capture(page, `${model.id}-desktop-columns`);
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await visit(page, "/components/filter-dropdown-reveal");
    const typology = page.getByRole("button", { name: /^Typology/ });
    await typology.click();
    await page.waitForTimeout(750);
    await reachable(page.getByRole("button", { name: "Sports Infrastructure", exact: true }), "filter: full long label");
    await reachable(page.getByRole("button", { name: "Transportation", exact: true }), "filter: last option", { click: true });
    assert.equal(await typology.getAttribute("aria-expanded"), "false");
    await typology.click();
    await page.waitForTimeout(750);
    await page.keyboard.press("Escape");
    assert.equal(await typology.getAttribute("aria-expanded"), "false");

    await visit(page, "/components/soft-menu-reveal");
    await reachable(page.getByRole("button", { name: "Menu", exact: true }), "soft menu: trigger", { click: true });
    await page.waitForTimeout(900);
    await reachable(page.getByRole("button", { name: "Journal 03", exact: true }), "soft menu: last row");
    await reachable(page.getByRole("link", { name: "hello@atomicmotion.dev" }), "soft menu: contact");
    await reachable(page.getByRole("button", { name: "Close", exact: true }), "soft menu: close", { click: true });

    await visit(page, "/components/codex-sidebar-reveal");
    await reachable(page.getByRole("heading", { name: "Website Creation" }), "sidebar: workspace title");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await page.waitForTimeout(700);
    await reachable(page.getByText("Settings", { exact: true }), "sidebar: last item");
    await capture(page, `sidebar-open-${viewport.width}`);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();

    await visit(page, "/components/gemini-live");
    for (const name of ["Open transcript panel", "Pause", "Keyboard"]) await reachable(page.getByRole("button", { name, exact: true }), `Gemini: ${name}`, { click: true });

    await visit(page, "/components/coffee-gauge");
    await page.getByRole("button", { name: "Log a drink" }).click();
    await page.waitForTimeout(500);
    await reachable(page.getByRole("button", { name: "One more Cappuccino" }), "coffee: final log row", { click: true });

    await visit(page, "/components/blossom-light");
    const adaptive = page.getByRole("switch", { name: "Adaptive mode" });
    const previousAdaptive = await adaptive.getAttribute("aria-checked");
    await reachable(adaptive, "blossom: adaptive switch", { click: true });
    assert.notEqual(await adaptive.getAttribute("aria-checked"), previousAdaptive);
    await reachable(page.getByRole("slider", { name: "Brightness" }), "blossom: brightness");

    await visit(page, "/components/stamp-tracker");
    for (const name of ["Day", "Week", "Month"]) {
      const tab = page.getByRole("tab", { name, exact: true });
      await reachable(tab, `stamp: ${name}`, { click: true });
      await page.waitForTimeout(600);
      assert.equal(await tab.getAttribute("aria-selected"), "true");
      await reachable(page.getByRole("button", { name: /Water,.*not stamped/ }).first(), `stamp: ${name} stamp`, { click: true });
    }
    console.log(`Expanded controls at ${viewport.width}×${viewport.height}: OK`);
  }

  // Container thresholds: root width excludes page and component padding.
  for (const [id, widths] of [["filter-dropdown-reveal", [863, 864, 865]], ["codex-sidebar-reveal", [665, 666, 667]]]) {
    await visit(page, `/components/${id}`);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      const trigger = page.getByRole("button", { name: id.startsWith("filter") ? /^Typology/ : "Expand sidebar" });
      await trigger.click();
      await page.waitForTimeout(750);
      await reachable(id.startsWith("filter") ? page.getByRole("button", { name: "Transportation", exact: true }) : page.getByText("Settings", { exact: true }), `${id}: threshold ${width}`);
      await checkWidth(page, `${id}: threshold`);
      if (id.startsWith("filter")) await page.keyboard.press("Escape");
      else await page.getByRole("button", { name: "Collapse sidebar" }).click();
      await page.waitForTimeout(650);
    }
  }
  for (const height of [499, 500, 501]) {
    await page.setViewportSize({ width: 844, height });
    await visit(page, "/components/soft-menu-reveal");
    await reachable(page.getByRole("button", { name: "Menu", exact: true }), `soft menu: height ${height}`, { click: true });
    await page.waitForTimeout(900);
    await reachable(page.getByRole("button", { name: "Close", exact: true }), `soft menu: close at height ${height}`, { click: true });
  }

  for (const id of ["filter-dropdown-reveal", "codex-sidebar-reveal"]) {
    await page.setViewportSize({ width: 320, height: 568 });
    await visit(page, `/components/${id}`);
    await page.getByRole("button", { name: id.startsWith("filter") ? /^Typology/ : "Expand sidebar" }).click();
    await page.waitForTimeout(750);
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.waitForTimeout(250);
    assert.equal(await page.getByRole("button", { name: id.startsWith("filter") ? /^Typology/ : "Collapse sidebar" }).getAttribute("aria-expanded"), "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await reachable(id.startsWith("filter") ? page.getByRole("button", { name: "Transportation", exact: true }) : page.getByText("Settings", { exact: true }), `${id}: preserved disclosure after resize`);
  }
  assert.deepEqual(errors, [], "browser runtime errors");
  console.log(`verify-responsive: OK (${report.length} page/viewport checks, ${entries.length} routes, expanded menus, scroll endings, details, keyboard and selection)`);
} finally {
  if (evidence) await writeFile(`${evidence}/report.json`, JSON.stringify({ report, errors }, null, 2));
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill("SIGTERM");
    const timeout = setTimeout(() => server.kill("SIGKILL"), 5000);
    timeout.unref();
    await exited;
    clearTimeout(timeout);
  }
}
