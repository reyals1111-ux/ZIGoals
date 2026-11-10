import type {LocalReply, ToolCallRecord} from './engine';
import {ADD_TEXT_MAX, TEXT_LIMITS} from '../../limits/text';

/**
 * Session AL fifth pass (lane L7-5b; GROK53_REPLAY_L7_2.md, the rows still open on 37d2370c): the shapes of a message the
 * device read wrongly, shared by ZIGi's panel and NOVA's chat (lib/ai/local-answers/engine.ts `localAnswer` and
 * lib/ai/local-answers/no-model.ts `noModelReply` both use them). Nothing here reads or writes a record.
 *
 * - `onePhrase`: "show my checklist" typed 40 times in one message is that question once (Lisbon #216, LA-028).
 * - `messageLines`: "open goals⏎and tell me what is left today" is two asks; each line is answered (Lisbon LZ-019).
 * - `pastPeriodAsk`: "Exercise last week" asks about last week, never for today's check-in (Nairobi H7).
 * - `tooLongAdd`: an "add …" longer than any record holds says so with the limits table's numbers (Lisbon #337/338).
 * - `germanAsk`: a German question about the Checklist, habits, tasks or goals is asked again in English, with the note
 *   that the device answers in English for now (Lisbon #352/353, LA-010, LZ-020, ZIGi-F8; AL_SCOPE F: languages are Beta).
 */
const word = (t: string) => t.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
/** The phrase a message repeats, when the whole message is that phrase two or more times; else null. */
export function onePhrase(text: string): string | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 1200) return null;
  const keys = tokens.map(word);
  for (let p = 1; p <= tokens.length / 2; p++) {
    if (tokens.length % p) continue;
    if (keys.every((k, i) => k === keys[i % p])) {
      const phrase = tokens.slice(0, p).join(' ');
      return phrase.replace(/[^\p{L}\p{N}?]+$/u, '').length >= 3 ? phrase : null;
    }
  }
  return null;
}
const JOIN = /^(?:and|also|then|plus|en|ook|daarna)\b\s*,?\s*/i;
/**
 * The asks of a message written on two to four lines, or null. A line that continues the sentence above it (it starts in
 * lower case after a line with no full stop or question mark, and with no "and") belongs to that line.
 */
export function messageLines(text: string): string[] | null {
  const raw = text.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
  if (raw.length < 2) return null;
  const asks: string[] = [];
  for (const line of raw) {
    const prev = asks.at(-1);
    const fresh = !prev || JOIN.test(line) || /^[\p{Lu}\d"“/]/u.test(line) || /[.?!:]$/.test(prev);
    if (fresh) asks.push(line); else asks[asks.length - 1] = `${prev} ${line}`;
  }
  const clean = asks.map(l => l.replace(JOIN, '').replace(/[,;]+$/, '').trim()).filter(l => l.length >= 2);
  return clean.length >= 2 && clean.length <= 4 ? clean : null;
}
/** Several replies as one: each text in turn (a card stays under its own words), the records of all of them. */
export function joinReplies(replies: readonly LocalReply[]): LocalReply {
  const texts = replies.map(r => 'text' in r ? r.text : '').filter(Boolean), calls: ToolCallRecord[] = replies.flatMap(r => 'calls' in r ? r.calls : []);
  return {kind: replies.some(r => r.kind === 'answer') ? 'answer' : 'refusal', text: texts.join('\n\n'), calls: calls.slice(0, 16)} as LocalReply;
}
const PERIOD = /^(?:(?:and|what about|how about|show(?: me)?|my|the)\s+)*(.{2,100}?)\s+(last week|this week|last month|this month|yesterday|the last 7 days|the last 30 days|past week|past month|previous week|previous month)\s*[?.!]*$/i;
/** "Exercise last week" with a habit called Exercise: the count question for that period, or null. */
export function pastPeriodAsk(q: string, titles: readonly string[]): string | null {
  const m = PERIOD.exec(q.trim()); if (!m) return null;
  const name = m[1]!.replace(/^(?:my|the)\s+/i, '').trim().toLowerCase(), title = titles.find(t => t.trim().toLowerCase() === name);
  if (!title) return null;
  const when = m[2]!.toLowerCase().replace(/^(?:past|previous) /, 'last ');
  return `How many times did I check in ${title} ${when}?`;
}
const ADD = /^\s*(?:please\s+)?(?:add|create|make|new|put|track)\s+(?:a\s+(?:task|habit|item)\s+)?([\s\S]+?)\s*$/i;
/** The note for an "add …" longer than a task, a habit or a Checklist item holds, or null. */
export function tooLongAdd(text: string, lang: 'en' | 'nl'): string | null {
  const m = ADD.exec(text); if (!m) return null;
  const what = m[1]!.replace(/\s+(?:to|on|onto) (?:my|the) (?:checklist|list|tasks?|path|orbit)\s*[.!]?$/i, '').trim();
  if (what.length <= ADD_TEXT_MAX) return null;
  const {taskTitle, habitTitle, checklistItem} = TEXT_LIMITS;
  return lang === 'nl'
    ? `Dat is te lang om als één item toe te voegen (${what.length} tekens): een taak heeft hoogstens ${taskTitle} tekens, een gewoonte ${habitTitle} en een eigen Checklist-stip ${checklistItem}. Zeg het korter; details kun je daarna in de notities van de taak zetten. Er is niets toegevoegd.`
    : `That is too long to add as one item (${what.length} characters): a task title holds up to ${taskTitle} characters, a habit name ${habitTitle} and a Checklist item of your own ${checklistItem}. Say it shorter; details can go in the task’s notes once it is added. Nothing was added.`;
}
const GERMAN_ASKS: readonly [RegExp, string][] = [
  [/\bcheck-?liste\b|\bpfad\b/i, 'What is on my checklist?'],
  [/\bgewohnheit(?:en)?\b/i, 'Which habits are open today?'],
  [/\baufgaben?\b|\bheute (?:fällig|offen)\b/i, 'What is due today?'],
  [/\bziele?n?\b/i, 'How far am I on my goals?'],
];
/** The English question a German one about the Checklist, habits, tasks or goals asks, or null (a question only). */
export function germanAsk(text: string): string | null {
  const t = text.trim();
  if (!/\?\s*$/.test(t) && !/^(?:was|wie|welche[rsn]?|zeig(?:e)?|wo|wann)\b/i.test(t)) return null;
  return GERMAN_ASKS.find(([re]) => re.test(t))?.[1] ?? null;
}
/**
 * The examples list's lead when nothing on the device matched (Lisbon N-LA-01): what the device does answer and prepare,
 * before the examples, so the list is not the only thing a person sees.
 */
export const UNMATCHED_EN = 'That isn’t something I can answer from your records here. Without a brain I answer about your habits, Checklist, tasks, goals, Health (once you share it) and money, and I prepare cards you confirm for check-offs, tasks and new habits.';
/** One line of a several-line message that the device has no answer for. */
export const unansweredLine = (line: string) => `“${line.length > 80 ? `${line.slice(0, 79)}…` : line}”: I have no answer for this one on this device.`;
