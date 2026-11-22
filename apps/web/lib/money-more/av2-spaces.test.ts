import {describe, expect, test} from 'vitest';
import {BUDGETS, BUDGETS_KEY} from '../budgets/schema';
import {MONEY_LOG, MONEY_LOG_KEY, emptyMoneyLog} from '../money-log/schema';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {BUDGETS_BUSINESS, MONEY_LOG_BUSINESS, budgetsSpec, logSpec, showSpace, spaceName, spaceOf, withBusiness, withoutBusiness} from './spaces';
import {emptyMoneyMore, moneyMoreSchema} from './schema';
import {addEntry} from '../money-log/engine';

/** Session AV lane 2, round 2 (money; Emma's Spaces): a business space in its own records; the personal ones untouched. */
describe('the money space', () => {
  test('started, shown, switched back, renamed, ended (its records kept); Personal is never a business name', () => {
    expect(spaceOf(emptyMoneyMore())).toBe('personal');
    let m = withBusiness(emptyMoneyMore(), ' Studio ');
    expect(m).toEqual({version: 1, business: {name: 'Studio'}, space: 'business'});
    expect(spaceOf(m)).toBe('business'); expect(spaceName(m, 'business')).toBe('Studio'); expect(spaceName(m, 'personal')).toBe('Personal');
    m = showSpace(m, 'personal');
    expect(spaceOf(m)).toBe('personal'); expect(m.business).toEqual({name: 'Studio'});
    expect(spaceOf({space: 'business'})).toBe('personal');
    expect(() => withBusiness(m, 'personal')).toThrow('Personal is your own space');
    expect(moneyMoreSchema.parse(m)).toEqual(m);
    expect(withoutBusiness(withBusiness(m, 'Studio'))).toEqual({version: 1});
  });
  test('the business space writes only its own records', () => {
    const store = new Map<string, string>(), storage = {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }};
    expect(logSpec('personal')).toBe(MONEY_LOG); expect(budgetsSpec('personal')).toBe(BUDGETS);
    expect(logSpec('business').key).toBe('zigoals:money-log-business:v1'); expect(budgetsSpec('business').key).toBe('zigoals:budgets-business:v1');
    updateDeviceRecord(storage, logSpec('business'), log => addEntry(log, {id: 'b1', kind: 'expense', amount: '90.00', currency: 'EUR', category: 'Bills', date: '2026-11-10', createdAt: '2026-11-10T10:00:00.000Z'}));
    updateDeviceRecord(storage, BUDGETS_BUSINESS, r => ({...r, budgets: [{id: 'x', category: 'Bills', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]}));
    expect(store.has(MONEY_LOG_KEY)).toBe(false); expect(store.has(BUDGETS_KEY)).toBe(false);
    expect(readDeviceRecord(storage, MONEY_LOG).data).toEqual(emptyMoneyLog());
    expect(readDeviceRecord(storage, MONEY_LOG_BUSINESS).data.entries.map(e => e.id)).toEqual(['b1']);
  });
});
