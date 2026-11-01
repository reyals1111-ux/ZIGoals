import type {NovaLayout, NovaWidget, WidgetSize} from './store';

/**
 * Session AK (owner follow-up 2, N2; lane NA): where NOVA's widgets sit. Pure arithmetic, no DOM: the dashboard turns
 * the result into CSS grid placements and small offsets (components/nova/widget-grid.tsx).
 *
 * Orbit (wide screens): the NOVA star sits in the centre column; the widgets fill a left and a right column, balanced
 * by height (S is one row, M two, L three), and each panel leans in toward the star by how close it is to the star's
 * height, so the panels' inner edges trace a circle around it: a usable grid dressed as a star system. What does not fit
 * beside the star (more than `sideRows` rows on a side) rests on the outer orbit, a band under the star.
 * Bento: a dense grid (S 1×1, M 2×1, L 2×2). Focus: the star, the chat and the first three widgets. Minimal: the star,
 * the clock, the chat and the dock only. On phones every layout but Minimal is one swipeable row (the carousel).
 */
export const ROWS: Record<WidgetSize, number> = {S: 1, M: 2, L: 3};
export const BENTO_SPAN: Record<WidgetSize, {cols: number; rows: number}> = {S: {cols: 1, rows: 1}, M: {cols: 2, rows: 1}, L: {cols: 2, rows: 2}};
export const FOCUS_WIDGETS = 3;
/** Rows a side column holds beside the star before the rest go to the outer band (8 rows ≈ 8 × 92 px + gaps). */
export const SIDE_ROWS = 8;
/** The largest lean toward the star, in px, at full width (the dashboard scales it down on narrower screens). */
export const MAX_LEAN = 44;

export type Side = 'left' | 'right' | 'band';
export type Placed = NovaWidget & {
  side: Side;
  /** First grid row (1-based) in its side column; 0 in the band. */
  row: number;
  rows: number;
  /** How far (px, at full width) it leans in toward the star; 0 in the band. */
  lean: number;
  /** Its order in the opening sequence (0 settles first). */
  order: number;
};

/** The widgets a layout shows: Focus the first three, Minimal none, the others all. */
export function visibleFor(layout: NovaLayout, widgets: readonly NovaWidget[]): NovaWidget[] {
  if (layout === 'minimal') return [];
  return layout === 'focus' ? widgets.slice(0, FOCUS_WIDGETS) : [...widgets];
}

/**
 * The lean of a panel whose vertical centre sits `offset` rows from the star's centre, on an orbit of `radius` rows:
 * the circle's horizontal reach at that height (√(r² − y²)), relative to its reach at the column's top and bottom, so
 * the panel nearest the star's height leans in most and the outermost not at all. Bounded to 0…MAX_LEAN.
 */
export function leanAt(offset: number, radius: number, extent: number): number {
  if (!(radius > 0) || !Number.isFinite(offset) || !Number.isFinite(extent)) return 0;
  const reach = (y: number) => Math.sqrt(Math.max(0, radius * radius - y * y));
  const edge = reach(Math.min(Math.abs(extent), radius)), full = reach(0) - edge;
  if (full <= 0) return 0;
  const share = (reach(Math.min(Math.abs(offset), radius)) - edge) / full;
  return Math.round(Math.max(0, Math.min(1, share)) * MAX_LEAN);
}

/** Orbit placement: each widget, in order, to the side with fewer rows used (left on a tie) while it fits; else the band. */
export function placeOrbit(widgets: readonly NovaWidget[], sideRows = SIDE_ROWS): Placed[] {
  const used = {left: 0, right: 0}, out: Placed[] = [];
  widgets.forEach((w, order) => {
    const rows = ROWS[w.size];
    const first: 'left' | 'right' = used.left <= used.right ? 'left' : 'right', second = first === 'left' ? 'right' : 'left';
    const side: Side = used[first] + rows <= sideRows ? first : used[second] + rows <= sideRows ? second : 'band';
    if (side === 'band') { out.push({...w, side, row: 0, rows, lean: 0, order}); return; }
    out.push({...w, side, row: used[side] + 1, rows, lean: 0, order});
    used[side] += rows;
  });
  // Each column is centred on the star: a panel's offset is its centre's distance from the column's middle.
  for (const side of ['left', 'right'] as const) {
    const column = out.filter(p => p.side === side), height = used[side];
    if (!height) continue;
    const middle = height / 2, radius = Math.max(height / 2 + 1.5, 3);
    for (const p of column) p.lean = leanAt(p.row - 1 + p.rows / 2 - middle, radius, middle);
  }
  return out;
}

/** The rows each orbit column needs (the taller side sets the stage's height). */
export function orbitRows(placed: readonly Placed[]): number {
  const end = (side: Side) => Math.max(0, ...placed.filter(p => p.side === side).map(p => p.row - 1 + p.rows));
  return Math.max(end('left'), end('right'));
}

/**
 * The place a dragged widget lands on: the place of the widget it was dropped on (before it when moving up the order,
 * after it when moving down, which is the same index), or unchanged when dropped on itself or nowhere.
 */
export function dropPlace(order: readonly string[], dragged: string, target: string | null): number {
  const from = order.indexOf(dragged);
  if (from < 0) return -1;
  if (!target || target === dragged) return from;
  const to = order.indexOf(target);
  return to < 0 ? from : to;
}

/** The carousel's page after a step (wraps neither way: the first and last cards are ends, as on a phone's home screen). */
export const carouselStep = (index: number, by: -1 | 1, count: number): number => count <= 0 ? 0 : Math.max(0, Math.min(count - 1, index + by));
/** Which card is in view, from the scroller's position (the nearest card's start). */
export function carouselIndex(scrollLeft: number, cardWidth: number, gap: number, count: number): number {
  if (count <= 0 || !(cardWidth > 0)) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(scrollLeft / (cardWidth + Math.max(0, gap)))));
}
