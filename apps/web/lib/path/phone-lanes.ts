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
 * - Owner amendment 5 (ADR-031 K16): the line is one smooth ribbon that leans through each node toward its tab
 *   (lib/path/flow-geometry.ts `ribbonSegments`), so the lanes keep it clean instead of the line dodging anything: an
 *   orbit's first node stands a short step under and left of its planet with its tab on the left (a name too long for one
 *   line there wraps there, on the narrowest phones), so the line falls from the planet and flows on leftward; an orbit's
 *   last node stands a third to a half of the width aside of the next planet with its tab on the planet's side, so the
 *   line leaves it already heading there and sweeps into the planet (never a straight drop), and the node before it
 *   stands at an edge, so the line sweeps on to it. The path's last node does the same before the day's finale. A
 *   one-node orbit's node stands farther under-left of its planet, so the line loops out to it and back.
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
  /** For a node that closes an orbit with another after it: the next planet's centre x, where the line goes (for the
   *  path's last node: the day's finale's). */
  to?: readonly (number | null | undefined)[];
};

/** The least sideways travel between two neighbours we aim for, as a share of the width (owner amendment 5: ≥ 30 % on average). */
export const MIN_TRAVEL = .3;

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
    // (An orbit's first node `opens` under its planet; its last node `closes` before the next planet, and the one before
    // that leads up to it. A one-node orbit only opens.)
    const planet = o.from?.[i], opens = planet !== null && planet !== undefined, next = opens ? null : o.to?.[i], closes = next !== null && next !== undefined;
    const after = !opens && !closes && o.from?.[i + 1] == null ? o.to?.[i + 1] : null, start = planet ?? prev;
    // 1. Where this node would like to stand: a wide or a short sweep from where the line comes from (under its planet: a
    //    short step left of it; before a planet: a third to a half of the width aside of it; the node before that: the far
    //    edge, so the line sweeps on to it).
    const far = (x: number) => x > w / 2 ? -1 : 1;
    let want: number;
    const alone = opens && o.to?.[i] != null;
    if (opens) want = clamp(planet - (alone ? .26 + rnd() * .12 : .1 + rnd() * .12) * w);
    else if (closes) {
      // (Aside of it — of a target in the middle, the finale, on the side away from the node before — and far enough from
      // that node to sweep: else as far aside as it may stand.)
      const d = (.36 + rnd() * .14) * w, away = Math.abs(next - w / 2) < .1 * w && start !== null && start !== undefined ? (start > next ? -1 : 1) : far(next);
      want = clamp(next + away * (start !== null && start !== undefined && Math.abs(next + away * d - start) < MIN_TRAVEL * w * 1.1 ? .56 * w : d));
    }
    else if (start === null || start === undefined) want = w * (rnd() < .5 ? .3 : .7);
    else {
      const mag = (wide ? .46 + rnd() * .14 : .3 + rnd() * .08) * w, roomR = xmax - start, roomL = start - xmin;
      let dir = roomR >= roomL ? 1 : -1;
      // (Now and then the other way, where that side has the room for the sweep.)
      if (rnd() < .28 && (dir > 0 ? roomL : roomR) >= mag) dir = -dir;
      want = clamp(start + dir * mag);
      if (Math.abs(want - start) < MIN_TRAVEL * w) want = clamp(start - dir * mag);
      // (Before an orbit's last node: the far edge from the next planet, or the near one when it already stands far.)
      if (after !== null && after !== undefined) {
        const edges = [far(after) < 0 ? xmin + rnd() * .06 * w : xmax - rnd() * .06 * w, far(after) < 0 ? xmax - rnd() * .06 * w : xmin + rnd() * .06 * w];
        want = edges.find(e => Math.abs(e - start) >= MIN_TRAVEL * w) ?? want;
      }
    }
    if (!opens) wide = !wide;
    const travel = (x: number) => start === null || start === undefined ? Infinity : Math.abs(x - start);
    const near = [...grid].sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
    // (Under a planet: left of it, the tab on the left. Before a planet: aside of it, the tab on the planet's side.)
    const flows = (x: number, side: LaneSide) => (!opens || (side === 'left' && x <= planet - (alone ? .2 : .04) * w)) && (!closes || (side === (next > x ? 'right' : 'left') && Math.abs(x - next) >= .3 * w && Math.abs(x - next) <= .56 * w));
    const sweeps = (x: number) => opens || travel(x) >= MIN_TRAVEL * w * .85;
    // 2. The nearest place to it where the whole tab fits on one line — first keeping the sweep, the line's flow and ZIGi's
    //    room with the tab toward the middle, then without ZIGi's room, then the sweep and the flow, then the flow, then
    //    anywhere.
    // (ZIGi's room beside the node only where it costs the sweep little: the path's width comes first, and ZIGi otherwise
    // takes its slot above the tab.)
    const tries: ((x: number, side: LaneSide) => boolean)[] = [
      (x, side) => Math.abs(x - want) <= .07 * w && side === sidesAt(x)[0] && sweeps(x) && flows(x, side) && zigiFits(x, side),
      (x, side) => Math.abs(x - want) <= .07 * w && side === sidesAt(x)[0] && sweeps(x) && flows(x, side),
      (x, side) => sweeps(x) && flows(x, side),
      (x, side) => flows(x, side),
      () => true,
    ];
    for (const ok of tries) for (const x of near) for (const side of sidesAt(x)) if (tabFits(x, side, tab) && ok(x, side)) {
      prev = x;
      // (From an edge the next sweep is a wide one, right across.)
      if (Math.min(x - xmin, xmax - x) <= .06 * w) wide = true;
      return {x, side, wrap: false, maxTab: tab, zigi: zigiFits(x, side) ? 'side' as const : 'above' as const};
    }
    // 3. Too long for one line: under its planet it wraps there, on the left (the narrowest phones); else from the
    //    leftmost lane, using the whole width to the right.
    if (opens) { const x = clamp(planet - .12 * w), room = x - reach - m; if (room >= 110) { prev = x; return {x, side: 'left' as const, wrap: true, maxTab: room, zigi: 'above' as const}; } }
    prev = xmin;
    return {x: xmin, side: 'right' as const, wrap: true, maxTab: Math.max(0, w - m - xmin - reach), zigi: 'above' as const};
  });
}
