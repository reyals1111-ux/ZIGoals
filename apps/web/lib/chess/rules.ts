/**
 * Session AK (ADR-036 Q8, lane C): a small hand-written chess rules module for the in-app board. It only decides what
 * to highlight and what to offer: FEN in and out, pseudo-legal moves filtered by king safety, castling, en passant and
 * promotion, SAN for the move list and for typed moves, and perft for its tests. Lichess's game stream stays the
 * authority: a move Lichess refuses is shown as refused and the board is redrawn from the stream, and a move from the
 * stream this module would not generate is still drawn (`playUci`).
 *
 * Squares are 0–63 with a1 = 0, b1 = 1 … h8 = 63. Pieces are FEN letters: upper case white, lower case black.
 */
export type Color = 'w' | 'b';
export type PieceChar = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Promotion = 'q' | 'r' | 'b' | 'n';
export type Position = {board: (PieceChar | null)[]; turn: Color; castling: string; ep: number | null; halfmove: number; fullmove: number};
export type Move = {from: number; to: number; piece: PieceChar; captured?: PieceChar; promotion?: Promotion; castle?: 'k' | 'q'; enPassant?: true; double?: true};

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FILES = 'abcdefgh';
export const fileOf = (sq: number) => sq & 7;
export const rankOf = (sq: number) => sq >> 3;
export const squareName = (sq: number) => `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
export function parseSquare(name: string): number | null {
  if (!/^[a-h][1-8]$/.test(name)) return null;
  return (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
}
const at = (file: number, rank: number) => file >= 0 && file < 8 && rank >= 0 && rank < 8 ? rank * 8 + file : -1;
export const colorOf = (p: PieceChar): Color => p === p.toUpperCase() ? 'w' : 'b';
const typeOf = (p: PieceChar) => p.toLowerCase() as 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
const as = (type: string, color: Color) => (color === 'w' ? type.toUpperCase() : type.toLowerCase()) as PieceChar;
const other = (c: Color): Color => c === 'w' ? 'b' : 'w';
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] as const;
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const PROMOTIONS: Promotion[] = ['q', 'r', 'b', 'n'];

/** A FEN parsed and checked (8 ranks of 8, one king a side, no pawn on the first or last rank); null when it is not one. */
export function parseFen(fen: string): Position | null {
  if (typeof fen !== 'string' || fen.length > 100) return null;
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4 || parts.length > 6) return null;
  const [placement, turn, castling, ep, half = '0', full = '1'] = parts as [string, string, string, string, string?, string?];
  const ranks = placement.split('/');
  if (ranks.length !== 8) return null;
  const board: (PieceChar | null)[] = new Array(64).fill(null);
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of ranks[r]!) {
      if (/[1-8]/.test(ch)) { file += Number(ch); continue; }
      if (!/[pnbrqkPNBRQK]/.test(ch) || file > 7) return null;
      board[(7 - r) * 8 + file] = ch as PieceChar; file++;
    }
    if (file !== 8) return null;
  }
  if (board.filter(p => p === 'K').length !== 1 || board.filter(p => p === 'k').length !== 1) return null;
  for (let f = 0; f < 8; f++) if (board[f]?.toLowerCase() === 'p' || board[56 + f]?.toLowerCase() === 'p') return null;
  if (turn !== 'w' && turn !== 'b') return null;
  if (!/^(-|K?Q?k?q?)$/.test(castling) || castling === '') return null;
  let epSquare: number | null = null;
  if (ep !== '-') { epSquare = parseSquare(ep); if (epSquare === null || rankOf(epSquare) !== (turn === 'w' ? 5 : 2)) return null; }
  if (!/^\d{1,4}$/.test(half) || !/^\d{1,4}$/.test(full) || Number(full) < 1) return null;
  // Rights without the king and rook on their squares are dropped, as Lichess and chess programs do.
  const rights = (castling === '-' ? '' : castling).split('').filter(c =>
    c === 'K' ? board[4] === 'K' && board[7] === 'R' : c === 'Q' ? board[4] === 'K' && board[0] === 'R' : c === 'k' ? board[60] === 'k' && board[63] === 'r' : board[60] === 'k' && board[56] === 'r').join('');
  return {board, turn, castling: rights, ep: epSquare, halfmove: Number(half), fullmove: Number(full)};
}
export function toFen(pos: Position): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) { const p = pos.board[r * 8 + f]; if (!p) { empty++; continue; } if (empty) { row += empty; empty = 0; } row += p; }
    rows.push(empty ? row + empty : row);
  }
  return `${rows.join('/')} ${pos.turn} ${pos.castling || '-'} ${pos.ep === null ? '-' : squareName(pos.ep)} ${pos.halfmove} ${pos.fullmove}`;
}
export const startPosition = () => parseFen(START_FEN)!;

/** Whether `sq` is attacked by a piece of colour `by`. */
export function attacked(board: readonly (PieceChar | null)[], sq: number, by: Color): boolean {
  const f = fileOf(sq), r = rankOf(sq);
  const pawnRank = by === 'w' ? r - 1 : r + 1, pawn = as('p', by);
  for (const df of [-1, 1]) { const s = at(f + df, pawnRank); if (s >= 0 && board[s] === pawn) return true; }
  const knight = as('n', by), king = as('k', by), bishop = as('b', by), rook = as('r', by), queen = as('q', by);
  for (const [df, dr] of KNIGHT) { const s = at(f + df, r + dr); if (s >= 0 && board[s] === knight) return true; }
  for (const [df, dr] of KING) { const s = at(f + df, r + dr); if (s >= 0 && board[s] === king) return true; }
  for (const [dirs, slider] of [[DIAGONAL, bishop], [STRAIGHT, rook]] as const) {
    for (const [df, dr] of dirs) {
      for (let i = 1; ; i++) {
        const s = at(f + df * i, r + dr * i); if (s < 0) break;
        const p = board[s]; if (!p) continue;
        if (p === slider || p === queen) return true;
        break;
      }
    }
  }
  return false;
}
export const kingSquare = (board: readonly (PieceChar | null)[], color: Color) => board.indexOf(as('k', color));
export const inCheck = (pos: Position) => attacked(pos.board, kingSquare(pos.board, pos.turn), other(pos.turn));

/** Moves that follow how the pieces move, before the king-safety filter (castling already checks the squares it crosses). */
export function pseudoMoves(pos: Position): Move[] {
  const moves: Move[] = [], {board, turn} = pos, them = other(turn);
  const push = (from: number, to: number, extra: Partial<Move> = {}) => { const piece = board[from]!, captured = board[to] ?? undefined; moves.push({from, to, piece, ...(captured ? {captured} : {}), ...extra}); };
  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || colorOf(piece) !== turn) continue;
    const f = fileOf(from), r = rankOf(from), type = typeOf(piece);
    if (type === 'p') {
      const dir = turn === 'w' ? 1 : -1, last = turn === 'w' ? 7 : 0, start = turn === 'w' ? 1 : 6;
      const pawnTo = (to: number, extra: Partial<Move> = {}) => { if (rankOf(to) === last) for (const promotion of PROMOTIONS) push(from, to, {...extra, promotion}); else push(from, to, extra); };
      const one = at(f, r + dir);
      if (one >= 0 && !board[one]) {
        pawnTo(one);
        const two = at(f, r + 2 * dir);
        if (r === start && two >= 0 && !board[two]) push(from, two, {double: true});
      }
      for (const df of [-1, 1]) {
        const to = at(f + df, r + dir); if (to < 0) continue;
        const target = board[to];
        if (target && colorOf(target) === them) pawnTo(to);
        else if (!target && to === pos.ep) moves.push({from, to, piece, captured: as('p', them), enPassant: true});
      }
      continue;
    }
    if (type === 'n' || type === 'k') {
      for (const [df, dr] of type === 'n' ? KNIGHT : KING) {
        const to = at(f + df, r + dr); if (to < 0) continue;
        const target = board[to]; if (!target || colorOf(target) === them) push(from, to);
      }
      if (type === 'k') {
        const home = turn === 'w' ? 4 : 60, rights = turn === 'w' ? ['K', 'Q'] : ['k', 'q'];
        if (from === home && !attacked(board, home, them)) {
          if (pos.castling.includes(rights[0]!) && board[home + 3] === as('r', turn) && !board[home + 1] && !board[home + 2] && !attacked(board, home + 1, them) && !attacked(board, home + 2, them)) push(from, home + 2, {castle: 'k'});
          if (pos.castling.includes(rights[1]!) && board[home - 4] === as('r', turn) && !board[home - 1] && !board[home - 2] && !board[home - 3] && !attacked(board, home - 1, them) && !attacked(board, home - 2, them)) push(from, home - 2, {castle: 'q'});
        }
      }
      continue;
    }
    const dirs = type === 'b' ? DIAGONAL : type === 'r' ? STRAIGHT : [...DIAGONAL, ...STRAIGHT];
    for (const [df, dr] of dirs) {
      for (let i = 1; ; i++) {
        const to = at(f + df * i, r + dr * i); if (to < 0) break;
        const target = board[to];
        if (!target) { push(from, to); continue; }
        if (colorOf(target) === them) push(from, to);
        break;
      }
    }
  }
  return moves;
}
const CORNER_RIGHT: Record<number, string> = {0: 'Q', 7: 'K', 56: 'q', 63: 'k'};
/** The position after a move (any move: legality is not checked here). */
export function makeMove(pos: Position, move: Move): Position {
  const board = pos.board.slice(), color = colorOf(move.piece);
  board[move.from] = null;
  board[move.to] = move.promotion ? as(move.promotion, color) : move.piece;
  if (move.enPassant) board[move.to + (color === 'w' ? -8 : 8)] = null;
  if (move.castle) {
    const home = color === 'w' ? 4 : 60, [rookFrom, rookTo] = move.castle === 'k' ? [home + 3, home + 1] : [home - 4, home - 1];
    board[rookTo] = board[rookFrom]!; board[rookFrom] = null;
  }
  let castling = pos.castling;
  if (typeOf(move.piece) === 'k') castling = castling.replace(color === 'w' ? /[KQ]/g : /[kq]/g, '');
  for (const sq of [move.from, move.to]) if (CORNER_RIGHT[sq]) castling = castling.replace(CORNER_RIGHT[sq]!, '');
  return {
    board, turn: other(pos.turn), castling, ep: move.double ? (move.from + move.to) / 2 : null,
    halfmove: typeOf(move.piece) === 'p' || move.captured ? 0 : pos.halfmove + 1, fullmove: pos.fullmove + (pos.turn === 'b' ? 1 : 0),
  };
}
/** The legal moves: pseudo-legal moves that leave the mover's own king safe. */
export function legalMoves(pos: Position): Move[] {
  return pseudoMoves(pos).filter(m => { const next = makeMove(pos, m); return !attacked(next.board, kingSquare(next.board, pos.turn), next.turn); });
}
/** Leaf nodes of the move tree to `depth` (the standard check of a move generator). */
export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(pos);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(makeMove(pos, m), depth - 1);
  return n;
}
export type Outcome = 'checkmate' | 'stalemate' | null;
export function outcome(pos: Position, legal = legalMoves(pos)): Outcome { return legal.length ? null : inCheck(pos) ? 'checkmate' : 'stalemate'; }

export const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
export const toUci = (m: Pick<Move, 'from' | 'to' | 'promotion'>) => `${squareName(m.from)}${squareName(m.to)}${m.promotion ?? ''}`;
/** The legal move a UCI string names; a king taking its own rook (Lichess's chess960 form, e1h1) is read as castling. */
export function findUci(pos: Position, uci: string, legal = legalMoves(pos)): Move | null {
  if (!UCI.test(uci)) return null;
  const from = parseSquare(uci.slice(0, 2))!, to = parseSquare(uci.slice(2, 4))!, promotion = (uci[4] ?? undefined) as Promotion | undefined;
  const direct = legal.find(m => m.from === from && m.to === to && m.promotion === promotion);
  if (direct) return direct;
  const piece = pos.board[from];
  if (piece && typeOf(piece) === 'k' && pos.board[to] === as('r', colorOf(piece))) return legal.find(m => m.from === from && m.castle === (to > from ? 'k' : 'q')) ?? null;
  return null;
}
/**
 * Plays a UCI move from the authority (Lichess): the legal move when there is one, otherwise the piece is moved as the
 * string says (a king moving two files castles; a pawn moving diagonally onto an empty square takes en passant), so the
 * board always shows what the stream says. Null only when the move cannot be read at all (no piece on its square).
 */
export function playUci(pos: Position, uci: string): {position: Position; move: Move} | null {
  const legal = findUci(pos, uci);
  if (legal) return {position: makeMove(pos, legal), move: legal};
  if (!UCI.test(uci)) return null;
  const from = parseSquare(uci.slice(0, 2))!, to = parseSquare(uci.slice(2, 4))!, piece = pos.board[from];
  if (!piece) return null;
  const type = typeOf(piece), captured = pos.board[to] ?? undefined, move: Move = {from, to, piece, ...(captured ? {captured} : {})};
  if (type === 'k' && Math.abs(fileOf(to) - fileOf(from)) === 2) move.castle = to > from ? 'k' : 'q';
  if (type === 'p' && fileOf(to) !== fileOf(from) && !captured) { move.enPassant = true; move.captured = as('p', other(colorOf(piece))); }
  if (type === 'p' && Math.abs(to - from) === 16) move.double = true;
  if (uci[4]) move.promotion = uci[4] as Promotion;
  return {position: {...makeMove(pos, move), turn: other(colorOf(piece))}, move};
}

/** Standard algebraic notation of a legal move, with + or #. */
export function toSan(pos: Position, move: Move, legal = legalMoves(pos)): string {
  let san: string;
  if (move.castle) san = move.castle === 'k' ? 'O-O' : 'O-O-O';
  else {
    const type = typeOf(move.piece), capture = move.captured ? 'x' : '';
    if (type === 'p') san = `${capture ? FILES[fileOf(move.from)] : ''}${capture}${squareName(move.to)}${move.promotion ? `=${move.promotion.toUpperCase()}` : ''}`;
    else {
      const rivals = legal.filter(m => m.piece === move.piece && m.to === move.to && m.from !== move.from);
      let which = '';
      if (rivals.length) {
        if (!rivals.some(m => fileOf(m.from) === fileOf(move.from))) which = FILES[fileOf(move.from)]!;
        else if (!rivals.some(m => rankOf(m.from) === rankOf(move.from))) which = String(rankOf(move.from) + 1);
        else which = squareName(move.from);
      }
      san = `${type.toUpperCase()}${which}${capture}${squareName(move.to)}`;
    }
  }
  const next = makeMove(pos, move);
  if (inCheck(next)) san += legalMoves(next).length ? '+' : '#';
  return san;
}
const plainSan = (san: string) => san.replace(/[+#!?]+$/, '');
/**
 * A move typed by the person: UCI (e2e4, e7e8q) or SAN (Nf3, exd5, O-O, e8=Q; check marks, "0-0" and a promotion
 * without "=" are accepted). Piece letters are upper case, as SAN writes them, so "b" is always the b-file.
 */
export function parseMoveText(pos: Position, text: string, legal = legalMoves(pos)): {move: Move} | {error: string} {
  const raw = text.trim().replace(/\s+/g, '');
  if (!raw) return {error: 'Type a move, like e2e4 or Nf3.'};
  if (raw.length > 12) return {error: 'That is not a move this board can read.'};
  if (UCI.test(raw.toLowerCase()) && !/^[A-H]/.test(raw)) {
    const uci = raw.toLowerCase(), move = findUci(pos, uci, legal);
    if (move) return {move};
    const needsPromotion = uci.length === 4 && legal.some(m => toUci(m).startsWith(uci) && m.promotion);
    return {error: needsPromotion ? 'Add the piece to promote to, like e7e8q.' : `${uci} is not a legal move here.`};
  }
  let san = plainSan(raw).replace(/0/g, 'O').replace(/e\.p\.$/i, '');
  san = san.replace(/^([a-h](?:x[a-h])?[18])([QRBN])$/, '$1=$2');
  const match = legal.find(m => plainSan(toSan(pos, m, legal)) === san);
  if (match) return {move: match};
  // A piece move written with more of the "from" square than needed (Ng1f3) is still that move.
  const full = /^([NBRQK])([a-h])?([1-8])?x?([a-h][1-8])$/.exec(san);
  if (full) {
    const [, letter, file, rank, to] = full, target = parseSquare(to!);
    const found = legal.filter(m => m.piece.toUpperCase() === letter && m.to === target && (!file || FILES[fileOf(m.from)] === file) && (!rank || String(rankOf(m.from) + 1) === rank));
    if (found.length === 1) return {move: found[0]!};
    if (found.length > 1) return {error: `${raw} could be more than one move; add the square it comes from.`};
  }
  return {error: `${raw} is not a legal move here.`};
}

/** The positions, SAN and last move of a game given as UCI moves from a start FEN (Lichess's "startpos" too). */
export type Replay = {start: Position; position: Position; sans: string[]; last: Move | null; unreadableAt: number | null};
export function replay(initialFen: string, uciMoves: readonly string[]): Replay | null {
  const start = initialFen === 'startpos' || initialFen === '' ? startPosition() : parseFen(initialFen);
  if (!start) return null;
  let position = start, last: Move | null = null;
  const sans: string[] = [];
  for (let i = 0; i < uciMoves.length; i++) {
    const legal = legalMoves(position), found = findUci(position, uciMoves[i]!, legal);
    if (found) { sans.push(toSan(position, found, legal)); position = makeMove(position, found); last = found; continue; }
    const played = playUci(position, uciMoves[i]!);
    if (!played) return {start, position, sans, last, unreadableAt: i};
    sans.push(uciMoves[i]!); position = played.position; last = played.move;
  }
  return {start, position, sans, last, unreadableAt: null};
}
const PIECE_NAME: Record<string, string> = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
export const pieceName = (p: PieceChar) => `${colorOf(p) === 'w' ? 'white' : 'black'} ${PIECE_NAME[typeOf(p)]}`;
