import type {PrivacyMode} from '../setup';
import {guardArgs, type GuardContext} from './guard';
import {stripArgs} from './guard-core';
import {USE_TOOL, type OfferedTool} from './offer';
import {argFields, checkArgs, parseArgs, type ListedTool} from './schema';
import {holdsToolResult} from './untrusted';

export {MY_TOOLS, offeredTools, toolsForModel, USE_TOOL, type LiveServer, type OfferedTool} from './offer';

/**
 * Session AM-2 (step 4c, item 3): from "a tool could be asked" to the ONE confirm card the person may press. Pure.
 *
 * The rules, each checked here and pinned by ./guard.test.ts:
 * - only a tool the server listed in this visit AND that the person switched to "Ask every time" can become a card
 *   (every tool is Off until then; there is no "always allow", so nothing ever runs without a card);
 * - a model may PROPOSE a call (the closed lookup `use_tool`, lib/ai/tools/nova-agent.ts); the proposal is checked again
 *   here against the tools and switches as they are NOW: the listed tool's schema, the size bounds, the guard and the
 *   privacy mode (./guard.ts);
 * - at most one card per reply: the first proposal that passes; the others are dropped and counted;
 * - never from a tool result: a reply to a message that holds a handed-back result brings no card (no chains — a result
 *   can never start another call without the person asking for it in their own words);
 * - never while the page is hidden: a proposal that arrives then is dropped, and a press is refused;
 * - the person can also fill a card by hand for a listed tool (`byHand`): the same checks, the same card.
 * A card is only a card: it sends nothing. `mayRun` is the last look at the moment of the press.
 */
export const CARD_WARNING = 'This asks a tool on your own computer to act with its own accounts. NOVA cannot see or undo what it does.';
export const CARD_WARNING_NL = 'Dit vraagt een tool op je eigen computer om te handelen met zijn eigen accounts. NOVA kan niet zien of ongedaan maken wat hij doet.';
/** The card: everything it shows, and exactly what a press would send. */
export type ToolCard = {
  serverId: string; label: string; /** The loopback origin shown on the card and kept in the history. */ origin: string;
  tool: ListedTool; args: Record<string, unknown>;
  /** The arguments as readable fields, and the raw JSON shown on request. */ fields: {name: string; value: string}[]; json: string;
  /** What the guard wants the person to see before pressing. */ notices: string[];
  source: 'model' | 'person';
};
export type DropReason = 'chain' | 'hidden' | 'off' | 'arguments' | 'guard' | 'extra';
export type Dropped = {reason: DropReason; message: string};
export const DROP_WORDS: Readonly<Record<Exclude<DropReason, 'arguments' | 'guard'>, string>> = {
  chain: 'No tool card: a tool’s result can never start another tool. Ask for the next step in your own words.',
  hidden: 'No tool card: your model proposed a tool while this page was not in front of you. Ask again when you are here.',
  off: 'No tool card: your model named a tool that is not switched to “Ask every time” (or that its server no longer lists).',
  extra: 'Your model proposed more than one tool in one reply. Only the first is shown as a card; ask again for the next.',
};
export type CardContext = {mode: PrivacyMode | null; healthOpen: boolean; typed?: string; healthLookup?: boolean};
const find = (offered: readonly OfferedTool[], server: unknown, tool: unknown): OfferedTool | null => {
  if (typeof tool !== 'string') return null;
  const named = offered.filter(o => o.tool.name === tool);
  if (typeof server === 'string' && server.trim()) {
    const want = server.trim().toLowerCase();
    return named.find(o => o.serverId === want) ?? named.find(o => o.label.toLowerCase() === want || o.origin.toLowerCase() === want) ?? null;
  }
  return named.length === 1 ? named[0]! : null; // no server named: only when exactly one server offers that tool
};
/** One call as a card, or why not: the listed tool, its schema and bounds, then the guard. */
export function cardFor(offered: readonly OfferedTool[], call: {server?: unknown; tool: unknown; args: unknown}, source: 'model' | 'person', ctx: CardContext): {ok: true; card: ToolCard} | {ok: false; dropped: Dropped} {
  const hit = find(offered, call.server, call.tool);
  if (!hit) return {ok: false, dropped: {reason: 'off', message: DROP_WORDS.off}};
  // Security review, finding 2: what the person typed by hand loses its invisible characters before the card is built, so the card shows exactly what leaves (a model's call with one is refused by the guard).
  const checked = checkArgs(hit.tool.schema, source === 'person' ? stripArgs(call.args) : call.args);
  if (!checked.ok) return {ok: false, dropped: {reason: 'arguments', message: `${source === 'model' ? 'No tool card: the arguments your model gave do not fit this tool.' : 'These arguments do not fit this tool.'} ${checked.problems.join(' ')}`}};
  const guardCtx: GuardContext = {source, mode: ctx.mode, healthOpen: ctx.healthOpen, schema: hit.tool.schema, ...(ctx.typed !== undefined ? {typed: ctx.typed} : {}), ...(ctx.healthLookup ? {healthLookup: true} : {})};
  const guard = guardArgs(checked.value, guardCtx);
  if (!guard.ok) return {ok: false, dropped: {reason: 'guard', message: guard.message}};
  return {ok: true, card: {serverId: hit.serverId, label: hit.label, origin: hit.origin, tool: hit.tool, args: checked.value, fields: argFields(hit.tool.schema, checked.value), json: JSON.stringify(checked.value, null, 2), notices: guard.notices, source}};
}
/** A lookup of a model's reply, as the chat keeps it for the visit: the tool's name, its arguments, whether it ran. */
export type ReplyCall = {tool: string; args: Record<string, unknown> | null | undefined; ok: boolean};
/** On a card made while Health is shared, in a conversation that read Health (security review, finding 4). */
export const HEALTH_NOTICE = 'This conversation read your Health records, and Health is shared with NOVA right now. Check that this card holds only what you want this tool to receive.';
/**
 * A model's reply → at most one card. `question`: the person's own message this reply answers; `hidden`: the page was
 * not in front of the person when the reply arrived. Security review:
 * - `healthLookup` (finding 4) is whether ANY turn of the conversation read Health (lib/nova/handoff/health.ts
 *   `healthReadOver`), not only this reply: with Health closed no card is made; with Health open the card says so;
 * - `typed` (finding 6): the words the person typed for this request — '' when the message was pasted, dropped or
 *   handed in from outside (pasted words are not "typed by you": they satisfy neither Strict nor the "you typed it"
 *   reading); left out, the question itself;
 * - `notices` (finding 11): lines the conversation adds to the card (text from outside was read earlier in this chat).
 */
export function cardFromReply(input: {calls: readonly ReplyCall[]; question: string; hidden: boolean; offered: readonly OfferedTool[]; typed?: string; notices?: readonly string[]} & Omit<CardContext, 'typed'>): {card: ToolCard | null; dropped: Dropped[]} {
  const proposals = input.calls.filter(c => c.tool === USE_TOOL && c.ok);
  if (!proposals.length) return {card: null, dropped: []};
  if (holdsToolResult(input.question)) return {card: null, dropped: [{reason: 'chain', message: DROP_WORDS.chain}]};
  if (input.hidden) return {card: null, dropped: [{reason: 'hidden', message: DROP_WORDS.hidden}]};
  const dropped: Dropped[] = [];
  let card: ToolCard | null = null;
  for (const proposal of proposals) {
    if (card) { if (!dropped.some(d => d.reason === 'extra')) dropped.push({reason: 'extra', message: DROP_WORDS.extra}); continue; }
    const a = proposal.args ?? {}, text = typeof a.arguments_json === 'string' ? a.arguments_json : '';
    const parsed = parseArgs(text);
    if (!parsed.ok) { dropped.push({reason: 'arguments', message: `No tool card: ${parsed.problem}`}); continue; }
    const made = cardFor(input.offered, {server: a.server, tool: a.tool, args: parsed.value}, 'model', {mode: input.mode, healthOpen: input.healthOpen, typed: input.typed ?? input.question, ...(input.healthLookup ? {healthLookup: true} : {})});
    if (made.ok) card = {...made.card, notices: [...made.card.notices, ...(input.healthLookup && input.healthOpen ? [HEALTH_NOTICE] : []), ...(input.notices ?? [])]}; else dropped.push(made.dropped);
  }
  return {card, dropped};
}
/** A card the person fills in by hand, from the panel. */
export const byHand = (offered: readonly OfferedTool[], call: {serverId: string; tool: string; args: unknown}, ctx: Pick<CardContext, 'mode' | 'healthOpen'>) => cardFor(offered, {server: call.serverId, tool: call.tool, args: call.args}, 'person', ctx);
/**
 * The last look, at the press: the page is in front of the person, the tool is still listed and still on "Ask every
 * time", and the arguments still pass (they are the card's own; a record or a mode may have changed since).
 */
export function mayRun(card: ToolCard, now: {visible: boolean; offered: readonly OfferedTool[]} & CardContext): {ok: true} | {ok: false; message: string} {
  if (!now.visible) return {ok: false, message: 'Nothing was sent: this page was not in front of you. Press again when it is.'};
  const again = cardFor(now.offered, {server: card.serverId, tool: card.tool.name, args: card.args}, card.source, now);
  if (!again.ok) return {ok: false, message: again.dropped.reason === 'off' ? 'Nothing was sent: this tool is no longer on “Ask every time”, or its server no longer lists it.' : `Nothing was sent. ${again.dropped.message}`};
  if (again.card.json !== card.json) return {ok: false, message: 'Nothing was sent: the arguments changed since the card was made. Make the card again.'};
  return {ok: true};
}
