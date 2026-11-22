import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from '../notify/plan';
import {DEFAULT_ON, emptyNotifyPrefs, NOTIFY_LABELS, NOTIFY_TYPES, setType, typeOn} from '../notify/prefs';
import {zonedInstant} from '../notify/zone';
import {totals} from './engine';
import type {MoneyEntry} from './schema';
import type {Accounts} from '../accounts/schema';
import {dayMoney, dayWords, morningMoneyWakes, yesterdayMoney} from './yesterday';

/**
 * Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384; TIER 3 (PWA)): "Yesterday's money" — one day's
 * entries counted, its figures by the shared rule, the cash balances — and its morning notification: off by default,
 * at the morning time, a count only unless names are on, never a payee.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 10, 17, 5, 0); // Tuesday 06:00 in Brussels
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: setType(emptyNotifyPrefs(), 'moneyMorning', true), quiet: {from: '22:00', to: '06:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}}).self.zigoalsCompose;
};
const T = '2026-11-17', Y = '2026-11-16', A = '2026-01-01T09:00:00.000Z';
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `y-${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: Y, createdAt: A, note: 'Albert Heijn · weekly shop', ...over});
const ENTRIES = [e({amount: '42.10'}), e({amount: '90.00', share: '30.00'}), e({amount: '50.00', excluded: true}), e({kind: 'income', amount: '2000.00', category: 'Salary'}),
  e({amount: '1200.00', date: '2026-10-16', spread: 12, category: 'Bills'}), e({amount: '8.00', currency: 'USD'}), e({amount: '5.00', date: T})];
const ACCOUNTS: Accounts = {version: 1, items: [
  {id: '00000000-0000-4000-8000-0000000b0001', kind: 'cash', name: 'Current account', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000b0009', date: '2026-11-01', value: '123000', decimals: 2}], payments: [], createdAt: A, updatedAt: A},
  {id: '00000000-0000-4000-8000-0000000b0002', kind: 'investment', name: 'Broker', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000b0008', date: '2026-11-01', value: '900000', decimals: 2}], payments: [], createdAt: A, updatedAt: A},
]};

describe('one day’s money by the shared rule', () => {
  it('counts the entries of the day; spends the share, skips what is left out, adds a spread share; per currency', () => {
    const d = yesterdayMoney(ENTRIES, ACCOUNTS, T);
    expect(d.day).toBe(Y);
    expect(d.entries).toBe(5); // four in EUR and one in USD dated yesterday; the spread cost is dated in October
    // 42.10 + 30.00 (the share) + 100.00 (the October cost's share in November, on the 16th) — the left-out entry not at all.
    expect(d.byCurrency).toEqual([{currency: 'EUR', spent: 17210, received: 200000}, {currency: 'USD', spent: 800, received: 0}]);
    expect(d.balances).toEqual([{name: 'Current account', currency: 'EUR', cents: 123000, date: '2026-11-01'}]); // cash and savings only
  });
  it('a day without the spread cost adds up to what Spending’s own totals count', () => {
    const plain = ENTRIES.filter(x => !x.spread);
    const d = dayMoney(plain, null, Y), t = totals(plain, Y, Y);
    expect(d.byCurrency.map(c => [c.currency, c.spent, c.received])).toEqual(t.map(x => [x.currency, x.expenses, x.income]));
  });
});

describe('the morning notification (TIER 3 (PWA))', () => {
  it('a type of its own, off by default, labelled without a payee', () => {
    expect(NOTIFY_TYPES).toContain('moneyMorning');
    expect(DEFAULT_ON.moneyMorning).toBe(false);
    expect(typeOn(emptyNotifyPrefs(), 'moneyMorning')).toBe(false);
    expect(NOTIFY_LABELS.moneyMorning.title).toBe('Yesterday’s money');
    expect(NOTIFY_LABELS.moneyMorning.blurb).toContain('Never a payee');
  });
  it('wakes: this morning for yesterday, tomorrow morning for today as logged so far; nothing for an empty day', () => {
    const wakes = morningMoneyWakes(ENTRIES, ACCOUNTS, T);
    expect(wakes.map(w => [w.id, w.date, w.plain])).toEqual([[`money:yesterday:${T}`, T, '5 entries'], ['money:yesterday:2026-11-18', '2026-11-18', '1 entry']]);
    expect(wakes[0]!.detail).toBe('5 entries · spent €172.10, received €2,000.00 · spent $8.00 · Current account €1,230.00');
    for (const w of wakes) expect(w.detail).not.toMatch(/Albert|Heijn|weekly shop/);
    expect(morningMoneyWakes([], ACCOUNTS, T)).toEqual([]);
  });
  const input = (labels: boolean, prefs = setType(emptyNotifyPrefs(), 'moneyMorning', true)) => base({labels, prefs, moneyMorning: morningMoneyWakes(ENTRIES, ACCOUNTS, T).map(w => ({id: w.id, date: w.date, plain: w.plain, title: w.title, detail: w.detail}))});
  it('at the morning time, opening Spending; with names off the count only', () => {
    const off = buildPlan(input(false)).snapshot.items.filter(i => i.kind === 'money');
    expect(off.map(i => [i.at, i.id, i.label ?? null, i.detail, i.href])).toEqual([
      [at(T, '08:00'), `money:yesterday:${T}`, null, '5 entries', '/app/wealth#spending'],
      [at('2026-11-18', '08:00'), 'money:yesterday:2026-11-18', null, '1 entry', '/app/wealth#spending'],
    ]);
    for (const i of off) expect(i.detail).not.toMatch(/€|\$|Current/);
    const on = buildPlan(input(true)).snapshot.items.filter(i => i.kind === 'money');
    expect(on[0]!.label).toBe('Yesterday’s money');
    expect(on[0]!.detail).toContain('€172.10');
    expect(buildPlan(input(true)).registration.once).toContain(Math.floor(at(T, '08:00') / 60000));
  });
  it('switched off (the default), nothing wakes; a quiet morning moves it to the end of quiet hours', () => {
    expect(buildPlan(input(true, emptyNotifyPrefs())).snapshot.items.some(i => i.kind === 'money')).toBe(false);
    const quiet = buildPlan({...input(true), quiet: {from: '22:00', to: '09:00'}, now: Date.UTC(2026, 10, 17, 4, 0)}).snapshot.items.filter(i => i.kind === 'money');
    expect(quiet[0]!.at).toBe(at(T, '09:00'));
  });
  it('the notification says it on its own line, apart from the other money notices', () => {
    const when = at(T, '08:00'), compose = composer();
    const plain = compose({v: 1, labels: false, items: [{at: when, kind: 'money', id: `money:yesterday:${T}`, detail: '5 entries', href: '/app/wealth#spending', actionable: false}], summary: null}, when);
    expect(plain.body).toBe('Yesterday’s money · 5 entries');
    expect(plain.data.url).toBe('/app/wealth#spending');
    const both = compose({v: 1, labels: false, items: [{at: when, kind: 'money', id: `money:yesterday:${T}`, detail: '5 entries', href: '/app/wealth#spending', actionable: false}, {at: when, kind: 'money', id: 'money:payday:2026-11-18', href: '/app/wealth#spending', actionable: false}], summary: null}, when);
    expect(both.body).toBe('Yesterday’s money · 5 entries · 1 money notice: open Wealth');
  });
  it('review b5k #10: a day holding only a spread cost’s share never says “0 entries”', () => {
    const spreadOnly = [e({amount: '1200.00', date: '2026-10-16', spread: 12, category: 'Bills'})];
    const wakes = morningMoneyWakes(spreadOnly, null, T);
    expect(wakes.map(w => w.plain)).toEqual(['a share of a cost spread over months']);
    expect(wakes[0]!.detail).toBe('a share of a cost spread over months · spent €100.00');
    const off = buildPlan(base({labels: false, moneyMorning: wakes.map(w => ({id: w.id, date: w.date, plain: w.plain, title: w.title, detail: w.detail}))})).snapshot.items.filter(i => i.kind === 'money');
    expect(off.map(i => i.detail)).toEqual(['a share of a cost spread over months']);
    for (const w of [...wakes, ...morningMoneyWakes(ENTRIES, ACCOUNTS, T)]) expect(`${w.plain} ${w.detail}`).not.toMatch(/\b0 entries\b/);
    expect(dayWords({entries: 0})).toBe('a share of a cost spread over months');
    expect(dayWords({entries: 1})).toBe('1 entry');
  });
});
