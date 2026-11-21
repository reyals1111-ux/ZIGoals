import {describe, expect, it} from 'vitest';
import {previewCategory, toMoneyEntries, withChosenCategories} from './index';
import {moneyRuleSchema} from '../money-rules/schema';
import {applyRules} from '../money-rules/engine';
import type {BankTransaction} from './types';

// Session AV (L-6, the rehearsal's Lina): the import preview shows each row's category, as the import will add it, and a
// category changed there is the one the entry gets.
const row = (index: number, payee: string, direction: 'in' | 'out' = 'out', amount = '12.50'): BankTransaction => ({index, date: '2026-11-02', amount, currency: 'EUR', direction, payee, reference: `r${index}`, description: ''});
const NOW = new Date('2026-11-20T10:00:00Z');
describe('the category in the import preview is the one the import adds', () => {
  const rows = [row(1, 'Fictional Grocer'), row(2, 'Fictional Bakery'), row(3, 'Employer BV', 'in', '2000'), row(4, 'Cinema Fictional')];
  it('reads it from the payee as the log\'s form does, then the person\'s rules', () => {
    expect(previewCategory(rows[0]!, [])).toBe('Groceries');
    const rule = moneyRuleSchema.parse({id: 'r1', text: 'Cinema', category: 'Fun'});
    expect(previewCategory(rows[3]!, [rule])).toBe('Fun');
    // The preview's answer equals the import's own for every row.
    const out = toMoneyEntries(rows, {entries: []}, NOW, (() => { let i = 0; return () => `e${++i}`; })());
    const made = applyRules(out.entries, [rule]).entries;
    expect(made.map(e => e.category)).toEqual(rows.map(t => previewCategory(t, [rule])));
    expect(out.indexes).toEqual([1, 2, 3, 4]);
  });
  it('a category chosen in the preview wins over the guess and the rules, row by row; others stay', () => {
    const out = toMoneyEntries(rows, {entries: []}, NOW, (() => { let i = 0; return () => `e${++i}`; })());
    const chosen = withChosenCategories(out.entries, out.indexes, new Map([[2, 'Food & drink'], [4, 'Fun']]));
    expect(chosen.map(e => e.category)).toEqual(['Groceries', 'Food & drink', previewCategory(rows[2]!, []), 'Fun']);
    expect(withChosenCategories(out.entries, out.indexes, new Map([[1, '   ']]))[0]!.category).toBe('Groceries');
  });
  it('a refused row leaves the others matched to their own file rows', () => {
    const out = toMoneyEntries([row(1, 'Fictional Grocer', 'out', '0'), row(2, 'Fictional Bakery')], {entries: []}, NOW, () => 'x');
    expect(out.indexes).toEqual([2]);
    expect(withChosenCategories(out.entries, out.indexes, new Map([[2, 'Fun']]))[0]!.category).toBe('Fun');
  });
});
