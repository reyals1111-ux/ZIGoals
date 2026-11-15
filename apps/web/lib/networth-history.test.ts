import {describe, expect, test} from 'vitest';
import {NETWORTH_HISTORY, NETWORTH_HISTORY_KEY, NETWORTH_HISTORY_MAX_DAYS, drawnRuns, emptyNetworthHistory, gapDays, networthHistorySchema, seriesLines, snapshotOf, withSnapshot, wouldRecord, type NetworthDay, type NetworthHistory, type WealthRowInput} from './networth-history';
import {showcaseNetworthHistory, SHOWCASE_NETWORTH_HISTORY_LABEL} from './networth-history-showcase';
import {NETWORTH_HISTORY_KEY_LITERAL, AO_PERSONAL_KEYS} from './ao-device-keys';
import {addLocalDays} from './local-date';
import {readDeviceRecord, updateDeviceRecord} from './device-record';
import {EVERYTHING_KEYS, DEVICE_KEYS} from './export/everything';
import {DEVICE_ONLY} from './data-health/catalog';
import {DEVICE_PARTS} from './restore/plan';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {eraseEverything} from './erase-everything';
import {buildShowcase} from './showcase-data';
import type {Accounts} from './accounts/schema';
import type {PortfolioData} from './portfolio/schema';

const memory = () => { const m = new Map<string, string>(); return {m, store: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, clear: () => m.clear()} as Storage}; };
const row = (name: string, currency: string | undefined, value: bigint | undefined, extra: Partial<WealthRowInput['position']> = {}, valuedAt?: string): WealthRowInput => ({position: {providerId: name, sourceType: 'MANUAL', network: 'manual', account: 'me', ...extra}, currency, value, valuedAt});
const day = (d: string, sources: NetworthDay['sources']): NetworthDay => ({day: d, at: `${d}T12:00:00.000Z`, sources});
const usd = (value: string | null, missing?: string[]): NetworthDay['sources'][number] => ({source: 'wealth', currency: 'USD', value, asOf: null, ...(missing ? {missing} : {})});

describe('the stored record', () => {
  test('accepts this build\'s own shape and the key literal matches', () => {
    expect(NETWORTH_HISTORY_KEY_LITERAL).toBe(NETWORTH_HISTORY_KEY);
    expect(AO_PERSONAL_KEYS).toContain(NETWORTH_HISTORY_KEY);
    const ok = networthHistorySchema.safeParse({version: 1, days: [day('2026-11-01', [usd('10.50'), {source: 'accounts', currency: 'EUR', value: '-3', asOf: '2026-10-31'}]), day('2026-11-03', [usd(null, ['BTC'])])]});
    expect(ok.success).toBe(true);
  });
  test.each([
    ['a float amount', {version: 1, days: [day('2026-11-01', [{...usd('1'), value: 1.5 as unknown as string}])]}],
    ['an amount with a comma', {version: 1, days: [day('2026-11-01', [usd('1,5')])]}],
    ['an unknown value that names nothing', {version: 1, days: [day('2026-11-01', [usd(null)])]}],
    ['a known value with missing names', {version: 1, days: [day('2026-11-01', [usd('1', ['BTC'])])]}],
    ['two entries for one day', {version: 1, days: [day('2026-11-01', [usd('1')]), day('2026-11-01', [usd('2')])]}],
    ['the same source and currency twice', {version: 1, days: [day('2026-11-01', [usd('1'), usd('2')])]}],
    ['an unknown source', {version: 1, days: [day('2026-11-01', [{...usd('1'), source: 'bank' as 'wealth'}])]}],
    ['a lower-case currency', {version: 1, days: [day('2026-11-01', [{...usd('1'), currency: 'usd'}])]}],
    ['a day that is not a date', {version: 1, days: [day('2026-13-01', [usd('1')])]}],
    ['another version', {version: 2, days: []}],
  ])('refuses %s', (_, value) => { expect(networthHistorySchema.safeParse(value).success).toBe(false); });
  test('a damaged record reads as empty and is never rewritten by a read', () => {
    const {m, store} = memory(); m.set(NETWORTH_HISTORY_KEY, '{"version":1,"days":[{"day":"x"}]}');
    expect(readDeviceRecord(store, NETWORTH_HISTORY)).toEqual({data: emptyNetworthHistory(), unreadable: true});
    expect(m.get(NETWORTH_HISTORY_KEY)).toBe('{"version":1,"days":[{"day":"x"}]}');
  });
  test('reads days in order and keeps the latest 1,100', () => {
    const days = Array.from({length: NETWORTH_HISTORY_MAX_DAYS + 5}, (_, i) => day(addLocalDays('2024-01-01', i), [usd(String(i))])).reverse();
    const read = networthHistorySchema.parse({version: 1, days});
    expect(read.days).toHaveLength(NETWORTH_HISTORY_MAX_DAYS);
    expect(read.days[0]!.day).toBe(addLocalDays('2024-01-01', 5));
    expect(read.days.at(-1)!.day).toBe(addLocalDays('2024-01-01', NETWORTH_HISTORY_MAX_DAYS + 4));
  });
});

describe('recording', () => {
  test('one entry per day: the day\'s latest snapshot replaces the earlier one; the same figures write nothing', () => {
    let h = withSnapshot(emptyNetworthHistory(), day('2026-11-10', [usd('100.00')]));
    h = withSnapshot(h, {...day('2026-11-10', [usd('120.00')]), at: '2026-11-10T20:00:00.000Z'});
    expect(h.days).toHaveLength(1);
    expect(h.days[0]!.sources[0]!.value).toBe('120.00');
    expect(h.days[0]!.at).toBe('2026-11-10T20:00:00.000Z');
    const again = {...day('2026-11-10', [usd('120.00')]), at: '2026-11-10T21:00:00.000Z'};
    expect(wouldRecord(h, again)).toBe(false);
    expect(withSnapshot(h, again)).toBe(h);
  });
  test('never back-filled: opening after three days off adds exactly one day, and the gap stays a gap', () => {
    let h = withSnapshot(emptyNetworthHistory(), day('2026-11-01', [usd('100.00')]));
    h = withSnapshot(h, day('2026-11-02', [usd('101.00')]));
    h = withSnapshot(h, day('2026-11-06', [usd('105.00')]));
    expect(h.days.map(d => d.day)).toEqual(['2026-11-01', '2026-11-02', '2026-11-06']);
    expect(gapDays(h)).toBe(3);
    const [line] = seriesLines(h);
    expect(line!.points.map(p => p.day)).toEqual(['2026-11-01', '2026-11-02', '2026-11-06']);
    // A line joins 1 and 2 November only; 6 November stands alone (no line across the gap).
    expect(drawnRuns(line!.points).map(r => r.map(p => p.day))).toEqual([['2026-11-01', '2026-11-02'], ['2026-11-06']]);
  });
  test('never for a past day (a clock set back)', () => {
    const h = withSnapshot(emptyNetworthHistory(), day('2026-11-06', [usd('1.00')]));
    expect(withSnapshot(h, day('2026-11-05', [usd('2.00')]))).toBe(h);
  });
  test('a day without a value breaks the line too', () => {
    let h = emptyNetworthHistory();
    for (const [d, v] of [['2026-11-01', '1.00'], ['2026-11-02', null], ['2026-11-03', '3.00'], ['2026-11-04', '4.00']] as const) h = withSnapshot(h, day(d, [usd(v, v === null ? ['BTC'] : undefined)]));
    expect(drawnRuns(seriesLines(h)[0]!.points).map(r => r.map(p => p.day))).toEqual([['2026-11-01'], ['2026-11-03', '2026-11-04']]);
  });
  test('the cap drops the oldest day', () => {
    let h: NetworthHistory = networthHistorySchema.parse({version: 1, days: Array.from({length: NETWORTH_HISTORY_MAX_DAYS}, (_, i) => day(addLocalDays('2023-01-01', i), [usd('1.00')]))});
    h = withSnapshot(h, day(addLocalDays('2023-01-01', NETWORTH_HISTORY_MAX_DAYS + 10), [usd('2.00')]));
    expect(h.days).toHaveLength(NETWORTH_HISTORY_MAX_DAYS);
    expect(h.days[0]!.day).toBe('2023-01-02');
    expect(networthHistorySchema.safeParse(h).success).toBe(true);
  });
});

describe('snapshotOf', () => {
  const at = '2026-11-13T09:00:00.000Z';
  test('an unknown price is unknown (null with the names), never "0"', () => {
    const s = snapshotOf({day: '2026-11-13', at, wealthRows: [row('Cash', 'USD', 10_000n, {}, '2026-11-13T08:00:00.000Z'), row('Bitcoin', undefined, undefined, {quoteCurrency: 'USD'})]})!;
    expect(s.sources).toEqual([{source: 'wealth', currency: 'USD', value: null, asOf: '2026-11-13T08:00:00.000Z', missing: ['Bitcoin']}]);
    expect(JSON.stringify(s)).not.toContain('"0"');
  });
  test('currencies are kept apart, each with its own as-of time; nothing is converted', () => {
    const s = snapshotOf({day: '2026-11-13', at, wealthRows: [row('A', 'USD', 12_345n, {}, '2026-11-13T08:00:00.000Z'), row('B', 'USD', 55n, {}, '2026-11-12T08:00:00.000Z'), row('C', 'EUR', 99_900n, {}, '2026-11-13T07:00:00.000Z')]})!;
    expect(s.sources).toEqual([
      {source: 'wealth', currency: 'EUR', value: '999.00', asOf: '2026-11-13T07:00:00.000Z'},
      {source: 'wealth', currency: 'USD', value: '124.00', asOf: '2026-11-12T08:00:00.000Z'},
    ]);
  });
  test('accounts: assets minus debts per currency; an account without a balance names itself', () => {
    const acct = (id: string, kind: string, currency: string, name: string, value?: string): Accounts['items'][number] => ({id, kind, name, currency, snapshots: value ? [{id: `s-${id}`, date: '2026-11-10', value, decimals: 2}] : [], payments: [], createdAt: at, updatedAt: at}) as unknown as Accounts['items'][number];
    const accounts = {version: 1, items: [acct('a', 'checking', 'EUR', 'Current', '150000'), acct('d', 'credit-card', 'EUR', 'Card', '20000'), acct('u', 'savings', 'USD', 'Dollar savings')]} as unknown as Accounts;
    const s = snapshotOf({day: '2026-11-13', at, accounts})!;
    expect(s.sources).toEqual([
      {source: 'accounts', currency: 'EUR', value: '1300.00', asOf: '2026-11-10'},
      {source: 'accounts', currency: 'USD', value: null, asOf: null, missing: ['Dollar savings']},
    ]);
  });
  test('Portfolio: real portfolios at the prices held; a coin without a price is named; hypothetical ones are left out', () => {
    const ref = {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, eth = {provider: 'coingecko', kind: 'coin', id: 'ethereum'};
    const tx = (id: string, coin: string, quantity: string) => ({id, coin, kind: 'buy', quantity, price: '1', date: '2026-11-01', createdAt: at});
    const portfolios = {version: 1, portfolios: [
      {id: 'p1', name: 'Long term', kind: 'real', currency: 'USD', coins: [{ref, name: 'Bitcoin', symbol: 'BTC'}, {ref: eth, name: 'Ether', symbol: 'ETH'}], transactions: [tx('t1', 'coingecko:coin:bitcoin', '0.5'), tx('t2', 'coingecko:coin:ethereum', '2')]},
      {id: 'p2', name: 'What if', kind: 'hypothetical', currency: 'USD', coins: [{ref, name: 'Bitcoin', symbol: 'BTC'}], transactions: [tx('t3', 'coingecko:coin:bitcoin', '10')]},
    ]} as unknown as PortfolioData;
    const priced = snapshotOf({day: '2026-11-13', at, portfolios, portfolioPrice: k => ({value: k.endsWith('bitcoin') ? '60000.123' : '3000', at: '2026-11-13T08:30:00.000Z'})})!;
    expect(priced.sources).toEqual([{source: 'portfolio', currency: 'USD', value: '36000.06', asOf: '2026-11-13T08:30:00.000Z'}]);
    const half = snapshotOf({day: '2026-11-13', at, portfolios, portfolioPrice: k => k.endsWith('bitcoin') ? {value: '60000'} : undefined})!;
    expect(half.sources).toEqual([{source: 'portfolio', currency: 'USD', value: null, asOf: null, missing: ['ETH (Long term)']}]);
  });
  test('tracked wallets are their own series, named; a source with nothing tracked is left out', () => {
    const w = row('native-zig', 'USD', undefined, {providerId: 'native-zig', sourceType: 'LIQUID', network: 'zig-test-2', account: 'zig1abcdefghijklmnopqrstu'});
    const s = snapshotOf({day: '2026-11-13', at, wealthRows: [w], walletNames: {version: 1, names: [{network: 'zig-test-2', account: 'zig1abcdefghijklmnopqrstu', name: 'Savings wallet'}]}})!;
    expect(s.sources.map(x => x.source)).toEqual(['wealth', 'wallets']);
    expect(s.sources[1]).toEqual({source: 'wallets', currency: 'USD', value: null, asOf: null, missing: ['ZIG liquid · Savings wallet']});
    expect(snapshotOf({day: '2026-11-13', at, wealthRows: [], accounts: {version: 1, items: []} as unknown as Accounts, portfolios: {version: 1, portfolios: []}})).toBeNull();
  });
});

describe('the Showcase', () => {
  test('its example history is labelled, has gaps and an unknown price, and lives only in the Showcase records', () => {
    const ex = showcaseNetworthHistory('2026-11-13');
    expect(ex.example).toBe(SHOWCASE_NETWORTH_HISTORY_LABEL);
    expect(gapDays(ex)).toBeGreaterThan(0);
    expect(ex.days.some(d => d.sources.some(s => s.value === null && s.missing?.length))).toBe(true);
    expect(ex.days.at(-1)!.day).toBe('2026-11-13');
    const records = buildShowcase('2026-11-13', 'Europe/Brussels').records as Record<string, string>;
    expect(networthHistorySchema.parse(JSON.parse(records[NETWORTH_HISTORY_KEY]!)).example).toBe(SHOWCASE_NETWORTH_HISTORY_LABEL);
  });
  test('a real snapshot is never mixed into an example record: it starts a new, unlabelled one', () => {
    const next = withSnapshot(showcaseNetworthHistory('2026-11-13'), day('2026-11-14', [usd('5.00')]));
    expect(next.example).toBeUndefined();
    expect(next.days.map(d => d.day)).toEqual(['2026-11-14']);
  });
});

describe('registries', () => {
  test('export, the catalog, restore (and so the protected copy) carry it', () => {
    expect(EVERYTHING_KEYS).toContain(NETWORTH_HISTORY_KEY);
    expect((DEVICE_KEYS as Record<string, string>).networthHistory).toBe(NETWORTH_HISTORY_KEY);
    expect(DEVICE_ONLY.find(e => e.key === NETWORTH_HISTORY_KEY)?.area).toBe('Wealth');
    const part = DEVICE_PARTS.find(p => p.key === NETWORTH_HISTORY_KEY)!;
    expect(part.name).toBe('networthHistory');
    expect(part.health).toBe(false);
  });
  test('an exported record restores to the same record', () => {
    const {m, store} = memory();
    const h = withSnapshot(withSnapshot(emptyNetworthHistory(), day('2026-11-01', [usd('1.00')])), day('2026-11-04', [usd(null, ['BTC'])]));
    updateDeviceRecord(store, NETWORTH_HISTORY, () => h);
    const exported = JSON.parse(m.get(NETWORTH_HISTORY_KEY)!) as unknown;
    const part = DEVICE_PARTS.find(p => p.key === NETWORTH_HISTORY_KEY)!;
    const restored = part.schema.parse(JSON.parse(JSON.stringify(exported)));
    const target = memory(); target.store.setItem(NETWORTH_HISTORY_KEY, JSON.stringify(restored));
    expect(readDeviceRecord(target.store, NETWORTH_HISTORY)).toEqual({data: h, unreadable: false});
  });
  test('the account erase and Erase everything remove it', async () => {
    const a = memory(); a.store.setItem(NETWORTH_HISTORY_KEY, '{}');
    forgetAaDeviceRecords(a.store);
    expect(a.m.has(NETWORTH_HISTORY_KEY)).toBe(false);
    const b = memory(); b.store.setItem(NETWORTH_HISTORY_KEY, '{}');
    await eraseEverything({localStorage: b.store, sessionStorage: null, indexedDB: null});
    expect(b.m.has(NETWORTH_HISTORY_KEY)).toBe(false);
  });
});
