# Window Leaf Shadow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure-code light window-shade leaf-shadow background component and expose it as a copyable AtomicMotion UI entry.

**Architecture:** Create one distributable UI file at `src/components/ui/window-leaf-shadow.tsx`. Register it in `src/lib/component-registry.ts`, render it from `src/app/page.tsx`, list it in `src/components/website/site-index.tsx`, and protect behavior with `scripts/verify-jitter-design-system.mjs`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS utility classes, inline SVG data URI noise, existing Node design verification script.

---

### Task 1: Failing Design Checks

**Files:**
- Modify: `scripts/verify-jitter-design-system.mjs`

- [x] **Step 1: Add file read**

Add:

```js
windowLeafShadow: readIfExists("src/components/ui/window-leaf-shadow.tsx"),
```

to the `files` object.

- [x] **Step 2: Add failing checks**

Add checks requiring:

```js
["window leaf shadow component exists", files.windowLeafShadow.length > 0],
["window leaf shadow exports component", files.windowLeafShadow.includes("export function WindowLeafShadow")],
["window leaf shadow exports tone type", files.windowLeafShadow.includes("export type WindowLeafShadowTone")],
["window leaf shadow exposes grain prop", files.windowLeafShadow.includes("grain = 0.12")],
["window leaf shadow exposes blur prop", files.windowLeafShadow.includes("blur = 9")],
["window leaf shadow defaults to mist tone", files.windowLeafShadow.includes('tone = "mist"')],
["window leaf shadow blends with site background", files.windowLeafShadow.includes("var(--jitter-bg, #f5f5f5)") && files.windowLeafShadow.includes("bg-transparent")],
["window leaf shadow exposes shade opacity prop", files.windowLeafShadow.includes("shadeOpacity = 0")],
["window leaf shadow exposes shadow opacity prop", files.windowLeafShadow.includes("shadowOpacity = 0.52")],
["window leaf shadow exposes interaction prop", files.windowLeafShadow.includes("interactive = true")],
["window leaf shadow exposes wind prop", files.windowLeafShadow.includes("wind = true")],
["window leaf shadow responds to pointer movement", files.windowLeafShadow.includes("onPointerMove") && files.windowLeafShadow.includes("--window-leaf-near-x")],
["window leaf shadow moves leaf clusters independently", files.windowLeafShadow.includes("motion=\"near\"") && files.windowLeafShadow.includes("motion=\"far\"")],
["window leaf shadow includes autonomous wind keyframes", files.windowLeafShadow.includes("@keyframes window-leaf-sway-a") && files.windowLeafShadow.includes("--window-cursor-wind")],
["window leaf shadow avoids standalone branch line", !files.windowLeafShadow.includes("M-40 500") && !files.windowLeafShadow.includes('strokeWidth="28"')],
["window leaf shadow draws SVG leaves", files.windowLeafShadow.includes("<ellipse") && files.windowLeafShadow.includes("<path")],
["window leaf shadow includes shade bands", files.windowLeafShadow.includes("--window-shade-opacity") && files.windowLeafShadow.includes("repeating-linear-gradient")],
["window leaf shadow uses SVG turbulence grain", files.windowLeafShadow.includes("feTurbulence")],
["window leaf shadow avoids external image URLs", !/url\\([\\"']?https?:\\/\\//.test(files.windowLeafShadow)],
["component registry includes window leaf shadow", files.componentRegistry.includes("windowLeafShadow")],
["component registry lists window leaf source path", files.componentRegistry.includes("src/components/ui/window-leaf-shadow.tsx")],
["page imports window leaf shadow", files.page.includes("WindowLeafShadow")],
["site index lists window leaf shadow", files.siteIndex.includes("Window Leaf Shadow")],
```

- [x] **Step 3: Run RED**

Run:

```bash
npm run test:design
```

Expected: FAIL because the component, registry entry, and page usage do not exist yet.

### Task 2: Distributable UI Component

**Files:**
- Create: `src/components/ui/window-leaf-shadow.tsx`

- [x] **Step 1: Implement pure-code component**

Create a self-contained React component that exports:

```ts
export type WindowLeafShadowTone = "linen" | "mist" | "sage";
export type WindowLeafShadowProps = {
  tone?: WindowLeafShadowTone;
  grain?: number;
  blur?: number;
  shadeOpacity?: number;
  shadowOpacity?: number;
  interactive?: boolean;
  wind?: boolean;
  className?: string;
  children?: React.ReactNode;
};
export function WindowLeafShadow(...)
```

Use layered spans and inline SVG for a light base tone, natural leaf silhouettes, shade bands, inline SVG `feTurbulence` grain, and soft falloff.

### Task 3: Registry And Navigation

**Files:**
- Modify: `src/lib/component-registry.ts`
- Modify: `src/components/website/site-index.tsx`

- [x] **Step 1: Add registry entry**

Add `windowLeafShadow` with:

```ts
id: "window-leaf-shadow",
index: "005",
title: "Window Leaf Shadow",
description: "A light CSS/SVG background with natural leaf shadows softened behind a window shade.",
command: "copy window-leaf-shadow.tsx",
category: "Atmosphere",
status: "NEW",
statusClassName: "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
codePath: "src/components/ui/window-leaf-shadow.tsx",
```

- [x] **Step 2: Add site index row**

Add a row to `components` in `src/components/website/site-index.tsx` with name, year `005`, href `#window-leaf-shadow`, status `NEW`, and green status class.

### Task 4: Homepage Showcase

**Files:**
- Modify: `src/app/page.tsx`

- [x] **Step 1: Import component**

Add:

```ts
import { WindowLeafShadow } from "@/components/ui/window-leaf-shadow";
```

- [x] **Step 2: Render component plate**

Render a new `ComponentPlate` after `Noisy Analog Card` using `componentRegistry.windowLeafShadow`.

Preview content should use `WindowLeafShadow` with minimal overlay labels so users can inspect the leaves and shade layer.

### Task 5: Verification

**Files:**
- Verify only.

- [x] **Step 1: Run design checks**

Run:

```bash
npm run test:design
```

Expected: PASS.

- [x] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [x] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [x] **Step 4: Browser verification**

Open `http://localhost:3000/#window-leaf-shadow` and confirm:

- the Window Leaf Shadow section exists,
- the preview is not blank,
- `View code`, `Copy for AI`, and `Raw file` actions are visible.
