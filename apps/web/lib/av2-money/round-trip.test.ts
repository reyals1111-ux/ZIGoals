// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';
import {BUDGETS_KEY, budgetsSchema} from '../budgets/schema';
import {BILLS_KEY, billsSchema} from '../bills/schema';
import {DEBT_PLANNER_KEY, debtPlannerSchema} from '../debt-planner/store';
import {FI_MODEL_KEY, fiModelSchema} from '../fi-model/store';
import {PRICE_ALERTS_KEY, priceAlertsSchema} from '../price-alerts/schema';
import {RECEIPTS_KEY, receiptsSchema} from '../portfolio/receipts';

/**
 * Session AV lane 2 (money): every new optional stored field of the money pillar survives Export everything → Erase
 * everything → Restore (replace), read back through its own schema exactly as written.
 */
const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });

async function roundTrip(records: Record<string, unknown>): Promise<Record<string, unknown>> {
  const values = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, JSON.stringify(v)]));
  const zip = buildEverythingZip(collectEverything(values, APP), {date: '2026-11-22', showcase: false, now: NOW});
  const opened = await openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
  for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  await eraseEverything({localStorage, sessionStorage, indexedDB: null});
  for (const k of Object.keys(values)) expect(localStorage.getItem(k)).toBeNull();
  const parts = planParts(opened.json).filter(p => Object.keys(values).includes(p.key));
  expect(parts.length).toBe(Object.keys(values).length);
  const outcome = await applyRestore(opened, parts.map(part => ({part, mode: 'replace' as const})), {vision: false, progress: false});
  expect(outcome.failed).toEqual([]);
  return Object.fromEntries(Object.keys(values).map(k => [k, JSON.parse(localStorage.getItem(k) ?? 'null')]));
}

const at = '2026-11-20T10:00:00.000Z';
const LOG = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', entries: [
  {id: 'e1', kind: 'expense', amount: '12.00', currency: 'EUR', category: 'Bills', note: 'Card interest', date: '2026-11-03', createdAt: at, excluded: true, taxDeductible: true, spread: 12, account: 'NL00 1234', ref: 'REF-1', transfer: 'e2',
    history: [{at, by: 'you', field: 'category', from: 'Other', to: 'Bills'}]},
  {id: 'e2', kind: 'income', amount: '12.00', currency: 'EUR', category: 'Other income', date: '2026-11-04', createdAt: at, transfer: 'e1'},
], own: {expense: ['Pets'], income: ['Side job']}, accounts: {notes: {a1: 'Joint account with Sam'}, order: ['a1']}, lowBalance: {amount: '200.00', currency: 'EUR'}});

const BUDGETS = budgetsSchema.parse({version: 1, budgets: [
  {id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: true, since: '2026-09', need: {kind: 'weekly', amount: '70.00'}, snoozed: '2026-11', months: {'2026-12': '450.00'}, bucket: 'flexible', start: '25.00', group: 'Everyday'},
  {id: 'b2', category: 'Insurance', currency: 'EUR', monthly: '50.00', rollover: true, since: '2026-09', need: {kind: 'yearly', amount: '600.00', month: '2027-03'}, bucket: 'non-monthly', period: {every: 12, amount: '600.00'}},
], moves: [{id: 'm1', month: '2026-11', from: 'b2', to: 'b1', amount: '20.00', at}], payees: [{payee: 'Café Noël', currency: 'EUR'}], challenges: [{id: 'c1', category: 'Food & drink', currency: 'EUR', month: '2026-11'}], onToday: true});

const BILLS = billsSchema.parse({version: 1, dismissed: [], bills: [{id: 'bill1', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-03', origin: 'manual', createdAt: at, autopay: true}]});
const DEBTS = debtPlannerSchema.parse({version: 1, currency: 'EUR', extra: '50.00', debts: {d1: {minimum: '40.00', promoRate: '0', promoUntil: '2027-03', note: 'Store card, 0 % until March', payoffBy: '2027-12'}}, order: ['d1'], shown: 'custom', method: 'cfi', stepUp: {amount: '10.00', every: 3},
  tracked: {on: '2026-11-01', strategy: 'custom', currency: 'EUR', debts: [{id: 'd1', name: 'Card', balance: '900.00', ratePercent: '19.9', minimum: '40.00'}], order: ['d1'], method: 'cfi', stepUp: {amount: '10.00', every: 3}}});
const FI = fiModelSchema.parse({version: 1, inputs: {invested: 10000}, events: [{id: 'ev1', title: 'New car', year: 3, amount: 15000, kind: 'out', every: 'once'}], scenarios: [{id: 's1', name: 'Part time', inputs: {monthlyContribution: 300}, events: [{id: 'ev2', title: 'Pension', year: 20, amount: 9000, kind: 'in', every: 'yearly'}]}]});
const ALERTS = priceAlertsSchema.parse({version: 1, alerts: [], fired: [], moves: [{id: 'alert_move-0001', coin: 'bitcoin', coinName: 'Bitcoin', currency: 'EUR', percent: 5, direction: 'either', createdAt: at, active: true}],
  portfolioMoves: [{id: 'alert_pmove-0001', portfolioId: 'p1', portfolioName: 'Long term', currency: 'EUR', percent: 10, direction: 'down', base: '12000.50', createdAt: at, active: true}]});
const RECEIPTS = receiptsSchema.parse({version: 1, kinds: {t1: 'reward'}, uncounted: ['t2', 't3']});

describe('Session AV lane 2 (money): new stored fields survive export → erase → restore', () => {
  test('bills (autopay), the debt planner (promo rate, note, paid off by, method, Debt Blaster), the long model (events, scenarios), price alerts (24 h moves, portfolio moves), portfolio results (uncounted)', async () => {
    const back = await roundTrip({[BILLS_KEY]: BILLS, [DEBT_PLANNER_KEY]: DEBTS, [FI_MODEL_KEY]: FI, [PRICE_ALERTS_KEY]: ALERTS, [RECEIPTS_KEY]: RECEIPTS});
    expect(billsSchema.parse(back[BILLS_KEY])).toEqual(BILLS);
    expect(debtPlannerSchema.parse(back[DEBT_PLANNER_KEY])).toEqual(DEBTS);
    expect(fiModelSchema.parse(back[FI_MODEL_KEY])).toEqual(FI);
    expect(priceAlertsSchema.parse(back[PRICE_ALERTS_KEY])).toEqual(ALERTS);
    expect(receiptsSchema.parse(back[RECEIPTS_KEY])).toEqual(RECEIPTS);
    expect(DEBTS.debts!.d1).toMatchObject({promoRate: '0', payoffBy: '2027-12'});
    expect(ALERTS.moves).toHaveLength(1);
  });
  test('budgets: need, snooze, per-month amounts, bucket, period, start, group; moves, payees, challenges, on Today', async () => {
    const back = await roundTrip({[BUDGETS_KEY]: BUDGETS});
    expect(budgetsSchema.parse(back[BUDGETS_KEY])).toEqual(BUDGETS);
    expect(BUDGETS.budgets[1]!.period).toEqual({every: 12, amount: '600.00'});
  });
  test('the money log: excluded, tax-deductible, spread, account, ref, transfer, history; own categories, account notes and order, the low-balance line', async () => {
    expect(LOG.entries[0]).toMatchObject({excluded: true, spread: 12, transfer: 'e2'});
    const back = await roundTrip({[MONEY_LOG_KEY]: LOG});
    expect(moneyLogSchema.parse(back[MONEY_LOG_KEY])).toEqual(LOG);
  });
  test('a value this build cannot read is dropped on read, never failing the log', () => {
    const odd = moneyLogSchema.parse({...LOG, own: 'pets', entries: [{...LOG.entries[1]!, spread: 99, excluded: 'yes', history: 'x'}]});
    expect(odd.own).toBeUndefined();
    expect(odd.entries[0]!.spread).toBeUndefined();
    expect(odd.entries[0]!.excluded).toBeUndefined();
    expect(odd.entries[0]!.history).toBeUndefined();
  });
});
