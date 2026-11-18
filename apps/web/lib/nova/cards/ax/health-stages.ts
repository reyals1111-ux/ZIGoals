import type {Period} from '../../../ai/local-answers/exact/period';
import type {Fasting} from '../../../fasting/schema';
import {clockFromMidnight, clockFromNoon, dailySeries, nightDay, nightsIn, summary} from '../../../sleep/engine';
import type {Sleep} from '../../../sleep/schema';
import {daysBetween} from '../../../ai/tools/range';
import {formatClock, formatDate, formatNumber, formatWeekday} from '../../../visual-format';
import {durationWords} from '../../widgets/words';
import {fastingCard, type FastingCard} from '../health-more';
import {periodLabel, widgetPeriod} from './calendar';
import {asOfDay} from './health-scan';
import type {AxWords} from './health-trend';

/**
 * Session AS (ADR-042 Part 2, family: stage bars): three instruments of upright bars, one bar a night or a fast.
 * - Sleep stages: deep, REM and core minutes of each night, where the night holds them (an import or a device link; a
 *   night logged by hand holds its times only). A night without stages is an unlit bar at its time asleep, never zeros.
 * - Sleep times: bedtime and wake time of each night as a floating bar on a 24-hour scale that runs from noon to noon.
 * - Fasting windows: the last fasts, each against its own target (Health's fasting timer: hours and a target only).
 */
export const STAGE_COLUMNS = 14;
const dayLabel = (date: string, many: boolean) => many ? String(Number(date.slice(8, 10))) : formatWeekday(date).slice(0, 3);
const span = (period: Period) => ({last: period.to, count: daysBetween(period.from, period.to) + 1});

export type StageNight = {date: string; label: string; asleep: number; deep: number | null; rem: number | null; core: number | null; staged: boolean; words: string};
export type StagesView = {
  period: Period;
  /** The newest nights of the period, fourteen at most, oldest first. */
  nights: StageNight[];
  /** Nights in the whole period, and how many of them hold stages. */
  logged: number; staged: number;
  /** A night's average of each stage over the nights that hold it; null when none does. */
  average: {deep: number | null; rem: number | null; core: number | null} | null;
  /** The longest night shown, in minutes (the scale). */
  max: number;
  words: AxWords;
};
const mean = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
export function sleepStages(sleep: Sleep, token: string | undefined, today: string): StagesView {
  const period = widgetPeriod(token, today, 'last-7-days'), {last, count} = span(period), label = periodLabel(period, today);
  const series = dailySeries(sleep, last, count).filter(p => p.asleep !== null && period.days.includes(p.date)), nights = nightsIn(sleep, last, count);
  const all = series.map((p): StageNight => {
    const on = nights.filter(n => nightDay(n) === p.date), sum = (key: 'deepMin' | 'remMin' | 'coreMin') => { const known = on.flatMap(n => { const minutes = n.stages?.[key]; return minutes === undefined ? [] : [minutes]; }); return known.length ? known.reduce((a, b) => a + b, 0) : null; };
    const deep = sum('deepMin'), rem = sum('remMin'), core = sum('coreMin'), staged = deep !== null || rem !== null || core !== null;
    const parts = [deep !== null ? `deep ${durationWords(deep)}` : '', rem !== null ? `REM ${durationWords(rem)}` : '', core !== null ? `core ${durationWords(core)}` : ''].filter(Boolean);
    return {date: p.date, label: '', asleep: p.asleep!, deep, rem, core, staged, words: `${durationWords(p.asleep!)} asleep; ${staged ? parts.join(', ') : 'stages not recorded'}`};
  });
  const shown = all.slice(-STAGE_COLUMNS).map(n => ({...n, label: dayLabel(n.date, all.length > 7)})), withStages = all.filter(n => n.staged);
  const of = (key: 'deep' | 'rem' | 'core') => mean(withStages.flatMap(n => n[key] === null ? [] : [n[key]]));
  const average = withStages.length ? {deep: of('deep'), rem: of('rem'), core: of('core')} : null;
  const avgWords = average ? [average.deep !== null ? `deep ${durationWords(average.deep)}` : '', average.rem !== null ? `REM ${durationWords(average.rem)}` : '', average.core !== null ? `core ${durationWords(average.core)}` : ''].filter(Boolean).join(' · ') : '';
  return {period, nights: shown, logged: all.length, staged: withStages.length, average, max: Math.max(1, ...shown.map(n => Math.max(n.asleep, (n.deep ?? 0) + (n.rem ?? 0) + (n.core ?? 0)))),
    words: {
      figure: String(withStages.length), unit: `of ${formatNumber(all.length)} ${all.length === 1 ? 'night' : 'nights'}`, label: `with sleep stages · ${label}`,
      note: average ? `A night on average: ${avgWords}` : 'These nights hold their times only; stages come with an import or a device link',
      asOf: `${label} · ${formatNumber(all.length)} ${all.length === 1 ? 'night' : 'nights'} logged`, caption: `Sleep stages, ${label}`,
      rows: [['Nights with stages', `${withStages.length} of ${all.length}`], ...(average ? [['A night on average', avgWords] as const] : []), ...shown.map(n => [formatDate(n.date, {weekday: true, year: false}), n.words] as const)],
    }};
}

/* ---- Sleep times ---- */
export type TimeNight = {date: string; label: string; /** Minutes after noon on the evening the night began, and at its end (bed < wake). */ bed: number; wake: number; bedText: string; wakeText: string};
export type TimesView = {
  period: Period; nights: TimeNight[]; logged: number;
  /** The averages over the whole period, as clock times. */
  bedText: string | null; wakeText: string | null;
  /** The person's own bedtime window, in minutes after noon; null without one. */
  window: {from: number; to: number; text: string} | null;
  words: AxWords;
};
const afterNoon = (clock: string) => { const [h, m] = clock.split(':').map(Number); return ((h! * 60 + m!) + 720) % 1440; };
export function sleepTimes(sleep: Sleep, token: string | undefined, today: string): TimesView {
  const period = widgetPeriod(token, today, 'last-7-days'), {last, count} = span(period), label = periodLabel(period, today);
  const points = dailySeries(sleep, last, count).filter(p => p.bed !== null && p.wake !== null && period.days.includes(p.date)), s = summary(points);
  const all = points.map((p): TimeNight => {
    // The wake time is minutes after midnight; on the noon-to-noon scale a morning is 12 hours on, and a night never ends before it began.
    const wake = (p.wake! + 720) % 1440, end = wake <= p.bed! ? 1440 : wake;
    return {date: p.date, label: '', bed: p.bed!, wake: end, bedText: formatClock(clockFromNoon(p.bed!)), wakeText: formatClock(clockFromMidnight(p.wake!))};
  });
  const nights = all.slice(-STAGE_COLUMNS).map(n => ({...n, label: dayLabel(n.date, all.length > 7)}));
  const bedText = s ? formatClock(clockFromNoon(s.bed)) : null, wakeText = s ? formatClock(clockFromMidnight(s.wake)) : null;
  const goal = sleep.goal?.bedFrom && sleep.goal.bedTo ? {from: afterNoon(sleep.goal.bedFrom), to: afterNoon(sleep.goal.bedTo), text: `${formatClock(sleep.goal.bedFrom)} to ${formatClock(sleep.goal.bedTo)}`} : null;
  // "11:35 PM": the clock is the figure and the half of the day its unit; a 24-hour clock is the figure alone.
  const [figure = '—', half] = (bedText ?? '—').split(/\s+/);
  return {period, nights, logged: all.length, bedText, wakeText, window: goal && goal.to > goal.from ? goal : null,
    words: {
      figure, ...(half ? {unit: half} : {}), label: `average bedtime · ${label}`,
      note: [wakeText ? `Average wake time ${wakeText}` : '', goal ? `your bedtime window: ${goal.text}` : ''].filter(Boolean).join(' · '),
      asOf: `${label} · ${formatNumber(all.length)} ${all.length === 1 ? 'night' : 'nights'} logged`, caption: `Bedtime and wake time, ${label}`,
      rows: [['Average bedtime', bedText ?? 'No night logged'], ['Average wake time', wakeText ?? 'No night logged'], ['Your bedtime window', goal ? goal.text : 'Not set'],
        ...nights.map(n => [`Night to ${formatDate(n.date, {weekday: true, year: false})}`, `to bed ${n.bedText}, up ${n.wakeText}`] as const)],
    }};
}

/* ---- Fasting windows ---- */
export type FastBar = {id: string; label: string; hours: number; hoursText: string; targetHours: number; reached: boolean; words: string};
export type FastsView = {
  card: FastingCard;
  /** The last ended fasts, five at most, oldest first. */
  bars: FastBar[];
  /** The longest of the fasts and their targets, in hours (the scale). */
  max: number;
  words: AxWords;
};
export const FAST_COLUMNS = 5;
export function fastingWindows(fasting: Fasting, now: Date, today: string): FastsView {
  const card = fastingCard(fasting, now, today, FAST_COLUMNS), run = card.running, last = card.history[0];
  const bars = [...card.history].reverse().map((h): FastBar => ({id: h.id, label: h.dayText, hours: h.hours, hoursText: h.hoursText, targetHours: h.targetHours, reached: h.reached, words: `${h.hoursText} of a ${h.targetHours} h target${h.reached ? ', target reached' : ''}`}));
  const running = run ? `A fast is running: ${run.elapsed} of ${run.targetHours} h` : 'No fast is running';
  const words: AxWords = last ? {
    figure: last.hoursText.replace(/\s*h$/, ''), unit: 'h', label: `last fast · started ${asOfDay(last.day, today)}`,
    note: `Target ${last.targetHours} h${last.reached ? ', reached' : ''} · ${run ? running : 'no fast is running'}`,
    asOf: `the last ${card.history.length === 1 ? 'fast' : `${card.history.length} fasts`} · hours and a target only`, caption: 'Fasting windows', rows: [],
  } : {figure: run ? `${Math.floor(run.elapsedMs / 3_600_000)}:${String(Math.floor(run.elapsedMs % 3_600_000 / 60_000)).padStart(2, '0')}` : '—', ...(run ? {unit: 'so far'} : {}), label: run ? `fasting now · target ${run.targetHours} h` : 'no fast finished yet', note: running, asOf: 'the clock updates each minute', caption: 'Fasting windows', rows: []};
  words.rows = [['Now', running], ...bars.map(b => [`Fast started ${b.label}`, b.words] as const)];
  return {card, bars, max: Math.max(1, ...bars.flatMap(b => [b.hours, b.targetHours])), words};
}
