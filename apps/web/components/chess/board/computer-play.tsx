'use client';
import {useEffect, useRef, useState} from 'react';
import {END_WORDS, LEVELS, computerMove, gameEnd, type GameEnd, type Level} from '../../../lib/chess/computer';
import {findUci, inCheck, makeMove, startPosition, toSan, type Move, type Position} from '../../../lib/chess/rules';
import {motionAllowed} from '../../zigi/motion';
import {ChessBoard, MoveInput, MoveList} from './chess-board';

/**
 * Session AL fourth pass (BN-182, D-228, C-BN-24): a game against a small computer on this device, with no account and
 * nothing sent. The person chooses a side and a level; each of their moves is answered after a short pause (at once with
 * reduced motion or Motion Off). Take back undoes their last move and the reply; Resign and New game end it. The game is
 * kept for this visit only (nothing stored), and it ticks no habit: a practice game, not a rated one.
 */
type Played = {position: Position; move: Move; san: string};
const sideName = (c: 'w' | 'b') => c === 'w' ? 'White' : 'Black';
export function ComputerPlay() {
  const [side, setSide] = useState<'w' | 'b'>('w'), [level, setLevel] = useState<Level>('easy');
  const [started, setStarted] = useState(false), [moves, setMoves] = useState<Played[]>([]), [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const start = startPosition(), position = moves.at(-1)?.position ?? start;
  const history = [start, ...moves.map(m => m.position)].slice(0, -1);
  const end: GameEnd = resigned ? {over: true, winner: side === 'w' ? 'b' : 'w', why: 'resigned'} : gameEnd(position, history);
  const canMove = started && !end.over && !thinking && position.turn === side;
  const played = (list: Played[], pos: Position, move: Move): Played[] => [...list, {position: makeMove(pos, move), move, san: toSan(pos, move)}];

  // The computer moves whenever it is its turn in a game that is on (also at the start when the person chose Black).
  useEffect(() => {
    if (!started || end.over || position.turn === side) return;
    setThinking(true);
    window.clearTimeout(timer.current);
    const at = moves.length; // a take back or a new game meanwhile drops this reply
    timer.current = window.setTimeout(() => {
      const reply = computerMove(position, level);
      if (reply) setMoves(list => list.length === at ? played(list, position, reply) : list);
      setThinking(false);
    }, motionAllowed() ? 400 : 0);
  }, [started, end.over, position, side, level]); // eslint-disable-line react-hooks/exhaustive-deps -- moves.length follows position; `played` is pure

  function play(uci: string) {
    if (!canMove) return;
    const move = findUci(position, uci);
    if (move) setMoves(list => played(list, position, move));
  }
  function takeBack() {
    window.clearTimeout(timer.current); setThinking(false); setResigned(false);
    // Back to the person's own turn: their last move and the computer's reply go.
    setMoves(list => { let next = list.slice(0, -1); while (next.length && next.at(-1)!.position.turn !== side) next = next.slice(0, -1); return next; });
  }
  function newGame() { window.clearTimeout(timer.current); setThinking(false); setResigned(false); setMoves([]); setStarted(true); }
  const last = moves.at(-1)?.move ?? null;
  const status = !started ? 'Choose a side and a level, then start.' : end.over
    ? `${END_WORDS[end.why]}${end.winner ? end.winner === side ? '. You won.' : '. The computer won.' : '.'}`
    : thinking ? 'The computer is thinking…' : `Your move (${sideName(side)})${inCheck(position) ? ': you are in check' : ''}.`;
  return <section className="chess-block chess-computer" aria-labelledby="chess-computer-title">
    <h3 id="chess-computer-title">Play the computer, on this device</h3>
    <p>A practice game with no account and nothing sent: a small computer opponent written into ZIGoals, not an engine. It ticks no habit and the game is kept for this visit only.</p>
    {!started ? <form className="chess-computer-setup" onSubmit={e => { e.preventDefault(); newGame(); }}>
      <fieldset><legend>You play</legend>
        {(['w', 'b'] as const).map(c => <label key={c} className="checkbox"><input type="radio" name="chess-computer-side" checked={side === c} onChange={() => setSide(c)}/><span>{sideName(c)}{c === 'w' ? ' (you move first)' : ''}</span></label>)}
      </fieldset>
      <fieldset><legend>Level</legend>
        {LEVELS.map(([id, label, note]) => <label key={id} className="checkbox"><input type="radio" name="chess-computer-level" checked={level === id} onChange={() => setLevel(id)}/><span>{label} · {note}</span></label>)}
      </fieldset>
      <button type="submit" className="secondary">Start the game</button>
    </form> : <div className="chess-game-area">
      <ChessBoard position={position} orientation={side === 'w' ? 'white' : 'black'} last={last ? {from: last.from, to: last.to} : null} check={inCheck(position)} canMove={canMove} onMove={play}
        label={`Board against the computer, ${side === 'w' ? 'white' : 'black'} at the bottom. Arrow keys move, Enter selects a piece and then its square.`}/>
      <div className="chess-side">
        <p className="chess-status" role="status" aria-live="polite">{status}</p>
        <MoveInput position={position} canMove={canMove} onMove={play} id="chess-computer-move"/>
        <h4 className="sr-only">Moves</h4>
        <MoveList sans={moves.map(m => m.san)} whiteStarts firstMove={1}/>
        <div className="chess-actions-row">
          <button type="button" className="quiet" disabled={!moves.some(m => m.position.turn !== side) || thinking} onClick={takeBack}>Take back my move</button>
          {!end.over && <button type="button" className="quiet" onClick={() => { window.clearTimeout(timer.current); setThinking(false); setResigned(true); }}>Resign</button>}
          <button type="button" className="quiet" onClick={newGame}>New game</button>
          <button type="button" className="quiet" onClick={() => { window.clearTimeout(timer.current); setThinking(false); setResigned(false); setMoves([]); setStarted(false); }}>Change side or level</button>
        </div>
        <p className="fine">Level: {LEVELS.find(([id]) => id === level)![1]}. Every move is checked on this device by the rules of chess.</p>
      </div>
    </div>}
  </section>;
}
