// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';
import {WEALTH_SHEET_KEY, wealthSheetSchema} from '../wealth-sheet/schema';
import {MONEY_MORE_KEY, moneyMoreSchema} from '../money-more/schema';

/**
 * Session AV lane 2, round 3 (money; PocketGuard, Simplifi; TIER 3 stored formats): every new optional stored field —
 * the money log's `needWant`, the wealth sheet's `cards`, and the money extras' `planned` and `forecast` — survives Export
 * everything → Erase everything → Restore (replace), read back through its own schema exactly as written. All three
 * records are already in the shared registries, so nothing new is wired.
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

const at = '2026-11-20T10:00:00.000Z', CARD = '00000000-0000-4000-8000-0000000000c1';
export const R3_LOG = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', needWant: {Groceries: 'need', Fun: 'want', Savings: 'saving'}, entries: [
  {id: 'e1', kind: 'expense', amount: '60.00', currency: 'EUR', category: 'Groceries', date: '2026-11-03', createdAt: at},
]});
export const R3_SHEET = wealthSheetSchema.parse({version: 1, cards: {[CARD]: {limit: '2000.00', statementDay: 5, dueDay: 25}}});
export const R3_MORE = moneyMoreSchema.parse({version: 1, forecast: '12m', planned: [
  {id: 'p1', name: 'Birthday present', amount: '60.00', currency: 'EUR', date: '2026-12-14', category: 'Gifts'},
  {id: 'p2', name: 'Car service', amount: '320.00', currency: 'EUR', date: '2027-01-20'},
]});

describe('Session AV lane 2, round 3 (money): new fields on records already in the registries', () => {
  test('money log: needs, wants and saving marks', async () => {
    const back = await roundTrip({[MONEY_LOG_KEY]: R3_LOG});
    expect(moneyLogSchema.parse(back[MONEY_LOG_KEY])).toEqual(R3_LOG);
    expect(R3_LOG.needWant).toEqual({Groceries: 'need', Fun: 'want', Savings: 'saving'});
  });
  test('wealth sheet: a credit card limit, statement day and due day', async () => {
    const back = await roundTrip({[WEALTH_SHEET_KEY]: R3_SHEET});
    expect(wealthSheetSchema.parse(back[WEALTH_SHEET_KEY])).toEqual(R3_SHEET);
  });
  test('money extras: planned one-off costs and the forecast length', async () => {
    const back = await roundTrip({[MONEY_MORE_KEY]: R3_MORE});
    expect(moneyMoreSchema.parse(back[MONEY_MORE_KEY])).toEqual(R3_MORE);
    expect(R3_MORE.planned).toHaveLength(2);
  });
  test('a value this build cannot read is dropped on read, never failing the record', () => {
    const log = moneyLogSchema.parse({...R3_LOG, needWant: {Groceries: 'luxury'}});
    expect(log.needWant).toBeUndefined(); expect(log.entries).toHaveLength(1);
    const sheet = wealthSheetSchema.parse({version: 1, cards: {[CARD]: {limit: '-5', statementDay: 40, dueDay: 25}}});
    expect(sheet.cards?.[CARD]).toEqual({dueDay: 25});
    const more = moneyMoreSchema.parse({version: 1, forecast: '5y', planned: [{id: 'p', name: '', amount: '1', currency: 'EUR', date: 'x'}]});
    expect(more.forecast).toBeUndefined(); expect(more.planned).toBeUndefined();
  });
  test('a later build\'s fields stay in the loose objects; a record without the new fields reads as before', () => {
    expect(moneyMoreSchema.parse({...R3_MORE, futureField: {kept: true}})).toMatchObject({futureField: {kept: true}, forecast: '12m'});
    expect(moneyLogSchema.parse({version: 1, entries: []})).toEqual({version: 1, entries: [], weekStartsOn: 'monday'});
  });
});
