// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';
import {MONEY_MORE_KEY, moneyMoreSchema} from '../money-more/schema';
import {MONEY_LOG_BUSINESS_KEY_LITERAL} from '../av2-money-r2-keys';

/**
 * Session AV lane 2, round 4 (money; Actual Budget, Lunch Money; TIER 3 stored formats): every new optional stored
 * field — the money log entry's `checked` and `group`, the money log's `archived` and `investIncome`, and the money
 * extras' `questions` and `places` — survives Export everything → Erase everything → Restore (replace), read back through
 * its own schema exactly as written. Both records (and the business space's money log) are already in the shared
 * registries, so nothing new is wired.
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
export const R4_LOG = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', archived: {expense: ['Gifts', 'Pets'], income: ['Freelance']}, investIncome: ['Dividends', 'Interest'], entries: [
  {id: 'e1', kind: 'expense', amount: '60.00', currency: 'EUR', category: 'Groceries', date: '2026-11-03', createdAt: at, checked: '2026-11-15'},
  {id: 'e2', kind: 'expense', amount: '120.00', currency: 'EUR', category: 'Fun', date: '2026-11-07', createdAt: at, group: {id: 'g1', name: 'Weekend in Ghent'}},
  {id: 'e3', kind: 'income', amount: '20.00', currency: 'EUR', category: 'Refund', date: '2026-11-09', createdAt: at, group: {id: 'g1', name: 'Weekend in Ghent'}},
]});
export const R4_MORE = moneyMoreSchema.parse({version: 1,
  questions: [{id: 'q1', name: 'Eating out on weekends', text: 'café', kind: 'expense', category: 'Food & drink', from: '2026-01-01', min: '5.00', by: 'week'}, {id: 'q2', name: 'Every Albert Heijn', payee: 'Albert Heijn', tag: 'home', paidWith: 'unmarked'}],
  places: [{id: 'p1', name: 'Work', payees: ['Canteen', 'Coffee corner']}, {id: 'p2', name: 'The market'}],
});

describe('Session AV lane 2, round 4 (money): new fields on records already in the registries', () => {
  test('money log: checked entries, a group, archived categories and investment-income marks', async () => {
    const back = await roundTrip({[MONEY_LOG_KEY]: R4_LOG});
    expect(moneyLogSchema.parse(back[MONEY_LOG_KEY])).toEqual(R4_LOG);
    expect(R4_LOG.entries[0]!.checked).toBe('2026-11-15');
    expect(R4_LOG.entries[1]!.group).toEqual({id: 'g1', name: 'Weekend in Ghent'});
  });
  test('the business space keeps its own archived categories and marks', async () => {
    const back = await roundTrip({[MONEY_LOG_BUSINESS_KEY_LITERAL]: R4_LOG});
    expect(moneyLogSchema.parse(back[MONEY_LOG_BUSINESS_KEY_LITERAL])).toEqual(R4_LOG);
  });
  test('money extras: saved searches and typed places', async () => {
    const back = await roundTrip({[MONEY_MORE_KEY]: R4_MORE});
    expect(moneyMoreSchema.parse(back[MONEY_MORE_KEY])).toEqual(R4_MORE);
    expect(R4_MORE.questions).toHaveLength(2); expect(R4_MORE.places).toHaveLength(2);
  });
  test('a value this build cannot read is dropped on read, never failing the record', () => {
    const log = moneyLogSchema.parse({...R4_LOG, archived: 'Gifts', investIncome: [''], entries: [{...R4_LOG.entries[0]!, checked: 'yesterday', group: {id: 'bad id!', name: 'x'}}]});
    expect(log.archived).toBeUndefined(); expect(log.investIncome).toBeUndefined();
    expect(log.entries[0]!.checked).toBeUndefined(); expect(log.entries[0]!.group).toBeUndefined(); expect(log.entries).toHaveLength(1);
    const more = moneyMoreSchema.parse({version: 1, questions: [{id: 'q', name: ''}], places: Array.from({length: 21}, (_, i) => ({id: `p${i}`, name: 'x'}))});
    expect(more.questions).toBeUndefined(); expect(more.places).toBeUndefined();
    const one = moneyMoreSchema.parse({version: 1, questions: [{id: 'q', name: 'Q', by: 'year', min: '-1', counted: 'maybe'}]});
    expect(one.questions).toEqual([{id: 'q', name: 'Q'}]);
  });
  test('a later build\'s fields stay in the loose objects; a record without the new fields reads as before', () => {
    expect(moneyMoreSchema.parse({...R4_MORE, futureField: {kept: true}})).toMatchObject({futureField: {kept: true}});
    expect(moneyLogSchema.parse({version: 1, entries: []})).toEqual({version: 1, entries: [], weekStartsOn: 'monday'});
    const entry = moneyLogSchema.parse({version: 1, entries: [{...R4_LOG.entries[1]!, group: {id: 'g1', name: 'Weekend', colour: 'blue'}}]}).entries[0]!;
    expect(entry.group).toEqual({id: 'g1', name: 'Weekend', colour: 'blue'});
  });
});
