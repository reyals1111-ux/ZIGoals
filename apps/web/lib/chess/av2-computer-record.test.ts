import {describe, expect, test} from 'vitest';
import {CHESS_COMPUTER, CHESS_COMPUTER_KEY, chessComputerSchema, emptyChessComputer, recordComputerResult, saveComputerGame, tallyOf, totalTally} from './computer-record';
import {createEngine} from './engine/client';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';

/** Session AV lane 2 (roadmap, BL-10): games against the engine kept on this device, and the page's side of the worker. */
const AT = '2026-11-22T09:00:00.000Z';
describe('the kept game and the results by level (TIER 3 stored formats)', () => {
  test('a game is kept, a result counts at its level and clears the game', () => {
    let r = saveComputerGame(emptyChessComputer(), {side: 'b', level: 'medium', moves: ['e2e4', 'e7e5'], startedAt: AT});
    expect(r.game).toEqual({side: 'b', level: 'medium', moves: ['e2e4', 'e7e5'], startedAt: AT});
    r = recordComputerResult(r, 'medium', 'won');
    expect(r.game).toBeUndefined();
    r = recordComputerResult(recordComputerResult(r, 'hard', 'lost'), 'medium', 'drawn');
    expect(tallyOf(r, 'medium')).toEqual({won: 1, lost: 0, drawn: 1});
    expect(tallyOf(r, 'easy')).toEqual({won: 0, lost: 0, drawn: 0});
    expect(totalTally(r)).toEqual({won: 1, lost: 1, drawn: 1});
    expect(saveComputerGame(r, null).game).toBeUndefined();
  });
  test('reads tolerantly: a part it cannot read is dropped, never the record', () => {
    const read = chessComputerSchema.parse({version: 1, game: {side: 'x', level: 'easy', moves: [], startedAt: AT}, tally: {easy: {won: 2, lost: 'many', drawn: 1}, hard: 'no'}, later: 'kept'});
    expect(read.game).toBeUndefined();
    expect(read.tally?.easy).toEqual({won: 2, lost: 0, drawn: 1});
    expect(read.tally?.hard).toBeUndefined();
    expect((read as Record<string, unknown>).later).toBe('kept');
    expect(() => saveComputerGame(read, {side: 'w', level: 'easy', moves: ['e2e9'], startedAt: AT})).toThrow();
  });
  test('Export everything, erase and restore keep the game and the results', async () => {
    const r = recordComputerResult(saveComputerGame(emptyChessComputer(), {side: 'w', level: 'hard', moves: ['d2d4'], startedAt: AT}), 'easy', 'won');
    const kept = saveComputerGame(r, {side: 'w', level: 'hard', moves: ['d2d4', 'g8f6'], startedAt: AT});
    const m = new Map<string, string>([[CHESS_COMPUTER_KEY, JSON.stringify(kept)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    await readEverything(storage);
    const exported = storage.getItem(CHESS_COMPUTER_KEY)!;
    storage.clear();
    expect(readDeviceRecord(storage, CHESS_COMPUTER).data).toEqual({version: 1});
    storage.setItem(CHESS_COMPUTER_KEY, exported);
    expect(readDeviceRecord(storage, CHESS_COMPUTER).data).toEqual(kept);
  });
});

describe('the engine client', () => {
  test('starts no worker until a move is asked, answers from the worker, and ends it on close', async () => {
    let made = 0, terminated = 0;
    class FakeWorker {
      onmessage: ((e: MessageEvent) => void) | null = null; onerror: ((e: Event) => void) | null = null;
      postMessage(ask: {id: number; moves: string[]}) { queueMicrotask(() => this.onmessage?.({data: {type: 'move', id: ask.id, uci: ask.moves.length ? 'g8f6' : 'e2e4', depth: 3, score: 12}} as MessageEvent)); }
      terminate() { terminated++; }
    }
    const engine = createEngine(() => { made++; return new FakeWorker() as unknown as Worker; });
    expect(made).toBe(0);
    expect(await engine.move('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [], 'medium')).toEqual({uci: 'e2e4', depth: 3, score: 12});
    expect(await engine.move('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['e2e4'], 'medium')).toMatchObject({uci: 'g8f6'});
    expect(made).toBe(1);
    engine.close();
    expect(terminated).toBe(1);
  });
  test('with no worker, the same search answers on the page', async () => {
    const engine = createEngine(() => null);
    const reply = await engine.move('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4', [], 'easy');
    expect(reply.uci).toBe('h5f7');
    await expect(engine.move('not a fen', [], 'easy')).rejects.toThrow('The game could not be read.');
  });
  test('a worker that fails hands the move to the page', async () => {
    class Broken { onmessage: unknown = null; onerror: ((e: Event) => void) | null = null; postMessage() { queueMicrotask(() => this.onerror?.({preventDefault() {}} as unknown as Event)); } terminate() {} }
    const engine = createEngine(() => new Broken() as unknown as Worker);
    expect((await engine.move('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4', [], 'easy')).uci).toBe('h5f7');
  });
});
