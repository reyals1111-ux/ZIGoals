import {afterEach, describe, expect, test} from 'vitest';
import {emptyMeditation, meditationRunSchema, meditationSchema, type Meditation} from './schema';
import {bellTimes, clockText, elapsedMs, endedSession, isDone, pauseRun, remainingMs, resumeRun, sessionFrom, startRun, type Run} from './timer';
import {cycleSeconds, phaseAnnouncement, phaseAt} from './breathing';
import {BELLS, audioReady, peakGain, resetAudioForTests, ring, strike, wakeAudio, type AudioLike} from './bells';
import {daysInARow, meditationSummary, minutesOn, minutesText, sessionDay, weekStart, weeklyBars} from './stats';
import {addSession, deleteSession, saveManual, setBells, setMeditationGoal} from './engine';
import {showcaseMeditation} from './showcase';
import {emptyWReminders} from '../reminders/w-schema';
import {MEDITATION_TIME, dismissMeditationTime, meditationDue, setMeditationTime} from '../reminders/meditation-time';

// Session W Part 5: everything here is fictional. Time is always instants; the bells are made on the device.
const T0 = new Date('2026-10-21T06:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);
const runOf = (state: ReturnType<typeof startRun>): Run => state.run!;

describe('the timer: instants, never ticks', () => {
  test('starts for whole minutes from 1 to 240 only', () => {
    expect(runOf(startRun({now: T0, minutes: 10}))).toEqual({startedAt: T0.toISOString(), plannedSec: 600, pausedMs: 0, kind: 'timer'});
    for (const minutes of [0, 241, 2.5]) expect(() => startRun({now: T0, minutes})).toThrow('Choose whole minutes from 1 to 240.');
    expect(runOf(startRun({now: T0, minutes: 3, kind: 'breathing', pattern: '478', moodBefore: 2}))).toMatchObject({kind: 'breathing', pattern: '478', moodBefore: 2});
  });
  test('a hidden tab or a reload loses nothing: elapsed is the distance from the start, whatever ticked', () => {
    const run = runOf(startRun({now: T0, minutes: 10}));
    expect(elapsedMs(run, at(0).getTime())).toBe(0);
    // Nothing ran for seven minutes (a background tab, a locked phone); the next look is exact.
    expect(elapsedMs(run, at(7 * 60_000).getTime())).toBe(420_000);
    expect(clockText(remainingMs(run, at(7 * 60_000).getTime()))).toBe('03:00');
    // A reload reads the same record: the same answer.
    const reread = runOf(meditationRunSchema.parse(JSON.parse(JSON.stringify(startRun({now: T0, minutes: 10})))));
    expect(elapsedMs(reread, at(7 * 60_000).getTime())).toBe(420_000);
    expect(isDone(run, at(600_000).getTime())).toBe(true);
    expect(remainingMs(run, at(900_000).getTime())).toBe(0);
  });
  test('a pause stops the clock; resuming adds the paused span', () => {
    let state = startRun({now: T0, minutes: 10});
    state = pauseRun(state, at(120_000));
    expect(elapsedMs(state.run!, at(500_000).getTime())).toBe(120_000);
    expect(pauseRun(state, at(130_000))).toBe(state);
    state = resumeRun(state, at(300_000));
    expect(state.run!.pausedMs).toBe(180_000);
    expect(state.run!.pausedAt).toBeUndefined();
    expect(elapsedMs(state.run!, at(360_000).getTime())).toBe(180_000);
    expect(resumeRun(state, at(400_000))).toBe(state);
  });
  test('what a run becomes: the time spent, never more than planned, and nothing under a second', () => {
    const run = runOf(startRun({now: T0, minutes: 5, moodBefore: 3}));
    expect(endedSession(run, at(90_400).getTime())).toEqual({startedAt: T0.toISOString(), seconds: 90, kind: 'timer', moodBefore: 3});
    expect(endedSession(run, at(3_600_000).getTime())!.seconds).toBe(300);
    expect(endedSession(run, at(400).getTime())).toBeNull();
    const session = sessionFrom(endedSession(run, at(300_000).getTime())!, {id: 'health_med-test-0001', timeZone: 'Europe/Brussels', moodAfter: 4, note: '  calm  ', now: at(310_000)});
    expect(session).toMatchObject({seconds: 300, kind: 'timer', source: 'timer', moodBefore: 3, moodAfter: 4, note: 'calm', timeZone: 'Europe/Brussels'});
  });
  test('the bells still to come: every few minutes (never at the start or on the end), then the end bell', () => {
    const run = runOf(startRun({now: T0, minutes: 10}));
    expect(bellTimes(run, 0, 5)).toEqual({interval: [300_000], end: 600_000});
    expect(bellTimes(run, 0, undefined)).toEqual({interval: [], end: 600_000});
    expect(bellTimes(run, 0, 2)).toEqual({interval: [120_000, 240_000, 360_000, 480_000], end: 600_000});
    // Resumed after the first interval bell: only the rest.
    expect(bellTimes(run, 130_000, 2)).toEqual({interval: [240_000, 360_000, 480_000], end: 600_000});
    expect(bellTimes(run, 600_000, 2)).toEqual({interval: [], end: null});
  });
  test('the clock text', () => {
    expect(clockText(0)).toBe('00:00');
    expect(clockText(59_001)).toBe('01:00');
    expect(clockText(3_725_000)).toBe('1:02:05');
  });
});

describe('breathing patterns', () => {
  test('box: four phases of four seconds, counting down, then the next cycle', () => {
    expect(cycleSeconds('box')).toBe(16);
    expect(phaseAt('box', 0)).toMatchObject({kind: 'in', words: 'Breathe in', index: 0, cycle: 0, secondsLeft: 4});
    expect(phaseAt('box', 3_900)).toMatchObject({kind: 'in', secondsLeft: 1});
    expect(phaseAt('box', 4_000)).toMatchObject({kind: 'hold', words: 'Hold', secondsLeft: 4});
    expect(phaseAt('box', 8_500)).toMatchObject({kind: 'out', secondsLeft: 4});
    expect(phaseAt('box', 15_999)).toMatchObject({kind: 'rest', words: 'Hold, empty', secondsLeft: 1});
    expect(phaseAt('box', 16_000)).toMatchObject({kind: 'in', cycle: 1, secondsLeft: 4});
  });
  test('4-7-8, slow and even, and the double inhale', () => {
    expect(cycleSeconds('478')).toBe(19);
    expect(phaseAt('478', 10_999)).toMatchObject({kind: 'hold', secondsLeft: 1});
    expect(phaseAt('478', 11_000)).toMatchObject({kind: 'out', secondsLeft: 8});
    expect(phaseAt('coherent', 5_000)).toMatchObject({kind: 'out', secondsLeft: 5});
    expect(phaseAt('sigh', 2_000)).toMatchObject({kind: 'top-up', words: 'A little more in', secondsLeft: 1});
    expect(phaseAt('sigh', 3_000)).toMatchObject({kind: 'out', secondsLeft: 6});
  });
  test('the circle grows breathing in, holds, shrinks breathing out, and stays within its sizes', () => {
    const sizes = Array.from({length: 161}, (_, i) => phaseAt('box', i * 100).scale);
    for (const s of sizes) { expect(s).toBeGreaterThanOrEqual(0.55); expect(s).toBeLessThanOrEqual(1); }
    expect(phaseAt('box', 0).scale).toBeCloseTo(0.55, 5);
    expect(phaseAt('box', 4_000).scale).toBeCloseTo(1, 5);
    expect(phaseAt('box', 6_000).scale).toBeCloseTo(1, 5);
    expect(phaseAt('box', 12_000).scale).toBeCloseTo(0.55, 5);
  });
  test('each phase is announced once, in words', () => {
    expect(phaseAnnouncement('478', 1)).toBe('Hold, 7 seconds');
    expect(phaseAnnouncement('sigh', 1)).toBe('A little more in, 1 second');
  });
});

describe('the bells, made on the device', () => {
  afterEach(() => { resetAudioForTests(); delete (globalThis as {AudioContext?: unknown}).AudioContext; });
  function mockContext() {
    const calls: string[] = [], oscillators: {freq: number; started: number; stopped: number[]}[] = [];
    const param = (name: string) => ({setValueAtTime: (v: number, t: number) => calls.push(`${name} set ${v.toFixed(4)} @${t}`), linearRampToValueAtTime: (v: number, t: number) => calls.push(`${name} ramp ${v.toFixed(4)} @${t.toFixed(3)}`), exponentialRampToValueAtTime: (v: number, t: number) => calls.push(`${name} exp ${v} @${t.toFixed(3)}`)});
    const ctx: AudioLike = {
      currentTime: 10, destination: {},
      createOscillator: () => { const o = {freq: 0, started: -1, stopped: [] as number[]}; oscillators.push(o); return {type: '', frequency: {...param('freq'), setValueAtTime: (v: number) => { o.freq = v; }}, connect: () => undefined, start: (t: number) => { o.started = t; }, stop: (t: number) => { o.stopped.push(t); }}; },
      createGain: () => ({gain: param('gain'), connect: () => undefined}),
    };
    return {ctx, calls, oscillators};
  }
  test('a bowl is four uneven partials from 196 Hz, at the chosen volume, fading out over seconds', () => {
    const {ctx, calls, oscillators} = mockContext();
    const struck = strike(ctx, 'bowl', 100, 12)!;
    expect(oscillators.map(o => Math.round(o.freq))).toEqual(BELLS.bowl.partials.map(([ratio]) => Math.round(196 * ratio)));
    expect(oscillators.every(o => o.started === 12)).toBe(true);
    expect(struck.end).toBeCloseTo(12 + 0.02 + 7, 5);
    // The loudest partial peaks at its share of the volume's gain.
    expect(calls).toContain(`gain ramp ${(peakGain(100) * 1 / 1.87).toFixed(4)} @12.020`);
    struck.stop();
    expect(oscillators.every(o => o.stopped.includes(0))).toBe(true);
  });
  test('silence and volume 0 make no sound; volume follows a curve', () => {
    const {ctx, oscillators} = mockContext();
    expect(strike(ctx, 'silent', 80)).toBeNull();
    expect(strike(ctx, 'chime', 0)).toBeNull();
    expect(oscillators).toEqual([]);
    expect(peakGain(50)).toBeCloseTo(peakGain(100) / 4, 10);
    expect(peakGain(140)).toBe(peakGain(100));
  });
  test('without Web Audio a bell is quietly skipped', async () => {
    expect(await ring('bowl', 60)).toBe(false);
  });
  test('a quiet start (a breathing guide) wakes the sound on the tap without striking', async () => {
    expect(await wakeAudio()).toBe(false);
    resetAudioForTests();
    const {ctx, oscillators} = mockContext();
    (globalThis as {AudioContext?: unknown}).AudioContext = function () { return Object.assign(ctx, {state: 'suspended', resume: async () => { (ctx as {state?: string}).state = 'running'; }}); };
    expect(audioReady()).toBe(false);
    expect(await wakeAudio()).toBe(true);
    expect(audioReady()).toBe(true);
    expect(oscillators).toEqual([]);
  });
  test('with Web Audio the first ring wakes a suspended context', async () => {
    const {ctx, oscillators} = mockContext();
    let resumed = 0;
    (globalThis as {AudioContext?: unknown}).AudioContext = function () { return Object.assign(ctx, {state: 'suspended', resume: async () => { resumed++; (ctx as {state?: string}).state = 'running'; }}); };
    expect(await ring('soft', 60)).toBe(true);
    expect(resumed).toBe(1);
    expect(oscillators).toHaveLength(1);
  });
});

describe('your practice in figures', () => {
  const session = (id: string, startedAt: string, seconds: number, timeZone = 'UTC') => ({id, startedAt, seconds, kind: 'timer' as const, timeZone, source: 'timer' as const, createdAt: startedAt, updatedAt: startedAt});
  const m = (sessions: ReturnType<typeof session>[]): Meditation => meditationSchema.parse({...emptyMeditation(), sessions});
  test('a session belongs to the day it started where it was lived', () => {
    expect(sessionDay(session('health_med-a-00000001', '2026-10-20T23:30:00.000Z', 600, 'Asia/Tokyo'))).toBe('2026-10-21');
    expect(sessionDay(session('health_med-a-00000002', '2026-10-20T23:30:00.000Z', 600, 'UTC'))).toBe('2026-10-20');
  });
  test('minutes on a day add up the seconds, rounded once; an unlogged day is null', () => {
    const log = m([session('health_med-b-00000001', '2026-10-21T07:00:00.000Z', 290), session('health_med-b-00000002', '2026-10-21T19:00:00.000Z', 320)]);
    expect(minutesOn(log, '2026-10-21')).toBe(10);
    expect(minutesOn(log, '2026-10-22')).toBeNull();
  });
  test('weeks run Monday to Sunday; days in a row count back from today, or from yesterday while today has none', () => {
    expect(weekStart('2026-10-21')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    const log = m(['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'].map((d, i) => session(`health_med-c-0000000${i}`, `${d}T07:00:00.000Z`, 600)));
    expect(daysInARow(log, '2026-10-20')).toBe(4);
    expect(daysInARow(log, '2026-10-21')).toBe(4);
    expect(daysInARow(log, '2026-10-22')).toBe(0);
    const bars = weeklyBars(log, '2026-10-21', 2);
    expect(bars).toEqual([{weekStart: '2026-10-12', minutes: 20, sessions: 2}, {weekStart: '2026-10-19', minutes: 20, sessions: 2}]);
    expect(meditationSummary(setMeditationGoal(log, 60, T0), '2026-10-21')).toEqual({sessions: 4, totalMinutes: 40, longestMinutes: 10, thisWeek: 20, goal: 60, daysInARow: 4, last: '2026-10-20'});
    expect(minutesText(65)).toBe('1 h 05 min');
  });
});

describe('edits', () => {
  test('mindful minutes: logged, corrected (the note can be cleared), deleted; nothing ends in the future', () => {
    let log = saveManual(emptyMeditation(), {date: '2026-10-21', time: '07:00', minutes: 12, note: ' after the run ', timeZone: 'Europe/Brussels'}, new Date('2026-10-21T08:00:00Z'));
    const [first] = log.sessions;
    expect(first).toMatchObject({kind: 'manual', source: 'manual', seconds: 720, startedAt: '2026-10-21T05:00:00.000Z', note: 'after the run'});
    log = saveManual(log, {id: first!.id, date: '2026-10-21', time: '07:10', minutes: 15, note: '', timeZone: 'Europe/Brussels'}, new Date('2026-10-21T08:00:00Z'));
    expect(log.sessions).toHaveLength(1);
    expect(log.sessions[0]).toMatchObject({id: first!.id, seconds: 900, startedAt: '2026-10-21T05:10:00.000Z', createdAt: first!.createdAt});
    expect(log.sessions[0]!.note).toBeUndefined();
    expect(() => saveManual(log, {date: '2026-10-21', time: '07:55', minutes: 30, timeZone: 'Europe/Brussels'}, new Date('2026-10-21T06:00:00Z'))).toThrow('A session cannot end in the future.');
    expect(() => saveManual(log, {date: '2026-10-21', time: '07:00', minutes: 0, timeZone: 'UTC'}, T0)).toThrow('Enter whole minutes from 1 to 1440.');
    expect(deleteSession(log, first!.id).sessions).toEqual([]);
    expect(() => deleteSession(log, 'health_med-gone-00000001')).toThrow('This session is no longer here.');
  });
  test('the same session added twice is kept once (two taps, two tabs)', () => {
    const run = runOf(startRun({now: T0, minutes: 5}));
    const s = sessionFrom(endedSession(run, at(300_000).getTime())!, {id: 'health_med-twice-0001', timeZone: 'UTC', now: at(300_000)});
    expect(addSession(addSession(emptyMeditation(), s), s).sessions).toHaveLength(1);
  });
  test('your goal and your bell, stamped', () => {
    const goal = setMeditationGoal(emptyMeditation(), 90, T0);
    expect(goal.goal).toEqual({minutesPerWeek: 90, updatedAt: T0.toISOString()});
    expect(setMeditationGoal(goal, null, T0).goal).toBeUndefined();
    expect(setBells(goal, {sound: 'chime', volume: 40, intervalMin: 5}, T0).bells).toEqual({sound: 'chime', volume: 40, intervalMin: 5, updatedAt: T0.toISOString()});
    expect(() => setBells(goal, {sound: 'chime', volume: 140}, T0)).toThrow();
  });
});

describe('the meditation reminder (this device)', () => {
  const local = (clock: string, day = 21) => { const [h, m] = clock.split(':').map(Number); return new Date(2026, 9, day, h, m); };
  test('due after its time until a session is logged that day, one runs, or "Not today"', () => {
    const w = setMeditationTime(emptyWReminders(), '07:30');
    expect(meditationDue({w, doneToday: false, running: false, now: local('07:29')})).toBeNull();
    expect(meditationDue({w, doneToday: false, running: false, now: local('07:30')})).toEqual({id: MEDITATION_TIME, kind: 'meditation-time', title: 'Time to meditate', time: '07:30', day: '2026-10-21', href: '/app/health?view=meditation'});
    expect(meditationDue({w, doneToday: true, running: false, now: local('09:00')})).toBeNull();
    expect(meditationDue({w, doneToday: false, running: true, now: local('09:00')})).toBeNull();
    const dismissed = dismissMeditationTime(w, '2026-10-21');
    expect(meditationDue({w: dismissed, doneToday: false, running: false, now: local('20:00')})).toBeNull();
    expect(meditationDue({w: dismissed, doneToday: false, running: false, now: local('08:00', 22)})?.day).toBe('2026-10-22');
    expect(setMeditationTime(w, null)).toEqual(emptyWReminders());
  });
});

describe('Showcase meditation', () => {
  test('fictional, valid, deterministic: rest days, some breathing, the marked note, a goal and a bell', () => {
    const day = '2026-10-05', s = showcaseMeditation(day);
    expect(meditationSchema.parse(s)).toEqual(s);
    expect(showcaseMeditation(day)).toEqual(s);
    const days = new Set(s.sessions.map(sessionDay));
    expect(days.size).toBeLessThan(30);
    expect(days.has(day)).toBe(true);
    expect(s.sessions.some(x => x.kind === 'breathing' && x.pattern)).toBe(true);
    expect(s.sessions.filter(x => x.note).map(x => x.note)).toEqual(['SHOWCASE DATA · fictional session']);
    expect(s.goal?.minutesPerWeek).toBe(60);
    expect(s.bells).toMatchObject({sound: 'bowl', volume: 60});
  });
});
