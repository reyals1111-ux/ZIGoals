import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

vi.hoisted(() => { (globalThis as {Blob: unknown}).Blob = (process as unknown as {getBuiltinModule: (id: string) => {Blob: unknown}}).getBuiltinModule('node:buffer').Blob; });
import {MAX_TASK_ATTACHMENTS, TASK_ATTACHMENT_DB, TASK_FILES_MAX_TOTAL, putTaskAttachment} from './attachments';

/**
 * Review b5i B5I-12 (Minor): Tasks → Files counts what its list shows (no file of a removed task). B5I-13 (Minor): the
 * device's 300 count photos, voice notes and files together and a file is told so; the 100 MB of files is checked first.
 */
const AT = '2026-11-22T09:00:00.000Z';
const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(TASK_ATTACHMENT_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const photo = (taskId: string) => ({taskId, kind: 'photo' as const, blob: new Blob([new Uint8Array([1])]), type: 'image/jpeg' as const, bytes: 1, at: AT});
const file = (taskId: string, bytes = 8) => ({taskId, kind: 'file' as const, blob: new Blob([new Uint8Array(1)]), type: 'application/pdf', name: 'a.pdf', bytes, at: AT});
beforeEach(wipe);

describe('the caps speak of files', () => {
  test('with 300 photos kept, a file is refused with words about files', async () => {
    for (let i = 0; i < MAX_TASK_ATTACHMENTS; i++) await putTaskAttachment('local', `tp_${String(i).padStart(4, '0')}`, photo(`task_${i}`));
    await expect(putTaskAttachment('local', 'tf_new', file('task_x'))).rejects.toThrow(`At most ${MAX_TASK_ATTACHMENTS} photos, voice notes and files on tasks on this device. Remove one first (Tasks → Files lists the files).`);
    await expect(putTaskAttachment('local', 'tp_new', photo('task_y'))).rejects.toThrow(`At most ${MAX_TASK_ATTACHMENTS} task photos and voice notes on this device; remove one first.`);
  }, 60_000);
  test('the 100 MB of files is said first', async () => {
    await putTaskAttachment('local', 'tf_big1', file('task_a', 9_000_000));
    for (let i = 0; i < 10; i++) await putTaskAttachment('local', `tf_b${i}`, file(`task_${i}`, 9_000_000));
    await expect(putTaskAttachment('local', 'tf_more', file('task_z', 9_000_000))).rejects.toThrow(/Files on tasks keep at most 100 MB/);
    expect(TASK_FILES_MAX_TOTAL).toBe(100_000_000);
  });
  test('Tasks → Files counts only the files its list shows', () => {
    const src = readFileSync(join(__dirname, '../../components/tasks/task-files.tsx'), 'utf8');
    expect(src).toMatch(/const live = fileCounts\(kept \?\? \[\]\), used = live\.bytes;/);
    expect(src).toMatch(/\{live\.files \? `\$\{live\.files\} \$\{live\.files === 1 \? 'file' : 'files'\} on your tasks,/);
  });
});
