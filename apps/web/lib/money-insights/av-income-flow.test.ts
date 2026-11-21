import {describe, expect, it} from 'vitest';
import {incomeFlow} from './income-flow';
import type {MoneyEntry} from '../money-log/schema';

/** Session AV (owner follow-up 1, F-INCOME-FLOW): a month's income and where it went, one currency, never converted. */
let n = 0;
const e = (date: string, amount: string, category: string, kind: 'expense' | 'income' = 'expense', currency = 'EUR'): MoneyEntry => ({id: `f${n++}`, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`});
describe('Session AV (F-INCOME-FLOW)', () => {
  it('each category by size, then what is left; the sources named', () => {
    const f = incomeFlow([e('2026-11-01', '2000.00', 'Salary', 'income'), e('2026-11-02', '800.00', 'Home'), e('2026-11-03', '250.00', 'Groceries'), e('2026-11-04', '50.00', 'Fun'), e('2026-10-30', '99.00', 'Fun'), e('2026-11-05', '9.00', 'Fun', 'expense', 'USD')], 'EUR', '2026-11');
    expect(f).toMatchObject({income: 200000, spent: 110000, sources: [{label: 'Salary', cents: 200000}]});
    expect(f.parts).toEqual([{label: 'Home', cents: 80000, kind: 'category'}, {label: 'Groceries', cents: 25000, kind: 'category'}, {label: 'Fun', cents: 5000, kind: 'category'}, {label: 'Left', cents: 90000, kind: 'left'}]);
  });
  it('spending beyond income has no "Left"; beyond seven categories the rest are joined', () => {
    const cats = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const f = incomeFlow([e('2026-11-01', '100.00', 'Salary', 'income'), ...cats.map((c, i) => e('2026-11-02', `${20 - i}.00`, c))], 'EUR', '2026-11');
    expect(f.parts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Other categories']);
    expect(f.parts.at(-1)!.cents).toBe(1300 + 1200);
  });
});
