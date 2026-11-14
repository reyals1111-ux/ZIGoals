import {addLocalDays} from './local-date';
import {networthHistorySchema, type NetworthDay, type NetworthHistory} from './networth-history';

export const SHOWCASE_NETWORTH_HISTORY_LABEL = 'SHOWCASE DATA · fictional net-worth history';
const cents = (v: bigint) => { const neg = v < 0n, a = neg ? -v : v; return `${neg ? '-' : ''}${a / 100n}.${(a % 100n).toString().padStart(2, '0')}`; };
/**
 * Session AO (Part 5, backlog #11): the Showcase person's example net-worth history, labelled (`example`) and kept in the
 * Showcase tab's own storage (lib/showcase-data.ts wires it as `records[NETWORTH_HISTORY_KEY]`); it is never written to or
 * mixed with a real record. Ten weeks of fictional days, as a person who opens the app most days would have them: some
 * days not opened (gaps, never filled in), one day where a Portfolio coin had no price (unknown, never 0), US dollars and
 * euros kept apart. Whole-cent integer arithmetic only. Deterministic for a day.
 */
export function showcaseNetworthHistory(day: string): NetworthHistory {
  const days: NetworthDay[] = [];
  // Session AO (UX review, Major 1): the latest day ends exactly on the Showcase's own Wealth totals ($501,800.00 and
  // €8,000.00, as the hero shows), earlier days lead up to them, and the series starts with the chart above it (67 days back).
  for (let back = 67; back >= 0; back--) {
    // Not opened: every eighth day, and a four-day trip three weeks ago.
    if (back > 0 && (back % 8 === 5 || (back >= 20 && back <= 23))) continue;
    const d = addLocalDays(day, -back), i = BigInt(67 - back), b = BigInt(back), wave = BigInt([0, 3, 5, 2, -1, -4, -2, 1][back % 8]!);
    // Never stamped later than the day's own start for today (no "as of" in the future); evenings for earlier days.
    const at = back === 0 ? `${d}T00:00:00.000Z` : `${d}T18:00:00.000Z`;
    const wealth = 501_800_00n - b * 61_500n + wave * 180_000n, accounts = 1_180_000n + i * 4_200n, portfolio = 812_000n + i * 3_100n + wave * 41_000n, eur = 8_000_00n - b * 900n;
    const noPrice = back === 12;
    days.push({day: d, at, sources: [
      {source: 'wealth', currency: 'EUR', value: cents(eur), asOf: at},
      {source: 'wealth', currency: 'USD', value: cents(wealth), asOf: at},
      {source: 'accounts', currency: 'USD', value: cents(accounts), asOf: d},
      noPrice ? {source: 'portfolio', currency: 'USD', value: null, asOf: at, missing: ['SOL (Showcase long-term)']} : {source: 'portfolio', currency: 'USD', value: cents(portfolio), asOf: at},
    ]});
  }
  return networthHistorySchema.parse({version: 1, days, example: SHOWCASE_NETWORTH_HISTORY_LABEL});
}
