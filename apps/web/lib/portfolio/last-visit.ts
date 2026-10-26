import {z} from 'zod';
import {PortfolioDecimal} from './math';

/**
 * Session AH (WE22): "since your last visit" on Portfolio. A device-only note of each portfolio's known value when you last
 * looked (never synced, never exported, never in the Showcase). A visit counts once it is 10 minutes after the one before,
 * so reloading the page does not reset the comparison. The change includes what you bought or sold in between, and says so.
 */
export const LAST_VISIT_KEY = 'zigoals:portfolio-last-visit:v1';
export const VISIT_GAP_MS = 10 * 60_000;
const seen = z.object({at: z.number(), value: z.string(), currency: z.string()});
const entry = seen.extend({prev: seen.optional()});
const store = z.record(z.string(), entry);
export type Seen = z.infer<typeof seen>;
type Entry = z.infer<typeof entry>;

export function readVisits(raw: string | null): Record<string, Entry> {
  if (!raw) return {};
  try { const parsed = store.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data : {}; } catch { return {}; }
}

/** What to compare with now, and what to keep for next time (undefined: keep what is stored). */
export function visitStep(stored: Entry | undefined, now: Seen): {compare?: Seen; next?: Entry} {
  if (!stored) return {next: now};
  if (now.at - stored.at >= VISIT_GAP_MS) {
    const last = {at: stored.at, value: stored.value, currency: stored.currency};
    return {compare: last.currency === now.currency ? last : undefined, next: {...now, prev: last}};
  }
  return {compare: stored.prev && stored.prev.currency === now.currency ? stored.prev : undefined};
}

export function sinceChange(compare: Seen, value: string): {value: string; pct?: string} {
  const before = new PortfolioDecimal(compare.value), change = new PortfolioDecimal(value).minus(before);
  return {value: change.toFixed(), pct: before.greaterThan(0) ? change.dividedBy(before).times(100).toFixed() : undefined};
}
