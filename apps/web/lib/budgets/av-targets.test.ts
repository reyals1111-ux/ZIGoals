import {describe, expect, it} from 'vitest';
import {budgetIssue, monthView, setBudget, targetLine} from './engine';
import {budgetsSchema, emptyBudgets} from './schema';
import type {MoneyEntry} from '../money-log/schema';
import {ask, novaEnv, showcaseAll} from '../ai/evals/as/harness';

/** Session AV (owner follow-up 1, F-BUDGET-TARGETS; YNAB targets): save towards an amount by a month, information only. */
const e = (date: string, amount: string, category = 'Gifts'): MoneyEntry => ({id: `${date}-${amount}`, kind: 'expense', amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`});
describe('Session AV (F-BUDGET-TARGETS)', () => {
  it('the line: set aside, to go, a month from next month, and on track, short, reached, past or this month', () => {
    expect(targetLine({amount: '600.00', by: '2027-02'}, '2026-11', 15000, 12000)).toEqual({amount: 60000, by: '2027-02', setAside: 12000, toGo: 48000, perMonth: 16000, monthsLeft: 3, state: 'short', short: 1000});
    expect(targetLine({amount: '600.00', by: '2027-02'}, '2026-11', 16000, 12000).state).toBe('on-track');
    expect(targetLine({amount: '100.00', by: '2027-02'}, '2026-11', 5000, 12000).state).toBe('reached');
    expect(targetLine({amount: '600.00', by: '2026-10'}, '2026-11', 5000, 12000).state).toBe('past');
    expect(targetLine({amount: '600.00', by: '2026-11'}, '2026-11', 5000, 12000)).toMatchObject({monthsLeft: 0, state: 'short', short: 48000});
  });
  it('kept on the budget, needs rollover, never before this month; null takes it off, leaving the budget', () => {
    expect(budgetIssue({category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: false, target: {amount: '200.00', by: '2026-12'}})).toMatch(/rollover/);
    expect(budgetIssue({category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: true, target: {amount: '0', by: '2026-12'}})).toMatch(/amount to save/);
    expect(() => setBudget(emptyBudgets(), {category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: true, target: {amount: '200.00', by: '2026-10'}}, 'b1', '2026-11')).toThrow(/this month or a later one/);
    const a = setBudget(emptyBudgets(), {category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: true, target: {amount: '200.00', by: '2026-12'}}, 'b1', '2026-11');
    expect(a.budgets[0]).toMatchObject({category: 'Gifts', target: {amount: '200.00', by: '2026-12'}});
    expect(setBudget(a, {category: 'Gifts', currency: 'EUR', monthly: '50.00', rollover: true}, 'b2', '2026-11').budgets[0]!.target).toEqual({amount: '200.00', by: '2026-12'});
    expect(setBudget(a, {category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: true, target: null}, 'b2', '2026-11').budgets[0]).not.toHaveProperty('target');
  });
  it('the month view: the row carries its target, from what is left after this month', () => {
    const record = budgetsSchema.parse({version: 1, budgets: [{id: 'b1', category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: true, since: '2026-11', target: {amount: '200.00', by: '2027-01'}}]});
    const row = monthView([e('2026-11-05', '10.00')], record, '2026-11', '2026-11-20').rows[0]!;
    expect(row.target).toMatchObject({setAside: 3000, toGo: 17000, perMonth: 8500, monthsLeft: 2, state: 'short', short: 4500});
  });
  it('a target this build cannot read is dropped on read, never failing the record', () => {
    expect(budgetsSchema.parse({version: 1, budgets: [{id: 'b1', category: 'Gifts', currency: 'EUR', monthly: '40.00', rollover: true, since: '2026-11', target: {amount: 'lots'}}]}).budgets[0]!.target).toBeUndefined();
  });
  it('NOVA on the device says the Showcase\'s Groceries target, in English and in Dutch (no model)', () => {
    const en = ask('how is my groceries budget', novaEnv(showcaseAll())).text, nl = ask('hoe staat mijn budget voor boodschappen', novaEnv(showcaseAll())).text;
    expect(en).toContain('Groceries: spent 187.10 EUR (62.90 EUR left); target 300.00 EUR by 2026-12: 62.90 EUR set aside, 237.10 EUR a month from next month (on track)');
    // Session AV lane 2 (Dutch dates, deliberate): the Dutch answer writes the month the Dutch way, "december 2026" (was "Dec 2026").
    expect(nl).toContain('doel €300.00 uiterlijk december 2026: €62.90 opzij, €237.10 per maand vanaf volgende maand, op schema');
  });
});
