import {addLocalDays} from '../local-date';
import {moodTagsSchema, type MoodTags} from '../mood-tags/schema';
import {moodsSchema, type Moods} from '../moods/schema';
import {moneyLogSchema, type MoneyLog} from '../money-log/schema';

/**
 * Session AU (ADR-043 D8 carried → ADR-044 D-SHOWCASE): labelled Showcase examples for the two places Session AT left
 * empty on purpose (lib/showcase/ap-examples.ts), so Health → mood tags and Wealth → Bills → Price changes have something
 * to show in the Showcase tab (and only there; lib/showcase-data.ts writes them). Deterministic for a day, in each record's
 * own stored format, additive: no earlier example changes.
 * - Moods and mood tags: twelve evening moods over the last two weeks (none today, so the wrap-up still asks), and three
 *   labelled tags on eight of those days ("Example · walk", "Example · friends", "Example · late screen"), as the
 *   Showcase's symptoms say "Example · ". "Example · walk" is on five days with a mood, so "what goes with your good days"
 *   has one finding; the other two wait for more days. Private like Health: no ZIGi or NOVA context reads the tags
 *   (lib/showcase/ap-examples.test.ts).
 * - A bill whose price stepped up once: "Streaming · SHOWCASE DATA" (Subscriptions), paid monthly in the money log, €12.99
 *   114 days ago, then €13.99 84, 53 and 23 days ago. It is found in the spending (three payments at one price, the last
 *   23 days ago) and Price changes compares the latest payment with the one at €12.99. The last payment falls 23 days ago,
 *   so on the corpus's day (17 November) it is in last month, not this month.
 */
const MOODS: readonly [offset: number, mood: number, tags: readonly string[]][] = [
  [-13, 4, ['walk']], [-12, 3, ['late screen']], [-11, 4, ['walk', 'friends']], [-10, 2, ['late screen']], [-9, 3, []], [-8, 5, ['walk', 'friends']],
  [-7, 3, []], [-5, 3, ['walk']], [-4, 2, ['late screen']], [-3, 4, []], [-2, 5, ['walk', 'friends']], [-1, 3, []],
];
export const SHOWCASE_MOOD_TAGS = ['Example · walk', 'Example · friends', 'Example · late screen'] as const;
export function showcaseMoods(day: string): Moods {
  return moodsSchema.parse({version: 1, days: Object.fromEntries(MOODS.map(([n, mood]) => [addLocalDays(day, n), {mood, at: `${addLocalDays(day, n)}T21:00:00.000Z`}]))});
}
export function showcaseMoodTags(day: string): MoodTags {
  return moodTagsSchema.parse({version: 1, entries: Object.fromEntries(MOODS.filter(([, , tags]) => tags.length).map(([n, , tags]) => [addLocalDays(day, n), tags.map(t => `Example · ${t}`)]))});
}
/** The streaming payments, oldest first: [days ago, amount]. */
export const SHOWCASE_STREAMING: readonly [offset: number, amount: string][] = [[-114, '12.99'], [-84, '13.99'], [-53, '13.99'], [-23, '13.99']];
/** The money log with the streaming payments added after its own entries (nothing else in it changes). */
export function withShowcaseStreaming(log: MoneyLog, day: string): MoneyLog {
  const entries = SHOWCASE_STREAMING.map(([n, amount], i) => ({id: `showcase-money-streaming-${i + 1}`, kind: 'expense' as const, amount, currency: 'EUR', category: 'Subscriptions', note: 'Streaming · SHOWCASE DATA', date: addLocalDays(day, n), createdAt: `${addLocalDays(day, n)}T07:00:00.000Z`, source: 'form' as const}));
  return moneyLogSchema.parse({...log, entries: [...log.entries, ...entries]});
}
