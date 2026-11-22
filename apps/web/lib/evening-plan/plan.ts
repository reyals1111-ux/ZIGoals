import {addLocalDays} from '../local-date';
import {wallClock} from '../zone-time';
import {eveningRecordSchema, MAX_EVENING_DAYS, MAX_EVENING_STEPS, type EveningHindrance, type EveningPlan, type EveningRecord, type EveningStep} from './schema';

/**
 * Session AV lane 2 (body; LEDGER #83, Calm Sleep's plan from a questionnaire with a sleep-readiness bar): the evening
 * plan's rules, pure. A few plain questions (the time to be asleep, what gets in the way, how long to wind down) suggest
 * four to six evening steps, each so many minutes before bedtime; the person keeps, drops or adds steps (an own habit can
 * be one). Each evening (until 05:00 the evening is still the day before) the ticked steps fill a "ready for bed" bar.
 * Plain habits of a calm evening, never medical advice.
 */
export const HINDRANCE_WORDS: Record<EveningHindrance, string> = {screens: 'Screens keep me up', 'busy-head': 'A busy head', 'late-caffeine': 'Coffee or tea late in the day', 'no-fixed-time': 'No fixed bedtime', 'light-noise': 'Light or noise', 'late-meal': 'Eating late'};
export const WIND_DOWN_CHOICES = [15, 30, 45, 60, 90] as const;
type Suggestion = {id: string; label: string; minutesBefore: (windDown: number) => number; for?: EveningHindrance; always?: boolean};
export const SUGGESTIONS: readonly Suggestion[] = [
  {id: 'no-caffeine', label: 'Nothing with caffeine from now', minutesBefore: () => 240, for: 'late-caffeine'},
  {id: 'last-meal', label: 'Last meal or snack', minutesBefore: () => 180, for: 'late-meal'},
  {id: 'write-down', label: 'Write down what is on your mind', minutesBefore: w => Math.min(240, w + 15), for: 'busy-head'},
  {id: 'screens-away', label: 'Screens away', minutesBefore: w => w, for: 'screens'},
  {id: 'lights-low', label: 'Lights low', minutesBefore: w => w, always: true},
  {id: 'same-bedtime', label: 'Start winding down at the same time as last night', minutesBefore: w => w, for: 'no-fixed-time'},
  {id: 'room-ready', label: 'Room dark and cool; earplugs or a mask if it helps', minutesBefore: () => 20, for: 'light-noise'},
  {id: 'wind-down-sound', label: 'A wind-down sound or a few slow breaths', minutesBefore: () => 15, always: true},
  {id: 'lights-out', label: 'Lights out', minutesBefore: () => 0, always: true},
];
/** The steps the answers suggest, latest first in the evening order (earliest step first). */
export function suggestedSteps(hindrances: readonly EveningHindrance[], windDown: number): EveningStep[] {
  const chosen = SUGGESTIONS.filter(s => s.always || (s.for && hindrances.includes(s.for)));
  return chosen.map(s => ({id: s.id, label: s.label, minutesBefore: s.minutesBefore(windDown)})).sort((a, b) => b.minutesBefore - a.minutesBefore).slice(0, MAX_EVENING_STEPS);
}
const minutesOf = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
/** The wall clock a step falls on: "22:15" for 45 minutes before 23:00. */
export const stepClock = (bedtime: string, minutesBefore: number) => { const m = ((minutesOf(bedtime) - minutesBefore) % 1440 + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
/** The evening a moment belongs to: its local date, or the day before until 05:00. */
export const eveningOf = (at: Date | number, zone: string): string => { const w = wallClock(typeof at === 'number' ? at : at.getTime(), zone); return w.minutes < 5 * 60 ? addLocalDays(w.date, -1) : w.date; };
export const sortSteps = (steps: readonly EveningStep[]) => [...steps].sort((a, b) => b.minutesBefore - a.minutesBefore || a.label.localeCompare(b.label));
export function savePlan(r: EveningRecord, input: Pick<EveningPlan, 'bedtime' | 'windDown' | 'hindrances' | 'steps'>, now: Date): EveningRecord {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.bedtime)) throw Error('Choose a time to be asleep, such as 23:00.');
  if (!input.steps.length) throw Error('Keep at least one step.');
  if (input.steps.length > MAX_EVENING_STEPS) throw Error(`Up to ${MAX_EVENING_STEPS} steps fit. Leave one out.`);
  const ids = new Set(input.steps.map(s => s.id));
  // Ticks of steps no longer in the plan are dropped from every evening.
  const days = Object.fromEntries(Object.entries(r.days).map(([d, t]) => [d, t.filter(id => ids.has(id))]).filter(([, t]) => (t as string[]).length));
  return eveningRecordSchema.parse({...r, plan: {...input, steps: sortSteps(input.steps), updatedAt: now.toISOString()}, days});
}
/** Removes the plan; the evenings already ticked stay (they are history). */
export function removePlan(r: EveningRecord): EveningRecord { const {plan: _p, ...rest} = r; void _p; return eveningRecordSchema.parse(rest); }
/** Ticks (or unticks) a step on an evening; only the newest 120 evenings are kept. */
export function tickStep(r: EveningRecord, evening: string, stepId: string, on: boolean): EveningRecord {
  if (!r.plan?.steps.some(s => s.id === stepId)) throw Error('This step is no longer in your plan.');
  const now = new Set(r.days[evening] ?? []); if (on) now.add(stepId); else now.delete(stepId);
  const days = {...r.days, [evening]: [...now]};
  if (!now.size) delete days[evening];
  const kept = Object.keys(days).sort().slice(-MAX_EVENING_DAYS);
  return eveningRecordSchema.parse({...r, days: Object.fromEntries(kept.map(d => [d, days[d]!]))});
}
export type Readiness = {done: number; total: number; share: number; ready: boolean; next: EveningStep | null};
export function readiness(r: EveningRecord, evening: string): Readiness | null {
  const plan = r.plan; if (!plan) return null;
  const ticked = new Set(r.days[evening] ?? []), done = plan.steps.filter(s => ticked.has(s.id)).length, total = plan.steps.length;
  return {done, total, share: total ? done / total : 0, ready: done === total, next: sortSteps(plan.steps).find(s => !ticked.has(s.id)) ?? null};
}
/** The last `n` evenings before tonight: how many had every step ticked, and how many had any. */
export function recentEvenings(r: EveningRecord, evening: string, n = 7): {complete: number; some: number; days: number} {
  const total = r.plan?.steps.length ?? 0; let complete = 0, some = 0;
  for (let i = 1; i <= n; i++) { const t = (r.days[addLocalDays(evening, -i)] ?? []).filter(id => r.plan?.steps.some(s => s.id === id)); if (t.length) some++; if (total && t.length === total) complete++; }
  return {complete, some, days: n};
}
