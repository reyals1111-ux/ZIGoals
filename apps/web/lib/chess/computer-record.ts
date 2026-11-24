import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2 (roadmap, BL-10; TIER 3 stored formats, a new additive key `zigoals:chess-computer:v1`): games
 * against ZIGoals' own chess engine on this device — the game in progress, so it can be picked up again, and the
 * results by level. Loose, versioned and bounded; a part that cannot be read is dropped on read, never failing the
 * record. Device only: exported, restored and erased with the account, never synced, never sent. Pure.
 * - `game`: the side the person plays, the level and the moves so far (UCI, from the standard start), when it began;
 * - `tally`: per level, games won, lost and drawn (a resign counts as lost).
 */
export const CHESS_COMPUTER_KEY = 'zigoals:chess-computer:v1';
export const MAX_GAME_MOVES = 600;
const LEVEL = z.enum(['easy', 'medium', 'hard']);
export type ComputerLevel = z.infer<typeof LEVEL>;
const count = z.number().int().min(0).max(1_000_000).catch(0);
const tallySchema = z.looseObject({won: count, lost: count, drawn: count});
export type Tally = {won: number; lost: number; drawn: number};
export const computerGameSchema = z.looseObject({
  side: z.enum(['w', 'b']), level: LEVEL,
  moves: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)).max(MAX_GAME_MOVES),
  startedAt: z.iso.datetime(),
});
export type ComputerGame = z.infer<typeof computerGameSchema>;
export const chessComputerSchema = z.looseObject({
  version: z.literal(1),
  game: computerGameSchema.optional().catch(undefined),
  tally: z.looseObject({easy: tallySchema.optional().catch(undefined), medium: tallySchema.optional().catch(undefined), hard: tallySchema.optional().catch(undefined)}).optional().catch(undefined),
});
export type ChessComputer = z.infer<typeof chessComputerSchema>;
export const emptyChessComputer = (): ChessComputer => ({version: 1});
export const CHESS_COMPUTER: DeviceRecordSpec<ChessComputer> = {key: CHESS_COMPUTER_KEY, schema: chessComputerSchema, empty: emptyChessComputer};

/** Keeps the game in progress (null: none). */
export function saveComputerGame(r: ChessComputer, game: ComputerGame | null): ChessComputer {
  const next: ChessComputer = {...r};
  if (game) next.game = computerGameSchema.parse({...game, moves: game.moves.slice(0, MAX_GAME_MOVES)}); else delete next.game;
  return chessComputerSchema.parse(next);
}
/** Counts a finished game at its level and clears the game in progress. */
export function recordComputerResult(r: ChessComputer, level: ComputerLevel, result: keyof Tally): ChessComputer {
  const at = r.tally?.[level] ?? {won: 0, lost: 0, drawn: 0};
  const next: ChessComputer = {...r, tally: {...r.tally, [level]: {...at, [result]: at[result] + 1}}};
  delete next.game;
  return chessComputerSchema.parse(next);
}
/** A level's results (zeros when none). */
export const tallyOf = (r: ChessComputer, level: ComputerLevel): Tally => ({won: 0, lost: 0, drawn: 0, ...r.tally?.[level]});
/** Every level's results added up. */
export const totalTally = (r: ChessComputer): Tally => (['easy', 'medium', 'hard'] as const).reduce((t, l) => { const x = tallyOf(r, l); return {won: t.won + x.won, lost: t.lost + x.lost, drawn: t.drawn + x.drawn}; }, {won: 0, lost: 0, drawn: 0});
