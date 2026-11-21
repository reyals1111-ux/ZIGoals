import {describe, expect, it} from 'vitest';
import {sleepScore} from './sleep-score';
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
});
