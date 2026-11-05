import {describe, expect, it} from 'vitest';
import {EVERYTHING_KEYS} from '../export/everything';
import {DEVICE_ONLY, SYNCED, recoveryCopies, recoveryCopyEntry, storedBytes} from './catalog';

describe('Data health catalog (Session AA-Cloud Part 6)', () => {
  it('labels every key Export everything reads, each once, synced or this device only', () => {
    const keys = [...SYNCED, ...DEVICE_ONLY].map(e => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...EVERYTHING_KEYS].sort());
    for (const e of [...SYNCED, ...DEVICE_ONLY]) expect(e.label.length).toBeGreaterThan(3);
  });
  it('Session AB-Cloud: every key the extras sections carry is listed as synced, Health\'s under its consent; photos, recent searches and the welcome\'s setup stay device-only', async () => {
    const {EXTRAS_SECTIONS} = await import('../vault/extras-sections');
    for (const section of EXTRAS_SECTIONS) for (const r of section.records) {
      const entry = SYNCED.find(e => e.key === r.spec.key);
      expect(entry?.home, r.spec.key).toBe(section.consent === 'health' ? 'sync-consent' : 'sync');
      expect(DEVICE_ONLY.some(e => e.key === r.spec.key)).toBe(false);
    }
    for (const key of ['zigoals:search-recent:v1', 'zigoals:onboarding-setup:v1', 'zigoals:progress-photos:v1', 'zigoals:ui-prefs:v1']) expect(DEVICE_ONLY.some(e => e.key === key), key).toBe(true);
  });
  it('Session AL: names the recovery copies a restore keeps (Tasks, the Checklist and its days included), and nothing else', () => {
    const uuid = '0f8b3c1e-5d2a-4e7b-9c10-2a3b4c5d6e7f';
    expect(recoveryCopyEntry(`zigoals:tasks:v1:recovery:${uuid}`)).toEqual({key: `zigoals:tasks:v1:recovery:${uuid}`, label: 'Recovery copy: Tasks', home: 'device', area: 'Today'});
    expect(recoveryCopyEntry(`zigoals:checklist:v1:recovery:${uuid}`)?.label).toMatch(/^Recovery copy: /);
    expect(recoveryCopyEntry(`zigoals:checklist-days:v1:recovery:${uuid}`)?.label).toMatch(/^Recovery copy: /);
    expect(recoveryCopyEntry(`zigoals:checklist:v1:recovery:${uuid}`)?.area).toBe(SYNCED.find(e => e.key === 'zigoals:checklist:v1')!.area);
    for (const key of ['zigoals:tasks:v1', 'zigoals:tasks:v1:recovery:not-a-uuid', `zigoals:unknown:v1:recovery:${uuid}`, `zigoals:tasks:v1:recovery:${uuid}:x`]) expect(recoveryCopyEntry(key), key).toBeNull();
    const keys = [`zigoals:tasks:v1:recovery:${uuid}`, 'zigoals:tasks:v1', `zigoals:journal:v1:recovery:${uuid}`];
    expect(recoveryCopies({length: keys.length, key: i => keys[i] ?? null}).map(e => e.label)).toEqual(['Recovery copy: Journal', 'Recovery copy: Tasks']);
  });
  it('counts what a stored value takes, and nothing for nothing stored', () => {
    expect(storedBytes(null)).toBeNull();
    expect(storedBytes('{}')).toBe(4);
  });
});
