import {z} from 'zod';
import {CHESS_CACHE_KEY} from '../../w-device-keys';
import type {DeviceRecordSpec} from '../../device-record';

/**
 * Chess, the first skill (Session W Part 14). Two records:
 * - settings v3 `chess` (synced with the account's settings): the usernames the person typed (only the username is ever
 *   sent, to chess.com or Lichess, and only from the Chess page, Today's chess card or "Refresh"), rating goals, the
 *   habit that chess ticks off, and its automatic check-in markers (merged as a union, like Health's);
 * - the device cache `zigoals:chess-cache:v1` (device-only, public data): rating snapshots for the history charts, the
 *   recent games last fetched, and each address's ETag so an unchanged answer costs nothing.
 */
export const CHESS_SITES = ['chesscom', 'lichess'] as const;
export const CHESS_CONTROLS = ['rapid', 'blitz', 'bullet', 'daily', 'classical', 'correspondence', 'puzzle'] as const;
export type ChessSite = typeof CHESS_SITES[number];
export type ChessControl = typeof CHESS_CONTROLS[number];
/** chess.com usernames: 3–25 letters, digits, "_" or "-"; Lichess: 2–30. Checked before anything is sent. */
export const CHESSCOM_USERNAME = /^[A-Za-z0-9_-]{3,25}$/, LICHESS_USERNAME = /^[A-Za-z0-9_-]{2,30}$/;
const instant = z.iso.datetime();
const day = z.iso.date();
export const chessGoalSchema = z.strictObject({
  id: z.uuid(), site: z.enum(CHESS_SITES), control: z.enum(CHESS_CONTROLS), target: z.number().int().min(100).max(4000), by: day.optional(),
  status: z.enum(['active', 'done', 'closed']), createdAt: instant, updatedAt: instant,
});
export type ChessGoal = z.infer<typeof chessGoalSchema>;
export const chessAppliedSchema = z.strictObject({date: day, appliedAt: instant, undone: z.literal(true).optional()});
export const chessSettingsSchema = z.strictObject({
  version: z.literal(1),
  chesscom: z.strictObject({username: z.string().regex(CHESSCOM_USERNAME), at: instant}).optional(),
  lichess: z.strictObject({username: z.string().regex(LICHESS_USERNAME), at: instant}).optional(),
  goals: z.array(chessGoalSchema).max(20),
  habit: z.strictObject({id: z.uuid(), at: instant}).optional(),
  applied: z.array(chessAppliedSchema).max(2000),
}).refine(c => new Set(c.goals.map(g => g.id)).size === c.goals.length, 'Duplicate chess goal.')
  .refine(c => new Set(c.applied.map(a => a.date)).size === c.applied.length, 'One chess check-in per day.');
export type ChessSettings = z.infer<typeof chessSettingsSchema>;
export const emptyChessSettings = (): ChessSettings => ({version: 1, goals: [], applied: []});

export {CHESS_CACHE_KEY};
export const chessSnapshotSchema = z.strictObject({site: z.enum(CHESS_SITES), control: z.enum(CHESS_CONTROLS), rating: z.number().int().min(0).max(4000), at: instant});
export const chessGameSchema = z.strictObject({
  site: z.enum(CHESS_SITES), id: z.string().min(1).max(120), url: z.string().max(300), endedAt: instant, control: z.enum(CHESS_CONTROLS),
  color: z.enum(['white', 'black']), result: z.enum(['win', 'draw', 'loss']), opponentRating: z.number().int().min(0).max(4000).nullable(),
  opening: z.string().max(120).nullable(), timeControl: z.string().max(40).nullable(), rated: z.boolean(),
});
export type ChessGame = z.infer<typeof chessGameSchema>;
export const chessCacheSchema = z.strictObject({
  version: z.literal(1),
  snapshots: z.array(chessSnapshotSchema).max(3000),
  games: z.array(chessGameSchema).max(200),
  etags: z.record(z.string().max(300), z.strictObject({etag: z.string().max(200).optional(), lastModified: z.string().max(100).optional(), at: instant})).refine(e => Object.keys(e).length <= 60, 'Too many cached addresses.'),
  fetchedAt: z.strictObject({chesscom: instant.optional(), lichess: instant.optional()}),
});
export type ChessCache = z.infer<typeof chessCacheSchema>;
export const emptyChessCache = (): ChessCache => ({version: 1, snapshots: [], games: [], etags: {}, fetchedAt: {}});
export const CHESS_CACHE: DeviceRecordSpec<ChessCache> = {key: CHESS_CACHE_KEY, schema: chessCacheSchema, empty: emptyChessCache};
