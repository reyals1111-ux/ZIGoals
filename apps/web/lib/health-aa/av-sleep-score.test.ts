import {describe, expect, it} from 'vitest';
import {sleepScore, weeksBefore} from './sleep-score';
import type {Sleep} from '../sleep/schema';

/** Session AV (owner follow-up 1, F-SLEEP-SCORE): regularity from bedtime and wake time; the nights' quality ratings count. */
const AT = '2026-11-20T10:00:00.000Z';
const night = (day: string, bed: string, wake: string, quality?: number) => {
  const prev = new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return {id: `sleep_${day}`, kind: 'night' as const, start: `${prev}T${bed}:00.000Z`, end: `${day}T${wake}:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, ...(quality ? {quality} : {})};
};
const DAYS = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'];
describe('Session AV (F-SLEEP-SCORE)', () => {
  it('eight hours at the same times, rated 5: 100; the same unrated scales the rest to 100', () => {
    const GOAL = {minutes: 480, updatedAt: AT};
    const rated: Sleep = {version: 1, nights: DAYS.map(d => night(d, '23:00', '07:00', 5)), goal: GOAL} as Sleep;
    expect(sleepScore(rated, '2026-11-23')).toMatchObject({score: 100, quality: {points: 15, average: 5, rated: 7}, scaled: false});
    const unrated: Sleep = {version: 1, nights: DAYS.map(d => night(d, '23:00', '07:00')), goal: GOAL} as Sleep;
    expect(sleepScore(unrated, '2026-11-23')).toMatchObject({score: 100, quality: {points: null, rated: 0}, scaled: true});
  });
  it('a poor rating lowers it; wake times that wander lower regularity', () => {
    const poor: Sleep = {version: 1, nights: DAYS.map(d => night(d, '23:00', '07:00', 1)), goal: {minutes: 480, updatedAt: AT}} as Sleep;
    expect(sleepScore(poor, '2026-11-23').score).toBe(85);
    const wander: Sleep = {version: 1, nights: DAYS.map((d, i) => night(d, '23:00', i % 2 ? '06:00' : '08:00', 5))} as Sleep;
    const w = sleepScore(wander, '2026-11-23');
    expect(w.consistency.bedSpread).toBe(0);
    expect(w.consistency.wakeSpread! > 50).toBe(true);
    expect(w.consistency.points < 30).toBe(true);
  });
  it('q3 #27: an unknown debt or regularity is left out and said, not a silent half score; the weeks before are kept', () => {
    // Three nights in a row: too few for the spreads and the debt, so both are unknown and left out.
    const few: Sleep = {version: 1, nights: DAYS.slice(-3).map(d => night(d, '23:00', '07:00', 5))} as Sleep;
    const f = sleepScore(few, '2026-11-23');
    expect(f.left).toEqual(['regularity', 'debt']);
    expect([f.consistency.points, f.debt.points, f.score]).toEqual([0, 0, 100]);
    // Seven hours, nothing else known: 35 of 40 is 88, not (35 + a silent 15 + 7.5) ÷ 85 = 68.
    const short: Sleep = {version: 1, nights: ['2026-11-17', '2026-11-20', '2026-11-23'].map(d => night(d, '23:00', '06:00'))} as Sleep;
    expect(sleepScore(short, '2026-11-23')).toMatchObject({score: 88, left: ['regularity', 'debt', 'quality'], scaled: true});
    const full: Sleep = {version: 1, nights: DAYS.map(d => night(d, '23:00', '07:00', 5)), goal: {minutes: 480, updatedAt: AT}} as Sleep;
    expect(sleepScore(full, '2026-11-23').left).toEqual([]);
    expect(weeksBefore(full, '2026-11-23').map(w => w.end)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(weeksBefore(full, '2026-11-23').map(w => w.score)).toEqual([null, null, null]); // no nights logged then
  });
});
