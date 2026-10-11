import {AiError} from './errors';
import type {ToolEnv} from './tools/env';
import {refuse, text as clean} from './tools/format';
import {availableTools, runTool, toolByName, toolSpecs, toolText} from './tools/registry';
import {ANSWER_CHARS, type ToolResult} from './tools/types';
import type {ChatEvent, ChatMessage, ChatRequest, ToolCallPart, ToolSpec} from './types';

/**
 * Native read-only tool calling (Session V Part 6, owner decision D1): the person's AI may ask for ZIGi's read tools while
 * it answers; ZIGi runs them in this browser over the device's records and sends back the results. Writes never travel
 * this way (they stay action blocks and proposal cards). Rules, all enforced here:
 * - only the tools the environment allows are offered (the area switches, the three-part Health gate, sensitive
 *   screens), and every call is checked again by the registry, so a call for anything else is a refusal, not data;
 * - at most 4 rounds of calls and 8 calls per round, and at most 16,000 characters of results per answer ("Think
 *   deeper": 32,000);
 * - an unknown tool, arguments that are not JSON or do not fit, or a result past the cap become an error result the
 *   model reads, never an exception;
 * - the same calls asked again end the loop; a sensitive screen or an account change between rounds ends it;
 * - the caller's AbortSignal (Stop) ends it at once.
 * Token counts: each request reports its own (merged within the request, latest figure wins, as T reads them); after
 * each request the loop yields the running sums over all its requests, so the last usage event counts every round, and
 * a Stop mid-loop still leaves the rounds already answered counted.
 */
export const MAX_TOOL_ROUNDS = 4, MAX_CALLS_PER_ROUND = 8;
export type LoopEvent = Exclude<ChatEvent, {type: 'tool-call'} | {type: 'model-turn'}>
  | {type: 'tool-result'; call: ToolCallPart; args: Record<string, unknown> | null; result: ToolResult; text: string}
  | {type: 'tool-limit'; reason: string};
export type LoopRequest = Omit<ChatRequest, 'tools'> & {
  env: ToolEnv;
  stream: (request: ChatRequest) => AsyncGenerator<ChatEvent>;
  maxRounds?: number;
  answerChars?: number;
  /** A reason to stop between rounds (a sensitive screen opened, the account changed), or null. */
  shouldStop?: () => string | null;
};
/** The tools offered to the model for this environment, in the portable JSON Schema form. */
export const toolsFor = (env: ToolEnv): ToolSpec[] => toolSpecs(availableTools(env)).map(t => ({name: t.name, description: t.description, parameters: t.parameters as unknown as Record<string, unknown>}));
const argsOf = (text: string): Record<string, unknown> | null | undefined => {
  if (!text.trim()) return {};
  try { const v = JSON.parse(text) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : undefined; } catch { return undefined; }
};
const keyOf = (call: ToolCallPart) => { const args = argsOf(call.arguments); return `${call.name}:${args ? JSON.stringify(Object.keys(args).sort().map(k => [k, args[k]])) : call.arguments}`; };
export async function* runWithTools(request: LoopRequest): AsyncGenerator<LoopEvent> {
  const {env, stream, maxRounds = MAX_TOOL_ROUNDS, answerChars = ANSWER_CHARS, shouldStop, ...chat} = request;
  const tools = toolsFor(env);
  let messages: ChatMessage[] = [...chat.messages], used = 0, shown = '';
  const asked = new Set<string>(), total = {input: null as number | null, output: null as number | null, cacheWrite: null as number | null, cacheRead: null as number | null};
  const add = (key: keyof typeof total, value: number | null | undefined) => { if (value !== null && value !== undefined) total[key] = (total[key] ?? 0) + value; };
  const sums = (): Extract<ChatEvent, {type: 'usage'}> => ({type: 'usage', input: total.input, output: total.output, ...(total.cacheWrite !== null ? {cacheWrite: total.cacheWrite} : {}), ...(total.cacheRead !== null ? {cacheRead: total.cacheRead} : {})});
  const stopped = () => { if (chat.signal?.aborted) throw new AiError('aborted', 'Stopped.', {provider: chat.provider}); };
  for (let round = 1; ; round++) {
    stopped();
    const calls: ToolCallPart[] = [], usage = {input: null as number | null, output: null as number | null, cacheWrite: null as number | null, cacheRead: null as number | null};
    let text = '', raw: unknown, done: Extract<ChatEvent, {type: 'done'}> | null = null;
    for await (const event of stream({...chat, messages, ...(tools.length ? {tools} : {})})) {
      if (event.type === 'tool-call') calls.push(event.call);
      else if (event.type === 'model-turn') raw = event.raw;
      else if (event.type === 'done') done = event;
      else if (event.type === 'usage') { if (event.input !== null) usage.input = event.input; if (event.output !== null) usage.output = event.output; if (event.cacheWrite != null) usage.cacheWrite = event.cacheWrite; if (event.cacheRead != null) usage.cacheRead = event.cacheRead; }
      else {
        // A model may say a few words before it looks something up; the next round's words start on a new paragraph.
        if (!text && shown && !/\s$/.test(shown)) { shown += '\n\n'; yield {type: 'text', delta: '\n\n'}; }
        text += event.delta; shown += event.delta; yield event;
      }
    }
    add('input', usage.input); add('output', usage.output); add('cacheWrite', usage.cacheWrite); add('cacheRead', usage.cacheRead);
    if (total.input !== null || total.output !== null || total.cacheWrite !== null || total.cacheRead !== null) yield sums();
    if (!calls.length) { yield done ?? {type: 'done', reason: null}; return; }
    stopped();
    const stop = shouldStop?.();
    if (stop) { yield {type: 'tool-limit', reason: stop}; yield {type: 'done', reason: 'stopped'}; return; }
    if (round > maxRounds) { yield {type: 'tool-limit', reason: `ZIGi stopped after ${maxRounds} rounds of looking up your records. Ask a narrower question, or send it again.`}; yield {type: 'done', reason: 'tool-rounds'}; return; }
    if (calls.length > MAX_CALLS_PER_ROUND) { yield {type: 'tool-limit', reason: `ZIGi stopped: your AI asked for ${calls.length} lookups at once (the limit is ${MAX_CALLS_PER_ROUND}). Ask a narrower question.`}; yield {type: 'done', reason: 'tool-calls'}; return; }
    if (calls.every(c => asked.has(keyOf(c)))) { yield {type: 'tool-limit', reason: 'ZIGi stopped: your AI asked for the same records again.'}; yield {type: 'done', reason: 'tool-repeat'}; return; }
    const results: ChatMessage[] = [];
    for (const call of calls) {
      asked.add(keyOf(call));
      const args = argsOf(call.arguments);
      const name = clean(call.name, 60), title = toolByName(call.name)?.title ?? name;
      let result: ToolResult = args === undefined ? refuse(name, title, 'arguments', 'The arguments were not a JSON object.') : runTool(call.name, args ?? {}, env);
      let body = toolText(result, env);
      if (used + body.length > answerChars) {
        result = refuse(call.name, result.label, 'range', `The data cap for one answer (${answerChars.toLocaleString('en-US')} characters) is reached. Answer with what you have, or say which narrower period to look at.`);
        body = toolText(result, env);
      }
      used += body.length;
      yield {type: 'tool-result', call, args: args ?? null, result, text: body};
      results.push({role: 'tool', toolCallId: call.id, name: call.name, content: body});
    }
    messages = [...messages, {role: 'assistant', content: text, toolCalls: calls, ...(raw !== undefined ? {raw} : {})}, ...results];
  }
}
