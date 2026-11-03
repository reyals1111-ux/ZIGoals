import {describe, expect, it} from 'vitest';
import {findUci, inCheck, legalMoves, makeMove, outcome, parseFen, parseMoveText, parseSquare, perft, playUci, replay, squareName, START_FEN, startPosition, toFen, toSan, toUci} from './rules';

// Session AK (lane C): known perft counts (chessprogramming.org "Perft Results"): the start position and the standard
// test positions 2 ("Kiwipete"), 3, 4 and 5, which exercise castling, en passant, promotion, pins and checks.
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const POSITION_3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
const POSITION_4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
const POSITION_5 = 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8';
const fen = (f: string) => { const p = parseFen(f); if (!p) throw new Error(`bad FEN ${f}`); return p; };

describe('perft', () => {
  it('start position: 20, 400, 8902', () => {
    const p = startPosition();
    expect([1, 2, 3].map(d => perft(p, d))).toEqual([20, 400, 8902]);
  });
  it('Kiwipete: 48, 2039, 97862', () => {
    expect([1, 2, 3].map(d => perft(fen(KIWIPETE), d))).toEqual([48, 2039, 97862]);
  });
  it('position 3 (en passant and pins along a rank): 14, 191, 2812, 43238', () => {
    expect([1, 2, 3, 4].map(d => perft(fen(POSITION_3), d))).toEqual([14, 191, 2812, 43238]);
  });
  it('position 4 (promotions, castling into check): 6, 264, 9467', () => {
    expect([1, 2, 3].map(d => perft(fen(POSITION_4), d))).toEqual([6, 264, 9467]);
  });
  it('position 5: 44, 1486, 62379', () => {
    expect([1, 2, 3].map(d => perft(fen(POSITION_5), d))).toEqual([44, 1486, 62379]);
  });
});

describe('FEN', () => {
  it('reads and writes the same text', () => {
    for (const f of [START_FEN, KIWIPETE, POSITION_3, POSITION_4, POSITION_5, 'rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3']) expect(toFen(fen(f))).toBe(f);
  });
  it('refuses what is not a position', () => {
    for (const bad of ['', 'x', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1', 'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'rnbqqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkx - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e4 0 1', 'Pnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1', 'a'.repeat(200)])
      expect(parseFen(bad), bad).toBeNull();
  });
  it('drops castling rights whose king or rook is not home; the move counters are optional', () => {
    expect(parseFen('4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1')!.castling).toBe('');
    expect(toFen(parseFen('4k3/8/8/8/8/8/8/R3K2R w KQ -')!)).toBe('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  });
  it('squares', () => {
    expect([parseSquare('a1'), parseSquare('h8'), parseSquare('e4'), parseSquare('i9')]).toEqual([0, 63, 28, null]);
    expect(squareName(28)).toBe('e4');
  });
});

describe('moves', () => {
  it('castling: both sides, not through or out of check, rights lost when the king or a rook moves or a rook is taken', () => {
    const p = fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(legalMoves(p).filter(m => m.castle).map(toUci).sort()).toEqual(['e1c1', 'e1g1']);
    const afterOO = makeMove(p, findUci(p, 'e1g1')!);
    expect(toFen(afterOO)).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
    expect(legalMoves(fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')).some(m => m.castle)).toBe(true);
    expect(legalMoves(fen('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1')).filter(m => m.castle).map(toUci)).toEqual(['e1c1']); // the f2 rook covers f1, the square the king crosses
    expect(legalMoves(fen('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1')).filter(m => m.castle)).toEqual([]); // in check
    const rookTaken = makeMove(fen('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1'), findUci(fen('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1'), 'h8h1')!);
    expect(rookTaken.castling).toBe('Qq');
  });
  it('en passant: only right after the double step, and not when it would expose the king', () => {
    const p = fen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3');
    const ep = findUci(p, 'f5e6')!;
    expect(ep.enPassant).toBe(true);
    expect(toFen(makeMove(p, ep))).toBe('rnbqkbnr/pppp1ppp/4P3/8/8/8/PPPPP1PP/RNBQKBNR b KQkq - 0 3');
    expect(findUci(fen('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1'), 'e5d6')).toBeNull(); // the pinned pair along the rank
  });
  it('promotion: four choices; a UCI string without the piece does not match', () => {
    const p = fen('8/P7/8/8/8/8/8/k6K w - - 0 1');
    expect(legalMoves(p).filter(m => m.from === parseSquare('a7')).map(toUci).sort()).toEqual(['a7a8b', 'a7a8n', 'a7a8q', 'a7a8r']);
    expect(findUci(p, 'a7a8')).toBeNull();
    expect(toFen(makeMove(p, findUci(p, 'a7a8n')!))).toBe('N7/8/8/8/8/8/8/k6K b - - 0 1');
  });
  it('check, checkmate and stalemate', () => {
    const mate = fen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    expect(inCheck(mate)).toBe(true);
    expect(outcome(mate)).toBe('checkmate');
    expect(outcome(fen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBe('stalemate');
    expect(outcome(startPosition())).toBeNull();
  });
  it('a king taking its own rook (Lichess\'s chess960 form) is read as castling', () => {
    const p = fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(findUci(p, 'e1h1')?.castle).toBe('k');
    expect(findUci(p, 'e1a1')?.castle).toBe('q');
  });
});

describe('SAN', () => {
  it('writes pieces, captures, disambiguation, castling, promotion and check marks', () => {
    const r = replay('startpos', ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5c6', 'd7c6', 'e1g1'])!;
    expect(r.sans).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O']);
    const twoKnights = fen('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1');
    expect(toSan(twoKnights, findUci(twoKnights, 'b1d2')!)).toBe('Nbd2');
    const twoRooks = fen('4k3/8/R7/8/8/8/8/R3K3 w - - 0 1');
    expect(toSan(twoRooks, findUci(twoRooks, 'a1a3')!)).toBe('R1a3');
    const threeQueens = fen('6k1/8/8/8/Q6Q/8/8/Q3K3 w - - 0 1');
    expect(toSan(threeQueens, findUci(threeQueens, 'a4d4')!)).toBe('Qa4d4'); // shares a file with a1 and a rank with h4
    expect(toSan(threeQueens, findUci(threeQueens, 'a1d4')!)).toBe('Q1d4');
    expect(toSan(threeQueens, findUci(threeQueens, 'h4d4')!)).toBe('Qhd4');
    const promote = fen('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1');
    expect(toSan(promote, findUci(promote, 'b7b8q')!)).toBe('b8=Q+');
    expect(replay('startpos', ['f2f3', 'e7e5', 'g2g4', 'd8h4'])!.sans.at(-1)).toBe('Qh4#');
  });
  it('reads typed moves: UCI, SAN with or without marks, 0-0, promotion without "="; says why when it cannot', () => {
    const p = startPosition();
    expect(toUci((parseMoveText(p, 'e2e4') as {move: never}).move)).toBe('e2e4');
    expect(toUci((parseMoveText(p, ' Nf3 ') as {move: never}).move)).toBe('g1f3');
    expect(toUci((parseMoveText(p, 'Ng1f3') as {move: never}).move)).toBe('g1f3');
    expect(toUci((parseMoveText(fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), '0-0-0') as {move: never}).move)).toBe('e1c1');
    expect(toUci((parseMoveText(fen('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1'), 'b8Q+') as {move: never}).move)).toBe('b7b8q');
    expect(parseMoveText(fen('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1'), 'b7b8')).toEqual({error: 'Add the piece to promote to, like e7e8q.'});
    expect(parseMoveText(p, 'e2e5')).toEqual({error: 'e2e5 is not a legal move here.'});
    expect(parseMoveText(p, 'Qh5')).toEqual({error: 'Qh5 is not a legal move here.'});
    expect(parseMoveText(p, '')).toEqual({error: 'Type a move, like e2e4 or Nf3.'});
    expect('error' in parseMoveText(p, 'x'.repeat(40))).toBe(true);
  });
});

describe('replay and the authority', () => {
  it('replays Lichess\'s UCI moves from "startpos" or a FEN, with the last move', () => {
    const r = replay('startpos', ['e2e4', 'c7c5'])!;
    expect(toFen(r.position)).toBe('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2');
    expect(r.last && toUci(r.last)).toBe('c7c5');
    expect(replay('not a fen', [])).toBeNull();
  });
  it('a move this module would not generate is still drawn as the stream says', () => {
    const p = startPosition(), played = playUci(p, 'e2e5')!;
    expect(toFen(played.position).split(' ').slice(0, 2).join(' ')).toBe('rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b');
    expect(playUci(p, 'e3e4')).toBeNull();
    const r = replay('startpos', ['e2e4', 'e3e4']);
    expect(r?.unreadableAt).toBe(1);
  });
});
