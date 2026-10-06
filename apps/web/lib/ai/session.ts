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
/** The person's last question in the chat (Session V Part 10, "Edit"), or null when there is none. */
export function lastQuestion(chat: Chat): ChatTurn | null {
  return [...chat.turns].reverse().find(t => t.role === 'user') ?? null;
}
/**
 * "Edit" (Session V Part 10): the chat as it was before the person's last question, so the new words take its place
 * with the answers it had. Null when `turnId` is not that last question; nothing changes until the new words are sent.
 */
export function editTarget(chat: Chat, turnId: string, now = new Date()): Chat | null {
  const at = chat.turns.findIndex(t => t.id === turnId);
  if (at < 0 || chat.turns[at]!.role !== 'user' || chat.turns.slice(at + 1).some(t => t.role === 'user')) return null;
  return {...chat, turns: chat.turns.slice(0, at), updatedAt: now.toISOString()};
}
/**
 * The provider's view of the conversation: user and assistant texts in order, empty turns dropped. Questions answered
 * on the device and their local answers (Session V Part 3, `source: 'local'`) are never sent to a provider later; "Ask
 * my AI for more" asks again, with the records shown, as a new turn.
 */
export function messagesFor(turns: readonly ChatTurn[]): ChatMessage[] {
  // Answers made on this device (ZIGi's lookups, and Session V Part 15's on-device model) never go to a provider later.
  return turns.filter(t => t.source !== 'local' && t.source !== 'on-device' && t.text.trim().length > 0).map((t): ChatMessage => t.role === 'user' ? {role: 'user', content: t.text} : {role: 'assistant', content: t.text});
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
