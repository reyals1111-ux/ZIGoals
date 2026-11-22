import * as z from 'zod';
import {addToDeviceRecord, type DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #417, Moodfit's notes for an appointment): "To bring up" — a short list of
 * things the person wants to mention at their next visit, kept between visits (up to 20 lines), each typed here or added
 * in one tap from a journal entry or a check-in, printed at the top of "Report for a visit" and ticked off afterwards.
 * The person's own words, as written: nothing is interpreted or suggested. The visit report had no device record of its
 * own (it is built fresh each time), so this is one: `zigoals:bring-up:v1` (TIER 3 stored format: a new key, loose and
 * versioned; in Export everything, Restore and the erase; never synced). Pure.
 */
export const BRING_UP_KEY = 'zigoals:bring-up:v1';
export const MAX_BRING_UP = 20, BRING_UP_MAX_CHARS = 200;
export const BRING_UP_SOURCES = ['typed', 'journal', 'checkin'] as const;
export type BringUpSource = typeof BRING_UP_SOURCES[number];
const itemSchema = z.looseObject({
  id: z.string().regex(/^bu-[A-Za-z0-9-]{4,60}$/),
  text: z.string().trim().min(1).max(BRING_UP_MAX_CHARS),
  from: z.enum(BRING_UP_SOURCES).catch('typed'),
  /** The day of the journal entry or check-in it came from. */
  day: z.iso.date().optional().catch(undefined),
  createdAt: z.iso.datetime(),
  /** Ticked off after the visit. */
  doneAt: z.iso.datetime().optional().catch(undefined),
});
export type BringUpItem = z.infer<typeof itemSchema>;
export const bringUpSchema = z.looseObject({
  version: z.literal(1),
  items: z.preprocess(v => Array.isArray(v) ? v.filter(x => itemSchema.safeParse(x).success).slice(0, MAX_BRING_UP) : [], z.array(itemSchema).max(MAX_BRING_UP)),
});
export type BringUp = z.infer<typeof bringUpSchema>;
export const emptyBringUp = (): BringUp => ({version: 1, items: []});
export const BRING_UP: DeviceRecordSpec<BringUp> = {key: BRING_UP_KEY, schema: bringUpSchema, empty: emptyBringUp};
export const newBringUpId = () => `bu-${crypto.randomUUID()}`;
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
/** A line from longer words (a journal entry): its first sentence or first 200 characters, cut at a word. */
export function bringUpLineFrom(text: string): string {
  const t = clean(text), first = t.match(/^(.{1,200}?[.!?])(?:\s|$)/)?.[1] ?? t;
  if (first.length <= BRING_UP_MAX_CHARS) return first;
  const cut = first.slice(0, BRING_UP_MAX_CHARS - 1), space = cut.lastIndexOf(' ');
  return `${(space > 120 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
/** Adds a line; throws a sentence on an empty line, a repeat still open or a full list (20, ticked ones count until cleared). */
export function addBringUp(r: BringUp, input: {text: string; from: BringUpSource; day?: string}, id: string, at: Date): BringUp {
  const text = clean(input.text);
  if (!text) throw Error('Type what you want to bring up first.');
  if (text.length > BRING_UP_MAX_CHARS) throw Error(`Keep a line to ${BRING_UP_MAX_CHARS} characters.`);
  if (r.items.some(x => !x.doneAt && x.text.toLowerCase() === text.toLowerCase())) throw Error('This is on your list already.');
  if (r.items.length >= MAX_BRING_UP) throw Error(`Up to ${MAX_BRING_UP} lines fit. Tick off or remove one first.`);
  return bringUpSchema.parse({...r, items: [...r.items, {id, text, from: input.from, ...(input.day ? {day: input.day} : {}), createdAt: at.toISOString()}]});
}
const edit = (r: BringUp, id: string, change: (x: BringUpItem) => BringUpItem | null): BringUp => {
  if (!r.items.some(x => x.id === id)) throw Error('This line is no longer here.');
  return bringUpSchema.parse({...r, items: r.items.flatMap(x => { if (x.id !== id) return [x]; const n = change(x); return n ? [n] : []; })});
};
/** Ticks a line off after the visit (or back on). */
export const tickBringUp = (r: BringUp, id: string, done: boolean, at: Date) => edit(r, id, x => { const {doneAt: _d, ...rest} = x; void _d; return done ? {...rest, doneAt: at.toISOString()} : rest; });
export const removeBringUp = (r: BringUp, id: string) => edit(r, id, () => null);
export function restoreBringUp(r: BringUp, item: BringUpItem, index: number): BringUp {
  const items = r.items.filter(x => x.id !== item.id); items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
  return bringUpSchema.parse({...r, items: items.slice(0, MAX_BRING_UP)});
}
/** Removes every ticked line (after a visit), with the removed ones for Undo. */
export function clearTicked(r: BringUp): {record: BringUp; removed: BringUpItem[]} {
  return {record: bringUpSchema.parse({...r, items: r.items.filter(x => !x.doneAt)}), removed: r.items.filter(x => x.doneAt)};
}
export const openBringUp = (r: BringUp | null | undefined) => (r?.items ?? []).filter(x => !x.doneAt);
export const BRING_UP_FROM_WORDS: Record<BringUpSource, string> = {typed: 'typed here', journal: 'from your journal', checkin: 'from a check-in'};
/**
 * Review B6P-4: "Bring this up at my next visit" (a journal entry, a feeling word) adds to the list from outside its own
 * page, so it never writes over a list this device cannot read (a newer version, a bad shape): nothing is written and
 * these words come back. The Undo of such an add does the same.
 */
export const BRING_UP_UNREADABLE = 'Your list to bring up at your next visit could not be read on this device, so nothing was added. It was not changed.';
export const BRING_UP_UNREADABLE_UNDO = 'Your list to bring up could not be read on this device, so nothing was changed.';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
/** Adds a line to the stored list; null (nothing written) when the list cannot be read. Throws `addBringUp`'s sentences. */
export const addBringUpIn = (storage: Store, input: {text: string; from: BringUpSource; day?: string}, id: string, at: Date): BringUp | null => addToDeviceRecord(storage, BRING_UP, r => addBringUp(r, input, id, at));
/** Takes back a line added in one tap (its Undo), when it is still there; null (nothing written) when the list cannot be read. */
export const takeBackBringUpIn = (storage: Store, id: string): BringUp | null => addToDeviceRecord(storage, BRING_UP, r => r.items.some(x => x.id === id) ? removeBringUp(r, id) : r);
