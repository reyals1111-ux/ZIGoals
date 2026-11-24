/// <reference lib="webworker" />
import {boardFrom} from './board';
import {limitsOf, search, type EngineLevel} from './search';

/**
 * Session AV lane 2 (roadmap, BL-10): the chess engine's Web Worker, started by the Play panel only when a game against
 * the computer begins (engine/client.ts), so the search never holds up the page. Bundled with the app (served from
 * /_next/static/, allowed by `worker-src 'self'`); it makes no request and talks only to the page that started it.
 * In: the game's start FEN, its moves so far (UCI) and the level. Out: the move, how deep it looked, or a plain refusal.
 */
export type EngineAsk = {type: 'move'; id: number; fen: string; moves: string[]; level: EngineLevel};
export type EngineAnswer = {type: 'move'; id: number; uci: string; depth: number; score: number} | {type: 'error'; id: number; message: string};
const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = (event: MessageEvent<EngineAsk>) => {
  const ask = event.data;
  if (ask?.type !== 'move') return;
  const board = boardFrom(ask.fen, ask.moves);
  if (!board) { scope.postMessage({type: 'error', id: ask.id, message: 'The game could not be read.'} satisfies EngineAnswer); return; }
  const r = search(board, limitsOf(ask.level));
  scope.postMessage({type: 'move', id: ask.id, uci: r.uci, depth: r.depth, score: r.score} satisfies EngineAnswer);
};
