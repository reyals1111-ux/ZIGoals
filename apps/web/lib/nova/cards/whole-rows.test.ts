import {describe, expect, it} from 'vitest';
import {fitWholeRows, moreWords, rowShown} from './whole-rows';

/**
 * A fake panel: `room` px for the lists; a row is `row` px; a list that hides rows adds a "+N more" line of `more` px.
 * (The browser measures the same thing on the real layout.)
 */
const panel = (totals: readonly number[], room: number, row = 44, more = 26) => {
  let asked = 0;
  const fits = (shown: readonly number[]) => { asked++; return shown.reduce((h, n, i) => h + n * row + (n < totals[i]! ? more : 0), 0) <= room; };
  return {fits, asked: () => asked};
};

describe('whole rows only: how many rows fit (Session AM-2)', () => {
  it('shows every row when they fit, and asks once', () => {
    const p = panel([3], 132);
    expect(fitWholeRows([{rows: 3}], p.fits)).toEqual([3]);
    expect(p.asked()).toBe(1);
  });
  it('drops whole rows from the end until the rows and the "+N more" line fit', () => {
    // 4 rows are 176 px; the panel has 130: two rows (88) and the line (26) fit, three rows and the line (158) do not.
    expect(fitWholeRows([{rows: 4}], panel([4], 130).fits)).toEqual([2]);
    // One pixel short of a row: that row is not shown.
    expect(fitWholeRows([{rows: 2}], panel([2], 87).fits)).toEqual([1]);
    expect(fitWholeRows([{rows: 2}], panel([2], 88).fits)).toEqual([2]);
  });
  it('the line itself always fits: a row gives way to it', () => {
    // 100 px: two rows (88) fit, but two of three rows need the line too (114), so one row and the line (70).
    expect(fitWholeRows([{rows: 3}], panel([3], 100).fits)).toEqual([1]);
    // Not even one row with its line: no row, the line alone.
    expect(fitWholeRows([{rows: 3}], panel([3], 60).fits)).toEqual([0]);
  });
  it('never goes under a list\'s minimum (the panel then scrolls; a row is never cut)', () => {
    expect(fitWholeRows([{rows: 3, min: 1}], panel([3], 10).fits)).toEqual([1]);
    expect(fitWholeRows([{rows: 1, min: 4}], panel([1], 10).fits)).toEqual([1]);
  });
  it('two lists: the last gives its rows up first, down to its minimum, then the first', () => {
    // 8 + 4 rows, room for five rows and two lines: the second list keeps its one row, the first what is left.
    const room = 5 * 44 + 2 * 26;
    expect(fitWholeRows([{rows: 8, min: 1}, {rows: 4, min: 1}], panel([8, 4], room).fits)).toEqual([4, 1]);
    // Room for both whole lists: nothing is dropped.
    expect(fitWholeRows([{rows: 2}, {rows: 2}], panel([2, 2], 176).fits)).toEqual([2, 2]);
    // The second list may leave whole (minimum 0) before the first loses a row.
    expect(fitWholeRows([{rows: 3, min: 1}, {rows: 2}], panel([3, 2], 3 * 44 + 26).fits)).toEqual([3, 0]);
  });
  it('two lists side by side (two columns): a list that gave its rows up for nothing gets them back', () => {
    // Each column has its own height (130 px): the first list keeps two rows and its line; the second, whole, fits beside it.
    const columns = (totals: readonly number[], room: number) => (shown: readonly number[]) => shown.every((n, i) => n * 44 + (n < totals[i]! ? 26 : 0) <= room);
    expect(fitWholeRows([{rows: 4, min: 1}, {rows: 2}], columns([4, 2], 130))).toEqual([2, 2]);
    expect(fitWholeRows([{rows: 4, min: 1}, {rows: 5}], columns([4, 5], 130))).toEqual([2, 2]);
    // Stacked in one column (130 px for both lists and their two lines) nothing comes back: one row of the first, the second out.
    expect(fitWholeRows([{rows: 4, min: 1}, {rows: 2}], panel([4, 2], 130).fits)).toEqual([1, 0]);
  });
  it('asks at most twice per row and once more, and nothing for empty lists', () => {
    const p = panel([6, 3], 0);
    fitWholeRows([{rows: 6}, {rows: 3}], p.fits);
    expect(p.asked()).toBeLessThanOrEqual(19);
    const none = panel([0], 0);
    expect(fitWholeRows([{rows: 0}], none.fits)).toEqual([0]);
    expect(none.asked()).toBe(0);
  });
  it('is stable: the same panel gives the same counts again (no layout loop)', () => {
    const lists = [{rows: 5, min: 1}, {rows: 3}];
    const a = fitWholeRows(lists, panel([5, 3], 200).fits), b = fitWholeRows(lists, panel([5, 3], 200).fits);
    expect(a).toEqual(b);
  });
});

describe('which rows show, and the last line\'s words', () => {
  it('keeps the first rows, or the last ones (a calendar\'s latest weeks)', () => {
    expect([0, 1, 2, 3].map(i => rowShown(i, 4, 2))).toEqual([true, true, false, false]);
    expect([0, 1, 2, 3].map(i => rowShown(i, 4, 2, 'last'))).toEqual([false, false, true, true]);
    expect([0, 1].map(i => rowShown(i, 2, 0, 'last'))).toEqual([false, false]);
  });
  it('says how many rows are not shown, and where they are, in plain words', () => {
    expect(moreWords(3, {where: 'the Tasks page'})).toBe('+3 more on the Tasks page');
    expect(moreWords(1)).toBe('+1 more');
    expect(moreWords(0, {where: 'the Tasks page'})).toBe('');
    expect(moreWords(2, {what: ['earlier week', 'earlier weeks'], where: 'the Journal page'})).toBe('+2 earlier weeks on the Journal page');
    expect(moreWords(1, {what: ['earlier week', 'earlier weeks']})).toBe('+1 earlier week');
    // With no row shown there is nothing to add to.
    expect(moreWords(4, {where: 'the Tasks page', shown: 0})).toBe('4 on the Tasks page');
    expect(moreWords(4, {shown: 0})).toBe('4 not shown here');
  });
});

// Session AV (ADR-045 D36): the halving search answers exactly as the row-by-row walk it replaced, with fewer questions.
function walk(lists: readonly {rows: number; min?: number}[], fits: (shown: readonly number[]) => boolean): number[] {
  const all = lists.map(l => Math.max(0, Math.floor(l.rows))), shown = [...all];
  if (!shown.some(n => n > 0) || fits(shown)) return shown;
  let fitted = false;
  for (let j = lists.length - 1; j >= 0 && !fitted; j--) {
    const min = Math.min(shown[j]!, Math.max(0, Math.floor(lists[j]!.min ?? 0)));
    while (shown[j]! > min && !fitted) { shown[j] = shown[j]! - 1; fitted = fits(shown); }
  }
  if (!fitted) return shown;
  for (let j = 0; j < lists.length; j++) while (shown[j]! < all[j]!) { shown[j] = shown[j]! + 1; if (!fits(shown)) { shown[j] = shown[j]! - 1; break; } }
  return shown;
}
describe('Session AV (D36): halving instead of walking', () => {
  it('gives the walk\'s counts on 4,000 random panels (stacked and side by side, uneven rows, minimums)', () => {
    let seed = 7;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let t = 0; t < 4000; t++) {
      const n = 1 + rnd(3), totals = Array.from({length: n}, () => rnd(14)), lists = totals.map(rows => ({rows, ...(rnd(3) === 0 ? {min: rnd(4)} : {})}));
      const heights = totals.map(r => Array.from({length: r}, () => 20 + rnd(40))), line = 18 + rnd(12), room = rnd(700);
      const used = (shown: readonly number[], i: number) => heights[i]!.slice(0, shown[i]).reduce((a, b) => a + b, 0) + (shown[i]! < totals[i]! ? line : 0);
      const stacked = (shown: readonly number[]) => shown.reduce((h, _, i) => h + used(shown, i), 0) <= room;
      const columns = (shown: readonly number[]) => shown.every((_, i) => used(shown, i) <= room / n);
      for (const fits of [stacked, columns]) {
        let asked = 0;
        const counted = (shown: readonly number[]) => { asked++; return fits(shown); };
        expect(fitWholeRows(lists, counted), JSON.stringify({totals, lists, room})).toEqual(walk(lists, fits));
        expect(asked).toBeLessThanOrEqual(2 * totals.reduce((a, b) => a + b, 0) + 1);
      }
    }
  });
  it('asks far fewer questions than one per row on a long list', () => {
    const p = panel([40], 300);
    expect(fitWholeRows([{rows: 40}], p.fits)).toEqual([6]); // six rows (264) and the line (26) in 300
    expect(p.asked()).toBeLessThanOrEqual(9);
  });
});
