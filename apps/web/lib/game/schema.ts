import * as z from 'zod';
import {GAME_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AA-Local Part 2 (H7): the game layer's device record (ADR-022 B1, B2). It holds only what cannot be derived
 * from the person's records: the switch (off for real people, on in the Showcase), the day each badge was first seen
 * (so a badge celebrates once), the quest picks the person swapped away, and the level last celebrated. XP, levels,
 * quest progress, badges and freezes are all DERIVED from the journals (lib/game/xp.ts), so Undo removes them and
 * nothing is counted twice. Loose and versioned; unreadable bytes read as off.
 */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const gameSchema = z.looseObject({
  version: z.literal(1),
  enabled: z.boolean(),
  badgesSeen: z.record(z.string().min(1).max(60), day).optional(),
  levelSeen: z.number().int().min(1).max(1000).optional(),
  questSwaps: z.looseObject({day, ids: z.array(z.string().min(1).max(60)).max(6)}).optional(),
});
export type GameRecord = z.infer<typeof gameSchema>;
export const emptyGame = (): GameRecord => ({version: 1, enabled: false});
export const GAME: DeviceRecordSpec<GameRecord> = {key: GAME_KEY, schema: gameSchema, empty: emptyGame};
export const setGameEnabled = (g: GameRecord, enabled: boolean): GameRecord => gameSchema.parse({...g, enabled});
export const markBadgeSeen = (g: GameRecord, id: string, on: string): GameRecord => gameSchema.parse({...g, badgesSeen: {...(g.badgesSeen ?? {}), [id]: on}});
export const markLevelSeen = (g: GameRecord, level: number): GameRecord => gameSchema.parse({...g, levelSeen: level});
