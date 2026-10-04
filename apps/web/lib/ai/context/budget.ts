import type {ChatMessage} from '../types';

/**
 * The token budget (ADR-012 spend protection). Providers count tokens differently; four characters per token is the
 * common rule of thumb and is labelled an estimate wherever it shows. The system prompt and the page context are
 * attached whole; the conversation keeps its latest turns within what is left; when the fixed parts alone exceed the
 * budget the person is asked before anything is sent.
 */
export const CHARS_PER_TOKEN = 4;
export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);
export type Fit = {messages: ChatMessage[]; dropped: number; estimated: {system: number; context: number; turns: number; total: number}; overBudget: boolean};
/** The latest turns that fit; whole turns only, the newest kept first. An empty conversation is a valid fit. */
export function fitToBudget({system, context, turns, budgetTokens}: {system: string; context: string; turns: readonly ChatMessage[]; budgetTokens: number}): Fit {
  const fixed = estimateTokens(system) + estimateTokens(context);
  let used = 0; const kept: ChatMessage[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i]!, cost = estimateTokens(turn.content) + 4;
    // The latest message always goes; earlier ones only while the budget allows.
    if (kept.length && fixed + used + cost > budgetTokens) break;
    kept.unshift(turn); used += cost;
  }
  // A conversation starts with the person; a leading assistant turn (its question dropped) is removed.
  while (kept.length && kept[0]!.role !== 'user') { kept.shift(); }
  return {messages: kept, dropped: turns.length - kept.length, estimated: {system: estimateTokens(system), context: estimateTokens(context), turns: used, total: fixed + used}, overBudget: fixed + used > budgetTokens};
}
/** The usage line under a reply: tokens only, never money. */
export function usageLine(usage: {input: number | null; output: number | null} | null): string | null {
  if (!usage || (usage.input === null && usage.output === null)) return null;
  const parts = [usage.input !== null ? `${usage.input.toLocaleString('en-US')} in` : null, usage.output !== null ? `${usage.output.toLocaleString('en-US')} out` : null].filter(Boolean);
  return `${parts.join(' · ')} tokens, counted by your provider`;
}
