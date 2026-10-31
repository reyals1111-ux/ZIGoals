import type {RoutineStep} from '../../lib/routines/engine';

/**
 * Session AK (5.4): the full-screen player's per-step timer, pure: time counted while running, kept while paused.
 * `now` is a millisecond clock (Date.now()); nothing here reads it.
 */
export type StepTimer = {elapsedMs: number; runningSince: number | null};
export const idleTimer = (): StepTimer => ({elapsedMs: 0, runningSince: null});
export const timerElapsedMs = (t: StepTimer, now: number) => t.elapsedMs + (t.runningSince === null ? 0 : Math.max(0, now - t.runningSince));
export const startTimer = (t: StepTimer, now: number): StepTimer => t.runningSince === null ? {...t, runningSince: now} : t;
export const pauseTimer = (t: StepTimer, now: number): StepTimer => t.runningSince === null ? t : {elapsedMs: timerElapsedMs(t, now), runningSince: null};
/** The minutes a timed step is credited: what it took, two decimals (the routine player's own rule, L-084). */
export const creditedMinutes = (t: StepTimer, now: number) => Number((timerElapsedMs(t, now) / 60_000).toFixed(2));
export const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** The time a step's timer reached its minutes (it rings once, then). */
export const reachedTarget = (t: StepTimer, now: number, minutes: number | null) => minutes !== null && minutes > 0 && timerElapsedMs(t, now) >= minutes * 60_000;

export type FullscreenStep = {id: string; title: string; description?: string; minutes: number | null; status: 'done' | 'skipped' | 'pending' | 'current'};
/** The routine engine's steps as the full-screen player shows them. */
export const fullscreenSteps = (steps: readonly RoutineStep[]): FullscreenStep[] => steps.map(s => ({id: s.habit.id, title: s.habit.title, ...(s.habit.description ? {description: s.habit.description} : {}), minutes: s.minutes, status: s.status}));
/** The step to show: the current one, else the first still pending; null when every step is done or skipped. */
export const activeIndex = (steps: readonly FullscreenStep[]) => { const i = steps.findIndex(s => s.status === 'current'); return i >= 0 ? i : steps.findIndex(s => s.status === 'pending'); };
