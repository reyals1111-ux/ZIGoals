import {dailyHealthSummary, type HealthData} from '../../health';
import {addLocalDays} from '../../local-date';
import {formatDate, formatNumber, formatWeekday} from '../../visual-format';
import type {WidgetRange} from '../stage/record';
import {shareOf} from '../widgets/words';
import {asOfWords, rangeOf, shortDate, type CardRange} from './weight';

/**
 * Session AM (ADR-038): the figures of the "Steps" widget NOVA makes on request. A day's steps are the Health page's own
 * total (lib/health.ts dailyHealthSummary: the sum of that day's activity entries, as the Activity view, Today's health
 * card and NOVA's `steps` tool count them), against the step target the person set under Targets.
 *
 * Unknown is not zero: a day counts only when an activity entry of that day carries steps. A day with nothing logged, or
 * with only a workout's minutes, is a gap (null) in the chart and "—" in words; the average is over the logged days and
 * says how many those are.
 */
export type StepsDay = {date: string; steps: number | null; text: string};
export type StepsCard = {
  window: CardRange;
  days: StepsDay[];
  /** Today's steps, null when none were logged today. */
  today: {steps: number | null; text: string; share: number | null; note: string | null};
  target: {steps: number; text: string} | null;
  /** The mean of the logged days in the range, rounded to a whole step. */
  average: {steps: number; text: string} | null;
  best: {date: string; steps: number; text: string} | null;
  logged: {days: number; of: number; text: string; atTarget: number | null};
  /** The chart: one value a day (null: a gap), the weekday letters under a week, the first and last day under a longer range. */
  values: (number | null)[];
  weekdays: string[];
  edges: {min?: string; max?: string; dates: [string, string]};
  /** The newest day with steps, in the range or before it; null when no steps were ever logged. */
  latest: string | null;
  asOf: string | null;
};

/** Each day's steps from the activity entries that carry steps (one pass; the same sum as dailyHealthSummary's). */
export function stepsByDay(data: Pick<HealthData, 'activity'>): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of data.activity) if (a.steps > 0) out.set(a.date, (out.get(a.date) ?? 0) + a.steps);
  return out;
}

export function stepsCard(data: HealthData, day: string, range?: WidgetRange): StepsCard {
  const window = rangeOf(range, day, 'week'), byDay = stepsByDay(data), goal = data.targets.steps ?? null;
  const days: StepsDay[] = Array.from({length: window.days}, (_, i) => {
    const date = addLocalDays(window.from, i), steps = byDay.get(date) ?? null;
    return {date, steps, text: steps === null ? 'No steps logged' : formatNumber(steps)};
  });
  // Today's figure is the Health page's own day summary; it is shown only when an entry of today carries steps.
  const todaySteps = byDay.has(day) ? dailyHealthSummary(data, day).steps : null;
  const known = days.filter((d): d is StepsDay & {steps: number} => d.steps !== null), total = known.reduce((t, d) => t + d.steps, 0);
  const mean = known.length ? Math.round(total / known.length) : null, best = known.length ? known.reduce((a, d) => d.steps > a.steps ? d : a) : null, low = known.length ? known.reduce((a, d) => d.steps < a.steps ? d : a) : null;
  const left = goal !== null && todaySteps !== null ? goal - todaySteps : null;
  let latest: string | null = null;
  for (const date of byDay.keys()) if (date <= day && (latest === null || date > latest)) latest = date;
  return {
    window, days,
    today: {
      steps: todaySteps, text: todaySteps === null ? '—' : formatNumber(todaySteps), share: todaySteps === null ? null : shareOf(todaySteps, goal),
      note: todaySteps === null ? 'No steps logged today' : left === null ? null : left > 0 ? `${formatNumber(left)} to go` : 'Target reached',
    },
    target: goal === null ? null : {steps: goal, text: formatNumber(goal)},
    average: mean === null ? null : {steps: mean, text: formatNumber(mean)},
    best: best ? {date: best.date, steps: best.steps, text: formatNumber(best.steps)} : null,
    logged: {days: known.length, of: window.days, text: `${formatNumber(known.length)} of ${formatNumber(window.days)} days logged`, atTarget: goal === null ? null : known.filter(d => d.steps >= goal).length},
    values: days.map(d => d.steps),
    weekdays: days.map(d => formatWeekday(d.date).slice(0, 2)),
    edges: {
      ...(low && !(goal !== null && goal < low.steps) ? {min: formatNumber(low.steps)} : {}),
      ...(best && !(goal !== null && goal > best.steps) ? {max: formatNumber(best.steps)} : {}),
      dates: [shortDate(window.from, day), 'Today'],
    },
    latest, asOf: asOfWords(latest, day),
  };
}

/** The same figures as text, for the widget's table. A long range lists its logged days only (and says how many). */
export function stepsRows(card: StepsCard, day: string): (readonly [string, string])[] {
  const listed = card.window.days <= 31 ? card.days : card.days.filter(d => d.steps !== null);
  return [
    ['Steps today', card.today.steps === null ? 'No steps logged today' : `${card.today.text}${card.target ? ` of ${card.target.text}` : ''}${card.today.note ? ` (${card.today.note})` : ''}`],
    ['Your step target', card.target ? `${card.target.text} a day` : 'Not set'],
    [`Average a day in ${card.window.words}`, card.average ? `${card.average.text} (${card.logged.text})` : 'No steps logged'],
    ...(card.best ? [['Most steps in a day', `${card.best.text}, ${shortDate(card.best.date, day)}`] as const] : []),
    ...(card.logged.atTarget !== null && card.logged.days ? [['Days at your target', `${formatNumber(card.logged.atTarget)} of ${formatNumber(card.logged.days)} logged`] as const] : []),
    ...listed.map(d => [formatDate(d.date, {weekday: true, year: false}), d.text] as const),
  ];
}
