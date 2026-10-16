import {describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {buildStoredZip} from '../export/zip';
import {ZIP_ERRORS} from '../import/zip-stream';
import {HABITS_KEY, emptyHabitData} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from '../health';
import {emptyPlatform} from '../positions';
import {CURRENT_VERSIONS} from '../vault/versions';
import {INVALID_PART_MESSAGE, MERGE_REFUSED_MESSAGE, NEWER_PART_MESSAGE, OLDER_PART_MESSAGE, OLDER_READABLE_NOTE, OLDER_THAN_DEVICE_MESSAGE, nextValue, planParts, replaceRefused} from './plan';
import {RESTORE_ERRORS, RESTORE_LIMITS, moduleBackupMessage, openBackup} from './read-backup';

/**
 * Session AD item 11 (ADR-026): Restore from a backup, the edge cases — damaged, foreign, too new, too old, partial,
 * Health, photos and very large files. Each is refused or limited with a plain sentence before anything is written.
 * Fictional data only.
 */
const NOW = new Date('2026-10-14T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const blobOf = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>]);
const zipOf = (json: unknown, extra: {name: string; data: Uint8Array | string}[] = []) => blobOf(buildStoredZip([{name: 'everything.json', data: typeof json === 'string' ? json : JSON.stringify(json), modified: NOW}, ...extra.map(e => ({...e, modified: NOW}))]));
const base = {format: 'zigoals-everything', version: 1, exportedAt: NOW.toISOString(), app: {version: 'x', commit: 'y'}, note: '', modules: {}, device: {}, unreadable: []};
const {records} = buildShowcase('2026-09-20', 'UTC', {aa: true});

describe('foreign files: the other ZIGoals files a person may pick here by mistake', () => {
  test('an encrypted backup, a single module\'s backup and an unzipped everything.json each name what they are and where they go', async () => {
    await expect(openBackup(new Blob([JSON.stringify({format: 'zigoals-encrypted-backup', version: 1, manifest: {}, index: {}, chunks: []})]))).rejects.toThrow(RESTORE_ERRORS.encrypted);
    await expect(openBackup(new Blob([JSON.stringify(emptyHabitData())]))).rejects.toThrow(moduleBackupMessage('Habits'));
    await expect(openBackup(new Blob([JSON.stringify(createEmptyHealth())]))).rejects.toThrow(moduleBackupMessage('Health'));
    await expect(openBackup(new Blob([JSON.stringify(emptyPlatform())]))).rejects.toThrow(moduleBackupMessage('Positions and Goals'));
    await expect(openBackup(new Blob([JSON.stringify(base)]))).rejects.toThrow(RESTORE_ERRORS.unzipped);
    expect(moduleBackupMessage('Habits')).toBe('This is a single Habits backup, not an “Export everything” ZIP. Restore it in Settings under “Habits backup”. Nothing was changed.');
  });
  test('another app\'s ZIP and a text file keep their plain sentences', async () => {
    await expect(openBackup(blobOf(buildStoredZip([{name: 'photo.jpg', data: 'x', modified: NOW}])))).rejects.toThrow(RESTORE_ERRORS.notExport);
    await expect(openBackup(new Blob(['These are notes, not a ZIP archive at all.']))).rejects.toThrow(ZIP_ERRORS.notZip);
  });
});

describe('damaged and cut-short files', () => {
  test('a ZIP whose end is missing (a download that did not finish) is called incomplete, not "not a ZIP"', async () => {
    const zip = buildEverythingZip(collectEverything(records, APP), {date: '2026-10-14', showcase: false, now: NOW});
    await expect(openBackup(blobOf(zip.bytes.slice(0, zip.bytes.length - 200)))).rejects.toThrow(RESTORE_ERRORS.incomplete);
    await expect(openBackup(blobOf(zip.bytes.slice(0, Math.floor(zip.bytes.length / 2))))).rejects.toThrow(RESTORE_ERRORS.incomplete);
  });
  test('an export whose file says a format version below the first one is too old, with its own sentence', async () => {
    await expect(openBackup(zipOf({...base, version: 0}))).rejects.toThrow(RESTORE_ERRORS.older);
    expect(RESTORE_ERRORS.older).toMatch(/early test version of ZIGoals that this app no longer reads, so nothing was changed/);
    // Version 1 is the first and current one: anything numeric below it is older; a version that is not a number is damaged.
    await expect(openBackup(zipOf({...base, version: 0.5}))).rejects.toThrow(RESTORE_ERRORS.older);
    await expect(openBackup(zipOf({...base, version: '1'}))).rejects.toThrow(RESTORE_ERRORS.damaged);
  });
});

describe('very large files', () => {
  test('an everything.json above the limit is refused before it is read', async () => {
    const bytes = buildStoredZip([{name: 'everything.json', data: JSON.stringify(base), modified: NOW}]);
    // The central directory's "uncompressed size" of everything.json says 65 MB: refused from the directory alone.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let at = -1; for (let i = bytes.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x02014B50) { at = i; break; }
    expect(at).toBeGreaterThan(0); view.setUint32(at + 24, RESTORE_LIMITS.jsonBytes + 1, true);
    await expect(openBackup(blobOf(bytes))).rejects.toThrow(RESTORE_ERRORS.tooLarge);
    await expect(openBackup({size: RESTORE_LIMITS.fileBytes + 1} as Blob)).rejects.toThrow(RESTORE_ERRORS.tooLarge);
  });
  test('photos above the restore\'s size limit are left out and counted, so the preview can say so', async () => {
    const big = new Uint8Array(RESTORE_LIMITS.photoBytes + 1);
    const opened = await openBackup(zipOf(base, [{name: 'photos/2026-10-01-front-abcdef12.webp', data: big}, {name: 'photos/2026-10-02-side-abcdef13.webp', data: 'small'}, {name: 'vision/img-big.png', data: new Uint8Array(RESTORE_LIMITS.visionBytes + 1)}]));
    expect(opened.photos.map(e => e.name)).toEqual(['photos/2026-10-02-side-abcdef13.webp']);
    expect(opened.vision).toEqual([]);
    expect(opened.oversized).toBe(2);
  });
});

describe('too new and too old parts', () => {
  test('a part from a newer ZIGoals is named and left out; a part below version 1 is an early test file, left out too', () => {
    const parts = planParts({modules: {finance: {schemaVersion: CURRENT_VERSIONS.finance + 1, kind: 'zigoals-platform'}, habits: {...emptyHabitData(), schemaVersion: 0}}, device: {fasting: {version: 0, sessions: []}, accounts: {version: 2, items: []}}});
    expect(Object.fromEntries(parts.map(p => [p.id, p.problem]))).toEqual({'module:finance': NEWER_PART_MESSAGE, 'module:habits': OLDER_PART_MESSAGE, 'device:accounts': NEWER_PART_MESSAGE, 'device:fasting': OLDER_PART_MESSAGE});
    for (const p of parts) expect(nextValue(p, 'merge', undefined)).toEqual({error: p.problem});
  });
  test('every earlier version ZIGoals wrote is still read: it restores, with a note that says so', () => {
    const health = createEmptyHealth(), habits = emptyHabitData();
    expect(health.schemaVersion).toBeLessThan(CURRENT_VERSIONS.health); expect(habits.schemaVersion).toBeLessThan(CURRENT_VERSIONS.habits);
    const parts = planParts({modules: {health, habits, finance: emptyPlatform()}});
    for (const p of parts) { expect(p.problem, p.id).toBeUndefined(); expect(p.note, p.id).toBe(OLDER_READABLE_NOTE); expect(nextValue(p, 'replace', undefined)).toEqual({value: p.value}); }
    const current = planParts({modules: {habits: {...habits, schemaVersion: CURRENT_VERSIONS.habits}}})[0]!;
    expect(current.note).toBeUndefined();
  });
  test('an older part never replaces a newer copy this device holds; Merge stays possible and keeps this device\'s version', () => {
    const device = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
    expect(device.schemaVersion).toBeGreaterThan(1);
    const [older] = planParts({modules: {health: createEmptyHealth()}});
    expect(replaceRefused(older!, device)).toBe(true);
    expect(nextValue(older!, 'replace', device)).toEqual({error: OLDER_THAN_DEVICE_MESSAGE});
    const merged = nextValue(older!, 'merge', device);
    expect('value' in merged && (merged.value as {schemaVersion: number}).schemaVersion).toBe(device.schemaVersion);
    // The same version, or nothing on this device: Replace is offered as before. Device records are never refused this way.
    expect(replaceRefused(older!, undefined)).toBe(false);
    expect(replaceRefused(planParts({modules: {health: device}})[0]!, device)).toBe(false);
    expect(replaceRefused(planParts({device: {fasting: {version: 1, sessions: []}}})[0]!, {version: 1, sessions: []})).toBe(false);
  });
});

describe('partial backups', () => {
  test('a file with only some sections offers only those; the rest of this device is not part of the restore', () => {
    const parts = planParts({modules: {habits: JSON.parse(records[HABITS_KEY]!)}, device: {}});
    expect(parts.map(p => p.id)).toEqual(['module:habits']);
  });
  test('a file where one part is damaged still offers the others; the damaged one is named and never written', () => {
    const parts = planParts({modules: {habits: JSON.parse(records[HABITS_KEY]!), health: {schemaVersion: 4, kind: 'zigoals-health', foods: 'not a list'}}, device: {fasting: {version: 1, sessions: 'nope'}, insights: {version: 1, dismissed: {}}}});
    expect(Object.fromEntries(parts.map(p => [p.id, p.problem ?? 'ok']))).toEqual({'module:habits': 'ok', 'module:health': INVALID_PART_MESSAGE, 'device:fasting': INVALID_PART_MESSAGE, 'device:insights': 'ok'});
    expect(nextValue(parts.find(p => p.id === 'module:health')!, 'replace', undefined)).toEqual({error: INVALID_PART_MESSAGE});
    expect(MERGE_REFUSED_MESSAGE).toMatch(/cannot be merged safely/);
  });
  test('Health parts are marked as Health, so the page can say they stay on this device without Health sync', () => {
    const parts = planParts(collectEverything(records, APP).json as never);
    expect(parts.filter(p => p.health).length).toBeGreaterThan(1);
    for (const p of parts.filter(p => p.health)) expect(p.group, p.id).toBe('Health');
  });
});
