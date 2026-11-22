// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {DEVICE_KEYS, EVERYTHING_KEYS, TEXT_DEVICE_KEYS, buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {DEVICE_PARTS, NEVER_RESTORED, RESTORABLE_DEVICE_PARTS, TEXT_DEVICE_PARTS, planParts, type PlannedPart} from './plan';
import {openBackup} from './read-backup';
import {RESTORE_KEYS, applyRestore, forgetRestoreUndo, undoRestore} from './apply';
import {eraseParts} from './erase-area';
import {exportRecordSections} from '../vault/backup-records';
import {DEVICE_ONLY, SYNCED} from '../data-health/catalog';
import {AH_DISPLAY_KEYS, AH_ERASE_KEYS, HIDE_BODY_FIGURES_KEY} from '../ah-device-keys';
import {HIDE_FIGURES_KEY} from '../../components/hide-figures';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';

/**
 * Session AV lane 2 (nl-days, R3; q3-36; TIER 3 (stored formats), additive): Export everything keeps Health's "Hide
 * calories and weight" switch (`zigoals:hide-body-figures`, the raw text `on`, not JSON), and Restore brings it back with
 * Health, as that text. A file without it restores as before; a build that does not know it leaves it unread.
 */
const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
const LOG = JSON.stringify(moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', entries: [{id: 'e1', kind: 'expense', amount: '4.50', currency: 'EUR', category: 'Food & drink', date: '2026-11-20', createdAt: '2026-11-20T08:00:00.000Z'}]}));
const fileOf = async (texts: Record<string, string>) => openBackup(new NodeBlob([buildEverythingZip(collectEverything(texts, APP), {date: '2026-11-22', showcase: false, now: NOW}).bytes]) as unknown as Blob);
const restoreAll = (opened: Awaited<ReturnType<typeof fileOf>>, parts: PlannedPart[], mode: 'replace' | 'merge' = 'replace') => applyRestore(opened, parts.map(part => ({part, mode})), {vision: false, progress: false});

describe('the key and its registries', () => {
  test('one key, the switch\'s own; a display key (the account erase leaves it), listed in the catalogue under Health', () => {
    expect(HIDE_BODY_FIGURES_KEY).toBe(HIDE_FIGURES_KEY);
    expect(DEVICE_KEYS.hideBodyFigures).toBe(HIDE_FIGURES_KEY);
    expect(EVERYTHING_KEYS).toContain(HIDE_FIGURES_KEY);
    expect(TEXT_DEVICE_KEYS.has(HIDE_FIGURES_KEY)).toBe(true);
    expect(AH_DISPLAY_KEYS).toContain(HIDE_FIGURES_KEY);
    expect(AH_ERASE_KEYS).not.toContain(HIDE_FIGURES_KEY);
    expect(DEVICE_ONLY.find(e => e.key === HIDE_FIGURES_KEY)).toEqual({key: HIDE_FIGURES_KEY, label: 'Hide calories and weight (a display choice)', home: 'device', area: 'Health'});
    expect(SYNCED.some(e => e.key === HIDE_FIGURES_KEY)).toBe(false);
    expect(RESTORE_KEYS).toContain(HIDE_FIGURES_KEY);
    expect(TEXT_DEVICE_PARTS.map(p => [p.name, p.group, p.key, p.text])).toEqual([['hideBodyFigures', 'Health', HIDE_FIGURES_KEY, true]]);
    expect(NEVER_RESTORED).toContain('display choices (except Hide calories and weight, which comes back with Health)');
  });
  test('kept out of the record lists: "Erase one area" and the protected copy\'s record sections never take it', () => {
    expect(DEVICE_PARTS.some(p => p.key === HIDE_FIGURES_KEY)).toBe(false);
    expect(RESTORABLE_DEVICE_PARTS.filter(p => p.key === HIDE_FIGURES_KEY)).toHaveLength(1);
    expect(eraseParts('Health').some(p => p.key === HIDE_FIGURES_KEY)).toBe(false);
    localStorage.setItem(HIDE_FIGURES_KEY, 'on');
    const made = exportRecordSections(localStorage, {health: true});
    expect(made.warnings).toEqual([]);
    expect(Object.values(made.sections).some(s => s!.includes(HIDE_FIGURES_KEY) || s!.includes('hideBodyFigures'))).toBe(false);
  });
});

describe('Export everything writes the switch as its text', () => {
  test('on: `"hideBodyFigures": "on"` in everything.json, nothing unreadable', () => {
    const collected = collectEverything({[HIDE_FIGURES_KEY]: 'on'}, APP);
    expect(collected.json.device.hideBodyFigures).toBe('on');
    expect(collected.unreadable).toEqual([]);
    expect(JSON.stringify(collected.json)).toContain('"hideBodyFigures":"on"');
  });
  test('off (the key removed): no entry', () => {
    const collected = collectEverything({[HIDE_FIGURES_KEY]: null, [MONEY_LOG_KEY]: LOG}, APP);
    expect('hideBodyFigures' in collected.json.device).toBe(false);
    expect(collected.unreadable).toEqual([]);
  });
});

describe('export → erase → restore', () => {
  test('Replace puts back the raw text `on` (not JSON), with Health, and its Undo takes it away again', async () => {
    const texts = {[HIDE_FIGURES_KEY]: 'on', [MONEY_LOG_KEY]: LOG};
    const opened = await fileOf(texts);
    for (const [k, v] of Object.entries(texts)) localStorage.setItem(k, v);
    await eraseEverything({localStorage, sessionStorage, indexedDB: null});
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBeNull();
    const parts = planParts(opened.json).filter(p => p.key === HIDE_FIGURES_KEY || p.key === MONEY_LOG_KEY);
    const part = parts.find(p => p.key === HIDE_FIGURES_KEY)!;
    expect(part).toMatchObject({kind: 'device', name: 'hideBodyFigures', group: 'Health', label: 'Hide calories and weight (on screen)', value: 'on', summary: {counts: 'Settings only', from: null, through: null}});
    expect(part.problem).toBeUndefined();
    let told = 0; const hear = () => { told++; };
    window.addEventListener('zigoals-hide-body-figures', hear);
    const outcome = await restoreAll(opened, parts);
    window.removeEventListener('zigoals-hide-body-figures', hear);
    expect(outcome.failed).toEqual([]);
    expect(outcome.restored).toContain('Hide calories and weight (on screen)');
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBe('on');
    expect(localStorage.getItem(MONEY_LOG_KEY)).toBe(LOG);
    expect(told).toBe(1);
    await undoRestore();
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBeNull();
  });
  test('Merge on a device that holds it already keeps it; on one that does not, adds it', async () => {
    const opened = await fileOf({[HIDE_FIGURES_KEY]: 'on'});
    const parts = planParts(opened.json).filter(p => p.key === HIDE_FIGURES_KEY);
    expect((await restoreAll(opened, parts, 'merge')).failed).toEqual([]);
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBe('on');
    expect((await restoreAll(opened, parts, 'merge')).failed).toEqual([]);
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBe('on');
  });
  test('a value that is not `on` is not restored (said, nothing written)', async () => {
    const opened = await fileOf({[MONEY_LOG_KEY]: LOG});
    const tampered = planParts({...opened.json, device: {...opened.json.device, hideBodyFigures: 'yes please'}}).find(p => p.key === HIDE_FIGURES_KEY)!;
    expect(tampered.problem).toBe('This part did not read as a valid record, so it is left out.');
    const outcome = await restoreAll(opened, [tampered]);
    expect(outcome.failed.map(f => f.label)).toEqual(['Hide calories and weight (on screen)']);
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBeNull();
  });
});

describe('older and newer files', () => {
  test('an older file (made before this entry) restores as before: no such part, the rest restores, the switch stays as it is', async () => {
    const opened = await fileOf({[MONEY_LOG_KEY]: LOG});
    expect('hideBodyFigures' in opened.json.device).toBe(false);
    const parts = planParts(opened.json);
    expect(parts.some(p => p.key === HIDE_FIGURES_KEY)).toBe(false);
    const outcome = await restoreAll(opened, parts.filter(p => p.key === MONEY_LOG_KEY));
    expect(outcome.failed).toEqual([]);
    expect(localStorage.getItem(MONEY_LOG_KEY)).toBe(LOG);
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBeNull();
  });
  test('an older build reading this newer file ignores the entry: the file opens, and a device name its plan does not know is left unread', async () => {
    const opened = await fileOf({[HIDE_FIGURES_KEY]: 'on', [MONEY_LOG_KEY]: LOG});
    // The file is still the same format (version 1); the entry is a plain string inside `device`, which every reader takes.
    expect(opened.json.version).toBe(1);
    expect(opened.json.device.hideBodyFigures).toBe('on');
    // An older build's plan is DEVICE_PARTS (its planParts reads only the names it lists; lane2/batch2's plan.ts loops
    // `for (const part of DEVICE_PARTS)`); that list does not hold this entry, so it reads nothing of it.
    expect(DEVICE_PARTS.some(p => p.name === 'hideBodyFigures')).toBe(false);
    // The same rule, shown here with a name this build does not know either: no part, no problem, nothing written.
    const newer = planParts({...opened.json, device: {...opened.json.device, someNewerChoice: 'on'}});
    expect(newer.some(p => p.name === 'someNewerChoice')).toBe(false);
    expect(newer.filter(p => p.problem)).toEqual([]);
    const outcome = await restoreAll(opened, newer.filter(p => p.key === MONEY_LOG_KEY));
    expect(outcome.failed).toEqual([]);
    expect(localStorage.getItem(HIDE_FIGURES_KEY)).toBeNull();
  });
});
