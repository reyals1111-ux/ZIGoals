import type {MoneyEntry, MoneyLog} from './schema';
import {MAX_ENTRIES} from './schema';
import type {MoneyTags} from '../money-tags/schema';

/**
 * Session AW, round 7 X7 (money; Cashew's "Duplicate", LEDGER #463): copy an entry in Wealth → Spending without keeping
 * it by name first. The copy is a new entry with the same amount, currency, category, subcategory, note (the payee), paid
 * with, account, share, split parts and marks ("not part of my spending", tax-deductible, spread), dated today or a day
 * the person chooses. A transfer copies both sides, the two copies paired with each other. What belongs to the original
 * only stays with it: its id and time, its history of changes, its bank reference, its check against the bank, its group,
 * "that's fine" and the purchase a refund names. Its tags are copied in the tags record (lib/money-tags). A normal write
 * through the money log; nothing new is stored. Pure.
 */
const OWN_ONLY = ['id', 'createdAt', 'date', 'history', 'ref', 'checked', 'group', 'fine', 'refundOf', 'transfer', 'source'] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Why a copy cannot be made on `date`, or null. */
export function copyDateProblem(date: string, today: string): string | null {
  if (!DAY.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return 'Choose the day for the copy.';
  if (date > today) return 'Choose today or an earlier day.';
  if (date < '1990-01-01') return 'Choose a day from 1990 on.';
  return null;
}
function fresh(e: MoneyEntry, id: string, date: string, now: string): MoneyEntry {
  const rest: Record<string, unknown> = {...e};
  for (const k of OWN_ONLY) delete rest[k];
  return {...(rest as Omit<MoneyEntry, (typeof OWN_ONLY)[number]>), id, date, createdAt: now, source: 'form'} as MoneyEntry;
}
export type Copied = {log: MoneyLog; copies: MoneyEntry[]; pairs: [from: string, to: string][]};
/**
 * The copies of `entryId` (and of its transfer twin, when the log still holds it) added to `log` on `date`. `newId` gives
 * each copy its id. Throws with a plain reason when the entry is gone, the day is not allowed or the log is full.
 */
export function copyEntry(log: MoneyLog, entryId: string, date: string, today: string, now: string, newId: () => string): Copied {
  const entry = log.entries.find(e => e.id === entryId);
  if (!entry) throw new Error('That entry is no longer in your money log.');
  const problem = copyDateProblem(date, today); if (problem) throw new Error(problem);
  const twin = entry.transfer ? log.entries.find(e => e.id === entry.transfer && e.transfer === entry.id) : undefined;
  if (log.entries.length + (twin ? 2 : 1) > MAX_ENTRIES) throw new Error(`Your money log holds up to ${MAX_ENTRIES.toLocaleString('en')} entries; this copy would not fit.`);
  const first = fresh(entry, newId(), date, now);
  const copies = twin ? (() => { const other = fresh(twin, newId(), date, now); return [{...first, transfer: other.id}, {...other, transfer: first.id}]; })() : [first];
  const pairs: [string, string][] = [[entry.id, copies[0]!.id], ...(twin ? [[twin.id, copies[1]!.id] as [string, string]] : [])];
  return {log: {...log, entries: [...log.entries, ...copies]}, copies, pairs};
}
/** The tags record with each copy carrying its original's tags (unchanged when none had tags). */
export function copyTags(tags: MoneyTags, pairs: readonly [from: string, to: string][]): MoneyTags {
  const add = pairs.flatMap(([from, to]) => tags.tags[from] ? [[to, [...tags.tags[from]!]] as [string, string[]]] : []);
  return add.length ? {...tags, tags: {...tags.tags, ...Object.fromEntries(add)}} : tags;
}
