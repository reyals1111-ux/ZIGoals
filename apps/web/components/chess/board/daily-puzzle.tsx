'use client';
import {useEffect, useRef, useState} from 'react';
import {fetchDailyPuzzle, puzzleMove, puzzlePosition, revealNext, startProgress, type DailyPuzzle as Puzzle, type PuzzleProgress} from '../../../lib/chess/puzzle';
import {findUci, inCheck, parseSquare, replay} from '../../../lib/chess/rules';
import {applyPuzzleCheckIn, puzzleCheckIn} from '../../../lib/skills/chess/puzzle';
import {markApplied} from '../../../lib/skills/chess/engine';
import {motionAllowed} from '../../zigi/motion';
import type {HabitsStore} from '../../habits/use-habits';
import type {useChess} from '../use-chess';
import {ChessBoard, MoveInput, MoveList} from './chess-board';

/**
 * Session AK (ADR-036 Q8, lane C): Lichess's daily puzzle on the same board, loaded only on a tap (no key, no token, no
 * cookie). Each move is checked here against Lichess's solution (any mate also solves it, as on Lichess); the reply is
 * played after a short pause, at once with reduced motion or Motion Off. Solving it without "Show the next move" ticks
 * off the habit chosen in Chess, once a day, like a finished game; the Showcase changes nothing.
 */
const sideName = (c: 'white' | 'black') => c === 'white' ? 'White' : 'Black';
export function DailyPuzzle({state, habits}: {state: ReturnType<typeof useChess>; habits: Pick<HabitsStore, 'data' | 'loaded' | 'error' | 'update'>}) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [progress, setProgress] = useState<PuzzleProgress>(startProgress), [hold, setHold] = useState(false), [said, setSaid] = useState<{text: string; tone?: 'good' | 'bad'} | null>(null), [ticked, setTicked] = useState('');
  const timer = useRef<number | undefined>(undefined), tickedFor = useRef<string | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const {settings, showcase} = state;
  useEffect(() => {
    if (!puzzle || !progress.solved || progress.revealed || showcase || tickedFor.current === puzzle.id) return;
    if (!settings.loaded || settings.error || !habits.loaded || habits.error) return;
    tickedFor.current = puzzle.id;
    const item = puzzleCheckIn(habits.data, settings.data, new Date());
    if (!item) return;
    void (async () => {
      try {
        let changed = false;
        await habits.update(data => { const next = applyPuzzleCheckIn(data, item, new Date()); changed = next !== data; return next; });
        if (changed) { await settings.update(s => markApplied(s, item.day, new Date().toISOString())); setTicked('Your chess habit is ticked off for today.'); }
      } catch { setTicked(''); }
    })();
  }, [puzzle, progress.solved, progress.revealed, showcase, settings, habits]);

  async function load() {
    setLoading(true); setError('');
    try { const p = await fetchDailyPuzzle(); setPuzzle(p); setProgress(startProgress()); setSaid({text: `Find the best move for ${sideName(p.color)}.`}); }
    catch (e) { setError(e instanceof Error && e.message ? e.message : 'The puzzle could not be loaded.'); }
    finally { setLoading(false); }
  }
  if (!puzzle) return <section className="chess-block" aria-labelledby="chess-puzzle-title"><h3 id="chess-puzzle-title">Lichess daily puzzle</h3>
    <p>Solve Lichess&apos;s puzzle of the day on this board. Solving it ticks off your chess habit, like a game.</p>
    <div className="chess-actions-row"><button type="button" className="secondary" disabled={loading} onClick={() => void load()}>{loading ? 'Loading…' : 'Load today’s puzzle'}</button></div>
    {error && <p role="alert" className="chess-play-message">{error}</p>}
  </section>;

  const shown = hold ? {...progress, played: progress.played.slice(0, -1)} : progress;
  const position = puzzlePosition(puzzle, shown), lastUci = shown.played.at(-1) ?? puzzle.lastMove;
  const last = lastUci ? {from: parseSquare(lastUci.slice(0, 2))!, to: parseSquare(lastUci.slice(2, 4))!} : null;
  const history = replay(puzzle.fen, shown.played), start = replay(puzzle.fen, []);
  const canMove = !progress.solved && !hold;
  function play(uci: string) {
    if (!puzzle || !canMove) return;
    const before = puzzlePosition(puzzle, progress);
    if (!findUci(before, uci)) return;
    const result = puzzleMove(puzzle, progress, uci);
    setProgress(result.progress);
    if (result.verdict === 'wrong') { setSaid({text: 'Not the move. Try again.', tone: 'bad'}); return; }
    if (result.verdict === 'solved') { setSaid({text: result.progress.mistakes ? 'Solved.' : 'Solved at the first try.', tone: 'good'}); return; }
    setSaid({text: 'Right. Find the next move.', tone: 'good'});
    if (result.reply && motionAllowed()) { setHold(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setHold(false), 450); }
  }
  return <section className="chess-block" aria-labelledby="chess-puzzle-title">
    <h3 id="chess-puzzle-title">Lichess daily puzzle{puzzle.rating ? ` · rated ${puzzle.rating}` : ''}</h3>
    <div className="chess-game-area">
      <ChessBoard position={position} orientation={puzzle.color} last={last} check={inCheck(position)} canMove={canMove} onMove={play}
        label={`Puzzle board, ${puzzle.color} at the bottom. Arrow keys move, Enter selects a piece and then its square.`} />
      <div className="chess-side">
        <p className="chess-status" role="status" aria-live="polite" data-tone={said?.tone}>{said?.text}{progress.solved && progress.revealed ? ' The answer was shown, so it does not count.' : ''}</p>
        {ticked && <p role="status" className="chess-play-message">{ticked}</p>}
        <MoveInput position={position} canMove={canMove} onMove={play} id="chess-puzzle-move" />
        <h4 className="sr-only">Moves</h4>
        <MoveList sans={history?.sans ?? []} whiteStarts={start?.position.turn !== 'b'} firstMove={start?.position.fullmove ?? 1} />
        <div className="chess-actions-row">
          {!progress.solved && <button type="button" className="quiet" onClick={() => { const next = revealNext(puzzle, progress); setHold(false); setProgress(next); setSaid({text: next.solved ? 'That was the whole answer.' : 'That was the next move. Find the one after.'}); }}>Show the next move</button>}
          <button type="button" className="quiet" onClick={() => { setHold(false); setProgress(startProgress()); setSaid({text: `Find the best move for ${sideName(puzzle.color)}.`}); }}>Start again</button>
        </div>
        <a className="text-link" href={puzzle.url} target="_blank" rel="noopener noreferrer">Open this puzzle on Lichess</a>
        <p className="fine">Puzzle by Lichess (CC0). Your moves are checked on this device; nothing is sent back.</p>
      </div>
    </div>
  </section>;
}
