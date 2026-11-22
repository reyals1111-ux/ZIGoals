import {isDebtKind, type Accounts} from '../accounts/schema';
import type {DebtPlannerRecord} from '../debt-planner/store';
import {parseCents, toCents} from '../debt-planner/plan';
import {addLocalDays} from '../local-date';
import type {MoneyEntry} from '../money-log/schema';
import {shiftMonth} from '../budgets/engine';
import {billsThisMonth, type MonthBillState} from './month';
import {manualBillIssue} from './store';
import {BILL_CADENCES, billsSchema, type Bill, type BillCadence, type BillsRecord} from './schema';

/**
 * Session AV lane 2 (money; Undebt.it's Plan.it and Bill Tracker): a bill's payment history across the last 12 months
 * (each due date as the money log shows it: seen, or passed without it), editing a bill, the person's "autopay" mark,
 * "Mark paid" (an expense in the money log on the due day), and this month's debt minimums beside the bills (paid when
 * a payment is recorded on that debt this month). ZIGoals pays nothing; every mark is the person's own record. Pure.
 */
export type HistoryLine = {due: string; state: MonthBillState};
export function billHistory(bill: Bill, entries: readonly MoneyEntry[], today: string, months = 12): HistoryLine[] {
  const out: HistoryLine[] = [], record: BillsRecord = {version: 1, bills: [bill], dismissed: []};
  for (let k = months - 1; k >= 0; k--) {
    const month = shiftMonth(today.slice(0, 7), -k), last = addLocalDays(`${shiftMonth(month, 1)}-01`, -1), day = k === 0 ? today : last;
    if (`${month}-31` < bill.createdAt.slice(0, 10) && k > 0) continue;
    for (const l of billsThisMonth(record, entries, day).lines) if (l.due <= today) out.push({due: l.due, state: l.state});
  }
  return out;
}
export type BillEdit = {title: string; amount: string; currency: string; cadence: BillCadence; nextDue: string};
export function editBill(record: BillsRecord, id: string, edit: BillEdit): BillsRecord {
  const issue = manualBillIssue(edit); if (issue) throw new Error(issue);
  if (!BILL_CADENCES.includes(edit.cadence)) throw new Error('Choose how often it is due.');
  return billsSchema.parse({...record, bills: record.bills.map(b => b.id === id ? {...b, title: edit.title.trim(), amount: edit.amount, currency: edit.currency, cadence: edit.cadence, nextDue: edit.nextDue} : b)});
}
export function setAutopay(record: BillsRecord, id: string, on: boolean): BillsRecord {
  return billsSchema.parse({...record, bills: record.bills.map(b => { if (b.id !== id) return b; const {autopay: _a, ...rest} = b; void _a; return on ? {...rest, autopay: true} : rest; })});
}
/** The expense "Mark paid" adds: the bill's amount, on its due day (today when the day is still ahead), by the person's hand. */
export function paidEntry(bill: Bill, due: string, today: string, id: string, now: string): MoneyEntry {
  return {id, kind: 'expense', amount: bill.amount, currency: bill.currency, category: bill.category || 'Bills', note: bill.title.slice(0, 200), date: due <= today ? due : today, createdAt: now, source: 'form'};
}
export type DebtDue = {id: string; name: string; currency: string; cents: bigint; paid: boolean};
/** This month's minimum for each debt the planner keeps one for, and whether a payment is recorded on it this month. */
export function debtMinimumsThisMonth(accounts: Accounts | null | undefined, planner: DebtPlannerRecord | null | undefined, today: string): DebtDue[] {
  const month = today.slice(0, 7);
  return (accounts?.items ?? []).flatMap(a => {
    const min = planner?.debts?.[a.id]?.minimum, c = min ? parseCents(min) : null;
    if (a.archivedAt || !isDebtKind(a.kind) || !c) return [];
    const owed = [...a.snapshots].sort((x, y) => y.date.localeCompare(x.date))[0];
    if (owed && toCents(BigInt(owed.value), owed.decimals) <= 0n) return [];
    return [{id: a.id, name: a.name, currency: a.currency, cents: c, paid: a.payments.some(p => p.date.startsWith(month))}];
  });
}
