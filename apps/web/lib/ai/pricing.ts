/**
 * Published prices per million tokens, dated (Session Z-Local Part 3, ADR-020 L4): the one table the harness, the API
 * ledger and the hosted relay cost from. The app itself shows money only from the person's own prices (ADR-014; L5):
 * this table is offered to them as "fill in the published prices (as of <date>)", never applied silently. Source:
 * platform.claude.com/docs/en/about-claude/pricing, read 2026-10-10: cache writes are 1.25× the input price (5-minute
 * entries), cache hits 0.05× on Claude Opus 5.5 and Claude Sonnet 5.5 (the page's footnote 2) and 0.1× on Claude Haiku
 * 5.5; the Batch API halves input and output; Claude Haiku 5.5 has a second rate card for prompts over 100,000 tokens
 * (the prompt counts input plus cache writes and reads; each request priced on its own). Thinking tokens are output.
 */
export const PRICES_AS_OF = '2026-10-10';
export type Price = {input: number; output: number; cacheWrite: number; cacheRead: number};
export type ModelPrice = {id: string; label: string; usd: Price;
  /** Claude Haiku 5.5: the rate card for a prompt longer than this many tokens (input + cache writes + cache reads). */
  longPrompt?: {above: number; usd: Price}};
export const PRICES: readonly ModelPrice[] = [
  {id: 'claude-opus-5-5', label: 'Claude Opus 5.5', usd: {input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2}},
  {id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', usd: {input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1}},
  {id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', usd: {input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01}, longPrompt: {above: 100_000, usd: {input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05}}},
];
export const BATCH_FACTOR = 0.5;
export type UsageCounts = {input: number | null; output: number | null; cacheWrite?: number | null; cacheRead?: number | null};
export const priceFor = (model: string): ModelPrice | null => PRICES.find(p => p.id === model) ?? null;
/**
 * The cost of one call in USD from its own usage fields, or null when the model is not in the table. Missing counts
 * count as zero (a call whose counts were not reported costs nothing here and is counted as unreported by the ledger).
 */
export function estimateCost(model: string, usage: UsageCounts, {batch = false}: {batch?: boolean} = {}): number | null {
  const price = priceFor(model); if (!price) return null;
  const input = usage.input ?? 0, output = usage.output ?? 0, cacheWrite = usage.cacheWrite ?? 0, cacheRead = usage.cacheRead ?? 0;
  const prompt = input + cacheWrite + cacheRead;
  const usd = price.longPrompt && prompt > price.longPrompt.above ? price.longPrompt.usd : price.usd;
  const cost = (input * usd.input + output * usd.output + cacheWrite * usd.cacheWrite + cacheRead * usd.cacheRead) / 1e6;
  return batch ? cost * BATCH_FACTOR : cost;
}
/** The same call uncached: every prompt token at the input price, for the before/after comparison. */
export function uncachedCost(model: string, usage: UsageCounts, {batch = false}: {batch?: boolean} = {}): number | null {
  const prompt = (usage.input ?? 0) + (usage.cacheWrite ?? 0) + (usage.cacheRead ?? 0);
  return estimateCost(model, {input: prompt, output: usage.output ?? 0}, {batch});
}
/** The person's-price form of the table, for "fill in the published prices" in Settings (USD per million, as strings). */
export const publishedPrices = (model: string): {input: string; output: string; currency: 'USD'} | null => { const p = priceFor(model); return p ? {input: String(p.usd.input), output: String(p.usd.output), currency: 'USD'} : null; };
