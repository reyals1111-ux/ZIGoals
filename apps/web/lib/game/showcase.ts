import {gameSchema, type GameRecord} from './schema';
import {badges} from './badges';
import {xpSummary, type GameStores} from './xp';

/**
 * Session AA-Local Part 7 (ADR-022 B2, B17, B20, B42): the Showcase's game record. The layer is on; XP is never stored (it
 * is derived from the fictional journals, level 7 or above with six weeks of habits and a month of Health). The current
 * level and every badge earned so far are marked seen, so loading the Showcase never opens a celebration over the page
 * (the celebration is a dialog; a demo that starts with one would hide the page it is meant to show, and every browser
 * spec that loads the Showcase would meet it). The next celebration comes from the person's own next action.
 */
export function showcaseGame(stores: GameStores, today: string): GameRecord {
  const level = xpSummary(stores, today).level.level;
  const badgesSeen = Object.fromEntries(badges(stores, today).filter(b => b.earned).map(b => [b.id, today]));
  return gameSchema.parse({version: 1, enabled: true, levelSeen: level, badgesSeen});
}
