import {describe, expect, test} from 'vitest';
import {focusList, taggableNotes} from './focus';
import {tagTree} from './tags';
import {notesSchema} from './schema';

/**
 * Session AV lane 2 (review b4g B4G-4; LEDGER #306): a tag carried only by daily notes lists those notes when focused,
 * and the Tags fold counts exactly the notes the focused list can show (no inbox captures, no archived notes).
 */
const AT = '2026-11-20T09:00:00.000Z';
const day = (d: string) => ({id: `d${d}`, kind: 'daily', title: d, day: d, body: 'Ran 5 km #gym', createdAt: `${d}T09:00:00.000Z`});
const record = notesSchema.parse({version: 1, notes: [day('2026-11-18'), day('2026-11-19'),
  {id: 't', kind: 'topic', title: 'Fictional plan', body: 'Lift #gym', createdAt: AT},
  {id: 'a', kind: 'topic', title: 'Fictional old', body: 'Old #gym', archived: true, createdAt: AT},
  {id: 'i', kind: 'inbox', title: '', body: 'Capture #gym', day: '2026-11-20', createdAt: AT}]});
describe('the focus and daily notes', () => {
  test('the focused list holds the topic notes, then the daily notes, newest first', () => {
    expect(focusList(record, 'gym').map(n => n.id)).toEqual(['t', 'd2026-11-19', 'd2026-11-18']);
    expect(focusList(record, undefined).map(n => n.id)).toEqual(['t']);
  });
  test('the Tags fold counts what the list shows', () => {
    expect(tagTree(taggableNotes(record))).toEqual([{tag: 'gym', name: 'gym', depth: 0, count: 3}]);
    expect(focusList(record, 'gym')).toHaveLength(3);
  });
});
