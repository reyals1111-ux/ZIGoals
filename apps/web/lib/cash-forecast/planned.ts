import {addLocalDays} from '../local-date';
import {isCounted, mineCents} from '../money-log/counted';
import {amountText, currencyCode, type MoneyEntry} from '../money-log/schema';
import {MAX_PLANNED, moneyMoreSchema, type MoneyMore, type PlannedCost} from '../money-more/schema';
import {minorUnits} from '../money-split/parts';
import type {ForecastPlanned} from './model';

/**
 * Session AV lane 2, round 3 (money; Simplifi's planned spending, LEDGER #292): planned one-off costs — "Birthday present
 * €60 on the 14th" — kept in `zigoals:money-more:v1` `planned`. One counts in the cash forecast and in "Left this month"
 * while it is open: until an expense in the money log matches it or the person clears it. A match is an expense that the
 * figures count, in its currency, from 4 days before its day to 14 days after (or to today), for its amount within 5 %
 * (at least 1.00), whose note or payee shares a word with its name, or whose category is the one it names; each entry
 * matches one planned cost at most, the closest amount first. Nothing is moved or paid; the person clears it with Undo.
 * Pure.
 */
export const MATCH_BEFORE = 4, MATCH_AFTER = 14, MATCH_SHARE = 0.05, MATCH_MIN_CENTS = 100;
export type PlannedState = {cost: PlannedCost; state: 'open' | 'seen'; overdue: boolean; entry?: MoneyEntry};
export type PlannedInput = {name: string; amount: string; currency: string; date: string; category?: string};

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 3);
const shareWord = (a: string, b: string) => { const x = new Set(words(a)); return words(b).some(w => x.has(w)); };
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(MATCH_MIN_CENTS, Math.round(b * MATCH_SHARE));
const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Why a planned cost cannot be kept, in plain words, or null. */
export function plannedIssue(input: PlannedInput): string | null {
  if (!input.name.trim()) return 'Give it a name, such as “Birthday present”.';
  if (input.name.trim().length > 60) return 'A name of at most 60 characters.';
  if (!amountText.safeParse(input.amount).success) return 'Enter an amount above zero, with at most two decimals.';
  if (!currencyCode.safeParse(input.currency).success) return 'Choose a currency.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Choose the day you expect it.';
  return null;
}
export function addPlanned(more: MoneyMore, input: PlannedInput, id: string): MoneyMore {
  const issue = plannedIssue(input); if (issue) throw Error(issue);
  const list = more.planned ?? [];
  if (list.length >= MAX_PLANNED) throw Error(`Up to ${MAX_PLANNED} planned costs. Clear one you no longer expect first.`);
  const cost: PlannedCost = {id, name: input.name.trim(), amount: input.amount, currency: input.currency, date: input.date, ...(input.category?.trim() ? {category: input.category.trim().slice(0, 40)} : {})};
  return moneyMoreSchema.parse({...more, planned: [...list, cost].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))});
}
/** The record without that planned cost (cleared by the person; Undo puts the record back as it was). */
export function removePlanned(more: MoneyMore, id: string): MoneyMore {
  const list = (more.planned ?? []).filter(p => p.id !== id), {planned: _p, ...rest} = more; void _p;
  return moneyMoreSchema.parse(list.length ? {...rest, planned: list} : rest);
}
/** Each planned cost with its state: seen (an entry matches it) or open; overdue when its day has passed and it is open. */
export function plannedStates(planned: readonly PlannedCost[] | undefined, entries: readonly MoneyEntry[], today: string): PlannedState[] {
  const list = planned ?? [], pairs: {i: number; e: MoneyEntry; gap: number}[] = [];
  list.forEach((p, i) => {
    const want = minorUnits(p.amount), from = addLocalDays(p.date, -MATCH_BEFORE), upTo = addLocalDays(p.date, MATCH_AFTER);
    for (const e of entries) {
      if (e.kind !== 'expense' || !isCounted(e) || e.currency !== p.currency || e.date < from || e.date > upTo || e.date > today) continue;
      const got = mineCents(e); // the person's own share, as Wealth → Spending counts it
      if (!close(got, want) || !(shareWord(p.name, e.note ?? '') || same(p.category, e.category))) continue;
      pairs.push({i, e, gap: Math.abs(got - want)});
    }
  });
  pairs.sort((a, b) => a.gap - b.gap || a.e.date.localeCompare(b.e.date));
  const taken = new Set<string>(), hit = new Map<number, MoneyEntry>();
  for (const p of pairs) if (!hit.has(p.i) && !taken.has(p.e.id)) { hit.set(p.i, p.e); taken.add(p.e.id); }
  return list.map((cost, i) => { const entry = hit.get(i); return entry ? {cost, state: 'seen', overdue: false, entry} : {cost, state: 'open', overdue: cost.date < today}; });
}
/** The open planned costs, as the forecast reads them. */
export const openPlanned = (states: readonly PlannedState[]): ForecastPlanned[] => states.filter(s => s.state === 'open').map(s => ({name: s.cost.name, amount: s.cost.amount, currency: s.cost.currency, date: s.cost.date}));
/** The open planned costs of a record, straight from the money log (the forecast and Left this month both read this). */
export const plannedForForecast = (more: MoneyMore | null | undefined, entries: readonly MoneyEntry[], today: string): ForecastPlanned[] => openPlanned(plannedStates(more?.planned, entries, today));
