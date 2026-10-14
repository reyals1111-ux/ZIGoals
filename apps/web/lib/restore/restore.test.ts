import {describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {buildStoredZip} from '../export/zip';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {deleteHabitForGood} from '../habit-delete-write';
import {scheduleHabitState} from '../habit-actions';
import {PLATFORM_KEY} from '../positions';
import {GOAL_EXTRAS_KEY} from '../goal-extras/store';
import {IMAGE_CAPS, IMAGE_TOO_LARGE, checkImageHeader, imageSize, tooLarge} from '../image-header';
import {DEVICE_PARTS, INVALID_PART_MESSAGE, MERGE_REFUSED_MESSAGE, MODULE_PARTS, NEWER_PART_MESSAGE, mergeKeep, nextValue, planParts, summarizeValue} from './plan';
import {RESTORE_ERRORS, entryBytes, openBackup} from './read-backup';
import {RESTORE_KEYS} from './apply';

// Session AB-Cloud Part 5 (ADR-023 C22): Restore from an Export everything ZIP — reading, the preview, merge and replace.
const NOW = new Date('2026-10-14T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
/** A Blob of the ZIP writer's bytes (typed as the browser's BlobPart). */
const blobOf = (bytes: Uint8Array) => new Blob([bytes as Uint8Array<ArrayBuffer>]);
const zipOf = (json: unknown, extra: {name: string; data: Uint8Array | string}[] = []) => blobOf(buildStoredZip([{name: 'everything.json', data: typeof json === 'string' ? json : JSON.stringify(json), modified: NOW}, ...extra.map(e => ({...e, modified: NOW}))]));
const base = {format: 'zigoals-everything', version: 1, exportedAt: NOW.toISOString(), app: {version: 'x', commit: 'y'}, note: '', modules: {}, device: {}, unreadable: []};

function png(w: number, h: number) { const b = new Uint8Array(33); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]); new DataView(b.buffer).setUint32(16, w); new DataView(b.buffer).setUint32(20, h); return b; }
function jpeg(w: number, h: number) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc2, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([0xff, 0xd8, 0xff, 0xff, ...app0, ...sof, 0xff, 0xd9]);
}
const riff = (chunk: string, body: number[]) => new Uint8Array([...'RIFF'].map(c => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map(c => c.charCodeAt(0)), [...chunk].map(c => c.charCodeAt(0)), [10, 0, 0, 0], body, new Array(16).fill(0)));
const u24 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255];

describe('image header sizes (no decode)', () => {
  test('PNG, GIF, JPEG (after APP0 and fill bytes) and the three WebP kinds read their size', () => {
    expect(imageSize(png(4000, 3000))).toEqual({width: 4000, height: 3000, type: 'image/png'});
    expect(imageSize(new Uint8Array([...'GIF89a'].map(c => c.charCodeAt(0)).concat([0x40, 0x01, 0xf0, 0x00, 0, 0])))).toEqual({width: 320, height: 240, type: 'image/gif'});
    expect(imageSize(jpeg(1600, 1200))).toEqual({width: 1600, height: 1200, type: 'image/jpeg'});
    expect(imageSize(riff('VP8X', [0, 0, 0, 0, ...u24(1279), ...u24(719)]))).toEqual({width: 1280, height: 720, type: 'image/webp'});
    const bits = (800 - 1) | ((600 - 1) << 14);
    expect(imageSize(riff('VP8L', [0x2f, bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255]))).toEqual({width: 800, height: 600, type: 'image/webp'});
    expect(imageSize(riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 0x40, 0x06, 0xb0, 0x04]))).toEqual({width: 1600, height: 1200, type: 'image/webp'});
  });
  test('a format it does not read is null; a size above 40 MP or 12,000 px, or zero, is too large and refused before decoding', async () => {
    for (const bytes of [new Uint8Array(0), new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')]) expect(imageSize(bytes)).toBeNull();
    expect(tooLarge({width: 12_000, height: 3_000})).toBe(false);
    expect(tooLarge({width: 12_001, height: 10})).toBe(true);
    expect(tooLarge({width: 8_000, height: 6_000})).toBe(true); // 48 MP
    expect(tooLarge({width: 0, height: 10})).toBe(true);
    expect(IMAGE_CAPS).toEqual({maxPixels: 40_000_000, maxSide: 12_000});
    await expect(checkImageHeader(new Blob([png(65_535, 65_535)]))).rejects.toThrow(IMAGE_TOO_LARGE);
    await expect(checkImageHeader(new Blob([jpeg(4032, 3024)]))).resolves.toMatchObject({width: 4032});
    await expect(checkImageHeader(new Blob([new Uint8Array([7, 7, 7])]))).resolves.toBeNull();
  });
});

describe('merge adds only what this device lacks', () => {
  test('lists union by id with this device\'s copy kept whole; a field this device has keeps its value; containers merge inside', () => {
    const current = {version: 1, items: [{id: 'a', name: 'Mine', updatedAt: '2026-10-10'}], weekday: 1, nested: {list: [{id: 'x'}]}};
    const backup = {version: 1, items: [{id: 'a', name: 'Old', updatedAt: '2026-01-01', extra: 1}, {id: 'b', name: 'Gone here'}], weekday: 3, nested: {list: [{id: 'y'}]}, later: true};
    expect(mergeKeep(current, backup)).toEqual({version: 1, items: [{id: 'a', name: 'Mine', updatedAt: '2026-10-10'}, {id: 'b', name: 'Gone here'}], weekday: 1, nested: {list: [{id: 'x'}, {id: 'y'}]}, later: true});
    // A stamped entry (a goal's extras) is one record: never mixed field by field with the backup's.
    expect(mergeKeep({goals: {g1: {why: 'mine', at: '2026-10-10'}}}, {goals: {g1: {why: 'old', obstacle: 'old', at: '2026-01-01'}, g2: {why: 'b', at: '2026-01-01'}}})).toEqual({goals: {g1: {why: 'mine', at: '2026-10-10'}, g2: {why: 'b', at: '2026-01-01'}}});
    expect(mergeKeep(undefined, backup)).toBe(backup);
    expect(mergeKeep(['a'], ['b'])).toEqual(['a']);
  });
  test('a key that would reach an object\'s prototype is never copied', () => {
    const merged = mergeKeep({a: {}}, JSON.parse('{"a": {"__proto__": {"polluted": true}}, "constructor": {"x": 1}}')) as Record<string, Record<string, unknown>>;
    expect(Object.getPrototypeOf(merged.a)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.hasOwn(merged, 'constructor')).toBe(false);
  });
});

describe('the preview plan', () => {
  const {records} = buildShowcase('2026-09-20', 'UTC', {aa: true});
  const collected = collectEverything(records, APP);
  test('every module and device part in the file is validated and summarized; parts this never restores are not offered', () => {
    const json = {...collected.json, device: {...collected.json.device, push: {endpoint: 'https://example.invalid'}, aiUsage: {version: 1}, searchRecent: {version: 1, items: []}, onboardingSetup: {}}};
    const parts = planParts(json as never);
    expect(parts.map(p => p.id)).toEqual(expect.arrayContaining(['module:finance', 'module:habits', 'module:health', 'module:settings', 'device:goalExtras']));
    for (const p of parts) expect([...MODULE_PARTS, ...DEVICE_PARTS].some(x => x.id === p.id), p.id).toBe(true);
    expect(parts.map(p => p.id).join(' ')).not.toMatch(/push|aiUsage|searchRecent|onboardingSetup|routineRun|importUndo|pointTell|uiPrefs/);
    const habits = parts.find(p => p.id === 'module:habits')!;
    expect(habits.problem).toBeUndefined(); expect(habits.summary!.counts).toMatch(/^Habits: \d+ · Check-ins: \d+$/); expect(habits.summary!.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parts.filter(p => p.health).map(p => p.group)).toEqual(parts.filter(p => p.health).map(() => 'Health'));
  });
  test('a newer module, a newer device record and an invalid one are named and never written', () => {
    const parts = planParts({modules: {finance: {schemaVersion: 99, kind: 'zigoals-platform'}, habits: {schemaVersion: 2, habits: 'nope'}}, device: {accounts: {version: 2, items: []}, fasting: {version: 1, sessions: 'x'}}});
    expect(Object.fromEntries(parts.map(p => [p.id, p.problem]))).toEqual({'module:finance': NEWER_PART_MESSAGE, 'module:habits': INVALID_PART_MESSAGE, 'device:accounts': NEWER_PART_MESSAGE, 'device:fasting': INVALID_PART_MESSAGE});
    for (const p of parts) expect(nextValue(p, 'replace', undefined)).toEqual({error: p.problem});
  });
  test('replace keeps this device\'s deleted-habit markers and dormant goal extras; merge must still pass the schema', () => {
    const parts = planParts(collected.json as never);
    const habitsPart = parts.find(p => p.id === 'module:habits')!;
    // This device deleted a habit for good after the backup was made (a nameless marker kept for sync): the backup does
    // not hold the marker, so a replace keeps it and the deleted habit never comes back; the backup's copy is otherwise whole.
    const current = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), target = current.habits[0]!;
    const fresh = {...target, id: '11111111-1111-4111-8111-111111111111'};
    const withFresh = {...current, habits: [...current.habits, fresh]};
    const {data: deviceNow} = deleteHabitForGood(scheduleHabitState(withFresh, fresh.id, 'archived', '2026-09-21', new Date('2026-09-20T12:00:00.000Z')), fresh.id, new Date('2026-09-22T12:00:00.000Z'));
    const replacedHabits = nextValue(habitsPart, 'replace', deviceNow) as {value: {habits: {id: string; title: string}[]}};
    expect(replacedHabits.value.habits.map(h => h.id)).toEqual([...current.habits.map(h => h.id), fresh.id]);
    expect(replacedHabits.value.habits.at(-1)!.title).toBe('Deleted habit');
    // A habit the backup holds is the backup's copy, even where this device has its own.
    expect(replacedHabits.value.habits[0]).toEqual((habitsPart.value as {habits: unknown[]}).habits[0]);
    const extrasPart = parts.find(p => p.id === 'device:goalExtras')!;
    const [goalKey, entry] = Object.entries((extrasPart.value as {goals: Record<string, object>}).goals)[0]!;
    const dormant = {dormant: {[goalKey]: {...entry, dormantSince: '2026-10-01'}}};
    const replaced = nextValue(extrasPart, 'replace', {version: 1, goals: {}, areas: [], ...dormant});
    expect('value' in replaced && (replaced.value as {dormant?: unknown}).dormant).toEqual(dormant.dormant);
    // A merge whose result breaks a strict record's rule is refused, never written half-valid: here this device already
    // holds a different weekly-review weekday shape the schema refuses once combined.
    const review = planParts({modules: {}, device: {weeklyReview: {version: 1, weekday: 2, reviews: []}}})[0]!;
    expect(review.problem).toBeUndefined();
    expect(nextValue(review, 'merge', {version: 1, weekday: 2, reviews: 'not a list'})).toEqual({error: MERGE_REFUSED_MESSAGE});
    expect(nextValue(review, 'merge', {version: 1, weekday: 5, reviews: []})).toEqual({value: {version: 1, weekday: 5, reviews: []}});
  });
  test('the generic summary counts list items and map entries and reads the stored date range', () => {
    expect(summarizeValue({version: 1, items: [{id: 'a', date: '2026-01-02'}, {id: 'b', updatedAt: '2026-03-04T10:00:00Z'}], goals: {g: {at: '2025-12-31T00:00:00Z'}}})).toEqual({counts: '3 records', from: '2025-12-31', through: '2026-03-04'});
    expect(summarizeValue({version: 1, mode: 'grams'})).toEqual({counts: 'Settings only', from: null, through: null});
  });
  test('a restore writes only the parts it names: never a sync, consent, vault, key or push record', () => {
    expect(RESTORE_KEYS).toContain(PLATFORM_KEY); expect(RESTORE_KEYS).toContain(GOAL_EXTRAS_KEY);
    expect(RESTORE_KEYS.join(' ')).not.toMatch(/vault|sync|consent|push|ai-keys|zigi|onboarding|recent|undo|finance-homes|extras-sync/);
  });
});

describe('opening a backup', () => {
  const {records} = buildShowcase('2026-09-20', 'UTC', {aa: true});
  test('an Export everything ZIP opens: its records, its photos, and the Showcase\'s examples are recognised', async () => {
    const zip = buildEverythingZip(collectEverything(records, APP), {date: '2026-10-14', showcase: false, now: NOW, images: [{id: 'img-0f0e0d0c-0b0a-4908-8706-050403020100', type: 'image/png', bytes: png(10, 10)}]}, [{name: 'photos/2026-10-01-front-abcdef12.webp', data: riff('VP8X', [0, 0, 0, 0, ...u24(9), ...u24(9)]), modified: NOW}]);
    const opened = await openBackup(blobOf(zip.bytes));
    expect(opened.json.modules.habits).toEqual(JSON.parse(records[HABITS_KEY]!));
    expect(opened.vision.map(e => e.name)).toEqual(['vision/img-0f0e0d0c-0b0a-4908-8706-050403020100.png']);
    expect(opened.photos.map(e => e.name)).toEqual(['photos/2026-10-01-front-abcdef12.webp']);
    expect(opened.demo).toBe(true);
    expect(imageSize(await entryBytes(opened.file, opened.vision[0]!, 2_000_000))).toEqual({width: 10, height: 10, type: 'image/png'});
    await expect(entryBytes(opened.file, opened.vision[0]!, 5)).rejects.toThrow(/larger than ZIGoals restores/);
  });
  test('a file that is not an export, a damaged or newer one, is refused with a plain sentence', async () => {
    await expect(openBackup(new Blob(['not a zip at all, just text that is long enough']))).rejects.toThrow(/not a ZIP archive/);
    await expect(openBackup(blobOf(buildStoredZip([{name: 'other.json', data: '{}', modified: NOW}])))).rejects.toThrow(RESTORE_ERRORS.notExport);
    await expect(openBackup(zipOf({...base, format: 'something-else'}))).rejects.toThrow(RESTORE_ERRORS.notExport);
    await expect(openBackup(zipOf({...base, version: 2}))).rejects.toThrow(RESTORE_ERRORS.newer);
    await expect(openBackup(zipOf('{"format": "zigoals-everything", "vers'))).rejects.toThrow(RESTORE_ERRORS.damaged);
    await expect(openBackup(zipOf({...base, modules: []}))).rejects.toThrow(RESTORE_ERRORS.damaged);
    // One flipped byte inside everything.json: the checksum refuses it.
    const bytes = buildStoredZip([{name: 'everything.json', data: JSON.stringify(base), modified: NOW}]), at = new TextDecoder().decode(bytes).indexOf('zigoals-everything');
    bytes[at] = 'Z'.charCodeAt(0);
    await expect(openBackup(blobOf(bytes))).rejects.toThrow(/checksum/);
    await expect(openBackup({size: 401 * 1024 * 1024} as Blob)).rejects.toThrow(RESTORE_ERRORS.tooLarge);
  });
  test('only names of the export\'s own shape are taken as photos', async () => {
    const opened = await openBackup(zipOf(base, [{name: 'vision/img-x/evil.png', data: png(1, 1)}, {name: 'vision/evil.svg', data: '<svg/>'}, {name: 'vision/img-ok.png', data: png(1, 1)}, {name: 'photos/x.webp', data: 'x'}, {name: 'photos/2026-10-01-front-abcdef12.webp', data: 'y'}]));
    expect(opened.vision.map(e => e.name)).toEqual(['vision/img-ok.png']);
    expect(opened.photos.map(e => e.name)).toEqual(['photos/2026-10-01-front-abcdef12.webp']);
    expect(opened.demo).toBe(false);
  });
});
