import type {ParsedReply} from './parse';

/**
 * One automatic repair round (Session X-Local Part 5c). When a logging or planning reply held proposal blocks and every
 * one of them was refused, ZIGi asks the same model once more, in the same request flow, to send them again as valid
 * blocks; the second answer replaces the first in the chat under a note that says so. Bounded: once per message, only
 * in log or plan mode, never when any card survived (the person then sees what they got), never after a stop.
 */
export const REPAIR_NOTE = '_ZIGi asked your AI once more for valid cards (one automatic retry)._';
export const REPAIR_PROMPT = 'The proposal blocks in your last reply could not be used. Send the same proposals again, each as one fenced block with the info string zigoals-action holding one valid JSON object from the kinds listed, with double-quoted keys and strings, numbers unquoted, no comments and no trailing commas. Reply with the blocks and at most one short sentence. The problems were:';
export const needsRepair = (parsed: Pick<ParsedReply, 'proposals' | 'rejected'>): boolean => parsed.proposals.length === 0 && parsed.rejected.length > 0;
/** The reasons, deduplicated and bounded, as the retry names them. */
export const repairReasons = (parsed: Pick<ParsedReply, 'rejected'>): string => [...new Set(parsed.rejected.map(r => r.reason))].slice(0, 5).join(' ');
