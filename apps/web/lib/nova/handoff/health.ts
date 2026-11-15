import {isUntrustedTool} from '../../ai/untrusted';
import {toolByName} from '../../ai/tools/registry';
import {TOOL_RESULT_HEAD} from '../agent-bridge/plain';

/**
 * Session AM-2 (owner's step 4b; Q14, Q16; security review, findings 4 and 11): two facts about a conversation, read
 * from what it keeps about each turn — the lookups a reply ran (by name), the labels of the records that went with a
 * question, a message's own mark — never from reading a reply's words.
 *
 * `healthReadOver(turns)`: did ANY turn of the conversation read Health? One rule for every way something can leave
 * NOVA (a model's hand-off, "copy that" / "share this", a call to a tool of the person's own): while NOVA's Health
 * permission or this device's Health gate is off, nothing leaves a conversation that read Health — so an answer that
 * only restates an earlier Health answer does not leave either. (While both are on, Health may go into a hand-off the
 * person approves, like any other answer.) A Health lookup counts whether or not it was answered: the conversation
 * keeps no proof that a refused one read nothing, and the cautious reading only asks the person to open Health first.
 *
 * `heldOutsideText(turns)`: did any turn bring in words the person did not type here — a result handed back from a tool
 * of their own, a pasted or imported message, a lookup whose result holds words someone else may have written (notes,
 * imported calendars, the journal: lib/ai/untrusted.ts)? Later cards in that conversation carry one quiet line saying so.
 */
export type ConversationTurn = {
  /** The turn's words (a tool result handed back to the model starts with the bridge's own heading). */
  text?: string;
  /** The lookups the reply ran, as the conversation keeps them (ChatTurn `tools`). */
  tools?: readonly {tool: string}[];
  /** The labels of the records that went with the question ("Health: sleep, weight", "Today's page"); never their values. */
  records?: readonly string[];
  /** The message held pasted or imported words (known for this visit's messages only). */
  pasted?: boolean;
};
/** Record labels that name Health's own areas (the labels the context pack writes; lib/ai/records-sent.ts). */
const HEALTH_LABEL = /\b(?:health|sleep|weight|water|hydration|steps|activity|workouts?|exercise|nutrition|food|meals?|calories|macros|fasting|mood|energy|meditation|vitals?|blood|heart|cycle|symptoms?|supplements?|vitamins?|medication|measurements?|body|nap|coach)\b/i;
const isHealthTool = (name: string): boolean => toolByName(name)?.area === 'health';
/** Whether one turn read Health: a Health lookup among its lookups, or a Health label among the records sent with it. */
export const turnReadHealth = (turn: ConversationTurn): boolean => (turn.tools ?? []).some(t => isHealthTool(t.tool)) || (turn.records ?? []).some(label => HEALTH_LABEL.test(label));
/** Whether any turn of the conversation read Health. */
export function healthReadOver(turns: readonly ConversationTurn[]): boolean { return turns.some(turnReadHealth); }
/** Whether any turn of the conversation held text from outside: a tool's result, a paste, a lookup of words someone else may have written. */
export function heldOutsideText(turns: readonly ConversationTurn[]): boolean {
  return turns.some(turn => turn.pasted === true || (typeof turn.text === 'string' && turn.text.includes(TOOL_RESULT_HEAD)) || (turn.tools ?? []).some(t => isUntrustedTool(t.tool)));
}
