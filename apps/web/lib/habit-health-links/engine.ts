import {habitCalendarDay, habitDay, habitRuleOn, logHabitValue, smartDoneValue, type HabitData} from '../habits';
import {dailyHealthSummary, type HealthData} from '../health';
import {dailyData, healthDay, waterSummary} from '../health-daily';
import {latestWeightObservation} from '../body-measurements';
import {countOn, exerciseData} from '../health-counters';
import type {AppliedCheckInV4, HabitHealthLinkV4, HabitHealthLinksV4, HealthMeasureV4} from './schema';
import {healthGroupIn} from '../vault/w-homes';
import {asleep, bedClock, nightDay} from '../sleep/engine';
import {minutesOn as meditationMinutesOn} from '../meditation/stats';
import type {SleepNight} from '../sleep/schema';
import {formatNumber} from '../visual-format';

/** The ended nights (not naps) of a Health day: the nights that ended on it, by their own zone (Session W Part 4). */
const nightsEnding = (health: HealthData, healthDate: string): SleepNight[] => (healthGroupIn(health, 'sleep')?.nights ?? []).filter(n => n.kind === 'night' && n.end !== null && nightDay(n) === healthDate);
/** Minutes after noon, so a bedtime around midnight compares in order (23:00 → 660, 00:30 → 750). */
const afterNoon = (minutesAfterMidnight: number) => (minutesAfterMidnight + 720) % 1440;

/** The Health journal's value for a link on one of its days, or null when nothing was recorded (never zero). */
export function measureValue(health: HealthData, healthDate: string, link: HabitHealthLinkV4): number | null {
  switch (link.measure) {
    case 'water': { const water = waterSummary(health, healthDate); return water.entries > 0 ? water.millilitres : null; }
    case 'steps': return health.activity.some(a => a.date === healthDate) ? dailyHealthSummary(health, healthDate).steps : null;
    case 'activeMinutes': return health.activity.some(a => a.date === healthDate) ? dailyHealthSummary(health, healthDate).minutes : null;
    case 'weight': return health.weights.some(w => w.date === healthDate) || latestWeightObservation(health, healthDate)?.date === healthDate ? 1 : null;
    case 'exercise': return link.exerciseId && exerciseData(health).counters.some(c => c.id === link.exerciseId) ? countOn(health, link.exerciseId, healthDate) : null;
    // Session W Part 4: time asleep over the nights that ended on the day; the bedtime of the longest of them.
    case 'sleepMinutes': { const nights = nightsEnding(health, healthDate); return nights.length ? nights.reduce((t, n) => t + asleep(n)!.minutes, 0) : null; }
    case 'bedtimeBy': { const nights = nightsEnding(health, healthDate); if (!nights.length) return null; const main = nights.reduce((a, b) => Date.parse(b.end!) - Date.parse(b.start) > Date.parse(a.end!) - Date.parse(a.start) ? b : a); return bedClock(main); }
    // Session W Part 5: the minutes of the sessions that began on the day, each by its own zone.
    case 'meditationMinutes': { const m = healthGroupIn(health, 'meditation'); return m ? meditationMinutesOn(m, healthDate) : null; }
  }
}
/** Nothing recorded never satisfies a rule; "recorded" needs a value above zero; "at least" needs the target. */
export function ruleMet(link: HabitHealthLinkV4, value: number | null): boolean {
  if (value === null) return false;
  // "In bed by": the bedtime (minutes after noon) at or before the target time.
  if (link.rule === 'by') return link.target !== undefined && value <= afterNoon(link.target);
  return link.rule === 'recorded' ? value > 0 : link.target !== undefined && value >= link.target;
}
export type AutoCompletion = {habitId: string; date: string; healthDate: string; measure: HealthMeasureV4; value: number};
/**
 * The habits to tick off now: each linked build habit that is due today (scheduled, nothing logged yet) with no marker
 * for the day, whose Health day meets the rule. Habits and Health each count their own day (their own journal zone),
 * both at the same instant.
 */
export function autoCompletions({links, habits, health, now = new Date()}: {links: HabitHealthLinksV4; habits: HabitData; health: HealthData; now?: Date}): AutoCompletion[] {
  const date = habitCalendarDay(habits, now), healthDate = healthDay(dailyData(health).preferences.timezone, now), out: AutoCompletion[] = [];
  for (const [habitId, link] of Object.entries(links.links)) {
    const habit = habits.habits.find(h => h.id === habitId);
    if (!habit || links.applied.some(a => a.habitId === habitId && a.date === date)) continue;
    const rule = habitRuleOn(habit, date);
    if (!rule || rule.type !== 'build' || habitDay(habit, date, date).status !== 'due') continue;
    const value = measureValue(health, healthDate, link);
    if (value !== null && ruleMet(link, value)) out.push({habitId, date, healthDate, measure: link.measure, value});
  }
  return out;
}
/**
 * The updater that writes one automatic check-in: an ordinary logged entry at the day's target, exactly what the
 * card's Complete button writes. It checks again, on the latest data, that the day is still due (another tab may have
 * written an entry) and returns the data unchanged otherwise.
 */
export function applyAutoCompletion(data: HabitData, item: AutoCompletion, now = new Date()): HabitData {
  const habit = data.habits.find(h => h.id === item.habitId);
  if (!habit) return data;
  const rule = habitRuleOn(habit, item.date);
  if (!rule || rule.type !== 'build' || habitDay(habit, item.date, item.date).status !== 'due') return data;
  return logHabitValue(data, habit.id, item.date, smartDoneValue(rule), {}, now);
}
export const autoCheckInMarker = (item: AutoCompletion, now = new Date()): AppliedCheckInV4 => ({habitId: item.habitId, date: item.date, healthDate: item.healthDate, measure: item.measure, value: item.value, appliedAt: now.toISOString()});
/** Where the value came from, in the person's words: "your water journal", "your Push-ups counter". */
export function measureSource(link: Pick<HabitHealthLinkV4, 'measure' | 'exerciseId'>, counters: readonly {id: string; name: string}[] = []): string {
  switch (link.measure) {
    case 'water': return 'your water journal';
    case 'steps': case 'activeMinutes': return 'your activity log';
    case 'weight': return 'your weight journal';
    case 'exercise': { const name = counters.find(c => c.id === link.exerciseId)?.name; return name ? `your ${name} counter` : 'your exercise counter'; }
    case 'sleepMinutes': case 'bedtimeBy': return 'your sleep log';
    case 'meditationMinutes': return 'your meditation log';
  }
}
const number = (value: number, digits = 0) => formatNumber(value, {maximumFractionDigits: digits});
/** A measured value as the badge says it: "2,250 mL" (or fl oz per the Health water unit), "8,800 steps", "42 minutes", "a reading", "24 reps". */
export function formatMeasureValue(measure: HealthMeasureV4, value: number, waterUnit: 'ml' | 'fl-oz-us' = 'ml'): string {
  switch (measure) {
    case 'water': return waterUnit === 'fl-oz-us' ? `${number(value / 29.5735295625, 1)} fl oz` : `${number(value)} mL`;
    case 'steps': return `${number(value)} ${value === 1 ? 'step' : 'steps'}`;
    case 'activeMinutes': return `${number(value)} ${value === 1 ? 'minute' : 'minutes'}`;
    case 'weight': return 'a reading';
    case 'exercise': return `${number(value)} ${value === 1 ? 'rep' : 'reps'}`;
    case 'sleepMinutes': case 'meditationMinutes': return `${Math.floor(value / 60) ? `${Math.floor(value / 60)} h ` : ''}${String(value % 60).padStart(Math.floor(value / 60) ? 2 : 1, '0')} min`;
    // A bedtime is kept as minutes after noon: say it as a clock time.
    case 'bedtimeBy': { const m = (value + 720) % 1440; return `in bed at ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
  }
}
