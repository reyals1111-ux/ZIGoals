import * as z from 'zod';
import type {ParsedReply} from './parse';
import {actionSchema} from './schema';

/**
 * One automatic repair round (Session X-Local Part 5c). When a logging or planning reply held proposal blocks and every
 * one of them was refused, ZIGi asks the same model once more, in the same request flow, to send them again as valid
 * blocks; the second answer replaces the first in the chat under a note that says so. Bounded: once per message, only
 * in log or plan mode, never when any card survived (the person then sees what they got), never after a stop.
 */
export const REPAIR_NOTE = '_ZIGi asked your AI once more for valid cards (one automatic retry)._';
export const REPAIR_PROMPT = 'The proposal blocks in your last reply could not be used. Send the same proposals again, each as one fenced block with the info string zigoals-action holding one valid JSON object from the kinds listed, with double-quoted keys and strings, numbers unquoted, no comments and no trailing commas. Reply with the blocks and at most one short sentence. The problems were: Only what the person asked for in that message, usually one item, never a list of everything that could be logged.';
/** Phase 2 (P2.2b): the retry also runs when a card was asked for (log or plan mode, or a logging or planning intent read on the device) and the reply held no block at all. */
/**
 * The repair round runs only when a card was asked for (a log or plan intent, nothing to refuse, no question or refusal in
 * the reply) and none could be used, or when blocks were refused on an ask that is not a lookup, a question, a refusal or
 * a declined reply (the model tried and got the shape wrong). Phase 2's first after-run showed the unconditional
 * refused-blocks path repairing lookups, refusals and injection cases where a stray block had appeared, and the second ask
 * with the schema then invented cards (phi4-mini: 156 of 773 replies repaired, 29 of them passing before and failing after).
 */
export const needsRepair = (parsed: Pick<ParsedReply, 'proposals' | 'rejected'>, options: {askedForCard?: boolean; refusedMayRepair?: boolean} = {}): boolean => parsed.proposals.length === 0 && (options.askedForCard === true || (parsed.rejected.length > 0 && options.refusedMayRepair === true));
export const REPAIR_PROMPT_NO_BLOCK = 'Your last reply had no proposal block, and the person asked to log or plan something. Send the proposals now: one fenced block with the info string zigoals-action per item, each one valid JSON object from the kinds listed, with double-quoted keys; no other text. Only what the person asked for in that message, usually one item, never a list of everything that could be logged.';
/** The retry's wording: the reasons when blocks were refused, the missing-block ask otherwise. */
export const repairPrompt = (parsed: Pick<ParsedReply, 'rejected'>): string => parsed.rejected.length ? `${REPAIR_PROMPT} ${repairReasons(parsed)}` : REPAIR_PROMPT_NO_BLOCK;
let schemaCache: Record<string, unknown> | null = null;
/** The proposals as a JSON schema for the wire's structured output (an array of the whitelisted kinds); computed once. */
export function structuredFormat(): Record<string, unknown> {
  if (schemaCache) return schemaCache;
  try { schemaCache = z.toJSONSchema(z.array(actionSchema), {unrepresentable: 'any'}) as Record<string, unknown>; }
  catch { schemaCache = {type: 'array', items: {type: 'object', required: ['kind'], properties: {kind: {type: 'string'}}}}; }
  return schemaCache;
}
/** A structured reply is the JSON alone: it is wrapped in the protocol's fence so the parser reads it as the block. */
export function fenceStructured(reply: string): string {
  const t = reply.trim();
  if (!t || /```|~~~/.test(t) || !(t.startsWith('[') || t.startsWith('{'))) return reply;
  try { JSON.parse(t); } catch { return reply; }
  return `\`\`\`zigoals-action\n${t}\n\`\`\``;
}
/** The reasons, deduplicated and bounded, as the retry names them. */
export const repairReasons = (parsed: Pick<ParsedReply, 'rejected'>): string => [...new Set(parsed.rejected.map(r => r.reason))].slice(0, 5).join(' ');
