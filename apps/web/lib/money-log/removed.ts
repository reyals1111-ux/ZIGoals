import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {MONEY_REMOVED_KEY_LITERAL} from '../aw-x7-money-keys';
import {moneyEntrySchema, type MoneyEntry, type MoneyLog} from './schema';

/**
 * Session AW, round 7 X7 (money; Cashew's "Recently deleted", LEDGER #461), TIER 3 (stored format): "Removed recently".
 * An entry removed in Wealth → Spending is kept here for 30 days, on this device only, with what it was linked to — the id
 * of its transfer twin and the refunds that named it — so "Put back" restores the entry (its split parts, marks, history
 * and refund link are inside it) in its own space, its twin with it when the twin was removed too, and the links that were
 * cut. After 30 days it is gone; "Empty now" clears a space's list at once. Removed entries count in no figure, list or
 * search: they are no longer in the money log. NOT in Export everything and never restored from a backup (the person
 * removed them); erased with the money. A NEW device key, loose and versioned; each item is read on its own, so an item
 * this build cannot read (a later format) is kept exactly as stored and never makes the list unreadable. Pure.
 *
 * The toast's Undo (components/ui/remove-with-undo.ts) still puts the entry straight back into the log; an item whose
 * entry is in the log again is not listed and is dropped on the next change here.
 */
export const MONEY_REMOVED_KEY = MONEY_REMOVED_KEY_LITERAL;
export const KEEP_DAYS = 30, MAX_REMOVED = 500;
const DAY_MS = 86_400_000;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const removedItemSchema = z.looseObject({
  /** The space the entry was removed from: it is put back there. */
  space: z.enum(['personal', 'business']),
  removedAt: z.iso.datetime({offset: true}),
  /** The entry exactly as it was in the log (a loose entry, so fields of later builds stay with it). */
  entry: moneyEntrySchema,
  /** The refunds in the log that named it (`refundOf`) when it was removed, so Put back can link them again. */
  refunds: z.array(id).max(50).optional().catch(undefined),
});
export type RemovedItem = z.infer<typeof removedItemSchema>;
declare const UNREADABLE: unique symbol;
/** An item this build cannot read, kept exactly as it was stored. */
export type UnreadableRemoved = {readonly [UNREADABLE]: true};
export const moneyRemovedSchema = z.looseObject({
  version: z.literal(1),
  items: z.array(z.union([removedItemSchema, z.custom<UnreadableRemoved>(() => true)])).max(MAX_REMOVED),
});
export type MoneyRemoved = z.infer<typeof moneyRemovedSchema>;
export type Space = RemovedItem['space'];
export const emptyMoneyRemoved = (): MoneyRemoved => ({version: 1, items: []});
export const MONEY_REMOVED: DeviceRecordSpec<MoneyRemoved> = {key: MONEY_REMOVED_KEY, schema: moneyRemovedSchema, empty: emptyMoneyRemoved};

export const isReadable = (item: RemovedItem | UnreadableRemoved): item is RemovedItem => removedItemSchema.safeParse(item).success;
/** Whether an item is still within its 30 days at `now`. */
export const kept = (item: RemovedItem, now: Date) => now.getTime() - Date.parse(item.removedAt) < KEEP_DAYS * DAY_MS;
/** The day it goes for good (YYYY-MM-DD, UTC), for "kept until". */
export const goneOn = (item: RemovedItem) => new Date(Date.parse(item.removedAt) + KEEP_DAYS * DAY_MS).toISOString().slice(0, 10);
/** Days left before it goes (1 on its last day). */
export const daysLeft = (item: RemovedItem, now: Date) => Math.min(KEEP_DAYS, Math.max(1, Math.ceil((Date.parse(item.removedAt) + KEEP_DAYS * DAY_MS - now.getTime()) / DAY_MS)));

/** Drops items past their 30 days and items whose entry is in that space's log again (the toast's Undo). */
function pruned(bin: MoneyRemoved, now: Date, logIds?: {space: Space; ids: ReadonlySet<string>}): MoneyRemoved {
  return {...bin, items: bin.items.filter(i => !isReadable(i) || (kept(i, now) && !(logIds && i.space === logIds.space && logIds.ids.has(i.entry.id))))};
}

/**
 * Keeps an entry that is being removed from `log` (the space's log as it is before the removal). Its refunds — entries in
 * the log whose `refundOf` is its id — are noted so Put back can link them again. The oldest items go beyond the cap.
 */
export function keepRemoved(bin: MoneyRemoved, space: Space, entry: MoneyEntry, log: MoneyLog, now: Date): MoneyRemoved {
  const refunds = log.entries.filter(e => e.refundOf === entry.id && e.id !== entry.id).map(e => e.id).slice(0, 50);
  const ids = new Set(log.entries.filter(e => e.id !== entry.id).map(e => e.id));
  const rest = pruned(bin, now, {space, ids}).items.filter(i => !(isReadable(i) && i.space === space && i.entry.id === entry.id));
  const item: RemovedItem = {space, removedAt: now.toISOString(), entry, ...(refunds.length ? {refunds} : {})};
  return moneyRemovedSchema.parse({...bin, items: [...rest, item].slice(-MAX_REMOVED)});
}

/** The items of a space still kept and not back in its log, newest first. */
export function recentlyRemoved(bin: MoneyRemoved, space: Space, log: MoneyLog, now: Date): RemovedItem[] {
  const ids = new Set(log.entries.map(e => e.id));
  return bin.items.filter(isReadable).filter(i => i.space === space && kept(i, now) && !ids.has(i.entry.id))
    .sort((a, b) => b.removedAt.localeCompare(a.removedAt) || a.entry.id.localeCompare(b.entry.id));
}

export type PutBack = {log: MoneyLog; bin: MoneyRemoved; entries: MoneyEntry[]; relinked: number};
/**
 * Put back: the entry into its space's log, with its transfer twin when the twin is in this list too (a transfer is one
 * move with two sides), and the links that were cut: a twin in the log that lost its `transfer` mark points back at it
 * again, and a refund that named it and lost that link names it again. A twin that is now paired with another entry is
 * left as it is, and the entry put back is then no longer marked a transfer (it counts again, as an entry alone).
 * Throws with a plain reason when the item is gone. The log's other entries are untouched.
 */
export function putBack(log: MoneyLog, bin: MoneyRemoved, space: Space, entryId: string, now: Date): PutBack {
  const listed = recentlyRemoved(bin, space, log, now), item = listed.find(i => i.entry.id === entryId);
  if (!item) throw new Error('That entry is no longer in Removed recently.');
  const twinItem = item.entry.transfer ? listed.find(i => i.entry.id === item.entry.transfer) : undefined;
  const back = [item, ...(twinItem ? [twinItem] : [])], backIds = new Set(back.map(i => i.entry.id));
  let relinked = 0;
  const twinInLog = item.entry.transfer && !twinItem ? log.entries.find(e => e.id === item.entry.transfer) : undefined;
  const pairedElsewhere = !!twinInLog && !!twinInLog.transfer && twinInLog.transfer !== item.entry.id;
  const missingTwin = !!item.entry.transfer && !twinItem && !twinInLog;
  const entries = back.map(i => i.entry).map(e => {
    if (e.id === item.entry.id && (pairedElsewhere || missingTwin)) { const {transfer: _t, ...rest} = e; void _t; return rest as MoneyEntry; }
    return e;
  });
  const refunds = new Set(back.flatMap(i => i.refunds ?? []));
  const updated = log.entries.map(e => {
    if (twinInLog && !pairedElsewhere && e.id === twinInLog.id && !e.transfer) { relinked++; return {...e, transfer: item.entry.id}; }
    if (refunds.has(e.id) && !e.refundOf) { relinked++; return {...e, refundOf: back.find(i => i.refunds?.includes(e.id))!.entry.id}; }
    return e;
  });
  const nextLog: MoneyLog = {...log, entries: [...updated.filter(e => !backIds.has(e.id)), ...entries].slice(-10_000)};
  return {log: nextLog, bin: withoutItems(bin, space, [...backIds]), entries, relinked};
}
/** The list without a space's items of these entry ids (after Put back). */
export const withoutItems = (bin: MoneyRemoved, space: Space, ids: readonly string[]): MoneyRemoved =>
  moneyRemovedSchema.parse({...bin, items: bin.items.filter(i => !(isReadable(i) && i.space === space && ids.includes(i.entry.id)))});

/** "Empty now": a space's items go at once (the other space's, and items this build cannot read, stay). */
export const emptyRemoved = (bin: MoneyRemoved, space: Space): MoneyRemoved =>
  moneyRemovedSchema.parse({...bin, items: bin.items.filter(i => !isReadable(i) || i.space !== space)});
