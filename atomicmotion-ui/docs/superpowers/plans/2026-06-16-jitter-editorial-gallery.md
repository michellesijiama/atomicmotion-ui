# Jitter Editorial Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a Made with Jitter-inspired editorial gallery visual system to the existing AtomicMotion UI website.

**Architecture:** Preserve the current homepage structure and copy-paste UI component APIs. Add one static design verification script, then update global tokens and website presentation components only.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Node.js verification script.

---

### Task 1: Design Regression Script

**Files:**
- Create: `scripts/verify-jitter-design-system.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write a failing design verification script**

Create a Node script that checks for Jitter tokens, status labels, and metadata language in the website source.

- [ ] **Step 2: Wire `npm run test:design`**

Add `"test:design": "node scripts/verify-jitter-design-system.mjs"` to `package.json`.

- [ ] **Step 3: Run the script and confirm RED**

Run: `npm run test:design`.
Expected: FAIL on the current site because Jitter tokens and labels are not present.

### Task 2: Global Tokens And Shell

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/website/site-index.tsx`

- [ ] **Step 1: Add Jitter tokens**

Define background, ink, gray, green, purple, blue, and orange CSS variables.

- [ ] **Step 2: Apply shell colors**

Use `#f5f5f5` as page background and `#0e1011` as text color.

- [ ] **Step 3: Restyle the left index**

Make the rail read more like an archive/gallery index, with compact labels and colored status tags.

### Task 3: Component Plates And Homepage Frames

**Files:**
- Modify: `src/components/website/component-plate.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add status metadata to `ComponentPlate`**

Add optional `category`, `status`, and `statusClassName` props.

- [ ] **Step 2: Restyle plates as gallery tiles**

Use white/near-white tile surfaces, softer borders, compact metadata, and colored pills.

- [ ] **Step 3: Pass metadata from homepage**

Map the four current components to `FREE`, `PRO`, `RE-MADE`, and `NEW`.

### Task 4: Noisy Playground Jitter Controls

**Files:**
- Modify: `src/components/website/noisy-card-playground.tsx`

- [ ] **Step 1: Restyle panel and controls**

Use white/near-white panels, compact labels, Jitter accent swatches, and softer borders.

- [ ] **Step 2: Preserve existing behavior**

Keep all range controls, color buttons, reset button, and live card updates unchanged.

### Task 5: Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run design verification**

Run: `npm run test:design`.
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`.
Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`.
Expected: PASS.

- [ ] **Step 4: Browser check**

Open `http://localhost:3000/` and confirm the page uses Jitter-style tokens, status labels, and Noisy controls.
