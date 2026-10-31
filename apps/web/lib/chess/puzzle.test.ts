import {describe, expect, it} from 'vitest';
import {fetchDailyPuzzle, parseDailyPuzzle, PuzzleError, puzzleMove, puzzlePosition, revealNext, startProgress} from './puzzle';
import {DAILY_PUZZLE_FIXTURE} from './fixtures';
import {toFen} from './rules';

// Session AK (lane C): Lichess's daily puzzle (a real answer with fictional player names), checked here move by move.
describe('the daily puzzle', () => {
  const p = parseDailyPuzzle(DAILY_PUZZLE_FIXTURE);
  it('reads the position, the side to play, the solution and the links', () => {
    expect(p).toMatchObject({id: '7i6QO', rating: 2150, fen: '3r4/5p2/p3b1pk/1pN5/1P1b4/P2B3P/3K2P1/5R2 b - - 1 1', lastMove: 'e4c5', color: 'black', gameId: 'ZfIxHMa7', url: 'https://lichess.org/training/7i6QO'});
    expect(p.solution).toHaveLength(7);
    expect(p.themes).toContain('endgame');
  });
  it('without a FEN, the position comes from the game\'s moves (the same board)', () => {
    const {fen: _fen, lastMove: _last, ...rest} = DAILY_PUZZLE_FIXTURE.puzzle; void _fen; void _last;
    const fromPgn = parseDailyPuzzle({...DAILY_PUZZLE_FIXTURE, puzzle: rest});
    expect(fromPgn.fen.split(' ').slice(0, 4)).toEqual(p.fen.split(' ').slice(0, 4));
    expect(fromPgn.lastMove).toBe('e4c5');
  });
  it('the right moves go on with the reply played; a wrong one is counted and undone; the last right move solves it', () => {
    let progress = startProgress();
    const wrong = puzzleMove(p, progress, 'd8d7');
    expect(wrong.verdict).toBe('wrong');
    expect(wrong.progress.played).toEqual([]);
    expect(wrong.progress.mistakes).toBe(1);
    progress = wrong.progress;
    for (const [uci, reply] of [['d4c5', 'b4c5'], ['d8d3', 'd2d3'], ['e6c4', 'd3e3']] as const) {
      const step = puzzleMove(p, progress, uci);
      expect(step).toMatchObject({verdict: 'correct', reply});
      progress = step.progress;
    }
    const last = puzzleMove(p, progress, 'c4f1');
    expect(last.verdict).toBe('solved');
    expect(last.progress).toMatchObject({solved: true, revealed: false, mistakes: 1});
    expect(toFen(puzzlePosition(p, last.progress)).split(' ')[0]).toBe('8/5p2/p5pk/1pP5/8/P3K2P/6P1/5b2');
  });
  it('any mating move solves it, as on Lichess', () => {
    const mateIn1 = parseDailyPuzzle({puzzle: {id: 'AbC12', solution: ['a1a8'], fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'}, game: {id: 'ZfIxHMa7'}});
    expect(puzzleMove(mateIn1, startProgress(), 'a1a8').verdict).toBe('solved');
    const twoWays = parseDailyPuzzle({puzzle: {id: 'AbC13', solution: ['a1a8'], fen: '6k1/5ppp/8/8/8/8/1R6/R5K1 w - - 0 1'}, game: {}});
    expect(puzzleMove(twoWays, startProgress(), 'b2b8').verdict).toBe('solved');
  });
  it('"Show the answer" plays the next moves and marks the puzzle as revealed', () => {
    let progress = startProgress();
    for (let i = 0; i < 4; i++) progress = revealNext(p, progress);
    expect(progress).toMatchObject({solved: true, revealed: true});
    expect(progress.played).toEqual(p.solution);
  });
  it('refuses answers it cannot read or follow', () => {
    for (const bad of [null, {}, {puzzle: {id: '7i6QO', solution: []}}, {puzzle: {id: '7i6QO', solution: ['e2e4'], fen: 'bad'}}, {puzzle: {id: '7i6QO', solution: ['a1a2'], fen: DAILY_PUZZLE_FIXTURE.puzzle.fen}}, {puzzle: {id: '../x', solution: ['d4c5'], fen: DAILY_PUZZLE_FIXTURE.puzzle.fen}}])
      expect(() => parseDailyPuzzle(bad)).toThrow(PuzzleError);
  });
  it('is fetched without a token, cookie or referrer', async () => {
    let init: RequestInit | undefined, url = '';
    const puzzle = await fetchDailyPuzzle((async (u: string, i: RequestInit) => { url = u; init = i; return new Response(JSON.stringify(DAILY_PUZZLE_FIXTURE)); }) as typeof fetch);
    expect(puzzle.id).toBe('7i6QO');
    expect(url).toBe('https://lichess.org/api/puzzle/daily');
    expect(init).toMatchObject({credentials: 'omit', referrerPolicy: 'no-referrer'});
    expect(JSON.stringify(init!.headers)).not.toContain('Authorization');
    await expect(fetchDailyPuzzle((async () => new Response('', {status: 429})) as unknown as typeof fetch)).rejects.toThrow(/wait/);
  });
});
