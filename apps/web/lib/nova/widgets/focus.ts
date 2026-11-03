import type {PomodoroLast} from '../../focus-sessions/pomodoro-run';
import {secondsLeft, type PomodoroRun} from '../../focus-sessions/pomodoro';
import type {PomodoroSettings} from '../../focus-sessions/schema';

/**
 * Session AK WA (T3/N2): what NOVA's "Focus" widget shows (components/nova/widgets/focus.tsx), from the page's one
 * Pomodoro run (lib/focus-sessions/pomodoro-run.ts) and this week's focus sessions. Pure.
 * - `running`: a run is going on anywhere in ZIGoals: the phase, the time left, the block, the task it is for;
 * - `result`: the run that just ended: what grew, and whether its task was ticked (the widget offers that Undo);
 * - `week`: no run; this week's focus in words, and a Start with the person's own lengths;
 * - `empty`: no run and no focus session this week (a fresh start teaches; never a zero).
 * `week` is null when the focus record could not be read: the run still shows, the week is never guessed.
 */
export const FOCUS_PHASE_WORDS = {work: 'Focus', break: 'Short break', 'long-break': 'Long break'} as const;
export type FocusWidgetView =
  | {kind: 'running'; clock: string; phase: string; block: number; blocks: number; task: string | null; onBreak: boolean}
  | {kind: 'result'; line: string; ticked: string | null}
  | {kind: 'week'; minutes: number; sessions: number; start: string}
  | {kind: 'empty'; start: string};
/** "12:05" for seconds left. */
export const focusClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function focusWidgetView({run, last, now, week, settings}: {run: PomodoroRun | null; last: PomodoroLast | null; now: number; week: {minutes: number; sessions: number} | null; settings: PomodoroSettings}): FocusWidgetView {
  const start = `Start a ${settings.work}-minute Pomodoro`;
  if (run && !run.done) {
    const phase = run.phases[run.index]!;
    return {kind: 'running', clock: focusClock(secondsLeft(run, now || run.phaseStartedAt)), phase: FOCUS_PHASE_WORDS[phase.kind], block: phase.block, blocks: run.settings.cycles, task: run.taskTitle ?? null, onBreak: phase.kind !== 'work'};
  }
  if (last) return {kind: 'result', line: `${last.endedEarly ? 'Run ended' : 'Run finished'}: ${last.grown} grown${last.withered ? `, ${last.withered} withered (kept)` : ''}.`, ticked: last.ticked && last.taskTitle ? last.taskTitle : null};
  if (week && week.sessions > 0) return {kind: 'week', minutes: week.minutes, sessions: week.sessions, start};
  return {kind: 'empty', start};
}
