'use client';
import {useEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {colorOf, FILES, kingSquare, legalMoves, parseMoveText, pieceName, squareName, toUci, type Move, type PieceChar, type Position, type Promotion} from '../../../lib/chess/rules';

/**
 * Session AK (ADR-036 Q8, lane C): the in-app board, hand-written SVG (no images): 8×8 with coordinates, Unicode piece
 * glyphs (text presentation), the last move, check, the selected piece and its legal targets. Over it, an ARIA grid of
 * 64 cells with one tab stop: arrow keys move a cursor (as the board is shown, so up is always away from the person),
 * Home/End go to the row's ends, Enter or Space selects a piece and then its target, Escape lets go; a click or tap does
 * the same. A promotion asks which piece. Legal moves only decide what is offered; the caller sends the move.
 */
export type BoardSide = 'white' | 'black';
const GLYPH: Record<string, string> = {k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'};
const TEXT = '︎';
const PROMOTE: {piece: Promotion; label: string}[] = [{piece: 'q', label: 'Queen'}, {piece: 'r', label: 'Rook'}, {piece: 'b', label: 'Bishop'}, {piece: 'n', label: 'Knight'}];
const squareAt = (row: number, col: number, side: BoardSide) => side === 'white' ? (7 - row) * 8 + col : row * 8 + (7 - col);
const placeOf = (sq: number, side: BoardSide) => side === 'white' ? {row: 7 - (sq >> 3), col: sq & 7} : {row: sq >> 3, col: 7 - (sq & 7)};
const isLight = (sq: number) => ((sq >> 3) + (sq & 7)) % 2 === 1;

export type ChessBoardProps = {
  position: Position; orientation: BoardSide; label: string;
  last?: {from: number; to: number} | null; check?: boolean;
  /** Whether the person may move now (their turn, nothing pending). */
  canMove: boolean; onMove?: (uci: string) => void;
};
export function ChessBoard({position, orientation, label, last = null, check = false, canMove, onMove}: ChessBoardProps) {
  const legal = useMemo(() => canMove ? legalMoves(position) : [], [position, canMove]);
  const [cursor, setCursor] = useState(() => kingSquare(position.board, orientation === 'white' ? 'w' : 'b'));
  const [selected, setSelected] = useState<number | null>(null), [promotion, setPromotion] = useState<{from: number; to: number} | null>(null);
  const [said, setSaid] = useState('');
  const cells = useRef<(HTMLDivElement | null)[]>([]), dialog = useRef<HTMLDialogElement>(null);
  const fen = position.board.join(',') + position.turn;
  useEffect(() => { setSelected(null); setPromotion(null); }, [fen, canMove]);
  useEffect(() => { const d = dialog.current; if (promotion && d && !d.open) d.showModal(); }, [promotion]);
  const targets = useMemo(() => selected === null ? new Set<number>() : new Set(legal.filter(m => m.from === selected).map(m => m.to)), [legal, selected]);
  const describe = (sq: number) => {
    const p = position.board[sq], parts = [squareName(sq), p ? pieceName(p) : 'empty'];
    if (sq === selected) parts.push('selected');
    if (targets.has(sq)) parts.push(p ? 'can be taken' : 'can move here');
    if (last && (sq === last.from || sq === last.to)) parts.push(sq === last.to ? 'last move to' : 'last move from');
    if (check && p && p.toLowerCase() === 'k' && colorOf(p) === position.turn) parts.push('in check');
    return parts.join(', ');
  };
  function send(move: Move) { setSelected(null); setSaid(''); onMove?.(toUci(move)); }
  function to(from: number, target: number) {
    const options = legal.filter(m => m.from === from && m.to === target);
    if (!options.length) return;
    if (options.some(m => m.promotion)) { setPromotion({from, to: target}); return; }
    send(options[0]!);
  }
  function activate(sq: number) {
    setCursor(sq);
    if (!canMove) return;
    if (selected !== null && targets.has(sq)) { to(selected, sq); return; }
    const p = position.board[sq] as PieceChar | null;
    if (sq === selected) { setSelected(null); setSaid('Selection cleared.'); return; }
    if (p && colorOf(p) === position.turn && legal.some(m => m.from === sq)) {
      const n = legal.filter(m => m.from === sq).map(m => m.to);
      setSelected(sq); setSaid(`${pieceName(p)} on ${squareName(sq)} selected. ${new Set(n).size} ${new Set(n).size === 1 ? 'square' : 'squares'} to move to.`);
      return;
    }
    setSelected(null);
    setSaid(p && colorOf(p) === position.turn ? `The ${pieceName(p)} on ${squareName(sq)} cannot move.` : '');
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const {row, col} = placeOf(cursor, orientation);
    let next: {row: number; col: number} | null = null;
    switch (e.key) {
      case 'ArrowUp': next = {row: Math.max(0, row - 1), col}; break;
      case 'ArrowDown': next = {row: Math.min(7, row + 1), col}; break;
      case 'ArrowLeft': next = {row, col: Math.max(0, col - 1)}; break;
      case 'ArrowRight': next = {row, col: Math.min(7, col + 1)}; break;
      case 'Home': next = {row, col: 0}; break;
      case 'End': next = {row, col: 7}; break;
      case 'Enter': case ' ': e.preventDefault(); activate(cursor); return;
      case 'Escape': if (selected !== null) { e.preventDefault(); setSelected(null); setSaid('Selection cleared.'); } return;
      default: return;
    }
    e.preventDefault();
    const sq = squareAt(next.row, next.col, orientation);
    setCursor(sq); cells.current[sq]?.focus();
  }
  const king = check ? kingSquare(position.board, position.turn) : -1;
  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  return <div className="chess-board-wrap">
    <div className="chess-board" data-readonly={canMove ? undefined : ''}>
      <svg viewBox="0 0 800 800" aria-hidden="true" focusable="false">
        {rows.map(row => rows.map(col => { const sq = squareAt(row, col, orientation); return <rect key={`s${sq}`} x={col * 100} y={row * 100} width="100" height="100" className={isLight(sq) ? 'chess-sq-light' : 'chess-sq-dark'} />; }))}
        {last && [last.from, last.to].map(sq => { const {row, col} = placeOf(sq, orientation); return <rect key={`l${sq}`} x={col * 100} y={row * 100} width="100" height="100" className="chess-sq-last" />; })}
        {selected !== null && (() => { const {row, col} = placeOf(selected, orientation); return <rect x={col * 100} y={row * 100} width="100" height="100" className="chess-sq-selected" />; })()}
        {king >= 0 && (() => { const {row, col} = placeOf(king, orientation); return <rect x={col * 100} y={row * 100} width="100" height="100" className="chess-sq-check" rx="50" />; })()}
        {rows.map(i => { const fileSq = squareAt(7, i, orientation), rankSq = squareAt(i, 0, orientation); return <g key={`c${i}`}>
          <text x={i * 100 + 94} y={792} textAnchor="end" className={`chess-coord ${isLight(fileSq) ? 'chess-coord-on-light' : 'chess-coord-on-dark'}`}>{FILES[fileSq & 7]}</text>
          <text x={5} y={i * 100 + 18} className={`chess-coord ${isLight(rankSq) ? 'chess-coord-on-light' : 'chess-coord-on-dark'}`}>{(rankSq >> 3) + 1}</text>
        </g>; })}
        {position.board.map((p, sq) => { if (!p) return null; const {row, col} = placeOf(sq, orientation); return <text key={`p${sq}`} x={col * 100 + 50} y={row * 100 + 54} textAnchor="middle" dominantBaseline="central" className={`chess-piece chess-piece-${colorOf(p)}`}>{GLYPH[p.toLowerCase()]}{TEXT}</text>; })}
        {[...targets].map(sq => { const {row, col} = placeOf(sq, orientation); return position.board[sq] ? <circle key={`t${sq}`} cx={col * 100 + 50} cy={row * 100 + 50} r="44" className="chess-target-ring" /> : <circle key={`t${sq}`} cx={col * 100 + 50} cy={row * 100 + 50} r="14" className="chess-target-dot" />; })}
      </svg>
      <div className="chess-grid" role="grid" aria-label={label} aria-readonly={canMove ? undefined : true} onKeyDown={onKey}>
        {rows.map(row => <div key={row} role="row" className="chess-grid-row">
          {rows.map(col => { const sq = squareAt(row, col, orientation); return <div key={sq} ref={el => { cells.current[sq] = el; }} role="gridcell" className="chess-cell" tabIndex={sq === cursor ? 0 : -1}
            aria-label={describe(sq)} aria-selected={sq === selected} data-square={squareName(sq)} onFocus={() => setCursor(sq)} onClick={() => activate(sq)} />; })}
        </div>)}
      </div>
    </div>
    <p className="sr-only" aria-live="polite">{said}</p>
    {promotion && <dialog ref={dialog} className="chess-promotion" aria-labelledby="chess-promotion-title" onCancel={e => { e.preventDefault(); dialog.current?.close(); setPromotion(null); cells.current[promotion.to]?.focus(); }}>
      <h3 id="chess-promotion-title">Promote the pawn to</h3>
      <div className="actions">{PROMOTE.map(o => <button key={o.piece} type="button" className="secondary" onClick={() => {
        const move = legal.find(m => m.from === promotion.from && m.to === promotion.to && m.promotion === o.piece);
        dialog.current?.close(); setPromotion(null); if (move) send(move); cells.current[promotion.to]?.focus();
      }}><span className="chess-promotion-glyph" aria-hidden="true">{GLYPH[o.piece]}{TEXT}</span>{o.label}</button>)}
        <button type="button" className="quiet" onClick={() => { dialog.current?.close(); setPromotion(null); cells.current[promotion.to]?.focus(); }}>Cancel</button></div>
    </dialog>}
  </div>;
}

/** A move typed as text: UCI (e2e4, e7e8q) or SAN (Nf3, O-O, exd5, e8=Q). */
export function MoveInput({position, canMove, onMove, id}: {position: Position; canMove: boolean; onMove: (uci: string) => void; id: string}) {
  const [error, setError] = useState('');
  return <form className="chess-move-form" aria-label="Type a move" onSubmit={e => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('move') as HTMLInputElement, read = parseMoveText(position, input.value);
    if ('error' in read) { setError(read.error); return; }
    setError(''); input.value = ''; onMove(toUci(read.move));
  }}>
    <label className="field" htmlFor={id}>Type a move (e2e4 or Nf3)<input id={id} name="move" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={12} disabled={!canMove} aria-describedby={error ? `${id}-error` : undefined} /></label>
    <button type="submit" className="secondary" disabled={!canMove}>Play move</button>
    {error && <p id={`${id}-error`} role="alert" className="chess-play-message">{error}</p>}
  </form>;
}

/** The moves as a numbered list of full moves (the start may be Black's move). */
export function MoveList({sans, whiteStarts, firstMove}: {sans: readonly string[]; whiteStarts: boolean; firstMove: number}) {
  const pairs: [string, string | undefined][] = [], list = whiteStarts ? sans : ['…', ...sans];
  for (let i = 0; i < list.length; i += 2) pairs.push([list[i]!, list[i + 1]]);
  if (!sans.length) return <p className="fine">No moves yet.</p>;
  return <ol className="chess-moves" start={firstMove} aria-label="Moves">
    {pairs.map(([w, b], i) => <li key={i}><span>{w}</span>{b && <span>{b}</span>}</li>)}
  </ol>;
}
