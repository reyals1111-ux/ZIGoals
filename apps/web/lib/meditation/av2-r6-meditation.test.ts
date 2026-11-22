import {afterEach, describe, expect, test} from 'vitest';
import {daysInARow, minutesOn, sessionDay, sessionDayUnder, weeklyBars} from './stats';
import {consistency, consistencyLine} from './consistency';
import {MAX_RANGE_DAYS, rangeDays, removeSessions, saveManual, saveManualRange} from './engine';
import {emptyMeditation, type Meditation} from './schema';
import {emptyDayEnds, setCurrentDayEnds} from '../day-boundary-core';

/** Session AV lane 2, round 6 (r6-body; LEDGER #411, #413, #415): the meditation day, consistency and several days at once. */
const Z = 'Europe/Amsterdam', AT = new Date('2026-11-22T20:00:00.000Z');
const log = (m: Meditation, date: string, time = '07:00', minutes = 10) => saveManual(m, {date, time, minutes, timeZone: Z}, AT);
afterEach(() => setCurrentDayEnds(emptyDayEnds()));

describe('#411: a session counts on the day "My day ends at" gives', () => {
  const late = log(emptyMeditation(), '2026-11-21', '01:00', 20).sessions[0]!;
  test('midnight (the default): the calendar day, exactly as before', () => {
    expect(sessionDay(late)).toBe('2026-11-21');
    expect(sessionDayUnder(late, emptyDayEnds())).toBe('2026-11-21');
  });
  test('a day that ends at 03:00: a 01:00 session counts on the evening’s day, in the minutes, the bars and the days in a row', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(sessionDay(late)).toBe('2026-11-20');
    const m = log(log(emptyMeditation(), '2026-11-21', '01:00', 20), '2026-11-19', '21:00', 10);
    expect(minutesOn(m, '2026-11-20')).toBe(20);
    expect(minutesOn(m, '2026-11-21')).toBeNull();
    expect(daysInARow(m, '2026-11-20')).toBe(2);
    expect(weeklyBars(m, '2026-11-22', 1)[0]).toMatchObject({minutes: 30, sessions: 2});
  });
  test('owner rule 1: a session before the latest change keeps the end in force then', () => {
    const ends = {version: 1 as const, endsAt: 180, change: {at: '2026-11-21T12:00:00.000Z', from: 0}};
    expect(sessionDayUnder(late, ends)).toBe('2026-11-21');
    const after = log(emptyMeditation(), '2026-11-22', '01:30', 10).sessions[0]!;
    expect(sessionDayUnder(after, ends)).toBe('2026-11-21');
  });
});

describe('#413: your consistency', () => {
  test('the days with a session out of the days, up to yesterday while today has none', () => {
    let m = emptyMeditation();
    for (const d of ['2026-11-01', '2026-11-05', '2026-11-10', '2026-11-20']) m = log(m, d);
    const c = consistency(m, '2026-11-22', 30)!;
    expect(c).toMatchObject({from: '2026-11-01', to: '2026-11-21', days: 21, withSession: 4, goalWeeks: null});
    expect(consistencyLine(c)).toBe('4 of the 21 days since your first session had a session.');
    expect(consistencyLine(c, 'nl')).toBe('4 van de 21 dagen sinds je eerste sessie hadden een sessie.');
  });
  test('today without a session yet is not counted against you; a missed day only moves the window on by one', () => {
    let m = emptyMeditation();
    for (let i = 0; i < 40; i++) m = log(m, new Date(Date.UTC(2026, 9, 13 + i)).toISOString().slice(0, 10));
    const today = consistency(m, '2026-11-22', 30)!, tomorrow = consistency(m, '2026-11-23', 30)!;
    expect(today).toMatchObject({days: 30, withSession: 30});
    expect(consistency(m, '2026-11-22', 30)!.to).toBe('2026-11-21'); // today without a session yet: it runs to yesterday
    expect(tomorrow).toMatchObject({to: '2026-11-22', days: 30, withSession: 29});
    expect(consistencyLine(today)).toBe('30 of the last 30 days had a session.');
  });
  test('the weeks a weekly goal was met', () => {
    let m: Meditation = {...emptyMeditation(), goal: {minutesPerWeek: 20, updatedAt: AT.toISOString()}};
    for (const d of ['2026-11-02', '2026-11-03', '2026-11-10', '2026-11-16', '2026-11-17']) m = log(m, d);
    const c = consistency(m, '2026-11-22', 30)!;
    expect(c.goalWeeks).toBe(2);
    expect(c.weeks).toBe(3);
    expect(consistencyLine(c)).toContain('your weekly goal met in 2 of 3 weeks');
  });
  test('no session: nothing to count', () => { expect(consistency(emptyMeditation(), '2026-11-22')).toBeNull(); });
});

describe('#415: several past days at once', () => {
  test('one session a day at the time and length, a day with a session at that time skipped, one Undo', () => {
    const m = log(emptyMeditation(), '2026-11-18', '07:00');
    const r = saveManualRange(m, {from: '2026-11-16', to: '2026-11-20', time: '07:00', minutes: 15, timeZone: Z}, AT);
    expect(r.added).toHaveLength(4);
    expect(r.skipped).toEqual(['2026-11-18']);
    expect(r.meditation.sessions).toHaveLength(5);
    expect(r.meditation.sessions.every(s => s.kind === 'manual' && (s.seconds === 900 || s.seconds === 600))).toBe(true);
    expect(removeSessions(r.meditation, r.added)).toEqual(m);
  });
  test('a day whose session would end in the future is skipped; limits say a sentence', () => {
    const r = saveManualRange(emptyMeditation(), {from: '2026-11-22', to: '2026-11-22', time: '23:00', minutes: 10, timeZone: Z}, AT);
    expect(r.added).toEqual([]); expect(r.skipped).toEqual(['2026-11-22']);
    expect(() => saveManualRange(emptyMeditation(), {from: '2026-09-01', to: '2026-11-01', time: '07:00', minutes: 10, timeZone: Z}, AT)).toThrow(`Choose at most ${MAX_RANGE_DAYS} days.`);
    expect(() => saveManualRange(emptyMeditation(), {from: '2026-11-05', to: '2026-11-01', time: '07:00', minutes: 10, timeZone: Z}, AT)).toThrow('The last day comes on or after the first.');
    expect(rangeDays('2026-11-16', '2026-11-22')).toBe(7);
  });
});
