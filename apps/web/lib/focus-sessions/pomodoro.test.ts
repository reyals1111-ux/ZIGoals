import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {POMODORO_DEFAULTS, advance, cleanSettings, endRun, phaseShare, phasesOf, runMinutes, runVisibility, secondsLeft, skipBreak, startRun} from './pomodoro';
import {dismissPomodoroResult, pomodoroSnapshot, setPomodoroDepsForTests, skipPomodoroBreak, startPomodoro, stopPomodoro, subscribePomodoro, undoPomodoroTick} from './pomodoro-run';
import {FOCUS_SESSIONS, FOCUS_SESSIONS_KEY, focusSessionsSchema} from './schema';
import {gardenOf} from './engine';
import {withShowcasePomodoro} from './showcase';
import {showcaseFocusSessions} from '../wrapped/showcase';
import {readDeviceRecord} from '../device-record';

/** Session AK (T3): Pomodoro mode in Focus Sessions — the phases, the timing (fake timers), the store and its effects. */
const T0 = Date.parse('2026-11-04T09:00:00Z'), min = (m: number) => T0 + m * 60_000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
let n = 0;
const ids = {day, newId: () => `focus_test-${String(++n).padStart(4, '0')}`};

describe('phases and settings', () => {
  it('four blocks with short breaks between and a long break after the last', () => {
    expect(phasesOf(POMODORO_DEFAULTS).map(p => `${p.kind}:${p.minutes}`)).toEqual(['work:25', 'break:5', 'work:25', 'break:5', 'work:25', 'break:5', 'work:25', 'long-break:15']);
    expect(runMinutes(POMODORO_DEFAULTS)).toBe(130);
    expect(phasesOf(cleanSettings({cycles: 1})).map(p => p.kind)).toEqual(['work', 'long-break']);
  });
  it('lengths are kept in bounds; nonsense falls back to the default', () => {
    expect(cleanSettings({work: 500, shortBreak: 0, longBreak: 2, cycles: 99})).toEqual({work: 90, shortBreak: 1, longBreak: 5, cycles: 8});
    expect(cleanSettings({work: Number.NaN})).toMatchObject({work: 25});
  });
});

describe('the run, step by step on timestamps', () => {
  it('a block that runs its length grows; a page asleep for an hour catches up exactly', () => {
    let run = startRun(cleanSettings({cycles: 2}), T0, {id: 'r', taskId: 'task_a', taskTitle: 'Write'});
    expect(secondsLeft(run, min(10))).toBe(15 * 60);
    expect(phaseShare(run, min(12.5))).toBe(0.5);
    const first = advance(run, min(25), ids);
    expect(first.events.map(e => e.kind)).toEqual(['block', 'phase']);
    const entry = (first.events[0] as {entry: Record<string, unknown>}).entry;
    expect(entry).toMatchObject({plannedMinutes: 25, focusedSeconds: 1500, outcome: 'grown', mode: 'pomodoro', block: 1, taskId: 'task_a', day: '2026-11-04'});
    expect(entry.endedAt).toBe(new Date(min(25)).toISOString());
    run = first.run;
    // Asleep from minute 26 to minute 90: the break, block 2 (timed at its own end) and the long break all close.
    const late = advance(run, min(90), ids);
    expect(late.events.map(e => e.kind)).toEqual(['phase', 'block', 'phase', 'finished']);
    expect((late.events[1] as {entry: {endedAt: string; block: number}}).entry).toMatchObject({endedAt: new Date(min(55)).toISOString(), block: 2});
    expect(late.run).toMatchObject({done: true, grown: 2, withered: 0});
  });
  it('time hidden in a block counts as away; a block started while hidden counts from its start; breaks never count', () => {
    let run = startRun(cleanSettings({cycles: 2, shortBreak: 5}), T0, {id: 'r'});
    run = runVisibility(run, true, min(5));
    run = runVisibility(run, false, min(15)); // 10 min away: over a tenth of 25 → withers
    let step = advance(run, min(25), ids);
    expect((step.events[0] as {entry: {outcome: string; awaySeconds: number}}).entry).toMatchObject({outcome: 'withered', awaySeconds: 600});
    run = runVisibility(step.run, true, min(27)); // hidden during the break, and still when block 2 starts at 30
    step = advance(run, min(31), ids);
    expect(step.run.tally!.hiddenSince).toBe(min(30));
    run = runVisibility(step.run, false, min(31));
    expect(run.tally!.away).toBe(60);
  });
  it('skip a break; end early keeps a withered block of a minute or more, nothing under a minute', () => {
    let run = advance(startRun(POMODORO_DEFAULTS, T0, {id: 'r'}), min(25), ids).run;
    expect(skipBreak(startRun(POMODORO_DEFAULTS, T0, {id: 'x'}), min(1)).events).toEqual([]);
    const skipped = skipBreak(run, min(26));
    expect(skipped.run).toMatchObject({index: 2, phaseStartedAt: min(26)});
    run = skipped.run;
    const ended = endRun(run, min(36), ids);
    expect(ended.events.map(e => e.kind)).toEqual(['block', 'finished']);
    expect((ended.events[0] as {entry: {outcome: string; focusedSeconds: number}}).entry).toMatchObject({outcome: 'withered', focusedSeconds: 600});
    expect(endRun(startRun(POMODORO_DEFAULTS, T0, {id: 'y'}), T0 + 30_000, ids).events.map(e => e.kind)).toEqual(['finished']);
  });
});

describe('the page\'s run (fake timers): saves each block, ticks the task with Undo, stops the sound it started', () => {
  const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
  let storage = memory(), stopSound = vi.fn(), ticked: string[] = [], reopened: string[] = [], hide: ((h: boolean) => void) | null = null;
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(T0);
    storage = memory(); stopSound = vi.fn(); ticked = []; reopened = []; hide = null;
    setPomodoroDepsForTests({now: () => Date.now(), storage: () => storage, day, announce: () => undefined, stopSound,
      tickTask: id => { ticked.push(id); return () => { reopened.push(id); }; },
      watchVisibility: fn => { hide = fn; return () => { hide = null; }; }});
  });
  afterEach(() => { setPomodoroDepsForTests(null); vi.useRealTimers(); });

  it('a whole run from a task: two grown blocks saved, the task ticked, Undo opens it, the sound stopped', () => {
    const seen = vi.fn(), off = subscribePomodoro(seen), startSound = vi.fn();
    startPomodoro({settings: cleanSettings({work: 10, shortBreak: 2, longBreak: 5, cycles: 2}), task: {id: 'task_a', title: 'Write the report'}, tickTask: true, startSound});
    expect(startSound).toHaveBeenCalledOnce();
    expect(readDeviceRecord(storage, FOCUS_SESSIONS).data.pomodoro).toEqual({work: 10, shortBreak: 2, longBreak: 5, cycles: 2, sound: true, tickTask: true});
    // A second start while one runs changes nothing.
    expect(startPomodoro({settings: POMODORO_DEFAULTS}).id).toBe(pomodoroSnapshot().run!.id);
    vi.advanceTimersByTime(10 * 60_000);
    expect(readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions).toHaveLength(1);
    expect(pomodoroSnapshot().run!.phases[pomodoroSnapshot().run!.index]!.kind).toBe('break');
    vi.advanceTimersByTime(17 * 60_000);
    const s = pomodoroSnapshot();
    expect(s.run).toBeNull();
    expect(s.last).toMatchObject({grown: 2, withered: 0, ticked: true, taskId: 'task_a', taskTitle: 'Write the report', endedEarly: false});
    expect(ticked).toEqual(['task_a']);
    expect(stopSound).toHaveBeenCalledOnce();
    const stored = readDeviceRecord(storage, FOCUS_SESSIONS).data;
    expect(stored.sessions.map(x => [x.block, x.outcome, x.taskId])).toEqual([[1, 'grown', 'task_a'], [2, 'grown', 'task_a']]);
    expect(gardenOf(stored, '2026-11-04')).toMatchObject({grown: 2, weekMinutes: 20});
    undoPomodoroTick();
    expect(reopened).toEqual(['task_a']);
    expect(pomodoroSnapshot().last).toMatchObject({ticked: false});
    dismissPomodoroResult();
    expect(pomodoroSnapshot().last).toBeNull();
    expect(seen).toHaveBeenCalled();
    off();
  });
  it('stopped early: the block so far is kept withered, the task is not ticked, no sound to stop', () => {
    startPomodoro({settings: POMODORO_DEFAULTS, task: {id: 'task_b', title: 'B'}, tickTask: true});
    hide?.(true); vi.advanceTimersByTime(3 * 60_000); hide?.(false);
    vi.advanceTimersByTime(2 * 60_000);
    stopPomodoro();
    expect(pomodoroSnapshot().last).toMatchObject({endedEarly: true, ticked: false, withered: 1});
    expect(ticked).toEqual([]);
    expect(stopSound).not.toHaveBeenCalled();
    expect(readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions[0]).toMatchObject({outcome: 'withered', awaySeconds: 180, focusedSeconds: 120});
  });
  it('skipping the break starts the next block at once; a run with no task never ticks', () => {
    startPomodoro({settings: cleanSettings({work: 5, cycles: 2}), tickTask: true});
    vi.advanceTimersByTime(5 * 60_000 + 1000);
    skipPomodoroBreak();
    expect(pomodoroSnapshot().run).toMatchObject({index: 2});
    vi.advanceTimersByTime(5 * 60_000 + 1000);
    skipPomodoroBreak();
    expect(pomodoroSnapshot().run).toBeNull();
    expect(pomodoroSnapshot().last).toMatchObject({grown: 2, ticked: false});
    expect(ticked).toEqual([]);
  });
});

describe('stored format (TIER 3): additive and optional only', () => {
  it('an older record reads unchanged; unreadable Pomodoro fields are dropped, never failing the list', () => {
    const old = {version: 1, sessions: [{id: 'focus_aaaaaaaa-1', startedAt: '2026-10-29T09:00:00.000Z', endedAt: '2026-10-29T09:25:00.000Z', day: '2026-10-29', plannedMinutes: 25, focusedSeconds: 1500, awaySeconds: 0, outcome: 'grown'}]};
    expect(focusSessionsSchema.parse(old)).toEqual(old);
    const odd = focusSessionsSchema.parse({...old, pomodoro: {work: 9999}, sessions: [{...old.sessions[0], block: 'x', mode: 7, taskId: 'task_a'}]});
    expect(odd.pomodoro).toBeUndefined();
    expect(odd.sessions[0]).toMatchObject({taskId: 'task_a'});
    expect(odd.sessions[0]!.block).toBeUndefined();
    expect(readDeviceRecord({getItem: () => JSON.stringify(odd)}, FOCUS_SESSIONS).unreadable).toBe(false);
  });
  it('the Showcase Pomodoro history is labelled by its ids, valid, and linked to a Showcase task', () => {
    const r = withShowcasePomodoro(showcaseFocusSessions('2026-11-04'), '2026-11-04');
    const pomo = r.sessions.filter(s => s.mode === 'pomodoro');
    expect(pomo).toHaveLength(8);
    expect(pomo.every(s => s.id.startsWith('focus_showcase-pomo-'))).toBe(true);
    expect(pomo.filter(s => s.taskId === 'task_showcase-02')).toHaveLength(4);
    expect(pomo.filter(s => s.outcome === 'withered')).toHaveLength(1);
    expect(readDeviceRecord({getItem: (k: string) => k === FOCUS_SESSIONS_KEY ? JSON.stringify(r) : null}, FOCUS_SESSIONS).unreadable).toBe(false);
  });
});
