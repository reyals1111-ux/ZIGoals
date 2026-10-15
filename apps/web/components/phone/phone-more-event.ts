'use client';
import {useSyncExternalStore} from 'react';
/**
 * Session AB-Design (owner request 10): the More sheet's open state, shared by the top bar's More button (which opens it
 * and reflects aria-expanded) and the tab bar (which renders the sheet inside the Main navigation).
 */
let open = false;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
export function setMoreOpen(value: boolean) { if (open === value) return; open = value; emit(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useMoreOpen(): boolean { return useSyncExternalStore(subscribe, () => open, () => false); }
