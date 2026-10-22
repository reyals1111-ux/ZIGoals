/**
 * Session AG Polish (ADR-030; owner Part 2): where each node of the Checklist's path stands on a phone, and on which side
 * its name tab hangs. Pure (no React, no DOM): the stage's width and each tab's measured one-line width in, a centre and
 * a side per node out.
 *
 * - The tab hangs from the node's lower side, starting `.3 × node` past its centre (components/path/path-orbit.css), and
 *   must fit on ONE line: a long name moves its node toward the left so its tab has the free width on the right.
 * - Short names keep a gentle rhythm across three lanes (centre, right, centre, left …), each tab on the side with room.
 * - The side away from the tab keeps room for ZIGi beside the node (its reserved slot when that node is next). Where a
 *   long name leaves no such room (a narrow phone), ZIGi stands above the tab on the tab's side (`zigi: 'above'`).
 * - Only if a tab cannot fit on one line even from the leftmost lane does it wrap (`wrap`, with the width it may use).
 * The lanes depend on the width and the names alone, never on which node is next, so a tick moves nothing.
 */
export type LaneSide = 'left' | 'right';
export type Lane = {x: number; side: LaneSide; wrap: boolean; maxTab: number; zigi: 'side' | 'above'};
export type LaneOptions = {w: number; node: number; zigi: number; margin?: number; gap?: number};

/** The three lanes' centres as shares of the width, and the rhythm short names follow. */
const LANES = [.5, .66, .5, .34] as const;

export function phoneLanes(tabs: readonly number[], o: LaneOptions): Lane[] {
  const m = o.margin ?? 6, gap = o.gap ?? 10, half = o.node / 2, halo = 6, reach = o.node * .3;
  const xmin = m + half + halo, xmax = o.w - m - half - halo;
  const clamp = (x: number) => Math.min(xmax, Math.max(xmin, x));
  const tabFits = (x: number, side: LaneSide, tab: number) => side === 'right' ? x + reach + tab <= o.w - m : x - reach - tab >= m;
  const zigiFits = (x: number, side: LaneSide) => side === 'right' ? x - half - halo - gap - o.zigi >= m : x + half + halo + gap + o.zigi <= o.w - m;
  // Candidate centres on a 2 px grid, nearest to the wanted one first.
  const around = (want: number) => { const xs: number[] = []; for (let x = xmin; x <= xmax + .01; x += 2) xs.push(x); return xs.sort((a, b) => Math.abs(a - want) - Math.abs(b - want)); };
  return tabs.map((tab, i) => {
    const want = clamp(o.w * LANES[i % LANES.length]!), first: LaneSide = want > o.w * .55 ? 'left' : 'right';
    const sides: LaneSide[] = [first, first === 'right' ? 'left' : 'right'];
    // 1. The wanted lane, its tab on one line and ZIGi's room on the other side.
    for (const side of sides) if (tabFits(want, side, tab) && zigiFits(want, side)) return {x: want, side, wrap: false, maxTab: tab, zigi: 'side' as const};
    // 2. The nearest place where both fit.
    for (const x of around(want)) for (const side of sides) if (tabFits(x, side, tab) && zigiFits(x, side)) return {x, side, wrap: false, maxTab: tab, zigi: 'side' as const};
    // 3. The tab on one line; ZIGi above the tab.
    for (const x of around(want)) for (const side of sides) if (tabFits(x, side, tab)) return {x, side, wrap: false, maxTab: tab, zigi: 'above' as const};
    // 4. Even from the leftmost lane it does not fit: it wraps, using the whole width to the right.
    return {x: xmin, side: 'right' as const, wrap: true, maxTab: Math.max(0, o.w - m - xmin - reach), zigi: 'above' as const};
  });
}
