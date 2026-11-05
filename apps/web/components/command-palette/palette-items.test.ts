import {describe, expect, it} from 'vitest';
import {filterRows, type PaletteRow} from './palette-items';

describe('Session AL L5-4 (LS-H36, C-LS-22): the command palette filter', () => {
  const rows: PaletteRow[] = [
    {id: 'a', group: 'Actions', label: 'Quick add', words: 'log add'},
    {id: 'p', group: 'Pages', label: 'Tasks', words: 'to-do todo list'},
    {id: 'h', group: 'Pages', label: 'Health'},
    {id: 't', group: 'Recent tasks', label: 'Call the plumber', detail: 'Due today'},
  ];
  it('nothing typed: every row, in order', () => expect(filterRows(rows, '  ').map(r => r.id)).toEqual(['a', 'p', 'h', 't']));
  it('every word must match, case and accents ignored', () => {
    expect(filterRows(rows, 'TODO').map(r => r.id)).toEqual(['p']);
    expect(filterRows(rows, 'call plumb').map(r => r.id)).toEqual(['t']);
    expect(filterRows(rows, 'héalth').map(r => r.id)).toEqual(['h']);
    expect(filterRows(rows, 'call health')).toEqual([]);
  });
});
