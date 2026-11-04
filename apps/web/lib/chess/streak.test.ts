import {expect, test} from 'vitest';
import {currentStreak, longestWinStreak, openingStats, streakText} from './streak';

// Session AL (Part 15, P-BN-84/P-BN-85): win/loss streak and opening stats on the Chess page.
const g = (day: number, result: 'win' | 'draw' | 'loss', opening?: string) => ({result, endedAt: `2026-11-${String(day).padStart(2, '0')}T19:00:00.000Z`, opening});
const games = [g(4, 'win', 'Italian Game'), g(3, 'win', 'Sicilian Defense'), g(2, 'win', 'Italian Game'), g(1, 'loss', 'Italian Game'), g(5, 'win')];
test('C-BN-19: the current run counts from the newest game, in any order given', () => {
  expect(currentStreak(games)).toEqual({result: 'win', count: 4});
  expect(streakText(currentStreak(games)!)).toBe('4 wins in a row');
  expect(streakText({result: 'loss', count: 1})).toBe('1 loss');
  expect(currentStreak([])).toBeNull();
  expect(longestWinStreak([g(1, 'win'), g(2, 'win'), g(3, 'loss'), g(4, 'win')])).toBe(2);
});
test('C-BN-20: openings by games played, each with its record; games without an opening left out', () => {
  expect(openingStats(games)).toEqual([{opening: 'Italian Game', games: 3, win: 2, draw: 0, loss: 1}, {opening: 'Sicilian Defense', games: 1, win: 1, draw: 0, loss: 0}]);
});
