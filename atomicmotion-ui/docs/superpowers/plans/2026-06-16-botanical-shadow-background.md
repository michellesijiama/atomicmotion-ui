# Botanical Shadow Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure-code botanical film-shadow background component and expose it as a copyable AtomicMotion UI entry.

**Architecture:** Create one distributable UI file at `src/components/ui/botanical-shadow-bg.tsx`. Register it in `src/lib/component-registry.ts`, render it from `src/app/page.tsx`, list it in `src/components/website/site-index.tsx`, and protect behavior with `scripts/verify-jitter-design-system.mjs`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS utility classes, inline SVG data URI noise, existing Node design verification script.

---

### Task 1: Failing Design Checks

**Files:**
- Modify: `scripts/verify-jitter-design-system.mjs`

- [x] **Step 1: Add file read**

Add:

```js
botanicalShadow: readIfExists("src/components/ui/botanical-shadow-bg.tsx"),
```

to the `files` object.

- [x] **Step 2: Add failing checks**

Add checks requiring:

```js
["botanical shadow component exists", files.botanicalShadow.length > 0],
["botanical shadow exports component", files.botanicalShadow.includes("export function BotanicalShadowBackground")],
["botanical shadow exports tone type", files.botanicalShadow.includes("export type BotanicalShadowTone")],
["botanical shadow exposes grain prop", files.botanicalShadow.includes("grain = 0.24")],
["botanical shadow exposes blur prop", files.botanicalShadow.includes("blur = 28")],
["botanical shadow exposes contrast prop", files.botanicalShadow.includes("contrast = 1")],
["botanical shadow uses SVG turbulence grain", files.botanicalShadow.includes("feTurbulence")],
["botanical shadow avoids external image URLs", !/https?:\\/\\//.test(files.botanicalShadow)],
["component registry includes botanical shadow", files.componentRegistry.includes("botanicalShadowBackground")],
["component registry lists botanical source path", files.componentRegistry.includes("src/components/ui/botanical-shadow-bg.tsx")],
["page imports botanical shadow background", files.page.includes("BotanicalShadowBackground")],
["site index lists botanical shadow background", files.siteIndex.includes("Botanical Shadow Background")],
```

- [x] **Step 3: Run RED**

Run:

```bash
npm run test:design
```

Expected: FAIL because the component, registry entry, and page usage do not exist yet.

### Task 2: Distributable UI Component

**Files:**
- Create: `src/components/ui/botanical-shadow-bg.tsx`

- [x] **Step 1: Implement pure-code component**

Create a self-contained React component that exports:

```ts
export type BotanicalShadowTone = "slate" | "warm" | "moss";
export type BotanicalShadowBackgroundProps = {
  tone?: BotanicalShadowTone;
  grain?: number;
  blur?: number;
  contrast?: number;
  className?: string;
  children?: React.ReactNode;
};
export function BotanicalShadowBackground(...)
```

Use layered spans for base tone, cream blooms, dark organic shadow clusters, inline SVG `feTurbulence` grain, and vignette.

### Task 3: Registry And Navigation

**Files:**
- Modify: `src/lib/component-registry.ts`
- Modify: `src/components/website/site-index.tsx`

- [x] **Step 1: Add registry entry**

Add `botanicalShadowBackground` with:

```ts
id: "botanical-shadow-background",
index: "005",
title: "Botanical Shadow Background",
description: "A pure CSS/SVG atmospheric background with blurred botanical shadows, analog grain, and soft film falloff.",
command: "copy botanical-shadow-bg.tsx",
category: "Atmosphere",
status: "NEW",
statusClassName: "bg-[var(--jitter-green)]/12 text-[var(--jitter-green)]",
codePath: "src/components/ui/botanical-shadow-bg.tsx",
```

- [x] **Step 2: Add site index row**

Add a row to `components` in `src/components/website/site-index.tsx` with name, year `005`, href `#botanical-shadow-background`, status `NEW`, and green status class.

### Task 4: Homepage Showcase

**Files:**
- Modify: `src/app/page.tsx`

- [x] **Step 1: Import component**

Add:

```ts
import { BotanicalShadowBackground } from "@/components/ui/botanical-shadow-bg";
```

- [x] **Step 2: Render component plate**

Render a new `ComponentPlate` after `Noisy Analog Card` using `componentRegistry.botanicalShadowBackground`.

Preview content should use `BotanicalShadowBackground` with minimal overlay labels so users can inspect the texture.

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

Open `http://localhost:3000/#botanical-shadow-background` and confirm:

- the Botanical Shadow Background section exists,
- the preview is not blank,
- `View code`, `Copy for AI`, and `Raw file` actions are visible.
