import {addLocalDays} from '../local-date';
import {amountText, currencyCode, type MoneyEntry, type MoneyLog} from '../money-log/schema';
import {minorUnits, fromMinor} from '../money-split/parts';
import {MAX_LOANS, MAX_OWED, MAX_REPAID, type Loan, type MoneyMore, type Owed} from './schema';

/**
 * Session AV lane 2, round 2 (money; Emma's custom split and settle, Wallet's debts: lent and borrowed): money between the
 * person and people they name, kept on this device only — nothing is shared with anyone's device (the shared group part
 * of Emma's split is against the rule that nothing is shared between people). Pure; exact cents, per currency.
 * - A shared cost: the entry keeps what was paid; `share` is the person's own part (what spending and budgets count), and
 *   each other person's part is a line in `owed`, until settled. Settling writes the money back as an income entry left
 *   out of the figures (the spending already counts only the share), and marks the lines settled.
 * - Money lent or borrowed: a name, an amount, a day, an optional due day with a reminder, repayments in parts, and closed
 *   (repaid) or forgiven. Counted beside net worth on Wealth: lent is owed to you, borrowed is owed by you.
 */
const name40 = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 40);
export type SharePart = {name: string; amount: string};
/** Why a split cannot be kept, or null: your share and each other part above zero, adding up to the entry. */
export function shareIssue(entry: Pick<MoneyEntry, 'amount' | 'kind'>, mine: string, others: readonly SharePart[]): string | null {
  if (entry.kind !== 'expense') return 'Only spending can be shared.';
  if (!others.length) return 'Add at least one person who owes you a part.';
  if (others.length > 10) return 'Up to 10 people on one cost.';
  if (others.some(o => !name40(o.name))) return 'Give each person a name.';
  if (others.some(o => !amountText.safeParse(o.amount).success)) return 'Each person’s part is an amount above zero, with at most two decimals.';
  if (!amountText.safeParse(mine).success) return 'Your share is an amount above zero, with at most two decimals. Paid it all for someone else? Add it under Lent instead.';
  const sum = minorUnits(mine) + others.reduce((s, o) => s + minorUnits(o.amount), 0), whole = minorUnits(entry.amount);
  if (sum !== whole) return `The parts add up to ${fromMinor(Math.max(1, sum))}; the cost is ${fromMinor(whole)}.`;
  return null;
}
/** Splits `amount` evenly between you and `people` others (the first parts take the leftover cents): [yours, ...theirs]. */
export function evenShares(amount: string, people: number): string[] {
  const whole = minorUnits(amount), n = Math.max(2, people + 1), base = Math.floor(whole / n), rest = whole - base * n;
  return Array.from({length: n}, (_, i) => fromMinor(base + (i < rest ? 1 : 0)));
}
/** The entry with your share, and a line in `owed` for each other person (a split already kept is replaced, its open lines too). */
export function shareCost(log: MoneyLog, more: MoneyMore, entryId: string, mine: string, others: readonly SharePart[], ids: () => string): {log: MoneyLog; more: MoneyMore} {
  const entry = log.entries.find(e => e.id === entryId);
  if (!entry) throw new Error('This entry is no longer in your money log.');
  const issue = shareIssue(entry, mine, others); if (issue) throw new Error(issue);
  const kept = (more.owed ?? []).filter(o => o.entryId !== entryId || o.settled);
  if (kept.length + others.length > MAX_OWED) throw new Error(`Up to ${MAX_OWED} open parts; settle some first.`);
  const lines: Owed[] = others.map(o => ({id: ids(), name: name40(o.name), amount: fromMinor(minorUnits(o.amount)), currency: entry.currency, date: entry.date, entryId, ...(entry.note ? {note: entry.note.split(' · ')[0]!.slice(0, 80)} : {})}));
  const mineText = fromMinor(minorUnits(mine));
  return {
    log: {...log, entries: log.entries.map(e => { if (e.id !== entryId) return e; const {share: _s, ...rest} = e; void _s; return {...rest, share: mineText}; })},
    more: {...more, owed: [...kept, ...lines]},
  };
}
/** Takes a split off: the entry counts whole again and its open lines go (settled ones stay, as a record). */
export function unshareCost(log: MoneyLog, more: MoneyMore, entryId: string): {log: MoneyLog; more: MoneyMore} {
  return {log: {...log, entries: log.entries.map(e => { if (e.id !== entryId) return e; const {share: _s, ...rest} = e; void _s; return rest; })}, more: {...more, owed: (more.owed ?? []).filter(o => o.entryId !== entryId || o.settled)}};
}
export type OwedTotal = {name: string; currency: string; cents: number; lines: Owed[]};
/** What each person owes you, open lines only, per currency, the most first. */
export function owedTotals(more: Pick<MoneyMore, 'owed'> | null | undefined): OwedTotal[] {
  const by = new Map<string, OwedTotal>();
  for (const o of more?.owed ?? []) {
    if (o.settled) continue;
    const k = `${o.name.toLowerCase()}|${o.currency}`, row = by.get(k) ?? {name: o.name, currency: o.currency, cents: 0, lines: []};
    row.cents += minorUnits(o.amount); row.lines.push(o); by.set(k, row);
  }
  return [...by.values()].sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name));
}
/** Settles everything one person owes in a currency: the lines marked settled, and the money back in the log, left out of the figures. */
export function settle(log: MoneyLog, more: MoneyMore, name: string, currency: string, today: string, id: string, now: string): {log: MoneyLog; more: MoneyMore; cents: number} {
  const open = (more.owed ?? []).filter(o => !o.settled && o.name.toLowerCase() === name.toLowerCase() && o.currency === currency);
  if (!open.length) throw new Error(`${name} owes you nothing open in ${currency}.`);
  const cents = open.reduce((s, o) => s + minorUnits(o.amount), 0), ids = new Set(open.map(o => o.id));
  const back: MoneyEntry = {id, kind: 'income', amount: fromMinor(cents), currency, category: 'Refund', note: `${open[0]!.name} paid back · shared costs`.slice(0, 200), date: today, createdAt: now, source: 'form', excluded: true};
  return {cents, log: {...log, entries: [...log.entries, back].slice(-10_000)}, more: {...more, owed: (more.owed ?? []).map(o => ids.has(o.id) ? {...o, settled: today} : o)}};
}

// ── Lent and borrowed ──────────────────────────────────────────────────────────────────────────────────────────────
export type LoanInput = {kind: Loan['kind']; name: string; amount: string; currency: string; date: string; due?: string; remind?: boolean; note?: string};
export function loanIssue(input: LoanInput): string | null {
  if (!name40(input.name)) return 'Give the person’s name.';
  if (!amountText.safeParse(input.amount).success) return 'Enter the amount above zero, with at most two decimals.';
  if (!currencyCode.safeParse(input.currency).success) return 'Choose a currency.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Choose the day.';
  if (input.due && (!/^\d{4}-\d{2}-\d{2}$/.test(input.due) || input.due < input.date)) return 'The due day comes on or after the day it was lent or borrowed.';
  if (input.remind && !input.due) return 'A reminder needs a due day.';
  return null;
}
export function addLoan(more: MoneyMore, input: LoanInput, id: string): MoneyMore {
  const issue = loanIssue(input); if (issue) throw new Error(issue);
  const list = more.loans ?? [];
  if (list.length >= MAX_LOANS) throw new Error(`Up to ${MAX_LOANS} loans; remove a closed one first.`);
  const loan: Loan = {id, kind: input.kind, name: name40(input.name), amount: input.amount, currency: input.currency, date: input.date, ...(input.due ? {due: input.due} : {}), ...(input.remind && input.due ? {remind: true as const} : {}), ...(input.note?.trim() ? {note: input.note.trim().slice(0, 80)} : {})};
  return {...more, loans: [...list, loan]};
}
export const loanLeft = (l: Loan) => Math.max(0, minorUnits(l.amount) - (l.repaid ?? []).reduce((s, r) => s + minorUnits(r.amount), 0));
/** A repayment in part (at most what is left); paid in full, the loan closes on that day. */
export function repay(more: MoneyMore, id: string, amount: string, date: string): MoneyMore {
  if (!amountText.safeParse(amount).success) throw new Error('Enter the amount repaid above zero, with at most two decimals.');
  return {...more, loans: (more.loans ?? []).map(l => {
    if (l.id !== id) return l;
    if (l.closed) throw new Error('This one is closed already.');
    const left = loanLeft(l);
    if (minorUnits(amount) > left) throw new Error(`Only ${fromMinor(left)} is left.`);
    if ((l.repaid ?? []).length >= MAX_REPAID) throw new Error(`Up to ${MAX_REPAID} repayments on one.`);
    const next: Loan = {...l, repaid: [...(l.repaid ?? []), {date, amount: fromMinor(minorUnits(amount))}]};
    return loanLeft(next) === 0 ? {...next, closed: date} : next;
  })};
}
/** Closed (repaid) or, for money lent, forgiven: what is left is no longer owed. */
export function closeLoan(more: MoneyMore, id: string, today: string, forgive = false): MoneyMore {
  return {...more, loans: (more.loans ?? []).map(l => l.id !== id ? l : {...l, closed: today, ...(forgive && l.kind === 'lent' ? {forgiven: true as const} : {})})};
}
export function removeLoan(more: MoneyMore, id: string): MoneyMore {
  const list = (more.loans ?? []).filter(l => l.id !== id);
  const {loans: _l, ...rest} = more; void _l;
  return list.length ? {...rest, loans: list} : rest;
}
export type LoanRow = {loan: Loan; left: number; repaid: number; state: 'open' | 'due-soon' | 'overdue' | 'closed' | 'forgiven'; days: number | null};
const daysTo = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const DUE_SOON_DAYS = 3;
export function loanRows(more: Pick<MoneyMore, 'loans'> | null | undefined, today: string): LoanRow[] {
  return (more?.loans ?? []).map(l => {
    const left = loanLeft(l), repaid = minorUnits(l.amount) - left, days = l.due ? daysTo(today, l.due) : null;
    const state: LoanRow['state'] = l.forgiven ? 'forgiven' : l.closed ? 'closed' : days !== null && days < 0 ? 'overdue' : days !== null && days <= DUE_SOON_DAYS ? 'due-soon' : 'open';
    return {loan: l, left, repaid, state, days};
  }).sort((a, b) => (a.loan.closed ? 1 : 0) - (b.loan.closed ? 1 : 0) || (a.loan.due ?? '9999').localeCompare(b.loan.due ?? '9999') || a.loan.name.localeCompare(b.loan.name));
}
export type BesideWorth = {currency: string; lent: number; borrowed: number; owed: number; net: number};
/** What sits beside net worth, per currency: money lent and owed to you from shared costs (yours), money borrowed (owed by you). */
export function besideWorth(more: Pick<MoneyMore, 'loans' | 'owed'> | null | undefined): BesideWorth[] {
  const by = new Map<string, BesideWorth>(), row = (c: string) => { const r = by.get(c) ?? {currency: c, lent: 0, borrowed: 0, owed: 0, net: 0}; by.set(c, r); return r; };
  for (const l of more?.loans ?? []) if (!l.closed) { const r = row(l.currency), left = loanLeft(l); if (l.kind === 'lent') r.lent += left; else r.borrowed += left; }
  for (const o of owedTotals(more)) row(o.currency).owed += o.cents;
  return [...by.values()].map(r => ({...r, net: r.lent + r.owed - r.borrowed})).filter(r => r.lent || r.borrowed || r.owed).sort((a, b) => a.currency.localeCompare(b.currency));
}
/** For Today and the device notice: open loans with a reminder, due within three days or past due. */
export function loansDue(more: Pick<MoneyMore, 'loans'> | null | undefined, today: string): LoanRow[] {
  return loanRows(more, today).filter(r => r.loan.remind && (r.state === 'due-soon' || r.state === 'overdue'));
}
/** The device notices (the money notice type): the day before a reminded loan is due, and its day. Stateless; titles for names-on only. */
export function loanWakes(more: Pick<MoneyMore, 'loans'> | null | undefined, today: string): {id: string; date: string; title: string; detail: string}[] {
  return loanRows(more, today).flatMap(r => {
    if (!r.loan.remind || !r.loan.due || r.loan.closed) return [];
    const what = r.loan.kind === 'lent' ? `${r.loan.name} owes you` : `You owe ${r.loan.name}`, detail = `${r.loan.currency} ${fromMinor(r.left)} left`;
    return [{id: `money:loan:${r.loan.id}:1`, date: addLocalDays(r.loan.due, -1), title: `${what}: due tomorrow`, detail}, {id: `money:loan:${r.loan.id}:0`, date: r.loan.due, title: `${what}: due today`, detail}].filter(w => w.date >= today);
  });
}
