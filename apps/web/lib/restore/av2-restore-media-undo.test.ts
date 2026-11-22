// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// jsdom's Blob cannot pass through IndexedDB's structured clone; Node's can. Set before any store module loads.
vi.hoisted(() => { (globalThis as {Blob: unknown}).Blob = (process as unknown as {getBuiltinModule: (id: string) => {Blob: unknown}}).getBuiltinModule('node:buffer').Blob; });

import {TASKS_KEY, tasksSchema} from '../tasks/schema';
import {NOTE_PHOTO_DB, notePhotoIds, putNotePhoto} from '../notes/photos';
import {JOURNAL_MEDIA_DB, journalMediaIds, putJournalMedia} from '../journal/media';
import {RESTORE_MEDIA_DBS, anyMediaLeft, mediaIds, removeMedia} from './media-dbs';
import * as first from './apply';

/**
 * Session AV lane 2 (review b1 #18; TIER 3 (stored formats), additive): the restore's undo record gains a `media` step
 * ({db, scope, ids}). A record an earlier build wrote still reads; a step kind this build does not know makes the record
 * unread, as before; a media step's Undo deletes exactly the ids it names, in its scope. Fictional data only.
 */
const AT = '2026-11-20T09:00:00.000Z';
const photo = () => ({blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {type: 'image/jpeg'}), type: 'image/jpeg' as const, bytes: 4, at: AT});
const wipe = (db: string) => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(db); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
async function reload(): Promise<typeof first> { vi.resetModules(); return import('./apply'); }
const tasks = tasksSchema.parse({version: 1, tasks: [{id: 'task_a', title: 'Call the plumber', priority: 'normal', createdAt: AT}]});
const window7 = () => ({at: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString()});

Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(async () => { localStorage.clear(); first.forgetRestoreUndo(); await Promise.all(RESTORE_MEDIA_DBS.map(wipe)); });
afterEach(() => { localStorage.clear(); first.forgetRestoreUndo(); });

describe('the media step of the undo record', () => {
  test('Undo, also after a reload, deletes exactly the ids a media step names, in its scope; while one is left it is offered', async () => {
    await putNotePhoto('local', 'np_added01', photo()); await putNotePhoto('local', 'np_mine001', photo()); await putNotePhoto('acct_1', 'np_added01', photo());
    await putJournalMedia('local', 'm-added0001', {kind: 'photo', ...photo(), type: 'image/jpeg'});
    const {at, expiresAt} = window7();
    localStorage.setItem(first.RESTORE_UNDO_KEY, JSON.stringify({version: 1, at, expiresAt, steps: [{kind: 'media', db: NOTE_PHOTO_DB, scope: 'local', ids: ['np_added01', 'np_gone0001']}, {kind: 'media', db: JOURNAL_MEDIA_DB, scope: 'local', ids: ['m-added0001']}]}));
    const fresh = await reload();
    expect(await fresh.restoreUndoStatus()).toEqual({available: true, afterReload: true, at});
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(await notePhotoIds('local')).toEqual(['np_mine001']);
    expect(await notePhotoIds('acct_1')).toEqual(['np_added01']);
    expect(await journalMediaIds('local')).toEqual([]);
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
  });

  test('once nothing a media step added is left, the record is removed and no Undo is offered', async () => {
    const {at, expiresAt} = window7();
    localStorage.setItem(first.RESTORE_UNDO_KEY, JSON.stringify({version: 1, at, expiresAt, steps: [{kind: 'media', db: NOTE_PHOTO_DB, scope: 'local', ids: ['np_gone0001']}]}));
    const fresh = await reload();
    expect(await fresh.restoreUndoStatus()).toEqual({available: false, afterReload: false, at: null});
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
  });

  test('the reader and deleter: every key of the scope, whether its value reads or not; nothing else', async () => {
    await putNotePhoto('local', 'np_a', photo()); await putNotePhoto('local', 'np_b', photo()); await putNotePhoto('local2', 'np_a', photo());
    expect([...await mediaIds(NOTE_PHOTO_DB, 'local')].sort()).toEqual(['np_a', 'np_b']);
    expect(await anyMediaLeft(NOTE_PHOTO_DB, 'local', ['np_x', 'np_b'])).toBe(true);
    await removeMedia(NOTE_PHOTO_DB, 'local', ['np_b', 'np_x']);
    expect([...await mediaIds(NOTE_PHOTO_DB, 'local')]).toEqual(['np_a']);
    expect([...await mediaIds(NOTE_PHOTO_DB, 'local2')]).toEqual(['np_a']);
    expect(await anyMediaLeft(NOTE_PHOTO_DB, 'local', ['np_b'])).toBe(false);
  });
});

describe('the undo record stays readable both ways', () => {
  test('a record an earlier build wrote (no media step) still reads and undoes', async () => {
    const before = JSON.stringify(tasks), after = JSON.stringify({...tasks, tasks: []});
    localStorage.setItem(TASKS_KEY, after);
    const digest = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const at = new Date().toISOString(), until = new Date(Date.now() + 86_400_000).toISOString();
    localStorage.setItem(first.RESTORE_UNDO_KEY, JSON.stringify({version: 1, at, expiresAt: until, steps: [{kind: 'device', key: TASKS_KEY, label: 'Tasks', before, after: await digest(after)}, {kind: 'vision', scope: 'local', ids: ['img-x']}]}));
    const fresh = await reload();
    expect(await fresh.restoreUndoStatus()).toEqual({available: true, afterReload: true, at});
    expect(await fresh.undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(localStorage.getItem(TASKS_KEY)).toBe(before);
  });

  test('a step kind from a newer build makes the record unread: no Undo offered, the record removed, nothing else touched', async () => {
    const at = new Date().toISOString(), until = new Date(Date.now() + 86_400_000).toISOString();
    await putNotePhoto('local', 'np_garden01', photo());
    localStorage.setItem(first.RESTORE_UNDO_KEY, JSON.stringify({version: 1, at, expiresAt: until, steps: [{kind: 'media', db: NOTE_PHOTO_DB, scope: 'local', ids: ['np_garden01']}, {kind: 'future', scope: 'local', ids: ['x']}]}));
    const fresh = await reload();
    expect(fresh.canUndoRestore()).toBe(false);
    expect(await fresh.restoreUndoStatus()).toEqual({available: false, afterReload: false, at: null});
    expect(localStorage.getItem(fresh.RESTORE_UNDO_KEY)).toBeNull();
    expect(await notePhotoIds('local')).toEqual(['np_garden01']);
    // A media step naming a database a restore never writes is refused the same way.
    expect(fresh.restoreUndoSchema.safeParse({version: 1, at, expiresAt: until, steps: [{kind: 'media', db: 'zigoals-progress-photos', scope: 'local', ids: ['a']}]}).success).toBe(false);
  });
});
