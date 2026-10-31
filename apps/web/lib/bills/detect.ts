import {addLocalDays} from '../local-date';
import {cents, fromCents} from '../money-log/engine';
import type {MoneyEntry} from '../money-log/schema';
import {CADENCE_DAYS, daysBetween, dueOnOrAfter} from './cadence';
import {BILL_CADENCES, type BillCadence, type BillsRecord} from './schema';

/**
 * Session AK (7.3, COMPETITORS M7): recurring outflows found in the money log, pure. Spending with the same normalised
 * payee (the note, else the category), the same category and currency, amounts within ±5 % of their middle value and
 * at least three dates whose gaps read as weekly, monthly, quarterly or yearly (with tolerance) is a candidate bill,
 * with its next due date and a confidence. A candidate is a suggestion: it becomes a bill only when the person
 * confirms it. A series whose last payment is more than two cycles old has stopped and is not offered.
 */
export type BillCandidate = {
  key: string; title: string; payee: string; category: string; currency: string;
  /** The middle (median) amount, a decimal string, and in cents. */
  amount: string; amountCents: number;
  /** True when the amounts differ by more than 1 % (an energy bill), so the amount is "about". */
  variable: boolean;
  cadence: BillCadence; occurrences: number; firstDate: string; lastDate: string; nextDue: string;
  /** 0–1, from the count, how regular the gaps are and how close the amounts are. */
  confidence: number; confidenceLabel: 'high' | 'medium' | 'low';
  entryIds: string[];
};
export const MIN_OCCURRENCES = 3, AMOUNT_TOLERANCE = 0.05, MIN_REGULAR_SHARE = 0.6;
const NOISE = new Set(['bv', 'b.v', 'nv', 'ltd', 'inc', 'llc', 'gmbh', 'sa', 'sepa', 'incasso', 'payment', 'betaling', 'direct', 'debit', 'machtiging', 'ref', 'the', 'via', 'pos', 'card', 'kaart', 'showcase', 'data']);
/** "NETFLIX.COM 123*ABC" and "Netflix" read the same: lower case, no codes, letters only, noise words out, the first three words. */
export function normalisePayee(text: string | undefined): string {
  const words = (text ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\.(com|nl|de|be|eu|net|org|co\.uk|io)\b/g, ' ')
    // A card or reference code ("4471*AB", "#12") is not part of the name.
    .split(/\s+/).filter(w => !/[\d*#]/.test(w)).join(' ').replace(/[^a-z]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 1 && !NOISE.has(w));
  return words.slice(0, 3).join(' ');
}
/** The person's own words before any " · " detail ("Music · SHOWCASE DATA" → "Music"). */
const titleOf = (e: MoneyEntry) => (e.note?.split(' · ')[0]?.trim() || e.category).slice(0, 80);
const median = (values: readonly number[]) => { const s = [...values].sort((a, b) => a - b), mid = Math.floor(s.length / 2); return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2); };
const within = (value: number, centre: number) => Math.abs(value - centre) <= centre * AMOUNT_TOLERANCE;

function cadenceOf(gaps: readonly number[]): {cadence: BillCadence; regular: number} | null {
  if (!gaps.length) return null;
  const middle = median(gaps);
  const cadence = BILL_CADENCES.find(c => middle >= CADENCE_DAYS[c].min && middle <= CADENCE_DAYS[c].max);
  if (!cadence) return null;
  const {min, max} = CADENCE_DAYS[cadence];
  return {cadence, regular: gaps.filter(g => g >= min && g <= max).length / gaps.length};
}

export function detectBills(entries: readonly MoneyEntry[], today: string): BillCandidate[] {
  const groups = new Map<string, MoneyEntry[]>();
  for (const e of entries) {
    if (e.kind !== 'expense' || e.date > today) continue;
    const payee = normalisePayee(e.note) || normalisePayee(e.category);
    const key = `${e.currency}|${e.category}|${payee}`;
    const list = groups.get(key); if (list) list.push(e); else groups.set(key, [e]);
  }
  const out: BillCandidate[] = [];
  for (const [groupKey, list] of groups) {
    if (list.length < MIN_OCCURRENCES) continue;
    const amounts = list.map(e => cents(e.amount));
    // The amount most entries sit around (ties: the most recent), then the entries within ±5 % of it.
    let best = -1, centre = 0;
    list.forEach((_, i) => { const c = amounts[i]!, n = amounts.filter(a => within(a, c)).length; if (n >= best) { best = n; centre = c; } });
    const members = list.filter((_, i) => within(amounts[i]!, centre));
    // One payment per date: a same-day duplicate does not make a series.
    const byDate = new Map<string, MoneyEntry>();
    for (const e of members.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))) if (!byDate.has(e.date)) byDate.set(e.date, e);
    const series = [...byDate.values()];
    if (series.length < MIN_OCCURRENCES) continue;
    const gaps = series.slice(1).map((e, i) => daysBetween(series[i]!.date, e.date));
    const found = cadenceOf(gaps);
    if (!found || found.regular < MIN_REGULAR_SHARE) continue;
    const last = series[series.length - 1]!;
    if (daysBetween(last.date, today) > CADENCE_DAYS[found.cadence].max * 2) continue;
    const seriesCents = series.map(e => cents(e.amount)), middle = median(seriesCents);
    const spread = middle ? (Math.max(...seriesCents) - Math.min(...seriesCents)) / middle : 0;
    const confidence = Math.round((0.4 * Math.min(1, (series.length - 2) / 4) + 0.4 * found.regular + 0.2 * Math.max(0, 1 - spread / (2 * AMOUNT_TOLERANCE))) * 100) / 100;
    const [currency, category] = groupKey.split('|') as [string, string];
    const payee = groupKey.slice(currency.length + category.length + 2);
    out.push({
      key: `${groupKey}|${found.cadence}`.slice(0, 200), title: titleOf(last), payee, category, currency,
      amount: fromCents(middle), amountCents: middle, variable: spread > 0.01, cadence: found.cadence, occurrences: series.length,
      firstDate: series[0]!.date, lastDate: last.date,
      // The first step after the last payment that is today or later (a payment made today: the next one).
      nextDue: dueOnOrAfter(last.date, found.cadence, last.date >= today ? addLocalDays(today, 1) : today),
      confidence, confidenceLabel: confidence >= 0.75 ? 'high' : confidence >= 0.5 ? 'medium' : 'low', entryIds: series.map(e => e.id),
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence || a.nextDue.localeCompare(b.nextDue) || a.key.localeCompare(b.key));
}

/** The candidates still to show: not dismissed and not already a bill. */
export function openCandidates(candidates: readonly BillCandidate[], record: BillsRecord): BillCandidate[] {
  const dismissed = new Set(record.dismissed.map(d => d.key)), confirmed = new Set(record.bills.flatMap(b => b.matchKey ? [b.matchKey] : []));
  return candidates.filter(c => !dismissed.has(c.key) && !confirmed.has(c.key));
}
