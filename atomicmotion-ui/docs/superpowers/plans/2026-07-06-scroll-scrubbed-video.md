# Scroll-Scrubbed Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a seventh AtomicMotion gallery component that replicates the Getty Gehry scroll-controlled video playback interaction.

**Architecture:** Build a new isolated client component under `src/components/scroll-scrubbed-video/`. Register it as gallery item `007` by replacing the existing placeholder, and expose it through `componentMap` so both the card preview and detail route work through the existing `/components/[id]` flow.

**Tech Stack:** Next.js App Router, React client component, framer-motion for visual polish, native `<video>` and scroll/wheel event handling for scrubbed playback.

---

### Task 1: Verification Script

**Files:**
- Create: `atomicmotion-ui/scripts/verify-scroll-scrubbed-video.mjs`
- Modify: `atomicmotion-ui/package.json`

- [ ] **Step 1: Write the failing verification script**

Create a script that checks for the new component file, registry entry, component map entry, exported index, wheel/scroll scrub logic, reduced motion fallback, and package script.

- [ ] **Step 2: Run it and verify RED**

Run: `npm run test:scroll-scrubbed-video`

Expected: FAIL before implementation because the component and registry entries do not exist.

### Task 2: Isolated Component

**Files:**
- Create: `atomicmotion-ui/src/components/scroll-scrubbed-video/scroll-scrubbed-video.tsx`
- Create: `atomicmotion-ui/src/components/scroll-scrubbed-video/index.ts`

- [ ] **Step 1: Implement client component**

Use a local scroll container, sticky full-screen black video stage, native video refs, and progress mapping to set `video.currentTime`. Keep `loop` preview self-animated and compact for cards.

- [ ] **Step 2: Add reduced motion fallback**

When reduced motion is requested, do not scrub playback; show a stable poster-like frame and explanatory overlay text.

### Task 3: Gallery Wiring

**Files:**
- Modify: `atomicmotion-ui/src/lib/component-registry.ts`
- Modify: `atomicmotion-ui/src/lib/component-map.tsx`

- [ ] **Step 1: Replace the 007 placeholder**

Register `scroll-scrubbed-video` with index `007`, category `Video`, status `NEW`, and Getty Gehry inspiration.

- [ ] **Step 2: Map the component id**

Import the new component and expose it in `componentMap`.

### Task 4: Verification

**Files:**
- Existing app files only

- [ ] **Step 1: Run targeted verification**

Run: `npm run test:scroll-scrubbed-video`

Expected: PASS.

- [ ] **Step 2: Run type and build checks**

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: both exit 0.
