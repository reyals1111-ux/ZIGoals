import {describe, expect, test} from 'vitest';
import {assignView, averageSpent, budgetCsv, moveMoney, neededIn, quickAssign, removeMove, setMonthAmount, setOptions, weeksIn} from './assign';
import {budgetedIn, carriedInto, monthView} from './engine';
import {readyToAssign} from './ready-to-assign';
import {budgetsSchema, type BudgetsRecord} from './schema';
import type {MoneyEntry} from '../money-log/schema';
import {eventsAt, runFiModel} from '../fi-model/model';
import {av2MoneyAnswer} from '../ai/local-answers/av2-money';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';

/** Session AV lane 2 (money; YNAB targets and assign mode, Monarch flex and non-monthly budgets, Copilot suggestions, Monarch scenarios). */
let n = 0;
const e = (date: string, amount: string, category = 'Groceries', kind: MoneyEntry['kind'] = 'expense'): MoneyEntry => ({id: `a${n++}`, kind, amount, currency: 'EUR', category, date, createdAt: `${date}T10:00:00.000Z`});
const TODAY = '2026-11-14', AT = '2026-11-14T10:00:00.000Z';
const rec = (budgets: BudgetsRecord['budgets'], more: Partial<BudgetsRecord> = {}): BudgetsRecord => budgetsSchema.parse({version: 1, budgets, ...more});
const g = {id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: true, since: '2026-09'};
const d = {id: 'd', category: 'Dining', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-09'};

describe('target types and Underfunded (YNAB)', () => {
  test('weekly × the weeks that start in the month, monthly, yearly by its month; snoozed counts nothing', () => {
    expect(weeksIn('2026-11')).toBe(5); expect(weeksIn('2026-12')).toBe(4);
    const r = rec([{...g, need: {kind: 'weekly', amount: '70.00'}}, {...d, need: {kind: 'monthly', amount: '120.00'}}, {id: 'i', category: 'Insurance', currency: 'EUR', monthly: '50.00', rollover: true, since: '2026-11', need: {kind: 'yearly', amount: '600.00', month: '2027-03'}}]);
    const v = assignView([], r, '2026-11', TODAY), row = (id: string) => v.rows.find(x => x.id === id)!;
    expect(row('g').need).toEqual({cents: 35000, words: '70.00 a week × 5 weeks'});
    expect(row('g').underfunded).toBe(5000);
    expect(row('d').underfunded).toBe(2000);
    expect(row('i').need!.cents).toBe(12000); // 600 over November to March (5 months)
    expect(v.underfunded).toEqual([{currency: 'EUR', cents: 5000 + 2000 + 7000}]);
    const snoozed = setOptions(r, 'g', {snooze: '2026-11'});
    expect(assignView([], snoozed, '2026-11', TODAY).rows.find(x => x.id === 'g')).toMatchObject({need: null, underfunded: 0, snoozed: true});
    expect(neededIn({...g, snoozed: '2026-12'} as never, {carried: 0}, '2026-11')).toBeNull();
  });
});

describe('assign mode (YNAB)', () => {
  const log = [e('2026-08-03', '250.00'), e('2026-09-03', '280.00'), e('2026-10-03', '320.00'), e('2026-11-02', '50.00', 'Dining')];
  test('a different amount for one month counts in that month, its carry and Ready to assign', () => {
    const r = setMonthAmount(rec([g]), 'g', '2026-11', 45000);
    expect(budgetedIn(r.budgets[0]!, '2026-11')).toBe(45000);
    expect(budgetedIn(r.budgets[0]!, '2026-12')).toBe(30000);
    expect(monthView(log, r, '2026-11', TODAY).rows[0]!.budgeted).toBe(45000);
    expect(readyToAssign([e('2026-11-01', '2000.00', 'Salary', 'income')], r, '2026-11')[0]).toMatchObject({held: 45000});
    expect(setMonthAmount(r, 'g', '2026-11', null).budgets[0]!.months).toBeUndefined();
    expect(() => setMonthAmount(r, 'g', '2026-11', 0)).toThrow('above zero');
  });
  test('quick-assign: underfunded, the same as last month, the 3-month average', () => {
    const r = rec([{...g, need: {kind: 'monthly', amount: '350.00'}}, d]);
    const funded = quickAssign(r, log, '2026-11', TODAY, 'underfunded');
    expect(funded.changed).toBe(1);
    expect(funded.record.budgets[0]!.months).toEqual({'2026-11': '350.00'});
    const last = quickAssign(setMonthAmount(r, 'g', '2026-10', 40000), log, '2026-11', TODAY, 'last-month');
    expect(last.record.budgets[0]!.months?.['2026-11']).toBe('400.00');
    expect(averageSpent(log, 'Groceries', 'EUR', '2026-11')).toEqual({cents: 28400, months: 3});
    expect(quickAssign(r, log, '2026-11', TODAY, 'average').record.budgets[0]!.months?.['2026-11']).toBe('284.00');
  });
  test('moving money between two budgets in a month, never more than is left; removed again', () => {
    const r = rec([g, d]);
    const moved = moveMoney(r, log, '2026-11', TODAY, 'g', 'd', 2000, 'm1', AT);
    const v = monthView(log, moved, '2026-11', TODAY);
    expect(v.rows.find(x => x.id === 'g')!.budgeted).toBe(28000);
    expect(v.rows.find(x => x.id === 'd')!.budgeted).toBe(12000);
    expect(() => moveMoney(r, log, '2026-11', TODAY, 'd', 'g', 6000, 'm2', AT)).toThrow('has 50.00 left');
    expect(() => moveMoney(r, log, '2026-11', TODAY, 'g', 'g', 100, 'm3', AT)).toThrow('two different');
    expect(removeMove(moved, 'm1').moves).toBeUndefined();
  });
});

describe('flex buckets, non-monthly budgets, a starting balance, groups (Monarch)', () => {
  test('one "flexible left"; a yearly amount set aside monthly; the start carried in', () => {
    let r = rec([g, d]);
    r = setOptions(r, 'g', {bucket: 'flexible', group: 'Everyday'});
    r = setOptions(r, 'd', {bucket: 'flexible', group: 'Everyday'});
    const v = assignView([e('2026-11-02', '50.00', 'Dining')], r, '2026-11', TODAY);
    expect(v.flexibleLeft).toEqual([{currency: 'EUR', cents: 30000 + 5000 + 30000 + 30000, count: 2}]); // Groceries carries Sep and Oct unspent
    expect(v.rows.every(x => x.group === 'Everyday')).toBe(true);
    const ins = setOptions(rec([{id: 'i', category: 'Insurance', currency: 'EUR', monthly: '1.00', rollover: false, since: '2026-11'}]), 'i', {period: {every: 12, amount: '600.00'}});
    expect(ins.budgets[0]).toMatchObject({monthly: '50.00', rollover: true, bucket: 'non-monthly', period: {every: 12, amount: '600.00'}});
    const started = rec([{...g, since: '2026-11', start: '25.00'}]);
    expect(carriedInto(started.budgets[0]!, [], '2026-11')).toBe(2500);
    expect(carriedInto(started.budgets[0]!, [], '2026-12')).toBe(32500);
  });
  test('the month as CSV, formula-safe', () => {
    const csv = budgetCsv(assignView([e('2026-11-02', '50.00', '=Dining')], rec([{...d, category: '=Dining'}]), '2026-11', TODAY));
    expect(csv.split('\r\n')[0]).toBe('"Month","Group","Category","Bucket","Currency","Budgeted","Carried in","Available","Spent","Left","Needed","Underfunded"');
    expect(csv.split('\r\n')[1]).toBe('"2026-11","","\'=Dining","fixed","EUR",100.00,0.00,100.00,50.00,50.00,,0.00');
  });
});

describe('life events in the long model (Monarch)', () => {
  test('once and every year from then; a big one out lowers the middle path', () => {
    expect(eventsAt([{year: 3, amount: 100, kind: 'out', every: 'once'}, {year: 2, amount: 10, kind: 'in', every: 'yearly'}], 3)).toBe(-90);
    expect(eventsAt([{year: 3, amount: 100, kind: 'out', every: 'once'}], 4)).toBe(0);
    const base = {invested: 20000, yearlySpend: 30000, withdrawalPct: 4, monthlyContribution: 500, returnPct: 5, volatilityPct: 15, years: 20};
    const plain = runFiModel(base), car = runFiModel({...base, events: [{year: 2, amount: 15000, kind: 'out', every: 'once'}]});
    expect(car.bands[5]!.p50).toBeLessThan(plain.bands[5]!.p50);
    expect(car.bands[1]!.p50).toBe(plain.bands[1]!.p50);
  });
});

describe('answers', () => {
  const text = (q: string, s = showcaseAll()) => { const r = av2MoneyAnswer(q, zigiEnv(s)); return r && 'text' in r ? r.text : ''; };
  test('underfunded, flexible left, a suggested amount (EN and NL)', () => {
    const s = showcaseAll(), b = s.nova!.budgets!;
    s.nova = {...s.nova, budgets: {...b, budgets: b.budgets.map((x, i) => i === 0 ? {...x, need: {kind: 'monthly' as const, amount: '9999.00'}, bucket: 'flexible' as const} : x)}};
    expect(text('what is underfunded this month', s)).toMatch(/^Underfunded in Nov 2026: €[\d.,]+ — /);
    expect(text('welke budgetten komen tekort', s)).toMatch(/^Tekort in november 2026: /);
    expect(text('how much flexible budget is left', s)).toMatch(/^Flexible left in Nov 2026: €[\d.,]+ across 1 budget\.$/);
    expect(text('what is underfunded this month')).toContain('Nothing is underfunded');
    expect(text('what should my groceries budget be')).toMatch(/^Suggested from your own spending: Groceries: €/);
  });
});
