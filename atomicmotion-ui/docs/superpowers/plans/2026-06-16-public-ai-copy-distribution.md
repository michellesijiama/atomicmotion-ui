# Public AI Copy Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public-library distribution actions so every component can be viewed on GitHub, copied as an AI-ready prompt, and downloaded as raw TSX.

**Architecture:** Move component distribution metadata into `src/lib/component-registry.ts`. Keep distributable components in `src/components/ui/*` unchanged, and add website-only clipboard behavior in `src/components/website/component-plate.tsx`.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Tailwind CSS, existing Node design verification script, GitHub CLI for visibility inspection.

---

### Task 1: Failing Registry And Action Checks

**Files:**
- Modify: `scripts/verify-jitter-design-system.mjs`

- [x] **Step 1: Add failing design checks**

Add `componentRegistry: read("src/lib/component-registry.ts")` to the `files` object.

Add checks that require:
- `src/lib/component-registry.ts` exists and exports `componentRegistry`.
- registry has `REPO_OWNER`, `REPO_NAME`, and `REPO_BRANCH`.
- registry includes all four source paths.
- registry includes `aiPrompt`.
- `ComponentPlate` renders `Copy for AI`, `Copied`, and `Raw file`.
- homepage imports `componentRegistry`.

- [x] **Step 2: Run RED**

Run:

```bash
npm run test:design
```

Expected: FAIL because `src/lib/component-registry.ts` does not exist yet and `Copy for AI` is not implemented.

### Task 2: Component Metadata Registry

**Files:**
- Create: `src/lib/component-registry.ts`
- Modify: `src/app/page.tsx`

- [x] **Step 1: Create registry**

Create `src/lib/component-registry.ts` with shared repo constants, dependency hints, and one metadata object per component.

The registry type should include:

```ts
export type ComponentMeta = {
  id: string;
  index: string;
  title: string;
  description: string;
  command: string;
  category: string;
  status: string;
  statusClassName: string;
  codePath: string;
  codeHref: string;
  downloadHref: string;
  downloadLabel: string;
  aiPrompt: string;
};
```

Use `REPO_BRANCH = "codex/aircenter-design-system"` for now, so the site works before the repo is public on `main`.

- [x] **Step 2: Use registry in homepage**

Remove local `repoBlobBase`, `repoRawBase`, and `sourceLinks` from `src/app/page.tsx`.

Import `componentRegistry` and pass the matching metadata object to each `ComponentPlate`.

### Task 3: Copy For AI Action

**Files:**
- Modify: `src/components/website/component-plate.tsx`

- [x] **Step 1: Convert to client component**

Add `"use client";` because clipboard state requires browser APIs.

- [x] **Step 2: Extend props**

Add `aiPrompt: string` to `ComponentPlateProps`.

- [x] **Step 3: Add clipboard handler**

Use `navigator.clipboard.writeText(aiPrompt)` in a click handler.

Button states:
- default label: `Copy for AI`
- success label: `Copied`
- failure helper text: `Copy failed. Use View code.`

- [x] **Step 4: Rename raw file action**

Change the visible download link text from `Download component` to `Raw file`.

### Task 4: Verification

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

- [x] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [x] **Step 4: Browser check**

Open `http://localhost:3000/`.

Verify:
- every component section shows `View code`, `Copy for AI`, and `Raw file`,
- clicking `Copy for AI` changes the button text to `Copied`,
- component source paths still render.

### Task 5: GitHub Visibility Check

**Files:**
- No file edits.

- [x] **Step 1: Inspect repo visibility**

Run:

```bash
gh repo view michellesijiama/atomicmotion-ui --json visibility,defaultBranchRef
```

Expected: output reports whether the repo is `PUBLIC` or `PRIVATE`, and the default branch name.

- [x] **Step 2: Do not change visibility without explicit final confirmation**

If the repo is still private, report that making it public is the remaining launch step. Do not run `gh repo edit --visibility public` until the user explicitly confirms that external sharing action.
