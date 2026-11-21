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
  // Session AV (fresh-agent check q2, rank 22): the payee part, from the first letters, and letters of every script.
  it('matches the payee part of a note, from its first three letters, in any script', () => {
    const log = [e('2026-10-01', 'Groceries', 'Weekly shop · SHOWCASE DATA'), e('2026-10-08', 'Groceries', 'Weekly shop · SHOWCASE DATA'), e('2026-10-09', 'Dining', 'Lunch with Sam'), e('2026-10-10', 'Dining', 'Кафе Пушкин'), e('2026-10-11', 'Fun', '喫茶店')];
    expect(pastCategory(log, 'expense', 'Weekly shop')).toEqual({category: 'Groceries', times: 2});
    expect(pastCategory(log, 'expense', 'weekly shop')).toEqual({category: 'Groceries', times: 2});
    expect(pastCategory(log, 'expense', 'wee')).toEqual({category: 'Groceries', times: 2, payee: 'Weekly shop'});
    expect(pastCategory(log, 'expense', 'we')).toBeNull(); // two letters are too few
    expect(pastCategory(log, 'expense', 'Lunch')).toEqual({category: 'Dining', times: 1, payee: 'Lunch with Sam'});
    expect(pastCategory([e('2026-10-09', 'Dining', 'Lunch')], 'expense', 'Lunch with Ana')).toEqual({category: 'Dining', times: 1, payee: 'Lunch'});
    expect(pastCategory(log, 'expense', 'кафе пушкин')).toEqual({category: 'Dining', times: 1});
    expect(pastCategory(log, 'expense', 'Каф')).toEqual({category: 'Dining', times: 1, payee: 'Кафе Пушкин'});
    expect(pastCategory(log, 'expense', '喫茶店')).toEqual({category: 'Fun', times: 1});
    expect(pastCategory(log, 'expense', 'Lunchbox')).toBeNull(); // a longer word is not a prefix match of "Lunch"
  });
  it('an exact payee wins over a prefix', () => {
    const log = [e('2026-10-01', 'Fun', 'Bar'), e('2026-10-02', 'Dining', 'Barista'), e('2026-10-03', 'Dining', 'Barista')];
    expect(pastCategory(log, 'expense', 'bar')).toEqual({category: 'Fun', times: 1});
  });
});
