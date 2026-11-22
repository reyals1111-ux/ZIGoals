// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// jsdom's Blob cannot pass through IndexedDB's structured clone; Node's can (as in av2-restore-media.test.ts).
vi.hoisted(() => { (globalThis as {Blob: unknown}).Blob = (process as unknown as {getBuiltinModule: (id: string) => {Blob: unknown}}).getBuiltinModule('node:buffer').Blob; });

import {buildEverythingExport} from '../export/make-everything';
import {TASKS_KEY, tasksSchema} from '../tasks/schema';
import {NOTES_KEY, notesSchema} from '../notes/schema';
import {putTaskAttachment, taskAttachments} from '../tasks/attachments';
import {getNotePhoto, putNotePhoto} from '../notes/photos';
import {RESTORE_MEDIA_DBS} from './media-dbs';
import {fileBytesMatch, taskFileType} from './media';
import {planParts, type PlannedPart} from './plan';
import {openBackup, type OpenedBackup} from './read-backup';
import * as apply from './apply';

/**
 * Session AV lane 2 (r5-notes; LEDGER #360, #355): Export everything carries the photos of notes in Recently deleted and
 * the files on tasks, and Restore puts them back under their own ids — a task file with its name, type and bytes — never
 * over an id this browser already holds; a file whose bytes are not what its name says is skipped and counted.
 * Fictional data only.
 */
const AT = '2026-11-20T09:00:00.000Z', PDF_ID = 'tf_0123456789abcdef', BAD_ID = 'tf_fedcba9876543210';
function jpeg(w = 64, h = 48) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, 0xff, 0xd9]);
}
const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const blob = (bytes: Uint8Array, type: string) => new Blob([bytes as Uint8Array<ArrayBuffer>], {type});
const bytesOf = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())];
const wipe = (db: string) => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(db); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const wipeAll = () => Promise.all(RESTORE_MEDIA_DBS.map(wipe));
const part = (parts: PlannedPart[], id: string) => parts.find(p => p.id === id)!;

const tasks = tasksSchema.parse({version: 1, tasks: [{id: 'task_a', title: 'Book the train', priority: 'normal', createdAt: AT}]});
const notes = notesSchema.parse({version: 1, voice: false, notes: [{id: 'n_1', kind: 'topic', title: 'Kept', body: 'A fictional note.', createdAt: AT}],
  trash: [{id: 'n_gone', kind: 'topic', title: 'Fictional old plan', body: 'Gone.', photoId: 'np_trash01', createdAt: AT, deletedAt: AT}]});
async function exportThenErase(): Promise<OpenedBackup> {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  await putNotePhoto('local', 'np_trash01', {blob: blob(jpeg(80, 60), 'image/jpeg'), type: 'image/jpeg', bytes: jpeg(80, 60).length, at: AT});
  await putTaskAttachment('local', PDF_ID, {taskId: 'task_a', kind: 'file', blob: blob(PDF, 'application/pdf'), type: 'application/pdf', name: 'Train ticket.PDF', bytes: PDF.length, at: AT});
  const fake = new TextEncoder().encode('not a pdf at all');
  await putTaskAttachment('local', BAD_ID, {taskId: 'task_a', kind: 'file', blob: blob(fake, 'application/pdf'), type: 'application/pdf', name: 'Broken.pdf', bytes: fake.length, at: AT});
  const {bytes} = await buildEverythingExport();
  localStorage.clear(); await wipeAll();
  return openBackup(new Blob([bytes as Uint8Array<ArrayBuffer>]));
}
const restore = (opened: OpenedBackup) => {
  const parts = planParts(opened.json);
  return apply.applyRestore(opened, ['device:tasks', 'device:notes'].map(id => ({part: part(parts, id), mode: 'replace' as const})), {vision: false, progress: false, media: true});
};

Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(async () => { localStorage.clear(); apply.forgetRestoreUndo(); await wipeAll(); });
afterEach(() => { localStorage.clear(); apply.forgetRestoreUndo(); });

describe('Recently deleted photos and task files: export → erase → restore', () => {
  test('a trashed note’s photo and a task’s PDF come back under their ids; a file that is not what its name says is skipped and counted', async () => {
    const opened = await exportThenErase();
    expect(opened.media?.map(e => e.name).sort()).toEqual(['notes/photos/np_trash01.jpg', `tasks/attachments/Book-the-train-file-${PDF_ID}-Train-ticket.pdf`, `tasks/attachments/Book-the-train-file-${BAD_ID}-Broken.pdf`]);
    const outcome = await restore(opened);
    expect(outcome.media).toEqual({added: 2, present: 0, unnamed: 0, skipped: 1, closed: 0});
    expect(await bytesOf((await getNotePhoto('local', 'np_trash01'))!.blob)).toEqual([...jpeg(80, 60)]);
    const kept = await taskAttachments('local');
    expect(kept.map(a => [a.id, a.taskId, a.kind, a.type, a.kind === 'file' ? a.name : '', a.bytes])).toEqual([[PDF_ID, 'task_a', 'file', 'application/pdf', 'Train ticket.pdf', PDF.length]]);
    expect(await bytesOf(kept[0]!.blob)).toEqual([...PDF]);
    const record = apply.restoreUndoSchema.parse(JSON.parse(localStorage.getItem(apply.RESTORE_UNDO_KEY)!));
    expect(record.steps.flatMap(s => s.kind === 'media' ? s.ids : []).sort()).toEqual(['np_trash01', PDF_ID]);
  });
  test('an id this browser already holds is never overwritten', async () => {
    const opened = await exportThenErase();
    const mine = new TextEncoder().encode('%PDF-1.7 my own fictional file');
    await putTaskAttachment('local', PDF_ID, {taskId: 'task_a', kind: 'file', blob: blob(mine, 'application/pdf'), type: 'application/pdf', name: 'Mine.pdf', bytes: mine.length, at: AT});
    const outcome = await restore(opened);
    expect(outcome.media).toEqual({added: 1, present: 1, unnamed: 0, skipped: 1, closed: 0});
    const kept = await taskAttachments('local');
    expect(kept.map(a => a.kind === 'file' ? a.name : '')).toEqual(['Mine.pdf']);
    expect(await bytesOf(kept[0]!.blob)).toEqual([...mine]);
  });
  test('a file’s type comes from its name; only what the name claims is checked', () => {
    expect(taskFileType('PDF')).toBe('application/pdf'); expect(taskFileType('docx')).toBe('application/octet-stream'); expect(taskFileType('csv')).toBe('text/plain');
    expect(fileBytesMatch(PDF, 'application/pdf')).toBe(true); expect(fileBytesMatch(new TextEncoder().encode('x'), 'application/pdf')).toBe(false);
    expect(fileBytesMatch(jpeg(), 'image/jpeg')).toBe(true); expect(fileBytesMatch(new TextEncoder().encode('x'), 'image/png')).toBe(false);
    expect(fileBytesMatch(new TextEncoder().encode('PK any bytes'), 'application/octet-stream')).toBe(true);
    expect(fileBytesMatch(new Uint8Array(), 'application/octet-stream')).toBe(false);
  });
});
