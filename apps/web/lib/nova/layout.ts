import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
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
/**
 * Session AK P3 (NOVA_DESIGN_REVIEW.md ND-1, ND-2): the stage fits the window. A row is a height budget: a widget of size S
 * is at most one row tall, M two, L three (gaps included), and its card ends where its content ends. Each side column
 * beside the star holds as many rows as the stage's height allows; what does not fit rests on the outer band, under the
 * fold — the star never moves down.
 */
export const ROW_PX = 112;
export const ROW_GAP = 12;
export const MIN_SIDE_ROWS = 2;
export const MAX_SIDE_ROWS = 10;
/** The tallest a widget of each size may be, in px (its rows and the gaps between them). */
export const SIZE_MAX_PX: Record<WidgetSize, number> = {S: ROW_PX, M: ROW_PX * 2 + ROW_GAP, L: ROW_PX * 3 + ROW_GAP * 2};
/** The rows a side column holds in a stage of this height (px); SIDE_ROWS when the height is not known yet. */
export function rowsFit(stageHeight: number | null | undefined): number {
  if (typeof stageHeight !== 'number' || !Number.isFinite(stageHeight) || stageHeight <= 0) return SIDE_ROWS;
  return Math.max(MIN_SIDE_ROWS, Math.min(MAX_SIDE_ROWS, Math.floor((stageHeight + ROW_GAP) / (ROW_PX + ROW_GAP))));
}
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

/** Orbit placement: each widget, in order, to the side with fewer rows used (left on a tie) while it fits; else the band.
 *  `rows` is the rows each size takes (AK's cards: ROWS; the Holo look: HOLO_ROWS).
 *  Design review AM-D9: `prefer` names the side a widget already stands on. Those keep their side while it fits; a widget
 *  without one (a new one) is given room first, on the emptier side. So making, hiding, closing or pinning one widget never
 *  sends another across the star. Within a side the list's order stands. */
export function placeOrbit(widgets: readonly NovaWidget[], sideRows = SIDE_ROWS, rowsOf: Record<WidgetSize, number> = ROWS, prefer?: (id: string) => Side | undefined): Placed[] {
  const used = {left: 0, right: 0}, sides = new Map<number, Side>();
  const put = (order: number, rows: number, first: 'left' | 'right') => {
    const second = first === 'left' ? 'right' : 'left';
    const side: Side = used[first] + rows <= sideRows ? first : used[second] + rows <= sideRows ? second : 'band';
    sides.set(order, side);
    if (side !== 'band') used[side] += rows;
  };
  // A widget that stood nowhere before (a new one) is placed first, so it always gets room beside the star: it takes the
  // side that will be the emptier one once those that keep their side stand there. Then the others take their own side
  // while it still fits. One whose side is full, and one that stood in the band, take what room is left, else the band.
  const kept = widgets.map(w => prefer?.(w.id)), load = {left: 0, right: 0}, waiting: number[] = [];
  widgets.forEach((w, order) => { const side = kept[order]; if (side === 'left' || side === 'right') load[side] += rowsOf[w.size]; });
  widgets.forEach((w, order) => { if (!kept[order]) put(order, rowsOf[w.size], used.left + load.left <= used.right + load.right ? 'left' : 'right'); });
  widgets.forEach((w, order) => { const side = kept[order]; if (!side) return; if (side !== 'band' && used[side] + rowsOf[w.size] <= sideRows) put(order, rowsOf[w.size], side); else waiting.push(order); });
  for (const order of waiting) { const side = kept[order]!; put(order, rowsOf[widgets[order]!.size], side === 'band' ? (used.left <= used.right ? 'left' : 'right') : side); }
  const next = {left: 0, right: 0}, out: Placed[] = widgets.map((w, order) => {
    const rows = rowsOf[w.size], side = sides.get(order)!;
    if (side === 'band') return {...w, side, row: 0, rows, lean: 0, order};
    const row = next[side] + 1; next[side] += rows;
    return {...w, side, row, rows, lean: 0, order};
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

/**
 * Session AL review fixes (lane L8d; NOVA_HUD_REVIEW B1, B2, M2): the Holo look sizes its panels itself, so every
 * instrument is drawn whole (AK's caps cut the Goals pace line, half the Wealth panel and the Health histogram). A Holo
 * row ("unit") is as tall as the stage allows: the side columns hold as many units as fit at HOLO_UNIT_MIN, and the unit
 * then grows to fill the stage's height (up to HOLO_UNIT_MAX). S is one unit, M two, L four — the large panel is the hero:
 * a side column of its own beside the star, wider than the other (layout CSS). Each instrument drops whole rows to fit
 * its panel (container queries in holo-parts.css), never fading through a chart.
 */
export const HOLO_ROWS: Record<WidgetSize, number> = {S: 1, M: 2, L: 4};
export const HOLO_UNIT_MIN = 120, HOLO_UNIT_MAX = 168, HOLO_GAP = 12;
/** The Holo units a side column holds in a stage of this height (px); 4 while the height is not known yet. */
export function holoRowsFit(stageHeight: number | null | undefined): number {
  if (typeof stageHeight !== 'number' || !Number.isFinite(stageHeight) || stageHeight <= 0) return 4;
  return Math.max(MIN_SIDE_ROWS, Math.min(MAX_SIDE_ROWS, Math.floor((stageHeight + HOLO_GAP) / (HOLO_UNIT_MIN + HOLO_GAP))));
}
/** One Holo unit's height (px): the stage's height shared by the units that fit, within HOLO_UNIT_MIN…HOLO_UNIT_MAX. */
export function holoUnit(stageHeight: number | null | undefined, fit = holoRowsFit(stageHeight)): number {
  if (typeof stageHeight !== 'number' || !Number.isFinite(stageHeight) || stageHeight <= 0 || fit <= 0) return HOLO_UNIT_MIN;
  return Math.round(Math.max(HOLO_UNIT_MIN, Math.min(HOLO_UNIT_MAX, (stageHeight - (fit - 1) * HOLO_GAP) / fit)) * 10) / 10;
}
/** A Holo panel's height (px) for its size and the unit. */
export const holoHeight = (size: WidgetSize, unit: number): number => HOLO_ROWS[size] * unit + (HOLO_ROWS[size] - 1) * HOLO_GAP;
/** Which orbit columns hold a large panel (they widen, review M2). */
export function wideSides(placed: readonly Placed[]): 'left' | 'right' | 'both' | undefined {
  const left = placed.some(p => p.side === 'left' && p.size === 'L'), right = placed.some(p => p.side === 'right' && p.size === 'L');
  return left && right ? 'both' : left ? 'left' : right ? 'right' : undefined;
}
/**
 * Review m9 (lane L8d): the arrow keys on a grip in the orbit are spatial. Up and Down move a panel one place earlier or
 * later; Left and Right swap it with the panel level with it in the other column (the nearest by row), so it changes
 * column and nothing else. Null when there is no such panel (the band, or an empty column): the keys then move it one place.
 */
export function swapPartner(placed: readonly Placed[], id: string): string | null {
  const me = placed.find(p => p.id === id);
  if (!me || me.side === 'band') return null;
  const mid = me.row - 1 + me.rows / 2, other = placed.filter(p => p.side === (me.side === 'left' ? 'right' : 'left'));
  if (!other.length) return null;
  return other.reduce((best, p) => Math.abs(p.row - 1 + p.rows / 2 - mid) < Math.abs(best.row - 1 + best.rows / 2 - mid) ? p : best).id;
}
/** Where a panel sits, in words for the status line ("2 of 9, right column"). */
export function placeWords(placed: readonly Placed[], id: string): string {
  const at = placed.findIndex(p => p.id === id);
  if (at < 0) return '';
  const side = placed[at]!.side;
  return `${at + 1} of ${placed.length}, ${side === 'band' ? 'on the outer band' : `${side} column`}`;
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

/* ---- Session AL Part 11 (lane L8): the holographic HUD's own device record ------------------------------------------
 *
 * TIER 3 (stored format), additive: a NEW device-only key, `zigoals:nova-hud:v1`, beside NOVA's record (which keeps the
 * widgets and the layout exactly as before; older builds never read this key, and this build reads every older NOVA
 * record unchanged). It holds NOVA's look — "holo" (the default: the holographic HUD) or "classic" (AK's glass cards) —
 * and the last preset applied. Tolerant: a missing record, an unknown look or preset, or bytes that do not parse read as
 * the defaults; a read never writes. Shape: {version: 1, look?: 'holo' | 'classic', preset?: 'command' | 'health' |
 * 'wealth' | 'minimal'}.
 */
export const NOVA_HUD_KEY = 'zigoals:nova-hud:v1';
export const HUD_LOOKS = ['holo', 'classic'] as const;
export type HudLook = (typeof HUD_LOOKS)[number];
export const HUD_LOOK_LABEL: Record<HudLook, string> = {holo: 'Holo', classic: 'Classic'};
export const HUD_PRESETS = ['command', 'health', 'wealth', 'minimal'] as const;
export type HudPreset = (typeof HUD_PRESETS)[number];
export const HUD_PRESET_LABEL: Record<HudPreset, string> = {command: 'Command', health: 'Health HUD', wealth: 'Wealth HUD', minimal: 'Minimal'};
export const HUD_PRESET_ABOUT: Record<HudPreset, string> = {
  command: 'Every pillar around the star: health, habits, goals, wealth, your agenda, tasks, focus and briefs.',
  health: 'Your body first: the health HUD, water, sleep, habits and focus.',
  wealth: 'Your money first: the wealth and goals HUDs side by side, your bills and markets.',
  minimal: 'The star and three quiet widgets.',
};
export const novaHudSchema = z.looseObject({
  version: z.literal(1),
  look: z.enum(HUD_LOOKS).optional().catch(undefined),
  preset: z.enum(HUD_PRESETS).optional().catch(undefined),
});
export type NovaHud = z.infer<typeof novaHudSchema>;
export const emptyHud = (): NovaHud => ({version: 1});
export const NOVA_HUD: DeviceRecordSpec<NovaHud> = {key: NOVA_HUD_KEY, schema: novaHudSchema, empty: emptyHud};
/** The look in effect: Holo unless the person chose Classic. */
export const hudLookOf = (r: NovaHud): HudLook => r.look === 'classic' ? 'classic' : 'holo';
export const setHudLook = (r: NovaHud, look: HudLook): NovaHud => novaHudSchema.parse({...r, version: 1, look});
export const setHudPreset = (r: NovaHud, preset: HudPreset): NovaHud => novaHudSchema.parse({...r, version: 1, preset});

type PresetPlan = {layout: NovaLayout; widgets: {id: string; size: WidgetSize}[]};
/** What each preset puts on NOVA: a layout and its widgets, in orbit order (the first ones sit beside the star). */
export const HUD_PRESET_PLAN: Record<HudPreset, PresetPlan> = {
  // Review fixes (lane L8d, m15/M8): the Command preset is also the Showcase's and a brand-new NOVA's; Focus (a focus
  // timer is one of the HUD's quick actions) and NOVA's briefs (the day's morning brief and recap) join it.
  command: {layout: 'orbit', widgets: [{id: 'health-hud', size: 'M'}, {id: 'habits-hud', size: 'M'}, {id: 'goals-hud', size: 'M'}, {id: 'wealth-hud', size: 'M'}, {id: 'agenda-clock', size: 'M'}, {id: 'tasks', size: 'M'}, {id: 'orbit', size: 'M'}, {id: 'notes', size: 'S'}, {id: 'focus', size: 'S'}, {id: 'briefs', size: 'S'}]},
  health: {layout: 'orbit', widgets: [{id: 'health-hud', size: 'L'}, {id: 'habits-hud', size: 'M'}, {id: 'water', size: 'S'}, {id: 'sleep', size: 'S'}, {id: 'focus', size: 'S'}, {id: 'agenda-clock', size: 'M'}]},
  // Review fixes (lane L8d, m15, partial "dot sliders"): the money preset's two heroes — Wealth and Goals (its pace line and
  // the next goals' dot sliders) — without Goal pace, which repeated the Goals HUD.
  wealth: {layout: 'orbit', widgets: [{id: 'wealth-hud', size: 'L'}, {id: 'goals-hud', size: 'L'}, {id: 'money', size: 'M'}, {id: 'markets', size: 'M'}, {id: 'tasks', size: 'S'}]},
  minimal: {layout: 'focus', widgets: [{id: 'orbit', size: 'M'}, {id: 'agenda-clock', size: 'M'}, {id: 'water', size: 'S'}]},
};
/** A preset's widgets as NOVA stores them, keeping only those `available` here (a market watch needs Markets in use). */
export function presetWidgets(preset: HudPreset, available: (id: string) => boolean = () => true): NovaWidget[] {
  return HUD_PRESET_PLAN[preset].widgets.filter(w => available(w.id)).map((w, slot) => ({...w, slot}));
}
/** The preset the stage shows right now, or null once the person has changed anything (a layout, a widget, a size, the order). */
export function presetShown(layout: NovaLayout, widgets: readonly NovaWidget[], available: (id: string) => boolean = () => true): HudPreset | null {
  for (const preset of HUD_PRESETS) {
    const want = presetWidgets(preset, available);
    if (HUD_PRESET_PLAN[preset].layout === layout && want.length === widgets.length && want.every((w, i) => widgets[i]?.id === w.id && widgets[i]?.size === w.size)) return preset;
  }
  return null;
}
/** One column on a phone (Holo): every widget the layout shows, in order (Minimal: none, the star alone). */
export const phoneColumn = (layout: NovaLayout, widgets: readonly NovaWidget[]): NovaWidget[] => visibleFor(layout, widgets);
