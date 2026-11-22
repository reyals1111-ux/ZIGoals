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
  /**
   * Session AK Part 8.6 (`TIER 3 (stored format)`, additive and optional): badges on (true) or off (false); synced with the game record (extras section `habits`).
   * Absent: a record from before AK keeps showing badges with the layer, as it did. A first switch-on from now on
   * (`switchGameLayer`) writes false, so badges start off and the person turns them on from the Journey page.
   */
  badges: z.boolean().optional(),
  /**
   * Session AV lane 2 (LEDGER #48, Habitica's Orb of Rebirth; `TIER 3 (stored format)`, additive and optional): the day the
   * person started again at level 1 and how many times. XP before that day stays in the records but no longer counts
   * toward the level (lib/game/xp.ts countedXp); badges, history and freezes are kept. A later build's fields survive.
   */
  rebirth: z.looseObject({from: day, times: z.number().int().min(1).max(999)}).optional().catch(undefined),
});
export type GameRecord = z.infer<typeof gameSchema>;
export const emptyGame = (): GameRecord => ({version: 1, enabled: false});
export const GAME: DeviceRecordSpec<GameRecord> = {key: GAME_KEY, schema: gameSchema, empty: emptyGame};
export const setGameEnabled = (g: GameRecord, enabled: boolean): GameRecord => gameSchema.parse({...g, enabled});
export const markBadgeSeen = (g: GameRecord, id: string, on: string): GameRecord => gameSchema.parse({...g, badgesSeen: {...(g.badgesSeen ?? {}), [id]: on}});
export const markLevelSeen = (g: GameRecord, level: number): GameRecord => gameSchema.parse({...g, levelSeen: level});
/** Session AK Part 8.6: whether badges show (cabinet, path labels, next unlock, celebrations): only with the layer on. */
export const badgesShown = (g: GameRecord): boolean => g.enabled && g.badges !== false;
/** The "Game layer" switch: a first switch-on (nothing seen yet, no badge choice yet) starts with badges off. */
export const switchGameLayer = (g: GameRecord, enabled: boolean): GameRecord =>
  gameSchema.parse({...g, enabled, ...(enabled && g.levelSeen === undefined && g.badges === undefined ? {badges: false} : {})});
/** Badges on or off; turning them on marks the badges already earned as seen, so none opens a celebration after the fact. */
export function setBadgesShown(g: GameRecord, on: boolean, earnedIds: readonly string[], today: string): GameRecord {
  if (!on) return gameSchema.parse({...g, badges: false});
  const seen = {...(g.badgesSeen ?? {})};
  for (const id of earnedIds) seen[id] ??= today;
  return gameSchema.parse({...g, badges: true, badgesSeen: seen});
}
/** Session AV lane 2 (LEDGER #48): start again at level 1 from `today`, keeping badges and every record; the level seen is 1. */
export const startAgain = (g: GameRecord, today: string): GameRecord =>
  gameSchema.parse({...g, levelSeen: 1, rebirth: {...(g.rebirth ?? {}), from: day.parse(today), times: Math.min(999, (g.rebirth?.times ?? 0) + 1)}});
/** The day a rebirth started counting from, or null. */
export const rebirthFrom = (g: GameRecord | null | undefined): string | null => g?.rebirth?.from ?? null;
