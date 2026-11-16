import {describe, expect, it} from 'vitest';
import {netWorth, moneyText} from '../../accounts/net-worth';
import {accountsSchema, emptyAccounts} from '../../accounts/schema';
import {showcaseAccounts} from '../../accounts/showcase';
import {comparePlans, payoffMonth} from '../../debt-planner/plan';
import {showcaseDebtPlanner} from '../../debt-planner/showcase';
import {debtPlannerSchema, emptyDebtPlanner} from '../../debt-planner/store';
import {cashFlow, topPayees} from '../../money-insights/cash-flow';
import {moneyLogSchema, type MoneyLog} from '../../money-log/schema';
import {showcaseMoneyLog} from '../../money-log/showcase';
import {emptyPriceAlerts} from '../../price-alerts/schema';
import {showcasePriceAlerts} from '../../price-alerts/showcase';
import {emptySavingsChallenges, savingsChallengesSchema} from '../../savings-challenges/challenges';
import {showcaseSavingsChallenges} from '../../savings-challenges/showcase';
import {buildShowcase} from '../../showcase-data';
import {PLATFORM_KEY, platformSchema} from '../../positions';
import {PLAN_RULE, accountsCard, accountsRows, cashFlowCard, cashFlowRows, debtPlanCard, debtPlanRows, priceAlertsCard, priceAlertsRows, savingsChallengesCard, savingsChallengesRows} from './money-more';

/**
 * Session AM-2 (step 3, round 2): cash flow and payees, accounts and debts, the debt payoff plan, savings challenges and
 * price alerts. Each selector is checked against the page's own engine: exact amounts, one currency at a time, unknown
 * never a zero, and the payoff plan a projection that says so.
 */
const DAY = '2026-11-11';
const entry = (id: string, kind: 'expense' | 'income', amount: string, date: string, category = 'Groceries', currency = 'EUR', note?: string) => ({id, kind, amount, currency, category, date, createdAt: `${date}T12:00:00.000Z`, ...(note ? {note} : {})});
const log = (entries: ReturnType<typeof entry>[], currency = 'EUR'): MoneyLog => moneyLogSchema.parse({version: 1, entries, currency});
const day = (d: string) => d;

describe('cash flow: this month in and out, six months of spending, this month’s payees', () => {
  const entries = [entry('i', 'income', '2400.00', '2026-11-03', 'Salary'), entry('a', 'expense', '40.00', '2026-11-02', 'Groceries', 'EUR', 'Weekly shop'), entry('b', 'expense', '9.99', '2026-11-05', 'Subscriptions', 'EUR', 'Music'),
    entry('c', 'expense', '60.00', '2026-10-06', 'Groceries', 'EUR', 'Weekly shop'), entry('d', 'expense', '5.00', '2026-08-06'), entry('u', 'expense', '7.00', '2026-11-07', 'Fun', 'USD')];
  it('the month’s figures are the engine’s own; a month without a record is a gap, never a zero', () => {
    const c = cashFlowCard(log(entries), DAY), page = cashFlow(entries, 'EUR', DAY).months.find(m => m.month === '2026-11')!;
    expect([c.state, c.currency, c.others, c.entries]).toEqual(['live', 'EUR', ['USD'], page.count]);
    expect(c.netCents).toBe(page.net); expect(c.netCents).toBe(235001);
    expect(c.netWords).toMatch(/2,350\.01 more in than out$/);
    expect(c.months.map(m => [m.key, m.spending])).toEqual([['2026-06', null], ['2026-07', null], ['2026-08', 500], ['2026-09', null], ['2026-10', 6000], ['2026-11', 4999]]);
    expect(cashFlowRows(c).filter(r => r[1] === 'No record')).toHaveLength(3);
  });
  it('payees are the engine’s: most first, beside last month; a last month without a record is said, not shown as nothing spent', () => {
    const c = cashFlowCard(log(entries), DAY), page = topPayees(entries, 'EUR', DAY);
    expect(c.payees.map(p => [p.name, p.cents, p.share])).toEqual(page.payees.map(p => [p.name, p.thisMonth, p.thisMonth / 4000]));
    expect(c.payees[0]).toMatchObject({name: 'Weekly shop', share: 1, count: 1});
    expect(c.payees[0]!.last).toMatch(/60\.00/);
    const alone = cashFlowCard(log([entry('a', 'expense', '40.00', '2026-11-02', 'Groceries', 'EUR', 'Weekly shop')]), DAY);
    expect(alone.payees[0]!.last).toBeNull();
    expect(cashFlowRows(alone).some(r => /last month holds no record/.test(r[1]))).toBe(true);
  });
  it('more out than in reads as that; nothing this month is quiet; an empty log teaches', () => {
    expect(cashFlowCard(log([entry('a', 'expense', '40.00', '2026-11-02')]), DAY).netWords).toMatch(/40\.00 more out than in$/);
    expect(cashFlowCard(log([entry('a', 'expense', '40.00', '2026-11-02'), entry('i', 'income', '40.00', '2026-11-02', 'Salary')]), DAY).netWords).toBe('as much in as out');
    const quiet = cashFlowCard(log([entry('c', 'expense', '60.00', '2026-10-06')]), DAY);
    expect([quiet.state, quiet.net, quiet.income, quiet.months.at(-1)!.spending]).toEqual(['quiet', null, null, null]);
    expect(cashFlowCard(log([]), DAY)).toMatchObject({state: 'empty', currency: null, months: []});
  });
});

describe('accounts and debts: the balances the person entered', () => {
  it('the Showcase’s fictional accounts: the sums are Wealth’s own, debts after accounts, each with its balance’s date', () => {
    const accounts = showcaseAccounts(DAY), c = accountsCard(accounts, DAY), row = netWorth(accounts, DAY, []).rows[0]!;
    expect([c.state, c.currency, c.count, c.noBalance, c.others]).toEqual(['live', 'USD', 5, 0, []]);
    expect([c.assets, c.debts, c.net]).toEqual([`$${Number(moneyText(row.assets)).toLocaleString('en-US', {minimumFractionDigits: 2})}`, '$7,551.00', '$29,229.00']);
    expect(c.netNegative).toBe(false);
    expect(c.owedShare).toBeCloseTo(7551 / 36780);
    expect(c.lines.map(l => [l.name, l.debt])).toEqual([['Workplace pension', false], ['Rainy-day savings', false], ['Everyday account', false], ['Car loan', true], ['Credit card', true]]);
    expect(c.lines[3]).toMatchObject({kind: 'Loan', balance: '$6,911.00', rate: '5.9', date: DAY});
    expect(accountsRows(c, day, 2).map(r => r[0])).toContain('More');
    expect(accountsRows(c, day)[2]![1]).toMatch(/Wealth’s holdings are not in this figure$/);
  });
  it('an account without a balance is "no balance yet" and is not counted as zero; more owed than held is said as minus', () => {
    const at = '2026-11-01T08:00:00.000Z', id = (n: number) => `93000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const accounts = accountsSchema.parse({version: 1, items: [
      {id: id(1), kind: 'cash', name: 'New account', currency: 'EUR', snapshots: [], payments: [], createdAt: at, updatedAt: at},
      {id: id(2), kind: 'loan', name: 'Loan', currency: 'EUR', snapshots: [{id: id(20), date: '2026-11-01', value: '50000', decimals: 2}], payments: [], createdAt: at, updatedAt: at},
      {id: id(3), kind: 'cash', name: 'Old', currency: 'EUR', archivedAt: at, snapshots: [{id: id(30), date: '2026-10-01', value: '999900', decimals: 2}], payments: [], createdAt: at, updatedAt: at},
      {id: id(4), kind: 'savings', name: 'Dollars', currency: 'USD', snapshots: [{id: id(40), date: '2026-11-02', value: '100', decimals: 0}], payments: [], createdAt: at, updatedAt: at},
    ]});
    const c = accountsCard(accounts, DAY);
    expect([c.currency, c.others, c.count, c.noBalance, c.netNegative, c.owedShare]).toEqual(['EUR', ['USD'], 2, 1, true, null]);
    expect(c.net).toMatch(/500\.00/); expect(c.assets).toMatch(/^€0\.00$|0\.00/);
    expect(c.lines.find(l => l.name === 'New account')).toMatchObject({balance: null, date: null});
    expect(accountsRows(c, day).find(r => r[0].startsWith('New account'))![1]).toBe('No balance yet');
    expect(JSON.stringify(c)).not.toContain('Old'); // an archived account is not listed
    expect(accountsCard(emptyAccounts(), DAY)).toMatchObject({state: 'empty', lines: [], net: null});
  });
});

describe('debt payoff plan: a projection of the figures the person kept', () => {
  const accounts = showcaseAccounts(DAY), kept = showcaseDebtPlanner(DAY);
  it('the months and the interest are the planner’s own; every date is a projection and the rule says so', () => {
    const c = debtPlanCard(accounts, kept, DAY);
    const debts = [{id: '93000000-0000-4000-8000-000000000004', name: 'Car loan', balance: 691100n, ratePercent: '5.9', minimum: 30000n}, {id: '93000000-0000-4000-8000-000000000005', name: 'Credit card', balance: 64000n, ratePercent: '21.9', minimum: 2500n}];
    const page = comparePlans(debts, 10000n);
    expect([c.state, c.currency, c.debts, c.owed, c.extra, c.note]).toEqual(['live', 'USD', 2, '$7,551.00', '$100.00', 'SHOWCASE DATA · fictional figures']);
    expect(c.plans.map(p => [p.strategy, p.months, p.month])).toEqual([['avalanche', page.avalanche.months, payoffMonth(DAY, page.avalanche.months)], ['snowball', page.snowball.months, payoffMonth(DAY, page.snowball.months)], ['minimums', page.minimums.months, payoffMonth(DAY, page.minimums.months)]]);
    expect(c.plans[0]!.months).toBeGreaterThan(6);
    expect(c.first?.name).toBe(page.avalanche.payoffs[0]!.name);
    expect(c.words).toBeTruthy();
    expect(PLAN_RULE).toMatch(/A projection .* Not a promise, not advice\.$/);
    const rows = debtPlanRows(c);
    expect(rows[1]![1]).toMatch(/^Cleared by [A-Z][a-z]{2} \d{4} \(\d+ months\), \$[\d,.]+ interest: a projection$/);
    expect(rows.at(-1)).toEqual(['How to read this', PLAN_RULE]);
    expect(rows.flat().join(' ')).not.toMatch(/\bwill\b|guarantee/i);
  });
  it('unknown is never zero: no kept figures, a missing minimum and a missing rate are each said, and nothing is worked out', () => {
    expect(debtPlanCard(accounts, emptyDebtPlanner(), DAY)).toMatchObject({state: 'unkept', plans: [], owed: '$7,551.00'});
    const noMinimum = debtPlanCard(accounts, debtPlannerSchema.parse({version: 1, extra: '50.00', debts: {'93000000-0000-4000-8000-000000000004': {minimum: '300.00'}}}), DAY);
    expect([noMinimum.state, noMinimum.issue, noMinimum.plans]).toEqual(['needs', 'The minimum monthly payment for Credit card is not kept yet.', []]);
    const at = '2026-11-01T08:00:00.000Z', id = '93000000-0000-4000-8000-000000000009';
    const noRate = accountsSchema.parse({version: 1, items: [{id, kind: 'loan', name: 'Loan from a friend', currency: 'EUR', snapshots: [{id: '93000000-0000-4000-8000-000000000090', date: '2026-11-01', value: '100000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]});
    expect(debtPlanCard(noRate, debtPlannerSchema.parse({version: 1, debts: {[id]: {minimum: '50.00'}}}), DAY).issue).toBe('The yearly rate for Loan from a friend is not kept yet.');
    expect(debtPlanCard(noRate, debtPlannerSchema.parse({version: 1, debts: {[id]: {minimum: '50.00', ratePercent: '0'}}}), DAY)).toMatchObject({state: 'live', currency: 'EUR'});
    expect(debtPlanCard(emptyAccounts(), kept, DAY)).toMatchObject({state: 'empty', debts: 0, owed: null});
    expect(debtPlanRows(debtPlanCard(emptyAccounts(), kept, DAY))).toEqual([['Debt payoff plan', 'No debt with a balance is kept']]);
  });
  it('a payment that does not cover the interest has no date, never a guess', () => {
    const at = '2026-11-01T08:00:00.000Z', id = '93000000-0000-4000-8000-000000000009';
    const big = accountsSchema.parse({version: 1, items: [{id, kind: 'loan', name: 'Big loan', currency: 'EUR', ratePercent: '30', snapshots: [{id: '93000000-0000-4000-8000-000000000090', date: '2026-11-01', value: '10000000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]});
    const c = debtPlanCard(big, debtPlannerSchema.parse({version: 1, debts: {[id]: {minimum: '10.00'}}}), DAY);
    // Either the planner names the problem, or every plan is without a date: never a month that was not worked out.
    expect(['needs', 'live']).toContain(c.state);
    if (c.state === 'needs') { expect(c.issue).toBeTruthy(); expect(c.plans).toEqual([]); }
    else expect(c.plans.every(p => p.month === null && p.monthName === null)).toBe(true);
  });
});

describe('savings challenges: as each goal’s own challenge card works them out', () => {
  const records = buildShowcase(DAY, 'UTC').records, platform = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
  it('the Showcase’s two fictional challenges: the 52-week schedule and the no-spend days, each on its goal', () => {
    const c = savingsChallengesCard(showcaseSavingsChallenges(DAY), platform, showcaseMoneyLog(DAY), DAY);
    expect([c.state, c.orphaned, c.lines.map(l => l.kind)]).toEqual(['live', 0, ['52-week', 'no-spend']]);
    expect(c.lines[0]!.words).toMatch(/^Week 4 of 52, this week .+; \d+ of 52 covered$/);
    expect(c.lines[0]!.share).toBeGreaterThanOrEqual(0);
    expect(c.lines[1]!.words).toMatch(/^\d of 30 no-spend days(; 1 marked day has a logged purchase)?$/);
    expect(c.lines.every(l => l.note === 'SHOWCASE DATA · fictional challenge')).toBe(true);
    expect(savingsChallengesRows(c)[0]![0]).toMatch(/: 52-week challenge$/);
  });
  it('a challenge whose goal is gone is counted apart, never shown with a made-up name; none running teaches', () => {
    const gone = savingsChallengesSchema.parse({version: 1, goals: {'424242': {kind: 'no-spend', startedOn: DAY, targetDays: 10, noSpendDays: []}}});
    expect(savingsChallengesCard(gone, platform, showcaseMoneyLog(DAY), DAY)).toEqual({state: 'empty', lines: [], orphaned: 1});
    expect(savingsChallengesCard(emptySavingsChallenges(), platform, showcaseMoneyLog(DAY), DAY).state).toBe('empty');
    expect(savingsChallengesRows(savingsChallengesCard(emptySavingsChallenges(), platform, showcaseMoneyLog(DAY), DAY))).toEqual([['Savings challenges', 'None running']]);
  });
});

describe('price alerts: a read-only list in each alert’s own words', () => {
  it('waiting first, then what fired with its day; the newest fired text is the alert’s own', () => {
    const c = priceAlertsCard(showcasePriceAlerts(DAY));
    expect([c.state, c.waiting, c.fired, c.unseen]).toEqual(['live', 1, 1, 0]);
    expect(c.lines.map(l => [l.words, l.stateWords])).toEqual([['BTC (example) above 250000 USD', 'Waiting'], ['ETH (example) below 2500 USD', 'Fired']]);
    expect(c.last?.text).toMatch(/^ETH \(example\) is below 2500 USD/);
    expect(priceAlertsRows(c, at => at.slice(0, 10))[1]).toEqual(['ETH (example) below 2500 USD', 'Fired, 2026-11-09']);
  });
  it('none set teaches', () => {
    expect(priceAlertsCard(emptyPriceAlerts())).toEqual({state: 'empty', waiting: 0, fired: 0, unseen: 0, lines: [], last: null});
    expect(priceAlertsRows(priceAlertsCard(emptyPriceAlerts()), d => d)).toEqual([['Price alerts', 'None yet']]);
  });
});
