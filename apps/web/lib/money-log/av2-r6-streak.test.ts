import {describe, expect, test} from 'vitest';
import {lookedDays, moneyStreak, sayLooked, setStreakOn, streakWords} from './money-streak';
import {emptyMoneyMore} from '../money-more/schema';
import type {MoneyEntry} from './schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar's streaks, LEDGER #427): the money streak — off by default, a day off
 * allowed (the habits' two-day rule), today still open, never a money figure and never a warning.
 */
const TODAY = '2026-11-20', AT = '2026-11-20T10:00:00.000Z';
let n = 0;
const e = (extra: Partial<MoneyEntry> = {}): MoneyEntry => ({id: `s${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-10', createdAt: AT, ...extra});

describe('the money streak (#427)', () => {
  const day = (iso: string) => iso.slice(0, 10);
  test('days with an entry logged or a look said; one day off is fine, two end the run; today stays open', () => {
    const days = lookedDays([e({createdAt: '2026-11-20T08:00:00.000Z'}), e({createdAt: '2026-11-19T08:00:00.000Z'}), e({createdAt: '2026-11-17T08:00:00.000Z'})], ['2026-11-16'], day);
    expect(moneyStreak(days, TODAY)).toEqual({days: 4, today: true, dayOff: false});
    expect(moneyStreak(days, '2026-11-21')).toEqual({days: 4, today: false, dayOff: false}); // today still open
    expect(moneyStreak(days, '2026-11-22')).toEqual({days: 4, today: false, dayOff: true}); // one day off, today keeps it going
    expect(moneyStreak(days, '2026-11-23').days).toBe(0); // two days off in a row before today
    expect(moneyStreak(new Set(['2026-11-13']), TODAY).days).toBe(0);
  });
  test('the words never name an amount and never warn', () => {
    expect(streakWords({days: 4, today: true, dayOff: false})).toBe('Days in a row you looked at your money: 4, today too.');
    expect(streakWords({days: 4, today: false, dayOff: true})).toBe('Days in a row you looked at your money: 4. A day off is fine.');
    expect(streakWords({days: 1, today: true, dayOff: false}, 'nl')).toBe('1 dag op rij naar je geld gekeken, vandaag ook.');
    expect(streakWords({days: 0, today: false, dayOff: false})).not.toMatch(/lost|broke|miss|€/i);
  });
  test('off by default; on and off keep the said days; a day said once', () => {
    expect(emptyMoneyMore().streak).toBeUndefined();
    const on = sayLooked(sayLooked(setStreakOn(emptyMoneyMore(), true), TODAY), TODAY);
    expect(on.streak).toEqual({on: true, looked: [TODAY]});
    expect(setStreakOn(on, false).streak).toEqual({looked: [TODAY]});
  });
});

