'use client';
import {Fragment, useSyncExternalStore, type ComponentType} from 'react';

/**
 * Session AA-Local (ADR-022 B4): a local mirror of AA-Cloud's progress-slot registry (`components/progress/slot.tsx`,
 * pushed in its first hour: the same names and shapes). After AA-Cloud's PR merges, this file becomes one line,
 * `export * from '../progress/slot';`, and nothing else changes. Until then the Journey page and the tests use it.
 */
export const PROGRESS_PAGES = ['today', 'goals', 'habits', 'health', 'wealth', 'markets', 'portfolio', 'activity'] as const;
export type ProgressPage = (typeof PROGRESS_PAGES)[number];
export const SLOT_NAMES = ['today:habit-time', 'today:game', 'today:coach', 'review:coach'] as const;
export type SlotName = ProgressPage | (typeof SLOT_NAMES)[number];
const registry = new Map<SlotName, readonly ComponentType[]>();
const listeners = new Set<() => void>();
const NONE: readonly ComponentType[] = [];
function emit() { for (const listener of listeners) listener(); }
export function registerSlotCard(place: SlotName, Card: ComponentType): () => void {
  const current = registry.get(place) ?? NONE;
  if (!current.includes(Card)) { registry.set(place, [...current, Card]); emit(); }
  return () => { const now = registry.get(place) ?? NONE; if (!now.includes(Card)) return; const next = now.filter(c => c !== Card); if (next.length) registry.set(place, next); else registry.delete(place); emit(); };
}
export const registerProgressCard = (page: ProgressPage, Card: ComponentType) => registerSlotCard(page, Card);
export function slotCards(place: SlotName): readonly ComponentType[] { return registry.get(place) ?? NONE; }
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function useSlotCards(place: SlotName) { return useSyncExternalStore(subscribe, () => slotCards(place), () => NONE); }
export function Slot({place}: {place: SlotName}) { const cards = useSlotCards(place); return <>{cards.map((Card, i) => <Fragment key={i}><Card /></Fragment>)}</>; }
export function ProgressSlot({page}: {page: ProgressPage}) { return <Slot place={page} />; }
