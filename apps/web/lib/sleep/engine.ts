import {MAX_NIGHT_MINUTES, sleepGoalSchema, sleepNightSchema, sleepSchema, type Sleep, type SleepGoal, type SleepNight} from './schema';
import {addDays, wallClock} from '../zone-time';

/**
 * Sleep, the engine (Session W Part 4). Every number here comes from the nights the person logged or imported; nothing
 * is estimated without saying so, and nothing is filled in for a night that is missing.
 * - A night's day is its wake date in its own zone; its length is the difference of two instants (exact across DST).
 * - Asleep = the sum of the sleep stages where an import gives all three; otherwise time in bed less the time to fall
 *   asleep and the time awake, labelled "estimated" while either of those is unknown.
 * - Sleep debt (last 7 days) = Σ over the logged nights of (goal − asleep); n is shown with it.
 * - Consistency = the standard deviation of bedtimes over the last 14 days' nights (at least 4), in minutes.
 */
const MIN = 60_000;
export const newSleepId = () => `health_sleep-${crypto.randomUUID()}`;
export const nightDay = (n: Pick<SleepNight, 'end' | 'timeZone'>): string | null => n.end ? wallClock(Date.parse(n.end), n.timeZone).date : null;
export const inBedMinutes = (n: Pick<SleepNight, 'start' | 'end'>, now = Date.now()) => Math.round(((n.end ? Date.parse(n.end) : now) - Date.parse(n.start)) / MIN);
export type Asleep = {minutes: number; estimated: boolean};
export function asleep(n: SleepNight): Asleep | null {
  if (!n.end) return null;
  const s = n.stages;
  if (s?.deepMin !== undefined && s.remMin !== undefined && s.coreMin !== undefined) return {minutes: s.deepMin + s.remMin + s.coreMin, estimated: false};
  return {minutes: Math.max(0, inBedMinutes(n) - (n.latencyMin ?? 0) - (n.awakeMin ?? 0)), estimated: n.latencyMin === undefined || n.awakeMin === undefined};
}
/** Bedtime as minutes after noon on the evening it began (23:30 → 690, 00:30 → 750), so nights around midnight compare. */
export const bedClock = (n: Pick<SleepNight, 'start' | 'timeZone'>) => (wallClock(Date.parse(n.start), n.timeZone).minutes + 720) % 1440;
export const wakeClock = (n: Pick<SleepNight, 'end' | 'timeZone'>) => n.end ? wallClock(Date.parse(n.end), n.timeZone).minutes : null;

/** Running nights, the latest started first: the first is tonight's; any other needs the person's end time. */
export const runningNights = (s: Sleep) => s.nights.filter(n => n.end === null).sort((a, b) => b.start.localeCompare(a.start));
const parse = (s: Sleep) => sleepSchema.parse(s);
/** "I'm going to bed": a running night from now, in the zone the person's days follow. */
export function startNight(s: Sleep, at: Date, timeZone: string, id = newSleepId()): Sleep {
  if (runningNights(s).some(n => at.getTime() - Date.parse(n.start) < MAX_NIGHT_MINUTES * MIN)) throw Error('A night is already running. End it first.');
  const now = at.toISOString();
  return parse({...s, nights: [...s.nights, sleepNightSchema.parse({id, kind: 'night', start: now, end: null, timeZone, source: 'timer', createdAt: now, updatedAt: now})]});
}
/** "I woke up": ends a running night now; a night that would pass 24 hours asks for its real end time instead. */
export function endNight(s: Sleep, id: string, at: Date): Sleep {
  const night = s.nights.find(n => n.id === id);
  if (!night || night.end !== null) throw Error('This night is no longer running.');
  if (at.getTime() - Date.parse(night.start) > MAX_NIGHT_MINUTES * MIN) throw Error('This night started more than 24 hours ago. Enter when you woke up.');
  if (at.getTime() <= Date.parse(night.start)) throw Error('A night ends after it starts.');
  const now = at.toISOString();
  return parse({...s, nights: s.nights.map(n => n.id === id ? {...n, end: now, updatedAt: now} : n)});
}
export type NightInput = {id?: string; kind: 'night' | 'nap'; start: number; end: number; timeZone: string; latencyMin?: number; awakenings?: number; awakeMin?: number; quality?: number; tags?: string[]; note?: string};
const overlaps = (a: {start: number; end: number}, b: {start: number; end: number}) => a.start < b.end && b.start < a.end;
/** Adds a night or nap the person typed, or edits one (an edit keeps where it came from). Overlapping nights are refused. */
export function saveNight(s: Sleep, input: NightInput, at: Date): Sleep {
  const now = at.toISOString(), held = input.id ? s.nights.find(n => n.id === input.id) : undefined;
  if (input.id && !held) throw Error('This night is no longer here.');
  if (input.end > at.getTime() + MIN) throw Error('A night cannot end in the future.');
  if (input.kind === 'night') {
    const clash = s.nights.find(n => n.id !== input.id && n.kind === 'night' && n.end !== null && overlaps({start: input.start, end: input.end}, {start: Date.parse(n.start), end: Date.parse(n.end)}));
    if (clash) throw Error(`This overlaps the night that ended on ${nightDay(clash)}. Edit that one instead.`);
  }
  const tags = input.tags?.map(t => t.trim()).filter(Boolean);
  const night = sleepNightSchema.parse({
    id: held?.id ?? input.id ?? newSleepId(), kind: input.kind, start: new Date(input.start).toISOString(), end: new Date(input.end).toISOString(), timeZone: input.timeZone,
    ...(input.latencyMin !== undefined ? {latencyMin: input.latencyMin} : {}), ...(input.awakenings !== undefined ? {awakenings: input.awakenings} : {}), ...(input.awakeMin !== undefined ? {awakeMin: input.awakeMin} : {}),
    ...(held?.stages ? {stages: held.stages} : {}), ...(input.quality !== undefined ? {quality: input.quality} : {}), ...(tags?.length ? {tags: [...new Set(tags)]} : {}), ...(input.note?.trim() ? {note: input.note.trim()} : {}),
    source: held?.source ?? 'manual', createdAt: held?.createdAt ?? now, updatedAt: now,
  });
  return parse({...s, nights: held ? s.nights.map(n => n.id === night.id ? night : n) : [...s.nights, night]});
}
export function deleteNight(s: Sleep, id: string): Sleep {
  if (!s.nights.some(n => n.id === id)) throw Error('This night is no longer here.');
  return parse({...s, nights: s.nights.filter(n => n.id !== id)});
}
/** The person's goal (null removes it). */
export function setSleepGoal(s: Sleep, goal: Omit<SleepGoal, 'updatedAt'> | null, at: Date): Sleep {
  if (!goal) { const {goal: _old, ...rest} = s; void _old; return parse(rest); }
  return parse({...s, goal: sleepGoalSchema.parse({...goal, updatedAt: at.toISOString()})});
}

/** The ended nights (not naps) whose wake day falls in the `days` days ending `today`. */
export function nightsIn(s: Sleep, today: string, days: number): SleepNight[] {
  const from = addDays(today, 1 - days);
  return s.nights.filter(n => n.kind === 'night' && n.end !== null).filter(n => { const day = nightDay(n)!; return day >= from && day <= today; });
}
export type DayPoint = {date: string; asleep: number | null; estimated: boolean; inBed: number | null; bed: number | null; wake: number | null; quality: number | null; nights: number};
/** One point per day for the charts; a day without a logged night stays empty, never zero. */
export function dailySeries(s: Sleep, today: string, days: number): DayPoint[] {
  const nights = nightsIn(s, today, days);
  return Array.from({length: days}, (_, i) => {
    const date = addDays(today, i + 1 - days), on = nights.filter(n => nightDay(n) === date);
    if (!on.length) return {date, asleep: null, estimated: false, inBed: null, bed: null, wake: null, quality: null, nights: 0};
    const main = on.reduce((a, b) => inBedMinutes(b) > inBedMinutes(a) ? b : a), slept = on.map(n => asleep(n)!);
    const rated = on.filter(n => n.quality !== undefined);
    return {date, asleep: slept.reduce((t, a) => t + a.minutes, 0), estimated: slept.some(a => a.estimated), inBed: on.reduce((t, n) => t + inBedMinutes(n), 0), bed: bedClock(main), wake: wakeClock(main), quality: rated.length ? Math.round(rated.reduce((t, n) => t + n.quality!, 0) / rated.length * 10) / 10 : null, nights: on.length};
  });
}
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
export type Summary = {nights: number; asleep: number; estimated: boolean; inBed: number; bed: number; wake: number; quality: number | null};
/** Averages over the logged days in a window; null when none was logged. */
export function summary(points: DayPoint[]): Summary | null {
  const logged = points.filter(p => p.asleep !== null);
  if (!logged.length) return null;
  const rated = logged.filter(p => p.quality !== null);
  return {nights: logged.length, asleep: Math.round(mean(logged.map(p => p.asleep!))), estimated: logged.some(p => p.estimated), inBed: Math.round(mean(logged.map(p => p.inBed!))), bed: Math.round(mean(logged.map(p => p.bed!))), wake: Math.round(mean(logged.map(p => p.wake!))), quality: rated.length ? Math.round(mean(rated.map(p => p.quality!)) * 10) / 10 : null};
}
export type Debt = {minutes: number; nights: number; goal: number};
/** Sleep debt over the last 7 days: Σ (goal − asleep) over the logged nights; negative is time ahead of the goal. */
export function sleepDebt(s: Sleep, today: string): Debt | null {
  if (!s.goal) return null;
  const logged = dailySeries(s, today, 7).filter(p => p.asleep !== null);
  if (!logged.length) return null;
  return {minutes: logged.reduce((t, p) => t + (s.goal!.minutes - p.asleep!), 0), nights: logged.length, goal: s.goal.minutes};
}
export type Consistency = {minutes: number; nights: number};
/** The standard deviation of bedtimes over the last 14 days' logged nights, at least 4 of them. */
export function consistency(s: Sleep, today: string): Consistency | null {
  const beds = dailySeries(s, today, 14).filter(p => p.bed !== null).map(p => p.bed!);
  if (beds.length < 4) return null;
  const m = mean(beds);
  return {minutes: Math.round(Math.sqrt(mean(beds.map(b => (b - m) ** 2)))), nights: beds.length};
}
/** A gentle word when most recent nights were short: at least 4 logged nights in 7, averaging under 6 hours asleep. */
export function shortNights(s: Sleep, today: string): boolean {
  const week = summary(dailySeries(s, today, 7));
  return !!week && week.nights >= 4 && week.asleep < 360;
}
/** "23:30" from minutes after noon (bedClock) or after midnight (wakeClock). */
export const clockFromNoon = (m: number) => clockFromMidnight((m + 720) % 1440);
export const clockFromMidnight = (m: number) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
