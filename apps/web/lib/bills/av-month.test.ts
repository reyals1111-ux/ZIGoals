import {describe, expect, it} from 'vitest';
import {billsThisMonth, dueBeforePayday, nextPayday} from './month';
import type {BillsRecord} from './schema';
import type {MoneyEntry} from '../money-log/schema';

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
});
