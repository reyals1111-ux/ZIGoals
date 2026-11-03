import {finishTally, onVisibility, startTally, type Tally} from './engine';
import {POMODORO_LIMITS, focusSessionSchema, pomodoroSettingsSchema, type FocusSessionEntry, type PomodoroSettings} from './schema';

/**
 * Session AK (T3): a Pomodoro run in Focus Sessions, as pure steps on timestamps (so a tab put to sleep catches up
 * exactly when it wakes). A run is `cycles` work blocks with a short break between two of them and a long break after
 * the last; then it is finished. Each work block is a Focus Session of its own, with the same honest rule as a single
 * session (lib/focus-sessions/engine.ts): it grows when it ran its length with little time away (the page hidden), and
 * withers, and is kept, when it was ended early or mostly away. Breaks are never recorded.
 */
export const POMODORO_DEFAULTS: PomodoroSettings = {work: 25, shortBreak: 5, longBreak: 15, cycles: 4};
export type PhaseKind = 'work' | 'break' | 'long-break';
export type Phase = {kind: PhaseKind; minutes: number; /** The work block this phase follows or is (1-based). */ block: number};
/** Lengths kept within their bounds (a choice out of bounds moves to the nearest allowed value). */
export function cleanSettings(input: Partial<PomodoroSettings> = {}): PomodoroSettings {
  const pick = (key: keyof typeof POMODORO_LIMITS) => { const v = Math.round(Number(input[key] ?? POMODORO_DEFAULTS[key])); const [lo, hi] = POMODORO_LIMITS[key]; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : POMODORO_DEFAULTS[key] as number; };
  return pomodoroSettingsSchema.parse({work: pick('work'), shortBreak: pick('shortBreak'), longBreak: pick('longBreak'), cycles: pick('cycles'), ...(input.sound !== undefined ? {sound: input.sound} : {}), ...(input.tickTask !== undefined ? {tickTask: input.tickTask} : {})});
}
export function phasesOf(settings: PomodoroSettings): Phase[] {
  const out: Phase[] = [];
  for (let b = 1; b <= settings.cycles; b++) {
    out.push({kind: 'work', minutes: settings.work, block: b});
    out.push(b < settings.cycles ? {kind: 'break', minutes: settings.shortBreak, block: b} : {kind: 'long-break', minutes: settings.longBreak, block: b});
  }
  return out;
}
/** The whole run's planned minutes (work and breaks). */
export const runMinutes = (settings: PomodoroSettings) => phasesOf(settings).reduce((n, p) => n + p.minutes, 0);

export type PomodoroRun = {
  id: string; settings: PomodoroSettings; phases: Phase[];
  /** The phase now, and when it began (ms). */
  index: number; phaseStartedAt: number; startedAt: number;
  /** The work block's tally (time away), while a work block runs. */
  tally: Tally | null;
  taskId?: string; taskTitle?: string; goalId?: string;
  /** Blocks finished so far: grown and withered. */
  grown: number; withered: number;
  done: boolean;
  /** Whether the page is hidden now (a work block that starts while it is counts away from its start). */
  hidden: boolean;
};
export type RunEvent = {kind: 'block'; entry: FocusSessionEntry} | {kind: 'phase'; phase: Phase} | {kind: 'finished'};

export function startRun(settings: PomodoroSettings, now: number, {id, taskId, taskTitle, goalId}: {id: string; taskId?: string; taskTitle?: string; goalId?: string}): PomodoroRun {
  const clean = cleanSettings(settings), phases = phasesOf(clean);
  return {id, settings: clean, phases, index: 0, phaseStartedAt: now, startedAt: now, tally: startTally(now, clean.work), grown: 0, withered: 0, done: false, hidden: false,
    ...(taskId ? {taskId} : {}), ...(taskTitle ? {taskTitle: taskTitle.slice(0, 140)} : {}), ...(goalId ? {goalId} : {})};
}
export const phaseEnd = (run: PomodoroRun) => run.phaseStartedAt + run.phases[run.index]!.minutes * 60_000;
/** Seconds left in the phase now (never below 0). */
export const secondsLeft = (run: PomodoroRun, now: number) => run.done ? 0 : Math.max(0, Math.ceil((phaseEnd(run) - now) / 1000));
/** Share of the phase gone (0–1), for a ring. */
export const phaseShare = (run: PomodoroRun, now: number) => run.done ? 1 : Math.min(1, Math.max(0, (now - run.phaseStartedAt) / (run.phases[run.index]!.minutes * 60_000)));

/** A work block as a Focus Session entry (null when it lasted under a minute: nothing is kept then). */
function blockEntry(run: PomodoroRun, at: number, endedEarly: boolean, day: (ms: number) => string, entryId: string): FocusSessionEntry | null {
  if (!run.tally) return null;
  const entry = finishTally(run.tally, at, endedEarly, day(at), entryId, run.goalId);
  if (!entry) return null;
  return focusSessionSchema.parse({...entry, mode: 'pomodoro', block: run.phases[run.index]!.block, ...(run.taskId ? {taskId: run.taskId} : {})});
}
function next(run: PomodoroRun, at: number): PomodoroRun {
  const index = run.index + 1;
  if (index >= run.phases.length) return {...run, done: true, tally: null};
  const phase = run.phases[index]!;
  const tally = phase.kind === 'work' ? startTally(at, phase.minutes) : null;
  return {...run, index, phaseStartedAt: at, tally: tally && run.hidden ? {...tally, hiddenSince: at} : tally};
}
const counted = (run: PomodoroRun, entry: FocusSessionEntry | null): PomodoroRun => !entry ? run : entry.outcome === 'grown' ? {...run, grown: run.grown + 1} : {...run, withered: run.withered + 1};

/**
 * The run at `now`: every phase that ended since is closed in order (a work block becomes an entry, timed at its own
 * end), so a page asleep for an hour catches up exactly. Returns the events for the caller to act on (save a block,
 * announce a phase, the run finished).
 */
export function advance(run: PomodoroRun, now: number, {day, newId}: {day: (ms: number) => string; newId: () => string}): {run: PomodoroRun; events: RunEvent[]} {
  const events: RunEvent[] = [];
  let r = run;
  for (let guard = 0; !r.done && now >= phaseEnd(r) && guard < 40; guard++) {
    const end = phaseEnd(r), phase = r.phases[r.index]!;
    if (phase.kind === 'work') {
      // Time hidden past the block's end is not the block's: the tally closes at the block's end.
      const tally = r.tally && r.tally.hiddenSince !== null ? onVisibility(r.tally, false, Math.max(r.tally.hiddenSince, end)) : r.tally;
      const entry = blockEntry({...r, tally}, end, false, day, newId());
      if (entry) events.push({kind: 'block', entry});
      r = counted(r, entry);
    }
    r = next(r, end);
    events.push(r.done ? {kind: 'finished'} : {kind: 'phase', phase: r.phases[r.index]!});
  }
  return {run: r, events};
}
/** The page was hidden or shown: only a work block counts time away. */
export const runVisibility = (run: PomodoroRun, hidden: boolean, now: number): PomodoroRun => run.done ? run : {...run, hidden, tally: run.tally ? onVisibility(run.tally, hidden, now) : null};
/** Ends a break now and starts the next work block (or finishes the run after the long break). */
export function skipBreak(run: PomodoroRun, now: number): {run: PomodoroRun; events: RunEvent[]} {
  if (run.done || run.phases[run.index]!.kind === 'work') return {run, events: []};
  const r = next(run, now);
  return {run: r, events: [r.done ? {kind: 'finished'} : {kind: 'phase', phase: r.phases[r.index]!}]};
}
/** Ends the run now. A work block under way becomes an entry ended early (withered, kept) when it lasted a minute. */
export function endRun(run: PomodoroRun, now: number, {day, newId}: {day: (ms: number) => string; newId: () => string}): {run: PomodoroRun; events: RunEvent[]} {
  if (run.done) return {run, events: []};
  const events: RunEvent[] = [];
  let r = run;
  if (r.phases[r.index]!.kind === 'work') {
    const entry = blockEntry(r, now, true, day, newId());
    if (entry) events.push({kind: 'block', entry});
    r = counted(r, entry);
  }
  return {run: {...r, done: true, tally: null}, events: [...events, {kind: 'finished'}]};
}
