import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {AudioLike} from '../audio/context';
import {readDeviceRecord} from '../device-record';
import {cleanSettings, startRun, skipBreak, type PomodoroRun} from '../focus-sessions/pomodoro';
import {setPomodoroDepsForTests, skipPomodoroBreak, startPomodoro, stopPomodoro} from '../focus-sessions/pomodoro-run';
import {FOCUS_SESSIONS} from '../focus-sessions/schema';
import {bellStep, bellTimes} from './plan';
import {setRoundsDepsForTests, startRoundsConductorForTests} from './conductor';
import {FOCUS_ROUNDS, FOCUS_ROUNDS_KEY, bellOf, quietBreaksOf, volumeOf, type FocusRounds} from './store';

const T0 = Date.parse('2026-11-04T09:00:00Z'), min = (m: number) => T0 + m * 60_000;
const settings = cleanSettings({work: 25, shortBreak: 5, longBreak: 15, cycles: 2});
/** The frozen fixture for the lead's frozen reader. */
export const FROZEN_FOCUS_ROUNDS = {version: 1, bell: 'chime', volume: 40, quietBreaks: false};

describe('Focus intervals: the bell plan (BUILD list 2 #15)', () => {
  test('the frozen fixture reads; missing fields take the calm defaults; an unknown bell is dropped', () => {
    const read = readDeviceRecord({getItem: k => k === FOCUS_ROUNDS_KEY ? JSON.stringify(FROZEN_FOCUS_ROUNDS) : null}, FOCUS_ROUNDS).data;
    expect([bellOf(read), volumeOf(read), quietBreaksOf(read)]).toEqual(['chime', 40, false]);
    const empty: FocusRounds = {version: 1};
    expect([bellOf(empty), volumeOf(empty), quietBreaksOf(empty)]).toEqual(['bowl', 50, true]);
    expect(readDeviceRecord({getItem: () => JSON.stringify({version: 1, bell: 'gong'})}, FOCUS_ROUNDS).data.bell).toBeUndefined();
  });
  test('every change ahead is planned at once: the end of each phase, the last being the run\'s end', () => {
    const run = startRun(settings, T0, {id: 'r'});
    expect(bellTimes(run)).toEqual([min(25), min(30), min(55), min(70)]);
  });
  test('start rings now and plans the rest; a natural change (even caught up late in a background tab) rings nothing more', () => {
    const run = startRun(settings, T0, {id: 'r'});
    const s1 = bellStep(null, run, T0);
    expect(s1).toMatchObject({ringNow: true, cancel: false, schedule: [min(25), min(30), min(55), min(70)], quiet: false});
    // The tab was hidden: the page only catches up at minute 33, two changes later (work → break → work).
    const late: PomodoroRun = {...run, index: 2, phaseStartedAt: min(30)};
    const s2 = bellStep(s1.scheduled, late, min(33));
    expect(s2).toMatchObject({ringNow: false, cancel: false, schedule: [], quiet: false});
    const inBreak: PomodoroRun = {...run, index: 1, phaseStartedAt: min(25)};
    expect(bellStep(s1.scheduled, inBreak, min(25) + 400)).toMatchObject({ringNow: false, quiet: true});
  });
  test('a skipped break moves the later changes: re-planned, and the change rings now', () => {
    const run = startRun(settings, T0, {id: 'r'}), s1 = bellStep(null, run, T0);
    const skipped = skipBreak({...run, index: 1, phaseStartedAt: min(25), tally: null}, min(27)).run;
    const s2 = bellStep(s1.scheduled, skipped, min(27));
    expect(s2).toMatchObject({ringNow: true, cancel: true, schedule: [min(52), min(67)], quiet: false});
  });
  test('ending early cancels what was still to ring and rings nothing; finishing on time leaves nothing to cancel', () => {
    const run = startRun(settings, T0, {id: 'r'}), s1 = bellStep(null, run, T0);
    expect(bellStep(s1.scheduled, null, min(10))).toMatchObject({ringNow: false, cancel: true, quiet: false});
    expect(bellStep(s1.scheduled, null, min(70) + 300)).toMatchObject({ringNow: false, cancel: false});
    expect(bellStep(null, null, T0)).toMatchObject({ringNow: false, cancel: false, quiet: null});
  });
});

describe('Focus intervals on the page\'s run (fake timers): bells on the audio clock, the sound fades in breaks, totals unchanged', () => {
  const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
  let storage = memory(), strikes: number[] = [], stops = 0, ducks: number[] = [], prefs: FocusRounds = {version: 1};
  const ctx = (): AudioLike => ({
    currentTime: 100, destination: {}, state: 'running',
    createOscillator: () => ({type: '', frequency: {setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined}, connect: () => undefined, start: (t: number) => { strikes.push(t); }, stop: (t: number) => { if (t === 0) stops++; }}),
    createGain: () => ({gain: {setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined}, connect: () => undefined}),
  });
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(T0);
    storage = memory(); strikes = []; stops = 0; ducks = []; prefs = {version: 1, bell: 'soft'};
    setPomodoroDepsForTests({now: () => Date.now(), storage: () => storage, day: ms => new Date(ms).toISOString().slice(0, 10), announce: () => undefined, stopSound: () => undefined, tickTask: () => null, watchVisibility: () => () => undefined});
    const audio = ctx();
    setRoundsDepsForTests({audio: () => audio, now: () => Date.now(), prefs: () => prefs, duck: share => { ducks.push(share); }});
    startRoundsConductorForTests();
  });
  afterEach(() => { setRoundsDepsForTests(null); setPomodoroDepsForTests(null); vi.useRealTimers(); });

  test('a whole run: a bell now and one at each change, planned on the audio clock; breaks fade the sound; breaks are not counted', () => {
    startPomodoro({settings});
    // The soft tone is one oscillator a strike: now (at 100 s) and the four changes ahead.
    expect(strikes).toEqual([100, 100 + 25 * 60, 100 + 30 * 60, 100 + 55 * 60, 100 + 70 * 60]);
    vi.advanceTimersByTime(25 * 60_000 + 1000);
    expect(ducks).toEqual([1, 0.2]);
    vi.advanceTimersByTime(5 * 60_000);
    expect(ducks).toEqual([1, 0.2, 1]);
    vi.advanceTimersByTime(41 * 60_000);
    expect(strikes).toHaveLength(5); // nothing rang twice
    const sessions = readDeviceRecord(storage, FOCUS_SESSIONS).data.sessions;
    expect(sessions.map(s => s.plannedMinutes)).toEqual([25, 25]);
    expect(sessions.reduce((n, s) => n + s.focusedSeconds, 0)).toBe(50 * 60);
  });
  test('ending early stops the bells still to come; a skipped break rings now and re-plans', () => {
    startPomodoro({settings});
    vi.advanceTimersByTime(26 * 60_000);
    skipPomodoroBreak();
    expect(stops).toBe(3); // the three changes still ahead were cancelled
    expect(strikes.slice(5)).toEqual([100, 100 + 25 * 60, 100 + 40 * 60]);
    stopPomodoro();
    expect(stops).toBe(5);
    expect(strikes).toHaveLength(8);
  });
  test('the bell off ("silent") rings nothing; the fade still follows the choice', () => {
    prefs = {version: 1, bell: 'silent', quietBreaks: false};
    startPomodoro({settings});
    vi.advanceTimersByTime(26 * 60_000);
    expect(strikes).toEqual([]);
    expect(ducks).toEqual([1]);
  });
});
