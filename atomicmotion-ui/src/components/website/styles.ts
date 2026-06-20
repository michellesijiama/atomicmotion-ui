// Shared nav design tokens — single source of truth so font/icon sizes
// stay in lockstep and are never hard-coded per component.
export const navTextClass = "text-base"; // 16px — nav typography
export const navIconClass = "size-4"; // 16px — nav icons

export const navLinkClass = `inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f5f5f5]/75 px-3 ${navTextClass} text-[var(--jitter-gray-800)] backdrop-blur-[72px] backdrop-saturate-150 transition hover:bg-[#eeeeee]/85 hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10`;

export const navIconButtonClass = `inline-flex size-8 items-center justify-center rounded-full bg-[#f5f5f5]/75 text-[var(--jitter-gray-800)] backdrop-blur-[72px] backdrop-saturate-150 transition hover:bg-[#eeeeee]/85 hover:text-[var(--jitter-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10`;

// Shared action-button tokens — no zoom/scale; hover communicates state
// purely through color, in keeping with the rest of the system.
const actionBase = `inline-flex h-8 items-center gap-1.5 rounded-full px-3 ${navTextClass} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10`;

// Primary (Copy for AI): solid ink fill that lightens on hover.
export const actionPrimaryClass = `${actionBase} bg-[var(--jitter-ink)] text-white hover:bg-[var(--jitter-gray-800)]`;

// Secondary (Copy link): no fill, black stroke, grayish wash on hover.
export const actionSecondaryClass = `inline-flex size-8 items-center justify-center rounded-full bg-transparent text-[var(--jitter-ink)] ring-1 ring-[var(--jitter-ink)] transition-colors hover:bg-[var(--jitter-gray-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10`;

// Quiet text button (Close): grayish pill on hover.
export const actionGhostClass = `${actionBase} text-[var(--jitter-gray-800)] hover:bg-[var(--jitter-gray-100)] hover:text-[var(--jitter-ink)]`;
