// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';

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

describe('Session AV lane 2 (money): new stored fields survive export → erase → restore', () => {
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
