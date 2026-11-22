import {describe, expect, test} from 'vitest';
import {questionChart, questionEntries} from './saved-searches';
import {byCategory} from './engine';
import type {MoneyEntry} from './schema';
import type {SavedQuestion} from '../money-more/schema';
import {av2R4MoneyAnswer} from '../ai/local-answers/av2-r4-money';
import {freshAll, zigiEnv} from '../ai/evals/as/harness';
import type {ToolEnv} from '../ai/tools/env';

/**
 * Review b4f #1 (Blocker): a saved search on a category charts only that category's part of a split entry, as Spending's
 * `byCategory` does — never the whole entry — and NOVA's and ZIGi's saved-search answer says the same figure.
 */
const TODAY = '2026-11-14';
const receipt: MoneyEntry = {id: 'split1', kind: 'expense', amount: '100.00', currency: 'EUR', category: 'Groceries', note: 'Market', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', parts: [{amount: '70.00', category: 'Groceries'}, {amount: '30.00', category: 'Home'}]};
const coffee: MoneyEntry = {id: 'split2', kind: 'expense', amount: '20.00', currency: 'EUR', category: 'Food & drink', sub: 'Coffee', note: 'Café', date: '2026-11-04', createdAt: '2026-11-04T10:00:00.000Z', parts: [{amount: '5.00', category: 'Food & drink'}, {amount: '15.00', category: 'Groceries'}]};
const entries = [receipt, coffee];
const chart = (q: SavedQuestion) => questionChart(questionEntries(entries, q), q, TODAY)[0]!;

describe('review b4f #1: a saved search on a category counts that category’s part', () => {
  test('Groceries €85.00 and Home €30.00, as Spending’s byCategory says', () => {
    const spending = byCategory(entries, '2026-11-01', TODAY);
    const groceries = chart({id: 'g', name: 'Groceries', category: 'Groceries'}), home = chart({id: 'h', name: 'Home', category: 'home'});
    expect(groceries.total).toBe(spending.find(r => r.category === 'Groceries')!.total);
    expect(groceries.total).toBe(8_500);
    expect(groceries.bars.at(-1)!.cents).toBe(8_500);
    expect(home).toMatchObject({total: 3_000, monthly: 3_000});
  });
  test('by category lists only the searched category; a subcategory counts only its own category’s part', () => {
    expect(chart({id: 'g', name: 'Groceries', category: 'Groceries', by: 'category'}).bars).toEqual([{key: 'Groceries', label: 'Groceries', cents: 8_500}]);
    expect(chart({id: 'c', name: 'Coffee', sub: 'Coffee'}).total).toBe(500);
    expect(chart({id: 'a', name: 'Market', text: 'market'}).total).toBe(10_000); // no category: the whole entry
  });
  test('the answer says the same figure', () => {
    const s = freshAll(), env = {...zigiEnv({...s, moneyLog: {...s.moneyLog!, entries}}), moneyMore: {version: 1, questions: [{id: 'h', name: 'Home costs', category: 'Home'}]}} as ToolEnv;
    const reply = av2R4MoneyAnswer('what are my saved searches', env);
    expect(reply && 'text' in reply ? reply.text : '').toContain('Home costs: €30.00 spent since');
  });
});
