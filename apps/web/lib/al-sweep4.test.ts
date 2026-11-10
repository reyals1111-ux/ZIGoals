import {describe, expect, it} from 'vitest';
import {chessGoalLines} from './goals/chess-goals';
import {emptyChessCache, type ChessGoal, type ChessSettings} from './skills/chess/schema';
import {formatPercent} from './visual-format';

// Session AL sweep 4: Chess's rating goals on Goals (C-BN-23) and the Wealth purpose flow's percent (L8f note 2).
const AT = '2026-10-01T08:00:00.000Z';
const goal = (over: Partial<ChessGoal>): ChessGoal => ({id: '94000000-0000-4000-8000-000000000001', site: 'chesscom', control: 'rapid', target: 1600, status: 'active', createdAt: AT, updatedAt: AT, ...over});
const chess = (goals: ChessGoal[]): ChessSettings => ({version: 1, goals, applied: []});

describe('chess rating goals on Goals (C-BN-23)', () => {
  const cache = {...emptyChessCache(), snapshots: [{site: 'chesscom' as const, control: 'rapid' as const, rating: 1480, at: '2026-10-01T08:00:00.000Z'}, {site: 'chesscom' as const, control: 'rapid' as const, rating: 1523, at: '2026-10-04T08:00:00.000Z'}]};
  const goals = chess([
    goal({}),
    goal({id: '94000000-0000-4000-8000-000000000002', site: 'lichess', control: 'blitz', target: 1800, by: '2026-10-01'}),
    goal({id: '94000000-0000-4000-8000-000000000003', target: 1500, status: 'done'}),
  ]);
  it('lists each goal with its newest rating, how far to go and its date, filtered like the page', () => {
    expect(chessGoalLines(goals, cache, 'Active', '2026-10-05')).toEqual([
      {id: '94000000-0000-4000-8000-000000000001', title: 'chess.com Rapid: reach 1,600', detail: '1,523 now · 77 to go'},
      {id: '94000000-0000-4000-8000-000000000002', title: 'Lichess Blitz: reach 1,800', detail: 'No rating read yet on this site and time control · by Oct 1, 2026 (its date has passed)'},
    ]);
    expect(chessGoalLines(goals, cache, 'Completed', '2026-10-05')).toEqual([{id: '94000000-0000-4000-8000-000000000003', title: 'chess.com Rapid: reach 1,500', detail: 'Reached: 1,523 now'}]);
    expect(chessGoalLines(goals, cache, 'All', '2026-10-05')).toHaveLength(3);
    expect(chessGoalLines(goals, cache, 'Closed', '2026-10-05')).toEqual([]);
  });
  it('nothing without Chess settings; unknown ratings stay unknown without the cache', () => {
    expect(chessGoalLines(undefined, cache, 'All', '2026-10-05')).toEqual([]);
    expect(chessGoalLines(goals, null, 'Active', '2026-10-05')[0]!.detail).toBe('No rating read yet on this site and time control');
  });
});

describe('formatPercent fixed (L8f note 2)', () => {
  it('writes the purpose share as NOVA does: one decimal kept, no space before the sign', () => {
    expect(formatPercent(12.7, {decimals: 1, fixed: true})).toBe('12.7%');
    expect(formatPercent(25, {decimals: 1, fixed: true})).toBe('25.0%');
    expect(formatPercent(25, {decimals: 1})).toBe('25%'); // unchanged without `fixed`
    expect(formatPercent(null, {decimals: 1, fixed: true})).toBe('—');
  });
});
