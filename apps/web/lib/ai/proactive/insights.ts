import {createEmptyHealth} from '../../health';
import type {HabitHealthLinksV4 as HabitHealthLinks} from '../../habit-health-links/schema';
import {insightCards, MIN_DAYS, MIN_SIDE, WINDOW_DAYS, type InsightCard} from '../../insights/engine';
import type {ToolEnv} from '../tools/env';

/**
 * Cross-pillar insights for ZIGi's Insights view (Session V Part 9): the insight engine's own pairings (the last 60 days,
 * at least 14 paired days and 5 on each side, sample sizes kept, worded as counts), every one that qualifies rather than
 * Today's two. With the Health gate closed the engine sees no Health at all, so only the habit pairings remain. Each is
 * "a pattern, not proof": no cause is claimed, nothing medical or financial is said, nothing is sent anywhere.
 */
export const PATTERN_NOT_PROOF = 'A pattern in your own records, not proof of a cause.';
export const INSIGHT_RULES = `Only pairings with at least ${MIN_DAYS} paired days in the last ${WINDOW_DAYS}, and at least ${MIN_SIDE} days on each side.`;
/** Health-based pairings (steps, water, weight, counters) need the gate on every path. */
export const usesHealth = (card: InsightCard) => !card.id.startsWith('habit-weekday:');
export function zigiInsights(env: ToolEnv, links?: HabitHealthLinks, max = 6): InsightCard[] {
  if (!env.areas.habits && !env.health) return [];
  const habits = env.areas.habits ? env.habits : {...env.habits, habits: []};
  return insightCards({habits, health: env.health ?? createEmptyHealth(), today: env.habitDay, links, max}).filter(card => env.health || !usesHealth(card));
}
/** The sample behind a pairing, as the view shows it. */
export function sampleLine(card: InsightCard): string {
  const {window, sampleDays, withA, withoutA} = card.detail;
  return `${sampleDays} paired days from ${window.start} to ${window.end}: ${withA.total} on one side, ${withoutA.total} on the other.`;
}
