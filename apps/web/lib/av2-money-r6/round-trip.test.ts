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
import {BUDGET_PERIODS_KEY, budgetPeriodsSchema} from '../budgets/periods';
import {MONEY_MORE_KEY, moneyMoreSchema} from '../money-more/schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity; TIER 3 stored formats): every new optional field survives
 * Export everything → Erase everything → Restore (replace), read back through its own schema exactly as written — the
 * money log's `refund` / `refundOf` and `putAway`, the budgets' `order` and `ahead`, the pay periods' `paychecks` and the
 * money extras' `streak`. All four records are already in the shared registries, so nothing new is wired.
 */
const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null}, AT = '2026-11-22T09:00:00.000Z';
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
const entry = (id: string, extra: Record<string, unknown> = {}) => ({id, kind: 'expense', amount: '40.00', currency: 'EUR', category: 'Groceries', date: '2026-11-10', createdAt: AT, ...extra});
export const R6_LOG = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', entries: [entry('p'), entry('r', {kind: 'income', refund: true, refundOf: 'p', amount: '15.00'})],
  putAway: {years: [{id: 'y2024', year: '2024', at: AT, entries: [entry('old', {date: '2024-03-01'}), {id: 'later', kind: 'gift', note: 'a later build'}]}]}});
export const R6_BUDGETS = budgetsSchema.parse({version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-01', order: 1}, {id: 'b2', category: 'Home', currency: 'EUR', monthly: '900.00', rollover: false, since: '2026-01', order: 0}],
  ahead: [{id: 'a1', from: '2026-11', budgetId: 'b1', amount: '120.00', at: AT}]});
export const R6_PERIODS = budgetPeriodsSchema.parse({version: 1, paychecks: {items: [{id: 'p1', name: '1st', every: 'month', day: 1, amount: '1000.00', currency: 'EUR'}, {id: 'p2', name: 'Fridays', every: 'week', day: 5, amount: '250.00', currency: 'EUR'}], lines: {'b:b1': 'p2', 'bill:phone': 'p1'}}});
export const R6_MORE = moneyMoreSchema.parse({version: 1, streak: {on: true, looked: ['2026-11-20', '2026-11-21']}});

describe('Session AV lane 2, round 6 (money): new fields on records already in the registries', () => {
  test('export → erase → restore keeps every new field exactly', async () => {
    const back = await roundTrip({[MONEY_LOG_KEY]: R6_LOG, [BUDGETS_KEY]: R6_BUDGETS, [BUDGET_PERIODS_KEY]: R6_PERIODS, [MONEY_MORE_KEY]: R6_MORE});
    expect(moneyLogSchema.parse(back[MONEY_LOG_KEY])).toEqual(R6_LOG);
    expect(budgetsSchema.parse(back[BUDGETS_KEY])).toEqual(R6_BUDGETS);
    expect(budgetPeriodsSchema.parse(back[BUDGET_PERIODS_KEY])).toEqual(R6_PERIODS);
    expect(moneyMoreSchema.parse(back[MONEY_MORE_KEY])).toEqual(R6_MORE);
    expect(R6_LOG.entries[1]).toMatchObject({refund: true, refundOf: 'p'});
    expect(R6_LOG.putAway?.years[0]?.entries).toHaveLength(2);
  });
  test('a value this build cannot read is dropped on read, never failing the record', () => {
    const log = moneyLogSchema.parse({version: 1, entries: [entry('x', {refund: 'yes', refundOf: '../'})], putAway: 'all'});
    expect([log.entries[0]!.refund, log.entries[0]!.refundOf, log.putAway]).toEqual([undefined, undefined, undefined]);
    const budgets = budgetsSchema.parse({version: 1, budgets: [{id: 'b', category: 'Fun', currency: 'EUR', monthly: '1.00', rollover: false, since: '2026-01', order: -3}], ahead: [{id: 'a'}]});
    expect([budgets.budgets[0]!.order, budgets.ahead]).toEqual([undefined, undefined]);
    expect(budgetPeriodsSchema.parse({version: 1, paychecks: {items: 'many'}}).paychecks).toBeUndefined();
    expect(budgetPeriodsSchema.parse({version: 1, paychecks: {items: [], lines: {'b:x': 'p', 'evil key': 'p'}}}).paychecks?.lines).toEqual({'b:x': 'p'});
    expect(moneyMoreSchema.parse({version: 1, streak: {on: 'sure', looked: ['someday']}}).streak).toEqual({on: undefined, looked: undefined});
  });
  test('a later build’s fields stay in the loose objects; records without the new fields read as before', () => {
    expect(moneyLogSchema.parse({...R6_LOG, putAway: {...R6_LOG.putAway, later: 1}}).putAway).toMatchObject({later: 1});
    expect(budgetsSchema.parse({version: 1, budgets: []})).toEqual({version: 1, budgets: []});
    expect(budgetPeriodsSchema.parse({version: 1})).toEqual({version: 1});
    expect(moneyMoreSchema.parse({version: 1})).toEqual({version: 1});
  });
});
