# Light Mode Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the AtomicMotion UI website to light mode by default.

**Architecture:** Update the website shell and showcase components to use light surfaces, dark text, and low-opacity black borders. Keep core UI components unchanged unless their demos need wrapper contrast.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS.

---

## File Structure

- Modify `atomicmotion-ui/src/styles/globals.css`: light CSS variables, selection colors, body defaults.
- Modify `atomicmotion-ui/src/app/layout.tsx`: body default classes.
- Modify `atomicmotion-ui/src/app/page.tsx`: page shell and demo wrappers.
- Modify `atomicmotion-ui/src/components/website/site-index.tsx`: light index rail.
- Modify `atomicmotion-ui/src/components/website/component-plate.tsx`: light plate shell.
- Modify `atomicmotion-ui/src/components/website/noisy-card-playground.tsx`: light playground chrome while preserving dark preview contrast.

---

### Task 1: Convert Website Shell

**Files:**
- Modify: `atomicmotion-ui/src/styles/globals.css`
- Modify: `atomicmotion-ui/src/app/layout.tsx`
- Modify: `atomicmotion-ui/src/components/website/site-index.tsx`
- Modify: `atomicmotion-ui/src/components/website/component-plate.tsx`

- [ ] **Step 1: Update global colors and body**

Set `--background` to `#f7f6f2`, `--foreground` to `#111111`, selection to black-on-white inverse, and body to light.

- [ ] **Step 2: Update layout body classes**

Change body classes from black/white to light background and dark text.

- [ ] **Step 3: Update SiteIndex**

Use white/off-white rail, black text, black low-opacity borders, and gray secondary text.

- [ ] **Step 4: Update ComponentPlate**

Use black low-opacity borders, light shell, dark headings, gray copy, and white demo surface.

---

### Task 2: Convert Homepage Demo Chrome

**Files:**
- Modify: `atomicmotion-ui/src/app/page.tsx`
- Modify: `atomicmotion-ui/src/components/website/noisy-card-playground.tsx`

- [ ] **Step 1: Update page background**

Change the main page from black text shell to light background with dark text.

- [ ] **Step 2: Update demo wrappers**

Keep contrast-heavy demo interiors where needed, but remove black page chrome. Magnet, Fluid Tabs, Elastic Drag, and Noisy Analog Card plates must still be readable.

- [ ] **Step 3: Update Noisy Card playground controls**

Use light control panels with dark text and black low-opacity borders. Keep preview area dark so the card material remains visible.

---

### Task 3: Verify And Publish

**Files:**
- Read: browser at `http://localhost:3000`

- [ ] **Step 1: Run checks**

Run:

```bash
cd atomicmotion-ui
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 2: Browser check**

Open `http://localhost:3000` and verify:

- page is light by default
- left index is readable
- all four plate links exist
- Noisy Analog Card controls remain usable
- mobile viewport has no horizontal overflow

- [ ] **Step 3: Commit and push**

Run:

```bash
git add atomicmotion-ui/src/styles/globals.css atomicmotion-ui/src/app/layout.tsx atomicmotion-ui/src/app/page.tsx atomicmotion-ui/src/components/website/site-index.tsx atomicmotion-ui/src/components/website/component-plate.tsx atomicmotion-ui/src/components/website/noisy-card-playground.tsx
git commit -m "feat: make site light mode by default"
git push
```

Expected: push succeeds.
