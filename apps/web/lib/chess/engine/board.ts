/**
 * Session AV lane 2 (roadmap, BL-10; GAP-131): ZIGoals' own small chess engine, its board and move generator. No
 * dependency, nothing sent: it runs in a Web Worker the Play panel starts only when a game against it begins
 * (engine/worker.ts). This file is the fast part the search needs: a 0x88 board in an Int8Array, moves as integers,
 * make and unmake in place, Zobrist keys for repetition and the transposition table, and the rules — castling, en
 * passant, promotion, check, checkmate, stalemate, the fifty-move rule, threefold repetition and bare material. The
 * app's own rules module (lib/chess/rules.ts) stays the board's authority; the two agree on perft (engine.test.ts).
 *
 * Squares are 0x88 (a1 = 0, h1 = 7, a8 = 0x70, h8 = 0x77). Pieces: 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen, 6 king;
 * white positive, black negative. A move: from | to << 7 | promotion type << 14 | flags << 17.
 */
export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
export const WHITE = 1, BLACK = -1;
export const F_CAPTURE = 1, F_DOUBLE = 2, F_EP = 4, F_CASTLE = 8, F_PROMO = 16;
export const moveFrom = (m: number) => m & 127, moveTo = (m: number) => (m >> 7) & 127, movePromo = (m: number) => (m >> 14) & 7, moveFlags = (m: number) => m >> 17;
const encode = (from: number, to: number, promo: number, flags: number) => from | (to << 7) | (promo << 14) | (flags << 17);
const N_STEPS = [33, 31, 18, 14, -33, -31, -18, -14], K_STEPS = [1, -1, 16, -16, 17, 15, -17, -15], B_STEPS = [17, 15, -17, -15], R_STEPS = [1, -1, 16, -16];
const LETTERS = ' pnbrqk';
/** The castling rights a square's move or capture takes away (bits: 1 white king side, 2 white queen side, 4 black king side, 8 black queen side). */
const CASTLE_LOSS = new Int8Array(128);
CASTLE_LOSS[0x00] = 2; CASTLE_LOSS[0x04] = 3; CASTLE_LOSS[0x07] = 1; CASTLE_LOSS[0x70] = 8; CASTLE_LOSS[0x74] = 12; CASTLE_LOSS[0x77] = 4;
export const onBoard = (sq: number) => (sq & 0x88) === 0;
export const to64 = (sq: number) => (sq >> 4) * 8 + (sq & 7);
export const from64 = (i: number) => (i >> 3) * 16 + (i & 7);
export const sqName = (sq: number) => `${'abcdefgh'[sq & 7]}${(sq >> 4) + 1}`;

// Zobrist keys from a fixed seed (xorshift32), two 32-bit halves: a position's key is the same in every run and tab.
let seed = 0x9e3779b9;
const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const Z_PIECE_LO = new Int32Array(13 * 128), Z_PIECE_HI = new Int32Array(13 * 128);
for (let i = 0; i < Z_PIECE_LO.length; i++) { Z_PIECE_LO[i] = rand(); Z_PIECE_HI[i] = rand(); }
const Z_SIDE_LO = rand(), Z_SIDE_HI = rand();
const Z_CASTLE_LO = Int32Array.from({length: 16}, rand), Z_CASTLE_HI = Int32Array.from({length: 16}, rand);
const Z_EP_LO = Int32Array.from({length: 8}, rand), Z_EP_HI = Int32Array.from({length: 8}, rand);
const zi = (piece: number, sq: number) => (piece + 6) * 128 + sq;

export class Board {
  readonly sq = new Int8Array(128);
  side = WHITE; castle = 0; ep = -1; halfmove = 0; fullmove = 1;
  kings = [0x04, 0x74]; // white, black
  lo = 0; hi = 0;
  /** Keys of every position so far (the game's and the search path's), for repetition. */
  readonly keys: number[] = [];
  private readonly undo: number[] = [];

  static fromFen(fen: string): Board | null {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return null;
    const b = new Board(), ranks = parts[0]!.split('/');
    if (ranks.length !== 8) return null;
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of ranks[7 - r]!) {
        if (/\d/.test(ch)) { f += Number(ch); continue; }
        const type = LETTERS.indexOf(ch.toLowerCase());
        if (type < 1 || f > 7) return null;
        const piece = ch === ch.toUpperCase() ? type : -type;
        b.sq[r * 16 + f] = piece;
        if (type === KING) b.kings[piece > 0 ? 0 : 1] = r * 16 + f;
        f++;
      }
      if (f !== 8) return null;
    }
    b.side = parts[1] === 'b' ? BLACK : WHITE;
    b.castle = (parts[2]!.includes('K') ? 1 : 0) | (parts[2]!.includes('Q') ? 2 : 0) | (parts[2]!.includes('k') ? 4 : 0) | (parts[2]!.includes('q') ? 8 : 0);
    b.ep = /^[a-h][36]$/.test(parts[3]!) ? (Number(parts[3]![1]) - 1) * 16 + parts[3]!.charCodeAt(0) - 97 : -1;
    b.halfmove = Number(parts[4] ?? 0) || 0; b.fullmove = Number(parts[5] ?? 1) || 1;
    b.rehash(); b.keys.push(b.key());
    return b;
  }
  /** The board's placement, side, castling and en passant square as a FEN (move counters too). */
  toFen(): string {
    const rows: string[] = [];
    for (let r = 7; r >= 0; r--) {
      let row = '', empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.sq[r * 16 + f]!;
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        const ch = LETTERS[Math.abs(p)]!; row += p > 0 ? ch.toUpperCase() : ch;
      }
      rows.push(row + (empty ? empty : ''));
    }
    const c = `${this.castle & 1 ? 'K' : ''}${this.castle & 2 ? 'Q' : ''}${this.castle & 4 ? 'k' : ''}${this.castle & 8 ? 'q' : ''}` || '-';
    return `${rows.join('/')} ${this.side === WHITE ? 'w' : 'b'} ${c} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.halfmove} ${this.fullmove}`;
  }
  private rehash(): void {
    let lo = 0, hi = 0;
    for (let s = 0; s < 128; s++) { if (!onBoard(s) || !this.sq[s]) continue; lo ^= Z_PIECE_LO[zi(this.sq[s]!, s)]!; hi ^= Z_PIECE_HI[zi(this.sq[s]!, s)]!; }
    if (this.side === BLACK) { lo ^= Z_SIDE_LO; hi ^= Z_SIDE_HI; }
    lo ^= Z_CASTLE_LO[this.castle]!; hi ^= Z_CASTLE_HI[this.castle]!;
    if (this.ep >= 0) { lo ^= Z_EP_LO[this.ep & 7]!; hi ^= Z_EP_HI[this.ep & 7]!; }
    this.lo = lo; this.hi = hi;
  }
  /** A 53-bit number that names the position (placement, side, castling, en passant). */
  key(): number { return (this.hi >>> 0) * 2097152 + ((this.lo >>> 0) & 0x1fffff); }

  /** Whether `sq` is attacked by `by` (WHITE or BLACK). */
  attacked(sq: number, by: number): boolean {
    const b = this.sq;
    // Pawns: a white pawn on s attacks s + 15 and s + 17.
    if (by === WHITE) { if ((onBoard(sq - 15) && b[sq - 15] === PAWN) || (onBoard(sq - 17) && b[sq - 17] === PAWN)) return true; }
    else if ((onBoard(sq + 15) && b[sq + 15] === -PAWN) || (onBoard(sq + 17) && b[sq + 17] === -PAWN)) return true;
    for (const d of N_STEPS) { const t = sq + d; if (onBoard(t) && b[t] === KNIGHT * by) return true; }
    for (const d of K_STEPS) { const t = sq + d; if (onBoard(t) && b[t] === KING * by) return true; }
    for (const d of B_STEPS) for (let t = sq + d; onBoard(t); t += d) { const p = b[t]!; if (p) { if (p === BISHOP * by || p === QUEEN * by) return true; break; } }
    for (const d of R_STEPS) for (let t = sq + d; onBoard(t); t += d) { const p = b[t]!; if (p) { if (p === ROOK * by || p === QUEEN * by) return true; break; } }
    return false;
  }
  inCheck(side = this.side): boolean { return this.attacked(this.kings[side === WHITE ? 0 : 1]!, -side); }

  /** Pseudo-legal moves (castling already checks the squares the king crosses); `noisy` gives captures and promotions only. */
  generate(noisy = false): number[] {
    const out: number[] = [], b = this.sq, us = this.side;
    for (let from = 0; from < 128; from++) {
      if (!onBoard(from)) { from += 7; continue; }
      const p = b[from]!;
      if (!p || (p > 0 ? WHITE : BLACK) !== us) continue;
      const type = p * us;
      if (type === PAWN) {
        const fwd = 16 * us, last = us === WHITE ? 7 : 0, startRank = us === WHITE ? 1 : 6, one = from + fwd;
        const push = (to: number, flags: number) => { if ((to >> 4) === last) for (const promo of [QUEEN, KNIGHT, ROOK, BISHOP]) out.push(encode(from, to, promo, flags | F_PROMO)); else if (!noisy || flags & F_CAPTURE) out.push(encode(from, to, 0, flags)); };
        if (onBoard(one) && !b[one]) { push(one, 0); if (!noisy && (from >> 4) === startRank && !b[one + fwd]) out.push(encode(from, one + fwd, 0, F_DOUBLE)); }
        for (const side of [fwd - 1, fwd + 1]) {
          const to = from + side; if (!onBoard(to)) continue;
          if (b[to]! * us < 0) push(to, F_CAPTURE);
          else if (to === this.ep) out.push(encode(from, to, 0, F_CAPTURE | F_EP));
        }
        continue;
      }
      if (type === KNIGHT || type === KING) {
        for (const d of type === KNIGHT ? N_STEPS : K_STEPS) {
          const to = from + d; if (!onBoard(to)) continue;
          const t = b[to]!;
          if (t * us > 0) continue;
          if (t) out.push(encode(from, to, 0, F_CAPTURE)); else if (!noisy) out.push(encode(from, to, 0, 0));
        }
        if (type === KING && !noisy) {
          const home = us === WHITE ? 0x04 : 0x74, ks = us === WHITE ? 1 : 4, qs = us === WHITE ? 2 : 8;
          if (from === home && !this.attacked(home, -us)) {
            if (this.castle & ks && b[home + 3] === ROOK * us && !b[home + 1] && !b[home + 2] && !this.attacked(home + 1, -us) && !this.attacked(home + 2, -us)) out.push(encode(home, home + 2, 0, F_CASTLE));
            if (this.castle & qs && b[home - 4] === ROOK * us && !b[home - 1] && !b[home - 2] && !b[home - 3] && !this.attacked(home - 1, -us) && !this.attacked(home - 2, -us)) out.push(encode(home, home - 2, 0, F_CASTLE));
          }
        }
        continue;
      }
      const steps = type === BISHOP ? B_STEPS : type === ROOK ? R_STEPS : K_STEPS;
      for (const d of steps) for (let to = from + d; onBoard(to); to += d) {
        const t = b[to]!;
        if (!t) { if (!noisy) out.push(encode(from, to, 0, 0)); continue; }
        if (t * us < 0) out.push(encode(from, to, 0, F_CAPTURE));
        break;
      }
    }
    return out;
  }
  /** The piece a move takes (the pawn behind for en passant), 0 for none. */
  captured(m: number): number { const f = moveFlags(m); return f & F_EP ? -this.side * PAWN : f & F_CAPTURE ? this.sq[moveTo(m)]! : 0; }

  private toggle(piece: number, s: number): void { const i = zi(piece, s); this.lo ^= Z_PIECE_LO[i]!; this.hi ^= Z_PIECE_HI[i]!; }
  /** Plays a pseudo-legal move in place; false (and nothing changed) when it would leave the mover's king attacked. */
  make(m: number): boolean {
    const b = this.sq, from = moveFrom(m), to = moveTo(m), flags = moveFlags(m), us = this.side, piece = b[from]!;
    const capSq = flags & F_EP ? to - 16 * us : to, cap = flags & F_CAPTURE ? b[capSq]! : 0;
    this.undo.push(m, cap, this.castle, this.ep, this.halfmove, this.lo, this.hi);
    this.toggle(piece, from); b[from] = 0;
    if (cap) { this.toggle(cap, capSq); b[capSq] = 0; }
    const placed = flags & F_PROMO ? movePromo(m) * us : piece;
    this.toggle(placed, to); b[to] = placed;
    if (flags & F_CASTLE) { const [rf, rt] = to > from ? [from + 3, from + 1] : [from - 4, from - 1]; this.toggle(b[rf]!, rf); this.toggle(b[rf]!, rt); b[rt] = b[rf]!; b[rf] = 0; }
    if (piece * us === KING) this.kings[us === WHITE ? 0 : 1] = to;
    this.lo ^= Z_CASTLE_LO[this.castle]!; this.hi ^= Z_CASTLE_HI[this.castle]!;
    this.castle &= ~(CASTLE_LOSS[from]! | CASTLE_LOSS[to]!);
    this.lo ^= Z_CASTLE_LO[this.castle]!; this.hi ^= Z_CASTLE_HI[this.castle]!;
    if (this.ep >= 0) { this.lo ^= Z_EP_LO[this.ep & 7]!; this.hi ^= Z_EP_HI[this.ep & 7]!; }
    this.ep = flags & F_DOUBLE ? from + 16 * us : -1;
    if (this.ep >= 0) { this.lo ^= Z_EP_LO[this.ep & 7]!; this.hi ^= Z_EP_HI[this.ep & 7]!; }
    this.halfmove = piece * us === PAWN || cap ? 0 : this.halfmove + 1;
    if (us === BLACK) this.fullmove++;
    this.side = -us; this.lo ^= Z_SIDE_LO; this.hi ^= Z_SIDE_HI;
    this.keys.push(this.key());
    if (this.attacked(this.kings[us === WHITE ? 0 : 1]!, -us)) { this.unmake(); return false; }
    return true;
  }
  /** Takes back the last move made. */
  unmake(): void {
    const u = this.undo, hi = u.pop()!, lo = u.pop()!, halfmove = u.pop()!, ep = u.pop()!, castle = u.pop()!, cap = u.pop()!, m = u.pop()!;
    this.keys.pop();
    const b = this.sq, from = moveFrom(m), to = moveTo(m), flags = moveFlags(m), us = -this.side;
    const placed = b[to]!, piece = flags & F_PROMO ? PAWN * us : placed;
    b[from] = piece; b[to] = 0;
    if (cap) b[flags & F_EP ? to - 16 * us : to] = cap;
    if (flags & F_CASTLE) { const [rf, rt] = to > from ? [from + 3, from + 1] : [from - 4, from - 1]; b[rf] = b[rt]!; b[rt] = 0; }
    if (piece * us === KING) this.kings[us === WHITE ? 0 : 1] = from;
    this.side = us; this.castle = castle; this.ep = ep; this.halfmove = halfmove; this.lo = lo; this.hi = hi;
    if (us === BLACK) this.fullmove--;
  }
  /** The legal moves here. */
  legal(): number[] { return this.generate().filter(m => { if (!this.make(m)) return false; this.unmake(); return true; }); }
  /** How often the current position has stood so far (1 = only now). */
  repetitions(): number { const k = this.keys[this.keys.length - 1]!; let n = 0; for (let i = this.keys.length - 1; i >= 0 && i >= this.keys.length - 1 - this.halfmove; i -= 2) if (this.keys[i] === k) n++; return n; }
  /** Neither side can checkmate: bare kings, or one knight or one bishop beside them. */
  bareMaterial(): boolean {
    let minors = 0;
    for (let s = 0; s < 128; s++) { if (!onBoard(s)) { s += 7; continue; } const t = Math.abs(this.sq[s]!); if (!t || t === KING) continue; if (t === KNIGHT || t === BISHOP) minors++; else return false; }
    return minors <= 1;
  }
}

export function perft(b: Board, depth: number): number {
  if (depth === 0) return 1;
  let n = 0;
  for (const m of b.generate()) { if (!b.make(m)) continue; n += depth === 1 ? 1 : perft(b, depth - 1); b.unmake(); }
  return n;
}
export type Status = 'checkmate' | 'stalemate' | 'fifty-move' | 'repetition' | 'material' | null;
/** How the game stands for the side to move: over and why, or null while it goes on. */
export function status(b: Board): Status {
  if (!b.legal().length) return b.inCheck() ? 'checkmate' : 'stalemate';
  if (b.halfmove >= 100) return 'fifty-move';
  if (b.repetitions() >= 3) return 'repetition';
  if (b.bareMaterial()) return 'material';
  return null;
}
export const moveUci = (m: number) => `${sqName(moveFrom(m))}${sqName(moveTo(m))}${movePromo(m) ? ' pnbrq'[movePromo(m)] : ''}`;
/** The legal move a UCI string names, or 0. */
export function findMove(b: Board, uci: string): number { return b.legal().find(m => moveUci(m) === uci) ?? 0; }
/** A board from a start FEN and the game's moves so far (UCI), every position on the way counted for repetition. */
export function boardFrom(fen: string, uciMoves: readonly string[]): Board | null {
  const b = Board.fromFen(fen); if (!b) return null;
  for (const uci of uciMoves) { const m = findMove(b, uci); if (!m || !b.make(m)) return null; }
  return b;
}
