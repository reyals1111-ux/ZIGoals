import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, type HabitInput} from '../habits';
import {pauseHabitTimer, startHabitTimer} from '../habit-timer-actions';
import {POMODORO_DEFAULTS, endRun, startRun} from '../focus-sessions/pomodoro';
import {startRun as startMeditation, pauseRun} from '../meditation/timer';
import type {FastingSession} from '../fasting/schema';
import type {SleepNight} from '../sleep/schema';
import {LiveChipList} from '../../components/nova/live/live-chips';
import {MAX_HABIT_TIMERS, MAX_LIVE, liveActivities, liveName, spanWords, ticksBySecond} from './live-activity';

/** Session AK lane P1 (M3): NOVA's "Running now" chips — what runs, its time in words, its page; never a zero for an unknown. */
const T0 = Date.parse('2026-09-20T08:00:00.000Z');
const input: HabitInput = {title: 'Fictional reading', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'duration', unit: 'minutes'}, target: 30};
const HABIT = '59a35604-3696-4a78-b455-4015acb66885', TIMER = 'ff829326-f352-4a26-80d0-eb8c31cde62e';
const habitWithTimer = (start = T0) => startHabitTimer(createHabit(emptyHabitData(), input, new Date(T0 - 3_600_000), HABIT), HABIT, TIMER, new Date(start), 'UTC');
const fast = (more: Partial<FastingSession> = {}): FastingSession => ({id: 'fast_1', startedAt: new Date(T0).toISOString(), endedAt: null, targetHours: 16, timeZone: 'UTC', ...more} as FastingSession);
const night = (more: Partial<SleepNight> = {}): SleepNight => ({id: 'health_sleep-1', kind: 'night', start: new Date(T0).toISOString(), end: null, timeZone: 'UTC', ...more} as SleepNight);

describe('liveActivities', () => {
  it('a fresh start: nothing runs, nothing shows', () => {
    expect(liveActivities({now: T0})).toEqual([]);
    expect(liveActivities({now: T0, pomodoro: null, meditation: null, habits: [], fast: null, night: null})).toEqual([]);
  });
  it('a Pomodoro: its phase and the time left, linked to Focus Sessions; a finished run is not running', () => {
    const run = startRun(POMODORO_DEFAULTS, T0, {id: 'run_1'});
    const [chip] = liveActivities({now: T0 + 6 * 60_000 + 18_000, pomodoro: run});
    expect(chip).toMatchObject({kind: 'pomodoro', label: 'Focus', value: '18:42 left', href: '/app/journey?focus=pomodoro#focus', paused: false});
    expect(liveName(chip!)).toBe('Focus: 18:42 left. Open Focus Sessions');
    expect(liveActivities({now: T0, pomodoro: endRun(run, T0 + 1000, {day: () => '2026-09-20', newId: () => 'focus_x'}).run})).toEqual([]);
  });
  it('meditation and breathing: time left, paused says so, and a session whose time is up is not shown', () => {
    const run = startMeditation({now: new Date(T0), minutes: 10}).run!;
    expect(liveActivities({now: T0 + 60_000, meditation: run})[0]).toMatchObject({label: 'Meditation', value: '9:00 left', href: '/app/health?view=meditation'});
    const paused = pauseRun({version: 1, run}, new Date(T0 + 120_000)).run!;
    expect(liveActivities({now: T0 + 600_000, meditation: paused})[0]).toMatchObject({value: 'paused, 8:00 left', paused: true});
    expect(liveActivities({now: T0 + 11 * 60_000, meditation: run})).toEqual([]);
    const breathing = startMeditation({now: new Date(T0), minutes: 3, kind: 'breathing', pattern: 'box'} as Parameters<typeof startMeditation>[0]).run!;
    expect(liveActivities({now: T0, meditation: breathing})[0]!.label).toBe('Breathing');
  });
  it('a habit timer: running or paused, named by the habit, linked to that habit; a clock that moved back is to review, not zero', () => {
    const data = habitWithTimer();
    expect(liveActivities({now: T0 + 12 * 60_000 + 30_000, habits: data.habits})[0]).toMatchObject({kind: 'habit', label: 'Fictional reading', value: '12 min', href: `/app/habits#habit-${HABIT}`, paused: false});
    const paused = pauseHabitTimer(data, HABIT, TIMER, new Date(T0 + 5 * 60_000));
    expect(liveActivities({now: T0 + 50 * 60_000, habits: paused.habits})[0]).toMatchObject({value: 'paused at 5 min', paused: true});
    expect(liveActivities({now: T0 - 60_000, habits: data.habits})[0]!.value).toBe('time to review');
    expect(liveActivities({now: T0, habits: createHabit(emptyHabitData(), input, new Date(T0), HABIT).habits})).toEqual([]);
  });
  it('a fast: done so far of its target; an ended fast is not shown; a clock that moved back is to review', () => {
    expect(liveActivities({now: T0 + (14 * 60 + 5) * 60_000, fast: fast()})[0]).toMatchObject({label: 'Fast', value: '14 h 05 min of 16 h', href: '/app/health#fasting'});
    expect(liveActivities({now: T0 + 3_600_000, fast: fast({endedAt: new Date(T0 + 1000).toISOString()})})).toEqual([]);
    expect(liveActivities({now: T0 - 60_000, fast: fast()})[0]!.value).toBe('time to review');
  });
  it('a night in bed: how long so far, linked to Sleep; a night that ended is not shown', () => {
    expect(liveActivities({now: T0 + 72 * 60_000, night: night()})[0]).toMatchObject({label: 'Sleep', value: 'in bed 1 h 12 min', href: '/app/health?view=sleep'});
    expect(liveActivities({now: T0, night: night({end: new Date(T0 + 1).toISOString()})})).toEqual([]);
    expect(liveActivities({now: T0 - 1, night: night()})[0]!.value).toBe('time to review');
  });
  it('in a fixed order, at most three habit timers and six chips in all', () => {
    const many = Array.from({length: 5}, (_, i) => ({...habitWithTimer().habits[0]!, id: `${HABIT.slice(0, -1)}${i}`}));
    const out = liveActivities({now: T0 + 60_000, pomodoro: startRun(POMODORO_DEFAULTS, T0, {id: 'r'}), meditation: startMeditation({now: new Date(T0), minutes: 10}).run, habits: many, fast: fast(), night: night()});
    expect(out.filter(i => i.kind === 'habit')).toHaveLength(MAX_HABIT_TIMERS);
    expect(out).toHaveLength(MAX_LIVE);
    expect(out.map(i => i.kind)).toEqual(['pomodoro', 'meditation', 'habit', 'habit', 'habit', 'fast']);
  });
  it('ticks by the second only while a clock with seconds runs', () => {
    expect(ticksBySecond(liveActivities({now: T0, fast: fast()}))).toBe(false);
    expect(ticksBySecond(liveActivities({now: T0, pomodoro: startRun(POMODORO_DEFAULTS, T0, {id: 'r'})}))).toBe(true);
  });
  it('spanWords', () => {
    expect(spanWords(0)).toBe('under a minute');
    expect(spanWords(59_999)).toBe('under a minute');
    expect(spanWords(65 * 60_000)).toBe('1 h 05 min');
    expect(spanWords(-1)).toBeNull();
    expect(spanWords(Number.NaN)).toBeNull();
  });
});

describe('the chips', () => {
  it('render nothing when nothing runs, and one named link per activity when something does', () => {
    expect(renderToStaticMarkup(createElement(LiveChipList, {items: []}))).toBe('');
    const html = renderToStaticMarkup(createElement(LiveChipList, {items: liveActivities({now: T0 + 72 * 60_000, fast: fast(), night: night()})}));
    expect(html).toContain('aria-label="Running now"');
    expect(html).toContain('href="/app/health#fasting"');
    expect(html).toContain('aria-label="Fast: 1 h 12 min of 16 h. Open Health"');
    expect(html).toContain('aria-label="Sleep: in bed 1 h 12 min. Open Sleep"');
    expect(html).not.toContain('aria-live');
  });
});
