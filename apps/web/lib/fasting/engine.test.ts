import {afterEach, describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, type HabitInput} from '../habits';
import {applyAutoStop, autoStopDue, elapsedMs, fastingHistory, formatFast, habitLogValue, logFastToHabit, removeFast, runningSession, startFast, stopFast} from './engine';
import {FASTING_KEY, MAX_FASTING_SESSIONS, emptyFasting, fastingSchema, type Fasting} from './schema';
import {readFasting, startOverFasting, updateFasting} from './store';

// HE6 (docs/product/features/HE6-fasting.md, "Tests"): a clock, nothing more.
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const START = new Date('2026-10-01T20:00:00Z'), plus = (hours: number, minutes = 0) => new Date(START.getTime() + hours * 3_600_000 + minutes * 60_000);
const started = (patch: Partial<Parameters<typeof startFast>[1]> = {}): Fasting => startFast(emptyFasting(), {id: 'fast_1', now: START, targetHours: 16, timeZone: 'Europe/Brussels', ...patch});
const HABIT = '92000000-0000-4000-8000-000000000201';
const INPUT: HabitInput = {title: 'Fast', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 16, measurement: {kind: 'duration', unit: 'hours'}};
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }

describe('starting, elapsed and stopping', () => {
  test('one fast at a time, a target of 1-18 hours', () => {
    const data = started();
    expect(runningSession(data)).toEqual({id: 'fast_1', startedAt: START.toISOString(), endedAt: null, targetHours: 16, timeZone: 'Europe/Brussels'});
    expect(() => startFast(data, {id: 'fast_2', now: plus(1), targetHours: 12, timeZone: 'UTC'})).toThrow('A fast is already running.');
    expect(startFast(emptyFasting(), {id: 'fast_3', now: START, targetHours: 18, timeZone: 'UTC'}).sessions[0]!.targetHours).toBe(18);
    for (const hours of [19, 0, 24, 1.5]) expect(() => startFast(emptyFasting(), {id: 'x', now: START, targetHours: hours, timeZone: 'UTC'})).toThrow('Choose a target up to 18 hours.');
    const full: Fasting = {version: 1, sessions: Array.from({length: MAX_FASTING_SESSIONS}, (_, i) => ({id: `fast_${i}`, startedAt: START.toISOString(), endedAt: START.toISOString(), targetHours: 16, timeZone: 'UTC'}))};
    expect(() => startFast(full, {id: 'x', now: START, targetHours: 16, timeZone: 'UTC'})).toThrow('Your fasting history is full. Remove old sessions to continue.');
  });
  test('elapsed is capped at 24 hours and never negative', () => {
    const session = started().sessions[0]!;
    expect(elapsedMs(session, plus(3, 20))).toEqual({ms: 12_000_000, clockMovedBack: false});
    expect(elapsedMs(session, plus(25))).toEqual({ms: 86_400_000, clockMovedBack: false});
    expect(elapsedMs(session, plus(-1))).toEqual({ms: 0, clockMovedBack: true});
    expect(formatFast(12_000_000)).toBe('3 h 20 min'); expect(formatFast(0)).toBe('0 h 00 min');
  });
  test('the automatic stop at 24 hours', () => {
    const data = started(), session = data.sessions[0]!;
    expect(autoStopDue(session, plus(23, 59))).toBe(false); expect(autoStopDue(session, plus(24))).toBe(true);
    expect(applyAutoStop(data, plus(23, 59))).toBe(data);
    const stopped = applyAutoStop(data, plus(30));
    expect(stopped.sessions[0]).toMatchObject({endedAt: plus(24).toISOString(), stoppedBy: 'limit'});
    expect(applyAutoStop(stopped, plus(31))).toBe(stopped);
  });
  test('stopping by the person', () => {
    const data = started();
    expect(stopFast(data, 'fast_1', plus(15, 42)).sessions[0]).toMatchObject({endedAt: plus(15, 42).toISOString(), stoppedBy: 'person'});
    expect(stopFast(data, 'fast_1', plus(30)).sessions[0]!.endedAt).toBe(plus(24).toISOString());
    expect(stopFast(data, 'fast_1', plus(-2)).sessions[0]!.endedAt).toBe(START.toISOString());
    expect(() => stopFast(stopFast(data, 'fast_1', plus(1)), 'fast_1', plus(2))).toThrow('This fast is not running.');
    expect(removeFast(data, 'fast_1').sessions).toEqual([]);
  });
});

describe('history', () => {
  test('newest first, at most 20, hours to one decimal, the start day in the session zone', () => {
    let data = emptyFasting();
    for (let i = 0; i < 25; i++) { const start = new Date(START.getTime() - i * 86_400_000); data = stopFast(startFast(data, {id: `fast_${i}`, now: start, targetHours: 16, timeZone: 'UTC'}), `fast_${i}`, new Date(start.getTime() + 15 * 3_600_000 + 42 * 60_000)); }
    const rows = fastingHistory(data);
    expect(rows).toHaveLength(20); expect(rows[0]!.session.id).toBe('fast_0'); expect(rows[0]!.hours).toBe(15.7); expect(rows[0]!.day).toBe('2026-10-01');
    expect(fastingHistory(data, 5)).toHaveLength(5);
  });
  test.each(['UTC', 'Europe/Brussels', 'America/New_York', 'Pacific/Kiritimati', 'Etc/GMT+12', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide', 'Pacific/Chatham', 'Australia/Lord_Howe', 'America/Santiago'])('the day follows the session zone, not the host (%s)', host => {
    process.env.TZ = host;
    const late = new Date('2026-10-01T23:30:00Z');
    const kiritimati = stopFast(startFast(emptyFasting(), {id: 'k', now: late, targetHours: 12, timeZone: 'Pacific/Kiritimati'}), 'k', new Date(late.getTime() + 3_600_000));
    const anadyr = stopFast(startFast(emptyFasting(), {id: 'g', now: late, targetHours: 12, timeZone: 'Etc/GMT+12'}), 'g', new Date(late.getTime() + 3_600_000));
    expect(fastingHistory(kiritimati)[0]!.day).toBe('2026-10-02'); expect(fastingHistory(anadyr)[0]!.day).toBe('2026-10-01');
  });
  test('DST during a fast changes nothing: instants, not clocks', () => {
    const data = stopFast(startFast(emptyFasting(), {id: 'd', now: new Date('2026-10-25T00:30:00+02:00'), targetHours: 16, timeZone: 'Europe/Brussels'}), 'd', new Date('2026-10-25T08:30:00+01:00'));
    expect(fastingHistory(data)[0]!.hours).toBe(9);
  });
});

describe('the linked duration habit', () => {
  const habits = (unit: 'hours' | 'minutes') => habitDataSchema.parse(createHabit(emptyHabitData(), {...INPUT, measurement: {kind: 'duration', unit}}, new Date('2026-09-20T12:00:00Z'), HABIT));
  test('hours to two decimals, minutes whole, added to the day of the stop; a second fast adds', () => {
    process.env.TZ = 'UTC';
    const session = stopFast(started({habitId: HABIT}), 'fast_1', plus(15, 42)).sessions[0]!;
    const hours = logFastToHabit(habits('hours'), session, plus(15, 42));
    expect(hours.logged).toBe(15.7); expect(hours.data.habits[0]!.entries).toEqual([expect.objectContaining({date: '2026-10-02', count: 15.7, disposition: 'logged'})]);
    expect(logFastToHabit(hours.data, {...session, id: 'fast_2'}, plus(15, 42)).data.habits[0]!.entries[0]!.count).toBe(31.4);
    expect(logFastToHabit(habits('minutes'), session, plus(15, 42)).logged).toBe(942);
    const rule = habits('hours').habits[0]!.rules[0]!;
    expect(habitLogValue({...session, endedAt: session.startedAt}, rule)).toBe(0);
    expect(logFastToHabit(habits('hours'), {...session, endedAt: session.startedAt}, plus(1)).logged).toBeNull();
  });
  test('a day the habit is not scheduled logs nothing and says so', () => {
    process.env.TZ = 'UTC';
    const weekdays = habitDataSchema.parse(createHabit(emptyHabitData(), {...INPUT, schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}}, new Date('2026-09-20T12:00:00Z'), HABIT));
    const session = stopFast(started({habitId: HABIT, now: new Date('2026-10-02T20:00:00Z')}), 'fast_1', new Date('2026-10-03T10:00:00Z')).sessions[0]!; // ends on a Saturday
    const result = logFastToHabit(weekdays, session, new Date('2026-10-03T10:00:00Z'));
    expect(result).toMatchObject({logged: null, reason: "Fast isn't scheduled today."}); expect(result.data).toBe(weekdays);
  });
});

describe('schema and store', () => {
  test('limits and invariants', () => {
    const base = started().sessions[0]!;
    expect(fastingSchema.safeParse({version: 1, sessions: [{...base, endedAt: '2026-10-01T19:00:00.000Z'}]}).success).toBe(false);
    expect(fastingSchema.safeParse({version: 1, sessions: [base, {...base, id: 'fast_2'}]}).success).toBe(false);
    expect(fastingSchema.safeParse({version: 1, sessions: [base, base]}).success).toBe(false);
    expect(fastingSchema.safeParse({version: 2, sessions: []}).success).toBe(false);
    expect(fastingSchema.safeParse({version: 1, sessions: [{...base, calories: 0}]}).success).toBe(false);
    expect(fastingSchema.safeParse({version: 1, sessions: Array.from({length: MAX_FASTING_SESSIONS + 1}, (_, i) => ({...base, id: `f${i}`, endedAt: base.startedAt}))}).success).toBe(false);
  });
  test('unreadable bytes are read as empty, said so, never touched; Start over keeps a recovery copy', () => {
    const storage = memoryStorage();
    storage.setItem(FASTING_KEY, '{"version":1,"sessions":[{}]}');
    expect(readFasting(storage)).toEqual({data: emptyFasting(), unreadable: true});
    expect(() => updateFasting(storage, current => current)).toThrow('could not be read');
    expect(storage.getItem(FASTING_KEY)).toBe('{"version":1,"sessions":[{}]}');
    startOverFasting(storage);
    expect(readFasting(storage)).toEqual({data: emptyFasting(), unreadable: false});
    expect(Array.from({length: storage.length}, (_, i) => storage.key(i)!).some(k => k.startsWith(`${FASTING_KEY}:recovery:`))).toBe(true);
    const written = updateFasting(storage, current => startFast(current, {id: 'fast_9', now: START, targetHours: 12, timeZone: 'UTC'}));
    expect(JSON.parse(storage.getItem(FASTING_KEY)!)).toEqual(written);
  });
});
