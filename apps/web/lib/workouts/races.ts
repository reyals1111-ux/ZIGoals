import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {finished} from './engine';
import {runSeconds} from './runs';
import type {Workouts} from './schema';
import {distanceOf} from './weekly';

/**
 * Session AV lane 2, round 4 (health; LEDGER #337, Runna's Upcoming Plans and B-races; TIER 3 (stored format), a new device
 * record): a race — its name, day, distance, a goal time and a main or B mark — listed with the year's other races and the
 * weeks between them, and after race day the run that matches (a finished run that day, its distance within 5 %) shown as
 * its result beside the goal time. Each race may also make a countdown (the person's choice, an ordinary countdown).
 *
 * Its own key, `zigoals:races:v1`, loose and versioned (the countdowns record is strict); an unreadable race is dropped and
 * the others kept. Device-only; exported, restored and erased with the account. Facts only: no prediction, no pace advice.
 * Pure.
 */
export const RACES_KEY = 'zigoals:races:v1';
export const RACES_MAX = 50, RACE_NAME_MAX = 60, MATCH_SHARE = 0.05;
export const RACE_DISTANCES = [{km: 5, en: '5 km'}, {km: 10, en: '10 km'}, {km: 21.0975, en: 'Half marathon'}, {km: 42.195, en: 'Marathon'}] as const;
export const raceSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(RACE_NAME_MAX),
  date: z.iso.date(),
  distanceKm: z.number().finite().min(0.1).max(500),
  goalSeconds: z.number().int().min(60).max(7 * 86_400).optional().catch(undefined),
  priority: z.enum(['main', 'b']).catch('main'),
  createdAt: z.iso.datetime(),
});
export type Race = z.infer<typeof raceSchema>;
const racesListSchema = z.preprocess(v => Array.isArray(v) ? v.filter(x => raceSchema.safeParse(x).success).slice(0, RACES_MAX) : v, z.array(raceSchema).max(RACES_MAX));
export const racesSchema = z.looseObject({version: z.literal(1), races: racesListSchema.default([])});
export type Races = z.infer<typeof racesSchema>;
export const emptyRaces = (): Races => ({version: 1, races: []});
export const RACES: DeviceRecordSpec<Races> = {key: RACES_KEY, schema: racesSchema, empty: emptyRaces};

/** "1:55:00", "48:30" → seconds; null when it is not a time. */
export function readTime(text: string): number | null {
  const m = /^(?:(\d{1,3}):)?([0-5]?\d):([0-5]\d)$/.exec(text.trim());
  if (!m) return null;
  return (Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3]);
}
export function timeText(seconds: number): string {
  const s = Math.round(seconds), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60, two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(r)}` : `${m}:${two(r)}`;
}
export const distanceWords = (km: number) => RACE_DISTANCES.find(d => Math.abs(d.km - km) < 0.01)?.en ?? `${km.toLocaleString('en-US', {maximumFractionDigits: 2})} km`;
export type RaceDraft = {name: string; date: string; distanceKm: string; goal: string; priority: Race['priority']};
export type RaceIssue = {field: 'name' | 'date' | 'distance' | 'goal'; message: string};
export function saveRace(rec: Races, d: RaceDraft, id: string, now: string, editing?: string): {ok: true; value: Races; race: Race} | {ok: false; issue: RaceIssue} {
  const name = d.name.trim(), km = Number(d.distanceKm.trim().replace(',', '.')), goal = d.goal.trim() ? readTime(d.goal) : undefined;
  if (!name) return {ok: false, issue: {field: 'name', message: 'Give the race a name.'}};
  if (name.length > RACE_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${RACE_NAME_MAX} characters or fewer.`}};
  if (!z.iso.date().safeParse(d.date).success) return {ok: false, issue: {field: 'date', message: 'Choose the race day.'}};
  if (!d.distanceKm.trim() || !Number.isFinite(km) || km < 0.1 || km > 500) return {ok: false, issue: {field: 'distance', message: 'Enter the distance in km, from 0.1 to 500.'}};
  if (goal === null) return {ok: false, issue: {field: 'goal', message: 'Write the goal time like 1:55:00 or 48:30, or leave it blank.'}};
  if (!editing && rec.races.length >= RACES_MAX) return {ok: false, issue: {field: 'name', message: `This device keeps up to ${RACES_MAX} races. Remove a past one first.`}};
  const held = editing ? rec.races.find(r => r.id === editing) : undefined;
  const race = raceSchema.parse({id: held?.id ?? id, name, date: d.date, distanceKm: Math.round(km * 10_000) / 10_000, ...(goal !== undefined ? {goalSeconds: goal} : {}), priority: d.priority, createdAt: held?.createdAt ?? now});
  const races = held ? rec.races.map(r => r.id === held.id ? race : r) : [...rec.races, race];
  return {ok: true, value: racesSchema.parse({...rec, races: races.sort((a, b) => a.date.localeCompare(b.date))}), race};
}
export const removeRace = (rec: Races, id: string): Races => racesSchema.parse({...rec, races: rec.races.filter(r => r.id !== id)});
export const restoreRace = (rec: Races, race: Race): Races => rec.races.some(r => r.id === race.id) ? rec : racesSchema.parse({...rec, races: [...rec.races, race].sort((a, b) => a.date.localeCompare(b.date))});

const dayNumber = (d: string) => Math.round(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
export const weeksBetween = (a: string, b: string) => Math.floor((dayNumber(b) - dayNumber(a)) / 7);
export type RaceResult = {workoutId: string; km: number; seconds: number; vsGoal: number | null};
/** The finished run on race day whose distance is within 5 % of the race's (the closest one), as the race's result. */
export function raceResult(race: Race, w: Workouts | null): RaceResult | null {
  const runs = finished(w ?? {version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90} as unknown as Workouts).filter(x => x.date === race.date).map(x => ({x, km: distanceOf(x, 'run')})).filter(r => r.km > 0 && Math.abs(r.km - race.distanceKm) <= race.distanceKm * MATCH_SHARE);
  const best = runs.sort((a, b) => Math.abs(a.km - race.distanceKm) - Math.abs(b.km - race.distanceKm))[0];
  if (!best) return null;
  const seconds = runSeconds(best.x);
  return {workoutId: best.x.id, km: Math.round(best.km * 100) / 100, seconds, vsGoal: race.goalSeconds ? seconds - race.goalSeconds : null};
}
export type RaceRow = {race: Race; weeksFromToday: number; weeksAfterPrevious: number | null; result: RaceResult | null; past: boolean};
/** The races of `today`'s year and the ones after it, in order, with the weeks to each and between them, and past results. */
export function raceYear(rec: Races, w: Workouts | null, today: string): RaceRow[] {
  const year = today.slice(0, 4), list = rec.races.filter(r => r.date.slice(0, 4) >= year).sort((a, b) => a.date.localeCompare(b.date));
  return list.map((race, i) => ({race, weeksFromToday: weeksBetween(today, race.date), weeksAfterPrevious: i ? weeksBetween(list[i - 1]!.date, race.date) : null, result: race.date <= today ? raceResult(race, w) : null, past: race.date < today}));
}
/** "2:50 under your goal", "1:05 over your goal", "right on your goal". */
export const goalWords = (vs: number) => vs === 0 ? 'right on your goal' : `${timeText(Math.abs(vs))} ${vs < 0 ? 'under' : 'over'} your goal`;
