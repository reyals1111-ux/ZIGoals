import {carefulNote, detectRisk} from './safety';

/**
 * Chrome's on-device model in ZIGi's chat (Session V Part 15), only while no AI is connected and the person turned it on.
 * - A question ZIGi's lookups did not recognise is first given to the model to put in plain words ("How many times did
 *   I stretch last week?"). ZIGi's own lookup then reads that sentence: when it answers, the numbers are ZIGi's, from
 *   the records under the usual gates.
 * - Otherwise the model gives a short reply of its own.
 * In the chat the model never sees a record, a note or a number from the app: only the person's own question and these
 * instructions. "Say it nicer" gives it the brief's lines, which ZIGi made on this device from the records under the same
 * gates. It runs inside Chrome on this computer, so nothing leaves it either way.
 */
export const REWRITE_SYSTEM = [
  'You turn a person\'s question about their own habit, health, goal or money records into one short, plain English question that a simple lookup can read.',
  'Keep the person\'s own words for the thing they ask about (a habit, food, goal or coin name), and keep the time span they mean.',
  'Use one of these shapes: "How many times did I <habit> <time span>?", "How many minutes did I <habit> <time span>?", "What is my streak for <habit>?", "How much water did I drink <time span>?", "What did I eat <day>?", "How far am I with <goal>?", "How much <coin> do I hold?".',
  'Time spans: today, yesterday, this week, last week, this month, last month, in the last <n> days.',
  'If the question is not about their records, reply with exactly NONE. Reply with the question only, nothing else.',
].join(' ');
export const CHAT_SYSTEM = [
  'You are ZIGi, the friendly helper inside the ZIGoals app. You run on the person\'s own computer and cannot see any of their records.',
  'Reply warmly in at most three short sentences, in the language of the question.',
  'Give no medical, dietary, financial or investment advice, no numbers about the person, and never claim to have done anything in the app.',
  'If they ask about their own records, say that ZIGi\'s lookups answer questions like "How many times did I stretch this week?".',
].join(' ');
export const SAY_NICER_SYSTEM = [
  'Reword the short list you are given into two or three warm, plain sentences for the person it is about.',
  'Keep every name and number exactly as given; add no new facts, advice or numbers; no exclamation marks.',
].join(' ');
export type OnDevicePrompt = {system: string; input: string};
/**
 * The exact text Chrome's model gets for a question: the fixed instructions and the person's own words, nothing else.
 * No record, note or number from the app goes in (the cross-path privacy test checks this).
 */
export function onDevicePrompts(question: string): {rewrite: OnDevicePrompt; chat: OnDevicePrompt} {
  const input = question.trim().slice(0, 2000);
  return {rewrite: {system: REWRITE_SYSTEM, input}, chat: {system: chatSystem(input), input}};
}
/** The line above an answer ZIGi's lookup gave after the model put the question in plain words. */
export const readAs = (question: string) => `Read as “${question}” with Chrome’s on-device model; the numbers come from your records on this device.`;
export const ON_DEVICE_FAILED = 'Chrome’s on-device model could not answer just now.';
/** The model is not on this computer (any more): only Settings downloads it, from its own button. */
export const ON_DEVICE_NOT_READY = 'Chrome’s on-device model is not ready on this computer; Settings → ZIGi · Your Personal AI Companion → “Chrome’s on-device model” gets it ready.';
/** The model's rewrite as one question, or null: NONE, empty, more than one line, too long, or not a question. */
export function parseRewrite(answer: string): string | null {
  const text = answer.trim().replace(/^["“]|["”]$/g, '').trim();
  if (!text || /^none\.?$/i.test(text) || text.includes('\n') || text.length > 200 || !text.endsWith('?')) return null;
  return text;
}
/** The instructions for a short reply, with careful mode added when the question touches a risky health topic. */
export function chatSystem(question: string): string {
  const risk = detectRisk(question);
  return risk ? `${CHAT_SYSTEM} ${carefulNote(risk)}` : CHAT_SYSTEM;
}
/** A reply is cut to a short answer: at most 600 characters, never mid-word when it can help it. */
export function shortReply(text: string, max = 600): string {
  const flat = text.trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max), space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
