// @vitest-environment jsdom
import {afterEach, describe, expect, test} from 'vitest';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {TASKS_KEY} from './tasks/schema';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from './af-checklist-keys';
import {JOURNAL_KEY} from './journal/schema';
import {MONEY_LOG_KEY} from './money-log/schema';
import {NOTES_KEY} from './notes/schema';
import {DEVICE_PARTS} from './restore/plan';
import {forgetTabDrafts} from './tab-drafts';

/**
 * Session AL (security delta review B). SB-2: the account's erase also removes the recovery copies a restore keeps beside
 * the records it erases (`<key>:recovery:<uuid>`), so none of their old contents stays. SB-6: and this tab's unsaved
 * drafts in sessionStorage (the welcome's first name and goal, a habit's title), which no account owns.
 */
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const copy = (key: string, n = 1) => `${key}:recovery:0000000${n}-0000-4000-8000-000000000000`;
afterEach(() => sessionStorage.clear());

describe('SB-2: the account erase leaves no recovery copy of what it erases', () => {
  test('Tasks, the Checklist and its days, the journal, the money log and the notes: the records and every copy go', () => {
    const {m, storage} = memory(), keys = [TASKS_KEY, CHECKLIST_KEY, CHECKLIST_DAYS_KEY, JOURNAL_KEY, MONEY_LOG_KEY, NOTES_KEY];
    for (const key of keys) { storage.setItem(key, '{"version":1}'); storage.setItem(copy(key, 1), '{"version":1,"old":"fictional"}'); storage.setItem(copy(key, 2), 'not json'); }
    storage.setItem('zigoals:unrelated-sb2:v1', '{}'); storage.setItem(copy('zigoals:unrelated-sb2:v1'), '{}');
    forgetAaDeviceRecords(storage);
    for (const key of keys) for (const k of [key, copy(key, 1), copy(key, 2)]) expect(m.has(k), k).toBe(false);
    expect([...m.keys()].filter(k => k.includes(':recovery:') && !k.startsWith('zigoals:unrelated-sb2:v1'))).toEqual([]);
    // A record the account erase keeps keeps its copies too.
    expect(m.has('zigoals:unrelated-sb2:v1') && m.has(copy('zigoals:unrelated-sb2:v1'))).toBe(true);
  });
  test('every device record a restore writes: where the erase removes the record, it removes the copy too', () => {
    const {m, storage} = memory();
    for (const part of DEVICE_PARTS) { storage.setItem(part.key, '{}'); storage.setItem(copy(part.key), '{}'); }
    forgetAaDeviceRecords(storage);
    const erased = DEVICE_PARTS.filter(p => !m.has(p.key));
    expect(erased.length).toBeGreaterThan(5);
    for (const part of erased) expect(m.has(copy(part.key)), part.key).toBe(false);
  });
  test('a storage view that cannot list its keys still has its records removed (best effort, never throws)', () => {
    const m = new Map([[TASKS_KEY, '{}']]);
    expect(() => forgetAaDeviceRecords({removeItem: k => void m.delete(k)})).not.toThrow();
    expect(m.has(TASKS_KEY)).toBe(false);
  });
});

describe('SB-6: the account erase and Sign out clear this tab’s drafts', () => {
  test('the welcome, habit and goal drafts go; other tab state stays', () => {
    sessionStorage.setItem('zigoals:welcome-draft:v1', JSON.stringify({name: 'Fictional Ada', goal: 'Fictional goal'}));
    sessionStorage.setItem('zigoals:habit-draft:v1', JSON.stringify({title: 'Fictional walk'}));
    sessionStorage.setItem('zigoals:draft:goal-wizard:v1', JSON.stringify({name: 'Fictional savings'}));
    sessionStorage.setItem('zigoals:settings-folds:v1', '[]');
    forgetAaDeviceRecords(memory().storage);
    expect(['zigoals:welcome-draft:v1', 'zigoals:habit-draft:v1', 'zigoals:draft:goal-wizard:v1'].map(k => sessionStorage.getItem(k))).toEqual([null, null, null]);
    expect(sessionStorage.getItem('zigoals:settings-folds:v1')).toBe('[]');
  });
  test('forgetTabDrafts names what it removed and never throws on a refusing storage', () => {
    sessionStorage.setItem('zigoals:habit-draft:v1', '{}');
    expect(forgetTabDrafts()).toEqual(['zigoals:habit-draft:v1']);
    const refusing = {length: 1, key: () => 'zigoals:habit-draft:v1', removeItem: () => { throw new Error('refused'); }};
    expect(forgetTabDrafts(refusing)).toEqual([]);
  });
});
