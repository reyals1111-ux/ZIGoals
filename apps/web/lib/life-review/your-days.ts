import {countedCents, countedKind, inFigures} from '../money-log/counted';

/**
 * Session AI (G13, the weekly recap across modules): the newer records in a Life review period — money spent and
 * received (the expense log, each currency on its own, never converted), journal entries, the average daily energy and
 * the average evening mood — counted from the person's own records, with the days behind each average. Nothing stored.
 */
export type YourDays = {
  money: {currency: string; spent: number; received: number; entries: number}[];
  journal: number;
  energy: {average: number; days: number} | null;
  mood: {average: number; days: number} | null;
};
type MoneyRow = {kind: 'expense' | 'income'; amount: string; currency: string; date: string; share?: string; excluded?: true; transfer?: string; refund?: true};
type Input = {start: string; end: string; money?: {entries: readonly MoneyRow[]}; journal?: {entries: readonly {date: string}[]}; energy?: {days: Record<string, {energy: number}>}; moods?: {days: Record<string, {mood: number}>}};
const inside = (d: string, start: string, end: string) => d >= start && d <= end;
const average = (values: number[]) => values.length ? {average: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10, days: values.length} : null;
export function yourDays({start, end, money, journal, energy, moods}: Input): YourDays {
  const byCurrency = new Map<string, {currency: string; spent: number; received: number; entries: number}>();
  for (const e of money?.entries ?? []) {
    // Review B6O-1: by the shared money rule (lib/money-log/counted.ts), as Wealth → Spending's `totals`: an entry left
    // out or a transfer counts nowhere, a shared cost counts the person's share, and a refund lowers spent (never received).
    if (!inside(e.date, start, end) || !inFigures(e)) continue;
    const row = byCurrency.get(e.currency) ?? {currency: e.currency, spent: 0, received: 0, entries: 0};
    if (countedKind(e) === 'expense') row.spent += countedCents(e); else row.received += countedCents(e);
    row.entries++; byCurrency.set(e.currency, row);
  }
  return {
    money: [...byCurrency.values()].map(r => ({...r, spent: r.spent / 100, received: r.received / 100})).sort((a, b) => b.entries - a.entries || a.currency.localeCompare(b.currency)),
    journal: (journal?.entries ?? []).filter(e => inside(e.date, start, end)).length,
    energy: average(Object.entries(energy?.days ?? {}).filter(([d]) => inside(d, start, end)).map(([, v]) => v.energy)),
    mood: average(Object.entries(moods?.days ?? {}).filter(([d]) => inside(d, start, end)).map(([, v]) => v.mood)),
  };
}
