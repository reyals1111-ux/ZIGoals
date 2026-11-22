import {addLocalDays} from '../local-date';
import {addMonths} from '../bills/cadence';
import {minorUnits} from '../money-split/parts';
import {amountText} from '../money-log/schema';
import {MAX_WHAT_IF_CHANGES, MAX_WHAT_IFS, type MoneyMore, type WhatIf, type WhatIfChange} from '../money-more/schema';
import type {ForecastPoint, KnownForecast} from './model';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's what-if scenarios, LEDGER #388): "Try a change" on the cash forecast —
 * up to three made-up changes ("rent €150 more each month from March", "a €2,000 trip in June", "€200 more pay each
 * month") added to the forecast as extra money out or in on their days, drawn as a second line beside it. A model only:
 * a change is never written as an entry, a bill, a budget or a plan; it lives for the visit, or is kept by name on this
 * device (`zigoals:money-more:v1` `whatIfs`). The forecast itself (lib/cash-forecast/model.ts) is not changed: the
 * second line is the forecast's own points with each change added from its day on (its range, when there is one, moves
 * with it). Exact cents as BigInt. No advice. Pure.
 */
export type ChangeFlow = {date: string; cents: bigint};
/** Each day a change moves money from `from` to `to` (both included): its one day, or each month from its day (until its last day). */
export function changeFlows(change: WhatIfChange, from: string, to: string): ChangeFlow[] {
  const cents = BigInt(minorUnits(change.amount)) * (change.dir === 'out' ? -1n : 1n), out: ChangeFlow[] = [];
  if (change.kind === 'once') return change.from >= from && change.from <= to ? [{date: change.from, cents}] : [];
  const end = change.until && change.until < to ? change.until : to;
  for (let k = 0; k < 400; k++) {
    const day = addMonths(change.from, k);
    if (day > end) break;
    if (day >= from) out.push({date: day, cents});
  }
  return out;
}
export type Tried = {points: ForecastPoint[]; lowest: {date: string; cents: bigint}; flows: ChangeFlow[]; moved: bigint; skipped: number};
/** The forecast's points with the changes added from their days on (the first day, today, is as it is). */
export function withChanges(row: KnownForecast, changes: readonly WhatIfChange[]): Tried {
  const today = row.points[0]!.date, last = row.points.at(-1)!.date, from = addLocalDays(today, 1);
  const flows = changes.flatMap(c => changeFlows(c, from, last)).sort((a, b) => a.date.localeCompare(b.date));
  const skipped = changes.filter(c => !changeFlows(c, from, last).length).length;
  let added = 0n, i = 0;
  const points = row.points.map(p => {
    while (i < flows.length && flows[i]!.date <= p.date) added += flows[i++]!.cents;
    return {date: p.date, mid: p.mid + added, ...(p.low !== undefined ? {low: p.low + added} : {}), ...(p.high !== undefined ? {high: p.high + added} : {})};
  });
  const lowest = points.reduce((m, p) => p.mid < m.cents ? {date: p.date, cents: p.mid} : m, {date: points[0]!.date, cents: points[0]!.mid});
  return {points, lowest, flows, moved: added, skipped};
}
/** Why a change cannot be tried, in words, or null. */
export function changeIssue(change: Partial<WhatIfChange>, today: string): string | null {
  if (!change.amount || !amountText.safeParse(change.amount).success) return 'Type the amount above zero, with at most two decimals.';
  if (!change.from || !/^\d{4}-\d{2}-\d{2}$/.test(change.from)) return 'Choose the day it starts.';
  if (change.from <= today && change.kind === 'once') return 'Choose a day after today: the forecast starts tomorrow.';
  if (change.until && change.until < change.from) return 'The last day comes after the first.';
  return null;
}
/** Keeps a set by name (the same name, any case, replaces it; at most five). */
export function saveWhatIf(more: MoneyMore, input: {name: string; currency: string; changes: readonly WhatIfChange[]}, id: string): MoneyMore {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Type a name to keep these changes under.');
  if (name.length > 40) throw new Error('A name has at most 40 characters.');
  if (!input.changes.length) throw new Error('Add a change first.');
  if (input.changes.length > MAX_WHAT_IF_CHANGES) throw new Error(`Up to ${MAX_WHAT_IF_CHANGES} changes at a time.`);
  const list = more.whatIfs ?? [], same = list.find(w => w.name.toLowerCase() === name.toLowerCase());
  if (!same && list.length >= MAX_WHAT_IFS) throw new Error(`Up to ${MAX_WHAT_IFS} kept sets: remove one first.`);
  const kept: WhatIf = {id: same?.id ?? id, name, currency: input.currency, changes: input.changes.map(c => ({...c}))};
  return {...more, whatIfs: same ? list.map(w => w.id === same.id ? kept : w) : [...list, kept]};
}
export function removeWhatIf(more: MoneyMore, id: string): MoneyMore {
  const list = (more.whatIfs ?? []).filter(w => w.id !== id), {whatIfs: _w, ...rest} = more; void _w;
  return list.length ? {...rest, whatIfs: list} : rest as MoneyMore;
}
/** Puts a removed set back at its place (Undo). */
export function restoreWhatIf(more: MoneyMore, set: WhatIf, index: number): MoneyMore {
  const list = more.whatIfs ?? [];
  if (list.some(w => w.id === set.id) || list.length >= MAX_WHAT_IFS) return more;
  return {...more, whatIfs: [...list.slice(0, index), set, ...list.slice(index)]};
}
