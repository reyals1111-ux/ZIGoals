import {describe, expect, test} from 'vitest';
import {parseBlocks, plainText} from '../ai/safe-render';
import {addColumn, addRow, findTables, mayHoldTable, moveRow, removeColumn, removeRow, replaceTable, setCell, sortBy, TABLE_FULL_ROWS} from './table-edit';

/** Session AV lane 2 (r5-notes; LEDGER #363, Craft's table quick actions): tables changed and written back as Markdown. */
const TEXT = 'Shopping\n\n| Item | Price |\n| :--- | ---: |\n| Tea | 4 |\n| apples | 12 |\n| Bread |  |\n| a\\|b | 3.5 |\n\nAfter.\n\n```\n| not | a |\n| --- | --- |\n```';

describe('tables in a note', () => {
  test('found as the reading view draws them, never inside code', () => {
    const [t, ...more] = findTables(TEXT);
    expect(more).toEqual([]);
    expect(t).toEqual({first: 2, last: 7, head: ['Item', 'Price'], align: ['left', 'right'], rows: [['Tea', '4'], ['apples', '12'], ['Bread', ''], ['a|b', '3.5']]});
    expect(mayHoldTable(TEXT)).toBe(true); expect(mayHoldTable('a | b\nno')).toBe(false);
  });
  test('rows and columns added, moved and removed; cells changed; written back in place', () => {
    const t = findTables(TEXT)[0]!;
    const next = removeRow(moveRow(addColumn(setCell(addRow(t), 4, 0, 'Milk'), 'Shop'), 0, 1), 2);
    const text = replaceTable(TEXT, t, next);
    expect(text.split('\n').slice(2, 8)).toEqual(['| Item | Price | Shop |', '| :--- | ---: | --- |', '| apples | 12 |  |', '| Tea | 4 |  |', '| a\\|b | 3.5 |  |', '| Milk |  |  |']);
    expect(text.startsWith('Shopping\n\n')).toBe(true); expect(text).toContain('\n\nAfter.\n\n```');
    const drawn = parseBlocks(text, {notes: true}).find(b => b.type === 'table')!;
    expect(plainText([drawn])).toContain('a|b | 3.5');
    expect(removeColumn(next, 2).head).toEqual(['Item', 'Price']);
    expect(() => removeColumn({...t, head: ['One'], align: [null], rows: [['x']]}, 0)).toThrow(/one column/);
    expect(() => addRow({...t, rows: Array.from({length: 100}, () => ['', ''])})).toThrow(TABLE_FULL_ROWS);
  });
  test('sort: numbers as numbers, words in order, empty cells last', () => {
    const t = findTables(TEXT)[0]!;
    expect(sortBy(t, 1, 'up').rows.map(r => r[0])).toEqual(['a|b', 'Tea', 'apples', 'Bread']);
    expect(sortBy(t, 1, 'down').rows.map(r => r[0])).toEqual(['apples', 'Tea', 'a|b', 'Bread']);
    expect(sortBy(t, 0, 'up').rows.map(r => r[0])).toEqual(['a|b', 'apples', 'Bread', 'Tea']);
    expect(sortBy({...t, rows: [['x2', ''], ['x10', ''], ['x1', '']]}, 0, 'up').rows.map(r => r[0])).toEqual(['x1', 'x2', 'x10']);
  });
});
