/**
 * Session AM-2 (whole rows only): how many rows of each list a widget shows, so that no row is ever cut by its panel's
 * edge. Pure: the caller says how many rows each list has and answers one question, "do these counts fit?" (in the
 * browser that answer is measured on the real layout: components/nova/cards/whole-rows.tsx).
 *
 * The lists are in priority order (the first matters most). Every row is shown when that fits. Otherwise rows leave from
 * the end of the LAST list first, down to its `min`, then from the list before it, and so on, until the counts fit. If
 * nothing fits even at every list's minimum, the minimums are returned (the caller's panel then scrolls, never cuts).
 * Then rows are given back, the first list first, while the counts still fit: lists that stand side by side do not
 * share their height, so a list that gave its rows up for nothing gets them back (two columns: today | next).
 * `fits` is asked at most twice for each row, plus once.
 *
 * Session AV (ADR-045 D36): each question costs the browser a layout of the page, so the counts are found by halving
 * instead of one row at a time. Fewer rows never take more room (below "every row", the "+N more" line is always there),
 * so the answer is the same as the row-by-row walk's: the most rows of the last list that fit, then of the one before,
 * and so on; then the most each list gets back, the first list first, with "every row" (no last line) asked only when
 * one row fewer fits, as the walk did. About log2(rows) questions per list instead of one per row.
 */
export type RowsList = {/** The rows this list holds. */ rows: number; /** Never fewer than this many (default 0). */ min?: number};
/** The largest count in [lo, hi] that fits, where `lo` is known to fit and fitting holds for every count below one that fits. */
function most(lo: number, hi: number, fitsAt: (k: number) => boolean): number {
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (fitsAt(mid)) lo = mid; else hi = mid - 1; }
  return lo;
}
export function fitWholeRows(lists: readonly RowsList[], fits: (shown: readonly number[]) => boolean): number[] {
  const all = lists.map(l => Math.max(0, Math.floor(l.rows))), shown = [...all];
  if (!shown.some(n => n > 0) || fits(shown)) return shown;
  const at = (j: number) => (k: number) => { shown[j] = k; return fits(shown); };
  let fitted = false;
  for (let j = lists.length - 1; j >= 0 && !fitted; j--) {
    const min = Math.min(shown[j]!, Math.max(0, Math.floor(lists[j]!.min ?? 0)));
    if (shown[j]! <= min) continue;
    // This list's current count was already asked with everything after it (it did not fit): the walk went down from
    // one fewer to the minimum, stopping at the first count that fits.
    const top = shown[j]! - 1;
    if (at(j)(top)) { fitted = true; break; }
    if (top === min || !at(j)(min)) { shown[j] = min; continue; }
    shown[j] = top - 1 > min ? most(min, top - 1, at(j)) : min; fitted = true;
  }
  if (!fitted) return shown;
  for (let j = 0; j < lists.length; j++) {
    if (shown[j]! >= all[j]!) continue;
    const from = shown[j]!, fitsAt = at(j);
    // Up to one row fewer than every row, the last line is there and fitting holds downward; "every row" is asked last.
    // One more row is asked first, as the walk did (a list that has just found its count gets nothing back, one question).
    const k = from < all[j]! - 1 ? (fitsAt(from + 1) ? most(from + 1, all[j]! - 1, fitsAt) : from) : from;
    shown[j] = k === all[j]! - 1 && fitsAt(all[j]!) ? all[j]! : k;
  }
  return shown;
}

/** Which rows are shown: the first `shown` of `rows`, or (a calendar's weeks: the latest matter most) the last `shown`. */
export function rowShown(index: number, rows: number, shown: number, keep: 'first' | 'last' = 'first'): boolean {
  return keep === 'first' ? index < shown : index >= rows - shown;
}

/**
 * The last line under a shortened list, in plain words: "+3 more on the Tasks page". `where` names the page that holds
 * the rest ("the Tasks page"), when the widget has one; `what` names the rows where "more" alone would be unclear
 * (["earlier week", "earlier weeks"]). With no row shown at all there is nothing to add to: "3 on the Tasks page".
 */
export function moreWords(hidden: number, opts: {where?: string; what?: readonly [one: string, many: string]; shown?: number} = {}): string {
  const n = Math.max(0, Math.floor(hidden)), where = opts.where ? ` on ${opts.where}` : '';
  if (!n) return '';
  if (opts.what) return `${opts.shown === 0 ? '' : '+'}${n} ${n === 1 ? opts.what[0] : opts.what[1]}${where}`;
  return opts.shown === 0 ? `${n}${where || ' not shown here'}` : `+${n} more${where}`;
}
