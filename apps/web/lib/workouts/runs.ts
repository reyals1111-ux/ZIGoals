import {addLocalDays} from '../local-date';
import {durationMinutes, finished} from './engine';
import {runBests} from './run-bests';
import {workoutsSchema, type DistanceGoal, type Workout, type Workouts} from './schema';
import type {SplitsRecord} from './splits-schema';
import {distanceOf, type DistanceSport} from './weekly';

/**
 * Session AV lane 2 (body; LEDGER #110 and #111; Strava's per-activity summary, goals and fitness): three things from the
 * person's own log, with no model and no calorie figure —
 * - a run's summary against the runs before it (pace and distance beside the average of up to five earlier runs, its
 *   fastest kilometre from the splits, and a running best it set);
 * - distance goals for a week, a month or a year, for one sport or all, with what is left and the pace to get there;
 * - the training load: minutes (or kilometres) in the last 7 days beside the weekly average of the 4 weeks before, in
 *   plain words, and the 12 weeks with their 4-week average. Pure.
 */
const SPORT_OF: Record<Exclude<DistanceGoal['sport'], 'any'>, DistanceSport> = {run: 'run', ride: 'ride', swim: 'swim', walk: 'walk'};
const runKm = (x: Workout) => distanceOf(x, 'run');
/** A run's moving time in seconds: its distance sets' time, else its file's duration, else its length. */
export function runSeconds(x: Workout): number {
  const sets = x.exercises.reduce((t, e) => t + (e.measure === 'distance-time' ? e.sets.reduce((m, s) => m + (s.distanceKm ? s.seconds ?? 0 : 0), 0) : 0), 0);
  const info = (x.imported ?? x.fileImport) as {durationSeconds?: number} | undefined;
  return sets || info?.durationSeconds || durationMinutes(x) * 60;
}
export type RunSummary = {workoutId: string; km: number; seconds: number; pace: number; earlier: number; avgPace: number | null; avgKm: number | null; paceDelta: number | null; kmDelta: number | null; fastestKm: number | null; bests: string[]; avgHr: number | null};
export function runSummary(w: Workouts, splits: SplitsRecord | null, workoutId: string): RunSummary | null {
  const runs = finished(w).filter(x => runKm(x) > 0), x = runs.find(r => r.id === workoutId);
  if (!x) return null;
  const km = Math.round(runKm(x) * 100) / 100, seconds = runSeconds(x), pace = Math.round(seconds / km);
  const before = runs.filter(r => r.startedAt < x.startedAt).slice(0, 5);
  const paces = before.map(r => runSeconds(r) / runKm(r)), avgPace = paces.length ? Math.round(paces.reduce((a, b) => a + b, 0) / paces.length) : null;
  const avgKm = before.length ? Math.round(before.reduce((t, r) => t + runKm(r), 0) / before.length * 100) / 100 : null;
  const s = splits?.workouts[x.id]?.splits.filter(p => p.meters === 1000) ?? [], fastestKm = s.length ? Math.min(...s.map(p => p.seconds)) : null;
  // A best it set: the running bests as they stand, counted from this run (a later run may have beaten it since).
  const all = runBests(w, splits), bests = [...all.timed.filter(b => b.workoutId === x.id).map(b => b.km === 21.0975 ? 'half marathon' : `${b.km} km`), ...(all.longest?.workoutId === x.id && before.length ? ['longest run'] : [])];
  const info = (x.imported ?? x.fileImport) as {avgHr?: number} | undefined;
  return {workoutId: x.id, km, seconds, pace, earlier: before.length, avgPace, avgKm, paceDelta: avgPace === null ? null : pace - avgPace, kmDelta: avgKm === null ? null : Math.round((km - avgKm) * 100) / 100, fastestKm, bests, avgHr: info?.avgHr ?? null};
}
/** "5:12" per km. */
export const paceText = (secondsPerKm: number) => `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`;
/** The summary in one or two plain sentences (the page and the answers say the same). */
export function runWords(r: RunSummary): string {
  const head = `${r.km.toLocaleString('en-US', {maximumFractionDigits: 2})} km at ${paceText(r.pace)} a km`;
  const vs = r.earlier === 0 ? 'Your first run here: the next ones are compared with it.'
    : `Against your last ${r.earlier === 1 ? 'run' : `${r.earlier} runs`}: ${r.paceDelta === 0 ? 'the same pace' : `${Math.abs(r.paceDelta!)} s a km ${r.paceDelta! < 0 ? 'faster' : 'slower'}`}, ${r.kmDelta === 0 ? 'the same distance' : `${Math.abs(r.kmDelta!).toLocaleString('en-US', {maximumFractionDigits: 2})} km ${r.kmDelta! > 0 ? 'longer' : 'shorter'}`}.`;
  const extra = [r.fastestKm !== null ? `Fastest kilometre ${paceText(r.fastestKm)}.` : null, r.bests.length ? `A running best: ${r.bests.join(', ')}.` : null, r.avgHr !== null ? `Average heart rate ${r.avgHr}.` : null].filter(Boolean).join(' ');
  return `${head}. ${vs}${extra ? ` ${extra}` : ''}`;
}

// ── Distance goals ────────────────────────────────────────────────────────────────────────────────────────────────
export const MAX_DISTANCE_GOALS = 12;
export function periodOf(period: DistanceGoal['period'], today: string): {from: string; to: string} {
  if (period === 'week') { const from = addLocalDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7)); return {from, to: addLocalDays(from, 6)}; }
  if (period === 'month') { const from = `${today.slice(0, 7)}-01`, y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)); return {from, to: addLocalDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1)}; }
  return {from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31`};
}
export type GoalProgress = {goal: DistanceGoal; km: number; left: number; share: number; daysLeft: number; perDay: number | null; done: boolean; onPace: boolean};
export function goalProgress(w: Workouts, goal: DistanceGoal, today: string): GoalProgress {
  const {from, to} = periodOf(goal.period, today), sport = goal.sport === 'any' ? undefined : SPORT_OF[goal.sport];
  const km = Math.round(finished(w).filter(x => x.date >= from && x.date <= today).reduce((t, x) => t + distanceOf(x, sport), 0) * 100) / 100;
  const days = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1, gone = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;
  const left = Math.max(0, Math.round((goal.km - km) * 100) / 100), daysLeft = Math.max(0, days - gone);
  return {goal, km, left, share: Math.min(1, km / goal.km), daysLeft, perDay: left > 0 && daysLeft > 0 ? Math.round(left / daysLeft * 10) / 10 : null, done: km >= goal.km, onPace: km >= goal.km * gone / days};
}
export function addDistanceGoal(w: Workouts, input: Pick<DistanceGoal, 'sport' | 'period' | 'km'>, now: Date): Workouts {
  const goals = w.distanceGoals ?? [];
  if (!(input.km >= 1 && input.km <= 100_000)) throw Error('Enter a distance from 1 to 100,000 km.');
  if (goals.some(g => g.sport === input.sport && g.period === input.period)) throw Error('There is already a goal for this sport and period. Remove it first, or change that one.');
  if (goals.length >= MAX_DISTANCE_GOALS) throw Error(`Up to ${MAX_DISTANCE_GOALS} distance goals fit. Remove one first.`);
  return workoutsSchema.parse({...w, distanceGoals: [...goals, {id: `goal-${crypto.randomUUID()}`, ...input, km: Math.round(input.km * 10) / 10, createdAt: now.toISOString()}]});
}
export const removeDistanceGoal = (w: Workouts, id: string) => workoutsSchema.parse({...w, distanceGoals: (w.distanceGoals ?? []).filter(g => g.id !== id)});

// ── Training load ─────────────────────────────────────────────────────────────────────────────────────────────────
export type LoadMetric = 'minutes' | 'km';
export type TrainingLoad = {metric: LoadMetric; last7: number; usual: number | null; ratio: number | null; words: 'lighter' | 'usual' | 'more' | 'much-more' | 'new' | 'back' | 'none' | 'paused' | 'after-break';
  weeks: {start: string; value: number; average: number | null}[]};
const valueOf = (x: Workout, metric: LoadMetric) => metric === 'minutes' ? durationMinutes(x) : distanceOf(x);
const sumBetween = (w: Workouts, from: string, to: string, metric: LoadMetric) => finished(w).filter(x => x.date >= from && x.date <= to).reduce((t, x) => t + valueOf(x, metric), 0);
/**
 * Session AV lane 2, round 5 (LEDGER #374): with `pauses` (the days a workout status covered, lib/workouts/status.ts), a
 * status open today says the week is not compared ('paused'), and one that ended within the five weeks the comparison
 * reads says "back after a break" instead of comparing ('after-break'). Without pauses the words are exactly as before.
 */
export function trainingLoad(w: Workouts, today: string, metric: LoadMetric = 'minutes', pauses: readonly {from: string; to: string}[] = []): TrainingLoad {
  const last7 = Math.round(sumBetween(w, addLocalDays(today, -6), today, metric) * 10) / 10;
  const before = [1, 2, 3, 4].map(k => sumBetween(w, addLocalDays(today, -6 - 7 * k), addLocalDays(today, -7 * k), metric)), any = before.some(v => v > 0);
  const usual = any ? Math.round(before.reduce((a, b) => a + b, 0) / 4 * 10) / 10 : null, ratio = usual ? Math.round(last7 / usual * 100) / 100 : null;
  // Review b2b #8: "first week here" only when nothing was finished before these five weeks; someone back after a break
  // with older history is told there is nothing in the four weeks before to compare with.
  const older = usual === null && last7 > 0 && finished(w).some(x => x.date < addLocalDays(today, -34));
  const pausedNow = pauses.some(p => p.from <= today && p.to >= today), pausedLately = pauses.some(p => p.to >= addLocalDays(today, -34) && p.to < today);
  const words: TrainingLoad['words'] = pausedNow ? 'paused' : pausedLately ? 'after-break' : !last7 && !usual ? 'none' : usual === null ? (older ? 'back' : 'new') : ratio! < 0.8 ? 'lighter' : ratio! <= 1.3 ? 'usual' : ratio! <= 1.5 ? 'more' : 'much-more';
  // The 12 weeks (Monday first) and each one's average of the 4 weeks before it.
  const monday = addLocalDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const starts = Array.from({length: 16}, (_, i) => addLocalDays(monday, -7 * (15 - i))), values = starts.map(s => Math.round(sumBetween(w, s, addLocalDays(s, 6) > today ? today : addLocalDays(s, 6), metric) * 10) / 10);
  const weeks = starts.slice(4).map((start, i) => { const prev = values.slice(i, i + 4); return {start, value: values[i + 4]!, average: prev.some(v => v > 0) ? Math.round(prev.reduce((a, b) => a + b, 0) / 4 * 10) / 10 : null}; });
  return {metric, last7, usual, ratio, words, weeks};
}
export const LOAD_WORDS: Record<TrainingLoad['words'], string> = {
  none: 'Nothing logged in the last five weeks yet.', new: 'This is your first week here, so there is no usual yet.',
  back: 'Welcome back: nothing in the four weeks before, so there is no usual to compare with yet.',
  paused: 'Your status is set, so these days are not compared with your usual week.',
  'after-break': 'Back after a break: the weeks around it are not compared, so there is no usual for now.',
  lighter: 'Lighter than your usual week.', usual: 'About your usual week.', more: 'More than your usual week.', 'much-more': 'Well above your usual week: a big step up. Building up gradually is the usual advice.',
};
