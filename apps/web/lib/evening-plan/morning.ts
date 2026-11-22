import {energyCurve} from '../energy-curve/curve';
import type {Sleep} from '../sleep/schema';
import {eveningRecordSchema, MAX_EVENING_DAYS, MAX_MORNING_STEPS, MAX_REMINDED, type EveningRecord, type MorningStep} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #236, Rise's habits at suggested times): the morning steps, pure. Each step is a
 * number of minutes after waking — daylight in the first hour, the first coffee once the grogginess has passed, a glass
 * of water, a few minutes of movement — timed from today's wake time (the night that ended today) or the usual one (the
 * energy curve's wake, lib/energy-curve/curve.ts), so the times move with the person's mornings. Each step, morning or
 * evening, can carry a reminder at its time (`remind`; the notification plan's `energy` kind). Plain habits of a calm
 * morning, written in the repository; never medical advice.
 */
export type MorningSuggestion = {id: string; label: string; minutesAfter: number; why: string};
export const MORNING_SUGGESTIONS: readonly MorningSuggestion[] = [
  {id: 'm-water', label: 'A glass of water', minutesAfter: 5, why: 'Right after waking.'},
  {id: 'm-daylight', label: 'Daylight outside, or by a bright window', minutesAfter: 15, why: 'Within the first hour after waking: morning light helps many people feel awake and sleepy on time in the evening.'},
  {id: 'm-move', label: 'A few minutes of movement', minutesAfter: 30, why: 'A short walk or a stretch in the first hour.'},
  {id: 'm-coffee', label: 'First coffee or tea, once the grogginess has passed', minutesAfter: 90, why: 'About an hour and a half after waking, when the morning grogginess has usually faded.'},
  {id: 'm-plan', label: 'Look at today’s plan', minutesAfter: 45, why: 'Before the focus window, which starts about two hours after waking.'},
];
export const DEFAULT_MORNING = ['m-daylight', 'm-coffee'] as const;
const clock = (m: number) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
/** The wake time the morning steps are timed from (minutes after midnight) and where it came from, or null without any night. */
export function morningWake(sleep: Sleep, date: string): {minutes: number; from: 'today' | 'usual'} | null {
  const c = energyCurve(sleep, date);
  return c ? {minutes: c.wake, from: c.wakeFrom} : null;
}
/** The wall clock a morning step falls on: "07:15" for 15 minutes after a 07:00 wake. */
export const morningClock = (wake: number, minutesAfter: number) => clock(wake + minutesAfter);
export const sortMorning = (steps: readonly MorningStep[]) => [...steps].sort((a, b) => a.minutesAfter - b.minutesAfter || a.label.localeCompare(b.label));

/** Keeps the chosen morning steps (built-in ones only, by id); none removes the morning plan and its reminders. */
export function saveMorning(r: EveningRecord, ids: readonly string[], now: Date): EveningRecord {
  const steps = MORNING_SUGGESTIONS.filter(s => ids.includes(s.id)).map(({id, label, minutesAfter}) => ({id, label, minutesAfter}));
  if (steps.length > MAX_MORNING_STEPS) throw Error(`Up to ${MAX_MORNING_STEPS} morning steps fit.`);
  const keep = new Set(steps.map(s => s.id));
  const remind = (r.remind ?? []).filter(id => !id.startsWith('m-') || keep.has(id));
  const mornings = Object.fromEntries(Object.entries(r.mornings ?? {}).map(([d, t]) => [d, t.filter(id => keep.has(id))]).filter(([, t]) => (t as string[]).length));
  const {morning: _m, ...rest} = r; void _m;
  return eveningRecordSchema.parse({...rest, ...(steps.length ? {morning: {steps: sortMorning(steps), updatedAt: now.toISOString()}} : {}), mornings, remind});
}
/** Ticks (or unticks) a morning step on a date; only the newest 120 mornings are kept. */
export function tickMorning(r: EveningRecord, date: string, stepId: string, on: boolean): EveningRecord {
  if (!r.morning?.steps.some(s => s.id === stepId)) throw Error('This step is no longer in your morning.');
  const now = new Set(r.mornings?.[date] ?? []); if (on) now.add(stepId); else now.delete(stepId);
  const mornings: Record<string, string[]> = {...(r.mornings ?? {}), [date]: [...now]};
  if (!now.size) delete mornings[date];
  const kept = Object.keys(mornings).sort().slice(-MAX_EVENING_DAYS);
  return eveningRecordSchema.parse({...r, mornings: Object.fromEntries(kept.map(d => [d, mornings[d]!]))});
}
/** The step ids (evening or morning) that still exist and carry a reminder. */
export function remindedSteps(r: EveningRecord): string[] {
  const ids = new Set([...(r.plan?.steps ?? []).map(s => s.id), ...(r.morning?.steps ?? []).map(s => s.id)]);
  return (r.remind ?? []).filter(id => ids.has(id));
}
/** Switches a step's reminder on or off. */
export function setStepReminder(r: EveningRecord, stepId: string, on: boolean): EveningRecord {
  const exists = (r.plan?.steps ?? []).some(s => s.id === stepId) || (r.morning?.steps ?? []).some(s => s.id === stepId);
  if (!exists) throw Error('This step is no longer in your plan.');
  const list = new Set(remindedSteps(r)); if (on) list.add(stepId); else list.delete(stepId);
  if (list.size > MAX_REMINDED) throw Error(`Up to ${MAX_REMINDED} step reminders fit.`);
  return eveningRecordSchema.parse({...r, remind: [...list]});
}
