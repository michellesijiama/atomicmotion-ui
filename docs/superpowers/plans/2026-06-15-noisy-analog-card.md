# Noisy Analog Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `NoisyAnalogCard` component and a live control playground to the AtomicMotion UI homepage.

**Architecture:** Keep the copy-paste component in `src/components/ui/noisy-analog-card.tsx` and keep all demo controls in `src/components/website/noisy-card-playground.tsx`. Wire the new feature into the existing homepage plate system and SiteIndex without changing the previous components.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion.

---

## File Structure

- Create `atomicmotion-ui/src/components/ui/noisy-analog-card.tsx`: single-file card component with CSS-generated grain and optional hover tilt.
- Create `atomicmotion-ui/src/components/website/noisy-card-playground.tsx`: website-only live controls for opacity, blur, grain, grain scale, border opacity, hover tilt, tint, highlight, and reset.
- Modify `atomicmotion-ui/src/app/page.tsx`: add a fourth `ComponentPlate`.
- Modify `atomicmotion-ui/src/components/website/site-index.tsx`: add `Noisy Analog Card` navigation row.
- Modify `atomicmotion-ui/README.md`: document the new component.
- Modify `atomicmotion-ui/.claudecode/context.md`: mention the new component and grain/no-asset rule.

---

### Task 1: Core Component

**Files:**
- Create: `atomicmotion-ui/src/components/ui/noisy-analog-card.tsx`

- [ ] **Step 1: Create `NoisyAnalogCard`**

Create a client component that accepts `opacity`, `blur`, `grain`, `grainScale`, `tint`, `highlight`, `borderOpacity`, `hoverTilt`, `className`, and `children`. It should use Framer Motion for pointer tilt and CSS variables for generated material styling.

- [ ] **Step 2: Verify TypeScript locally through build**

Run:

```bash
cd atomicmotion-ui
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit core component**

Run:

```bash
git add atomicmotion-ui/src/components/ui/noisy-analog-card.tsx
git commit -m "feat: add noisy analog card"
```

Expected: commit succeeds.

---

### Task 2: Playground And Homepage Integration

**Files:**
- Create: `atomicmotion-ui/src/components/website/noisy-card-playground.tsx`
- Modify: `atomicmotion-ui/src/app/page.tsx`
- Modify: `atomicmotion-ui/src/components/website/site-index.tsx`

- [ ] **Step 1: Create `NoisyCardPlayground`**

Create a client component with range inputs, color swatches, and a reset button. Keep state local to the playground and pass values into `NoisyAnalogCard`.

- [ ] **Step 2: Add fourth homepage plate**

Import `NoisyCardPlayground` in `src/app/page.tsx` and add a `ComponentPlate` with id `noisy-analog-card`, index `004`, title `Noisy Analog Card`, and command `copy noisy-analog-card.tsx`.

- [ ] **Step 3: Add SiteIndex row**

Add `{ name: "Noisy Analog Card", year: "004", href: "#noisy-analog-card" }` to the SiteIndex component list.

- [ ] **Step 4: Run lint/build**

Run:

```bash
cd atomicmotion-ui
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 5: Commit website integration**

Run:

```bash
git add atomicmotion-ui/src/components/website/noisy-card-playground.tsx atomicmotion-ui/src/app/page.tsx atomicmotion-ui/src/components/website/site-index.tsx
git commit -m "feat: add noisy card playground"
```

Expected: commit succeeds.

---

### Task 3: Documentation And Verification

**Files:**
- Modify: `atomicmotion-ui/README.md`
- Modify: `atomicmotion-ui/.claudecode/context.md`

- [ ] **Step 1: Update docs**

Add `NoisyAnalogCard` to README component list and context guidance.

- [ ] **Step 2: Final verification**

Run:

```bash
cd atomicmotion-ui
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 3: Browser smoke test**

Open `http://localhost:3000` and verify:

- SiteIndex includes `Noisy Analog Card`.
- The fourth plate is visible.
- Sliders change the card.
- Color swatches change the card.
- Reset returns defaults.
- Mobile viewport has no horizontal overflow.

- [ ] **Step 4: Commit docs and push**

Run:

```bash
git add atomicmotion-ui/README.md atomicmotion-ui/.claudecode/context.md
git commit -m "docs: document noisy analog card"
git push
```

Expected: push succeeds.
