# Component Click Details Design

## Goal

When visitors click a component from the archive/index or interact with a component section, the site must clearly show the component name, what it is, and a code/download link so other people can get the component source.

## Selected Approach

Use Plan A: expand the existing `ComponentPlate` experience instead of introducing a new fixed side panel or rebuilding the page layout.

The current Made with Jitter-inspired editorial gallery structure remains intact. Each component section becomes more explicit as a downloadable component entry.

## User Experience

- Clicking a component in the left archive continues to scroll to that component section.
- Each component section displays a clear detail header:
  - component name
  - short description of what it is
  - category and status label
  - direct code link
  - download/copy call-to-action
- The code link should point to the local source path in the repository, such as `src/components/ui/magnet-button.tsx`.
- The call-to-action text should be understandable for visitors, using labels like `View code` and `Download component`.
- The component preview remains below the detail header.

## Component Mapping

- `Magnet Button`
  - Code path: `src/components/ui/magnet-button.tsx`
  - Download label: `Download magnet-button.tsx`
- `Fluid Tabs`
  - Code path: `src/components/ui/fluid-tabs.tsx`
  - Download label: `Download fluid-tabs.tsx`
- `Elastic Drag`
  - Code path: `src/components/ui/elastic-drag.tsx`
  - Download label: `Download elastic-drag.tsx`
- `Noisy Analog Card`
  - Code path: `src/components/ui/noisy-analog-card.tsx`
  - Download label: `Download noisy-analog-card.tsx`

## Implementation Scope

- Extend `ComponentPlate` with `codePath`, `codeHref`, and `downloadLabel` props.
- Update `src/app/page.tsx` to pass these props for each component.
- Keep the current component previews and Noisy controls.
- Preserve the Made with Jitter styling language: light neutral background, white gallery tiles, compact metadata pills, and accent labels.

## Testing And Verification

- Add or update the design verification script so it checks the presence of code paths and download labels.
- Run `npm run test:design`.
- Run `npm run lint`.
- Run `npm run build`.
- Use the in-app browser to confirm the visible component sections show name, description, code link, and download text.

## Non-Goals

- Do not implement actual package publishing.
- Do not add authentication or payment.
- Do not change the source component APIs.
- Do not replace the existing page layout with a modal or fixed details drawer.
