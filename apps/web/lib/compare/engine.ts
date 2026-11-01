import {habitDay, habitRuleOn, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {dailySeries, nightDay} from '../sleep/engine';
import {addLocalDays} from '../local-date';
import {formatDate, formatNumber} from '../visual-format';
import {healthGroupIn} from '../vault/w-homes';
import {wallClock} from '../zone-time';
import {CROSS_MIN_PER_SIDE, CROSS_WINDOW_DAYS, LABEL_WORDS, confidenceOf, deviceTime, habitShare, hoursMinutes, type CrossLabel} from '../insights/cross-pillar';

/**
 * Session AK (lane S, item 2; docs/research/session-ak/COMPETITORS.md (b) 2): "Does one thing go with another?" — the
 * person picks a factor (a habit done, a night or journal tag, a workout day, a fasting day, spending above an amount) and
 * an outcome (mood, energy, sleep, habit completion, steps, pleasant feeling words), on the same day or the next. The
 * rules are the cross-pillar ones (lib/insights/cross-pillar.ts) and nothing is loosened: the last 90 days of the
 * person's own records; at least 14 days on each side before any number is shown; a ready comparison needs its own
 * meaningful gap and a probability of superiority of 0.60 or more in the same direction (0.40 or less for a lower side),
 * and is "Consistent" only with 28 days a side and the same direction in both 45-day halves. The words say what happened
 * together, never why, and every result carries one thing that could explain the pairing without a cause.
 *
 * Unknown is not zero: a day without the records a side needs is left out of the comparison, never counted as "without".
 * Nothing is stored here; nothing leaves the device.
 */
export const OUTCOMES = ['mood', 'energy', 'sleep', 'habits', 'steps', 'feeling'] as const;
export type BaseOutcomeId = typeof OUTCOMES[number];
/** Session AK (BUILD list 2 #12): one of the person's own 1–5 scales (zigoals:scales:v1), as `scale:<id>`. */
export type ScaleOutcomeId = `scale:${string}`;
export type OutcomeId = BaseOutcomeId | ScaleOutcomeId;
export const isScaleOutcome = (id: string): id is ScaleOutcomeId => /^scale:[a-z0-9-]{1,24}$/.test(id);
export type Lag = 'same' | 'next';
export type FactorKind = 'habit' | 'sleep-tag' | 'journal-tag' | 'workout' | 'fasting' | 'spend' | 'scale' | 'cycle';
export type FactorOption = {id: string; kind: FactorKind; label: string; group: string};
export type OutcomeOption = {id: OutcomeId; label: string};

/** The records a comparison may read; each is optional, and one the person does not keep simply offers no factor. */
export type CompareSources = {
  habits?: HabitData | null;
  health?: HealthData | null;
  energy?: {days: Readonly<Record<string, {energy: number}>>; words?: Readonly<Record<string, {pleasantness: 'pleasant' | 'unpleasant'}>>} | null;
  journal?: {entries: readonly {date: string; tags?: readonly string[]}[]} | null;
  workouts?: {workouts: readonly {startedAt: string}[]} | null;
  /** The device fasting key's sessions (Health v2+ `fasting` is read from `health` too; the same id counts once). */
  fasting?: {sessions: readonly {id: string; endedAt: string | null; timeZone: string}[]} | null;
  money?: {entries: readonly {kind: string; amount: string; currency: string; date: string}[]} | null;
  localTime?: (iso: string) => {date: string; hour: number};
  /** Session AK (BUILD list 2 #12): the person's own 1–5 scales (removed ones keep their names in `retired`). */
  scales?: {scales: readonly {id: string; name: string; low: string; high: string}[]; retired?: readonly {id: string; name: string; low: string; high: string}[]; days: Readonly<Record<string, Readonly<Record<string, number>>>>} | null;
  /** Session AK (BUILD list 2 #16): the opt-in cycle log's days with a period logged (only when it is turned on). */
  cycle?: {periodDays: readonly string[]} | null;
};

/** Each outcome's meaningful gap (as the cross-pillar pairings: 0.4 points, 20 minutes, 10 percentage points). */
export const GAP: Readonly<Record<BaseOutcomeId, number>> = {mood: 0.4, energy: 0.4, sleep: 20, habits: 0.1, steps: 1000, feeling: 0.1};
export const OUTCOME_LABELS: Readonly<Record<BaseOutcomeId, string>> = {mood: 'Mood (1–5)', energy: 'Energy (1–5)', sleep: 'Time asleep', habits: 'Habit completion', steps: 'Steps', feeling: 'Pleasant feeling words'};
/** An outcome's meaningful gap; a person's own 1–5 scale uses mood's 0.4 points. */
export const gapOf = (outcome: OutcomeId): number => isScaleOutcome(outcome) ? 0.4 : GAP[outcome];
const scaleOf = (src: CompareSources | undefined, id: string) => src?.scales?.scales.find(s => s.id === id) ?? src?.scales?.retired?.find(s => s.id === id) ?? null;
/** An outcome's label; a scale by its own name ("Stress (1–5)"), or a plain fallback when it is gone. */
export const outcomeLabel = (outcome: OutcomeId, src?: CompareSources): string => isScaleOutcome(outcome) ? `${scaleOf(src, outcome.slice(6))?.name ?? 'Your scale'} (1–5)` : OUTCOME_LABELS[outcome];
export const CONFOUNDERS: Readonly<Record<FactorKind, string>> = {
  habit: 'a calm or a busy stretch can shape both the habit and the rest of the day',
  'sleep-tag': 'the evenings you tag may differ in other ways too, such as the day of the week',
  'journal-tag': 'what you write about may follow from the day rather than shape it',
  workout: 'you may plan workouts on days you already expect to go well',
  fasting: 'fasting days may also be days with a different routine',
  spend: 'paydays, weekends and plans with others can shape both',
  scale: 'a rating can reflect the same day it is compared with',
  cycle: 'other things change across the month as well, such as sleep and plans',
};
const MAX_TAGS = 20, MAX_HABITS = 60;

const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const daysBetween = (from: string, to: string) => { const out: string[] = []; for (let d = from; d <= to; d = addLocalDays(d, 1)) out.push(d); return out; };
const byUse = (counts: Map<string, number>) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, MAX_TAGS).map(([t]) => t);
export const compareWindow = (today: string) => ({start: addLocalDays(today, 1 - CROSS_WINDOW_DAYS), end: today});

function sleepNights(src: CompareSources) { return (src.health ? healthGroupIn(src.health, 'sleep')?.nights ?? [] : []).filter(n => n.kind === 'night' && n.end !== null); }
function fastingEnds(src: CompareSources): string[] {
  const seen = new Set<string>(), out: string[] = [];
  const healthFasting = (src.health as {fasting?: {sessions: readonly {id: string; endedAt: string | null; timeZone: string}[]}} | null | undefined)?.fasting?.sessions ?? [];
  for (const s of [...(src.fasting?.sessions ?? []), ...healthFasting]) {
    if (seen.has(s.id) || !s.endedAt) continue;
    seen.add(s.id);
    try { out.push(wallClock(Date.parse(s.endedAt), s.timeZone).date); } catch { /* an unreadable zone is left out */ }
  }
  return out;
}
const expenses = (src: CompareSources, from: string, to: string) => (src.money?.entries ?? []).filter(e => e.kind === 'expense' && e.date >= from && e.date <= to);
/** The spending factor's currency (the most used expense currency in the window) and a usual amount (the median day). */
export function spendBasis(src: CompareSources, today: string): {currency: string; usual: number} | null {
  const {start, end} = compareWindow(today), spent = expenses(src, start, end);
  const currency = [...spent.reduce((m, e) => m.set(e.currency, (m.get(e.currency) ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0];
  if (!currency) return null;
  const totals = new Map<string, number>(); for (const e of spent) if (e.currency === currency) totals.set(e.date, (totals.get(e.date) ?? 0) + Number(e.amount));
  const sorted = [...totals.values()].sort((a, b) => a - b);
  return {currency, usual: Math.round(sorted[Math.ceil(sorted.length / 2) - 1] ?? 0)};
}

/** The factors the person's own records can offer, grouped for the picker. */
export function factorOptions(src: CompareSources, today: string): FactorOption[] {
  const out: FactorOption[] = [], {start} = compareWindow(today);
  for (const h of (src.habits?.habits ?? []).filter(h => { const s = habitRuleOn(h, today)?.state; return s !== 'archived'; }).slice(0, MAX_HABITS))
    out.push({id: `habit:${h.id}`, kind: 'habit', label: `Did “${h.title}”`, group: 'Habits'});
  const sleepTags = new Map<string, number>();
  for (const n of sleepNights(src)) if ((nightDay(n) ?? '') >= start) for (const t of n.tags ?? []) sleepTags.set(t, (sleepTags.get(t) ?? 0) + 1);
  for (const t of byUse(sleepTags)) out.push({id: `sleep-tag:${t}`, kind: 'sleep-tag', label: `Night tagged “${t}”`, group: 'Sleep tags'});
  const journalTags = new Map<string, number>();
  for (const e of src.journal?.entries ?? []) if (e.date >= start) for (const t of e.tags ?? []) journalTags.set(t, (journalTags.get(t) ?? 0) + 1);
  for (const t of byUse(journalTags)) out.push({id: `journal-tag:${t}`, kind: 'journal-tag', label: `Journal tag “${t}”`, group: 'Journal tags'});
  if (src.workouts?.workouts.length) out.push({id: 'workout', kind: 'workout', label: 'Workout day', group: 'Days'});
  if (fastingEnds(src).length) out.push({id: 'fasting', kind: 'fasting', label: 'Fasting day (a fast ended)', group: 'Days'});
  if (spendBasis(src, today)) out.push({id: 'spend', kind: 'spend', label: 'Spending above an amount', group: 'Days'});
  // Session AK (#12): each of the person's own scales with a rating, as "rated 4 or 5" against "rated 1 to 3".
  for (const sc of src.scales?.scales ?? []) if (Object.values(src.scales!.days).some(d => d[sc.id] !== undefined)) out.push({id: `scale:${sc.id}`, kind: 'scale', label: `Rated “${sc.name}” 4 or 5 (toward “${sc.high}”)`, group: 'Your scales'});
  // Session AK (#16): a day with a period logged (only while the opt-in cycle log is on).
  if (src.cycle?.periodDays.length) out.push({id: 'cycle', kind: 'cycle', label: 'Period day (from your cycle log)', group: 'Days'});
  return out;
}
/** The outcomes with at least one recorded day. */
export function outcomeOptions(src: CompareSources): OutcomeOption[] {
  const moods = src.health ? healthGroupIn(src.health, 'moods')?.days ?? {} : {};
  const has: Record<OutcomeId, boolean> = {
    mood: Object.keys(moods).length > 0, energy: Object.keys(src.energy?.days ?? {}).length > 0, sleep: sleepNights(src).length > 0,
    habits: (src.habits?.habits.length ?? 0) > 0, steps: (src.health?.activity.length ?? 0) > 0, feeling: Object.keys(src.energy?.words ?? {}).length > 0,
  };
  const own = (src.scales?.scales ?? []).filter(sc => Object.values(src.scales!.days).some(d => d[sc.id] !== undefined)).map(sc => ({id: `scale:${sc.id}` as ScaleOutcomeId, label: `${sc.name} (1–5)`}));
  return [...OUTCOMES.filter(id => has[id]).map(id => ({id, label: OUTCOME_LABELS[id]})), ...own];
}

type DayTest = (d: string) => boolean | null;
type DayValue = (d: string) => number | null;
function factorTest(src: CompareSources, factor: FactorOption, today: string, amount: number | undefined): {test: DayTest; phrase: string} | null {
  const [kind, ...rest] = factor.id.split(':'), arg = rest.join(':');
  if (kind === 'habit') {
    const habit = src.habits?.habits.find(h => h.id === arg);
    if (!habit) return null;
    return {phrase: `On days you completed “${habit.title}”`, test: d => {
      if (d < habit.startDate) return null;
      const day = habitDay(habit, d, today);
      // Done is "with"; a scheduled day left undone is "without"; a skip, a rest day or today still open is neither.
      return day.status === 'complete' ? true : day.status === 'failed' || day.status === 'partial' ? false : null;
    }};
  }
  if (kind === 'sleep-tag') {
    const byDay = new Map<string, boolean>();
    for (const n of sleepNights(src)) { const d = nightDay(n); if (d) byDay.set(d, (byDay.get(d) ?? false) || (n.tags ?? []).includes(arg)); }
    return {phrase: `On days after a night you tagged “${arg}”`, test: d => byDay.get(d) ?? null};
  }
  if (kind === 'journal-tag') {
    const byDay = new Map<string, boolean>();
    for (const e of src.journal?.entries ?? []) byDay.set(e.date, (byDay.get(e.date) ?? false) || (e.tags ?? []).includes(arg));
    return {phrase: `On days you tagged a journal entry “${arg}”`, test: d => byDay.get(d) ?? null};
  }
  if (kind === 'workout') {
    const local = src.localTime ?? deviceTime, days = new Set((src.workouts?.workouts ?? []).map(w => local(w.startedAt).date));
    const first = [...days].sort()[0];
    return first ? {phrase: 'On days with a workout', test: d => d < first ? null : days.has(d)} : null;
  }
  if (kind === 'fasting') {
    const days = new Set(fastingEnds(src)), first = [...days].sort()[0];
    return first ? {phrase: 'On days a fast ended', test: d => d < first ? null : days.has(d)} : null;
  }
  if (kind === 'scale') {
    const sc = src.scales?.scales.find(x => x.id === arg);
    if (!sc) return null;
    // Rated 4 or 5 is "with"; rated 1 to 3 is "without"; a day not rated is neither (unknown, never a low rating).
    return {phrase: `On days you rated “${sc.name}” 4 or 5`, test: d => { const v = src.scales!.days[d]?.[arg]; return v === undefined ? null : v >= 4; }};
  }
  if (kind === 'cycle') {
    const sorted = [...new Set(src.cycle?.periodDays ?? [])].sort(), days = new Set(sorted), first = sorted[0], last = sorted.at(-1);
    // Between the first and the last logged period day, a day without one logged counts as "without"; before and after
    // that span a day is unknown (the person may not have been logging), never "without".
    return first && last ? {phrase: 'On period days', test: d => d < first || d > last ? null : days.has(d)} : null;
  }
  if (kind === 'spend') {
    const basis = spendBasis(src, today);
    if (!basis) return null;
    const limit = amount ?? basis.usual, logged = new Set((src.money?.entries ?? []).map(e => e.date)), totals = new Map<string, number>();
    for (const e of src.money?.entries ?? []) if (e.kind === 'expense' && e.currency === basis.currency) totals.set(e.date, (totals.get(e.date) ?? 0) + Number(e.amount));
    // Only days with something in the money log count: a day with nothing logged is unknown, not a day without spending.
    return {phrase: `On days you spent above ${formatNumber(limit)} ${basis.currency}`, test: d => logged.has(d) ? (totals.get(d) ?? 0) > limit : null};
  }
  return null;
}
function outcomeValue(src: CompareSources, outcome: OutcomeId, today: string, span = CROSS_WINDOW_DAYS + 3): DayValue {
  if (isScaleOutcome(outcome)) { const id = outcome.slice(6); return d => src.scales?.days[d]?.[id] ?? null; }
  if (outcome === 'mood') { const moods = src.health ? healthGroupIn(src.health, 'moods')?.days ?? {} : {}; return d => moods[d]?.mood ?? null; }
  if (outcome === 'energy') return d => src.energy?.days[d]?.energy ?? null;
  if (outcome === 'feeling') return d => { const w = src.energy?.words?.[d]; return w ? (w.pleasantness === 'pleasant' ? 1 : 0) : null; };
  if (outcome === 'sleep') {
    const series = src.health?.sleep ? dailySeries(src.health.sleep, addLocalDays(today, 1), span) : [];
    const ending = new Map(series.filter(p => p.asleep !== null).map(p => [p.date, p.asleep!]));
    return d => ending.get(addLocalDays(d, 1)) ?? null; // the night that follows the day
  }
  if (outcome === 'habits') return d => src.habits && d < today ? habitShare(src.habits, d, today) : null; // today is still open
  return d => src.health && d < today && src.health.activity.some(a => a.date === d) ? dailyHealthSummary(src.health, d).steps : null;
}
/**
 * Session AK (BUILD list 2 #8, lane B2a; Experiments): the same factor test and outcome as `compare`, day by day over
 * any span (an experiment and the days just before it), so an experiment never loosens or re-implements Compare's rules.
 * `a` is true (with), false (without) or null (neither: unknown, skipped, not yet started); `value` is the outcome on the
 * day it is measured (the same day, or the next with lag "next"), null when unknown or still to come. Null when the
 * factor is gone (a removed habit) or unknown to this build.
 */
export function daySample(src: CompareSources, factorId: string, outcome: OutcomeId, lag: Lag, today: string, from: string, to: string, amount?: number): {factor: FactorOption; phrase: string; days: {date: string; a: boolean | null; value: number | null}[]} | null {
  const kind = factorId.split(':')[0] as FactorKind;
  if (!(kind in CONFOUNDERS) || from > to) return null;
  const factor = factorOptions(src, today).find(f => f.id === factorId) ?? {id: factorId, kind, label: factorId, group: ''};
  const made = factorTest(src, factor, today, amount);
  if (!made) return null;
  const span = Math.max(CROSS_WINDOW_DAYS, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)) + 3;
  const value = outcomeValue(src, outcome, today, span);
  return {factor, phrase: made.phrase, days: daysBetween(from, to).map(d => {
    const target = lag === 'same' ? d : addLocalDays(d, 1), v = target > today ? null : value(target);
    return {date: d, a: made.test(d), value: v !== null && Number.isFinite(v) ? v : null};
  })};
}
/** One value in its outcome's own words ("3.8 of 5", "7 h 20 min", "64%", "8,210"). */
export function outcomeText(outcome: OutcomeId, v: number): string {
  if (outcome === 'mood' || outcome === 'energy' || isScaleOutcome(outcome)) return `${formatNumber(v, {minimumFractionDigits: 1, maximumFractionDigits: 1})} of 5`;
  if (outcome === 'sleep') return hoursMinutes(v);
  if (outcome === 'habits' || outcome === 'feeling') return pct(v);
  return formatNumber(Math.round(v));
}
function outcomeSay(outcome: OutcomeId, lag: Lag, v: string, src?: CompareSources): string {
  const when = lag === 'same' ? 'that day' : 'the next day';
  if (isScaleOutcome(outcome)) return `your “${scaleOf(src, outcome.slice(6))?.name ?? 'scale'}” rating ${when} averaged ${v}`;
  switch (outcome) {
    case 'mood': return `your mood ${when} averaged ${v}`;
    case 'energy': return `your energy ${when} averaged ${v}`;
    case 'sleep': return `you slept ${v} ${lag === 'same' ? 'that night' : 'the following night'} on average`;
    case 'habits': return `you completed ${v} of your scheduled habits ${when}`;
    case 'steps': return `you walked ${v} steps ${when} on average`;
    case 'feeling': return `the feeling word you picked ${when} was a pleasant one on ${v} of days`;
  }
}

export type CompareState = 'pending' | 'unclear' | 'ready';
export type CompareResult = {
  factor: FactorOption; outcome: OutcomeId; lag: Lag; window: {start: string; end: string};
  withDays: number; withoutDays: number; need: number; state: CompareState;
  /** The two averages, shown only once each side has its 14 days (null before). */
  withValue: number | null; withoutValue: number | null;
  label: CrossLabel | null; ps: number | null;
  /** The finding in plain words, only when ready. */
  sentence: string | null;
  /** "12 days with, 31 without". */
  counts: string; confounder: string; why: string;
};
/** One comparison over the last 90 days; null when the factor is gone (a habit removed, a tag no longer used). */
export function compare(src: CompareSources, factorId: string, outcome: OutcomeId, lag: Lag, today: string, amount?: number): CompareResult | null {
  const factor = factorOptions(src, today).find(f => f.id === factorId);
  if (!factor) return null;
  const made = factorTest(src, factor, today, amount);
  if (!made) return null;
  const window = compareWindow(today), mid = addLocalDays(window.start, CROSS_WINDOW_DAYS / 2), value = outcomeValue(src, outcome, today);
  const sample: {date: string; a: boolean; value: number}[] = [];
  for (const d of daysBetween(window.start, window.end)) {
    const target = lag === 'same' ? d : addLocalDays(d, 1);
    if (target > today) continue;
    const a = made.test(d);
    if (a === null) continue;
    const v = value(target);
    if (v === null || !Number.isFinite(v)) continue;
    sample.push({date: d, a, value: v});
  }
  const withV = sample.filter(s => s.a).map(s => s.value), withoutV = sample.filter(s => !s.a).map(s => s.value);
  const counts = `${withV.length} ${withV.length === 1 ? 'day' : 'days'} with, ${withoutV.length} without`;
  const confounder = CONFOUNDERS[factor.kind];
  const base = {factor, outcome, lag, window, withDays: withV.length, withoutDays: withoutV.length, need: CROSS_MIN_PER_SIDE, counts, confounder};
  const paired = `From your own records, ${formatDate(window.start)} to ${formatDate(window.end)}: ${counts}, paired by date${lag === 'next' ? ' (each day with the day after it)' : ''}. Days without the records a side needs are left out, never counted as zero.`;
  const caution = `Days that happened together are not proof that one brings the other; ${confounder}. It is not advice, and only you decide what to do with it.`;
  if (withV.length < CROSS_MIN_PER_SIDE || withoutV.length < CROSS_MIN_PER_SIDE)
    return {...base, state: 'pending', withValue: null, withoutValue: null, label: null, ps: null, sentence: null, why: `${paired} A comparison shows once each side has ${CROSS_MIN_PER_SIDE} days. ${caution}`};
  const withValue = mean(withV), withoutValue = mean(withoutV), {label, ps} = confidenceOf(sample, gapOf(outcome), mid);
  if (!label) return {...base, state: 'unclear', withValue, withoutValue, label: null, ps, sentence: null, why: `${paired} The two sides are close, so this is not a finding. ${caution}`};
  const sentence = `${made.phrase}, ${outcomeSay(outcome, lag, outcomeText(outcome, withValue), src)}; on other days, ${outcomeText(outcome, withoutValue)}.`;
  return {...base, state: 'ready', withValue, withoutValue, label, ps, sentence, why: `${paired} Label: ${LABEL_WORDS[label].label}. ${LABEL_WORDS[label].line} ${caution}`};
}
