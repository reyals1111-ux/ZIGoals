'use client';
import {useSyncExternalStore} from 'react';

/**
 * Extra destinations another lane adds to the navigation (Session AA-Cloud, for Session AA-Local's Journey): the
 * sidebar, the phone's More sheet and the search palette list them before Settings. The registering module decides
 * when an entry shows (register while on, call the returned function to remove it). Server snapshot: none, so a
 * registered entry appears after hydration and never causes a mismatch.
 */
/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-10): where an entry shows. 'all' (the default): the desktop sidebar, the tablet rail,
 * the phone's More sheet and search. 'compact': the tablet rail, the phone's More sheet and search, not the desktop
 * sidebar, whose PROTECTED design fits every destination in a 900 px window (tests/brand-nav-polish.spec.ts); the sidebar
 * hides it with CSS (components/navigation.css, `data-nav-compact`), so the list and its order stay one.
 */
export type NavPlacement = 'all' | 'compact';
export type NavExtra = readonly [href: string, label: string, icon: string, placement?: NavPlacement];
/** A 'compact' entry (any navigation tuple; the base destinations have no fourth element). */
export const navCompact = (item: readonly unknown[]) => item[3] === 'compact';
/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-10): one order whatever registers first — NOVA, the Checklist, then Tasks, Notes and
 * the Journal (components/nav-pages.tsx), then the Journey; anything else after them, in the order it came.
 */
const ORDER = ['/app/nova', '/app/checklist', '/app/tasks', '/app/notes', '/app/journal', '/app/journey'];
const rank = (href: string) => { const at = ORDER.indexOf(href); return at < 0 ? ORDER.length : at; };
let extras: readonly NavExtra[] = [];
const listeners = new Set<() => void>();
const NONE: readonly NavExtra[] = [];
const emit = () => { for (const l of listeners) l(); };
export function registerNavExtra(item: NavExtra): () => void {
  if (!/^\/app\/[a-z0-9/-]+$/.test(item[0])) throw Error('A navigation entry is an /app/ page.');
  if (!extras.some(([href]) => href === item[0])) { extras = [...extras, item].sort((a, b) => rank(a[0]) - rank(b[0])); emit(); }
  return () => { const next = extras.filter(([href]) => href !== item[0]); if (next.length !== extras.length) { extras = next; emit(); } };
}
export const navExtras = () => extras;
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useNavExtras(): readonly NavExtra[] { return useSyncExternalStore(subscribe, () => extras, () => NONE); }
