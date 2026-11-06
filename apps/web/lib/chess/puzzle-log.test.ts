import {describe, expect, it} from 'vitest';
import {PUZZLE_LOG_KEY, emptyPuzzleLog, puzzleLogSummary, readPuzzleLog, savePuzzleLog, withPuzzle} from './puzzle-log';

// Session AL (Part 15, C-BN-22 / GAP-152): the daily puzzle's dated log on this device.
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m}; };
describe('the puzzle log', () => {
  it('keeps a puzzle’s first finish only, and reads back what it saved', () => {
    const s = memory();
    let log = withPuzzle(emptyPuzzleLog(), {day: '2026-11-04', id: 'abc12', rating: 1850, result: 'solved', mistakes: 0});
    const again = withPuzzle(log, {day: '2026-11-04', id: 'abc12', rating: 1850, result: 'shown', mistakes: 3});
    expect(again).toBe(log);
    log = withPuzzle(log, {day: '2026-11-05', id: 'def34', rating: null, result: 'shown', mistakes: 1});
    expect(savePuzzleLog(s, log)).toBe(true);
    expect(readPuzzleLog(s)).toEqual(log);
    expect(JSON.parse(s.m.get(PUZZLE_LOG_KEY)!).version).toBe(1);
  });
  it('reads a damaged record as empty, drops bad entries and keeps unknown fields', () => {
    const s = memory();
    s.setItem(PUZZLE_LOG_KEY, '{not json'); expect(readPuzzleLog(s).entries).toEqual([]);
    s.setItem(PUZZLE_LOG_KEY, JSON.stringify({version: 1, later: 'kept', entries: [{day: '2026-11-01', id: 'ok123', result: 'solved'}, {day: 'x', id: 'bad', result: 'solved'}, {day: '2026-11-02', id: 'ok456', result: 'won'}]}));
    const log = readPuzzleLog(s);
    expect(log.entries).toEqual([{day: '2026-11-01', id: 'ok123', rating: null, result: 'solved', mistakes: 0}]);
    expect(log.later).toBe('kept');
    expect(readPuzzleLog(null).entries).toEqual([]);
    expect(savePuzzleLog({getItem: () => null, setItem: () => { throw Error('full'); }}, log)).toBe(false);
  });
  it('sums the last 30 days and the run of solved days', () => {
    let log = emptyPuzzleLog();
    for (const [day, id, result] of [['2026-10-01', 'old01', 'solved'], ['2026-11-02', 'p0002', 'solved'], ['2026-11-03', 'p0003', 'solved'], ['2026-11-04', 'p0004', 'solved'], ['2026-10-30', 'p1030', 'shown']] as const) log = withPuzzle(log, {day, id, rating: null, result, mistakes: 0});
    const s = puzzleLogSummary(log, '2026-11-05');
    expect([s.solved, s.shown, s.played, s.run]).toEqual([3, 1, 4, 3]); // 1 Oct is outside the 30 days; today is still open
    expect(s.recent.map(e => e.day)).toEqual(['2026-11-04', '2026-11-03', '2026-11-02', '2026-10-30', '2026-10-01']);
    expect(puzzleLogSummary(log, '2026-11-07').run).toBe(0);
  });
});
