// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// jsdom's Blob cannot pass through IndexedDB's structured clone; Node's can (and is what the stores' tests use). Set
// before any store module loads, so `z.instanceof(Blob)` in their schemas is this one.
vi.hoisted(() => { (globalThis as {Blob: unknown}).Blob = (process as unknown as {getBuiltinModule: (id: string) => {Blob: unknown}}).getBuiltinModule('node:buffer').Blob; });

import {buildEverythingExport, JOURNAL_MEDIA_EXPORT_NOTE} from '../export/make-everything';
import {TASKS_KEY, tasksSchema} from '../tasks/schema';
import {JOURNAL_KEY, journalSchema} from '../journal/schema';
import {NOTES_KEY, notesSchema} from '../notes/schema';
import {TASK_ATTACHMENT_DB, TASK_PHOTO_MAX_BYTES, putTaskAttachment, taskAttachments} from '../tasks/attachments';
import {JOURNAL_MEDIA_DB, getJournalMedia, journalMediaIds, putJournalMedia} from '../journal/media';
import {NOTE_PHOTO_DB, getNotePhoto, notePhotoIds, putNotePhoto} from '../notes/photos';
import {MONEY_PHOTO_DB} from '../money-photos/store';
import {MEAL_PHOTO_DB} from '../meal-estimates/photos';
import {FOOD_PHOTO_DB} from '../food-plus/photos';
import {WORKOUT_PHOTO_DB} from '../workouts/photos';
import {WEALTH_DOCS_DB} from '../wealth-sheet/docs';
import {buildStoredZip} from '../export/zip';
import {MEDIA_ENTRY, RESTORE_MEDIA_DBS, RESTORE_MEDIA_STORES} from './media-dbs';
import {bytesMatch, indexMedia, mediaTarget, planMedia} from './media';
import {planParts, type PlannedPart} from './plan';
import {openBackup, type OpenedBackup} from './read-backup';
import * as first from './apply';
import {MEDIA_RESTORE_NOTE, mediaChoiceLabel, mediaLeftNote, mediaOutcomeText, notRestoredNote} from '../../components/restore/restore-backup';

/**
 * Session AV lane 2 (review b1 #18): Restore puts the tasks', journal's and notes' photos and voice notes back into their
 * IndexedDB stores, by the ids their records keep, never over one already here, and its Undo removes exactly those.
 * Export → erase → restore runs the real Export everything. Fictional data only.
 */
const AT = '2026-11-20T09:00:00.000Z';
const TASK_PHOTO = 'tp_0123456789abcdef', TASK_VOICE = 'tv_fedcba9876543210';
function jpeg(w = 64, h = 48) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}
const u24 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255];
const webp = (w = 64, h = 48) => new Uint8Array([...'RIFF'].map(c => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBPVP8X'].map(c => c.charCodeAt(0)), [10, 0, 0, 0, 0, 0, 0, 0, ...u24(w - 1), ...u24(h - 1)], new Array(16).fill(0)));
const webm = () => new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 1, 2, 3]);
const blob = (bytes: Uint8Array, type: string) => new Blob([bytes as Uint8Array<ArrayBuffer>], {type});
const bytesOf = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())];
const wipe = (db: string) => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(db); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const wipeAll = () => Promise.all(RESTORE_MEDIA_DBS.map(wipe));
const part = (parts: PlannedPart[], id: string) => parts.find(p => p.id === id)!;
async function reload(): Promise<typeof first> { vi.resetModules(); return import('./apply'); }

const tasks = tasksSchema.parse({version: 1, tasks: [{id: 'task_a', title: 'Call the plumber', priority: 'normal', createdAt: AT}]});
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'j-walk01', date: '2026-11-19', text: 'A fictional walk by the sea.', createdAt: AT, photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 3}]}]});
const notes = notesSchema.parse({version: 1, voice: false, notes: [{id: 'n_1', kind: 'topic', title: 'Garden', body: 'A fictional plan.', photoId: 'np_garden01', createdAt: AT}]});
/** This device before the export: the three records and their five files. */
async function fill() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  await putTaskAttachment('local', TASK_PHOTO, {taskId: 'task_a', kind: 'photo', blob: blob(jpeg(), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg().length, at: AT});
  await putTaskAttachment('local', TASK_VOICE, {taskId: 'task_a', kind: 'voice', blob: blob(webm(), 'audio/webm'), type: 'audio/webm', bytes: webm().length, seconds: 7, at: AT});
  await putJournalMedia('local', 'm-photo0001', {kind: 'photo', blob: blob(webp(), 'image/webp'), type: 'image/webp', bytes: webp().length, at: AT});
  await putJournalMedia('local', 'm-audio0001', {kind: 'audio', blob: blob(webm(), 'audio/webm'), type: 'audio/webm', bytes: webm().length, seconds: 3, at: AT});
  await putNotePhoto('local', 'np_garden01', {blob: blob(jpeg(80, 60), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg(80, 60).length, at: AT});
}
/** Export everything as Settings makes it, then erase: this browser's storage and every media database are empty. */
async function exportThenErase(): Promise<OpenedBackup> {
  await fill();
  const {bytes, notes: said} = await buildEverythingExport();
  expect(said).toContain(JOURNAL_MEDIA_EXPORT_NOTE);
  localStorage.clear(); await wipeAll();
  return openBackup(new Blob([bytes as Uint8Array<ArrayBuffer>]));
}
const restoreRecords = (opened: OpenedBackup, apply: typeof first = first) => {
  const parts = planParts(opened.json);
  return apply.applyRestore(opened, ['device:tasks', 'device:journal', 'device:notes'].map(id => ({part: part(parts, id), mode: 'replace' as const})), {vision: false, progress: false, media: true});
};

Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(async () => { localStorage.clear(); first.forgetRestoreUndo(); await wipeAll(); });
afterEach(() => { localStorage.clear(); first.forgetRestoreUndo(); });

describe('export → erase → restore brings the files back', () => {
  test('a task photo and voice note, a journal photo and audio note, and a note photo, under their own ids and bytes', async () => {
    const opened = await exportThenErase();
    expect(opened.media?.map(e => e.name).sort()).toEqual(['journal/audios/m-audio0001.webm', 'journal/photos/m-photo0001.webp', 'notes/photos/np_garden01.jpg', `tasks/attachments/Call-the-plumber-photo-${TASK_PHOTO}.jpg`, `tasks/attachments/Call-the-plumber-voice-${TASK_VOICE}.webm`]);
    expect(opened.notRestored).toBe(0);
    // The preview, before anything changes: all five named by the file's records.
    const plan = await first.mediaPreview(opened, localStorage);
    expect(plan).toEqual({back: {tasks: 2, journal: 2, notes: 1}, total: 5, unnamed: 0, oversize: 0, canKeep: true});
    expect(mediaChoiceLabel(plan)).toBe('Add the missing photos, voice notes and documents (5 in the file: 2 on tasks, 2 in the journal, 1 on notes)');
    expect(mediaLeftNote(plan)).toBeNull();

    const outcome = await restoreRecords(opened);
    expect(outcome.restored).toEqual(['Tasks', 'Journal', 'Notes']);
    expect(outcome.media).toEqual({added: 5, present: 0, unnamed: 0, skipped: 0, closed: 0});
    expect(mediaOutcomeText(outcome.media!)).toBe('Photos, voice notes and documents put back: 5.');
    expect(outcome).toMatchObject({undoable: true, undoAfterReload: true});
    const kept = await taskAttachments('local');
    expect(kept.map(a => [a.id, a.taskId, a.kind, a.type, a.bytes, a.at])).toEqual([
      [TASK_PHOTO, 'task_a', 'photo', 'image/jpeg', jpeg().length, expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)],
      [TASK_VOICE, 'task_a', 'voice', 'audio/webm', webm().length, expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)]]);
    expect(await bytesOf(kept[0]!.blob)).toEqual([...jpeg()]);
    const photo = await getJournalMedia('local', 'm-photo0001'), audio = await getJournalMedia('local', 'm-audio0001');
    expect(photo).toMatchObject({kind: 'photo', type: 'image/webp', bytes: webp().length});
    expect(audio).toMatchObject({kind: 'audio', type: 'audio/webm', seconds: 3}); // the entry's own length
    expect(await bytesOf(audio!.blob)).toEqual([...webm()]);
    expect(await bytesOf((await getNotePhoto('local', 'np_garden01'))!.blob)).toEqual([...jpeg(80, 60)]);
    // The undo record names exactly the ids added, per database, in this scope.
    const record = first.restoreUndoSchema.parse(JSON.parse(localStorage.getItem(first.RESTORE_UNDO_KEY)!));
    const media = record.steps.flatMap(s => s.kind === 'media' ? [{...s, ids: [...s.ids].sort()}] : []).sort((a, b) => a.db.localeCompare(b.db));
    expect(media).toEqual([
      {kind: 'media', db: JOURNAL_MEDIA_DB, scope: 'local', ids: ['m-audio0001', 'm-photo0001']},
      {kind: 'media', db: NOTE_PHOTO_DB, scope: 'local', ids: ['np_garden01']},
      {kind: 'media', db: TASK_ATTACHMENT_DB, scope: 'local', ids: [TASK_PHOTO, TASK_VOICE]}]);
  });

  test('without the choice nothing is put back; a file whose record is not on this device stays in the ZIP and is counted', async () => {
    const opened = await exportThenErase(), parts = planParts(opened.json);
    const none = await first.applyRestore(opened, [{part: part(parts, 'device:tasks'), mode: 'replace'}], {vision: false, progress: false});
    expect(none.media).toBeUndefined();
    expect(await taskAttachments('local')).toEqual([]);
    first.forgetRestoreUndo(); localStorage.clear();
    // Only Tasks comes back: the journal's and the note's files have no record on this device.
    const some = await first.applyRestore(opened, [{part: part(parts, 'device:tasks'), mode: 'replace'}], {vision: false, progress: false, media: true});
    expect(some.media).toEqual({added: 2, present: 0, unnamed: 3, skipped: 0, closed: 0});
    expect(mediaOutcomeText(some.media!)).toBe('Photos, voice notes and documents put back: 2. Not added: 3 that no record on this device names (restore its part, then restore again).');
    expect(await journalMediaIds('local')).toEqual([]);
  });
});

describe('never overwrites, and Undo removes only what it added', () => {
  test('an id this browser already holds is left as it is and counted; Undo, also after a reload, deletes exactly the added ids', async () => {
    const opened = await exportThenErase();
    // Already here before the restore: a different photo under the same id, and one the backup does not hold.
    const mine = webp(32, 32);
    await putJournalMedia('local', 'm-photo0001', {kind: 'photo', blob: blob(mine, 'image/webp'), type: 'image/webp', bytes: mine.length, at: AT});
    await putNotePhoto('local', 'np_other01', {blob: blob(jpeg(), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg().length, at: AT});
    const outcome = await restoreRecords(opened);
    expect(outcome.media).toEqual({added: 4, present: 1, unnamed: 0, skipped: 0, closed: 0});
    expect(await bytesOf((await getJournalMedia('local', 'm-photo0001'))!.blob)).toEqual([...mine]);
    // Added after the restore: also not the restore's to remove.
    await putJournalMedia('local', 'm-later0001', {kind: 'photo', blob: blob(webp(), 'image/webp'), type: 'image/webp', bytes: webp().length, at: AT});
    const fresh = await reload();
    expect(await fresh.restoreUndoStatus()).toMatchObject({available: true, afterReload: true});
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect((await journalMediaIds('local')).sort()).toEqual(['m-later0001', 'm-photo0001']);
    expect(await bytesOf((await getJournalMedia('local', 'm-photo0001'))!.blob)).toEqual([...mine]);
    expect(await notePhotoIds('local')).toEqual(['np_other01']);
    expect(await taskAttachments('local')).toEqual([]);
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
  });

  test('another scope (an account) is untouched: the files come back to this scope only', async () => {
    const opened = await exportThenErase();
    await putNotePhoto('acct_other', 'np_garden01', {blob: blob(jpeg(), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg().length, at: AT});
    expect((await restoreRecords(opened)).media?.added).toBe(5);
    expect(await notePhotoIds('acct_other')).toEqual(['np_garden01']);
    await first.undoRestore();
    expect(await notePhotoIds('acct_other')).toEqual(['np_garden01']);
  });
});

describe('broken, oversize and unopenable', () => {
  const NOW = new Date(AT);
  const zipWith = (files: {name: string; data: Uint8Array}[]) => openBackup(new Blob([buildStoredZip([{name: 'everything.json', data: JSON.stringify({format: 'zigoals-everything', version: 1, exportedAt: AT, modules: {}, device: {journal, notes, tasks}, unreadable: []}), modified: NOW}, ...files.map(f => ({...f, modified: NOW}))]) as Uint8Array<ArrayBuffer>]));
  test('a file whose bytes are not what its name says, and one over its store’s size, are skipped and counted; the rest come back', async () => {
    const opened = await zipWith([
      {name: 'journal/photos/m-photo0001.webp', data: new Uint8Array(40).fill(7)}, // not a WebP
      {name: `tasks/attachments/Call-the-plumber-photo-${TASK_PHOTO}.jpg`, data: new Uint8Array(TASK_PHOTO_MAX_BYTES + 1)}, // over a task photo's 200 kB
      {name: 'journal/audios/m-audio0001.webm', data: webm()},
      {name: 'notes/photos/np_nobody01.jpg', data: jpeg()}, // no note names it
    ]);
    const plan = await first.mediaPreview(opened, localStorage);
    expect(plan).toEqual({back: {journal: 2}, total: 2, unnamed: 1, oversize: 1, canKeep: true});
    expect(mediaLeftNote(plan)).toBe('Not put back: 1 that no task, journal entry, note or other record names, and 1 larger than ZIGoals keeps. They stay in the ZIP to open yourself.');
    const parts = planParts(opened.json);
    const outcome = await first.applyRestore(opened, [{part: part(parts, 'device:journal'), mode: 'replace'}, {part: part(parts, 'device:tasks'), mode: 'replace'}], {vision: false, progress: false, media: true});
    expect(outcome.media).toEqual({added: 1, present: 0, unnamed: 1, skipped: 2, closed: 0});
    expect(await journalMediaIds('local')).toEqual(['m-audio0001']);
  });

  test('a store this browser cannot open (a newer build moved its database on) is counted and never touched', async () => {
    await new Promise<void>((resolve, reject) => { const r = indexedDB.open(NOTE_PHOTO_DB, 2); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => { r.result.close(); resolve(); }; r.onerror = () => reject(r.error); });
    const opened = await zipWith([{name: 'notes/photos/np_garden01.jpg', data: jpeg()}, {name: 'journal/audios/m-audio0001.webm', data: webm()}]);
    const parts = planParts(opened.json);
    const outcome = await first.applyRestore(opened, [{part: part(parts, 'device:notes'), mode: 'replace'}, {part: part(parts, 'device:journal'), mode: 'replace'}], {vision: false, progress: false, media: true});
    expect(outcome.media).toEqual({added: 1, present: 0, unnamed: 0, skipped: 0, closed: 1});
    expect(mediaOutcomeText(outcome.media!)).toBe('Photos, voice notes and documents put back: 1. Not added: 1 whose store this browser could not open.');
  });

  test('bytes checks: photo headers, recording containers and PDFs', () => {
    expect(bytesMatch(jpeg(), 'image/jpeg')).toBe(true);
    expect(bytesMatch(jpeg(), 'image/webp')).toBe(false);
    expect(bytesMatch(webp(), 'image/webp')).toBe(true);
    expect(bytesMatch(jpeg(20_000, 20_000), 'image/jpeg')).toBe(false); // over the image caps
    expect(bytesMatch(webm(), 'audio/webm')).toBe(true);
    expect(bytesMatch(new TextEncoder().encode('OggS....'), 'audio/ogg')).toBe(true);
    expect(bytesMatch(new TextEncoder().encode('\0\0\0\u0018ftypM4A '), 'audio/mp4')).toBe(true);
    expect(bytesMatch(new TextEncoder().encode('%PDF-1.7'), 'application/pdf')).toBe(true);
    expect(bytesMatch(new Uint8Array(12), 'audio/webm')).toBe(false);
  });
});

describe('names and places', () => {
  test('the databases a restore may write are the stores’ own, each with its one object store', () => {
    // Session AV lane 2, round 5 (deliberate: the workout photos' database, pinned in its place, LEDGER #377).
    expect(RESTORE_MEDIA_DBS).toEqual([TASK_ATTACHMENT_DB, JOURNAL_MEDIA_DB, NOTE_PHOTO_DB, MONEY_PHOTO_DB, MEAL_PHOTO_DB, FOOD_PHOTO_DB, WORKOUT_PHOTO_DB, WEALTH_DOCS_DB]);
    expect(Object.values(RESTORE_MEDIA_STORES)).toEqual(['items', 'media', 'photos', 'photos', 'photos', 'photos', 'photos', 'docs']);
  });

  test('receipts, meals, foods and account documents are found by the ids their records keep; two tasks titled alike are not guessed', () => {
    const index = indexMedia({
      moneyLog: {entries: [{id: 'e_coffee01', date: '2026-11-19'}]}, mealEstimates: {version: 1, foods: {f_soup01: {}}},
      health: {foods: [{id: 'f_oats01'}]}, accounts: {version: 1, items: [{id: '0a1b2c3d-0000'}]},
      tasks: {tasks: [{id: 't1', title: 'Shop'}, {id: 't2', title: 'Shop!'}, {id: 't3', title: 'Bake'}]},
    });
    expect(mediaTarget('money-photos/2026-11-19-e_coffee01.jpg', index)).toMatchObject({store: 'receipts', id: 'e_coffee01', type: 'image/jpeg'});
    expect(mediaTarget('money-photos/e_coffee01.webp', index)).toMatchObject({store: 'receipts', id: 'e_coffee01', type: 'image/webp'});
    expect(mediaTarget([...index.byName.keys()].find(n => n.startsWith('meal-photos/f_soup01-') && n.endsWith('.webp'))!, index)).toMatchObject({store: 'meals', id: 'f_soup01'});
    expect(mediaTarget([...index.byName.keys()].find(n => n.startsWith('food-photos/f_oats01-') && n.endsWith('.jpg'))!, index)).toMatchObject({store: 'foods', id: 'f_oats01'});
    expect(mediaTarget('wealth-docs/0a1b2c3d-0000/doc_1a2b3c4d-5e6-Bank_statement.pdf', index)).toMatchObject({store: 'wealth', id: '0a1b2c3d-0000:doc_1a2b3c4d-5e6', type: 'application/pdf', name: 'Bank statement'});
    expect(mediaTarget('wealth-docs/ffffffff-0000/doc_1a2b3c4d-5e6-Bank_statement.pdf', index)).toBeNull(); // no such account here
    expect(mediaTarget('tasks/attachments/Shop-photo-tp_aaaaaaaaaaaaaaaa.jpg', index)).toBeNull(); // "Shop" and "Shop!" read alike
    expect(mediaTarget('tasks/attachments/Bake-voice-tv_bbbbbbbbbbbbbbbb.m4a', index)).toMatchObject({store: 'tasks', id: 'tv_bbbbbbbbbbbbbbbb', taskId: 't3', kind: 'audio', type: 'audio/mp4'});
    expect(mediaTarget('tasks/attachments/Bake-voice-tv_bbbbbbbbbbbbbbbb.jpg', index)).toBeNull(); // a voice note is not a photo
    expect(MEDIA_ENTRY.test('journal/photos/m-photo0001.jpeg') && MEDIA_ENTRY.test('wealth-docs/0a1b2c3d-0000/doc_1a2b3c4d-5e6-x.pdf') && !MEDIA_ENTRY.test('journal/photos/../x.webp')).toBe(true);
  });

  test('a browser that cannot keep them says so; the other notes read plainly', () => {
    expect(mediaLeftNote({back: {tasks: 1}, total: 1, unnamed: 1, oversize: 0, canKeep: false})).toBe('This browser cannot keep photos or voice notes (its storage for them is off, as in some private windows), so the 2 files of tasks, the journal and notes in this backup stay in the ZIP to open yourself.');
    expect(planMedia({media: []})).toMatchObject({total: 0, unnamed: 0});
    expect(notRestoredNote(1)).toBe('This file also holds 1 photo or recording in folders Restore does not read, so it stays in the ZIP to open yourself.');
    expect(MEDIA_RESTORE_NOTE).toContain('Undo removes only the ones this restore added');
  });
});
