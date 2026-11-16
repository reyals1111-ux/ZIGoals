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
 */
export type RowsList = {/** The rows this list holds. */ rows: number; /** Never fewer than this many (default 0). */ min?: number};
export function fitWholeRows(lists: readonly RowsList[], fits: (shown: readonly number[]) => boolean): number[] {
  const all = lists.map(l => Math.max(0, Math.floor(l.rows))), shown = [...all];
  if (!shown.some(n => n > 0) || fits(shown)) return shown;
  let fitted = false;
  for (let j = lists.length - 1; j >= 0 && !fitted; j--) {
    const min = Math.min(shown[j]!, Math.max(0, Math.floor(lists[j]!.min ?? 0)));
    while (shown[j]! > min && !fitted) {
      shown[j] = shown[j]! - 1;
      fitted = fits(shown);
    }
  }
  if (!fitted) return shown;
  for (let j = 0; j < lists.length; j++) while (shown[j]! < all[j]!) {
    shown[j] = shown[j]! + 1;
    if (!fits(shown)) { shown[j] = shown[j]! - 1; break; }
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
