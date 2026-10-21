import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../af-checklist-keys';
import type {DeviceRecordSpec} from '../device-record';
import {setCustomDone} from './day';
import type {DerivedDot} from './derive';
import {CHECKLIST, CHECKLIST_DAYS, type Checklist, type ChecklistDays} from './schema';
import {addCustom, newChecklistId, orderedItems, removeItem, type FavouriteRef} from './store';

/**
 * The Checklist's command surface for ZIGi (Session AF, L3; P7.21). ZIGi reads; it never patches these records itself.
 * - `checklistSummary` / `findItemByName`: the data a read tool (`checklist_today`) and the intent router need.
 * - `CHECKLIST_DEVICE_WRITES`: the two entries the ZIGi lane registers with `registerDeviceWrite(key, entry)` (L4 §3.3):
 *   `{add: {text}}` adds a custom item, `{favorite: {item, on: false}}` takes an item off the path, and on the day record
 *   `{check: {item, done, day}}` ticks a custom item. Record-backed dots (a habit, water, a night) are ticked by ZIGi's
 *   existing kinds (check-in, log-water, start-night…), which write the real record, so they need nothing here.
 * - `checklistCommands()`: while the Checklist is open (its page or the Today card), the live surface `tick(id)`,
 *   `addFavourite(ref)`, `addCustom(label)` and `startTimer(kind)`, each through the same plans and Undo as a tap.
 */
export type ChecklistSummary = {date: string; total: number; done: number; next: string | null; items: {id: string; label: string; kind: string; done: boolean; counted: boolean}[]};
export function checklistSummary(date: string, dots: DerivedDot[]): ChecklistSummary {
  const counted = dots.filter(d => d.counted);
  return {date, total: counted.length, done: counted.filter(d => d.state === 'done').length, next: counted.find(d => d.state !== 'done')?.label ?? null, items: dots.map(d => ({id: d.id, label: d.label, kind: d.kind === 'health' ? d.input ?? 'health' : d.kind, done: d.state === 'done', counted: d.counted}))};
}
const words = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1);
/** The one item a few words name ("piano", "water"), or null when none or more than one fits best. */
export function findItemByName<T extends {id: string; label: string}>(items: readonly T[], text: string): T | null {
  const asked = new Set(words(text)); if (!asked.size) return null;
  const scored = items.map(item => { const own = words(item.label); const hits = own.filter(w => asked.has(w)).length; return {item, score: hits ? hits / own.length + (item.label.toLowerCase() === text.trim().toLowerCase() ? 1 : 0) : 0}; }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length || (scored[1] && scored[1].score === scored[0]!.score)) return null;
  return scored[0]!.item;
}

type Entry<T> = {spec: DeviceRecordSpec<T>; apply: (record: T, patch: unknown) => T};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null;
const customItems = (record: Checklist) => orderedItems(record).filter(i => i.kind === 'custom').map(i => ({id: i.id, label: i.label ?? ''}));
export const checklistDeviceWrite: Entry<Checklist> = {spec: CHECKLIST, apply: (record, patch) => {
  if (!object(patch)) throw new Error('Nothing to change.');
  if (object(patch.add)) { const label = text(patch.add.text, 60); if (!label) throw new Error('Name the item in 1 to 60 characters.'); return addCustom(record, {label}, {id: newChecklistId(), at: new Date()}); }
  if (object(patch.favorite) && patch.favorite.on === false) { const name = text(patch.favorite.item, 100); const found = name ? findItemByName(orderedItems(record).map(i => ({id: i.id, label: i.label ?? ''})), name) : null; if (!found) throw new Error('No single item on your path has that name.'); return removeItem(record, found.id); }
  throw new Error('That change is not one a card can make.');
}};
/** Ticking a custom item needs the path's own record; its day is the Checklist's day (given by the caller). */
export function checklistDaysDeviceWrite(record: () => Checklist): Entry<ChecklistDays> {
  return {spec: CHECKLIST_DAYS, apply: (days, patch) => {
    if (!object(patch) || !object(patch.check)) throw new Error('That change is not one a card can make.');
    const name = text(patch.check.item, 100), day = typeof patch.check.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patch.check.day) ? patch.check.day : null;
    if (!name || !day) throw new Error('Say which item and which day.');
    const found = findItemByName(customItems(record()), name); if (!found) throw new Error('No single custom item on your path has that name.');
    return setCustomDone(days, day, found.id, patch.check.done !== false);
  }};
}
export const CHECKLIST_DEVICE_WRITE_KEYS = [CHECKLIST_KEY, CHECKLIST_DAYS_KEY] as const;

/** The live surface while the Checklist is open. */
export type TimerKind = 'sleep' | 'meditate' | 'fast' | 'focus';
export type ChecklistCommandSurface = {
  tick: (id: string, value?: number) => Promise<string>;
  addFavourite: (ref: FavouriteRef, label?: string) => Promise<string>;
  addCustom: (label: string) => Promise<string>;
  startTimer: (kind: TimerKind) => Promise<string>;
  summary: () => ChecklistSummary;
};
let surface: ChecklistCommandSurface | null = null;
/** The Checklist registers itself while mounted (returns the unregister). */
export function registerChecklistCommands(next: ChecklistCommandSurface): () => void { surface = next; return () => { if (surface === next) surface = null; }; }
export const checklistCommands = (): ChecklistCommandSurface | null => surface;
