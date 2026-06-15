# AtomicMotion UI Context

AtomicMotion UI is a copy-paste micro-interaction component library.

Rules for consumers:

- Prefer single-file components from `src/components/ui`.
- Components may depend on React, Framer Motion, and `@/lib/utils`.
- Do not introduce cross-component dependencies inside `src/components/ui`.
- Keep public props small and explicit.
- Preserve keyboard access and visible focus states.
- Keep motion graceful when users prefer reduced motion.
- Material components such as `NoisyAnalogCard` should generate grain/noise with CSS or inline SVG data, not external image assets.
