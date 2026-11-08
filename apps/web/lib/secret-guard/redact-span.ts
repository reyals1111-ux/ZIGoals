import {recoveryWordSpans, wordListNeeds} from '../emergency-sheet/secrets';
import {loadWordLists, type WordScript} from './word-lists';

/**
 * Session AK owner follow-up 2 (G7; security review F10 R1-F7): recovery words the person saved in a note anyway still
 * reached ZIGi inside tool results and the page's records. Here only the run that looks like recovery words is replaced,
 * never the text around it: "Seed: abandon … about. Buy milk." becomes "Seed: [hidden: looked like recovery words]. Buy
 * milk." The run is found by the guard's own detector in its 'guard' mode (11 of 12 words from one standard list once
 * the lists are loaded, so an ordinary list stays as it is). The person's saved note is not changed; only what leaves the
 * device is. Plain matching on this device; nothing is stored or sent.
 *
 * Tool results are JSON (lib/ai/tools/registry.ts `toolText`): escapes such as \n between words are read as spaces, and
 * a run that crosses a quote (two records) is replaced on each side of it, so the JSON stays valid.
 */
export const HIDDEN_WORDS = '[hidden: looked like recovery words]';

/** JSON escapes (\n, \t, \", \\,  …) read as the same number of spaces, so offsets stay those of the text given. */
const forReading = (text: string) => text.replace(/\\u[0-9a-fA-F]{4}|\\./g, m => ' '.repeat(m.length));

/** One run replaced, keeping every unescaped double quote (and what stands between quotes without a word in it). */
function replaceRun(run: string): string {
  const parts = run.match(/\\.|"|[^"\\]+|\\$/g) ?? [];
  let out = '', piece = '';
  const flush = () => { out += /[\p{L}\p{N}]/u.test(piece.replace(/\\./g, '')) ? HIDDEN_WORDS : piece; piece = ''; };
  for (const part of parts) if (part === '"') { flush(); out += '"'; } else piece += part;
  flush();
  return out;
}

/**
 * Pure (given the word lists loaded so far): the text with each run that looks like recovery words replaced by
 * HIDDEN_WORDS, and how many runs were hidden. Text without such a run comes back as the same string.
 */
export function hideRecoveryWords(text: string): {text: string; hidden: number} {
  if (!text) return {text, hidden: 0};
  const spans = recoveryWordSpans(forReading(text), 'guard');
  if (!spans.length) return {text, hidden: 0};
  let out = '', at = 0;
  for (const [start, end] of spans) { out += text.slice(at, start) + replaceRun(text.slice(start, end)); at = end; }
  return {text: out + text.slice(at), hidden: spans.length};
}

type Request = {system: string; systemBlocks?: readonly {text: string; cache?: boolean}[]; messages: readonly {role: string; content: string; toolCalls?: readonly {arguments: string}[]; raw?: unknown}[]};
/**
 * Session AL Part 14 (security review Z1A-I3): the strings inside a model's own earlier turn (a tool call's arguments, a
 * provider's raw turn) are checked and hidden too; names, roles and signatures stay as they are.
 */
const KEEP = /^(?:role|name|id|type|call_?id|tool_?call_?id|thought_?signature|signature)$/i;
/** Security delta A (SA-6, 8 Nov): inside a call's own arguments (Gemini's `functionCall.args`) every string is read, whatever its key. */
const ARGUMENTS = /^(?:args|arguments)$/i;
function eachString(value: unknown, fn: (text: string) => string, key = '', inArguments = false): unknown {
  if (typeof value === 'string') return !inArguments && KEEP.test(key) ? value : fn(value);
  if (Array.isArray(value)) return value.map(v => eachString(v, fn, key, inArguments));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, eachString(v, fn, k, inArguments || ARGUMENTS.test(k))]));
  return value;
}
const turnStrings = (m: Request['messages'][number]): string[] => { const out: string[] = []; eachString({args: (m.toolCalls ?? []).map(c => c.arguments), raw: m.raw}, t => { out.push(t); return t; }); return out; };
/**
 * For the engine's transport (every request ZIGi or NOVA sends): the system prompt (the page's records) and every message
 * that is not the person's own (tool results; ZIGi's earlier answers) with recovery-word runs hidden. The person's own
 * messages are left to the transport's refusal (`messagesHoldSecret`). Loads the word lists a run needs first, so an
 * ordinary list is not hidden; a list that cannot load leaves the cautious shape rule. The very same request object
 * comes back when nothing is hidden.
 */
export async function hideRecoveryWordsInRequest<R extends Request>(request: R): Promise<R> {
  const texts = [request.system, ...(request.systemBlocks ?? []).map(b => b.text), ...request.messages.filter(m => m.role !== 'user').flatMap(m => [m.content, ...turnStrings(m)])];
  const needs = new Set<WordScript>(texts.flatMap(t => typeof t === 'string' ? wordListNeeds(forReading(t)) : []));
  if (needs.size) await loadWordLists([...needs]);
  if (!texts.some(t => typeof t === 'string' && recoveryWordSpans(forReading(t), 'guard').length)) return request;
  let hidden = 0;
  const hide = (text: string) => { const out = hideRecoveryWords(text); hidden += out.hidden; return out.text; };
  const turn = (m: Request['messages'][number]) => ({...m, content: hide(m.content), ...(m.toolCalls ? {toolCalls: m.toolCalls.map(c => ({...c, arguments: hide(c.arguments)}))} : {}), ...(m.raw !== undefined ? {raw: eachString(m.raw, hide)} : {})});
  const next = {...request, messages: request.messages.map(m => m.role === 'user' || typeof m.content !== 'string' ? m : turn(m))} as R;
  const blocks = request.systemBlocks;
  if (blocks?.length && blocks.map(b => b.text).join('') === request.system) {
    const clean = blocks.map(b => ({...b, text: hide(b.text)}));
    const system = clean.map(b => b.text).join('');
    // A run split between two blocks: the system prompt as one text, without the blocks.
    if (recoveryWordSpans(forReading(system), 'guard').length) { next.system = hide(system); delete next.systemBlocks; } else { next.system = system; next.systemBlocks = clean; }
  } else {
    next.system = hide(request.system);
    if (blocks?.length) next.systemBlocks = blocks.map(b => ({...b, text: hide(b.text)}));
  }
  return hidden ? next : request;
}
