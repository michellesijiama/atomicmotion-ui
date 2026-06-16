# Component Click Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every component section clearly expose its name, purpose, code link, and download/copy CTA after users click into it from the archive.

**Architecture:** Extend the existing `ComponentPlate` API with display-only code/download metadata. Keep page layout, component previews, and source component APIs unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Node.js design verification script.

---

### Task 1: Regression Checks

**Files:**
- Modify: `scripts/verify-jitter-design-system.mjs`

- [x] **Step 1: Add failing checks**

Check that `ComponentPlate` accepts `codePath`, `codeHref`, and `downloadLabel`, and that homepage source includes all four code paths and download labels.

- [x] **Step 2: Run RED**

Run: `npm run test:design`.
Expected: FAIL because the component details props are not implemented yet.

### Task 2: ComponentPlate Details UI

**Files:**
- Modify: `src/components/website/component-plate.tsx`

- [x] **Step 1: Extend props**

Add `codePath`, `codeHref`, and `downloadLabel` to `ComponentPlateProps`.

- [x] **Step 2: Render code/download actions**

Add visible `View code` and download/copy CTA links in the component header, while preserving title, description, category, status, and preview.

### Task 3: Homepage Metadata

**Files:**
- Modify: `src/app/page.tsx`

- [x] **Step 1: Pass metadata for every component**

Pass the exact code path, GitHub source URL, and download label for Magnet Button, Fluid Tabs, Elastic Drag, and Noisy Analog Card.

### Task 4: Verification

**Files:**
- Verify only.

- [x] **Step 1: Run design checks**

Run: `npm run test:design`.
Expected: PASS.

- [x] **Step 2: Run lint**

Run: `npm run lint`.
Expected: PASS.

- [x] **Step 3: Run build**

Run: `npm run build`.
Expected: PASS.

- [x] **Step 4: Browser check**

Open `http://localhost:3000/` and confirm visible component sections show `View code`, download labels, component names, and descriptions.
