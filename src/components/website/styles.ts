// Shared nav design tokens — single source of truth so font/icon sizes
// stay in lockstep and are never hard-coded per component.
export const navTextClass = "text-base"; // 16px — nav typography
export const navIconClass = "size-4"; // 16px — nav icons

// Nav surface tokens live in globals.css so the shell can remove or tune fills
// without touching individual navigation components.
export const navLinkClass = `inline-flex h-11 sm:h-8 items-center gap-1.5 rounded-full bg-[var(--am-nav-bg)] px-3 ${navTextClass} text-[var(--jitter-gray-800)] backdrop-blur-[72px] backdrop-saturate-150 transition hover:bg-[var(--am-nav-hover-bg)] hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--am-nav-focus-ring)]`;

export const sectionNavLinkClass = `${navLinkClass} aria-[current]:bg-[var(--jitter-ink)] aria-[current]:text-white aria-[current]:hover:bg-[var(--jitter-gray-800)] aria-[current]:hover:text-white`;

export const navIconButtonClass = `inline-flex size-11 sm:size-8 items-center justify-center rounded-full bg-[var(--am-nav-bg)] text-[var(--jitter-gray-800)] backdrop-blur-[72px] backdrop-saturate-150 transition hover:bg-[var(--am-nav-hover-bg)] hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--am-nav-focus-ring)]`;

// Shared action-button tokens — no zoom/scale; hover communicates state
// purely through color, in keeping with the rest of the system.
const actionBase = `inline-flex h-11 sm:h-8 items-center gap-1.5 rounded-full px-3 ${navTextClass} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10`;

// Primary (Copy for AI): solid ink fill that lightens on hover.
export const actionPrimaryClass = `${actionBase} bg-[var(--jitter-ink)] text-white hover:bg-[var(--jitter-gray-800)]`;

// Secondary (Copy link): no fill, black stroke, grayish wash on hover.
export const actionSecondaryClass = `inline-flex size-11 shrink-0 sm:size-8 items-center justify-center rounded-full border border-[var(--jitter-ink)] bg-transparent text-[var(--jitter-ink)] transition-colors hover:bg-[var(--jitter-gray-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20`;

// Quiet text button (Close): grayish pill on hover.
export const actionGhostClass = `${actionBase} text-[var(--jitter-gray-800)] hover:bg-[var(--jitter-gray-100)] hover:text-[var(--jitter-ink)]`;
