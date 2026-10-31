import * as z from 'zod';
import {GAME_ID} from './lichess';
import {inCheck, replay, UCI, type Move, type Position} from './rules';

/**
 * Session AK (ADR-036 Q8, lane C): one Lichess game as GET /api/board/game/stream/{id} tells it ("The first line is
 * always of type gameFull", then gameState, chatLine and opponentGone; OpenAPI v2.0.178). The stream is the authority:
 * a move the person makes is shown as pending until a gameState includes it, and when Lichess refuses it the board is
 * drawn again from the stream's moves. Events that do not read are ignored, never guessed at.
 */
const player = z.looseObject({
  id: z.string().max(40).optional(), name: z.string().max(40).optional(), title: z.string().max(10).nullable().optional(),
  rating: z.number().int().min(0).max(4000).nullable().optional(), aiLevel: z.number().int().min(1).max(8).nullable().optional(), provisional: z.boolean().optional(),
});
const ms = z.number().int().min(0).max(1e10);
const stateSchema = z.looseObject({
  type: z.literal('gameState'), moves: z.string().max(8000), wtime: ms.optional(), btime: ms.optional(), winc: ms.optional(), binc: ms.optional(),
  status: z.string().max(30), winner: z.enum(['white', 'black']).optional(), wdraw: z.boolean().optional(), bdraw: z.boolean().optional(),
});
const fullSchema = z.looseObject({
  type: z.literal('gameFull'), id: z.string().regex(GAME_ID), rated: z.boolean().optional(), speed: z.string().max(20).optional(),
  variant: z.looseObject({key: z.string().max(30)}).optional(), clock: z.looseObject({initial: ms, increment: ms}).nullable().optional(),
  white: player, black: player, initialFen: z.string().max(100).optional(), state: stateSchema,
});
const chatSchema = z.looseObject({type: z.literal('chatLine'), room: z.string().max(20), username: z.string().max(40), text: z.string().max(400)});
const goneSchema = z.looseObject({type: z.literal('opponentGone'), gone: z.boolean(), claimWinInSeconds: z.number().int().min(0).max(3600).optional()});

export type Side = 'white' | 'black';
export type Player = {name: string; rating: number | null; title: string | null; ai: number | null};
export type LiveGame = {
  id: string; me: Side | null; white: Player; black: Player; initialFen: string; variant: string; speed: string; rated: boolean;
  moves: string[]; status: string; winner: Side | null; wdraw: boolean; bdraw: boolean;
  clock: {wtime: number; btime: number; winc: number; binc: number; at: number} | null;
  chat: {room: string; username: string; text: string}[]; opponentGone: {gone: boolean; claimWinInSeconds: number | null} | null;
  pending: string | null; refused: string | null;
};
export type GameAction = {type: 'local-move'; uci: string} | {type: 'local-refused'; message: string} | {type: 'local-clear'};
const readPlayer = (p: z.infer<typeof player>): Player => ({name: p.aiLevel ? `Lichess AI level ${p.aiLevel}` : p.name ?? p.id ?? 'Anonymous', rating: p.rating ?? null, title: p.title ?? null, ai: p.aiLevel ?? null});
const splitMoves = (moves: string) => moves.trim() ? moves.trim().split(/\s+/).filter(m => UCI.test(m)).slice(0, 1200) : [];
function withState(game: LiveGame, s: z.infer<typeof stateSchema>, now: number): LiveGame {
  const moves = splitMoves(s.moves), grew = moves.length !== game.moves.length;
  const pendingIn = game.pending !== null && moves[game.moves.length] === game.pending;
  return {
    ...game, moves, status: s.status, winner: s.winner ?? null, wdraw: s.wdraw ?? false, bdraw: s.bdraw ?? false,
    clock: s.wtime !== undefined && s.btime !== undefined ? {wtime: s.wtime, btime: s.btime, winc: s.winc ?? 0, binc: s.binc ?? 0, at: now} : game.clock,
    pending: grew || pendingIn || FINISHED(s.status) ? null : game.pending, refused: grew ? null : game.refused,
  };
}
const FINISHED = (status: string) => status !== 'created' && status !== 'started';
/** The next state of a game for one stream event or one local action (`me` is the person's Lichess id, lower case). */
export function reduceGame(game: LiveGame | null, event: Record<string, unknown> | GameAction, me: string | null, now = Date.now()): LiveGame | null {
  switch (event.type) {
    case 'gameFull': {
      const p = fullSchema.safeParse(event); if (!p.success) return game;
      const g = p.data, mine = (id?: string) => !!me && !!id && id.toLowerCase() === me;
      const base: LiveGame = {
        id: g.id, me: mine(g.white.id) ? 'white' : mine(g.black.id) ? 'black' : null, white: readPlayer(g.white), black: readPlayer(g.black),
        initialFen: g.initialFen && g.initialFen !== 'startpos' ? g.initialFen : 'startpos', variant: g.variant?.key ?? 'standard', speed: g.speed ?? '', rated: g.rated ?? false,
        moves: game?.id === g.id ? game.moves : [], status: 'started', winner: null, wdraw: false, bdraw: false, clock: null,
        chat: game?.id === g.id ? game.chat : [], opponentGone: null, pending: game?.id === g.id ? game.pending : null, refused: game?.id === g.id ? game.refused : null,
      };
      return withState(base, g.state, now);
    }
    case 'gameState': { if (!game) return game; const p = stateSchema.safeParse(event); return p.success ? withState(game, p.data, now) : game; }
    case 'chatLine': { if (!game) return game; const p = chatSchema.safeParse(event); return p.success ? {...game, chat: [...game.chat, {room: p.data.room, username: p.data.username, text: p.data.text.slice(0, 140)}].slice(-100)} : game; }
    case 'opponentGone': { if (!game) return game; const p = goneSchema.safeParse(event); return p.success ? {...game, opponentGone: {gone: p.data.gone, claimWinInSeconds: p.data.claimWinInSeconds ?? null}} : game; }
    case 'local-move': return game && !game.pending && UCI.test((event as {uci: string}).uci) ? {...game, pending: (event as {uci: string}).uci, refused: null} : game;
    case 'local-refused': return game ? {...game, pending: null, refused: (event as {message: string}).message} : game;
    case 'local-clear': return game ? {...game, refused: null} : game;
    default: return game;
  }
}
export const finished = (game: LiveGame) => FINISHED(game.status);
export const supported = (game: LiveGame) => game.variant === 'standard' || game.variant === 'fromPosition';
/** The board as the stream says, with the person's pending move on top. */
export function boardOf(game: LiveGame): {position: Position; last: Move | null; sans: string[]; check: boolean} | null {
  const r = replay(game.initialFen, game.pending ? [...game.moves, game.pending] : game.moves);
  if (!r || r.unreadableAt !== null) return null;
  return {position: r.position, last: r.last, sans: game.pending ? r.sans.slice(0, -1) : r.sans, check: inCheck(r.position)};
}
export const sideToMove = (game: LiveGame): Side => {
  const r = replay(game.initialFen, game.moves);
  return r?.position.turn === 'b' ? 'black' : 'white';
};
export const myTurn = (game: LiveGame) => !finished(game) && game.me !== null && !game.pending && sideToMove(game) === game.me;
/** The result in words, from the person's side. */
export function resultText(game: LiveGame): string {
  const won = game.winner !== null && game.winner === game.me, lost = game.winner !== null && game.me !== null && game.winner !== game.me;
  const end = won ? ' You won.' : lost ? ' You lost.' : game.winner ? ` ${game.winner === 'white' ? 'White' : 'Black'} won.` : '';
  switch (game.status) {
    case 'mate': return `Checkmate.${end}`;
    case 'resign': return won ? 'Your opponent resigned. You won.' : lost ? 'You resigned.' : `Resigned.${end}`;
    case 'outoftime': return `Time ran out.${end}`;
    case 'timeout': return won ? 'Your opponent left the game. You won.' : `The game timed out.${end}`;
    case 'stalemate': return 'Stalemate. The game is a draw.';
    case 'draw': return 'The game is a draw.';
    case 'aborted': return 'The game was aborted.';
    case 'noStart': return 'The game did not start.';
    default: return game.winner ? `The game is over.${end}` : 'The game is over.';
  }
}
/** The status line the board announces (aria-live). */
export function statusText(game: LiveGame): string {
  if (finished(game)) return resultText(game);
  if (game.me === null) return 'You are watching this game.';
  if (game.pending) return 'Sending your move…';
  const board = boardOf(game);
  if (sideToMove(game) === game.me) return board?.check ? 'Your move. You are in check.' : 'Your move.';
  return 'Waiting for your opponent.';
}
/** Whether the opponent has offered a draw (Lichess's wdraw/bdraw). */
export const opponentOffersDraw = (game: LiveGame) => game.me === 'white' ? game.bdraw : game.me === 'black' ? game.wdraw : false;
export const iOfferDraw = (game: LiveGame) => game.me === 'white' ? game.wdraw : game.me === 'black' ? game.bdraw : false;
/** Lichess lets a game be aborted before both players have moved. */
export const canAbort = (game: LiveGame) => !finished(game) && game.moves.length < 2;
/** A clock's time left, counting down the side to move since the last state. */
export function clockLeft(game: LiveGame, side: Side, now = Date.now()): number | null {
  if (!game.clock) return null;
  const base = side === 'white' ? game.clock.wtime : game.clock.btime;
  const running = !finished(game) && game.moves.length >= 2 && sideToMove(game) === side;
  return Math.max(0, running ? base - (now - game.clock.at) : base);
}
export function formatClock(msLeft: number): string {
  const total = Math.ceil(msLeft / 1000), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
