import {meditationRunSchema, meditationSessionSchema, type MeditationRun, type MeditationSession} from './schema';

/**
 * The meditation timer (Session W Part 5), as pure functions over the running session on this device
 * (`zigoals:meditation-run:v1`). Time is always the distance between instants, never a count of ticks, so a throttled
 * background tab, a locked phone or a reload cannot slow it down or lose it. A pause is an instant; resuming adds the
 * paused span to `pausedMs`.
 */
export type Run = NonNullable<MeditationRun['run']>;
export const PRESET_MINUTES = [1, 3, 5, 10, 20, 30] as const;
export const MIN_MINUTES = 1, MAX_MINUTES = 240;

export function startRun({now, minutes, kind = 'timer', pattern, moodBefore}: {now: Date; minutes: number; kind?: Run['kind']; pattern?: Run['pattern']; moodBefore?: number}): MeditationRun {
  if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) throw Error(`Choose whole minutes from ${MIN_MINUTES} to ${MAX_MINUTES}.`);
  return meditationRunSchema.parse({version: 1, run: {startedAt: now.toISOString(), plannedSec: minutes * 60, pausedMs: 0, kind, ...(kind === 'breathing' && pattern ? {pattern} : {}), ...(moodBefore !== undefined ? {moodBefore} : {})}});
}
/** Time spent in the session so far: from the start to now (or to the pause), less the time it was paused. */
export function elapsedMs(run: Pick<Run, 'startedAt' | 'pausedAt' | 'pausedMs'>, now: number): number {
  const until = run.pausedAt ? Date.parse(run.pausedAt) : now;
  return Math.max(0, until - Date.parse(run.startedAt) - run.pausedMs);
}
export const remainingMs = (run: Pick<Run, 'startedAt' | 'pausedAt' | 'pausedMs' | 'plannedSec'>, now: number) => Math.max(0, run.plannedSec * 1000 - elapsedMs(run, now));
export const isDone = (run: Pick<Run, 'startedAt' | 'pausedAt' | 'pausedMs' | 'plannedSec'>, now: number) => remainingMs(run, now) === 0;
export const isPaused = (run: Run) => run.pausedAt !== undefined;
export function pauseRun(state: MeditationRun, now: Date): MeditationRun {
  const run = state.run;
  if (!run || run.pausedAt) return state;
  return meditationRunSchema.parse({...state, run: {...run, pausedAt: now.toISOString()}});
}
export function resumeRun(state: MeditationRun, now: Date): MeditationRun {
  const run = state.run;
  if (!run?.pausedAt) return state;
  const {pausedAt, ...rest} = run;
  return meditationRunSchema.parse({...state, run: {...rest, pausedMs: Math.min(86_400_000, run.pausedMs + Math.max(0, now.getTime() - Date.parse(pausedAt)))}});
}
/**
 * What the run becomes when it ends (the bell, "End early", or a reload after it finished): its start and the time
 * actually spent, at most the planned length, in whole seconds. Null when less than a second was spent.
 */
export function endedSession(run: Run, now: number): {startedAt: string; seconds: number; kind: Run['kind']; pattern?: Run['pattern']; moodBefore?: number} | null {
  const seconds = Math.min(run.plannedSec, Math.round(elapsedMs(run, now) / 1000));
  if (seconds < 1) return null;
  return {startedAt: run.startedAt, seconds, kind: run.kind, ...(run.pattern ? {pattern: run.pattern} : {}), ...(run.moodBefore !== undefined ? {moodBefore: run.moodBefore} : {})};
}
/**
 * When the remaining bells of a run fall, in milliseconds of the run's own time after `fromMs`: one every `intervalMin`
 * minutes (never at the start, never on the end) and the end bell. Scheduled ahead on the audio clock, so a throttled
 * background tab still rings them on time; a pause cancels them and the resume schedules the rest again.
 */
export function bellTimes(run: Pick<Run, 'plannedSec'>, fromMs: number, intervalMin: number | undefined): {interval: number[]; end: number | null} {
  const end = run.plannedSec * 1000, interval: number[] = [];
  if (intervalMin) for (let at = (Math.floor(fromMs / (intervalMin * 60_000)) + 1) * intervalMin * 60_000; at < end; at += intervalMin * 60_000) interval.push(at);
  return {interval, end: fromMs < end ? end : null};
}
/** "09:41" under an hour, "1:02:05" above. */
export function clockText(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000), h = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}
/** A saved session from what the run became, with the mood after and a note if the person added them. */
export function sessionFrom(ended: NonNullable<ReturnType<typeof endedSession>>, {id, timeZone, moodAfter, note, now, heartRate}: {id: string; timeZone: string; moodAfter?: number; note?: string; now: Date; heartRate?: {avg: number; min: number; max: number}}): MeditationSession {
  const at = now.toISOString();
  return meditationSessionSchema.parse({id, startedAt: ended.startedAt, seconds: ended.seconds, kind: ended.kind, ...(ended.pattern ? {pattern: ended.pattern} : {}), ...(ended.moodBefore !== undefined ? {moodBefore: ended.moodBefore} : {}), ...(moodAfter !== undefined ? {moodAfter} : {}), ...(note?.trim() ? {note: note.trim()} : {}), ...(heartRate ? {heartRate: {avg: heartRate.avg, min: heartRate.min, max: heartRate.max}} : {}), timeZone, source: ended.kind === 'breathing' ? 'breathing' : 'timer', createdAt: at, updatedAt: at});
}
