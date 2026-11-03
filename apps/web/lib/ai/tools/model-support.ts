/**
 * Owner follow-up 2 (docs/research/session-ak/NOVA.md §1 item 7, §6 item 5): models whose own pages say "Tool calling
 * requires the Responses API". ZIGi's OpenAI adapter sends tools on Chat Completions, so a tool call on these models
 * would fail; the tool loop (lib/ai/tool-loop.ts) offers them no tools and says so in one honest line, and the answer
 * rests on the records already attached (the page's, or NOVA's pack). Matched on OpenAI's own wire only (other routes
 * translate tools themselves); a dated snapshot of the same model ("gpt-6.1-sol-2026-09-30") counts too.
 */
export const RESPONSES_ONLY_TOOL_MODELS: readonly RegExp[] = [/^gpt-6\.1-sol(?:-\d{4}-\d{2}-\d{2})?$/i, /^gpt-6\.1-terra(?:-\d{4}-\d{2}-\d{2})?$/i];
export const TOOLS_NEED_RESPONSES_API = 'Your records were not looked up with tools on this model: it calls tools only through OpenAI\'s Responses API, which ZIGoals does not use yet. The answer uses the records already attached; for lookups, pick another model.';
/** Why this provider and model get no tools, or null when they may. */
export function toolsUnsupported(provider: string | null | undefined, model: string | null | undefined): string | null {
  const name = (model ?? '').trim();
  return provider === 'openai' && RESPONSES_ONLY_TOOL_MODELS.some(re => re.test(name)) ? TOOLS_NEED_RESPONSES_API : null;
}
