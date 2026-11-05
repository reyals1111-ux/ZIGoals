'use client';
import {useEffect, useRef, useState} from 'react';
import {fetchDailyPuzzle, puzzleMove, puzzlePosition, readPuzzleProgress, revealNext, savePuzzleProgress, startProgress, type DailyPuzzle as Puzzle, type PuzzleProgress} from '../../../lib/chess/puzzle';
import {getAppStorage} from '../../../lib/showcase-storage';
import {findUci, inCheck, parseSquare, replay} from '../../../lib/chess/rules';
import {applyPuzzleCheckIn, puzzleCheckIn} from '../../../lib/skills/chess/puzzle';
import {markApplied} from '../../../lib/skills/chess/engine';
import {motionAllowed} from '../../zigi/motion';
import type {HabitsStore} from '../../habits/use-habits';
import type {useChess} from '../use-chess';
import {ChessBoard, MoveInput, MoveList} from './chess-board';
import {puzzleLogSummary, readPuzzleLog, savePuzzleLog, withPuzzle, type PuzzleLog} from '../../../lib/chess/puzzle-log';
import {localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';

/**
 * Session AK (ADR-036 Q8, lane C): Lichess's daily puzzle on the same board, loaded only on a tap (no key, no token, no
 * cookie). Each move is checked here against Lichess's solution (any mate also solves it, as on Lichess); the reply is
 * played after a short pause, at once with reduced motion or Motion Off. Solving it without "Show the next move" ticks
 * off the habit chosen in Chess, once a day, like a finished game; the Showcase changes nothing.
 */
const sideName = (c: 'white' | 'black') => c === 'white' ? 'White' : 'Black';
const store = () => { try { return getAppStorage(); } catch { return null; } };
export function DailyPuzzle({state, habits}: {state: ReturnType<typeof useChess>; habits: Pick<HabitsStore, 'data' | 'loaded' | 'error' | 'update'>}) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [progress, setProgress] = useState<PuzzleProgress>(startProgress), [hold, setHold] = useState(false), [said, setSaid] = useState<{text: string; tone?: 'good' | 'bad'} | null>(null), [ticked, setTicked] = useState('');
  const timer = useRef<number | undefined>(undefined), tickedFor = useRef<string | null>(null);
  // Session AL (C-BN-22, GAP-152): the dated puzzle log, read once on this device.
  const [log, setLog] = useState<PuzzleLog | null>(null);
  useEffect(() => { setLog(readPuzzleLog(store())); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const {settings, showcase} = state;
  // Session AL (BN-183): the moves so far are kept for this puzzle, so a reload brings them back.
  useEffect(() => { if (puzzle) savePuzzleProgress(store(), puzzle, progress); }, [puzzle, progress]);
  // A puzzle's first finish goes into the log with today's date: solved by the person, or with the answer shown. The
  // Showcase writes nothing; playing it again later never changes the entry.
  useEffect(() => {
    if (!puzzle || !progress.solved || showcase || !log) return;
    const next = withPuzzle(log, {day: localDate(), id: puzzle.id, rating: puzzle.rating, result: progress.revealed ? 'shown' : 'solved', mistakes: progress.mistakes});
    if (next !== log) { savePuzzleLog(store(), next); setLog(next); }
  }, [puzzle, progress.solved, progress.revealed, progress.mistakes, showcase, log]);
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
    try {
      const p = await fetchDailyPuzzle(), saved = readPuzzleProgress(store(), p);
      // A puzzle solved before this reload was already counted then; it is not counted again.
      if (saved?.solved) tickedFor.current = p.id;
      setPuzzle(p); setProgress(saved ?? startProgress());
      setSaid({text: saved?.solved ? 'Solved earlier today. Start again to play it once more.' : saved?.played.length ? 'Your moves so far are back. Find the next move.' : `Find the best move for ${sideName(p.color)}.`});
    }
    catch (e) { setError(e instanceof Error && e.message ? e.message : 'The puzzle could not be loaded.'); }
    finally { setLoading(false); }
  }
  if (!puzzle) return <section className="chess-block" aria-labelledby="chess-puzzle-title"><h3 id="chess-puzzle-title">Lichess daily puzzle</h3>
    <p>Solve Lichess&apos;s puzzle of the day on this board. Solving it ticks off your chess habit, like a game.</p>
    <div className="chess-actions-row"><button type="button" className="secondary" disabled={loading} onClick={() => void load()}>{loading ? 'Loading…' : 'Load today’s puzzle'}</button></div>
    {error && <p role="alert" className="chess-play-message">{error}</p>}
    <PuzzleDays log={log} />
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
    <PuzzleDays log={log} />
  </section>;
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
/** Session AL (C-BN-22, GAP-152): how the puzzle days went, from the dated log on this device. */
function PuzzleDays({log}: {log: PuzzleLog | null}) {
  if (!log) return null;
  const today = localDate(), s = puzzleLogSummary(log, today);
  return <div className="chess-puzzle-days" aria-labelledby="chess-puzzle-days-title">
    <h4 id="chess-puzzle-days-title">Your puzzle days</h4>
    {s.recent.length === 0 ? <p className="fine">None yet. Each daily puzzle you finish here is noted with its date, on this device only.</p> : <>
      <p>Last 30 days: solved on {days(s.solved)}{s.shown ? `, finished with the answer shown on ${days(s.shown)}` : ''}.{s.run > 1 ? ` ${s.run} days in a row solved.` : ''}</p>
      <ul className="chess-puzzle-days-list">{s.recent.map(e => <li key={e.id}>{formatDate(e.day)} · {e.result === 'shown' ? 'answer shown' : e.mistakes ? `solved after ${e.mistakes} wrong ${e.mistakes === 1 ? 'try' : 'tries'}` : 'solved at the first try'}{e.rating ? ` · rated ${e.rating}` : ''}</li>)}</ul>
      <p className="fine">Kept on this device only, never synced.</p>
    </>}
  </div>;
}
