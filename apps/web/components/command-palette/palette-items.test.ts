import {describe, expect, it} from 'vitest';
import {PALETTE_GROUPS, filterRows, orderRows, type PaletteRow} from './palette-items';

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

describe('Session AL fix-up (LS-H36): the rows a typed word matches come before Ask ZIGi', () => {
  const zigi: PaletteRow = {id: 'zigi', group: 'Actions', label: 'Ask ZIGi: “agenda”', run: 'zigi'};
  const search: PaletteRow = {id: 'search', group: 'Actions', label: 'Search everything for “agenda”', run: 'search'};
  const quick: PaletteRow = {id: 'quick-add', group: 'Actions', label: 'Quick add', run: 'quick-add'};
  const agenda: PaletteRow = {id: 'page:/app/agenda', group: 'Pages', label: 'Agenda', href: '/app/agenda'};
  const task: PaletteRow = {id: 'task:a', group: 'Recent tasks', label: 'Agenda for Monday'};
  it('"agenda": the page first, then the task, then Ask ZIGi and Search under "Ask or search"', () => {
    const rows = orderRows([zigi, search], [task, agenda], 'agenda');
    expect(rows.map(r => r.id)).toEqual(['page:/app/agenda', 'task:a', 'zigi', 'search']);
    expect(rows.slice(2).map(r => r.group)).toEqual(['Ask or search', 'Ask or search']);
    // The rows keep the order the groups show in, so ↑/↓ walk them as seen.
    expect(rows.map(r => PALETTE_GROUPS.indexOf(r.group))).toEqual([...rows.map(r => PALETTE_GROUPS.indexOf(r.group))].sort((a, b) => a - b));
  });
  it('nothing typed: Ask ZIGi first, then the actions, Search, the pages (Q11)', () => {
    expect(orderRows([zigi, search], [quick, agenda], '').map(r => r.id)).toEqual(['zigi', 'quick-add', 'search', 'page:/app/agenda']);
  });
  it('words that match nothing: Ask ZIGi first, with the words (Q11)', () => {
    expect(orderRows([zigi, search], [], 'how is my sleep').map(r => r.id)).toEqual(['zigi', 'search']);
  });
});
