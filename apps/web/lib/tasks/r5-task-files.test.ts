import {describe, expect, test} from 'vitest';
import * as z from 'zod';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {TASK_FILE_MAX_BYTES, attachmentCounts, fileCounts, cleanFileName, newAttachmentId, openWay, sizeWords, taskAttachmentFileName, taskAttachmentValueSchema} from './attachments';

/**
 * Session AV lane 2 (r5-notes; LEDGER #355, Akiflow's files on a task; TIER 3 (stored format), a third kind in the same
 * store): a file kept with its name and type under the caps; it opens only the safe way (the browser's viewer for PDF,
 * pictures, text, sound and film; anything else saved, never shown as a page of this site); older builds skip the kind.
 */
const AT = '2026-11-22T09:00:00.000Z';
const file = (over: Record<string, unknown> = {}) => ({taskId: 'task_1', kind: 'file', blob: new Blob(['%PDF-1.7']), type: 'application/pdf', name: 'Ticket.pdf', bytes: 8, at: AT, ...over});
describe('a file on a task', () => {
  test('kept with its name and type, under 10 MB', () => {
    expect(taskAttachmentValueSchema.safeParse(file()).success).toBe(true);
    expect(taskAttachmentValueSchema.safeParse(file({bytes: TASK_FILE_MAX_BYTES + 1})).success).toBe(false);
    expect(taskAttachmentValueSchema.safeParse(file({name: ''})).success).toBe(false);
    expect(newAttachmentId('file')).toMatch(/^tf_[a-f0-9]{16}$/);
  });
  test('an older build’s reader (photo and voice only) skips it, so its sweep never touches it', () => {
    const older = z.discriminatedUnion('kind', [z.object({kind: z.literal('photo')}).loose(), z.object({kind: z.literal('voice')}).loose()]);
    expect(older.safeParse(file()).success).toBe(false);
  });
  test('opens the safe way: viewer for PDF, pictures, text, sound and film; HTML, SVG and the rest are saved', () => {
    expect(openWay('application/pdf', 'Ticket.pdf')).toEqual({way: 'view', type: 'application/pdf'});
    expect(openWay('image/png', 'a.png')).toEqual({way: 'view', type: 'image/png'});
    expect(openWay('text/html', 'notes.txt')).toEqual({way: 'view', type: 'text/plain;charset=utf-8'});
    expect(openWay('text/csv', 'list.csv')).toEqual({way: 'view', type: 'text/plain;charset=utf-8'});
    for (const [t, n] of [['text/html', 'page.html'], ['image/svg+xml', 'logo.svg'], ['application/xhtml+xml', 'a.xhtml'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Letter.docx'], ['', 'unknown'], ['application/javascript', 'x.js']]) expect(openWay(t!, n!), n).toEqual({way: 'save'});
  });
  test('names kept plain; sizes in words; counted apart; named in Export everything after its id', () => {
    expect(cleanFileName('C:\\Users\\me\\Train <ticket>.pdf')).toBe('Train ticket .pdf');
    expect(cleanFileName('a'.repeat(200) + '.pdf')).toMatch(/^a+….pdf$/);
    expect(cleanFileName('a'.repeat(200) + '.pdf').length).toBeLessThanOrEqual(120);
    expect(sizeWords(820_000)).toBe('820 kB'); expect(sizeWords(4_200_000)).toBe('4.2 MB'); expect(sizeWords(100_000_000)).toBe('100 MB');
    expect(attachmentCounts([{taskId: 'a', kind: 'file'}, {taskId: 'c', kind: 'file'}, {taskId: 'a', kind: 'photo'}])).toEqual({photos: 1, voice: 0, tasks: 1});
    expect(fileCounts([{taskId: 'a', kind: 'file', bytes: 10}, {taskId: 'a', kind: 'photo', bytes: 5}, {taskId: 'b', kind: 'file', orphanSince: AT, bytes: 7}])).toEqual({files: 1, tasks: 1, bytes: 10});
    expect(taskAttachmentFileName({id: 'tf_ab12', taskId: 'task_1', kind: 'file', type: 'application/pdf', name: 'Train ticket.PDF'}, 'Trip to Ghent')).toBe('tasks/attachments/Trip-to-Ghent-file-tf_ab12-Train-ticket.pdf');
    expect(taskAttachmentFileName({id: 'tp_x', taskId: 'task_1', kind: 'photo', type: 'image/jpeg'}, 'Trip')).toBe('tasks/attachments/Trip-photo-tp_x.jpg');
  });
  test('the opener never shows a file as a page of this site', () => {
    const src = readFileSync(join(__dirname, '../../components/tasks/task-files.tsx'), 'utf8');
    expect(src).toMatch(/new Blob\(\[a\.blob\], \{type: how\.way === 'view' \? how\.type : 'application\/octet-stream'\}\)/);
    expect(src).not.toMatch(/dangerouslySetInnerHTML|<iframe|<object|<embed/);
  });
});
