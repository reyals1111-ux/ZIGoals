/**
 * The relay's fixed caps (Session V Part 17, ADR-014). The daily budgets come from the environment (wrangler vars the
 * owner sets); these never do, so no configuration can widen them.
 */
export const LIMITS={
 /** One chat request as the app sends it: the conversation, the page's records and the tool definitions (no photos beyond what a 1 MiB body holds). */
 requestBytes:1_048_576,
 /** The streamed reply, counted as it passes; a longer one is cut with an error event. */
 responseBytes:2_097_152,
 /** The relay's own output ceiling per reply, whatever the app asks for. */
 maxOutputTokens:4096,
 /** Session X P2.7: the input estimate above which an Anthropic request is refused. Anthropic prices prompts above
  *  100,000 input tokens at a higher rate (platform.claude.com pricing, read 2026-10-08); the activation guide's daily
  *  cost assumes every prompt stays below that. */
 anthropicInputTokens:90_000,
 /** Session Z-Cloud Gate B (the relay's security read, ADR-019 C48): an Anthropic prompt is reserved at its ceiling
  *  (anthropic.mjs `promptCeiling`): each photo at the most a Claude 5.5 model counts for one (4,784 visual tokens on the
  *  high-resolution tier, platform.claude.com Vision, read 2026-10-11), at most four photos a request (the app sends one),
  *  and the provider's own tool-use system prompt (286 tokens on the 5.5 models, Pricing, read 2026-10-11) rounded up. */
 imageTokens:4784,
 images:4,
 toolPromptTokens:500,
 /** One account's replies at once: a reservation is in flight until it settles or the reply's longest life is over. */
 inFlight:2,
 messages:200,
 tools:64,
 /** The provider must start answering within this, and finish within the stream limit. */
 headerTimeoutMs:20_000,
 streamTimeoutMs:120_000,
 /** One server-sent event (a chunk of the reply); a longer one ends the reply as too long. */
 eventBytes:262_144,
};
