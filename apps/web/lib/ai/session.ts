import {MAX_TURN_CHARS, MAX_TURNS, titleFor, type Chat, type ChatTurn} from './chats';
import type {ChatMessage} from './types';
import type {ProviderId} from './providers';

/**
 * The pure part of a conversation (ADR-012, Part 6): turns in, turns out. The component streams and renders; these
 * helpers add turns, keep the title, mark stopped replies and turn a chat into the messages a provider receives.
 */
export type Usage = {input: number | null; output: number | null};
export const turnId = () => `t_${crypto.randomUUID()}`;
export function userTurn(text: string, now = new Date(), id = turnId()): ChatTurn { return {id, role: 'user', text: text.trim().slice(0, MAX_TURN_CHARS), at: now.toISOString()}; }
export function assistantTurn({text, provider, model, usage, stopped, now = new Date(), id = turnId()}: {text: string; provider: ProviderId | null; model: string | null; usage: Usage | null; stopped?: string; now?: Date; id?: string}): ChatTurn {
  return {id, role: 'assistant', text: text.slice(0, MAX_TURN_CHARS), at: now.toISOString(), provider, model, usage, ...(stopped ? {stopped} : {})};
}
/** Adds a turn; the first user turn names the chat. Refuses, with nothing changed, when the chat is full. */
export function appendTurn(chat: Chat, turn: ChatTurn, now = new Date()): Chat {
  if (chat.turns.length >= MAX_TURNS) throw Error(`This chat has ${MAX_TURNS} turns, its limit. Start a new chat to go on.`);
  const firstUser = chat.turns.every(t => t.role !== 'user') && turn.role === 'user';
  return {...chat, title: firstUser ? titleFor(turn.text) : chat.title, updatedAt: now.toISOString(), turns: [...chat.turns, turn]};
}
export const isFull = (chat: Chat): boolean => chat.turns.length >= MAX_TURNS;
/** Removes the trailing assistant turns so the last question can be asked again; null when there is no question. */
export function regenerateTarget(chat: Chat, now = new Date()): {chat: Chat; question: string} | null {
  let turns = chat.turns;
  while (turns.length && turns[turns.length - 1]!.role === 'assistant') turns = turns.slice(0, -1);
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user') return null;
  return {chat: {...chat, turns, updatedAt: now.toISOString()}, question: last.text};
}
/** The provider's view of the conversation: user and assistant texts in order, empty turns dropped. */
export function messagesFor(turns: readonly ChatTurn[]): ChatMessage[] {
  return turns.filter(t => t.text.trim().length > 0).map(t => ({role: t.role, content: t.text}));
}
/** One honest line for a reply that ended early. */
export function stopReason(reason: string | null, aborted: boolean): string | undefined {
  if (aborted) return 'Stopped';
  if (!reason) return undefined;
  if (/^(length|max_tokens|max_output_tokens|MAX_TOKENS)$/i.test(reason)) return 'Cut off at your output cap (Settings → ZIGi · your AI → Output cap)';
  if (/^(content_filter|SAFETY|RECITATION|PROHIBITED_CONTENT|SPII|BLOCKLIST|refusal)$/i.test(reason)) return 'Stopped by the provider\'s content filter';
  if (/^(stop|end_turn|STOP|stop_sequence|tool_calls|FINISH_REASON_UNSPECIFIED)$/i.test(reason)) return undefined;
  return `Stopped by the provider (${reason.slice(0, 40)})`;
}
