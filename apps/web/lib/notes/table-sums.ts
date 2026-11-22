import type {Note, PropType} from './schema';
import {propOf} from './props';

/**
 * Session AV lane 2 (r6-notes; LEDGER #408, Capacities' calculations under a table): under each Number column of the
 * notes table, the sum and the average of the notes shown (over the notes that have a value), and under each Tick column
 * how many are ticked; the Words column is added up too. Derived from the rows shown (after the filters; a locked note
 * comes in with no properties and no words, so it never counts). Nothing stored. Pure.
 */
export type ColumnSum = {kind: 'number'; sum: number; average: number; count: number} | {kind: 'tick'; ticked: number; of: number} | null;
export function columnSum(notes: readonly Pick<Note, 'props'>[], name: string, type: PropType): ColumnSum {
  if (type === 'number') {
    const values = notes.flatMap(n => { const p = propOf(n, name); return p?.t === 'number' ? [p.v] : []; });
    if (!values.length) return {kind: 'number', sum: 0, average: 0, count: 0};
    const sum = values.reduce((a, b) => a + b, 0);
    return {kind: 'number', sum: Math.round(sum * 100) / 100, average: Math.round(sum / values.length * 100) / 100, count: values.length};
  }
  if (type === 'tick') {
    const ticks = notes.flatMap(n => { const p = propOf(n, name); return p?.t === 'tick' ? [p.v] : []; });
    return {kind: 'tick', ticked: ticks.filter(Boolean).length, of: notes.length};
  }
  return null;
}
/** Whether the table shows its sums row: when a Number or Tick column is shown. */
export const hasSums = (cols: readonly {type: PropType}[]) => cols.some(c => c.type === 'number' || c.type === 'tick');
