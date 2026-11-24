import {describe, expect, it} from 'vitest';
import {billsSchema} from '../../bills/schema';
import {normalisePayee} from '../../bills/detect';
import {budgetsSchema} from '../../budgets/schema';
import {addLocalDays} from '../../local-date';
import {moneyLogSchema, type MoneyLog} from '../../money-log/schema';
import {showcaseMoneyLog} from '../../money-log/showcase';
import {moneyTagsSchema} from '../../money-tags/schema';
import {showcaseMoneyTags} from '../../money-tags/showcase';
import {emptyNetworthHistory, networthHistorySchema} from '../../networth-history';
import {showcaseNetworthHistory} from '../../networth-history-showcase';
import {ageCard, ageRows, billChangesCard, billChangesRows, moneyTagsCard, moneyTagsRows, paceCard, paceRows, readyCard, readyRows} from './money-insights';
import {decimalCents, historyMoney, netWorthHistoryAsOf, netWorthHistoryCard, netWorthHistoryRows} from './net-worth-history';

/**
 * Session AM-2 (step 3, "NOVA connected"): the Wealth widgets of what Sessions AO and AP added. Each selector is checked
 * against the page's own engine: exact cents, one currency at a time, unknown never a zero, nothing projected.
 */
const DAY = '2026-11-11';
const entry = (id: string, kind: 'expense' | 'income', amount: string, date: string, category = 'Groceries', currency = 'EUR', note?: string) => ({id, kind, amount, currency, category, date, createdAt: `${date}T12:00:00.000Z`, ...(note ? {note} : {})});
const log = (entries: ReturnType<typeof entry>[], currency = 'EUR'): MoneyLog => moneyLogSchema.parse({version: 1, entries, currency});
const day = (at: string) => at;

describe('net worth over time: a true net worth from the recorded days', () => {
  const history = (days: {day: string; sources: {source: string; currency: string; value: string | null; missing?: string[]}[]}[]) =>
    networthHistorySchema.parse({version: 1, days: days.map(d => ({day: d.day, at: `${d.day}T18:00:00.000Z`, sources: d.sources.map(s => ({asOf: null, ...s}))}))});
  it('decimal strings become exact cents, rounded half away from zero', () => {
    expect([decimalCents('12'), decimalCents('12.3'), decimalCents('-0.005'), decimalCents('1.994'), decimalCents('1.995'), decimalCents('123456789012345678.129')]).toEqual([1200n, 1230n, -1n, 199n, 200n, 12345678901234567813n]);
    expect(() => decimalCents('1e3')).toThrow();
  });
  it('holdings plus accounts minus debts, per day, in one currency; the Portfolio and the wallets stand apart', () => {
    const h = history([
      {day: '2026-11-08', sources: [{source: 'wealth', currency: 'USD', value: '1000.00'}, {source: 'accounts', currency: 'USD', value: '-250.50'}, {source: 'portfolio', currency: 'USD', value: '9999.00'}, {source: 'wallets', currency: 'USD', value: '400.00'}]},
      {day: '2026-11-10', sources: [{source: 'wealth', currency: 'USD', value: '1100.00'}, {source: 'accounts', currency: 'USD', value: '-200.00'}, {source: 'wealth', currency: 'EUR', value: '50.00'}]},
    ]);
    const c = netWorthHistoryCard(h, DAY, 'month');
    expect([c.state, c.currency, c.otherCurrencies]).toEqual(['live', 'USD', ['EUR']]);
    expect(c.points.map(p => p.cents)).toEqual([74950n, 90000n]); // 1000 − 250.50 and 1100 − 200: the portfolio's 9,999 is never added
    expect(c.change).toEqual({cents: 15050n, direction: 'up', since: '2026-11-08', percent: 20.08});
    expect(c.series).toEqual([749.5, null, 900]); // the day Wealth was not opened is a gap
    expect([c.recorded, c.notOpened, c.unknownDays, c.since]).toEqual([2, 1, 0, '2026-11-08']);
    expect(c.parts.map(p => [p.source, p.counted])).toEqual([['wealth', true], ['accounts', true]]);
    const first = netWorthHistoryCard(h, '2026-11-08', 'week');
    expect(first.parts.map(p => [p.label, p.counted, p.cents])).toEqual([['Wealth holdings', true, 100000n], ['Accounts and debts', true, -25050n], ['Portfolio', false, 999900n], ['Tracked wallets', false, 40000n]]);
    expect(first.change).toBeNull(); // one known day: no change to state
  });
  it('unknown is not zero: a day with a holding that had no value is a gap that names it, and the change skips it', () => {
    const h = history([
      {day: '2026-11-09', sources: [{source: 'wealth', currency: 'USD', value: '500.00'}]},
      {day: '2026-11-10', sources: [{source: 'wealth', currency: 'USD', value: null, missing: ['Fictional coin']}]},
      {day: '2026-11-11', sources: [{source: 'wealth', currency: 'USD', value: '520.00'}]},
    ]);
    const c = netWorthHistoryCard(h, DAY, 'week');
    expect(c.points.map(p => p.cents)).toEqual([50000n, null, 52000n]);
    expect(c.points[1]!.missing).toEqual(['Fictional coin']);
    expect([c.series, c.unknownDays, c.change?.cents]).toEqual([[500, null, 520], 1, 2000n]);
    const unknownToday = netWorthHistoryCard(history([{day: '2026-11-10', sources: [{source: 'wealth', currency: 'USD', value: '500.00'}]}, {day: DAY, sources: [{source: 'wealth', currency: 'USD', value: null, missing: ['Fictional coin']}]}]), DAY, 'week');
    expect([unknownToday.latest?.cents, unknownToday.latestKnown]).toEqual([null, {day: '2026-11-10', cents: 50000n}]);
    const rows = netWorthHistoryRows(unknownToday, cents => historyMoney(cents, 'USD'), () => 'x', day);
    expect(rows[0]).toEqual(['Net worth on 2026-11-11', 'Not known: no value for Fictional coin']);
    expect(rows.flat().join(' ')).not.toMatch(/\$0\.00/);
  });
  it('an empty record teaches, a range with no day says so, and a day after today is never read', () => {
    expect(netWorthHistoryCard(emptyNetworthHistory(), DAY).state).toBe('empty');
    const old = history([{day: '2026-01-05', sources: [{source: 'accounts', currency: 'EUR', value: '10.00'}]}, {day: '2026-12-01', sources: [{source: 'accounts', currency: 'EUR', value: '99.00'}]}]);
    const c = netWorthHistoryCard(old, DAY, 'week');
    expect([c.state, c.points, c.since, netWorthHistoryAsOf(c, day)]).toEqual(['quiet', [], '2026-01-05', null]);
    expect(netWorthHistoryCard(old, DAY, 'year').points.map(p => p.day)).toEqual(['2026-01-05']);
  });
  it('the Showcase: its labelled example history ends on the Showcase’s own totals, with its gaps and its one unknown price kept apart', () => {
    const c = netWorthHistoryCard(showcaseNetworthHistory(DAY), DAY, 'quarter');
    expect([c.state, c.currency, c.otherCurrencies, c.example]).toEqual(['live', 'USD', ['EUR'], 'SHOWCASE DATA · fictional net-worth history']);
    // $501,800.00 of holdings plus the accounts' $11,800.00 + 67 × $42.00: the day's net worth; the Portfolio is not in it.
    expect(c.latest).toEqual({day: DAY, cents: 50180000n + 1180000n + 67n * 4200n, missing: []});
    expect(c.unknownDays).toBe(0); // the day without a Portfolio price is still a known net worth: the Portfolio is not counted
    expect(c.notOpened).toBeGreaterThan(5);
    expect(c.series.length).toBe(68);
    expect(c.change?.direction).toBe('up');
    expect(netWorthHistoryAsOf(c, day)).toBe(`last recorded ${DAY}`);
    expect(historyMoney(c.latest!.cents!, 'USD')).toMatch(/^\$516,?414\.00$/);
  });
});

describe('ready to assign: the month’s logged income minus what the budgets hold', () => {
  const budgets = budgetsSchema.parse({version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01'}, {id: 'b2', category: 'Fun', currency: 'EUR', monthly: '100.00', rollover: true, since: '2026-12'}, {id: 'b3', category: 'Travel', currency: 'USD', monthly: '50.00', rollover: false, since: '2026-01'}]});
  it('exact cents per currency; a budget that starts later is not counted; no income is said, never a zero', () => {
    const c = readyCard(log([entry('i1', 'income', '2400.00', '2026-11-03', 'Salary'), entry('i0', 'income', '9.00', '2026-10-30', 'Salary'), entry('e1', 'expense', '10.00', '2026-11-04')]), budgets, DAY);
    expect(c.rows.map(r => [r.currency, r.status, r.readyCents, r.heldCents])).toEqual([['EUR', 'ok', 210000, 30000], ['USD', 'no-income', null, 5000]]);
    expect(c.lead).toMatchObject({currency: 'EUR', over: false, share: 0.125});
    expect(c.lead!.words).toMatch(/ready to assign: .*2,400\.00 logged as income, minus .*300\.00 your budgets hold$/);
    expect(c.rows[1]!.words).toMatch(/^Nothing logged as income this month; your budgets hold /);
    expect(readyRows(c)).toHaveLength(2);
  });
  it('more budgeted than logged as income reads as that, in words', () => {
    const c = readyCard(log([entry('i1', 'income', '120.00', '2026-11-03', 'Salary')]), budgets, DAY);
    expect(c.lead).toMatchObject({readyCents: -18000, over: true, share: 1});
    expect(c.lead!.words).toMatch(/180\.00 more in budgets than logged as income$/);
  });
  it('nothing logged and no budget: the widget teaches', () => {
    const c = readyCard(log([]), budgetsSchema.parse({version: 1, budgets: []}), DAY);
    expect([c.state, c.lead, readyRows(c)]).toEqual(['empty', null, [['Ready to assign', 'Nothing logged as income this month, and no budgets yet']]]);
  });
});

describe('age of money and spending pace: figures only when the records hold them', () => {
  it('age of money: first in, first out over 90 days; too little history is "not enough records yet"', () => {
    const young = ageCard(log([entry('i', 'income', '100.00', addLocalDays(DAY, -5), 'Salary'), entry('e', 'expense', '10.00', DAY)]), DAY);
    expect(young.lead).toMatchObject({status: 'not-enough', days: null, share: null});
    expect(young.lead!.words).toBe('Not enough records yet: this needs at least 30 days of entries, and there are 6 days');
    const c = ageCard(log([entry('i', 'income', '100.00', addLocalDays(DAY, -40), 'Salary'), entry('e1', 'expense', '50.00', addLocalDays(DAY, -30)), entry('e2', 'expense', '50.00', addLocalDays(DAY, -10)), entry('e3', 'expense', '25.00', DAY)]), DAY);
    expect(c.lead).toMatchObject({status: 'ok', days: 20, daysText: '20 days'}); // (50 × 10 + 50 × 30) ÷ 100
    expect(c.lead!.share).toBeCloseTo(20 / 90);
    expect(c.lead!.uncounted).toMatch(/25\.00 of .*125\.00 spent is not counted/);
    expect(ageRows(c)).toHaveLength(2);
    expect(ageCard(log([]), DAY)).toMatchObject({state: 'empty', lead: null});
  });
  it('spending pace: this month beside the usual by the same day; fewer than three earlier months says so; never a forecast', () => {
    const months = ['2026-08', '2026-09', '2026-10'].flatMap((m, i) => [entry(`a${i}`, 'expense', `${100 + i * 20}.00`, `${m}-05`), entry(`b${i}`, 'expense', '500.00', `${m}-25`)]);
    const c = paceCard(log([...months, entry('n1', 'expense', '150.00', '2026-11-02')]), DAY);
    expect(c.lead).toMatchObject({status: 'ok', day: 11, dayWords: '11th', months: 3, usualCents: 12000, thisCents: 15000, differenceCents: 3000, direction: 'up'});
    expect(c.lead!.words).toMatch(/^By the 11th you usually have spent .*120\.00; this month .*150\.00, .*30\.00 more$/);
    expect(paceRows(c)[0]![1]).toMatch(/A comparison of your records, not a forecast$/);
    const few = paceCard(log([entry('a', 'expense', '10.00', '2026-10-05'), entry('n', 'expense', '10.00', '2026-11-02')]), DAY);
    expect(few.lead).toMatchObject({status: 'not-enough', usual: null, differenceCents: null});
    expect(few.lead!.words).toBe('Not enough months yet: this needs 3 earlier months with spending logged, and there is 1');
  });
  it('the money log’s own currency leads; another currency is its own row, never added', () => {
    const c = ageCard(log([entry('u', 'expense', '5.00', DAY, 'Fun', 'USD'), entry('e', 'expense', '5.00', DAY)], 'USD'), DAY);
    expect([c.rows.map(r => r.currency), c.lead?.currency]).toEqual([['EUR', 'USD'], 'USD']);
  });
});

describe('bill changes: the latest payment of a bill found in the money log against the one before it', () => {
  const key = `EUR|Subscriptions|${normalisePayee('Music')}|monthly`;
  const bills = (origin: 'detected' | 'manual') => billsSchema.parse({version: 1, dismissed: [], bills: [{id: 'b1', title: 'Music · SHOWCASE DATA', amount: '9.99', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-03', origin, ...(origin === 'detected' ? {matchKey: key} : {}), category: 'Subscriptions', createdAt: '2026-09-01T08:00:00.000Z'}]});
  const pays = log([entry('p1', 'expense', '9.49', '2026-09-03', 'Subscriptions', 'EUR', 'Music'), entry('p2', 'expense', '9.49', '2026-10-03', 'Subscriptions', 'EUR', 'Music'), entry('p3', 'expense', '9.99', '2026-11-03', 'Subscriptions', 'EUR', 'Music')]);
  // (fr-money; deliberate) FR-L-18: "since" is the month of the first payment at the new price (€9.99 from November).
  it('a rise is said with both amounts and the month the new price began', () => {
    const c = billChangesCard(bills('detected'), pays, DAY);
    expect([c.state, c.bills, c.fromLog]).toEqual(['live', 1, 1]);
    expect(c.lines[0]).toMatchObject({id: 'b1', direction: 'up'});
    expect(c.lines[0]!.words).toMatch(/^went up by .*0\.50 since Nov 2026 \(.*9\.49 then, .*9\.99 now\)$/);
  });
  it('a bill written by hand has no payments to compare; no bill at all teaches', () => {
    // Session AU (ADR-044 D-SHOWCASE, deliberate): bills found in the money log but not confirmed count too now (as Wealth →
    // Bills and ZIGi count them), so the hand-written bill is checked beside a log with no series of its own; with `pays`
    // the found series' rise shows beside it.
    const none = billChangesCard(bills('manual'), {...pays, entries: []}, DAY);
    expect([none.state, none.fromLog, none.lines]).toEqual(['none', 0, []]);
    const found = billChangesCard(bills('manual'), pays, DAY);
    expect([found.state, found.fromLog, found.lines.length]).toEqual(['live', 1, 1]);
    expect(found.lines[0]!.words).toMatch(/^went up by .*0\.50 since Nov 2026 \(.*9\.49 then, .*9\.99 now\)$/);
    expect(billChangesRows(none)[0]![1]).toMatch(/None of your bills came from the money log/);
    // Session AU (deliberate, as above): "empty" is no bill kept and none found in the log; a series found in the log alone is live.
    expect(billChangesCard(billsSchema.parse({version: 1, bills: [], dismissed: []}), {...pays, entries: []}, DAY).state).toBe('empty');
    expect(billChangesCard(billsSchema.parse({version: 1, bills: [], dismissed: []}), pays, DAY).state).toBe('live');
  });
});

describe('spending by tag: totals per tag, each currency apart', () => {
  const entries = [entry('a', 'expense', '40.00', '2026-11-02'), entry('b', 'expense', '10.00', '2026-11-05', 'Fun'), entry('c', 'income', '100.00', '2026-11-06', 'Freelance'), entry('d', 'expense', '7.00', '2026-11-07', 'Fun', 'USD'), entry('old', 'expense', '99.00', '2026-10-07')];
  const tags = moneyTagsSchema.parse({version: 1, tags: {a: ['household', 'trip'], b: ['trip'], c: ['side work'], d: ['trip'], old: ['household'], gone: ['ghost']}});
  it('this calendar month by default; an entry counts whole under each of its tags; a removed entry’s tags never show', () => {
    const c = moneyTagsCard(tags, log(entries), DAY);
    expect([c.state, c.currency, c.window.words, c.tags, c.lastDate]).toEqual(['live', 'EUR', 'this month', 3, '2026-11-06']);
    expect(c.rows.map(r => [r.tag, r.cents, r.entries, r.share])).toEqual([['trip', 5000, 2, 1], ['household', 4000, 1, 0.8], ['side work', 0, 1, 0]]);
    expect(c.rows[2]!.received).toMatch(/100\.00/);
    expect(c.others).toEqual([{currency: 'USD', tags: 1}]);
    expect(moneyTagsRows(c).map(r => r[0])).toContain('How tags count');
    expect(JSON.stringify(c)).not.toContain('ghost');
  });
  it('a range reaches back; no tag at all teaches; tags with nothing in the range say so', () => {
    expect(moneyTagsCard(tags, log(entries), DAY, 'quarter').rows.find(r => r.tag === 'household')!.cents).toBe(13900);
    expect(moneyTagsCard(moneyTagsSchema.parse({version: 1, tags: {}}), log(entries), DAY).state).toBe('empty');
    expect(moneyTagsCard(moneyTagsSchema.parse({version: 1, tags: {old: ['household']}}), log(entries), DAY).state).toBe('quiet');
  });
  it('the Showcase’s example tags sit on its own fictional entries only', () => {
    const money = showcaseMoneyLog(DAY), c = moneyTagsCard(showcaseMoneyTags(money), money, DAY, 'quarter');
    expect(c.state).toBe('live');
    expect(c.rows.map(r => r.tag)).toContain('example');
    expect(c.currency).toBe('EUR');
  });
});
