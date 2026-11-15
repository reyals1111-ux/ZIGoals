/**
 * The ids of the Shell's two slots in the status row, in a module with no imports: the Shell draws the slots on every
 * page, and only the pages that can be rearranged load the layout code that fills them (components/layout-edit.tsx,
 * which re-exports both names). Importing them from layout-edit carried all of it, and lib/page-layout.ts, in every
 * page's scripts.
 */
/** The one place for the lock on every page: the Shell's status row, right after the demo balance. */
export const LAYOUT_LOCK_SLOT = 'layout-lock-slot';
/** Session AB-Design: a page's own small tools (Habits' Vacation) portal here, right before Gamify and the lock. */
export const PAGE_TOOLS_SLOT = 'page-tools-slot';
