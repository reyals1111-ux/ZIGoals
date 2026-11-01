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

/**
 * Session AK (NOVA cost meter, owner follow-up 2 N2): the published prices per provider and model the cost meter may use
 * where the person typed none of their own, labelled "published prices as of …" and always "an estimate". Kept apart from
 * `PRICES` (the harness's and the ledger's three Claude rows stay exactly as they were). Source: the providers' own
 * pricing pages as read for docs/research/session-ak/NOVA.md §3.4 on 2026-11-01 (Anthropic platform.claude.com pricing;
 * OpenAI platform pricing; Google ai.google.dev pricing; xAI docs models page), standard tier, USD per million tokens.
 * `cacheRead` is the cached-input (hit) price; where a page lists none it is the input price (a ceiling). Anthropic cache
 * writes are the 5-minute entries (1.25× input). A prompt above `longPrompt.above` tokens is billed on the second card.
 * NOT modelled (the meter's "estimate" label covers them): 1-hour cache writes, the US-only 1.1× `inference_geo`
 * multiplier, fast modes, and Gemini's 1 December 2026 changes (the pages name no per-model figures for that day); the
 * 1 January 2027 rise of gemini-3.8-flash's input price is modelled with `from`. OpenRouter is not in this table: its
 * prices are per model in its own list, so a model there is "price unknown" here, never zero.
 */
export const PUBLISHED_AS_OF = '2026-11-01';
export type PublishedPrice = {provider: 'anthropic' | 'openai' | 'gemini' | 'xai'; id: string; usd: Price; longPrompt?: {above: number; usd: Price}; from?: string; until?: string};
const p = (input: number, output: number, cacheRead = input, cacheWrite = input): Price => ({input, output, cacheWrite, cacheRead});
export const PUBLISHED_PRICES: readonly PublishedPrice[] = [
  ...PRICES.map(row => ({provider: 'anthropic' as const, id: row.id, usd: row.usd, ...(row.longPrompt ? {longPrompt: row.longPrompt} : {})})),
  {provider: 'anthropic', id: 'claude-fable-5-1', usd: p(10, 50, 0.25, 12.5)},
  {provider: 'anthropic', id: 'claude-opus-5', usd: p(5, 25, 0.5, 6.25)},
  {provider: 'anthropic', id: 'claude-sonnet-5', usd: p(2, 10, 0.2, 2.5)},
  {provider: 'anthropic', id: 'claude-haiku-4-5', usd: p(1, 5, 0.1, 1.25)},
  {provider: 'openai', id: 'gpt-6-astra', usd: p(10, 50, 1)},
  {provider: 'openai', id: 'gpt-6.1-sol', usd: p(2, 10, 0.1)},
  {provider: 'openai', id: 'gpt-6.1-terra', usd: p(1, 5, 0.05, 1.25), longPrompt: {above: 272_000, usd: p(2, 7.5, 0.05, 1.25)}},
  {provider: 'openai', id: 'gpt-6-luna', usd: p(0.1, 0.5, 0.01)},
  {provider: 'gemini', id: 'gemini-4-argon', usd: p(2, 10)},
  {provider: 'gemini', id: 'gemini-3.8-flash', usd: p(0.75, 3.75), until: '2026-12-31'},
  {provider: 'gemini', id: 'gemini-3.8-flash', usd: p(1.5, 3.75), from: '2027-01-01'},
  {provider: 'gemini', id: 'gemini-3.6-flash', usd: p(0.75, 3.75)},
  {provider: 'gemini', id: 'gemini-3.5-flash-lite', usd: p(0.3, 2.5)},
  {provider: 'gemini', id: 'gemini-3.1-pro-preview', usd: p(2, 12), longPrompt: {above: 200_000, usd: p(4, 18)}},
  {provider: 'gemini', id: 'gemini-2.5-flash', usd: p(0.3, 2.5)},
  {provider: 'gemini', id: 'gemini-2.5-flash-lite', usd: p(0.1, 0.4)},
  {provider: 'xai', id: 'grok-4.7', usd: p(2, 6, 0.5), longPrompt: {above: 199_999, usd: p(4, 12, 1)}},
  {provider: 'xai', id: 'grok-4.6', usd: p(2, 6, 0.5), longPrompt: {above: 199_999, usd: p(4, 12, 1)}},
  {provider: 'xai', id: 'grok-4.3', usd: p(1.25, 2.5, 0.2)},
  {provider: 'xai', id: 'grok-4.20-0309-reasoning', usd: p(2.5, 5, 0.4)},
  {provider: 'xai', id: 'grok-4.20-0309-non-reasoning', usd: p(2.5, 5, 0.4)},
];
/** The published row for a provider's model on a day (a Gemini id may carry "models/"), or null: "price unknown". */
export function publishedPriceFor(provider: string, model: string, day: string = PUBLISHED_AS_OF): PublishedPrice | null {
  const id = model.trim().replace(/^models\//, '');
  return PUBLISHED_PRICES.find(r => r.provider === provider && r.id === id && (!r.from || day >= r.from) && (!r.until || day <= r.until)) ?? null;
}
/**
 * An estimate in USD from the published table, or null when the model is not in it. On Anthropic's wire the prompt is
 * input + cache writes + cache reads; on the others the cached part is already inside `input`, so it is moved to the
 * cached rate rather than counted twice.
 */
export function estimatePublished(provider: string, model: string, usage: UsageCounts, day?: string): number | null {
  const row = publishedPriceFor(provider, model, day); if (!row) return null;
  const separate = provider === 'anthropic', read = usage.cacheRead ?? 0, write = separate ? usage.cacheWrite ?? 0 : 0;
  const input = separate ? usage.input ?? 0 : Math.max(0, (usage.input ?? 0) - read), output = usage.output ?? 0, prompt = input + write + read;
  const usd = row.longPrompt && prompt > row.longPrompt.above ? row.longPrompt.usd : row.usd;
  return (input * usd.input + output * usd.output + write * usd.cacheWrite + read * usd.cacheRead) / 1e6;
}
