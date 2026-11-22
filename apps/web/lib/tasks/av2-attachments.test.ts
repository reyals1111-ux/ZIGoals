import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {
  MAX_ATTACHMENTS_PER_TASK, TASK_ATTACHMENT_DB, TASK_ATTACHMENT_ORPHAN_GRACE_DAYS, TASK_PHOTO_MAX_BYTES, clockSeconds, deleteTaskAttachment, deleteTaskAttachments,
  exportTaskAttachmentEntries, newAttachmentId, planAttachmentSweep, putTaskAttachment, sweepTaskAttachments, taskAttachmentFileName, taskAttachments, taskAttachmentsFor,
  voiceBaseType, voiceRecorderType, type TaskAttachment,
} from './attachments';

/** Session AV lane 2 (roadmap, LEDGER #8): photos and voice notes on a task, on this device only. Fictional data. */
const AT = '2026-11-22T09:00:00.000Z';
const photo = (taskId: string, bytes = 3, at = AT): TaskAttachment => ({taskId, kind: 'photo', blob: new Blob([new Uint8Array(bytes).fill(7)], {type: 'image/jpeg'}), type: 'image/jpeg', bytes, at});
const voice = (taskId: string, seconds = 7): TaskAttachment => ({taskId, kind: 'voice', blob: new Blob([new Uint8Array(5).fill(1)], {type: 'audio/webm'}), type: 'audio/webm', bytes: 5, seconds, at: '2026-11-22T10:00:00.000Z'});
beforeEach(async () => { await new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(TASK_ATTACHMENT_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }); });

describe('task attachments (IndexedDB, this device only)', () => {
  test('a photo and a voice note are kept per scope and per task, oldest first, and removed one at a time', async () => {
    expect(TASK_ATTACHMENT_DB).toBe('zigoals-task-attachments-v1');
    await putTaskAttachment('local', 'tv_1', voice('task_a'));
    await putTaskAttachment('local', 'tp_1', photo('task_a'));
    await putTaskAttachment('local', 'tp_2', photo('task_b'));
    await putTaskAttachment('acct_1', 'tp_3', photo('task_a'));
    expect((await taskAttachmentsFor('local', 'task_a')).map(a => [a.id, a.kind])).toEqual([['tp_1', 'photo'], ['tv_1', 'voice']]);
    expect((await taskAttachments('acct_1')).map(a => a.id)).toEqual(['tp_3']);
    const v = (await taskAttachmentsFor('local', 'task_a'))[1]!;
    expect(v.kind === 'voice' && v.seconds).toBe(7);
    expect(new Uint8Array(await v.blob.arrayBuffer())).toEqual(new Uint8Array(5).fill(1));
    await deleteTaskAttachment('local', 'tp_1');
    expect((await taskAttachmentsFor('local', 'task_a')).map(a => a.id)).toEqual(['tv_1']);
    expect(await deleteTaskAttachments('local')).toBe(2);
    expect(await taskAttachments('local')).toEqual([]);
    expect((await taskAttachments('acct_1')).length).toBe(1);
  });

  test('refuses what it cannot keep: too big, a wrong type, the 11th on a task, an unsafe id', async () => {
    await expect(putTaskAttachment('local', 'tp_x', photo('task_a', TASK_PHOTO_MAX_BYTES + 1))).rejects.toThrow();
    await expect(putTaskAttachment('local', 'tp_x', {...photo('task_a'), type: 'image/png'} as unknown as TaskAttachment)).rejects.toThrow();
    await expect(putTaskAttachment('local', 'tv_x', {...voice('task_a'), seconds: 600} as TaskAttachment)).rejects.toThrow();
    await expect(putTaskAttachment('local', '../x', photo('task_a'))).rejects.toThrow();
    for (let i = 0; i < MAX_ATTACHMENTS_PER_TASK; i++) await putTaskAttachment('local', `tp_${i}`, photo('task_a'));
    await expect(putTaskAttachment('local', 'tp_more', photo('task_a'))).rejects.toThrow(`A task keeps ${MAX_ATTACHMENTS_PER_TASK} photos and voice notes. Remove one first.`);
    await putTaskAttachment('local', 'tp_0', photo('task_a', 9)); // replacing one is not adding
    await putTaskAttachment('local', 'tp_other', photo('task_b'));
    expect((await taskAttachmentsFor('local', 'task_a')).length).toBe(MAX_ATTACHMENTS_PER_TASK);
  });

  test('the orphan sweep marks, unmarks when the task is back, and deletes only after the grace', async () => {
    const now = new Date('2026-11-22T12:00:00Z');
    await putTaskAttachment('local', 'tp_1', photo('task_gone'));
    await putTaskAttachment('local', 'tp_2', photo('task_live'));
    expect(await sweepTaskAttachments('local', ['task_live'], now)).toBe(0);
    expect((await taskAttachments('local')).find(a => a.id === 'tp_1')?.orphanSince).toBe(now.toISOString());
    expect((await taskAttachments('local')).find(a => a.id === 'tp_2')?.orphanSince).toBeUndefined();
    // Put back with Undo: unmarked.
    await sweepTaskAttachments('local', ['task_live', 'task_gone'], now);
    expect((await taskAttachments('local')).find(a => a.id === 'tp_1')?.orphanSince).toBeUndefined();
    await sweepTaskAttachments('local', ['task_live'], now);
    const later = new Date(now.getTime() + (TASK_ATTACHMENT_ORPHAN_GRACE_DAYS - 1) * 86_400_000);
    expect(await sweepTaskAttachments('local', ['task_live'], later)).toBe(0);
    const past = new Date(now.getTime() + TASK_ATTACHMENT_ORPHAN_GRACE_DAYS * 86_400_000);
    expect(await sweepTaskAttachments('local', ['task_live'], past)).toBe(1);
    expect((await taskAttachments('local')).map(a => a.id)).toEqual(['tp_2']);
    expect(planAttachmentSweep([], [], now)).toEqual({mark: [], unmark: [], remove: []});
  });

  test('Export everything gets every file, named by the task title, kind and id', async () => {
    await putTaskAttachment('local', 'tp_1', photo('task_a'));
    await putTaskAttachment('local', 'tv_1', voice('task_gone'));
    const now = new Date('2026-11-22T12:00:00Z');
    const files = await exportTaskAttachmentEntries('local', new Map([['task_a', 'Fix the fictional bike']]), now);
    expect(files.map(f => f.name)).toEqual(['tasks/attachments/Fix-the-fictional-bike-photo-tp_1.jpg', 'tasks/attachments/task_gone-voice-tv_1.webm']);
    expect(files[0]!.data).toEqual(new Uint8Array(3).fill(7));
    expect(files[0]!.modified).toBe(now);
    expect(taskAttachmentFileName({id: 'tv_2', taskId: 't', kind: 'voice', type: 'audio/mp4'}, '../../etc')).toBe('tasks/attachments/etc-voice-tv_2.m4a');
    expect(await exportTaskAttachmentEntries('none')).toEqual([]);
  });

  test('the recorder type, the stored container and the clock', () => {
    expect(voiceRecorderType(t => t === 'audio/mp4')).toBe('audio/mp4');
    expect(voiceRecorderType(t => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(voiceRecorderType(() => false)).toBeNull();
    expect(voiceRecorderType(() => { throw new Error('no'); })).toBeNull();
    expect(voiceBaseType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(voiceBaseType('audio/x-m4a')).toBe('audio/mp4');
    expect(voiceBaseType('video/mp4')).toBeNull();
    expect(clockSeconds(7.4)).toBe('0:07');
    expect(clockSeconds(60)).toBe('1:00');
    expect(newAttachmentId('photo')).toMatch(/^tp_[0-9a-f]{16}$/);
    expect(newAttachmentId('voice')).toMatch(/^tv_[0-9a-f]{16}$/);
  });
});
