/**
 * Quick exercise counters (UI design pass, Part 4b). Stored in the Health domain as one optional, additive
 * group, so counters follow Health consent, encrypted sync and backup/restore unchanged:
 *   exercise?: {version: 1, counters: [{id, name, icon}] (≤ 6), days: [{id, counterId, date, count}]}
 * Every record carries an `id`, so the generic three-way sync merge combines counters and days by identity.
 * Days are the Health journal's day. A day without a record is "no entry", never zero; counts never go
 * below zero. Until the first tap the three default counters are shown without writing anything, so older
 * Health data stays byte-identical. The default counters have fixed IDs, so two devices that start
 * counting independently create identical definitions.
 */
import * as z from 'zod';
import { hasVisibleText } from './visible-text';

export const EXERCISE_ICONS = ['pushup', 'pullup', 'squat', 'run', 'jump', 'stretch', 'core', 'bike'] as const;
export type ExerciseIcon = typeof EXERCISE_ICONS[number];
export const EXERCISE_ICON_LABELS: Record<ExerciseIcon, string> = {pushup: 'Push-up', pullup: 'Pull-up', squat: 'Squat', run: 'Run', jump: 'Jump', stretch: 'Stretch', core: 'Core', bike: 'Bike'};
export const MAX_COUNTERS = 6, MAX_COUNT = 100_000, MAX_COUNTER_DAYS = 20_000;
const counterId = z.string().regex(/^health_[a-z0-9-]{8,80}$/);
const date = z.iso.date().refine(d => d >= '1900-01-01' && d <= '2199-12-31');
export const exerciseCounterSchema = z.strictObject({id: counterId, name: z.string().trim().min(1).max(40), icon: z.enum(EXERCISE_ICONS)});
export const exerciseDaySchema = z.strictObject({id: z.string().regex(/^health_[a-z0-9-]{8,80}@\d{4}-\d{2}-\d{2}$/), counterId, date, count: z.number().int().min(0).max(MAX_COUNT)})
  .refine(d => d.id === `${d.counterId}@${d.date}`, 'A counter day ID names its counter and date.');
export const exerciseSchema = z.strictObject({version: z.literal(1), counters: z.array(exerciseCounterSchema).max(MAX_COUNTERS), days: z.array(exerciseDaySchema).max(MAX_COUNTER_DAYS)}).superRefine((e, ctx) => {
  if (new Set(e.counters.map(c => c.id)).size !== e.counters.length) ctx.addIssue({code: 'custom', message: 'Each counter appears once.'});
  if (new Set(e.days.map(d => d.id)).size !== e.days.length) ctx.addIssue({code: 'custom', message: 'Each counter day appears once.'});
});
export type ExerciseCounter = z.infer<typeof exerciseCounterSchema>;
export type ExerciseDay = z.infer<typeof exerciseDaySchema>;
export type Exercise = z.infer<typeof exerciseSchema>;

export const DEFAULT_COUNTERS: readonly ExerciseCounter[] = [
  {id: 'health_counter-pushups', name: 'Push-ups', icon: 'pushup'},
  {id: 'health_counter-pullups', name: 'Pull-ups', icon: 'pullup'},
  {id: 'health_counter-squats', name: 'Squats', icon: 'squat'},
];
type WithExercise = {exercise?: Exercise};
/** The counters to show: the saved group, or the three defaults (not yet written) for Health data without one. */
export function exerciseData(h: WithExercise): Exercise { return h.exercise ?? {version: 1, counters: DEFAULT_COUNTERS.map(c => ({...c})), days: []}; }
const put = <T extends WithExercise>(h: T, exercise: Exercise): T => ({...h, exercise: exerciseSchema.parse(exercise)});
const dayId = (id: string, day: string) => `${id}@${day}`;

/** The count recorded for a day, or null when there is no entry. */
export function countOn(h: WithExercise, id: string, day: string): number | null {
  return exerciseData(h).days.find(d => d.id === dayId(id, day))?.count ?? null;
}
/** Adds (or with a negative delta removes) repetitions for a day. Never below zero; a "−" on a day without an entry changes nothing. */
export function changeCount<T extends WithExercise>(h: T, id: string, day: string, delta: number): T {
  const e = exerciseData(h);
  if (!e.counters.some(c => c.id === id)) throw Error('Choose an existing counter.');
  if (!Number.isInteger(delta) || Math.abs(delta) > MAX_COUNT) throw Error('Enter a whole number of repetitions.');
  const existing = e.days.find(d => d.id === dayId(id, day));
  if (!existing && delta <= 0) return h;
  const count = Math.max(0, Math.min(MAX_COUNT, (existing?.count ?? 0) + delta));
  if (existing && existing.count === count) return h;
  if (!existing && e.days.length >= MAX_COUNTER_DAYS) throw Error('Counter history is full. Remove an old counter before adding more days.');
  const days = existing ? e.days.map(d => d === existing ? {...d, count} : d) : [...e.days, {id: dayId(id, day), counterId: id, date: day, count}];
  return put(h, {...e, days});
}
const cleanName = (value: string) => { const name = value.trim().replace(/\s+/g, ' '); if (!name || name.length > 40) throw Error('Name the counter in 1 to 40 characters.'); if (!hasVisibleText(name)) throw Error('Name the counter with at least one visible character.'); return name; };
export function addCounter<T extends WithExercise>(h: T, name: string, icon: ExerciseIcon, id: string): T {
  const e = exerciseData(h);
  if (e.counters.length >= MAX_COUNTERS) throw Error(`You can keep up to ${MAX_COUNTERS} counters. Delete one to add another.`);
  if (!(EXERCISE_ICONS as readonly string[]).includes(icon)) throw Error('Choose one of the counter icons.');
  if (e.counters.some(c => c.id === id)) throw Error('This counter already exists.');
  return put(h, {...e, counters: [...e.counters, {id, name: cleanName(name), icon}]});
}
export function editCounter<T extends WithExercise>(h: T, id: string, change: {name?: string; icon?: ExerciseIcon}): T {
  const e = exerciseData(h);
  if (!e.counters.some(c => c.id === id)) throw Error('Choose an existing counter.');
  return put(h, {...e, counters: e.counters.map(c => c.id === id ? {...c, ...(change.name !== undefined ? {name: cleanName(change.name)} : {}), ...(change.icon ? {icon: change.icon} : {})} : c)});
}
/** Deleting a counter removes its definition and its daily history (the confirmation says so). */
export function deleteCounter<T extends WithExercise>(h: T, id: string): T {
  const e = exerciseData(h);
  if (!e.counters.some(c => c.id === id)) return h;
  return put(h, {...e, counters: e.counters.filter(c => c.id !== id), days: e.days.filter(d => d.counterId !== id)});
}
/** One count per date (null = no entry), oldest first. */
export function counterHistory(h: WithExercise, id: string, dates: readonly string[]): (number | null)[] {
  const byDay = new Map(exerciseData(h).days.filter(d => d.counterId === id).map(d => [d.date, d.count]));
  return dates.map(d => byDay.get(d) ?? null);
}
