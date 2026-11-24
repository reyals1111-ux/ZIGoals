import {describe, expect, test} from 'vitest';
import {addColumn, findTables, moveRow, removeColumn, replaceTable, setCell, sortBy, type NoteTable} from './table-edit';

/**
 * Review b5i B5I-5 (Major): a table edit changes only what it changes — every other cell, column and character stays
 * byte for byte; a table it could not write back whole is not edited, and says why.
 */
const ODD = 'Intro\n|Item|  Price  | Note |\n|:-|-:|---|\n|Tea|4|*green*  , loose|\n| apples |12| `a\\|b` |\nEnd';
const edit = (text: string, fn: (t: NoteTable) => NoteTable) => { const t = findTables(text)[0]!; return replaceTable(text, t, fn(t)); };
describe('only the edited cell changes', () => {
  test('a cell: its own words only, in its own line; every other line byte for byte', () => {
    const out = edit(ODD, t => setCell(t, 0, 1, '5'));
    const before = ODD.split('\n'), after = out.split('\n');
    expect(after[3]).toBe('|Tea|5|*green*  , loose|');
    expect(after.filter((_, i) => i !== 3)).toEqual(before.filter((_, i) => i !== 3));
    expect(edit(ODD, t => setCell(t, -1, 0, 'Thing')).split('\n')[1]).toBe('|Thing|  Price  | Note |');
  });
  test('moving and sorting rows keeps each row as written', () => {
    const moved = edit(ODD, t => moveRow(t, 0, 1)).split('\n');
    expect(moved.slice(3, 5)).toEqual(['| apples |12| `a\\|b` |', '|Tea|4|*green*  , loose|']);
    const sorted = edit(ODD, t => sortBy(t, 1, 'down')).split('\n');
    expect(sorted.slice(3, 5)).toEqual(['| apples |12| `a\\|b` |', '|Tea|4|*green*  , loose|']);
  });
  test('a column added or removed leaves every other cell as written', () => {
    expect(edit(ODD, t => addColumn(t, 'Shop')).split('\n').slice(1, 5)).toEqual(['|Item|  Price  | Note | Shop |', '|:-|-:|---| --- |', '|Tea|4|*green*  , loose|  |', '| apples |12| `a\\|b` |  |']);
    expect(edit(ODD, t => removeColumn(t, 1)).split('\n').slice(1, 5)).toEqual(['|Item| Note |', '|:-|---|', '|Tea|*green*  , loose|', '| apples | `a\\|b` |']);
    expect(edit(ODD, t => removeColumn(t, 0)).split('\n').slice(1, 5)).toEqual(['|  Price  | Note |', '|-:|---|', '|4|*green*  , loose|', '|12| `a\\|b` |']);
    expect(edit('a | b\n--- | ---\n1 | 2', t => addColumn(t, 'c'))).toBe('a | b | c\n--- | --- | ---\n1 | 2 | ');
  });
  test('a table that cannot be written back whole is not edited, and says why', () => {
    const wide = findTables('| a | b |\n| --- | --- |\n| 1 | 2 | 3 |\n| 4 | 5 |')[0]!;
    expect(wide.blocked).toMatch(/more cells than its header/);
    expect(() => setCell(wide, 1, 0, 'x')).toThrow(/more cells than its header/);
    const long = findTables(`| a |\n| --- |\n| ${'x'.repeat(501)} |`)[0]!;
    expect(long.blocked).toMatch(/more than 500 characters/);
    const many = findTables(`|${Array.from({length: 21}, (_, i) => ` c${i} `).join('|')}|\n|${Array.from({length: 21}, () => '---').join('|')}|`)[0]!;
    expect(many.blocked).toMatch(/more than 20 columns/);
    const short = findTables('| a | b |\n| --- | --- |\n| 1 |')[0]!;
    expect(short.blocked).toBeNull();
    expect(replaceTable('| a | b |\n| --- | --- |\n| 1 |', short, setCell(short, 0, 1, '2'))).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });
});
