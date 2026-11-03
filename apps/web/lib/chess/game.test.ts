import {describe, expect, it} from 'vitest';
import {boardOf, canAbort, clockLeft, finished, formatClock, iOfferDraw, myTurn, opponentOffersDraw, reduceGame, resultText, statusText, type LiveGame} from './game';
import {GAME_FULL_FIXTURE} from './fixtures';
import {toFen, toUci} from './rules';

// Session AK (lane C): one game from Lichess's game stream events (gameFull, gameState, chatLine, opponentGone) and the
// person's own pending or refused move; the stream stays the authority.
const ME = 'fictional-me', T = 1_000_000;
const full = (moves = '', over: Record<string, unknown> = {}) => reduceGame(null, GAME_FULL_FIXTURE(moves, over), ME, T)!;
const state = (moves: string, over: Record<string, unknown> = {}) => ({type: 'gameState', moves, wtime: 590000, btime: 600000, winc: 0, binc: 0, status: 'started', ...over});

describe('the game reducer', () => {
  it('gameFull: the players, the person\'s colour, the moves, the clocks', () => {
    const g = full('e2e4 e7e5');
    expect(g).toMatchObject({id: 'GaMe0001', me: 'white', white: {name: 'Fictional-Me', rating: 1500}, black: {name: 'Fictional-Rival'}, moves: ['e2e4', 'e7e5'], status: 'started', clock: {wtime: 600000, btime: 600000, at: T}});
    expect(myTurn(g)).toBe(true);
    expect(statusText(g)).toBe('Your move.');
    expect(boardOf(g)!.sans).toEqual(['e4', 'e5']);
    const black = reduceGame(null, GAME_FULL_FIXTURE('e2e4', {white: {id: 'someone', name: 'Someone'}, black: {id: 'Fictional-Me', name: 'Fictional-Me'}}), ME, T)!;
    expect(black.me).toBe('black');
    expect(statusText(black)).toBe('Your move.');
    expect(reduceGame(null, GAME_FULL_FIXTURE('', {white: {aiLevel: 3}}), ME, T)!.white.name).toBe('Lichess AI level 3');
  });
  it('a pending move shows on the board until a gameState includes it', () => {
    let g: LiveGame | null = full('e2e4 e7e5');
    g = reduceGame(g, {type: 'local-move', uci: 'g1f3'}, ME);
    expect(g!.pending).toBe('g1f3');
    expect(statusText(g!)).toBe('Sending your move…');
    expect(myTurn(g!)).toBe(false);
    expect(boardOf(g!)!.last && toUci(boardOf(g!)!.last!)).toBe('g1f3');
    expect(boardOf(g!)!.sans).toEqual(['e4', 'e5']); // the move list waits for Lichess
    expect(reduceGame(g, {type: 'local-move', uci: 'b1c3'}, ME)!.pending).toBe('g1f3'); // one at a time
    g = reduceGame(g, state('e2e4 e7e5 g1f3'), ME, T + 5);
    expect(g!.pending).toBeNull();
    expect(statusText(g!)).toBe('Waiting for your opponent.');
    expect(g!.clock).toMatchObject({wtime: 590000, at: T + 5});
  });
  it('a refused move: the board is drawn from the stream again and the reason is kept until the next move', () => {
    let g = reduceGame(full('e2e4 e7e5'), {type: 'local-move', uci: 'g1f3'}, ME)!;
    g = reduceGame(g, {type: 'local-refused', message: 'Lichess said: Not your turn'}, ME)!;
    expect(g.pending).toBeNull();
    expect(g.refused).toBe('Lichess said: Not your turn');
    expect(toFen(boardOf(g)!.position)).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');
    g = reduceGame(g, state('e2e4 e7e5 d2d4'), ME)!;
    expect(g.refused).toBeNull();
  });
  it('a reconnect (a new gameFull for the same game) keeps the chat', () => {
    let g = reduceGame(full('e2e4'), {type: 'chatLine', room: 'player', username: 'Fictional-Rival', text: 'Have fun'}, ME)!;
    g = reduceGame(g, GAME_FULL_FIXTURE('e2e4 e7e5'), ME)!;
    expect(g.chat).toEqual([{room: 'player', username: 'Fictional-Rival', text: 'Have fun'}]);
    expect(g.moves).toEqual(['e2e4', 'e7e5']);
  });
  it('results in words, from the person\'s side', () => {
    const end = (over: Record<string, unknown>) => reduceGame(full('e2e4 e7e5'), state('e2e4 e7e5', over), ME)!;
    expect(resultText(end({status: 'mate', winner: 'white'}))).toBe('Checkmate. You won.');
    expect(resultText(end({status: 'mate', winner: 'black'}))).toBe('Checkmate. You lost.');
    expect(resultText(end({status: 'resign', winner: 'black'}))).toBe('You resigned.');
    expect(resultText(end({status: 'resign', winner: 'white'}))).toBe('Your opponent resigned. You won.');
    expect(resultText(end({status: 'outoftime', winner: 'black'}))).toBe('Time ran out. You lost.');
    expect(resultText(end({status: 'stalemate'}))).toBe('Stalemate. The game is a draw.');
    expect(resultText(end({status: 'draw'}))).toBe('The game is a draw.');
    expect(resultText(end({status: 'aborted'}))).toBe('The game was aborted.');
    expect(finished(end({status: 'draw'}))).toBe(true);
    expect(statusText(end({status: 'draw'}))).toBe('The game is a draw.');
  });
  it('draw offers, abort, opponent gone; events that do not read are ignored', () => {
    const g = full('e2e4');
    expect(canAbort(g)).toBe(true);
    expect(canAbort(full('e2e4 e7e5'))).toBe(false);
    const offered = reduceGame(g, state('e2e4', {bdraw: true}), ME)!;
    expect([opponentOffersDraw(offered), iOfferDraw(offered)]).toEqual([true, false]);
    expect(reduceGame(g, {type: 'opponentGone', gone: true, claimWinInSeconds: 30}, ME)!.opponentGone).toEqual({gone: true, claimWinInSeconds: 30});
    for (const bad of [{type: 'gameState', moves: 5}, {type: 'gameFull', id: 'nope'}, {type: 'chatLine'}, {type: 'whatever'}]) expect(reduceGame(g, bad, ME)).toBe(g);
    expect(reduceGame(null, state('e2e4'), ME)).toBeNull();
  });
  it('clocks count down the side to move once both have moved', () => {
    const g = reduceGame(full('e2e4 e7e5'), state('e2e4 e7e5', {wtime: 61_000, btime: 3_723_000}), ME, T)!;
    expect(clockLeft(g, 'white', T + 1500)).toBe(59_500);
    expect(clockLeft(g, 'black', T + 1500)).toBe(3_723_000);
    expect(formatClock(59_500)).toBe('1:00');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(formatClock(0)).toBe('0:00');
  });
});
