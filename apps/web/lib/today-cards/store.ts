import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Today's cards kept on this device (Session AA-Cloud Part 8, `[TIER 3] (storage)`): which of this session's cards the
 * person chose for Today (life balance, pace forecasts, the calculator, the Life review), in the order chosen. Today's
 * synced widget kinds are part of the settings format, which #32–#37 read strictly, so these cards cannot be synced
 * widgets; they live in their own device-only key (loose, versioned, never synced; #32–#37 never read it). An unknown
 * card name from a newer build is kept and ignored, never an error.
 */
export const TODAY_CARDS_KEY = 'zigoals:today-cards:v1';
export const TODAY_CARD_IDS = ['balance', 'forecasts', 'calculator', 'review'] as const;
export type TodayCardId = typeof TODAY_CARD_IDS[number];
export const todayCardsSchema = z.looseObject({
  version: z.literal(1),
  cards: z.array(z.string().regex(/^[a-z][a-z0-9-]{0,39}$/)).max(24),
});
export type TodayCards = z.infer<typeof todayCardsSchema>;
export const emptyTodayCards = (): TodayCards => ({version: 1, cards: []});
export const TODAY_CARDS: DeviceRecordSpec<TodayCards> = {key: TODAY_CARDS_KEY, schema: todayCardsSchema, empty: emptyTodayCards};

/** The cards this build knows, in the person's order, each once. */
export const shownCards = (state: TodayCards): TodayCardId[] => [...new Set(state.cards)].filter((c): c is TodayCardId => (TODAY_CARD_IDS as readonly string[]).includes(c));
/** Adds the card at the end, or takes it away; names this build does not know stay where they are. */
export function toggleCard(state: TodayCards, id: TodayCardId): TodayCards {
  const cards = state.cards.includes(id) ? state.cards.filter(c => c !== id) : [...state.cards, id];
  return todayCardsSchema.parse({...state, cards});
}
