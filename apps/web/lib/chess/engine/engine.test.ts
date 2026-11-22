import {describe, expect, test} from 'vitest';
import {Board, boardFrom, findMove, moveUci, perft, status} from './board';
import {ENGINE_LEVELS, MATE, evaluate, limitsOf, search} from './search';
import {legalMoves, makeMove, parseFen, perft as rulesPerft, START_FEN, toUci} from '../rules';

/**
 * Session AV lane 2 (roadmap, BL-10): ZIGoals' own chess engine. Perft counts are the published ones
 * (chessprogramming.org, "Perft Results"); the engine's generator must agree with them and with lib/chess/rules.ts.
 */
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const POSITION_3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
const POSITION_4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
const POSITION_5 = 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8';
const fen = (f: string) => Board.fromFen(f)!;

describe('move generation (perft)', () => {
  test('the start position to depth 4', () => expect([1, 2, 3, 4].map(d => perft(fen(START_FEN), d))).toEqual([20, 400, 8902, 197281]));
  test('Kiwipete: castling both ways, en passant, promotions, pins, to depth 3', () => expect([1, 2, 3].map(d => perft(fen(KIWIPETE), d))).toEqual([48, 2039, 97862]));
  test('position 3: en passant that would expose the king, to depth 4', () => expect([1, 2, 3, 4].map(d => perft(fen(POSITION_3), d))).toEqual([14, 191, 2812, 43238]));
  test('position 4: promotions with capture and castling rights lost, to depth 3', () => expect([1, 2, 3].map(d => perft(fen(POSITION_4), d))).toEqual([6, 264, 9467]));
  test('position 5, to depth 3', () => expect([1, 2, 3].map(d => perft(fen(POSITION_5), d))).toEqual([44, 1486, 62379]));
  test('agrees move for move with the app’s rules module, and make/unmake leaves the board as it was', () => {
    for (const f of [START_FEN, KIWIPETE, POSITION_3, POSITION_4, POSITION_5]) {
      const b = fen(f), before = b.toFen(), key = b.key();
      expect(b.legal().map(moveUci).sort(), f).toEqual(legalMoves(parseFen(f)!).map(toUci).sort());
      perft(b, 2);
      expect(b.toFen()).toBe(before); expect(b.key()).toBe(key);
      expect(perft(b, 2)).toBe(rulesPerft(parseFen(f)!, 2));
    }
  });
  test('the FEN round-trips and a key names the position, not the path to it', () => {
    expect(fen(KIWIPETE).toFen()).toBe(KIWIPETE);
    const a = boardFrom(START_FEN, ['g1f3', 'g8f6', 'b1c3'])!, c = boardFrom(START_FEN, ['b1c3', 'g8f6', 'g1f3'])!;
    expect(a.key()).toBe(c.key());
    expect(a.key()).not.toBe(boardFrom(START_FEN, ['g1f3', 'g8f6'])!.key());
    expect(boardFrom(START_FEN, ['e2e5'])).toBeNull();
    expect(Board.fromFen('not a fen')).toBeNull();
  });
});

describe('the rules: check, mate, stalemate and the draws', () => {
  test('checkmate and stalemate', () => {
    expect(status(fen('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'))).toBe('checkmate');
    expect(status(fen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBe('stalemate');
    expect(fen('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4').inCheck()).toBe(true);
    expect(status(fen(START_FEN))).toBeNull();
  });
  test('fifty moves, threefold repetition and bare material', () => {
    expect(status(fen('4k3/8/8/8/8/8/4P3/4K3 w - - 100 80'))).toBe('fifty-move');
    const knights = ['g1f3', 'g8f6', 'f3g1', 'f6g8'];
    expect(status(boardFrom(START_FEN, knights)!)).toBeNull(); // twice
    expect(status(boardFrom(START_FEN, [...knights, ...knights])!)).toBe('repetition');
    expect(status(fen('4k3/8/8/8/8/8/8/4KN2 w - - 0 1'))).toBe('material');
    expect(status(fen('4k3/8/8/8/8/8/8/4KR2 w - - 0 1'))).toBeNull();
  });
  test('castling, en passant and promotion as moves', () => {
    expect(findMove(fen(KIWIPETE), 'e1g1')).toBeTruthy();
    expect(findMove(fen(KIWIPETE), 'e1c1')).toBeTruthy();
    const ep = boardFrom('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1', ['e2e4'])!;
    expect(findMove(ep, 'd4e3')).toBeTruthy();
    const promo = fen('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1');
    expect(promo.legal().map(moveUci).filter(u => u.startsWith('b7b8')).sort()).toEqual(['b7b8b', 'b7b8n', 'b7b8q', 'b7b8r']);
  });
});

describe('the search and its three levels', () => {
  test('the levels look deeper and longer in turn', () => {
    expect(ENGINE_LEVELS.map(l => l.id)).toEqual(['easy', 'medium', 'hard']);
    const [e, m, h] = ENGINE_LEVELS.map(l => l.limits);
    expect(e!.depth).toBeLessThan(m!.depth); expect(m!.depth).toBeLessThan(h!.depth);
    expect(e!.ms).toBeLessThan(m!.ms); expect(m!.ms).toBeLessThan(h!.ms);
    expect(limitsOf('medium')).toEqual(m);
  });
  test('every level finds a mate in one', () => {
    for (const l of ENGINE_LEVELS) expect(search(fen('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4'), l.limits).uci, l.id).toBe('h5f7');
  });
  test('a mate in two that one move ahead cannot see, the deeper levels find', () => {
    // White: 1. Qe8+ Rxe8 2. Rxe8# (a back-rank mate); one move ahead sees only the queen lost.
    const twoMoves = '1r4k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1';
    const hard = search(fen(twoMoves), limitsOf('hard')), medium = search(fen(twoMoves), limitsOf('medium'));
    expect(hard.score).toBeGreaterThan(MATE - 500);
    expect(medium.score).toBeGreaterThan(MATE - 500);
    expect([hard.uci, medium.uci]).toEqual(['e2e8', 'e2e8']);
    expect(search(fen(twoMoves), limitsOf('easy')).uci).not.toBe('e2e8');
  });
  test('takes a hanging queen and keeps its own', () => {
    expect(search(fen('4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 1'), limitsOf('easy')).uci).toBe('e4d5');
    expect(search(fen('4k3/8/1p6/2p5/3Q4/8/8/4K3 w - - 0 1'), limitsOf('medium')).uci).not.toBe('d4c5');
  });
  test('with a depth limit it is deterministic and reaches that depth; with a time limit it stops in time', () => {
    const a = search(fen(START_FEN), {depth: 3, ms: 60_000}), b = search(fen(START_FEN), {depth: 3, ms: 60_000});
    expect([a.uci, a.depth]).toEqual([b.uci, 3]);
    expect(findMove(fen(START_FEN), a.uci)).toBeTruthy();
    const t = performance.now(), timed = search(fen(KIWIPETE), {depth: 30, ms: 300});
    expect(performance.now() - t).toBeLessThan(1500);
    expect(timed.depth).toBeGreaterThanOrEqual(1);
    expect(findMove(fen(KIWIPETE), timed.uci)).toBeTruthy();
    const capped = search(fen(KIWIPETE), {depth: 30, ms: 60_000, nodes: 2000});
    expect(capped.nodes).toBeLessThanOrEqual(2001);
  });
  test('the search leaves the board as it was, sees a repetition as a draw, and gives no move when the game is over', () => {
    const b = fen(KIWIPETE), before = b.toFen();
    search(b, {depth: 2, ms: 60_000});
    expect(b.toFen()).toBe(before);
    // Black, a queen down, has stood here twice: going back to f8 repeats a position, which the search counts as the
    // draw it is heading for; every other move is lost on material.
    const lost = boardFrom('6k1/8/8/8/8/8/8/K6Q b - - 0 1', ['g8f8', 'h1h2', 'f8g8', 'h2h1'])!;
    expect(lost.repetitions()).toBe(2);
    expect(search(lost, {depth: 3, ms: 60_000})).toMatchObject({uci: 'g8f8', score: 0});
    expect(search(fen('6k1/8/8/8/8/8/8/K6Q b - - 0 1'), {depth: 3, ms: 60_000}).score).toBeLessThan(-500);
    expect(search(fen('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'), limitsOf('easy'))).toMatchObject({move: 0, uci: ''});
    expect(evaluate(fen(START_FEN))).toBe(0);
    expect(evaluate(fen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1'))).toBeGreaterThan(800);
    expect(evaluate(fen('4k3/8/8/8/8/8/8/3QK3 b - - 0 1'))).toBeLessThan(-800);
    void makeMove;
  });
});
