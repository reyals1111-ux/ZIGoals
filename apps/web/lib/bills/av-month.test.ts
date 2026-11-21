import {describe, expect, it} from 'vitest';
import {billsThisMonth, dueBeforePayday, nextPayday} from './month';
import type {BillsRecord} from './schema';
import type {MoneyEntry} from '../money-log/schema';
import {stepDue} from './cadence';
import {buildShowcase} from '../showcase-data';
import {BILLS_KEY, billsSchema} from './schema';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';

/** Session AV (owner follow-up 1, F-BILLS-MONTH; Copilot, Rocket Money): this month's bills, and until payday. */
const bill = (id: string, title: string, amount: string, nextDue: string, category?: string) => ({id, title, amount, currency: 'EUR', cadence: 'monthly' as const, nextDue, origin: 'manual' as const, ...(category ? {category} : {}), createdAt: '2026-09-01T10:00:00.000Z'});
const record: BillsRecord = {version: 1, bills: [bill('r', 'Fictional rent', '900.00', '2026-10-01'), bill('g', 'Fictional gym', '30.00', '2026-10-10'), bill('p', 'Fictional phone', '20.00', '2026-10-28')], dismissed: []};
const e = (id: string, date: string, amount: string, note: string, kind: 'expense' | 'income' = 'expense', category = kind === 'income' ? 'Salary' : 'Housing'): MoneyEntry => ({id, kind, amount, currency: 'EUR', category, note, date, createdAt: `${date}T10:00:00.000Z`});
const TODAY = '2026-11-21';
describe('Session AV (F-BILLS-MONTH)', () => {
  it('says which dates the money log has, which passed without it, and which are still to come', () => {
    const entries = [e('a', '2026-11-02', '900.00', 'Fictional rent'), e('b', '2026-11-03', '899.00', 'Fictional rent')];
    const m = billsThisMonth(record, entries, TODAY);
    expect(m.lines.map(l => [l.title, l.due, l.state])).toEqual([['Fictional rent', '2026-11-01', 'seen'], ['Fictional gym', '2026-11-10', 'passed'], ['Fictional phone', '2026-11-28', 'coming']]);
    expect(m.totals).toEqual([{currency: 'EUR', seen: 90000, left: 5000, seenCount: 1, leftCount: 2}]);
  });
  it('does not take an entry of another payee, a different amount or a far day', () => {
    const entries = [e('x', '2026-11-10', '30.00', 'Fictional cinema'), e('y', '2026-11-10', '45.00', 'Fictional gym'), e('z', '2026-11-20', '30.00', 'Fictional gym')];
    expect(billsThisMonth(record, entries, TODAY).lines.find(l => l.billId === 'g')!.state).toBe('passed');
  });
  it('finds the next payday from a monthly income, and the bills due before it', () => {
    const entries = [e('s1', '2026-09-25', '2500.00', 'Fictional employer', 'income'), e('s2', '2026-10-25', '2500.00', 'Fictional employer', 'income'), e('f', '2026-11-05', '40.00', 'Fictional gift', 'income', 'Gift')];
    const p = nextPayday(entries, TODAY)!;
    expect(p).toEqual({date: '2026-11-25', source: 'Fictional employer', currency: 'EUR'});
    expect(dueBeforePayday(record, entries, TODAY, p.date)).toEqual([]); // the phone is due on the 28th, after payday
    expect(dueBeforePayday(record, entries, '2026-11-26', '2026-12-25')).toEqual([{currency: 'EUR', cents: 95000, count: 3}]);
    expect(nextPayday([e('s1', '2026-10-25', '2500.00', 'Fictional employer', 'income')], TODAY)).toBeNull();
  });
  // Session AV (fresh-agent check q2, rank 42 Blocker): a confirmed or detected bill stores its NEXT due date (after
  // today), so this month's dates lie before it; they are counted back from it by the cadence.
  it('counts this month\'s dates back from a next due date after today', () => {
    const gym: BillsRecord = {version: 1, dismissed: [], bills: [bill('g', 'Fictional gym', '30.00', '2026-12-03')]};
    const paid = [e('a', '2026-09-03', '30.00', 'Fictional gym'), e('b', '2026-10-03', '30.00', 'Fictional gym'), e('c', '2026-11-03', '30.00', 'Fictional gym')];
    expect(billsThisMonth(gym, paid, TODAY).lines.map(l => [l.due, l.state])).toEqual([['2026-11-03', 'seen']]);
    const weekly: BillsRecord = {version: 1, dismissed: [], bills: [{...bill('w', 'Fictional box', '12.00', '2026-11-26'), cadence: 'weekly'}]};
    expect(billsThisMonth(weekly, [], TODAY).lines.map(l => [l.due, l.state])).toEqual([['2026-11-05', 'passed'], ['2026-11-12', 'passed'], ['2026-11-19', 'passed'], ['2026-11-26', 'coming']]);
    const yearly: BillsRecord = {version: 1, dismissed: [], bills: [{...bill('y', 'Fictional insurance', '180.00', '2027-01-05'), cadence: 'yearly'}]};
    expect(billsThisMonth(yearly, [], TODAY).lines).toEqual([]);
    // The 31st stays the month's last day when stepping back too.
    expect([stepDue('2027-01-31', 'monthly', -2), stepDue('2027-01-31', 'monthly', -1)]).toEqual(['2026-11-30', '2026-12-31']);
    // A date still ahead but before the next due date the person gave is not due: they said the next one is later.
    const later: BillsRecord = {version: 1, dismissed: [], bills: [bill('l', 'Fictional club', '25.00', '2027-01-25')]};
    expect(billsThisMonth(later, [], TODAY).lines).toEqual([]);
  });
  it('shows the Showcase\'s bills this month, with the ones its money log has', () => {
    const {records} = buildShowcase(TODAY, 'UTC');
    const bills = billsSchema.parse(JSON.parse(records[BILLS_KEY]!)), log = moneyLogSchema.parse(JSON.parse(records[MONEY_LOG_KEY]!));
    const m = billsThisMonth(bills, log.entries, TODAY);
    expect(m.lines.length).toBeGreaterThanOrEqual(3);
    expect(m.lines.filter(l => l.state === 'seen').map(l => l.billId).sort()).toEqual(['showcase-bill-energy', 'showcase-bill-music']);
  });
});
