# Public AI Copy Distribution Design

## Goal

Make AtomicMotion UI usable as a public copy-paste component library. A visitor should be able to open any component section and quickly:

- view the source file on GitHub,
- copy an AI-ready instruction that points to the component,
- download the raw TSX file.

The repo should be public before these links are treated as the primary distribution surface.

## Chosen Approach

Use Plan C: keep `View code`, add `Copy for AI`, and keep raw download.

This is the best fit because it supports both humans and AI coding agents without adding a package registry, CLI, or backend dependency. It also matches the project's shadcn-style principle: source files remain the product.

## Architecture

Create a single component metadata registry for the website. The registry owns:

- component slug,
- display name,
- description,
- source path,
- GitHub blob URL,
- raw GitHub URL,
- install/copy command text,
- AI-ready prompt text,
- category and status metadata.

The homepage should render component sections from this metadata instead of scattering source URLs across JSX. `ComponentPlate` should receive a metadata object and render the same actions for every component.

## Public Repository Requirement

The GitHub repo should be switched from private to public before final launch. Public links should target the stable default branch, expected to be `main`, not the temporary `codex/aircenter-design-system` feature branch.

Until the default branch is confirmed public, implementation may use a shared `REPO_BRANCH` constant so the branch can be changed in one place.

## User Experience

Each component detail header should show:

- component name,
- short explanation of what it is,
- source path,
- `View code` link to GitHub,
- `Copy for AI` button,
- `Download TSX` link to the raw file.

`Copy for AI` copies a concise prompt like:

```text
Use AtomicMotion UI's Magnet Button component.
Source: https://github.com/michellesijiama/atomicmotion-ui/blob/main/src/components/ui/magnet-button.tsx
Raw TSX: https://raw.githubusercontent.com/michellesijiama/atomicmotion-ui/refs/heads/main/src/components/ui/magnet-button.tsx

Install required dependencies if missing: framer-motion, lucide-react, clsx, tailwind-merge.
Copy the component into my project and adapt styling only where necessary.
```

The button should show a short copied state so users know the prompt is on their clipboard.

## Component Boundaries

`src/components/ui/*` remains the distributable component source. These files should stay self-contained enough for copy-paste usage.

`src/components/website/*` remains documentation/showcase only. Clipboard state and website controls belong here, not in the distributable UI files.

Shared metadata should live outside page JSX, for example:

```text
src/lib/component-registry.ts
```

## Error Handling

Clipboard copy should use `navigator.clipboard.writeText`. If it fails, the UI should show a short fallback message telling the user to use `View code`.

External links should open in a new tab and use `rel="noreferrer"`.

## Testing

Extend the existing design verification script to check:

- all components are represented in the registry,
- all component actions exist: `View code`, `Copy for AI`, `Download TSX`,
- links use the shared repository base and branch constants,
- AI prompt text includes the GitHub source URL, raw URL, and dependency hint.

Run:

- `npm run test:design`
- `npm run lint`
- `npm run build`

Browser verification should confirm that every component section exposes all three actions and that `Copy for AI` changes to a copied state after clicking.

## Non-Goals

- No npm package publishing yet.
- No hosted component registry API yet.
- No CLI install command yet.
- No backend service for copying source files.
