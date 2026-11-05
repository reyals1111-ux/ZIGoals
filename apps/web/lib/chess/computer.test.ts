import {describe, expect, test} from 'vitest';
import {computerMove, gameEnd, LEVELS} from './computer';
import {makeMove, parseFen, playUci, startPosition, toUci} from './rules';

/** Session AL fourth pass (BN-182, D-228, C-BN-24): the on-device computer opponent. */
describe('the computer opponent', () => {
  test('finds a mate in one at every level', () => {
    // White: Qh5, Bc4; Black to be mated on f7 (scholar's mate).
    const pos = parseFen('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4')!;
    for (const [level] of LEVELS) expect(toUci(computerMove(pos, level)!)).toBe('h5f7');
  });
  test('takes a queen left hanging, and does not leave its own en prise for a pawn', () => {
    const hanging = parseFen('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1')!;
    expect(toUci(computerMove(hanging, 'easy')!)).toBe('e4d5');
    const guarded = parseFen('4k3/8/1p6/2p5/3Q4/8/8/4K3 w - - 0 1')!; // b6 guards c5: Qxc5 loses the queen for a pawn
    expect(toUci(computerMove(guarded, 'medium')!)).not.toBe('d4c5');
  });
  test('is deterministic, plays only legal moves, and answers from the start within a second at the hardest level', () => {
    const start = startPosition(), t = performance.now();
    const a = computerMove(start, 'hard')!;
    const spent = performance.now() - t, b = computerMove(start, 'hard')!;
    expect(spent).toBeLessThan(2000);
    expect(toUci(a)).toBe(toUci(b));
    expect(playUci(start, toUci(a))).not.toBeNull();
  });
  test('gives no move when the game is over', () => {
    const mated = parseFen('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4')!;
    expect(computerMove(mated, 'easy')).toBeNull();
  });
});

describe('how a game ends', () => {
  test('checkmate, stalemate, fifty moves, bare kings and threefold repetition', () => {
    expect(gameEnd(parseFen('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4')!, [])).toEqual({over: true, winner: 'w', why: 'checkmate'});
    expect(gameEnd(parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')!, [])).toEqual({over: true, winner: null, why: 'stalemate'});
    expect(gameEnd(parseFen('4k3/8/8/8/8/8/4P3/4K3 w - - 100 80')!, [])).toMatchObject({why: 'fifty-move'});
    expect(gameEnd(parseFen('4k3/8/8/8/8/8/8/4KN2 w - - 0 1')!, [])).toMatchObject({why: 'material'});
    let pos = startPosition(); const seen = [pos];
    for (const uci of ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']) { pos = playUci(pos, uci)!.position; seen.push(pos); }
    expect(gameEnd(pos, seen.slice(0, -1))).toMatchObject({over: true, why: 'repetition'});
    expect(gameEnd(startPosition(), [])).toEqual({over: false});
    expect(makeMove).toBeTypeOf('function');
  });
});
