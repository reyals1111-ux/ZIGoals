import {healthTrack} from '../../../ai/local-answers/exact/health';
import {previousPeriod, type Period} from '../../../ai/local-answers/exact/period';
import {tally} from '../../../ai/local-answers/exact/series';
import type {Domain} from '../../../ai/local-answers/exact/types';
import type {HealthData} from '../../../health';
import {formatDate} from '../../../visual-format';
import type {Workouts} from '../../../workouts/schema';
import {periodLabel, widgetPeriod} from './calendar';
import {latestPoint} from './health-scan';
import type {AxWords} from './health-trend';

/**
 * Session AS (ADR-042 Part 2, family: twins): one measure of Health in a period beside the period just before it (the
 * same days of the one before for a period that is still running: lib/ai/local-answers/exact/period.ts
 * `previousPeriod`), from the exact layer's own track, as the answer to "this week against last week" counts it: a total
 * for what adds up (water, steps, minutes), a day's average for a level (sleep, weight, resting heart rate). A side with
 * nothing logged is unknown, never zero; the difference is said in words and never judged.
 */
export const COMPARE_REFS = ['water', 'steps', 'sleep', 'calories', 'protein', 'workouts', 'meditation', 'weight', 'vitals'] as const;
export type CompareRef = (typeof COMPARE_REFS)[number];
export const compareRef = (ref: string | undefined): CompareRef => (COMPARE_REFS as readonly string[]).includes(ref ?? '') ? ref as CompareRef : 'steps';
export type CompareSide = {label: string; text: string; value: number | null};
export type CompareView = {
  ref: CompareRef; name: string; period: Period; before: Period | null;
  now: CompareSide; was: CompareSide;
  /** The difference in words; null when a side has nothing logged. */
  delta: string | null;
  /** Whether the measure holds anything at all (looking back a year). */
  any: boolean; words: AxWords;
};
const cap = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`;
export function healthCompare(ref: string | undefined, health: HealthData, workouts: Workouts | null | undefined, token: string | undefined, today: string): CompareView {
  const key = compareRef(ref), track = healthTrack(key as Domain, health, workouts, today)!, m = track.measure!, level = m.kind === 'level';
  const period = widgetPeriod(token, today, 'this-week'), before = previousPeriod(period, today), label = periodLabel(period, today);
  const side = (p: Period | null, name: string): CompareSide => {
    if (!p) return {label: name, text: 'no earlier period', value: null};
    const T = tally(track.points(p.days)), value = T.valued ? (level ? T.total / T.valued : T.total) : null;
    const events = track.events && value !== null ? `${track.events.word(track.events.count(p.days), 'en')} · ` : '';
    return {label: name, value, text: value === null ? 'nothing logged' : `${events}${m.text(value, 'en')}${level ? ' on average' : ''}`};
  };
  const range = before ? (before.from === before.to ? formatDate(before.from, {year: false}) : `${formatDate(before.from, {year: false})} – ${formatDate(before.to, {year: false})}`) : '';
  const now = side(period, cap(label)), was = side(before, before ? `Before · ${range}` : 'Before');
  const diff = now.value !== null && was.value !== null ? now.value - was.value : null;
  const same = diff !== null && m.text(Math.abs(diff), 'en') === m.text(0, 'en');
  const delta = diff === null ? null : same ? 'The same as the period before' : `${m.text(Math.abs(diff), 'en')} ${diff > 0 ? 'more' : 'less'} than the period before`;
  const value = now.value === null ? null : m.text(now.value, 'en'), at = value?.lastIndexOf(' ') ?? -1;
  // "7 h 12 min" keeps its first figure large and the rest as its unit; "8,800 steps" splits at its unit.
  const [figure, unit]: [string, string] = value === null ? ['—', ''] : /^\d+ h \d/.test(value) ? [value.slice(0, value.indexOf(' ')), value.slice(value.indexOf(' ') + 1)] : at < 0 ? [value, ''] : [value.slice(0, at), value.slice(at + 1)];
  return {ref: key, name: track.name, period, before, now, was, delta, any: latestPoint(track, today) !== null, words: {
    figure, ...(unit ? {unit} : {}), label: `${track.name.toLowerCase()}${level ? (key === 'sleep' ? ', a night on average' : ' on average') : ''} · ${label}`,
    note: delta ?? (now.value === null ? `Nothing logged ${label}` : before ? 'Nothing logged in the period before' : 'No earlier period to set beside it'),
    asOf: before ? `${label} beside ${range}` : label, caption: `${track.name}: ${label} beside the period before`,
    rows: [[now.label, now.text], [was.label, was.text], ['Difference', delta ?? 'Not said: a side has nothing logged']],
  }};
}
