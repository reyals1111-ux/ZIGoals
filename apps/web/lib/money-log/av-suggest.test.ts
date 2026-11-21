import {describe, expect, it} from 'vitest';
import {pastCategory} from './suggest';
import type {MoneyEntry} from './schema';

/** Session AV (owner follow-up 1, F-CATEGORY-SUGGEST): the category chosen before for the same payee or note. */
let n = 0;
const e = (date: string, category: string, note?: string, kind: 'expense' | 'income' = 'expense'): MoneyEntry => ({id: `g${n++}`, kind, amount: '10.00', currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`, ...(note ? {note} : {})});
describe('Session AV (F-CATEGORY-SUGGEST)', () => {
  it('the most used category for the same note, case, accents and numbers aside; the latest on a tie', () => {
    const log = [e('2026-10-01', 'Dining', 'Café Noël'), e('2026-10-08', 'Dining', 'cafe noel 2'), e('2026-11-01', 'Fun', 'CAFE NOEL'), e('2026-11-02', 'Groceries', 'Weekly shop')];
    expect(pastCategory(log, 'expense', 'café noël')).toEqual({category: 'Dining', times: 2});
    expect(pastCategory([e('2026-10-01', 'Dining', 'Bar'), e('2026-11-01', 'Fun', 'bar')], 'expense', 'BAR')).toEqual({category: 'Fun', times: 1});
  });
  it('nothing for another kind, an unseen note or two letters', () => {
    const log = [e('2026-10-01', 'Salary', 'Fictional employer', 'income')];
    expect(pastCategory(log, 'expense', 'Fictional employer')).toBeNull();
    expect(pastCategory(log, 'income', 'Someone new')).toBeNull();
    expect(pastCategory(log, 'income', 'ab')).toBeNull();
    expect(pastCategory(log, 'income', 'fictional employer')).toEqual({category: 'Salary', times: 1});
  });
});
