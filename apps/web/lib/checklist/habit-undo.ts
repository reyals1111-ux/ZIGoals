import type {Habit, HabitData} from '../habits';
import {checklistSchema, type Checklist} from './schema';
import {orderedItems} from './store';

/**
 * Session AL (A7): the Undo of a habit day changed from the Checklist's List view ("Done yesterday", "Skip today"): the
 * habit goes back exactly as it was, in the LATEST record; every other habit, and a habit removed since, is left alone.
 */
export function restoreHabit(latest: HabitData, before: Habit | undefined): HabitData {
  if (!before || !latest.habits.some(h => h.id === before.id)) return latest;
  return {...latest, habits: latest.habits.map(h => h.id === before.id ? before : h)};
}

/**
 * Session AL third pass (P-LS-08, LS-058): taking items off the path from Edit path or the List view stacks their Undo
 * (components/ui/remove-with-undo.ts): three quick removals give one toast whose Undo puts all three back where they were.
 * One removal reads exactly as before.
 */
export const PATH_REMOVAL_STACK = {
  key: 'checklist-path',
  many: (count: number) => `${count} items are off your path. Their records stay on their pages.`,
  manyUndone: (count: number) => `All ${count} are back on your path.`,
};

/**
 * Session AL fix-up (LS-058, found on the production build): the shared Undo (lib/undo-removal.ts) puts a removed item
 * back into `items` / `healthItems`, but the path's `order` is a list of plain ids it does not track, so an item came
 * back at the end of its orbit (three removals and Undo: the first item of Morning came back after Water). Wrap the
 * store's `update` with this for a removal with Undo: each save remembers where the items it took off were, and a save
 * that brings items back without a place (the Undo) puts each where it was, newest removal first.
 */
type Update = (updater: (latest: Checklist) => Checklist) => unknown;
const places = new Map<string, {seq: number; before: string[]}>();
let seq = 0;
const PLACES_KEPT = 200;
const ids = (r: Checklist) => new Set([...r.items, ...r.healthItems].map(i => i.id));
export function keepPathPlaces(update: Update): Update {
  return updater => update(latest => {
    const next = updater(latest), had = ids(latest), now = ids(next);
    const before = orderedItems(latest).map(i => i.id);
    for (const id of had) if (!now.has(id)) places.set(id, {seq: ++seq, before});
    while (places.size > PLACES_KEPT) places.delete(places.keys().next().value!);
    return restorePlaces(next, [...now].filter(id => !had.has(id)));
  });
}
/** `record` with the items in `back` that have no place in its order put where they were before their removal. */
export function restorePlaces(record: Checklist, back: readonly string[]): Checklist {
  const placed = new Set(record.order);
  const todo = back.filter(id => !placed.has(id) && places.has(id)).sort((a, b) => places.get(b)!.seq - places.get(a)!.seq);
  if (!todo.length) return record;
  const order = orderedItems(record).map(i => i.id).filter(id => !todo.includes(id));
  for (const id of todo) {
    const before = places.get(id)!.before, at = before.indexOf(id);
    const prev = before.slice(0, at).reverse().find(x => order.includes(x)), nextId = before.slice(at + 1).find(x => order.includes(x));
    order.splice(prev !== undefined ? order.indexOf(prev) + 1 : nextId !== undefined ? order.indexOf(nextId) : order.length, 0, id);
    places.delete(id);
  }
  // Ids of kinds this version does not show stay at the end, as moveItem keeps them.
  const unknown = record.order.filter(x => !order.includes(x));
  return checklistSchema.parse({...record, order: [...order, ...unknown]});
}
