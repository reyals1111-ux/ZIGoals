import {updateDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {localDate} from '../local-date';
import {addSession, newFocusId} from './engine';
import {completeTask} from '../tasks/device';
import {FOCUS_SESSIONS, type PomodoroSettings} from './schema';
import {advance, endRun, runVisibility, skipBreak, startRun, type PomodoroRun, type RunEvent} from './pomodoro';
import {cleanNote, withRunNote} from './notes';

/**
 * Session AK (T3): the one Pomodoro run of the page, as a tiny store every view reads (the Focus Sessions panel on
 * Journey, the Tasks page, NOVA's Focus widget) without holding the timer itself. It lives as long as the page does:
 * moving around ZIGoals keeps it running; a reload ends it (the blocks already finished are kept). While a run is on,
 * one timer ticks each second and the page's visibility is watched (time hidden counts as away during a work block).
 *
 * Each finished work block is saved at once to `zigoals:focus-sessions:v1` (through the app storage: the person's own,
 * or the Showcase tab's). When the run finishes, a focus sound it started is stopped, and — if the person chose it when
 * starting from a task — the task is ticked, with an Undo kept in `last`. Nothing is sent anywhere.
 */
/** Session AV lane 2 (r3-plan, LEDGER #260): `note` what was written during the run; `noteKept` whether a block holds it. */
export type PomodoroLast = {runId: string; grown: number; withered: number; taskId?: string; taskTitle?: string; ticked: boolean; undo?: () => void; endedEarly: boolean; note?: string; noteKept?: boolean};
export type PomodoroSnapshot = {run: PomodoroRun | null; last: PomodoroLast | null; now: number; error: string; /** Session AV lane 2 (r3-plan, LEDGER #260): the note of the run under way. */ note?: string};
type Deps = {
  now: () => number; storage: () => Pick<Storage, 'getItem' | 'setItem'>; day: (ms: number) => string; announce: (key: string) => void;
  tickTask: (taskId: string) => (() => void) | null; stopSound: () => void; setInterval: (fn: () => void, ms: number) => unknown; clearInterval: (h: unknown) => void;
  watchVisibility: (fn: (hidden: boolean) => void) => (() => void);
};
const realDeps: Deps = {
  now: () => Date.now(), storage: () => getAppStorage(), day: ms => localDate(new Date(ms)),
  announce: key => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); },
  tickTask: id => { const done = completeTask(id); return done.changed ? done.undo : null; },
  stopSound: () => { void import('../audio/ambient-state').then(s => s.ambientState().playing ? import('../audio/ambient').then(a => a.stopAmbient()) : undefined).catch(() => undefined); },
  setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: h => clearInterval(h as ReturnType<typeof setInterval>),
  watchVisibility: fn => { if (typeof document === 'undefined') return () => undefined; const on = () => fn(document.visibilityState === 'hidden'); document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on); },
};
let deps: Deps = realDeps;
let state: PomodoroSnapshot = {run: null, last: null, now: 0, error: ''};
let timer: unknown = null, unwatch: (() => void) | null = null, soundStarted = false, tickOnFinish = false;
// Session AV lane 2 (r3-plan, LEDGER #260): the run's note and the ids of the blocks it saved (the note sits on the latest).
let runNote = '', runBlocks: string[] = [];
const listeners = new Set<() => void>();
const emit = (next: Partial<PomodoroSnapshot>) => { state = {...state, ...next}; for (const l of listeners) l(); };

export const pomodoroSnapshot = (): PomodoroSnapshot => state;
const SERVER: PomodoroSnapshot = {run: null, last: null, now: 0, error: ''};
export const serverPomodoroSnapshot = (): PomodoroSnapshot => SERVER;
export function subscribePomodoro(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }

function save(events: RunEvent[]): string {
  const blocks = events.flatMap(e => e.kind === 'block' ? [e.entry] : []);
  if (!blocks.length) return '';
  try { updateDeviceRecord(deps.storage(), FOCUS_SESSIONS, r => blocks.reduce(addSession, r)); runBlocks.push(...blocks.map(b => b.id)); deps.announce(FOCUS_SESSIONS.key); }
  catch { return 'A finished block could not be saved on this device.'; }
  return runNote.trim() ? keepNote() : '';
}
/** Session AV lane 2 (r3-plan, LEDGER #260): writes the run's note onto its latest saved block (and off the earlier ones). */
function keepNote(): string {
  if (!runBlocks.length) return '';
  try { updateDeviceRecord(deps.storage(), FOCUS_SESSIONS, r => withRunNote(r, runBlocks, runNote)); deps.announce(FOCUS_SESSIONS.key); return ''; }
  catch { return 'Your note could not be kept on this device; it is still in the box.'; }
}
/** The note typed during the run (kept with the run's latest block as blocks finish, when the box is left, and at the end). */
export function setPomodoroNote(text: string): void { if (!state.run) return; runNote = cleanNote(text); emit({note: runNote}); }
export function keepPomodoroNote(): void { if (state.run && runBlocks.length) { const error = keepNote(); if (error) emit({error}); } }
function stopTicking() {
  if (timer !== null) deps.clearInterval(timer);
  timer = null; unwatch?.(); unwatch = null;
}
function finish(run: PomodoroRun, endedEarly: boolean, error: string) {
  stopTicking();
  if (soundStarted) deps.stopSound();
  soundStarted = false;
  let ticked = false, undo: (() => void) | undefined;
  if (tickOnFinish && run.taskId && !endedEarly) {
    try { const u = deps.tickTask(run.taskId); if (u) { ticked = true; undo = u; } } catch { /* the task was removed meanwhile: nothing to tick */ }
  }
  tickOnFinish = false;
  const note = runNote.trim(), noteError = note ? keepNote() : '', noteKept = !!note && !!runBlocks.length && !noteError;
  runNote = ''; runBlocks = [];
  emit({run: null, now: deps.now(), error: error || noteError, note: '', last: {runId: run.id, grown: run.grown, withered: run.withered, ticked, endedEarly, ...(undo ? {undo} : {}), ...(run.taskId ? {taskId: run.taskId} : {}), ...(run.taskTitle ? {taskTitle: run.taskTitle} : {}), ...(note ? {note, noteKept} : {})}});
}
function tick() {
  const run = state.run;
  if (!run) { stopTicking(); return; }
  const result = advance(run, deps.now(), {day: deps.day, newId: newFocusId});
  const error = save(result.events) || state.error;
  if (result.run.done) finish(result.run, false, error);
  else emit({run: result.run, now: deps.now(), error});
}

/**
 * Starts a run (replacing none: one at a time). Call it from a tap: `startSound` (components/music/soundscape-start.ts's
 * `startSoundscape('focus')`) must run inside the tap on iPhone and iPad. The lengths chosen are remembered.
 */
export function startPomodoro({settings, task, goalId, tickTask = false, startSound}: {settings: PomodoroSettings; task?: {id: string; title: string}; goalId?: string; tickTask?: boolean; startSound?: () => void}): PomodoroRun {
  if (state.run) return state.run;
  const now = deps.now();
  const run = startRun(settings, now, {id: `pomodoro_${now.toString(36)}`, ...(task ? {taskId: task.id, taskTitle: task.title} : {}), ...(goalId ? {goalId} : {})});
  let error = '';
  try { updateDeviceRecord(deps.storage(), FOCUS_SESSIONS, r => ({...r, pomodoro: {...run.settings, sound: !!startSound, ...(task ? {tickTask} : {tickTask: r.pomodoro?.tickTask ?? false})}})); deps.announce(FOCUS_SESSIONS.key); }
  catch { error = 'Your lengths could not be remembered on this device; the run goes on.'; }
  soundStarted = !!startSound; tickOnFinish = !!task && tickTask; runNote = ''; runBlocks = [];
  if (startSound) { try { startSound(); } catch { soundStarted = false; } }
  timer = deps.setInterval(tick, 1000);
  unwatch = deps.watchVisibility(hidden => { if (state.run) emit({run: runVisibility(state.run, hidden, deps.now())}); });
  emit({run, last: null, now, error, note: ''});
  return run;
}
/** Ends the run now (a block under way is kept, withered, when it lasted a minute). The task is not ticked. */
export function stopPomodoro(): void {
  const run = state.run;
  if (!run) return;
  const result = endRun(run, deps.now(), {day: deps.day, newId: newFocusId});
  finish(result.run, true, save(result.events));
}
/** Ends the break now and starts the next block. */
export function skipPomodoroBreak(): void {
  const run = state.run;
  if (!run) return;
  const result = skipBreak(run, deps.now());
  if (result.run.done) finish(result.run, false, state.error); else emit({run: result.run, now: deps.now()});
}
/** Undoes the tick of the task the last run finished (and forgets the offer). */
export function undoPomodoroTick(): void {
  const last = state.last;
  if (!last?.undo) return;
  try { last.undo(); emit({last: {...last, ticked: false, undo: undefined}}); } catch { emit({error: 'The task could not be opened again on this device.'}); }
}
export const dismissPomodoroResult = () => emit({last: null, error: ''});

/** Tests only: replaces the clock, storage, timers and side effects, and clears the run. */
export function setPomodoroDepsForTests(over: Partial<Deps> | null): void {
  stopTicking(); deps = over ? {...realDeps, ...over} : realDeps; state = {run: null, last: null, now: 0, error: ''}; soundStarted = false; tickOnFinish = false; runNote = ''; runBlocks = [];
}
