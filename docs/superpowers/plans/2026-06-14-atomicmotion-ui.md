# AtomicMotion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js website and copy-paste micro-interaction component library for `AtomicMotion UI`.

**Architecture:** Create a Next.js App Router project under `atomicmotion-ui/`. Keep reusable micro-interactions in single-file `src/components/ui/*` modules and keep reference-style website composition in `src/components/website/*`. The homepage uses a fixed black left index and large right-side interactive component plates inspired by the supplied reference URL.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Framer Motion, clsx, tailwind-merge, GitHub CLI.

---

## File Structure

- Create `atomicmotion-ui/.claudecode/context.md`: LLM context for consumers.
- Create `atomicmotion-ui/src/components/ui/magnet-button.tsx`: single-file magnetic button component.
- Create `atomicmotion-ui/src/components/ui/fluid-tabs.tsx`: single-file liquid tab component.
- Create `atomicmotion-ui/src/components/ui/elastic-drag.tsx`: single-file draggable spring component.
- Create `atomicmotion-ui/src/components/website/site-index.tsx`: fixed index/sidebar.
- Create `atomicmotion-ui/src/components/website/component-plate.tsx`: showcase plate wrapper.
- Create `atomicmotion-ui/src/lib/utils.ts`: `cn` helper.
- Modify `atomicmotion-ui/src/app/layout.tsx`: metadata and global style import.
- Modify `atomicmotion-ui/src/app/page.tsx`: homepage layout and demos.
- Modify `atomicmotion-ui/src/styles/globals.css`: Tailwind layers, theme variables, focus styles, and gooey filter support.
- Modify `atomicmotion-ui/README.md`: project overview and local usage.

---

### Task 1: Scaffold Project

**Files:**
- Create: `atomicmotion-ui/package.json`
- Create: `atomicmotion-ui/src/app/layout.tsx`
- Create: `atomicmotion-ui/src/app/page.tsx`
- Create: `atomicmotion-ui/src/styles/globals.css`

- [ ] **Step 1: Create the app with dependencies**

Run:

```bash
npx create-next-app@latest atomicmotion-ui --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd atomicmotion-ui
npm install framer-motion clsx tailwind-merge lucide-react
```

Expected: `atomicmotion-ui/package.json` exists and includes Next, React, TypeScript, Tailwind, Framer Motion, clsx, tailwind-merge, and lucide-react.

- [ ] **Step 2: Move Tailwind globals into requested path**

Move generated `src/app/globals.css` to `src/styles/globals.css`, then update `src/app/layout.tsx` to import `../styles/globals.css`.

- [ ] **Step 3: Commit scaffold**

Run:

```bash
git add atomicmotion-ui
git commit -m "chore: scaffold next app"
```

Expected: commit succeeds.

---

### Task 2: Add Shared Utility And Consumer Context

**Files:**
- Create: `atomicmotion-ui/src/lib/utils.ts`
- Create: `atomicmotion-ui/.claudecode/context.md`
- Modify: `atomicmotion-ui/README.md`

- [ ] **Step 1: Add `cn` utility**

Create `src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Add LLM context**

Create `.claudecode/context.md` with:

```md
# AtomicMotion UI Context

AtomicMotion UI is a copy-paste micro-interaction component library.

Rules for consumers:

- Prefer single-file components from `src/components/ui`.
- Components may depend on React, Framer Motion, and `@/lib/utils`.
- Do not introduce cross-component dependencies inside `src/components/ui`.
- Keep public props small and explicit.
- Preserve keyboard access and visible focus states.
- Keep motion graceful when users prefer reduced motion.
```

- [ ] **Step 3: Commit utility and context**

Run:

```bash
git add atomicmotion-ui/src/lib/utils.ts atomicmotion-ui/.claudecode/context.md atomicmotion-ui/README.md
git commit -m "docs: add consumer context"
```

Expected: commit succeeds.

---

### Task 3: Implement Core UI Components

**Files:**
- Create: `atomicmotion-ui/src/components/ui/magnet-button.tsx`
- Create: `atomicmotion-ui/src/components/ui/fluid-tabs.tsx`
- Create: `atomicmotion-ui/src/components/ui/elastic-drag.tsx`

- [ ] **Step 1: Implement `MagnetButton`**

Create a client component that extends button props, tracks pointer position relative to the button center, maps movement to a limited offset, and springs back on pointer leave.

- [ ] **Step 2: Implement `FluidTabs`**

Create a client component with `tabs`, `value`, `defaultValue`, and `onValueChange`. Render keyboard-accessible tab buttons and a Framer Motion shared `layoutId` indicator.

- [ ] **Step 3: Implement `ElasticDrag`**

Create a client component with optional `label`, `className`, and `children`. Use Framer Motion drag with elastic constraints and spring transitions.

- [ ] **Step 4: Commit UI components**

Run:

```bash
git add atomicmotion-ui/src/components/ui
git commit -m "feat: add atomic motion components"
```

Expected: commit succeeds.

---

### Task 4: Implement Reference-Style Website

**Files:**
- Create: `atomicmotion-ui/src/components/website/site-index.tsx`
- Create: `atomicmotion-ui/src/components/website/component-plate.tsx`
- Modify: `atomicmotion-ui/src/app/layout.tsx`
- Modify: `atomicmotion-ui/src/app/page.tsx`
- Modify: `atomicmotion-ui/src/styles/globals.css`
- Modify: `atomicmotion-ui/README.md`

- [ ] **Step 1: Implement global styles**

Set a black canvas, white text, thin borders, compact type, responsive layout helpers, and an SVG gooey filter in `globals.css`.

- [ ] **Step 2: Implement `SiteIndex`**

Render a fixed desktop sidebar with title, positioning, component rows, install command, repository metadata, and bottom timestamp/location-style copy.

- [ ] **Step 3: Implement `ComponentPlate`**

Render a large bordered archive plate with compact metadata and a demo slot. Keep radius at 8px or less.

- [ ] **Step 4: Implement homepage**

Compose `SiteIndex`, three `ComponentPlate` sections, and the three UI components. Add realistic code snippets and component metadata.

- [ ] **Step 5: Commit website**

Run:

```bash
git add atomicmotion-ui/src/app atomicmotion-ui/src/components/website atomicmotion-ui/src/styles/globals.css atomicmotion-ui/README.md
git commit -m "feat: build atomicmotion showcase"
```

Expected: commit succeeds.

---

### Task 5: Verify Locally

**Files:**
- Read: `atomicmotion-ui/package.json`
- Read: browser rendering at `http://localhost:3000`

- [ ] **Step 1: Run lint**

Run:

```bash
cd atomicmotion-ui
npm run lint
```

Expected: no lint errors.

- [ ] **Step 2: Run production build**

Run:

```bash
cd atomicmotion-ui
npm run build
```

Expected: build completes successfully.

- [ ] **Step 3: Start dev server**

Run:

```bash
cd atomicmotion-ui
npm run dev
```

Expected: dev server listens on `http://localhost:3000` or another available port.

- [ ] **Step 4: Browser smoke test**

Open the local URL and verify:

- left index is visible on desktop
- all three plates are visible while scrolling
- tab interaction changes active tab
- magnetic button moves with pointer
- elastic item drags and returns
- mobile width stacks content without overlap

---

### Task 6: Create Private GitHub Repo

**Files:**
- Modify: Git remote configuration

- [ ] **Step 1: Check GitHub auth**

Run:

```bash
gh auth status
```

Expected: GitHub CLI is authenticated.

- [ ] **Step 2: Create private repo and push**

Run from `/Users/sijiama/Desktop/Atomic Motion`:

```bash
git branch -M main
gh repo create atomicmotion-ui --private --source=. --remote=origin --push
```

Expected: private repository is created and the local `main` branch is pushed.

- [ ] **Step 3: Report repository URL**

Run:

```bash
gh repo view --json url -q .url
```

Expected: a GitHub repository URL is printed.
