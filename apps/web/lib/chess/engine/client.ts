import type {EngineLevel} from './levels';
import type {EngineAnswer, EngineAsk} from './worker';

/**
 * Session AV lane 2 (roadmap, BL-10): the page's side of the chess engine. The worker starts on the first move asked
 * of it (a game against the computer has begun), never before; `close` ends it (leaving the page, a new game). A browser
 * without workers, or a worker that does not answer in time, gets the same search on the page, loaded then.
 */
export type EngineReply = {uci: string; depth: number; score: number};
export const ENGINE_STOPPED = 'stopped';
export type Engine = {move: (fen: string, moves: readonly string[], level: EngineLevel) => Promise<EngineReply>; close: () => void};
const onPage = async (fen: string, moves: readonly string[], level: EngineLevel): Promise<EngineReply> => {
  const [{boardFrom}, {limitsOf, search}] = await Promise.all([import('./board'), import('./search')]);
  const board = boardFrom(fen, moves); if (!board) throw new Error('The game could not be read.');
  const r = search(board, limitsOf(level));
  return {uci: r.uci, depth: r.depth, score: r.score};
};
/** The bundled worker (the same `new Worker(new URL(…))` form as the importer's, which the build turns into its own file). */
function bundledWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./worker.ts', import.meta.url), {type: 'module', name: 'zigoals-chess-engine'});
}
export function createEngine(make: () => Worker | null = bundledWorker): Engine {
  let worker: Worker | null = null, broken = false, seq = 0;
  const pending = new Map<number, {resolve: (r: EngineReply) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>; ask: EngineAsk}>();
  const fail = (all: boolean) => {
    broken = true; worker?.terminate(); worker = null;
    for (const [id, p] of pending) { clearTimeout(p.timer); pending.delete(id); if (all) onPage(p.ask.fen, p.ask.moves, p.ask.level).then(p.resolve, p.reject); }
  };
  const start = (): Worker | null => {
    if (worker || broken) return worker;
    try { worker = make(); } catch { worker = null; }
    if (!worker) { broken = true; return null; }
    worker.onmessage = (event: MessageEvent<EngineAnswer>) => {
      const a = event.data, p = pending.get(a?.id); if (!p) return;
      clearTimeout(p.timer); pending.delete(a.id);
      if (a.type === 'move') p.resolve({uci: a.uci, depth: a.depth, score: a.score}); else p.reject(new Error(a.message));
    };
    worker.onerror = event => { event.preventDefault(); fail(true); };
    return worker;
  };
  return {
    move(fen, moves, level) {
      const w = start();
      if (!w) return onPage(fen, moves, level);
      const id = ++seq, ask: EngineAsk = {type: 'move', id, fen, moves: [...moves], level};
      return new Promise<EngineReply>((resolve, reject) => {
        // A worker that has not answered 10 s after its own limit is ended; the page then answers in its place.
        const timer = setTimeout(() => fail(true), 13_000);
        pending.set(id, {resolve, reject, timer, ask});
        w.postMessage(ask);
      });
    },
    close() {
      for (const [id, p] of pending) { clearTimeout(p.timer); pending.delete(id); p.reject(new Error(ENGINE_STOPPED)); }
      worker?.terminate(); worker = null; broken = false;
    },
  };
}
