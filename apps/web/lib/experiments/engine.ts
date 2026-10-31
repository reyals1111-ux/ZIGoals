import {addLocalDays} from '../local-date';
import {formatDate} from '../visual-format';
import {CONFOUNDERS, GAP, OUTCOMES, daySample, outcomeText, type CompareSources, type FactorKind, type FactorOption, type Lag, type OutcomeId} from '../compare/engine';
import {CROSS_MIN_PER_SIDE, LABEL_WORDS, confidenceOf, type CrossLabel} from '../insights/cross-pillar';
import {DEFAULT_LENGTH, EXPERIMENT_LENGTHS, MAX_EXPERIMENTS, experimentsSchema, type Experiment, type Experiments} from './store';

/**
 * Session AK (BUILD list 2 #8, lane B2a): Experiments ("Try it for 14 days"). The person picks a change to try (an
 * existing habit, a sleep or journal tag, workout days, fasting days), one outcome and a length of 14, 21 or 28 days;
 * the days just before are the baseline, of the same length. The result uses Compare's own day test and outcome
 * (lib/compare daySample) and its own confidence rule (confidenceOf, the same 14 days a side and the same labels):
 * - "with": a day of the experiment on which the change happened, with the outcome recorded;
 * - "without": a baseline day on which it did not happen (or did not exist yet), with the outcome recorded;
 * - every other day is left out, never counted as zero.
 * The words say what happened together over these weeks, never why; a stretch of weeks can differ in other ways too.
 * 7-day runs are not offered: no 7-day run can reach Compare's 14 days a side. Nothing is stored here.
 */
export const EXPERIMENT_FACTOR_KINDS: readonly FactorKind[] = ['habit', 'sleep-tag', 'journal-tag', 'workout', 'fasting'];
export {DEFAULT_LENGTH, EXPERIMENT_LENGTHS};
const OUTCOME_WORDS: Readonly<Record<OutcomeId, string>> = {mood: 'your mood averaged', energy: 'your energy averaged', sleep: 'you slept on average', habits: 'you completed of your scheduled habits', steps: 'you walked on average', feeling: 'a pleasant feeling word was picked on'};
const say = (outcome: OutcomeId, v: number) => {
  const t = outcomeText(outcome, v);
  switch (outcome) {
    case 'habits': return `you completed ${t} of your scheduled habits`;
    case 'steps': return `you walked ${t} steps on average`;
    case 'feeling': return `a pleasant feeling word was picked on ${t} of days`;
    default: return `${OUTCOME_WORDS[outcome]} ${t}`;
  }
};
export const SPAN_NOTE = 'A few weeks can differ in other ways too, such as the season, the weather or a busy month.';

export type ExperimentPhase = 'upcoming' | 'running' | 'finished';
export type ExperimentDates = {baselineStart: string; baselineEnd: string; start: string; plannedEnd: string; end: string; phase: ExperimentPhase; day: number; endedEarly: boolean};
/** The experiment's days: the baseline, the planned last day, the actual last day so far, and where today falls. */
export function experimentDates(x: Pick<Experiment, 'start' | 'days' | 'endedAt'>, today: string): ExperimentDates {
  const plannedEnd = addLocalDays(x.start, x.days - 1), endedEarly = !!x.endedAt && x.endedAt < plannedEnd;
  const stop = endedEarly ? x.endedAt! : plannedEnd;
  const phase: ExperimentPhase = today < x.start ? 'upcoming' : today > stop || (x.endedAt !== undefined && x.endedAt <= today) ? 'finished' : 'running';
  const end = phase === 'finished' ? stop : today < x.start ? x.start : today;
  const day = today < x.start ? 0 : Math.min(x.days, Math.round((Date.parse(`${(today < stop ? today : stop)}T12:00:00Z`) - Date.parse(`${x.start}T12:00:00Z`)) / 86_400_000) + 1);
  return {baselineStart: addLocalDays(x.start, -x.days), baselineEnd: addLocalDays(x.start, -1), start: x.start, plannedEnd, end, phase, day, endedEarly};
}

export type ExperimentResult = {
  experiment: Experiment; dates: ExperimentDates; factor: FactorOption | null; outcome: OutcomeId | null;
  /** 'gone': the factor or outcome is no longer in the records (a habit removed) or unknown to this build. */
  state: 'gone' | 'pending' | 'unclear' | 'ready';
  withDays: number; withoutDays: number; need: number; counts: string;
  withValue: number | null; withoutValue: number | null; label: CrossLabel | null; ps: number | null;
  sentence: string | null; confounder: string | null; why: string;
};
const count = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
export function experimentResult(src: CompareSources, x: Experiment, today: string): ExperimentResult {
  const dates = experimentDates(x, today), lag: Lag = x.lag ?? 'same';
  const outcome = (OUTCOMES as readonly string[]).includes(x.outcome) ? x.outcome as OutcomeId : null;
  const base = {experiment: x, dates, need: CROSS_MIN_PER_SIDE, withValue: null, withoutValue: null, label: null, ps: null, sentence: null};
  const sample = outcome ? daySample(src, x.factor, outcome, lag, today, dates.baselineStart, dates.end) : null;
  if (!outcome || !sample || !(EXPERIMENT_FACTOR_KINDS as readonly string[]).includes(sample.factor.kind))
    return {...base, factor: sample?.factor ?? null, outcome, state: 'gone', withDays: 0, withoutDays: 0, counts: '', confounder: null, why: 'What this experiment followed is no longer in your records, so there is nothing to compare. The experiment itself stays until you remove it.'};
  const rows: {date: string; a: boolean; value: number}[] = [];
  for (const d of sample.days) {
    if (d.value === null) continue;
    if (d.date >= x.start && d.date <= dates.end && dates.phase !== 'upcoming') { if (d.a === true) rows.push({date: d.date, a: true, value: d.value}); }
    else if (d.date <= dates.baselineEnd && d.a !== true) rows.push({date: d.date, a: false, value: d.value});
  }
  const withV = rows.filter(r => r.a).map(r => r.value), withoutV = rows.filter(r => !r.a).map(r => r.value);
  const counts = `${count(withV.length)} with, ${withoutV.length} without`, confounder = CONFOUNDERS[sample.factor.kind];
  const span = `From your own records: the ${count(x.days)} before ${formatDate(x.start)} without it, and the experiment's days with it${dates.endedEarly ? ` (ended early, on ${formatDate(x.endedAt!)})` : ''}: ${counts}. Days without the records a side needs are left out, never counted as zero.`;
  const caution = `Days that happened together are not proof that one brings the other; ${confounder}. ${SPAN_NOTE} It is not advice, and only you decide what to do with it.`;
  const out = {...base, factor: sample.factor, outcome, withDays: withV.length, withoutDays: withoutV.length, counts, confounder};
  if (withV.length < CROSS_MIN_PER_SIDE || withoutV.length < CROSS_MIN_PER_SIDE)
    return {...out, state: 'pending', why: `${span} A result shows once each side has ${CROSS_MIN_PER_SIDE} days, as in Compare${dates.phase === 'finished' ? '; this one ended with fewer, so there is not enough to say' : ''}. ${caution}`};
  const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const withValue = mean(withV), withoutValue = mean(withoutV), {label, ps} = confidenceOf(rows, GAP[outcome], x.start);
  if (!label) return {...out, state: 'unclear', withValue, withoutValue, ps, why: `${span} The two sides are close, so this is not a finding. ${caution}`};
  const sentence = `On the days you tried it, ${say(outcome, withValue)}${lag === 'next' ? ' (measured the next day)' : ''}; on the days before, without it, ${outcomeText(outcome, withoutValue)}.`;
  return {...out, state: 'ready', withValue, withoutValue, label, ps, sentence, why: `${span} Label: ${LABEL_WORDS[label].label}. ${LABEL_WORDS[label].line} ${caution}`};
}

/** A new experiment, starting today unless another day is given; the oldest finished one makes way past the cap. */
export function startExperiment(rec: Experiments, input: {id: string; title: string; factor: string; outcome: OutcomeId; lag?: Lag; days?: number; start: string}, today: string): Experiments {
  const days = (EXPERIMENT_LENGTHS as readonly number[]).includes(input.days ?? DEFAULT_LENGTH) ? input.days ?? DEFAULT_LENGTH : DEFAULT_LENGTH;
  let items = [...rec.items];
  if (items.length >= MAX_EXPERIMENTS) {
    const oldest = items.map((x, i) => ({x, i})).filter(({x}) => experimentDates(x, today).phase === 'finished').sort((a, b) => a.x.start.localeCompare(b.x.start))[0];
    if (!oldest) throw new Error(`At most ${MAX_EXPERIMENTS} experiments; end or remove one first.`);
    items.splice(oldest.i, 1);
  }
  items = [...items, {id: input.id, title: input.title.trim().slice(0, 80), factor: input.factor, outcome: input.outcome, ...(input.lag && input.lag !== 'same' ? {lag: input.lag} : {}), start: input.start, days}];
  return experimentsSchema.parse({...rec, items});
}
/** Ends a running experiment today (its last day is today); a finished one is left as it is. */
export const endExperiment = (rec: Experiments, id: string, today: string): Experiments => experimentsSchema.parse({...rec, items: rec.items.map(x => x.id === id && experimentDates(x, today).phase !== 'finished' ? {...x, endedAt: today < x.start ? x.start : today} : x)});
export const removeExperiment = (rec: Experiments, id: string): Experiments => experimentsSchema.parse({...rec, items: rec.items.filter(x => x.id !== id)});
export const noteExperiment = (rec: Experiments, id: string, note: string): Experiments => experimentsSchema.parse({...rec, items: rec.items.map(x => { if (x.id !== id) return x; const next = {...x}; if (note.trim()) next.note = note.trim().slice(0, 500); else delete next.note; return next; })});
