'use client';
import {useSyncExternalStore} from 'react';

/**
 * Extra destinations another lane adds to the navigation (Session AA-Cloud, for Session AA-Local's Journey): the
 * sidebar, the phone's More sheet and the search palette list them before Settings. The registering module decides
 * when an entry shows (register while on, call the returned function to remove it). Server snapshot: none, so a
 * registered entry appears after hydration and never causes a mismatch.
 */
export type NavExtra = readonly [href: string, label: string, icon: string];
let extras: readonly NavExtra[] = [];
const listeners = new Set<() => void>();
const NONE: readonly NavExtra[] = [];
const emit = () => { for (const l of listeners) l(); };
export function registerNavExtra(item: NavExtra): () => void {
  if (!/^\/app\/[a-z0-9/-]+$/.test(item[0])) throw Error('A navigation entry is an /app/ page.');
  if (!extras.some(([href]) => href === item[0])) { extras = [...extras, item]; emit(); }
  return () => { const next = extras.filter(([href]) => href !== item[0]); if (next.length !== extras.length) { extras = next; emit(); } };
}
export const navExtras = () => extras;
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useNavExtras(): readonly NavExtra[] { return useSyncExternalStore(subscribe, () => extras, () => NONE); }
