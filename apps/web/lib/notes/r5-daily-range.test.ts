import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {dailyExportName, dailyNotesBetween, notesExportEntries} from './markdown';

/** Session AV lane 2 (r5-notes; LEDGER #366, Craft): the daily notes of a range of days, as Markdown with their photos. */
const AT = '2026-11-20T09:00:00.000Z';
const rec = notesSchema.parse({version: 1, voice: false, notes: [
  {id: 'd1', kind: 'daily', title: '2026-11-01', day: '2026-11-01', body: 'One.', photoId: 'p-1', createdAt: AT},
  {id: 'd3', kind: 'daily', title: '2026-11-03', day: '2026-11-03', body: 'Three.', createdAt: AT},
  {id: 'd2', kind: 'daily', title: '2026-11-02', day: '2026-11-02', body: 'Two.', locked: true, createdAt: AT},
  {id: 't', kind: 'topic', title: 'Fictional topic', body: 'Not a day.', createdAt: AT}],
canvases: [{id: 'cv-abcd', name: 'Board', nodes: [], edges: [], updatedAt: AT}]});

describe('daily notes for a range of days', () => {
  test('only the daily notes of those days, oldest first, either order of the days; no boards', () => {
    expect(dailyNotesBetween(rec, '2026-11-01', '2026-11-02').notes.map(n => n.id)).toEqual(['d1', 'd2']);
    expect(dailyNotesBetween(rec, '2026-11-03', '2026-11-01').notes.map(n => n.id)).toEqual(['d1', 'd2', 'd3']);
    expect(dailyNotesBetween(rec, '2026-11-01', '2026-11-03').canvases).toBeUndefined();
    expect(dailyExportName('2026-11-03', '2026-11-01', false)).toBe('zigoals-daily-notes-2026-11-01-to-2026-11-03.zip');
    expect(dailyExportName('2026-11-01', '2026-11-03', true)).toBe('zigoals-example-daily-notes-2026-11-01-to-2026-11-03.zip');
  });
  test('the ZIP holds those days with their photos, never a locked one', () => {
    const entries = notesExportEntries(dailyNotesBetween(rec, '2026-11-01', '2026-11-03'), {}, {now: new Date(AT), photos: new Map([['p-1', {data: new Uint8Array([1, 2]), type: 'image/webp'}]])});
    const names = entries.map(e => e.name);
    expect(names.filter(n => n.endsWith('.md'))).toHaveLength(2);
    expect(names).toContain('attachments/p-1.webp');
    expect(names.some(n => /topic|Board/i.test(n))).toBe(false);
    expect(entries.map(e => typeof e.data === 'string' ? e.data : '').join('\n')).not.toContain('Two.');
  });
});
