import {habitDay, habitRuleOn, logHabitValue, smartDoneValue, type HabitData} from '../habits';
import {formatMeasureValue, ruleMet} from '../habit-health-links/engine';
import type {HabitHealthLinkV4, HealthMeasureV4} from '../habit-health-links/schema';
import {formatNumber} from '../visual-format';
import {MAX_AUTO_APPLIED, SOURCE_UNIT, autoRulesSchema, validAutoRuleSchema, type AutoApplied, type AutoRule, type AutoRules, type AutoSource} from './schema';

/**
 * Session AK (5.6): the pure engine of auto-complete rules. It takes plain values (lib/auto-rules/sources.ts reads them
 * from the stores) and never touches storage.
 *
 * - Health sources (steps, sleep, water, active minutes) are judged by AH's own `ruleMet` (lib/habit-health-links/engine.ts)
 *   through the same link shape, so "at least" and "recorded" mean exactly what a Health link means.
 * - Unknown is not zero: a source with nothing recorded (null or absent) never meets a rule.
 * - Never double-counts: a habit is ticked only while its day is still open (due or partly done); a day that is complete
 *   stays as it is; a day AH already ticked from Health, or that any rule ticked or the person undid, is left alone; one
 *   tick per habit and day even when several rules match. The tick sets the day to its target, never adds to it.
 */
export type WorkoutReading = {minutes: number; type: 'strength' | 'cardio' | 'mobility' | 'sport' | 'other'};
export type ContributionReading = {goalId: string; amount: number};
/** One day's values; null or absent means nothing was recorded (or the store has not loaded), never zero. */
export type DaySources = {
  steps?: number | null; sleepMinutes?: number | null; waterMl?: number | null; activeMinutes?: number | null;
  workouts?: readonly WorkoutReading[] | null;
  contributions?: readonly ContributionReading[] | null;
};
const HEALTH_MEASURE: Partial<Record<AutoSource, HealthMeasureV4>> = {steps: 'steps', sleep: 'sleepMinutes', water: 'water', 'active-minutes': 'activeMinutes'};
export const isHealthSource = (source: AutoSource) => HEALTH_MEASURE[source] !== undefined;
/** A Health-source rule as AH's link (sleep hours become minutes, as AH's sleep links keep them); null for the other sources. */
export function healthLinkOf(rule: Pick<AutoRule, 'source' | 'comparator' | 'threshold' | 'createdAt'>): HabitHealthLinkV4 | null {
  const measure = HEALTH_MEASURE[rule.source];
  if (!measure) return null;
  const target = rule.threshold === undefined ? undefined : rule.source === 'sleep' ? Math.round(rule.threshold * 60) : rule.threshold;
  return {version: 1, measure, rule: rule.comparator, ...(rule.comparator === 'at-least' && target !== undefined ? {target} : {}), updatedAt: rule.createdAt};
}
/** The value a rule reads from the day: null when nothing was recorded. Workouts: a count for "recorded", minutes for "at least". */
export function sourceValue(rule: Pick<AutoRule, 'source' | 'comparator' | 'goalId' | 'workoutType'>, day: DaySources): number | null {
  const known = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v) ? null : v;
  switch (rule.source) {
    case 'steps': return known(day.steps);
    case 'sleep': return known(day.sleepMinutes);
    case 'water': return known(day.waterMl);
    case 'active-minutes': return known(day.activeMinutes);
    case 'workout': {
      if (!day.workouts) return null;
      const mine = day.workouts.filter(w => !rule.workoutType || w.type === rule.workoutType);
      if (!mine.length) return null;
      return rule.comparator === 'recorded' ? mine.length : mine.reduce((t, w) => t + Math.max(0, w.minutes), 0);
    }
    case 'contribution': {
      if (!day.contributions || !rule.goalId) return null;
      const mine = day.contributions.filter(c => c.goalId === rule.goalId && c.amount > 0);
      return mine.length ? mine.reduce((t, c) => t + c.amount, 0) : null;
    }
  }
}
export function ruleSatisfied(rule: AutoRule, value: number | null): boolean {
  if (value === null || rule.paused) return false;
  const link = healthLinkOf(rule);
  if (link) return ruleMet(link, value);
  return rule.comparator === 'recorded' ? value > 0 : rule.threshold !== undefined && rule.threshold > 0 && value >= rule.threshold;
}

/** A habit's day as the engine needs it: open (due or partly done, a build habit) and what is logged now. */
export type HabitDayState = {open: boolean; count: number};
const OPEN: ReadonlySet<string> = new Set(['due', 'partial']);
export function habitDayState(data: Pick<HabitData, 'habits'>, habitId: string, date: string): HabitDayState | null {
  const habit = data.habits.find(h => h.id === habitId);
  if (!habit) return null;
  const rule = habitRuleOn(habit, date);
  if (!rule) return null;
  const day = habitDay(habit, date, date);
  return {open: rule.type === 'build' && OPEN.has(day.status), count: day.count ?? 0};
}
export type AutoTick = {ruleId: string; habitId: string; date: string; source: AutoSource; value: number};
const appliedOn = (applied: readonly {habitId: string; date: string}[], habitId: string, date: string) => applied.some(a => a.habitId === habitId && a.date === date);
/**
 * The ticks to make now on the habit day `date`. `healthApplied` is AH's markers (a day Health ticked is never ticked
 * again by a rule); `days` says, per habit, whether its day is open.
 */
export function proposeAutoTicks({record, date, sources, days, healthApplied = []}: {record: AutoRules; date: string; sources: DaySources; days: Readonly<Record<string, HabitDayState | null>>; healthApplied?: readonly {habitId: string; date: string}[]}): AutoTick[] {
  const out: AutoTick[] = [], taken = new Set<string>();
  for (const rule of record.rules) {
    if (rule.paused || taken.has(rule.habitId)) continue;
    if (appliedOn(record.applied, rule.habitId, date) || appliedOn(healthApplied, rule.habitId, date)) continue;
    if (!days[rule.habitId]?.open) continue;
    const value = sourceValue(rule, sources);
    if (!ruleSatisfied(rule, value)) continue;
    taken.add(rule.habitId);
    out.push({ruleId: rule.id, habitId: rule.habitId, date, source: rule.source, value: value!});
  }
  return out;
}
/** The open-day state of every habit a rule names, from the journal. */
export function ruleHabitDays(record: AutoRules, data: Pick<HabitData, 'habits'>, date: string): Record<string, HabitDayState | null> {
  return Object.fromEntries([...new Set(record.rules.map(r => r.habitId))].map(id => [id, habitDayState(data, id, date)]));
}
/**
 * Writes one tick as an ordinary logged entry at the day's target (what the card's Complete button writes), checking on
 * the latest data that the day is still open; returns null (and nothing changes) otherwise. The marker carries the value
 * before, for Undo.
 */
export function applyAutoTick(data: HabitData, tick: AutoTick, now = new Date()): {data: HabitData; marker: AutoApplied} | null {
  const state = habitDayState(data, tick.habitId, tick.date);
  const habit = data.habits.find(h => h.id === tick.habitId), rule = habit && habitRuleOn(habit, tick.date);
  if (!state?.open || !rule) return null;
  const wrote = smartDoneValue(rule);
  const next = logHabitValue(data, tick.habitId, tick.date, wrote, {}, now);
  return {data: next, marker: {ruleId: tick.ruleId, habitId: tick.habitId, date: tick.date, source: tick.source, value: tick.value, before: state.count, wrote, appliedAt: now.toISOString()}};
}
/**
 * Undo: the day goes back to what it held before the tick, only while it still holds exactly what the tick wrote (a
 * later manual change is the person's own and stays). Returns the data unchanged otherwise.
 */
export function undoAutoTick(data: HabitData, marker: AutoApplied, now = new Date()): HabitData {
  const habit = data.habits.find(h => h.id === marker.habitId);
  const entry = habit?.entries.find(e => e.date === marker.date);
  if (!habit || !entry || entry.disposition !== 'logged' || entry.count !== marker.wrote) return data;
  return logHabitValue(data, marker.habitId, marker.date, marker.before, {}, now);
}

// Record mutators: pure, each validates the result.
export function recordAutoTick(record: AutoRules, marker: AutoApplied): AutoRules {
  if (appliedOn(record.applied, marker.habitId, marker.date)) return record;
  if (record.applied.length >= MAX_AUTO_APPLIED) throw Error(`This device keeps ${MAX_AUTO_APPLIED} automatic ticks at most. Export everything, then clear old ones to make room.`);
  return autoRulesSchema.parse({...record, applied: [...record.applied, marker]});
}
export function markAutoTickUndone(record: AutoRules, habitId: string, date: string): AutoRules {
  if (!appliedOn(record.applied, habitId, date)) return record;
  return autoRulesSchema.parse({...record, applied: record.applied.map(a => a.habitId === habitId && a.date === date ? {...a, undone: true as const} : a)});
}
export const autoTickOn = (record: AutoRules, habitId: string, date: string): AutoApplied | undefined => record.applied.find(a => a.habitId === habitId && a.date === date);
/**
 * Adds or replaces a rule (by id). A Health-source rule on a habit that already has an AH Health link is refused: one
 * automatic Health source per habit, so the two can never race for the same day.
 */
export function setAutoRule(record: AutoRules, rule: AutoRule, {healthLinkedHabitIds = new Set<string>()}: {healthLinkedHabitIds?: ReadonlySet<string>} = {}): AutoRules {
  const parsed = validAutoRuleSchema.parse(rule);
  if (isHealthSource(parsed.source) && healthLinkedHabitIds.has(parsed.habitId)) throw Error('This habit already ticks itself off from Health. Change that link in the habit instead.');
  const exists = record.rules.some(r => r.id === parsed.id);
  return autoRulesSchema.parse({...record, rules: exists ? record.rules.map(r => r.id === parsed.id ? parsed : r) : [...record.rules, parsed]});
}
export const removeAutoRule = (record: AutoRules, ruleId: string): AutoRules => autoRulesSchema.parse({...record, rules: record.rules.filter(r => r.id !== ruleId)});
/** Rules for habits (or goals) no longer there are dropped; markers stay (they describe days already written). */
export function pruneAutoRules(record: AutoRules, habitIds: ReadonlySet<string>, goalIds?: ReadonlySet<string>): AutoRules {
  const rules = record.rules.filter(r => habitIds.has(r.habitId) && (!goalIds || r.source !== 'contribution' || goalIds.has(r.goalId!)));
  return rules.length === record.rules.length ? record : autoRulesSchema.parse({...record, rules});
}
/** What a new rule names (its id, unit and start are added). Spelled out: Omit over a loose record's type loses its keys. */
export type AutoRuleInput = Pick<AutoRule, 'source' | 'comparator' | 'habitId'> & Partial<Pick<AutoRule, 'threshold' | 'goalId' | 'workoutType' | 'paused'>>;
/** A new rule with its fixed unit. */
export function newAutoRule(input: AutoRuleInput, now = new Date(), id: string = crypto.randomUUID()): AutoRule {
  return validAutoRuleSchema.parse({...input, id, unit: SOURCE_UNIT[input.source], createdAt: now.toISOString()});
}

// Words.
const n = (value: number, digits = 0) => formatNumber(value, {maximumFractionDigits: digits});
const workoutWord = (type?: AutoRule['workoutType']) => type ? `${type} workout` : 'workout';
/** The rule as a plain sentence: "When steps ≥ 8,000 → Walk is done". */
export function ruleSentence(rule: Pick<AutoRule, 'source' | 'comparator' | 'threshold' | 'workoutType'>, habitTitle: string, goalName = 'the goal'): string {
  const t = rule.threshold ?? 0, at = rule.comparator === 'at-least';
  const when = (() => {
    switch (rule.source) {
      case 'steps': return at ? `steps ≥ ${n(t)}` : 'steps are recorded';
      case 'sleep': return at ? `sleep ≥ ${n(t, 2)} h` : 'a night’s sleep is logged';
      case 'water': return at ? `water ≥ ${n(t)} mL` : 'water is logged';
      case 'active-minutes': return at ? `active minutes ≥ ${n(t)}` : 'active minutes are recorded';
      case 'workout': return at ? `${workoutWord(rule.workoutType)}s ≥ ${n(t)} min` : `a ${workoutWord(rule.workoutType)} is logged`;
      case 'contribution': return at ? `contributions to ${goalName} ≥ ${n(t, 8)}` : `a contribution to ${goalName} is logged`;
    }
  })();
  return `When ${when} → ${habitTitle} is done`;
}
const SOURCE_NAME: Record<AutoSource, string> = {steps: 'steps', sleep: 'sleep', water: 'water', 'active-minutes': 'active minutes', workout: 'a workout', contribution: 'a contribution'};
/** What a tick says on the habit: "auto · from steps · 8,800 steps". */
export function autoTickLabel(marker: {source: AutoSource; value: number; undone?: true}, {goalName, waterUnit = 'ml'}: {goalName?: string; waterUnit?: 'ml' | 'fl-oz-us'} = {}): string {
  if (marker.undone) return 'Undone · no rule ticks it again today';
  const measure = HEALTH_MEASURE[marker.source];
  const value = measure ? formatMeasureValue(measure, marker.value, waterUnit)
    : marker.source === 'workout' ? '' : goalName ? `to ${goalName}` : '';
  return ['auto', `from ${SOURCE_NAME[marker.source]}`, value].filter(Boolean).join(' · ');
}
