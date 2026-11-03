import {MAX_PARTS, amountText, type MoneyEntry, type MoneyLog, type MoneyPart} from '../money-log/schema';

/**
 * Session AK (lane M, item 22, COMPETITORS M3): one money-log entry split into parts by category and/or Goal. The parts
 * live on the entry itself (an optional field of the loose entry, lib/money-log/schema.ts), so Export everything,
 * restore and Undo carry them and older builds keep them. Every sum is in minor units (cents, integers), checked
 * exactly: parts that do not add up to the entry are never half-used, the entry then counts whole in its own category.
 * Totals (lib/money-log/engine.ts byCategory) and budgets (lib/budgets/engine.ts) read entries through `entryParts`.
 */
export const MIN_SPLIT = 2;
/** A decimal string with at most two decimals ("12.5", "3") in minor units, exactly (no floating point). */
export function minorUnits(amount: string): number {
  const [whole = '0', frac = ''] = amount.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}
/** Minor units back to the log's decimal text ("12.50"); only for amounts above zero. */
export const fromMinor = (n: number): string => `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
export type EntryPart = {cents: number; category: string; goalId?: string};
const validParts = (entry: Pick<MoneyEntry, 'amount'>, parts: readonly MoneyPart[] | undefined): parts is readonly MoneyPart[] =>
  !!parts && parts.length >= 1 && parts.length <= MAX_PARTS && parts.every(p => amountText.safeParse(p.amount).success)
  && parts.reduce((sum, p) => sum + minorUnits(p.amount), 0) === minorUnits(entry.amount);
/**
 * The parts an entry counts as: its valid parts (each part's category, or the entry's when the part names none), else
 * the whole entry in its own category. Always at least one part; the cents always add up to the entry's amount.
 */
export function entryParts(entry: Pick<MoneyEntry, 'amount' | 'category'> & {parts?: readonly MoneyPart[]}): EntryPart[] {
  if (!validParts(entry, entry.parts)) return [{cents: minorUnits(entry.amount), category: entry.category}];
  return entry.parts.map(p => ({cents: minorUnits(p.amount), category: p.category ?? entry.category, ...(p.goalId ? {goalId: p.goalId} : {})}));
}
/** True when the entry is split into two or more parts that add up. */
export const isSplit = (entry: MoneyEntry) => validParts(entry, entry.parts) && entry.parts.length >= MIN_SPLIT;
export type PartDraft = {amount: string; category?: string; goalId?: string};
/** Why a split cannot be saved, in plain words, or null. Two to five parts, each above zero, adding up exactly. */
export function splitIssue(entry: Pick<MoneyEntry, 'amount'>, parts: readonly PartDraft[]): string | null {
  if (parts.length < MIN_SPLIT || parts.length > MAX_PARTS) return `Split into ${MIN_SPLIT} to ${MAX_PARTS} parts.`;
  for (const [i, p] of parts.entries()) {
    if (!amountText.safeParse(p.amount).success) return `Part ${i + 1}: enter an amount above zero, with at most two decimals.`;
    if (p.category && p.category.trim().length > 40) return `Part ${i + 1}: a category has at most 40 characters.`;
  }
  const sum = parts.reduce((s, p) => s + minorUnits(p.amount), 0), whole = minorUnits(entry.amount);
  if (sum !== whole) return `The parts add up to ${fromMinor(sum)}; the entry is ${fromMinor(whole)}. ${sum > whole ? 'Take' : 'Add'} ${fromMinor(Math.abs(whole - sum))} ${sum > whole ? 'off' : 'on'}.`;
  return null;
}
/** The amount split as evenly as cents allow; the first parts take the leftover cents. */
export function evenSplit(amount: string, n: number): string[] {
  const whole = minorUnits(amount), count = Math.max(1, Math.min(MAX_PARTS, Math.floor(n))), base = Math.floor(whole / count), rest = whole - base * count;
  return Array.from({length: count}, (_, i) => base + (i < rest ? 1 : 0)).map(c => c > 0 ? fromMinor(c) : '0.00');
}
const cleanPart = (p: PartDraft): MoneyPart => ({amount: fromMinor(minorUnits(p.amount)), ...(p.category?.trim() ? {category: p.category.trim()} : {}), ...(p.goalId ? {goalId: p.goalId} : {})});
/** The log with one entry split (or its split removed with `null`); throws with the reason when the split does not add up. */
export function setSplit(log: MoneyLog, id: string, parts: readonly PartDraft[] | null): MoneyLog {
  const entry = log.entries.find(e => e.id === id);
  if (!entry) throw Error('This entry is no longer in your money log.');
  if (parts) { const issue = splitIssue(entry, parts); if (issue) throw Error(issue); }
  return {...log, entries: log.entries.map(e => {
    if (e.id !== id) return e;
    const {parts: _old, ...rest} = e; void _old;
    return parts ? {...rest, parts: parts.map(cleanPart)} : rest;
  })};
}
