import {seeded} from './flow-geometry';

/**
 * Where each node of the Checklist's path stands on a phone, and on which side its name tab hangs. Pure (no React, no
 * DOM): the stage's width and each tab's measured one-line width in, a centre and a side per node out.
 *
 * Session AG Polish 2 (ADR-031 K3–K5; owner Part 1, references 03–06): the path uses the phone's whole width, as the
 * computer's does. AG Polish kept every node between 34 % and 66 % of the width, so the line ran nearly straight down
 * the middle; now each node travels from the one before it (or from its orbit's planet, for an orbit's first node) by a
 * seeded rhythm of wide sweeps (about half the width) and short ones (about a third), toward the side with more room,
 * now and then the other way — the same on every visit.
 *
 * - The tab hangs from the node's lower side, starting `.3 × node` past its centre (components/path/path-orbit.css), and
 *   always shows the whole name on ONE line: each node takes the side where its full tab fits (the freer side first), and
 *   where it fits on neither side the node moves along until it does. Only a name too long for the leftmost lane wraps
 *   (`wrap`, with the width it may use) — never an ellipsis.
 * - The side away from the tab keeps room for ZIGi where it can (`zigi: 'side'`); otherwise ZIGi stands above the tab
 *   (`'above'`); ZIGi's own placer (components/path/path-zigi.tsx) then finds its clear place around the node.
 * The lanes depend on the width, the names and the planets' places alone, never on which node is next: a tick moves nothing.
 */
export type LaneSide = 'left' | 'right';
export type Lane = {x: number; side: LaneSide; wrap: boolean; maxTab: number; zigi: 'side' | 'above'};
export type LaneOptions = {
  w: number; node: number; zigi: number; margin?: number; gap?: number;
  /** Seeds the rhythm (the path's id): the same path is laid out the same on every visit. */
  seed?: string;
  /** For a node that opens an orbit: its planet's centre x, where the line comes from. */
  from?: readonly (number | null | undefined)[];
};

/** The least sideways travel between two neighbours we aim for, as a share of the width (owner Part 1a: ≥ 25 % on average). */
export const MIN_TRAVEL = .26;

export function phoneLanes(tabs: readonly number[], o: LaneOptions): Lane[] {
  const m = o.margin ?? 6, gap = o.gap ?? 10, half = o.node / 2, halo = 6, reach = o.node * .3, w = o.w;
  const xmin = m + half + halo, xmax = Math.max(xmin, w - m - half - halo);
  const clamp = (x: number) => Math.min(xmax, Math.max(xmin, x));
  const tabFits = (x: number, side: LaneSide, tab: number) => side === 'right' ? x + reach + tab <= w - m : x - reach - tab >= m;
  // (ZIGi on the side away from a tab hung on `side`.)
  const zigiFits = (x: number, side: LaneSide) => side === 'right' ? x - half - halo - gap - o.zigi >= m : x + half + halo + gap + o.zigi <= w - m;
  // (The freer side first: toward the middle of the screen.)
  const sidesAt = (x: number): LaneSide[] => x <= w / 2 ? ['right', 'left'] : ['left', 'right'];
  const grid: number[] = []; for (let x = xmin; x <= xmax + .01; x += 2) grid.push(Math.round(x * 10) / 10);
  const rnd = seeded(`${o.seed ?? 'path'}|phone-lanes|${Math.round(w)}`);
  let prev: number | null = null, wide = rnd() < .5;
  return tabs.map((tab, i) => {
    const start = o.from?.[i] ?? prev;
    // 1. Where this node would like to stand: a wide or a short sweep from where the line comes from.
    let want: number;
    if (start === null || start === undefined) want = w * (rnd() < .5 ? .3 : .7);
    else {
      const mag = (wide ? .46 + rnd() * .14 : .27 + rnd() * .08) * w, roomR = xmax - start, roomL = start - xmin;
      let dir = roomR >= roomL ? 1 : -1;
      // (Now and then the other way, where that side has the room for the sweep.)
      if (rnd() < .28 && (dir > 0 ? roomL : roomR) >= mag) dir = -dir;
      want = clamp(start + dir * mag);
      if (Math.abs(want - start) < MIN_TRAVEL * w) want = clamp(start - dir * mag);
    }
    wide = !wide;
    const travel = (x: number) => start === null || start === undefined ? Infinity : Math.abs(x - start);
    const near = [...grid].sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
    // 2. The nearest place to it where the whole tab fits on one line — first keeping the sweep and ZIGi's room, then the sweep, then anywhere.
    // (ZIGi's room beside the node only where it costs the sweep little: the path's width comes first, and ZIGi otherwise
    // takes its slot above the tab.)
    const tries: ((x: number, side: LaneSide) => boolean)[] = [
      (x, side) => Math.abs(x - want) <= .07 * w && travel(x) >= MIN_TRAVEL * w * .85 && zigiFits(x, side),
      x => travel(x) >= MIN_TRAVEL * w * .85,
      () => true,
    ];
    for (const ok of tries) for (const x of near) for (const side of sidesAt(x)) if (tabFits(x, side, tab) && ok(x, side)) {
      prev = x;
      return {x, side, wrap: false, maxTab: tab, zigi: zigiFits(x, side) ? 'side' as const : 'above' as const};
    }
    // 3. Too long for one line even from the leftmost lane: it wraps, using the whole width to the right.
    prev = xmin;
    return {x: xmin, side: 'right' as const, wrap: true, maxTab: Math.max(0, w - m - xmin - reach), zigi: 'above' as const};
  });
}
