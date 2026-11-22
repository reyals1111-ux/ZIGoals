// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {fromQuestion, questionChart, questionEntries, questionsOf, removeQuestion, saveQuestion, setQuestionBy, toQuestion} from './saved-searches';
import {byCategory, totals} from './engine';
import {MONEY_MORE_KEY, moneyMoreSchema, type MoneyMore} from '../money-more/schema';
import type {MoneyEntry} from './schema';
import SavedView from '../../components/wealth/spending/insights/saved-view';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's Query Tool, LEDGER #344): a money search kept with a name and drawn
 * as a chart, its figures Wealth → Spending's own `totals` / `byCategory` over what it finds now.
 */
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `s${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Food & drink', note: 'Café Noël', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});
const TODAY = '2026-11-14';
const entries = [e({}), e({amount: '24.00', share: '12.00', date: '2026-10-10'}), e({amount: '50.00', excluded: true, date: '2026-10-11'}), e({amount: '8.00', date: '2026-09-02', category: 'Fun'}), e({amount: '99.00', note: 'Rent', category: 'Home'}), e({amount: '3.00', currency: 'USD', date: '2026-11-04'})];
const state = {query: {text: 'café', kind: 'expense' as const, category: '', from: '', to: '', not: '', payee: '', counted: 'all' as const, tax: false, paidWith: '', sub: ''}, min: '', max: '', tag: ''};

describe('saved searches with a chart (#344)', () => {
  test('only the filters are kept, empty ones left out; it opens as it was saved', () => {
    const q = toQuestion('q1', ' Eating  out ', state);
    expect(q).toEqual({id: 'q1', name: 'Eating out', text: 'café', kind: 'expense'});
    expect(fromQuestion(q).query).toMatchObject({text: 'café', kind: 'expense', category: ''});
    expect(moneyMoreSchema.parse({version: 1, questions: [q]}).questions).toEqual([q]);
    expect(() => toQuestion('q2', ' ', state)).toThrow('Give the search a name');
  });
  test('up to ten; the same name replaces; remove; by week or category kept', () => {
    let more: MoneyMore = {version: 1};
    for (let i = 0; i < 10; i++) more = saveQuestion(more, toQuestion(`q${i}`, `Search ${i}`, state));
    expect(() => saveQuestion(more, toQuestion('q10', 'One more', state))).toThrow('Up to 10 saved searches.');
    more = saveQuestion(more, {...toQuestion('qx', 'search 3', state), text: 'rent'});
    expect(questionsOf(more)[3]).toMatchObject({id: 'q3', text: 'rent'});
    more = setQuestionBy(more, 'q3', 'week');
    expect(questionsOf(more)[3]!.by).toBe('week');
    expect(questionsOf(setQuestionBy(more, 'q3', 'month'))[3]!.by).toBeUndefined();
    expect(questionsOf(removeQuestion(more, 'q0'))).toHaveLength(9);
    expect(removeQuestion({version: 1, questions: [toQuestion('a', 'A', state)]}, 'a')).toEqual({version: 1});
  });
  test('by month: Wealth → Spending’s figure for what it finds, per currency; the total and the monthly average', () => {
    const q = toQuestion('q', 'Café', state), found = questionEntries(entries, q);
    const [eur, usd] = questionChart(found, q, TODAY);
    expect(found.map(x => x.amount).sort()).toEqual(['10.00', '24.00', '3.00', '50.00', '8.00']);
    expect(eur!.bars.map(b => [b.key, b.cents])).toEqual([['2026-09', 800], ['2026-10', 1200], ['2026-11', 1000]]);
    expect(eur!.total).toBe(totals(found.filter(x => x.currency === 'EUR'), '2026-09-02', TODAY)[0]!.expenses);
    expect(eur).toMatchObject({total: 3000, months: 3, monthly: 1000, count: 3, figure: 'spent'});
    expect(usd).toMatchObject({currency: 'USD', total: 300});
  });
  test('by category and by week', () => {
    const q = {...toQuestion('q', 'Café', state), by: 'category' as const}, found = questionEntries(entries, q);
    expect(questionChart(found, q, TODAY)[0]!.bars).toEqual(byCategory(found.filter(x => x.currency === 'EUR'), '2026-09-02', TODAY).map(r => ({key: r.category, label: r.category, cents: r.total})));
    const weeks = questionChart(found, {...q, by: 'week', from: '2026-10-26'}, TODAY)[0]!;
    expect(weeks.bars.map(b => [b.key, b.cents])).toEqual([['2026-10-26', 0], ['2026-11-02', 1000], ['2026-11-09', 0]]);
  });
  test('the view: a chart and a table, the total and the average; an empty state that teaches', async () => {
    const box = document.createElement('div'); document.body.append(box);
    const root = createRoot(box);
    await act(async () => { root.render(createElement(SavedView, {entries, today: TODAY})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(box.textContent).toContain('No saved searches yet.');
    await act(async () => { root.unmount(); });
    localStorage.setItem(MONEY_MORE_KEY, JSON.stringify({version: 1, questions: [toQuestion('q', 'Café', state)]}));
    const again = createRoot(box);
    await act(async () => { again.render(createElement(SavedView, {entries, today: TODAY})); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(box.querySelector('.money-saved-total')!.textContent).toBe('Café · EUR: spent €30.00 from Sep 2, 2026 to Nov 14, 2026 (3 entries counted), €10.00 a month on average over 3 months.');
    expect(box.querySelector('svg[role="img"]')).not.toBeNull();
    expect([...box.querySelectorAll('tbody tr')].map(r => r.textContent)).toContain('Oct 2026€12.00');
    await act(async () => { again.unmount(); });
  });
});
