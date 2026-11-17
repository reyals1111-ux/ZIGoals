import type {NovaWidget, WidgetSize} from './store';
import type {Side} from './layout';

/**
 * Session AR (ADR-041 P3, S1–S3): how the populated stage is composed. Pure arithmetic, no DOM: the dashboard turns the
 * result into grid placements (components/nova/widget-grid.tsx) and the star's size (components/nova/nova-dashboard.tsx).
 *
 * Session AM's stage was two equal columns of equal tiles (lib/nova/layout.ts `placeOrbit`); four rounds of critics asked
 * for "a star with satellites" instead. Here every widget beside the star has a **tier** that is worked out and never
 * stored:
 * - **hero** — one a wing, the first widget of that wing: a tall panel across the wing, one dominant instrument;
 * - **supporting** — the next one (two side by side where a wing is wide enough): instrument and figure;
 * - **compact** — a one-unit plate: the figure and a small instrument;
 * - what a wing cannot hold rests on the **band** under the star, as before.
 * A wing's rows share the stage's height 3 : 2 : 1 (a widget the person made Large is a hero of weight 4), so panels differ
 * in size and weight by structure. The right wing is the left one upside down: the two heroes stand on the galaxy's long
 * axis (top left, bottom right) and the eye crosses the star on a diagonal.
 *
 * S3: the list's order is the order of importance — a widget made on request stands first (ADR-038 D23), so it arrives as
 * its wing's hero and the older ones step down to supporting, compact, then the band. A widget keeps its side of the star
 * while it stays beside it (design review AM-D9). The person's own S / M / L is kept as stored: it is what Arrange sets
 * and what shows while arranging; a Large one is lifted to its wing's hero place among the pinned widgets.
 */
export type Tier = 'hero' | 'supporting' | 'compact';
export const TIER_WEIGHT: Record<Tier, number> = {hero: 3, supporting: 2, compact: 1};
/** A hero the person made Large weighs four units (AL's "a side column of its own"). */
export const LARGE_HERO_WEIGHT = 4;
/** One unit of a wing, px: never under 112 (a compact plate still holds its figure and a supporting panel its instrument: at 104 a Medium body was cut), never over 176 (a hero is at most 528, a Large one 704). */
export const TIER_UNIT_MIN = 112, TIER_UNIT_MAX = 176, TIER_GAP = 12;
/** A wing this wide holds two supporting panels side by side; a compact plate needs this much width. */
export const TWO_UP_MIN = 720, COMPACT_MIN = 340, COMPACT_MAX_CELLS = 3;
/** The size a body is drawn at: a hero is the Large body from this height on, a supporting panel the Medium one from this height on. */
export const HERO_LARGE_FROM = 500, SUPPORTING_MEDIUM_FROM = 196;
/** A hero is the Large body only in a wing at least this wide (or when the person made it Large); a Medium-bodied hero is at most this tall. */
export const HERO_LARGE_WING = 480, HERO_MEDIUM_MAX = 400;

export type Composed = NovaWidget & {
  side: Side;
  /** Its tier beside the star; undefined on the band. */
  tier?: Tier;
  /** The size its body is drawn at (the stored `size` stays the person's own). */
  show: WidgetSize;
  /** Its row in the wing, 1-based from the top as drawn (the right wing runs bottom to top); 0 on the band. */
  row: number;
  /** Its height in px; 0 on the band (the band sizes itself). */
  height: number;
  /** Its columns in the wing's grid of WING_COLUMNS: the whole wing, a half or a third. */
  span: number;
  /** Its order in the list (0 = the most important). */
  order: number;
};
export const WING_COLUMNS = 6;
/** From this width a wing steps: its supporting panel is nine tenths of the hero's width, its compact plate 78 %, hung from the outer edge. */
export const WING_STEPS_FROM = 540;

/** A hero the person made Large is the Large body, whose least height is this (AL's four units of 120 px and their gaps). */
export const LARGE_HERO_MIN = 516;
/** A short stage still holds a hero and a compact plate from this height: a Medium body's least (252 px), the gap and a plate of one least unit. */
export const SHORT_STAGE_MIN = 252 + TIER_GAP + TIER_UNIT_MIN;
/**
 * The rows a wing of this height can hold, most first: hero, supporting, compact — each only if every unit keeps
 * TIER_UNIT_MIN (and a Large hero its LARGE_HERO_MIN). A short stage (a 720 px window) keeps a hero and a compact plate
 * as long as the hero has a Medium body's height.
 */
export function wingTiers(height: number | null | undefined, largeHero = false): Tier[] {
  const h = typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : 580, hero = largeHero ? LARGE_HERO_WEIGHT : TIER_WEIGHT.hero;
  const least = largeHero ? Math.max(TIER_UNIT_MIN, LARGE_HERO_MIN / LARGE_HERO_WEIGHT) : TIER_UNIT_MIN;
  const fits = (tiers: Tier[]) => tiers.reduce((sum, t, i) => sum + (i === 0 ? hero : TIER_WEIGHT[t]), 0) * least + (tiers.length - 1) * TIER_GAP <= h;
  for (const tiers of [['hero', 'supporting', 'compact'], ['hero', 'supporting'], ['hero', 'compact']] as Tier[][]) if (fits(tiers)) return tiers;
  return !largeHero && h >= SHORT_STAGE_MIN ? ['hero', 'compact'] : ['hero'];
}
/** How many widgets a row of this tier holds in a wing of this width. */
export function tierCells(tier: Tier, wingWidth: number | null | undefined): number {
  const w = typeof wingWidth === 'number' && Number.isFinite(wingWidth) && wingWidth > 0 ? wingWidth : 360;
  if (tier === 'hero') return 1;
  if (tier === 'supporting') return w >= TWO_UP_MIN ? 2 : 1;
  return Math.max(1, Math.min(COMPACT_MAX_CELLS, Math.floor(w / COMPACT_MIN)));
}
/** How many widgets a wing holds beside the star. */
export const wingCapacity = (height: number | null | undefined, wingWidth: number | null | undefined): number => wingTiers(height).reduce((n, t) => n + tierCells(t, wingWidth), 0);

export type ComposeOptions = {
  /** The stage's height (px) and one wing's width (px). */
  height: number | null | undefined; wingWidth: number | null | undefined;
  /** The side a widget already stands on (AM-D9): it keeps it while that wing has room. */
  prefer?: (id: string) => Side | undefined;
  /** Widgets that are only a short notice (a closed gate): always a compact plate. */
  slim?: (id: string) => boolean;
  /** Widgets made on request (not pinned): they lead their wing, newest first, whatever the pinned ones' sizes. */
  made?: (id: string) => boolean;
};

/**
 * The composition: every widget with its side, tier, row, height and span. Order in, order out (so `out[i]` is `widgets[i]`).
 * Sides: a widget keeps its side while it has room there; a new one takes the wing with fewer widgets (left on a tie).
 * What neither wing can hold rests on the band.
 */
export function composeStage(widgets: readonly NovaWidget[], {height, wingWidth, prefer, slim, made}: ComposeOptions): Composed[] {
  const capacity = wingCapacity(height, wingWidth), wings: Record<'left' | 'right', number[]> = {left: [], right: []}, sideOf = new Map<number, Side>();
  const kept = widgets.map(w => prefer?.(w.id)), load = {left: 0, right: 0};
  kept.forEach(side => { if (side === 'left' || side === 'right') load[side] += 1; });
  // Each wing's leading widget among those that keep their side (its place in the list; past the end when none will stand there).
  const leads = {left: Number.POSITIVE_INFINITY, right: Number.POSITIVE_INFINITY};
  kept.forEach((side, order) => { if ((side === 'left' || side === 'right') && order < leads[side]) leads[side] = order; });
  // The list is walked in order, so the most important widgets get the room: one that keeps its side takes it while the
  // wing has room and steps down to the band when it is full (S3; never across the star, AM-D9); a new one, and one that
  // stood on the band, takes the wing that will be the emptier, counting those still to come that keep their side.
  widgets.forEach((_, order) => {
    const want = kept[order];
    if (want === 'left' || want === 'right') load[want] -= 1;
    const room = (side: 'left' | 'right') => wings[side].length < capacity;
    let side: Side;
    if (want === 'left' || want === 'right') side = room(want) ? want : 'band'; // its wing is full: it steps down to the band, never across the star
    else {
      // A new widget arrives as a hero (S3) on the wing whose own hero is the older one, so the two newest requests are the
      // two heroes; an empty wing comes first; otherwise the emptier wing, left on a tie.
      const lead = (side: 'left' | 'right') => wings[side].length ? -1 : leads[side];
      const fewer = wings.left.length + load.left <= wings.right.length + load.right ? 'left' : 'right';
      const first = lead('left') !== lead('right') ? (lead('left') > lead('right') ? 'left' : 'right') : fewer, second = first === 'left' ? 'right' : 'left';
      side = room(first) ? first : room(second) ? second : 'band';
    }
    sideOf.set(order, side);
    if (side !== 'band') wings[side].push(order);
  });
  const out: Composed[] = widgets.map((w, order) => ({...w, side: sideOf.get(order)!, show: w.size, row: 0, height: 0, span: WING_COLUMNS, order}));
  for (const side of ['left', 'right'] as const) {
    const list = wings[side];
    if (!list.length) continue;
    // Within a wing: what was made on request leads (S3); among the pinned, a Large one is lifted to the front; a slim
    // notice goes last. Otherwise the list's order stands.
    const rank = (order: number) => { const w = widgets[order]!; return slim?.(w.id) ? 3 : made?.(w.id) ? 0 : w.size === 'L' ? 1 : 2; };
    const ordered = [...list].sort((a, b) => rank(a) - rank(b) || a - b);
    const largeHero = widgets[ordered[0]!]!.size === 'L' && !slim?.(widgets[ordered[0]!]!.id);
    let tiers = wingTiers(height, largeHero);
    // Rows are filled in tier order; a row with no widget is left out, so a wing with one widget is one hero.
    const rows: {tier: Tier; cells: number[]}[] = [];
    let at = 0;
    for (const tier of tiers) {
      const cells = ordered.slice(at, at + tierCells(tier, wingWidth));
      if (!cells.length) break;
      rows.push({tier, cells}); at += cells.length;
    }
    // A Large hero may have left less room than the capacity promised: what is left over goes to the band.
    for (const order of ordered.slice(at)) out[order] = {...out[order]!, side: 'band'};
    tiers = rows.map(r => r.tier);
    const h = typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : 580;
    const weight = (tier: Tier, i: number) => i === 0 && largeHero ? LARGE_HERO_WEIGHT : TIER_WEIGHT[tier];
    const total = tiers.reduce((sum, t, i) => sum + weight(t, i), 0);
    const unit = Math.max(TIER_UNIT_MIN, Math.min(TIER_UNIT_MAX, (h - (rows.length - 1) * TIER_GAP) / total));
    // A short stage (wingTiers' last resort): the plate keeps one least unit and the hero takes what is left.
    const short = rows.length === 2 && rows[1]!.tier === 'compact' && total * TIER_UNIT_MIN + TIER_GAP > h;
    const isSlim = (order: number) => !!slim?.(widgets[order]!.id);
    rows.forEach((r, i) => {
      const row = side === 'left' ? i + 1 : rows.length - i;
      // A hero is the Large body where the person made it Large, or where it is tall and its wing wide enough; otherwise
      // it is the Medium body, at most HERO_MEDIUM_MAX tall (a Medium body does not fill more).
      const roomy = largeHero || (typeof wingWidth === 'number' && wingWidth >= HERO_LARGE_WING);
      const full = short ? (r.tier === 'hero' ? Math.round(h - TIER_GAP - TIER_UNIT_MIN) : TIER_UNIT_MIN) : Math.round(weight(r.tier, i) * unit);
      const large = r.tier === 'hero' && (largeHero || (roomy && full >= HERO_LARGE_FROM));
      // A row that holds only short notices (a closed gate) is a plate's height whatever its place: a lock in a tall empty
      // box was round 1's fault.
      const px = r.cells.every(isSlim) ? Math.min(full, Math.round(Math.max(TIER_UNIT_MIN, Math.min(unit, 150)))) : r.tier === 'hero' && !large ? Math.min(full, HERO_MEDIUM_MAX) : full;
      const show: WidgetSize = r.tier === 'hero' ? (large ? 'L' : 'M') : r.tier === 'supporting' ? (px >= SUPPORTING_MEDIUM_FROM ? 'M' : 'S') : 'S';
      for (const order of r.cells) out[order] = {...out[order]!, tier: r.tier, show: isSlim(order) ? 'S' : show, row, height: px, span: WING_COLUMNS / r.cells.length};
    });
  }
  return out;
}

/** The wings as drawn: each side's widgets top to bottom, left to right (the document order, so Tab follows the eye). */
export function wingOrder(composed: readonly Composed[], side: 'left' | 'right'): Composed[] {
  return composed.filter(c => c.side === side).sort((a, b) => a.row - b.row || a.order - b.order);
}
/** Where a widget stands, in words for the status line. */
export function composedWords(composed: readonly Composed[], id: string): string {
  const at = composed.findIndex(c => c.id === id);
  if (at < 0) return '';
  const c = composed[at]!;
  return `${at + 1} of ${composed.length}, ${c.side === 'band' ? 'on the outer band' : `${c.side} wing`}`;
}

/* ---- "The star makes room" (ADR-041 S1, S2) ------------------------------------------------------------------------
 * The star's size follows how full the stage is. With one or two widgets it is the large star (at least 45 % of the
 * stage's width where the height allows); from three widgets on it steps down, and from `STAR_FULL_FROM` widgets it is
 * the size it had before this session ("never below its size on main"). Widgets never cover its bezel: the star's column
 * is as wide as the bezel plus a margin, and the wings share what is left (S1).
 */
export const STAR_LARGE_UNTIL = 2, STAR_FULL_FROM = 6;
/** The share of the way from the large star (0) to the floor (1) for this many widgets on the stage. */
export function starFill(count: number): number {
  if (!(count > STAR_LARGE_UNTIL)) return 0;
  return Math.min(1, (count - STAR_LARGE_UNTIL) / (STAR_FULL_FROM - STAR_LARGE_UNTIL));
}
/** The large star's column as a share of the stage; the bezel's width in its column and in the star's canvas; a wing's least width. */
export const STAR_LARGE_SHARE = 0.47, BEZEL_IN_COLUMN = 0.98, BEZEL_IN_STAR = 0.9, WING_MIN = 280, WING_ROWS_MIN = 328;
export type StarPlan = {size: number; column: number};
/**
 * The star's canvas size and its column's width beside widgets.
 * `floorSize`, `floorColumn`: what they were on `main` for this stage (the star never goes below them); `room`: the
 * largest canvas the stage's height allows; `stage`: the stage's width; `gap`: the gap between the three columns.
 * The large column is 47 % of the stage where both wings keep WING_MIN; the canvas is as large as its bezel needs
 * (never smaller than on `main`, where its arms dissolve toward the wings).
 */
export function starPlan({count, floorSize, floorColumn, room, stage, gap}: {count: number; floorSize: number; floorColumn: number; room: number; stage: number; gap: number}): StarPlan {
  const most = stage - 2 * WING_MIN - 2 * gap, tall = room * BEZEL_IN_STAR / BEZEL_IN_COLUMN;
  const large = Math.max(floorColumn, Math.min(stage * STAR_LARGE_SHARE, most, tall));
  // From three widgets a wing holds a supporting panel under its hero: it keeps WING_ROWS_MIN, the least width at which a
  // panel's head is one row (title and keys), so a 230 px supporting panel keeps its body for its instrument.
  const stepped = large + (floorColumn - large) * starFill(count);
  const column = count > STAR_LARGE_UNTIL ? Math.max(floorColumn, Math.min(stepped, stage - 2 * WING_ROWS_MIN - 2 * gap)) : stepped;
  return {size: Math.round(Math.max(floorSize, Math.min(room, column * BEZEL_IN_COLUMN / BEZEL_IN_STAR))), column: Math.round(column)};
}
