'use client';
import {useEffect, useRef, useState} from 'react';
import {END_WORDS, gameEnd, type GameEnd} from '../../../lib/chess/computer';
import {findUci, inCheck, makeMove, START_FEN, startPosition, toSan, toUci, type Move, type Position} from '../../../lib/chess/rules';
import {ENGINE_LEVELS, levelLabel, type EngineLevel} from '../../../lib/chess/engine/levels';
import type {Engine} from '../../../lib/chess/engine/client';
import {CHESS_COMPUTER, recordComputerResult, saveComputerGame, tallyOf, type Tally} from '../../../lib/chess/computer-record';
import {useDeviceRecord} from '../../ai/use-device-record';
import {isShowcase} from '../../../lib/showcase-storage';
import {motionAllowed} from '../../zigi/motion';
import {ChessBoard, MoveInput, MoveList} from './chess-board';

/**
 * Session AL fourth pass (BN-182, D-228, C-BN-24): a game against the computer on this device, with no account and
 * nothing sent. Session AV lane 2 (roadmap, BL-10; GAP-131): the opponent is now ZIGoals' own chess engine
 * (lib/chess/engine: its own move generator, an alpha-beta search and a simple evaluation) in a Web Worker started only
 * when a game begins, so the page never waits on it; three levels by depth and time. The game in progress is kept on
 * this device and can be continued; each level counts wins, losses and draws. Take back undoes the person's last move
 * and the reply; Resign and New game end it. Lichess play is unchanged.
 * Session AW (showcase): in the Showcase the results by level are its fictional examples, and say so.
 */
type Played = {position: Position; move: Move; san: string};
const sideName = (c: 'w' | 'b') => c === 'w' ? 'White' : 'Black';
const replayed = (ucis: readonly string[]): Played[] | null => {
  const out: Played[] = []; let pos = startPosition();
  for (const uci of ucis) { const move = findUci(pos, uci); if (!move) return null; out.push({position: makeMove(pos, move), move, san: toSan(pos, move)}); pos = out.at(-1)!.position; }
  return out;
};
const tallyWords = (t: Tally) => `${t.won} won · ${t.lost} lost · ${t.drawn} drawn`;
export function ComputerPlay() {
  const record = useDeviceRecord(CHESS_COMPUTER);
  const [side, setSide] = useState<'w' | 'b'>('w'), [level, setLevel] = useState<EngineLevel>('easy');
  const [started, setStarted] = useState(false), [moves, setMoves] = useState<Played[]>([]), [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false), [looked, setLooked] = useState<number | null>(null), [problem, setProblem] = useState('');
  const engine = useRef<Engine | null>(null), startedAt = useRef(new Date().toISOString()), counted = useRef<string | null>(null), ask = useRef(0), board = useRef<HTMLDivElement>(null), startButton = useRef<HTMLButtonElement>(null);
  useEffect(() => () => { engine.current?.close(); engine.current = null; }, []);
  const start = startPosition(), position = moves.at(-1)?.position ?? start;
  const history = [start, ...moves.map(m => m.position)].slice(0, -1);
  const end: GameEnd = resigned ? {over: true, winner: side === 'w' ? 'b' : 'w', why: 'resigned'} : gameEnd(position, history);
  const canMove = started && !end.over && !thinking && position.turn === side;
  const played = (list: Played[], pos: Position, move: Move): Played[] => [...list, {position: makeMove(pos, move), move, san: toSan(pos, move)}];
  const kept = record.loaded ? record.data.game : undefined, keptGame = kept ? replayed(kept.moves) : null;
  // The game in progress is kept on this device after every move (a finished game is counted and cleared below).
  useEffect(() => {
    if (!started || end.over) return;
    try { record.update(r => saveComputerGame(r, {side, level, moves: moves.map(m => toUci(m.move)), startedAt: startedAt.current})); } catch { /* storage full or blocked: the game goes on, unsaved */ }
  }, [moves, started]); // eslint-disable-line react-hooks/exhaustive-deps -- saved when the moves change

  // The engine moves whenever it is its turn in a game that is on (also at the start when the person chose Black).
  useEffect(() => {
    if (!started || end.over || position.turn === side) return;
    const id = ++ask.current, at = moves.length, ucis = moves.map(m => toUci(m.move)), from = performance.now();
    setThinking(true); setProblem('');
    void (async () => {
      try {
        engine.current ??= (await import('../../../lib/chess/engine/client')).createEngine();
        const reply = await engine.current.move(START_FEN, ucis, level);
        // A short pause, so a quick reply does not land before the person sees their own move (none with less motion).
        const wait = motionAllowed() ? Math.max(0, 400 - (performance.now() - from)) : 0;
        if (wait) await new Promise(r => setTimeout(r, wait));
        if (id !== ask.current) return; // a take back, a new game or a resign meanwhile
        const move = findUci(position, reply.uci);
        if (!move) { setProblem('The computer could not find a move. Start a new game.'); setThinking(false); return; }
        setLooked(reply.depth);
        setMoves(list => list.length === at ? played(list, position, move) : list);
      } catch (e) {
        if (id === ask.current && !(e instanceof Error && e.message === 'stopped')) setProblem('The computer could not answer here. Try New game.');
      } finally { if (id === ask.current) setThinking(false); }
    })();
  }, [started, end.over, position, side, level]); // eslint-disable-line react-hooks/exhaustive-deps -- moves follow position; `played` is pure

  // A finished game counts once at its level, and the kept game is cleared.
  useEffect(() => {
    if (!started || !end.over || counted.current === startedAt.current) return;
    counted.current = startedAt.current;
    const result = end.winner === null ? 'drawn' : end.winner === side ? 'won' : 'lost';
    try { record.update(r => recordComputerResult(r, level, result)); } catch { /* not counted: storage refused */ }
  }, [started, end.over]); // eslint-disable-line react-hooks/exhaustive-deps -- counted once per game

  const stopThinking = () => { ask.current++; setThinking(false); };
  function play(uci: string) {
    if (!canMove) return;
    const move = findUci(position, uci);
    if (move) setMoves(list => played(list, position, move));
  }
  function takeBack() {
    stopThinking(); setResigned(false);
    // Back to the person's own turn: their last move and the computer's reply go.
    setMoves(list => { let next = list.slice(0, -1); while (next.length && next.at(-1)!.position.turn !== side) next = next.slice(0, -1); return next; });
  }
  function begin(list: Played[] = [], at = new Date().toISOString()) {
    stopThinking(); setResigned(false); setLooked(null); setProblem('');
    startedAt.current = at; counted.current = null;
    setMoves(list); setStarted(true);
    requestAnimationFrame(() => board.current?.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')?.focus());
  }
  function newGame() { begin(); }
  function continueKept() { if (!kept || !keptGame) return; setSide(kept.side); setLevel(kept.level); begin(keptGame, kept.startedAt); }
  function resign() { stopThinking(); setResigned(true); }
  function leave() { stopThinking(); engine.current?.close(); engine.current = null; setResigned(false); setMoves([]); setStarted(false); requestAnimationFrame(() => startButton.current?.focus()); }

  const last = moves.at(-1)?.move ?? null, tally = record.loaded ? tallyOf(record.data, level) : null;
  const status = !started ? 'Choose a side and a level, then start.' : problem ? problem : end.over
    ? `${END_WORDS[end.why]}${end.winner ? end.winner === side ? '. You won.' : '. The computer won.' : '.'}`
    : thinking ? `The computer is thinking (${levelLabel(level)})…` : `Your move (${sideName(side)})${inCheck(position) ? ': you are in check' : ''}.`;
  return <section className="chess-block chess-computer" aria-labelledby="chess-computer-title">
    <h3 id="chess-computer-title">Play the computer, on this device</h3>
    <p>A practice game with no account and nothing sent: ZIGoals’ own small chess engine, running in this browser. It ticks no habit. Your game is kept on this device, so you can come back to it.</p>
    {!started ? <>
      {kept && keptGame && <div className="chess-computer-resume" role="group" aria-labelledby="chess-computer-resume">
        <p id="chess-computer-resume">A game is waiting: you play {sideName(kept.side)}, {levelLabel(kept.level)}, {kept.moves.length ? `${Math.ceil(kept.moves.length / 2)} ${Math.ceil(kept.moves.length / 2) === 1 ? 'move' : 'moves'} in` : 'not started yet'}.</p>
        <button type="button" className="secondary" onClick={continueKept}>Continue the game</button>
      </div>}
      <form className="chess-computer-setup" onSubmit={e => { e.preventDefault(); newGame(); }}>
        <fieldset><legend>You play</legend>
          {(['w', 'b'] as const).map(c => <label key={c} className="checkbox"><input type="radio" name="chess-computer-side" checked={side === c} onChange={() => setSide(c)}/><span>{sideName(c)}{c === 'w' ? ' (you move first)' : ''}</span></label>)}
        </fieldset>
        <fieldset><legend>Level</legend>
          {ENGINE_LEVELS.map(l => <label key={l.id} className="checkbox"><input type="radio" name="chess-computer-level" checked={level === l.id} onChange={() => setLevel(l.id)}/><span>{l.label} · {l.note}</span></label>)}
        </fieldset>
        <button ref={startButton} type="submit" className="secondary">{kept ? 'Start a new game' : 'Start the game'}</button>
        {tally && (tally.won + tally.lost + tally.drawn > 0) && <p className="fine">Against {levelLabel(level)}: {tallyWords(tally)}.{isShowcase() ? ' Showcase: fictional example results.' : ''}</p>}
      </form>
    </> : <div className="chess-game-area" ref={board}>
      <ChessBoard position={position} orientation={side === 'w' ? 'white' : 'black'} last={last ? {from: last.from, to: last.to} : null} check={inCheck(position)} canMove={canMove} onMove={play}
        label={`Board against the computer, ${side === 'w' ? 'white' : 'black'} at the bottom. Arrow keys move, Enter selects a piece and then its square.`}/>
      <div className="chess-side">
        <p className="chess-status" role="status" aria-live="polite">{status}</p>
        <MoveInput position={position} canMove={canMove} onMove={play} id="chess-computer-move"/>
        <h4 className="sr-only">Moves</h4>
        <MoveList sans={moves.map(m => m.san)} whiteStarts firstMove={1}/>
        <div className="chess-actions-row">
          <button type="button" className="quiet" disabled={!moves.some(m => m.position.turn !== side)} onClick={takeBack}>Take back my move</button>
          {!end.over && <button type="button" className="quiet" onClick={resign}>Resign</button>}
          <button type="button" className="quiet" onClick={newGame}>New game</button>
          <button type="button" className="quiet" onClick={leave}>Change side or level</button>
        </div>
        <p className="fine">Level: {levelLabel(level)}{looked ? ` · its last move looked ${looked} ${looked === 1 ? 'move' : 'moves'} ahead` : ''}.{tally ? ` Against ${levelLabel(level)}: ${tallyWords(tally)}.` : ''} Every move is checked on this device by the rules of chess.</p>
      </div>
    </div>}
  </section>;
}
