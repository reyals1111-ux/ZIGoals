'use client';
import {Fragment, useSyncExternalStore, type ComponentType} from 'react';

/**
 * Session AA-Cloud Part 1: named places other lanes fill without editing a page. A page puts `<ProgressSlot page="goals"/>`
 * in its highlight area; another module calls `registerProgressCard('goals', Card)` once (at import time or in an effect)
 * and the card appears there. Nothing renders until something is registered, so an empty slot costs no layout.
 *
 * The same registry backs the other named places this session leaves for Session AA-Local (`SLOT_NAMES` below): Today's
 * habit time-of-day widget, the game card, Health's coach check-in on Today and in the Life review. Each place renders its
 * cards in registration order; registering the same component twice in one place is ignored.
 */
export const PROGRESS_PAGES = ['today', 'goals', 'habits', 'health', 'wealth', 'markets', 'portfolio', 'activity'] as const;
export type ProgressPage = (typeof PROGRESS_PAGES)[number];
export const SLOT_NAMES = ['today:habit-time', 'today:game', 'today:coach', 'review:coach'] as const;
export type SlotName = ProgressPage | (typeof SLOT_NAMES)[number];

const registry = new Map<SlotName, readonly ComponentType[]>();
const listeners = new Set<() => void>();
const NONE: readonly ComponentType[] = [];

function emit() {
  for (const listener of listeners) listener();
}

/** Adds a card to a page's progress slot (or another named place). Returns a function that removes it again. */
export function registerSlotCard(place: SlotName, Card: ComponentType): () => void {
  const current = registry.get(place) ?? NONE;
  if (!current.includes(Card)) {
    registry.set(place, [...current, Card]);
    emit();
  }
  return () => {
    const now = registry.get(place) ?? NONE;
    if (!now.includes(Card)) return;
    const next = now.filter(c => c !== Card);
    if (next.length) registry.set(place, next);
    else registry.delete(place);
    emit();
  };
}

/** The progress slot's own name for `registerSlotCard` on a page. */
export const registerProgressCard = (page: ProgressPage, Card: ComponentType) => registerSlotCard(page, Card);

/** The cards registered for a place, for tests and for callers that lay them out themselves. */
export function slotCards(place: SlotName): readonly ComponentType[] {
  return registry.get(place) ?? NONE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useSlotCards(place: SlotName) {
  return useSyncExternalStore(subscribe, () => slotCards(place), () => NONE);
}

/** Renders a named place's cards, or nothing at all while none is registered. */
export function Slot({place, className}: {place: SlotName; className?: string}) {
  const cards = useSlotCards(place);
  if (!cards.length) return null;
  return (
    <div className={className ?? 'aa-slot'} data-slot={place}>
      {cards.map((Card, i) => (
        <Fragment key={i}>
          <Card />
        </Fragment>
      ))}
    </div>
  );
}

/** A page's progress slot, placed in its highlight area. */
export function ProgressSlot({page}: {page: ProgressPage}) {
  return <Slot place={page} className="progress-slot" />;
}
