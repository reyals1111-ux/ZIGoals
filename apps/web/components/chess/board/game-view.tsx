'use client';
import {useEffect, useReducer, useRef, useState} from 'react';
import {boardOf, canAbort, clockLeft, finished, formatClock, iOfferDraw, myTurn, opponentOffersDraw, reduceGame, sideToMove, statusText, supported, type GameAction, type LiveGame, type Side} from '../../../lib/chess/game';
import {abortGame, draw, gameUrl, LICHESS, LichessError, postMove, resign} from '../../../lib/chess/lichess';
import {followNdjson, type JsonObject, type StreamStatus} from '../../../lib/chess/ndjson';
import {ChessBoard, MoveInput, MoveList} from './chess-board';

/**
 * Session AK (ADR-036 Q8, lane C): one Lichess game on the in-app board, from its Board API stream (the authority).
 * A move is sent to Lichess and shown as pending; a refused one is said and the board is drawn again from the stream.
 * Resign asks once more; a draw can be offered, accepted or declined; a game can be aborted before both have moved.
 * The stream reconnects with a back-off until the game ends. No engine and no hints, ever, during a game.
 */
const DONE = new Set(['created', 'started']);
export function GameView({token, gameId, me, onClose, onUnauthorized}: {token: string; gameId: string; me: string; onClose: () => void; onUnauthorized: () => void}) {
  const [game, dispatch] = useReducer((g: LiveGame | null, e: JsonObject | GameAction) => reduceGame(g, e, me), null);
  const [stream, setStream] = useState<StreamStatus>({state: 'connecting'}), [error, setError] = useState(''), [confirmResign, setConfirmResign] = useState(false), [now, setNow] = useState(() => Date.now());
  const over = useRef(false), busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    over.current = false;
    void followNdjson({
      url: `${LICHESS}/api/board/game/stream/${gameId}`, token, signal: controller.signal,
      onValue: v => {
        const status = v.type === 'gameFull' ? (v.state as {status?: unknown} | undefined)?.status : v.type === 'gameState' ? v.status : undefined;
        if (typeof status === 'string' && !DONE.has(status)) over.current = true;
        dispatch(v);
      },
      onStatus: s => { setStream(s); if (s.state === 'unauthorized') onUnauthorized(); },
      reconnect: () => !over.current,
    });
    return () => controller.abort();
  }, [token, gameId, onUnauthorized]);
  const running = !!game && !finished(game) && !!game.clock;
  useEffect(() => { if (!running) return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [running]);
  async function act(work: () => Promise<void>, onRefused?: (message: string) => void) {
    if (busy.current) return;
    busy.current = true; setError('');
    try { await work(); }
    catch (e) {
      const message = e instanceof Error && e.message ? e.message : 'Lichess did not take that.';
      if (e instanceof LichessError && e.kind === 'unauthorized') onUnauthorized();
      if (onRefused) onRefused(message); else setError(message);
    } finally { busy.current = false; }
  }
  if (!game) return <section className="chess-block" aria-label="Game"><p role="status" className="chess-status">{stream.state === 'gone' ? 'Lichess does not know this game.' : stream.state === 'waiting' ? 'Reconnecting to Lichess…' : 'Opening the game…'}</p>
    <div className="chess-actions-row"><a className="text-link" href={gameUrl(gameId)} target="_blank" rel="noopener noreferrer">Continue on Lichess</a><button type="button" className="quiet" onClick={onClose}>Close</button></div></section>;
  if (!supported(game)) return <section className="chess-block" aria-label="Game"><p className="chess-status">This game is a variant ({game.variant}); play it on Lichess.</p><a className="text-link chess-cta" href={gameUrl(game.id)} target="_blank" rel="noopener noreferrer">Continue on Lichess</a></section>;
  const board = boardOf(game), orientation: Side = game.me ?? 'white', opponent: Side = orientation === 'white' ? 'black' : 'white';
  if (!board) return <section className="chess-block" aria-label="Game"><p className="chess-status">This board cannot draw the game Lichess sent.</p><a className="text-link chess-cta" href={gameUrl(game.id)} target="_blank" rel="noopener noreferrer">Continue on Lichess</a></section>;
  const canMove = myTurn(game), done = finished(game), toMove = sideToMove(game);
  const move = (uci: string) => { dispatch({type: 'local-move', uci}); void act(() => postMove(token, game.id, uci), message => dispatch({type: 'local-refused', message})); };
  const clock = (side: Side) => { const left = clockLeft(game, side, now); return left === null ? null : formatClock(left); };
  const who = (side: Side) => { const p = game[side]; return `${p.title ? `${p.title} ` : ''}${p.name}${p.rating ? ` (${p.rating})` : ''}${side === game.me ? ' · you' : ''}`; };
  const status = game.refused ? `Lichess refused that move. ${game.refused.replace(/[.!?]?$/, '.')} The board shows the game as Lichess has it.` : statusText(game);
  const start = boardOf({...game, moves: [], pending: null});
  return <section className="chess-block" aria-labelledby="chess-game-title">
    <div className="chess-head">
      <h3 id="chess-game-title">{game[orientation].name} against {game[opponent].name}</h3>
      <button type="button" className="quiet" onClick={onClose}>Back to your games</button>
    </div>
    <div className="chess-game-area">
      <ChessBoard position={board.position} orientation={orientation} last={board.last} check={board.check} canMove={canMove} onMove={move}
        label={`Chess board, ${orientation} at the bottom. Arrow keys move, Enter selects a piece and then its square.`} />
      <div className="chess-side">
        <p className="chess-status" role="status" aria-live="polite" data-tone={game.refused ? 'bad' : done ? 'good' : undefined}>{status}</p>
        {stream.state === 'waiting' && stream.retryInMs >= 2000 && !done && <p className="fine" role="status">Reconnecting to Lichess in {Math.ceil(stream.retryInMs / 1000)} seconds…</p>}
        {game.opponentGone?.gone && !done && <p className="fine">Your opponent left the game{game.opponentGone.claimWinInSeconds !== null ? `; Lichess lets you claim the win in ${game.opponentGone.claimWinInSeconds} seconds on lichess.org` : ''}.</p>}
        {game.clock && <dl className="chess-clocks" aria-label="Clocks">{[opponent, orientation].map(side => <div key={side} data-running={!done && game.moves.length >= 2 && toMove === side ? '' : undefined}><dt>{who(side)}</dt><dd>{clock(side)}</dd></div>)}</dl>}
        {!game.clock && <p className="fine">{game[opponent].name} against {game[orientation].name}, no clock.</p>}
        <MoveInput position={board.position} canMove={canMove} onMove={move} id={`chess-move-${game.id}`} />
        <h4 className="sr-only">Moves</h4>
        <MoveList sans={board.sans} whiteStarts={start?.position.turn !== 'b'} firstMove={start?.position.fullmove ?? 1} />
        {!done && game.me && <div className="chess-actions-row">
          {canAbort(game) ? <button type="button" className="secondary" onClick={() => void act(() => abortGame(token, game.id))}>Abort the game</button>
            : confirmResign ? <><button type="button" className="secondary" onClick={() => { setConfirmResign(false); void act(() => resign(token, game.id)); }}>Yes, resign</button><button type="button" className="quiet" onClick={() => setConfirmResign(false)}>Keep playing</button></>
            : <button type="button" className="secondary" onClick={() => setConfirmResign(true)}>Resign</button>}
          {!canAbort(game) && (opponentOffersDraw(game)
            ? <><button type="button" className="secondary" onClick={() => void act(() => draw(token, game.id, 'yes'))}>Accept the draw</button><button type="button" className="quiet" onClick={() => void act(() => draw(token, game.id, 'no'))}>Decline the draw</button></>
            : <button type="button" className="quiet" disabled={iOfferDraw(game)} onClick={() => void act(() => draw(token, game.id, 'yes'))}>{iOfferDraw(game) ? 'Draw offered' : 'Offer a draw'}</button>)}
        </div>}
        {opponentOffersDraw(game) && !done && <p className="fine" role="status">Your opponent offers a draw.</p>}
        {error && <p role="alert" className="chess-play-message">{error}</p>}
        <a className="text-link" href={gameUrl(game.id)} target="_blank" rel="noopener noreferrer">Open this game on Lichess</a>
      </div>
    </div>
  </section>;
}
