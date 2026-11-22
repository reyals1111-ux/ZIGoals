import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanSettings} from './pomodoro';
import {keepPomodoroNote, pomodoroSnapshot, setPomodoroDepsForTests, setPomodoroNote, startPomodoro, stopPomodoro} from './pomodoro-run';
import {FOCUS_SESSIONS} from './schema';
import {appendTaskNote, restoreTaskNotes, withRunNote} from './notes';
import {readDeviceRecord} from '../device-record';
import {addTask} from '../tasks/engine';
import {emptyTasks} from '../tasks/schema';

/** Session AV lane 2 (r3-plan, LEDGER #260; Structured's notes in the Focus Timer): a note kept with the session, then the task. */
const T0 = Date.parse('2026-11-23T09:00:00Z'), day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
describe('the run’s note', () => {
  let storage = memory();
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(T0); storage = memory();
    setPomodoroDepsForTests({now: () => Date.now(), storage: () => storage, day, announce: () => undefined, stopSound: () => undefined, tickTask: () => null, watchVisibility: () => () => undefined});
  });
  afterEach(() => { setPomodoroDepsForTests(null); vi.useRealTimers(); });
  it('is kept on the run’s latest block, moving on as blocks finish, and comes back in the result', () => {
    startPomodoro({settings: cleanSettings({work: 10, shortBreak: 2, longBreak: 5, cycles: 2}), task: {id: 'task_a', title: 'Fictional report'}});
    setPomodoroNote('Ask Noor about the fictional figures');
    expect(pomodoroSnapshot().note).toBe('Ask Noor about the fictional figures');
    keepPomodoroNote(); // nothing saved yet: nothing to hold it
    expect(readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions).toEqual([]);
    vi.advanceTimersByTime(10 * 60_000);
    let sessions = readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions;
    expect(sessions.map(s => s.note)).toEqual(['Ask Noor about the fictional figures']);
    setPomodoroNote('Ask Noor about the fictional figures\nThen send it');
    vi.advanceTimersByTime(12 * 60_000);
    sessions = readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions;
    expect(sessions.map(s => s.note ?? null)).toEqual([null, 'Ask Noor about the fictional figures\nThen send it']);
    stopPomodoro();
    expect(pomodoroSnapshot().last).toMatchObject({note: 'Ask Noor about the fictional figures\nThen send it', noteKept: true, taskId: 'task_a'});
    expect(pomodoroSnapshot().note).toBe('');
  });
  it('a run ended before a minute keeps no session, and says the note was not kept with one', () => {
    startPomodoro({settings: cleanSettings({work: 10, shortBreak: 2, longBreak: 5, cycles: 1})});
    setPomodoroNote('A fictional thought');
    vi.advanceTimersByTime(20_000);
    stopPomodoro();
    expect(pomodoroSnapshot().last).toMatchObject({note: 'A fictional thought', noteKept: false});
    expect(readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions).toEqual([]);
  });
});
describe('the note under the task’s own notes', () => {
  it('adds below what was there, with a blank line; Undo puts the notes back; too long is refused', () => {
    const at = new Date(T0), r = addTask(emptyTasks(), {title: 'Fictional report', notes: 'Outline first'}, {id: 'task_a', at, today: '2026-11-23'});
    const added = appendTaskNote(r, 'task_a', 'Then send it', at);
    expect(added.tasks[0]!.notes).toBe('Outline first\n\nThen send it');
    expect(restoreTaskNotes(added, 'task_a', 'Outline first').tasks[0]!.notes).toBe('Outline first');
    expect(restoreTaskNotes(added, 'task_a', undefined).tasks[0]!.notes).toBeUndefined();
    expect(() => appendTaskNote(r, 'task_a', 'x'.repeat(5000))).toThrow(/would pass/);
    expect(() => appendTaskNote(r, 'gone', 'x')).toThrow(/no longer/);
  });
  it('withRunNote clears an empty note and touches no other session', () => {
    const rec = {version: 1 as const, sessions: [
      {id: 'focus_aaaaaaaa', startedAt: '2026-11-23T09:00:00.000Z', endedAt: '2026-11-23T09:10:00.000Z', day: '2026-11-23', plannedMinutes: 10, focusedSeconds: 600, awaySeconds: 0, outcome: 'grown' as const, note: 'Other run'},
      {id: 'focus_bbbbbbbb', startedAt: '2026-11-23T10:00:00.000Z', endedAt: '2026-11-23T10:10:00.000Z', day: '2026-11-23', plannedMinutes: 10, focusedSeconds: 600, awaySeconds: 0, outcome: 'grown' as const, note: 'Mine'},
    ]};
    expect(withRunNote(rec, ['focus_bbbbbbbb'], '  ').sessions.map(s => s.note ?? null)).toEqual(['Other run', null]);
  });
});
