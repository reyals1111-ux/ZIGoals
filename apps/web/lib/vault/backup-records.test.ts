import {describe, expect, test} from 'vitest';
import {encryptBackup, decryptBackup, backupFormatVersion} from './backup';
import {summarizeBackupModules} from './backup-preview';
import {exportListSections} from './backup-lists';
import {exportRecordSections, restoreRecordSection, sectionOf, RECORD_SECTIONS, RECORDS_INVALID} from './backup-records';
import {DEVICE_PARTS} from '../restore/plan';
import {ACCOUNTS_KEY} from '../w-device-keys';
import {JOURNAL_KEY} from '../journal/schema';
import {MONEY_LOG_KEY} from '../money-log/schema';
import {ENERGY_KEY} from '../energy/schema';
import {AI_MEMORY_KEY} from '../ai/store/keys';
import {AGENDA_KEY} from '../agenda/store';
import {TASKS_KEY} from '../tasks/schema';
import {createEmptyHealth} from '../health';

// Session AL (third pass, INT): the other device records in the encrypted backup, its preview and its restore.
function memory(values: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(values));
  return {get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, clear: () => map.clear()};
}
const AT = '2026-11-02T09:00:00.000Z';
const accounts = {version: 1, items: [{id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a01', kind: 'savings', name: 'Fictional savings', currency: 'EUR', snapshots: [{id: '6a1f0c2e-1b7d-4f43-9a52-0d6c1e3b5a02', date: '2026-10-01', value: '125000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]};
const journal = {version: 1, entries: [{id: 'j1', date: '2026-10-30', text: 'Fictional: a calm day', createdAt: AT}], shareWithAi: false, followUps: true};
const moneyLog = {version: 1, entries: [{id: 'm1', kind: 'expense', amount: '4.50', currency: 'EUR', category: 'Food & drink', date: '2026-10-31', createdAt: AT}], weekStartsOn: 'monday'};
const energy = {version: 1, days: {'2026-11-01': {energy: 4, at: AT}}};
const note = (id: string, category: string) => ({id, text: `Fictional ${category} note`, category, source: 'person', createdAt: AT, updatedAt: AT});
const aiMemory = {version: 1, notes: [note('n1', 'goals'), note('n2', 'diet')], consent: 'given'};
const device = () => memory({[ACCOUNTS_KEY]: JSON.stringify(accounts), [JOURNAL_KEY]: JSON.stringify(journal), [MONEY_LOG_KEY]: JSON.stringify(moneyLog), [ENERGY_KEY]: JSON.stringify(energy), [AI_MEMORY_KEY]: JSON.stringify(aiMemory)});
const stored = (s: Storage, k: string) => JSON.parse(s.getItem(k)!);
const keys = (s: Storage) => Array.from({length: s.length}, (_, i) => s.key(i)!);

describe('the other device records in the encrypted backup', () => {
  test('every restorable device record has one section, except Tasks and the Checklist (their own) and nothing Health-describing outside healthRecords', () => {
    for (const part of DEVICE_PARTS) {
      const s = sectionOf(part);
      if ([TASKS_KEY, 'zigoals:checklist:v1', 'zigoals:checklist-days:v1'].includes(part.key)) expect(s, part.id).toBeNull();
      else expect(RECORD_SECTIONS, part.id).toContain(s);
      if (part.health || part.group === 'Health') expect(s === null || s === 'healthRecords', part.id).toBe(true);
    }
    for (const id of ['device:accounts', 'device:journal', 'device:moneyLog', 'device:notes', 'device:bills', 'device:portfolio']) expect(DEVICE_PARTS.find(p => p.id === id), id).toBeDefined();
  });

  test('backup → preview → restore on a fresh device gives the same records (with the Health choice)', async () => {
    const {sections, warnings} = exportRecordSections(device(), {health: true});
    expect(warnings).toEqual([]);
    expect(Object.keys(sections).sort()).toEqual(['healthRecords', 'lifeRecords', 'wealthRecords']);
    const backup = await encryptBackup({health: JSON.stringify(createEmptyHealth()), ...sections});
    expect(JSON.parse(backup.file).version).toBe(4);
    expect(backup.file).not.toContain('Fictional');
    const opened = await decryptBackup(backup.file, backup.recovery);
    const preview = summarizeBackupModules(opened);
    expect(preview.find(r => r.domain === 'wealthRecords')).toMatchObject({counts: expect.arrayContaining([{label: 'Accounts and debts', count: expect.any(Number)}, {label: 'Spending', count: 1}]), from: '2026-10-01'});
    expect(preview.find(r => r.domain === 'lifeRecords')?.counts.map(c => c.label)).toEqual(expect.arrayContaining(['Journal', 'Memory for ZIGi and NOVA']));
    expect(preview.find(r => r.domain === 'healthRecords')?.counts.map(c => c.label)).toEqual(expect.arrayContaining(['Daily energy', 'Memory notes about health and diet (ZIGi and NOVA)']));
    expect(JSON.stringify(preview)).not.toContain('Fictional');
    const fresh = memory();
    for (const name of ['wealthRecords', 'lifeRecords', 'healthRecords'] as const) restoreRecordSection(fresh, name, opened[name]!);
    expect(stored(fresh, ACCOUNTS_KEY)).toEqual(accounts);
    expect(stored(fresh, JOURNAL_KEY)).toEqual(journal);
    expect(stored(fresh, MONEY_LOG_KEY)).toEqual(moneyLog);
    expect(stored(fresh, ENERGY_KEY)).toEqual(energy);
    expect(stored(fresh, AI_MEMORY_KEY).notes.map((n: {id: string}) => n.id).sort()).toEqual(['n1', 'n2']);
  });

  test('without the Health choice no Health record and no health or diet note is in the file; a restore keeps this device’s own', async () => {
    const {sections} = exportRecordSections(device(), {health: false});
    expect(sections.healthRecords).toBeUndefined();
    expect(sections.lifeRecords).not.toContain('n2');
    expect(JSON.stringify(sections)).not.toContain('"energy"');
    const here = memory({[AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [note('h_here', 'health')]}), [JOURNAL_KEY]: JSON.stringify({...journal, entries: []})});
    const before = here.getItem(JOURNAL_KEY)!;
    const result = restoreRecordSection(here, 'lifeRecords', sections.lifeRecords!);
    expect(result.restored).toEqual(expect.arrayContaining(['Journal', 'Memory for ZIGi and NOVA']));
    expect(stored(here, AI_MEMORY_KEY).notes.map((n: {id: string}) => n.id).sort()).toEqual(['h_here', 'n1']);
    // The replaced bytes are kept as a recovery copy in this browser.
    expect(keys(here).filter(k => k.startsWith(`${JOURNAL_KEY}:recovery:`)).map(k => here.getItem(k))).toEqual([before]);
  });

  test('a device with no such records, or only their empty values, makes the same format 1–3 file as before', async () => {
    expect(exportRecordSections(memory(), {health: true})).toEqual({sections: {}, warnings: []});
    expect(exportRecordSections(memory({[JOURNAL_KEY]: JSON.stringify({version: 1, entries: [], shareWithAi: false, followUps: true}), [ACCOUNTS_KEY]: JSON.stringify({version: 1, items: []})}), {health: true}).sections).toEqual({});
    expect(backupFormatVersion(['health'])).toBe(1); expect(backupFormatVersion(['tasks'])).toBe(3); expect(backupFormatVersion(['tasks', 'lifeRecords'])).toBe(4);
    const {sections} = exportListSections(memory(), {health: true});
    const older = await encryptBackup({health: JSON.stringify(createEmptyHealth()), ...sections});
    expect(JSON.parse(older.file).version).toBe(1);
  });

  test('a section that does not read is refused with nothing changed; a newer app’s records are skipped and counted; settings-only records are named, not counted', () => {
    const {sections} = exportRecordSections(device(), {health: true});
    const here = memory({[JOURNAL_KEY]: JSON.stringify(journal)}), before = here.getItem(JOURNAL_KEY);
    expect(() => restoreRecordSection(here, 'lifeRecords', 'not json')).toThrow(RECORDS_INVALID);
    const broken = JSON.parse(sections.lifeRecords!); broken.records['device:journal'] = {version: 1, entries: 'no'};
    expect(() => restoreRecordSection(here, 'lifeRecords', JSON.stringify(broken))).toThrow(RECORDS_INVALID);
    expect(here.getItem(JOURNAL_KEY)).toBe(before);
    expect(keys(here)).toEqual([JOURNAL_KEY]);
    const newer = JSON.parse(sections.lifeRecords!); newer.records['device:fromTheFuture'] = {version: 1}; newer.records['device:agenda'] = {version: 9, view: 'week'};
    expect(restoreRecordSection(memory(), 'lifeRecords', JSON.stringify(newer)).skipped).toBe(2);
    expect(summarizeBackupModules({lifeRecords: JSON.stringify(newer)})[0]).toMatchObject({warning: expect.stringMatching(/^2 records were saved by a newer ZIGoals/)});
    const agenda = exportRecordSections(memory({[AGENDA_KEY]: JSON.stringify({version: 1, view: 'week'})}), {health: false}).sections.lifeRecords;
    expect(agenda).toBeDefined();
    expect(summarizeBackupModules({lifeRecords: agenda!})[0]).toMatchObject({counts: [], choices: ['Agenda view and filters']});
  });

  test('a record that does not read on this device is left out and named; the others still travel', () => {
    const {sections, warnings} = exportRecordSections(memory({[JOURNAL_KEY]: '{broken', [MONEY_LOG_KEY]: JSON.stringify(moneyLog)}), {health: false});
    expect(warnings).toEqual([expect.stringMatching(/^Journal could not be read on this device/)]);
    expect(sections.wealthRecords).toBeDefined();
    expect(sections.lifeRecords).toBeUndefined();
  });
});
