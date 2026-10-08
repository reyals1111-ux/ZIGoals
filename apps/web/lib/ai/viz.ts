import type {ToolResult} from './tools/types';

/**
 * The figures ZIGi may draw (Session V Part 10): a day-by-day series taken from a tool's own result (water, steps,
 * a habit's check-ins, one counter, weight readings), never from words an AI wrote. A value the records do not know
 * (a check-in that Health filled in while Health is not shared, a skipped day, a missing count) is left out, never
 * drawn as zero. Only the days with a record are drawn; the caption says so.
 */
export type SeriesPoint = {date: string; value: number};
/** `line` for readings (weight), where a total means nothing; `bars` for amounts per day. */
export type Series = {title: string; unit: string; points: SeriesPoint[]; shape: 'bars' | 'line'};
export const MAX_POINTS = 31;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const numberOf = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
const rowsOf = (v: unknown): Record<string, unknown>[] => Array.isArray(v) ? v.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object') : [];
function points(rows: readonly Record<string, unknown>[], value: (row: Record<string, unknown>) => number | null): SeriesPoint[] {
  // One point per day: a later row of the same day replaces an earlier one (the tools list them in date order).
  const byDay = new Map<string, number>();
  for (const row of rows) { const v = value(row); if (isDay(row.date) && v !== null) byDay.set(row.date, v); }
  return [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({date, value: v})).slice(-MAX_POINTS);
}
const field = (key: string) => (row: Record<string, unknown>) => numberOf(row[key]);
/** "72.4 kg" → 72.4 (the weight tool writes readings in the person's unit). */
const reading = (row: Record<string, unknown>) => { const m = typeof row.weight === 'string' ? /^(-?\d+(?:\.\d+)?)\s*(kg|lb)$/.exec(row.weight.trim()) : null; return m ? Number(m[1]) : null; };
export function seriesOf(result: ToolResult): Series | null {
  if (!result.ok) return null;
  const d = result.data as Record<string, unknown>;
  switch (result.tool) {
    case 'water': return {title: 'Water per day', unit: 'mL', points: points(rowsOf(d.perDay), field('ml')), shape: 'bars'};
    case 'steps': return {title: 'Steps per day', unit: 'steps', points: points(rowsOf(d.perDay), field('steps')), shape: 'bars'};
    case 'habit_checkins': {
      const rows = rowsOf(d.checkIns), units = new Set(rows.map(r => typeof r.unit === 'string' ? r.unit : ''));
      // A habit whose unit changed in the range has no single scale to draw.
      if (units.size > 1) return null;
      return {title: `${typeof d.habit === 'string' ? d.habit : 'Check-ins'} per day`, unit: [...units][0] ?? '', points: points(rows, field('value')), shape: 'bars'};
    }
    case 'counters': {
      const rows = rowsOf(d.perDay), names = new Set(rows.map(r => r.counter));
      if (names.size !== 1) return null;
      return {title: `${typeof rows[0]?.counter === 'string' ? rows[0].counter : 'Counts'} per day`, unit: 'times', points: points(rows, field('count')), shape: 'bars'};
    }
    case 'weight': return {title: 'Weight readings', unit: typeof d.unit === 'string' ? d.unit : '', points: points(rowsOf(d.readings), reading), shape: 'line'};
    default: return null;
  }
}
/** The first result with at least two days to draw. */
export function firstSeries(results: readonly ToolResult[]): Series | null {
  for (const result of results) { const series = seriesOf(result); if (series && series.points.length >= 2) return series; }
  return null;
}
const fmt = (n: number) => Number(n.toFixed(1)).toLocaleString('en-US');
/** One plain sentence about a series, for the chart's caption and its accessible name. */
export function seriesSummary(series: Series): string {
  const p = series.points, first = p[0]!, last = p.at(-1)!, unit = series.unit ? ` ${series.unit}` : '';
  const high = p.reduce((a, b) => b.value > a.value ? b : a), low = p.reduce((a, b) => b.value < a.value ? b : a);
  const days = `${plural(p.length, 'day')} with a record from ${first.date} to ${last.date}`;
  if (series.shape === 'line') return `${series.title}: ${days}, from ${fmt(first.value)}${unit} to ${fmt(last.value)}${unit}; lowest ${fmt(low.value)}${unit} on ${low.date}, highest ${fmt(high.value)}${unit} on ${high.date}.`;
  const total = p.reduce((a, b) => a + b.value, 0);
  return `${series.title}: ${days}, ${fmt(total)}${unit} in all, the most ${fmt(high.value)}${unit} on ${high.date}.`;
}
/**
 * The headline figure of a result, for a small stat card above the chart: a habit's total for the range, water and
 * steps in all, one counter's total. Only a known figure; "unknown" and mixed units are left to the words.
 */
export type Stat = {value: string; label: string; detail: string | null; source: string};
const plainCount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US') : null;
export function statOf(result: ToolResult): Stat | null {
  if (!result.ok) return null;
  const d = result.data as Record<string, unknown>, days = (n: unknown, of: unknown) => typeof n === 'number' && typeof of === 'number' ? `${n} of ${plural(of, 'day')} with a record` : null;
  switch (result.tool) {
    case 'habit_stats': {
      const value = typeof d.valueText === 'string' ? d.valueText : null, range = d.days as Record<string, unknown> | undefined;
      if (!value || /^(unknown|mixed)/.test(value)) return null;
      return {value, label: result.label, detail: typeof d.checkIns === 'number' && typeof range?.inRange === 'number' ? `${plural(d.checkIns, 'check-in')} over ${plural(range.inRange, 'day')}` : null, source: result.provenance};
    }
    case 'water': { const ml = plainCount(d.totalMl); return ml ? {value: `${ml} mL`, label: result.label, detail: days(d.daysWithWater, d.daysInRange), source: result.provenance} : null; }
    case 'steps': { const steps = plainCount(d.totalSteps); return steps ? {value: `${steps} steps`, label: result.label, detail: days(d.daysWithActivity, d.daysInRange), source: result.provenance} : null; }
    case 'counters': {
      const list = Array.isArray(d.counters) ? d.counters as Record<string, unknown>[] : [];
      if (list.length !== 1) return null;
      const total = plainCount(list[0]!.total);
      return total ? {value: `${total} times`, label: result.label, detail: typeof list[0]!.daysWithEntry === 'number' ? `on ${plural(list[0]!.daysWithEntry, 'day')}` : null, source: result.provenance} : null;
    }
    default: return null;
  }
}
/** The first result with a headline figure. */
export function firstStat(results: readonly ToolResult[]): Stat | null {
  for (const result of results) { const stat = statOf(result); if (stat) return stat; }
  return null;
}
