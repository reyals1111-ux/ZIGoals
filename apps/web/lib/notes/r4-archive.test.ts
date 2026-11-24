import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {noteToMarkdown, planImport} from './markdown';
import {noteSearchItems, searchNotes} from '../search/notes';

/** Session AV lane 2 (r4-notes; LEDGER #315, Bear's archive): kept in Search and in the export, read back on import. */
const AT = '2026-11-20T09:00:00.000Z';
const r = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Fictional old plan', body: 'Kept for later.', archived: true, photoId: 'p-1', photos: ['p-2'], createdAt: AT}]});
describe('an archived note', () => {
  test('stays in Search, marked archived', () => {
    expect(searchNotes(r.notes, 'later').map(h => h.note.id)).toEqual(['n1']);
    expect(noteSearchItems(r.notes)[0]!.subtitle).toBe('Note · archived');
  });
  test('the Markdown export says so, and an import keeps it archived without making a property of it', () => {
    const md = noteToMarkdown(r.notes[0]!);
    expect(md).toContain('\narchived: true\n');
    const plan = planImport(notesSchema.parse({version: 1, notes: []}), [{name: 'Notes/Fictional old plan.md', data: new TextEncoder().encode(md.replace(/zigoals-id: n1\n/, '').replace(/photo: .*\n/, '') + '')}], AT, '2026-11-20');
    expect(plan.add[0]).toMatchObject({archived: true}); expect(plan.add[0]!.props).toBeUndefined();
  });
});
