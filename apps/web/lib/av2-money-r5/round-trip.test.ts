// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {MONEY_MORE_KEY, moneyMoreSchema} from '../money-more/schema';
import {NOTIFY_KEY, notifyPrefsSchema} from '../notify/prefs';

/**
 * Session AV lane 2, round 5 (money; Tiller, PocketSmith; TIER 3 stored formats): the money extras' `whatIfs` (named "Try a
 * change" sets for the cash forecast) survive Export everything → Erase everything → Restore (replace), read back through
 * their own schema exactly as written; the notification prefs' `moneyMorning` ("Yesterday's money" on Today) is in Export
 * everything and erased, and — as every notification pref — not restored (a new device asks again). Both records are already in the shared registries, so nothing new is wired.
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

export const R5_PREFS = notifyPrefsSchema.parse({version: 1, types: {moneyMorning: true}, moneyMorning: {onToday: true}});
export const R5_MORE = moneyMoreSchema.parse({version: 1, whatIfs: [
  {id: 'w1', name: 'Moving in March', currency: 'EUR', changes: [{kind: 'monthly', dir: 'out', amount: '150.00', from: '2027-03-01', label: 'Rent more'}, {kind: 'once', dir: 'out', amount: '2000.00', from: '2027-06-10', label: 'A trip'}]},
  {id: 'w2', name: 'A raise', currency: 'EUR', changes: [{kind: 'monthly', dir: 'in', amount: '200.00', from: '2026-12-25', until: '2027-12-25'}]},
]});

describe('Session AV lane 2, round 5 (money): new fields on records already in the registries', () => {
  test('notification prefs: Yesterday’s money is exported and erased (the prefs are exported, not restored: a new device asks again)', async () => {
    const collected = collectEverything({[NOTIFY_KEY]: JSON.stringify(R5_PREFS)}, APP);
    expect((collected.json as {device: Record<string, unknown>}).device.notify).toEqual(R5_PREFS);
    expect(planParts(JSON.parse(JSON.stringify(collected.json))).some(x => x.kind === 'device' && x.key === NOTIFY_KEY)).toBe(false);
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(R5_PREFS));
    await eraseEverything({localStorage, sessionStorage, indexedDB: null});
    expect(localStorage.getItem(NOTIFY_KEY)).toBeNull();
    expect(R5_PREFS.moneyMorning).toEqual({onToday: true});
  });
  test('money extras: named "Try a change" sets', async () => {
    const back = await roundTrip({[MONEY_MORE_KEY]: R5_MORE});
    expect(moneyMoreSchema.parse(back[MONEY_MORE_KEY])).toEqual(R5_MORE);
    expect(R5_MORE.whatIfs).toHaveLength(2);
  });
  test('a value this build cannot read is dropped on read, never failing the record', () => {
    const prefs = notifyPrefsSchema.parse({version: 1, types: {}, moneyMorning: 'yes'});
    expect(prefs.moneyMorning).toBeUndefined();
    expect(notifyPrefsSchema.parse({version: 1, types: {}, moneyMorning: {onToday: 'sure'}}).moneyMorning).toEqual({});
    const more = moneyMoreSchema.parse({version: 1, whatIfs: [{id: 'w', name: 'x', currency: 'EUR', changes: []}]});
    expect(more.whatIfs).toBeUndefined();
    const four = moneyMoreSchema.parse({version: 1, whatIfs: [{id: 'w', name: 'x', currency: 'EUR', changes: Array.from({length: 4}, () => ({kind: 'once', dir: 'out', amount: '1.00', from: '2027-01-01'}))}]});
    expect(four.whatIfs).toBeUndefined();
    const odd = moneyMoreSchema.parse({version: 1, whatIfs: [{id: 'w', name: 'x', currency: 'EUR', changes: [{kind: 'once', dir: 'out', amount: '1.00', from: '2027-01-01', until: 'later', label: ''}]}]});
    expect(odd.whatIfs).toEqual([{id: 'w', name: 'x', currency: 'EUR', changes: [{kind: 'once', dir: 'out', amount: '1.00', from: '2027-01-01'}]}]);
  });
  test('a later build’s fields stay in the loose objects; records without the new fields read as before', () => {
    expect(moneyMoreSchema.parse({...R5_MORE, futureField: {kept: true}})).toMatchObject({futureField: {kept: true}});
    expect(notifyPrefsSchema.parse({version: 1, types: {}, moneyMorning: {onToday: true, balances: 'later'}}).moneyMorning).toEqual({onToday: true, balances: 'later'});
    expect(notifyPrefsSchema.parse({version: 1, types: {}})).toEqual({version: 1, types: {}});
    expect(moneyMoreSchema.parse({version: 1})).toEqual({version: 1});
  });
});
