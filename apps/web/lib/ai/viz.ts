import {plural} from './tools/format';
import {formatDate, formatNumber, withNumberLocale} from '../visual-format';
import {nlDate} from './local-answers/exact/period';
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
// Session AV lane 2 (fr-recheck, FR-TJ-4): the caption and the stat card write figures in the display locale (lib/visual-format.ts
// numberLocale), as the answer above them does: "5.750 mL in all" in nl-NL or en-NL, never en-US's "5,750" there.
const fmt = (n: number) => formatNumber(Number(n.toFixed(1)), {maximumFractionDigits: 1});
/**
 * Session AW (fr-answers, FR-AW-10): the caption, its figures' table and the stat card in the conversation's language. A
 * Dutch conversation read "Water per day: 4 days with a record from 30 Nov 2026…" under a Dutch answer; now "Water per
 * dag: 4 dagen met een registratie van 30 nov 2026…", with Dutch figures ("3.000 mL"), whatever the display locale.
 */
export type VizLang = 'en' | 'nl';
const TITLE_NL: readonly [RegExp, string][] = [[/^Water per day$/, 'Water per dag'], [/^Steps per day$/, 'Stappen per dag'], [/^Weight readings$/, 'Gewichtsmetingen'], [/^Check-ins per day$/, 'Check-ins per dag'], [/^Counts per day$/, 'Aantallen per dag'], [/^(.+) per day$/, '$1 per dag']];
const UNIT_NL: Record<string, string> = {steps: 'stappen', step: 'stap', times: 'keer', time: 'keer', minutes: 'minuten', minute: 'minuut', hours: 'uur', hour: 'uur', glasses: 'glazen', glass: 'glas', pages: 'pagina’s', page: 'pagina', sessions: 'sessies', session: 'sessie', liters: 'liter', liter: 'liter', 'check-ins': 'check-ins', 'check-in': 'check-in', days: 'dagen', day: 'dag', weeks: 'weken', week: 'week', months: 'maanden', month: 'maand'};
export const vizTitle = (title: string, lang: VizLang) => { if (lang !== 'nl') return title; for (const [re, nl] of TITLE_NL) if (re.test(title)) return title.replace(re, nl); return title; };
export const vizUnit = (unit: string, lang: VizLang) => lang === 'nl' ? UNIT_NL[unit] ?? unit : unit;
/** A day as the caption writes it: the app's date format in English ("Nov 30, 2026"), "30 nov 2026" in Dutch. */
export const vizDate = (iso: string, lang: VizLang) => lang === 'nl' ? nlDate(iso, null) : formatDate(iso);
/** A figure as the caption writes it: the display locale in English, the Dutch way in Dutch. */
export const vizNumber = (n: number, lang: VizLang) => lang === 'nl' ? withNumberLocale('nl-NL', () => fmt(n)) : fmt(n);
/** One plain sentence about a series, for the chart's caption and its accessible name. */
export function seriesSummary(series: Series, lang: VizLang = 'en'): string {
  const p = series.points, first = p[0]!, last = p.at(-1)!, u = vizUnit(series.unit, lang), unit = u ? ` ${u}` : '';
  const high = p.reduce((a, b) => b.value > a.value ? b : a), low = p.reduce((a, b) => b.value < a.value ? b : a);
  const f = (v: number) => vizNumber(v, lang), d = (iso: string) => vizDate(iso, lang), title = vizTitle(series.title, lang);
  if (lang === 'nl') {
    const days = `${f(p.length)} ${p.length === 1 ? 'dag' : 'dagen'} met een registratie van ${d(first.date)} tot ${d(last.date)}`;
    if (series.shape === 'line') return `${title}: ${days}, van ${f(first.value)}${unit} naar ${f(last.value)}${unit}; laagste ${f(low.value)}${unit} op ${d(low.date)}, hoogste ${f(high.value)}${unit} op ${d(high.date)}.`;
    return `${title}: ${days}, ${f(p.reduce((a, b) => a + b.value, 0))}${unit} in totaal, het meest ${f(high.value)}${unit} op ${d(high.date)}.`;
  }
  const days = `${plural(p.length, 'day')} with a record from ${formatDate(first.date)} to ${formatDate(last.date)}`;
  if (series.shape === 'line') return `${series.title}: ${days}, from ${fmt(first.value)}${unit} to ${fmt(last.value)}${unit}; lowest ${fmt(low.value)}${unit} on ${formatDate(low.date)}, highest ${fmt(high.value)}${unit} on ${formatDate(high.date)}.`;
  const total = p.reduce((a, b) => a + b.value, 0);
  return `${series.title}: ${days}, ${fmt(total)}${unit} in all, the most ${fmt(high.value)}${unit} on ${formatDate(high.date)}.`;
}
/**
 * The headline figure of a result, for a small stat card above the chart: a habit's total for the range, water and
 * steps in all, one counter's total. Only a known figure; "unknown" and mixed units are left to the words.
 */
export type Stat = {value: string; label: string; detail: string | null; source: string};
const plainCount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? formatNumber(n) : null;
const LABEL_NL: readonly [RegExp, string][] = [[/^Steps\b/, 'Stappen'], [/^Weight\b/, 'Gewicht'], [/\btoday$/, 'vandaag'], [/\byesterday$/, 'gisteren'], [/\bthis week$/, 'deze week'], [/\blast week$/, 'vorige week'], [/\bthis month$/, 'deze maand'], [/\blast month$/, 'vorige maand'], [/\bthe last (\d+) days$/, 'de afgelopen $1 dagen']];
const labelIn = (label: string, lang: VizLang) => lang === 'nl' ? LABEL_NL.reduce((s, [re, nl]) => s.replace(re, nl), label) : label;
/** A tool's "45 minutes", "3.5 glasses", "12 times" in Dutch ("45 minuten"); any other text as it is. */
const valueIn = (value: string, lang: VizLang) => {
  if (lang !== 'nl') return value;
  const run = /^(\d+) (\S+) now, best (\d+) (\S+)$/.exec(value.trim());
  if (run && UNIT_NL[run[2]!] && UNIT_NL[run[4]!]) return `nu ${vizNumber(Number(run[1]), 'nl')} ${UNIT_NL[run[2]!]}, beste ${vizNumber(Number(run[3]), 'nl')} ${UNIT_NL[run[4]!]}`;
  const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(value.trim().replace(/,/g, ''));
  return m && UNIT_NL[m[2]!] ? `${vizNumber(Number(m[1]), 'nl')} ${UNIT_NL[m[2]!]}` : value;
};
export function statOf(result: ToolResult, lang: VizLang = 'en'): Stat | null {
  if (!result.ok) return null;
  const d = result.data as Record<string, unknown>, days = (n: unknown, of: unknown) => typeof n === 'number' && typeof of === 'number' ? (lang === 'nl' ? `${n} van ${of} ${of === 1 ? 'dag' : 'dagen'} met een registratie` : `${n} of ${plural(of, 'day')} with a record`) : null;
  switch (result.tool) {
    case 'habit_stats': {
      const value = typeof d.valueText === 'string' ? d.valueText : null, range = d.days as Record<string, unknown> | undefined;
      if (!value || /^(unknown|mixed)/.test(value)) return null;
      // Session AW (fr-answers review): the figure, its label and "N check-ins over N days" in Dutch for a Dutch question.
      const detail = typeof d.checkIns === 'number' && typeof range?.inRange === 'number' ? (lang === 'nl' ? `${vizNumber(d.checkIns, 'nl')} ${d.checkIns === 1 ? 'check-in' : 'check-ins'} in ${vizNumber(range.inRange, 'nl')} ${range.inRange === 1 ? 'dag' : 'dagen'}` : `${plural(d.checkIns, 'check-in')} over ${plural(range.inRange, 'day')}`) : null;
      return {value: valueIn(value, lang), label: labelIn(result.label, lang), detail, source: result.provenance};
    }
    case 'water': { const ml = lang === 'nl' && typeof d.totalMl === 'number' ? vizNumber(d.totalMl, 'nl') : plainCount(d.totalMl); return ml ? {value: `${ml} mL`, label: labelIn(result.label, lang), detail: days(d.daysWithWater, d.daysInRange), source: result.provenance} : null; }
    case 'steps': { const steps = lang === 'nl' && typeof d.totalSteps === 'number' ? vizNumber(d.totalSteps, 'nl') : plainCount(d.totalSteps); return steps ? {value: `${steps} ${lang === 'nl' ? 'stappen' : 'steps'}`, label: labelIn(result.label, lang), detail: days(d.daysWithActivity, d.daysInRange), source: result.provenance} : null; }
    case 'counters': {
      const list = Array.isArray(d.counters) ? d.counters as Record<string, unknown>[] : [];
      if (list.length !== 1) return null;
      const total = lang === 'nl' && typeof list[0]!.total === 'number' ? vizNumber(list[0]!.total, 'nl') : plainCount(list[0]!.total), on = list[0]!.daysWithEntry;
      // Session AW (fr-answers review): "N keer", "op N dagen" for a Dutch question.
      return total ? {value: `${total} ${lang === 'nl' ? 'keer' : 'times'}`, label: labelIn(result.label, lang), detail: typeof on === 'number' ? (lang === 'nl' ? `op ${vizNumber(on, 'nl')} ${on === 1 ? 'dag' : 'dagen'}` : `on ${plural(on, 'day')}`) : null, source: result.provenance} : null;
    }
    default: return null;
  }
}
/** The first result with a headline figure. */
export function firstStat(results: readonly ToolResult[], lang: VizLang = 'en'): Stat | null {
  for (const result of results) { const stat = statOf(result, lang); if (stat) return stat; }
  return null;
}
