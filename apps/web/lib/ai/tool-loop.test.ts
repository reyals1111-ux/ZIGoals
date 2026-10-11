import {expect, test} from 'vitest';
import {collectReply, streamChat} from './chat';
import {AiError} from './errors';
import {anthropicBody} from './adapters/anthropic';
import {geminiBody} from './adapters/gemini';
import {ollamaBody} from './adapters/ollama';
import {openAiBody} from './adapters/openai-compatible';
import {ANTHROPIC_STREAM, FAKE_KEY, GEMINI_STREAM, OLLAMA_STREAM} from './fixtures/mock-streams';
import {ANTHROPIC_TOOL_STREAM, GEMINI_TOOL_STREAM, OLLAMA_TOOL_STREAM, OPENAI_ANSWER_STREAM, OPENAI_BAD_TOOL_STREAM, OPENAI_TOOL_STREAM, XAI_TOOL_STREAM} from './fixtures/tool-streams';
import {MAX_CALLS_PER_ROUND, MAX_TOOL_ROUNDS, runWithTools, toolsFor, type LoopEvent} from './tool-loop';
import {toolEnv, type ToolEnv} from './tools/env';
import {gatesFor, SENTINEL, sentinelsIn, showcaseSources, withHandHealth, withSentinels} from './tools/fixtures';
import {HEALTH_CLOSED} from './tools/format';
import {runTool, toolText} from './tools/registry';
import type {ChatEvent, ChatRequest, ToolSpec} from './types';

// Session V Part 6 (native read-only tool calling, owner decision D1): every wire's tool format against MOCK streams
// shaped after the official documentation (read 2026-10-05), and the loop's rules: rounds, repeats, bad calls, the
// data cap, Stop, a sensitive screen, and the Health gate. No network: every answer is a fixture.
type Call = {url: string; body: Record<string, unknown>};
function body(text: string, size = 13): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text); let offset = 0;
  return new ReadableStream({pull(controller) { if (offset >= bytes.length) { controller.close(); return; } controller.enqueue(bytes.slice(offset, offset + size)); offset += size; }});
}
/** A fetcher that answers each request with the next fixture and records every request body. */
function sequence(answers: (string | Response)[], contentType = 'text/event-stream') {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown>});
    const next = answers[calls.length - 1];
    if (next === undefined) throw new Error(`MOCK: no answer for request ${calls.length}`);
    return typeof next === 'string' ? new Response(body(next), {status: 200, headers: {'content-type': contentType}}) : next;
  };
  return {calls, fetcher};
}
const env = (health = true, sources = withHandHealth(withSentinels(showcaseSources()))): ToolEnv => toolEnv(sources, gatesFor(health), 'provider');
const chat = (provider: ChatRequest['provider'], fetcher: typeof fetch, extra: Partial<ChatRequest> = {}): Omit<ChatRequest, 'tools'> => ({provider, model: 'mock-model', system: 'MOCK system prompt', messages: [{role: 'user', content: 'How many minutes did I meditate this month?'}], maxOutputTokens: 512, key: FAKE_KEY, fetcher, ...extra});
async function drain(events: AsyncIterable<LoopEvent>) {
  const out: LoopEvent[] = [];
  for await (const event of events) out.push(event);
  return {events: out, text: out.flatMap(e => e.type === 'text' ? [e.delta] : []).join(''), results: out.flatMap(e => e.type === 'tool-result' ? [e] : []), limit: out.find(e => e.type === 'tool-limit'), done: out.at(-1)};
}
const names = (tools: unknown) => (tools as {function?: {name: string}; name?: string}[]).map(t => t.function?.name ?? t.name);
const SPEC: ToolSpec = {name: 'list_habits', description: 'MOCK: the person\'s habits.', parameters: {type: 'object', properties: {}}};

test('without tools every body is T\'s, byte for byte; with tools each wire carries them in its documented form, never forced', () => {
  const plain = {model: 'mock-model', system: 'MOCK', messages: [{role: 'user' as const, content: 'Hello'}], maxOutputTokens: 256};
  for (const flavor of ['openai', 'xai', 'openrouter', 'local'] as const) expect(JSON.stringify(openAiBody(flavor, {...plain, tools: []}))).toBe(JSON.stringify(openAiBody(flavor, plain)));
  expect(JSON.stringify(anthropicBody({...plain, tools: []}))).toBe(JSON.stringify(anthropicBody(plain)));
  expect(JSON.stringify(geminiBody({...plain, tools: []}))).toBe(JSON.stringify(geminiBody(plain)));
  expect(JSON.stringify(ollamaBody({...plain, tools: []}))).toBe(JSON.stringify(ollamaBody(plain)));
  const withTools = {...plain, tools: [SPEC]};
  for (const flavor of ['openai', 'xai', 'openrouter', 'local'] as const) {
    const sent = openAiBody(flavor, withTools);
    expect(sent.tools).toEqual([{type: 'function', function: {name: 'list_habits', description: 'MOCK: the person\'s habits.', parameters: {type: 'object', properties: {}}}}]);
    expect(sent).not.toHaveProperty('tool_choice'); expect(JSON.stringify(sent)).not.toContain('"strict"');
  }
  const anthropic = anthropicBody(withTools);
  expect(anthropic.tools).toEqual([{name: 'list_habits', description: 'MOCK: the person\'s habits.', input_schema: {type: 'object', properties: {}}}]);
  expect(anthropic).not.toHaveProperty('tool_choice');
  const gemini = geminiBody(withTools);
  expect(gemini.tools).toEqual([{functionDeclarations: [{name: 'list_habits', description: 'MOCK: the person\'s habits.', parametersJsonSchema: {type: 'object', properties: {}}}]}]);
  expect(gemini).not.toHaveProperty('toolConfig');
  expect(ollamaBody(withTools).tools).toEqual([{type: 'function', function: {name: 'list_habits', description: 'MOCK: the person\'s habits.', parameters: {type: 'object', properties: {}}}}]);
});

test('each wire\'s stream gives whole calls: OpenAI fragments merged by index, xAI whole, Anthropic partial JSON, Gemini and Ollama whole', async () => {
  const events = async (provider: ChatRequest['provider'], stream: string, extra: Partial<ChatRequest> = {}, type?: string) => {
    const {fetcher} = sequence([stream], type);
    const out: ChatEvent[] = [];
    for await (const event of streamChat({...chat(provider, fetcher), tools: [SPEC], ...extra})) out.push(event);
    return out;
  };
  const calls = (out: ChatEvent[]) => out.flatMap(e => e.type === 'tool-call' ? [e.call] : []);
  const openai = await events('openai', OPENAI_TOOL_STREAM);
  expect(calls(openai)).toEqual([{id: 'call_MOCK_1', name: 'habit_stats', arguments: '{"habit":"Meditate","range":"this month","metric":"minutes"}'}, {id: 'call_MOCK_2', name: 'water', arguments: '{"range":"today"}'}]);
  expect(openai.at(-1)).toEqual({type: 'done', reason: 'tool_calls'}); expect(openai).toContainEqual({type: 'usage', input: 300, output: 40});
  expect(calls(await events('xai', XAI_TOOL_STREAM))).toEqual([{id: 'call_MOCK_X', name: 'list_habits', arguments: '{}'}]);
  const anthropic = await events('anthropic', ANTHROPIC_TOOL_STREAM);
  expect(anthropic.filter(e => e.type === 'text')).toEqual([{type: 'text', delta: 'MOCK: let me look that up.'}]);
  expect(calls(anthropic)).toEqual([{id: 'toolu_MOCK_1', name: 'habit_stats', arguments: '{"habit": "Meditate", "range": "this month", "metric": "minutes"}'}]);
  expect(anthropic.at(-1)).toEqual({type: 'done', reason: 'tool_use'});
  const gemini = await events('gemini', GEMINI_TOOL_STREAM);
  expect(calls(gemini)).toEqual([{id: 'gemini_0', name: 'habit_stats', arguments: '{"habit":"Meditate","range":"this month","metric":"minutes"}'}]);
  // The model's own turn, thought signature included, to be echoed back unchanged.
  expect(gemini).toContainEqual({type: 'model-turn', raw: {role: 'model', parts: [{functionCall: {name: 'habit_stats', args: {habit: 'Meditate', range: 'this month', metric: 'minutes'}}, thoughtSignature: 'MOCK-SIGNATURE-1'}]}});
  const ollama = await events('local', OLLAMA_TOOL_STREAM, {key: null, baseUrl: 'http://127.0.0.1:11434', localServer: 'ollama'}, 'application/x-ndjson');
  expect(calls(ollama)).toEqual([{id: 'ollama_0', name: 'habit_stats', arguments: '{"habit":"Meditate","range":"this month","metric":"minutes"}'}]);
  // T's readers still see a plain reply: the tool events are ignored by collectReply.
  const {fetcher} = sequence([OPENAI_TOOL_STREAM]);
  expect(await collectReply(streamChat({...chat('openai', fetcher), tools: [SPEC]}))).toEqual({text: '', usage: {input: 300, output: 40}, reason: 'tool_calls'});
});

test('the owner\'s question with OpenAI: two calls, results sent back as tool turns, then the answer; usage summed over both requests', async () => {
  const e = env(true), {calls, fetcher} = sequence([OPENAI_TOOL_STREAM, OPENAI_ANSWER_STREAM('MOCK: you meditated 300 minutes this month.')]);
  const run = await drain(runWithTools({...chat('openai', fetcher), env: e, stream: streamChat}));
  expect(calls.length).toBe(2);
  expect(names(calls[0]!.body.tools)).toEqual(toolsFor(e).map(t => t.name));
  expect(names(calls[0]!.body.tools)).toEqual(expect.arrayContaining(['habit_stats', 'water', 'list_goals', 'holdings']));
  expect(run.results.map(r => [r.call.name, r.result.ok])).toEqual([['habit_stats', true], ['water', true]]);
  expect(run.results[0]!.text).toBe(toolText(runTool('habit_stats', {habit: 'Meditate', range: 'this month', metric: 'minutes'}, e), e));
  const second = calls[1]!.body.messages as Record<string, unknown>[];
  expect(second.slice(0, 2)).toEqual([{role: 'system', content: 'MOCK system prompt'}, {role: 'user', content: 'How many minutes did I meditate this month?'}]);
  expect(second[2]).toEqual({role: 'assistant', content: null, tool_calls: [{id: 'call_MOCK_1', type: 'function', function: {name: 'habit_stats', arguments: '{"habit":"Meditate","range":"this month","metric":"minutes"}'}}, {id: 'call_MOCK_2', type: 'function', function: {name: 'water', arguments: '{"range":"today"}'}}]});
  expect(second[3]).toEqual({role: 'tool', tool_call_id: 'call_MOCK_1', content: run.results[0]!.text});
  expect(second[4]).toEqual({role: 'tool', tool_call_id: 'call_MOCK_2', content: run.results[1]!.text});
  expect(run.text).toBe('MOCK: you meditated 300 minutes this month.');
  // Running sums after each request: the last one counts both rounds.
  expect(run.events.filter(e => e.type === 'usage')).toEqual([{type: 'usage', input: 300, output: 40}, {type: 'usage', input: 820, output: 70}]);
  expect(run.done).toEqual({type: 'done', reason: 'stop'});
});

test('Anthropic: tool_use blocks after the text, all results in ONE user turn of tool_result blocks; no tool_choice; words of both rounds kept apart', async () => {
  const {calls, fetcher} = sequence([ANTHROPIC_TOOL_STREAM, ANTHROPIC_STREAM]);
  const run = await drain(runWithTools({...chat('anthropic', fetcher), env: env(true), stream: streamChat}));
  const messages = calls[1]!.body.messages as {role: string; content: unknown}[];
  expect(messages.at(-2)).toEqual({role: 'assistant', content: [{type: 'text', text: 'MOCK: let me look that up.'}, {type: 'tool_use', id: 'toolu_MOCK_1', name: 'habit_stats', input: {habit: 'Meditate', range: 'this month', metric: 'minutes'}}]});
  expect(messages.at(-1)).toEqual({role: 'user', content: [{type: 'tool_result', tool_use_id: 'toolu_MOCK_1', content: run.results[0]!.text}]});
  for (const call of calls) expect(call.body).not.toHaveProperty('tool_choice');
  expect(run.text).toBe('MOCK: let me look that up.\n\nMOCK reply from Anthropic ✓');
  // Two results in one round still make one user turn.
  const body = anthropicBody({model: 'm', system: 's', maxOutputTokens: 9, messages: [{role: 'user', content: 'q'}, {role: 'assistant', content: '', toolCalls: [{id: 'a', name: 'water', arguments: '{}'}, {id: 'b', name: 'steps', arguments: ''}]}, {role: 'tool', toolCallId: 'a', name: 'water', content: '{"x":1}'}, {role: 'tool', toolCallId: 'b', name: 'steps', content: '{"y":2}'}]});
  expect(body.messages).toEqual([{role: 'user', content: 'q'}, {role: 'assistant', content: [{type: 'tool_use', id: 'a', name: 'water', input: {}}, {type: 'tool_use', id: 'b', name: 'steps', input: {}}]}, {role: 'user', content: [{type: 'tool_result', tool_use_id: 'a', content: '{"x":1}'}, {type: 'tool_result', tool_use_id: 'b', content: '{"y":2}'}]}]);
});

test('Gemini: the model\'s turn echoed unchanged with its thought signature; results as functionResponse in a user turn', async () => {
  const {calls, fetcher} = sequence([GEMINI_TOOL_STREAM, GEMINI_STREAM]);
  const run = await drain(runWithTools({...chat('gemini', fetcher), env: env(true), stream: streamChat}));
  const contents = calls[1]!.body.contents as Record<string, unknown>[];
  expect(contents.at(-2)).toEqual({role: 'model', parts: [{functionCall: {name: 'habit_stats', args: {habit: 'Meditate', range: 'this month', metric: 'minutes'}}, thoughtSignature: 'MOCK-SIGNATURE-1'}]});
  expect(contents.at(-1)).toEqual({role: 'user', parts: [{functionResponse: {name: 'habit_stats', response: {result: JSON.parse(run.results[0]!.text)}}}]});
  expect(calls[1]!.body).not.toHaveProperty('toolConfig');
  expect(run.text).toBe('MOCK reply from Gemini ✓');
});

test('Ollama: arguments as an object both ways; results as tool turns named by the tool', async () => {
  const {calls, fetcher} = sequence([OLLAMA_TOOL_STREAM, OLLAMA_STREAM], 'application/x-ndjson');
  const run = await drain(runWithTools({...chat('local', fetcher, {key: null, baseUrl: 'http://127.0.0.1:11434', localServer: 'ollama'}), env: env(true), stream: streamChat}));
  const messages = calls[1]!.body.messages as Record<string, unknown>[];
  expect(messages.at(-2)).toEqual({role: 'assistant', content: '', tool_calls: [{type: 'function', function: {name: 'habit_stats', arguments: {habit: 'Meditate', range: 'this month', metric: 'minutes'}}}]});
  expect(messages.at(-1)).toEqual({role: 'tool', tool_name: 'habit_stats', content: run.results[0]!.text});
  expect(run.text).toBe('MOCK reply from Ollama ✓');
});

test('the Health gate closed: no Health tool is offered, a Health call is refused without reading, and no sentinel leaves in any request', async () => {
  const closed = env(false), {calls, fetcher} = sequence([OPENAI_TOOL_STREAM, OPENAI_ANSWER_STREAM('MOCK answer')]);
  const run = await drain(runWithTools({...chat('openai', fetcher), env: closed, stream: streamChat}));
  const offered = names(calls[0]!.body.tools);
  for (const health of ['water', 'steps', 'weight', 'diary_entries', 'nutrient_totals', 'fasting', 'counters', 'search_foods', 'list_recipes', 'meal_plan', 'groceries', 'body_measurements']) expect(offered).not.toContain(health);
  expect(offered).toContain('habit_stats');
  const water = run.results.find(r => r.call.name === 'water')!;
  expect(water.result).toMatchObject({ok: false, reason: 'gate', refusal: HEALTH_CLOSED});
  for (const call of calls) expect(sentinelsIn(JSON.stringify(call.body))).toEqual([]);
  expect(JSON.stringify(calls)).not.toContain(String(SENTINEL.habitValue));
  // The control: with the gate open, the same exchange carries the sentinel water.
  const open = sequence([OPENAI_TOOL_STREAM, OPENAI_ANSWER_STREAM('MOCK answer')]);
  await drain(runWithTools({...chat('openai', open.fetcher), env: env(true), stream: streamChat}));
  expect(JSON.stringify(open.calls[1]!.body)).toContain(String(SENTINEL.waterMl));
});

test('bad calls are results the model reads, not crashes: arguments that are not JSON, a tool that does not exist', async () => {
  const {calls, fetcher} = sequence([OPENAI_BAD_TOOL_STREAM, OPENAI_ANSWER_STREAM('MOCK: sorry.')]);
  const run = await drain(runWithTools({...chat('openai', fetcher), env: env(true), stream: streamChat}));
  expect(run.results.map(r => r.result.ok ? 'ok' : r.result.reason)).toEqual(['arguments', 'unknown-tool']);
  expect(run.results[0]!.result).toMatchObject({refusal: 'The arguments were not a JSON object.', label: 'Habit stats'});
  expect(run.results[1]!.text).toContain('There is no tool called \\"delete_everything\\"');
  expect((calls[1]!.body.messages as Record<string, unknown>[]).filter(m => m.role === 'tool').length).toBe(2);
  expect(run.text).toBe('MOCK: sorry.');
});

test('the loop ends: after 4 rounds, on the same calls again, on too many calls at once, at a sensitive screen, and at Stop', async () => {
  const call = (index: number, name: string, args: string) => `data: ${JSON.stringify({choices: [{index: 0, delta: {tool_calls: [{index, id: `call_${name}_${index}`, type: 'function', function: {name, arguments: args}}]}, finish_reason: null}]})}\n\n`;
  const round = (args: string) => `${call(0, 'habit_stats', args)}data: [DONE]\n\n`;
  const ranges = ['today', 'yesterday', 'this week', 'last week', 'this month', 'last month'];
  const many = sequence(ranges.map(r => round(`{"habit":"Meditate","range":"${r}"}`)));
  const rounds = await drain(runWithTools({...chat('openai', many.fetcher), env: env(true), stream: streamChat}));
  expect(MAX_TOOL_ROUNDS).toBe(4); expect(many.calls.length).toBe(5); expect(rounds.results.length).toBe(4);
  expect(rounds.limit).toEqual({type: 'tool-limit', reason: 'ZIGi stopped after 4 rounds of looking up your records. Ask a narrower question, or send it again.'});
  expect(rounds.done).toEqual({type: 'done', reason: 'tool-rounds'});
  const again = sequence([round('{"habit":"Meditate"}'), round('{ "habit": "Meditate" }')]);
  const repeat = await drain(runWithTools({...chat('openai', again.fetcher), env: env(true), stream: streamChat}));
  expect(again.calls.length).toBe(2); expect(repeat.results.length).toBe(1);
  expect(repeat.limit).toEqual({type: 'tool-limit', reason: 'ZIGi stopped: your AI asked for the same records again.'});
  const flood = sequence([Array.from({length: MAX_CALLS_PER_ROUND + 1}, (_, i) => call(i, 'list_habits', '{}')).join('') + 'data: [DONE]\n\n']);
  const tooMany = await drain(runWithTools({...chat('openai', flood.fetcher), env: env(true), stream: streamChat}));
  expect(tooMany.results).toEqual([]); expect(tooMany.done).toEqual({type: 'done', reason: 'tool-calls'});
  let sensitive = false;
  const paused = sequence([OPENAI_TOOL_STREAM]);
  const stop = await drain(runWithTools({...chat('openai', paused.fetcher), env: env(true), stream: request => { sensitive = true; return streamChat(request); }, shouldStop: () => sensitive ? 'ZIGi paused: a private form is open on this screen.' : null}));
  expect(stop.results).toEqual([]); expect(stop.limit).toEqual({type: 'tool-limit', reason: 'ZIGi paused: a private form is open on this screen.'});
  expect(stop.done).toEqual({type: 'done', reason: 'stopped'});
  // Stop while the tools run: nothing more is requested.
  const controller = new AbortController(), stopped = sequence([OPENAI_TOOL_STREAM, OPENAI_ANSWER_STREAM('never')]);
  const seen: LoopEvent[] = [];
  const error = await (async () => { for await (const event of runWithTools({...chat('openai', stopped.fetcher, {signal: controller.signal}), env: env(true), stream: streamChat})) { seen.push(event); if (event.type === 'tool-result') controller.abort(); } })().catch(e => e as AiError);
  expect(error).toBeInstanceOf(AiError); expect((error as AiError).kind).toBe('aborted');
  expect(stopped.calls.length).toBe(1);
});

test('the data cap: results past the answer\'s cap are replaced by a note the model reads; no tools, no tools field', async () => {
  const e = env(true), first = toolText(runTool('habit_stats', {habit: 'Meditate', range: 'this month', metric: 'minutes'}, e), e);
  const {calls, fetcher} = sequence([OPENAI_TOOL_STREAM, OPENAI_ANSWER_STREAM('MOCK')]);
  const run = await drain(runWithTools({...chat('openai', fetcher), env: e, stream: streamChat, answerChars: first.length + 20}));
  expect(run.results[0]!.result.ok).toBe(true);
  expect(run.results[1]!.result).toMatchObject({ok: false, reason: 'range', label: 'Water · today'});
  expect(run.results[1]!.text).toContain(`The data cap for one answer (${(first.length + 20).toLocaleString('en-US')} characters) is reached.`);
  expect(JSON.stringify(calls[1]!.body)).not.toContain(String(SENTINEL.waterMl));
  // Without tools offered (every area closed), the request is T's: no tools field at all.
  const none = sequence([OPENAI_ANSWER_STREAM('MOCK')]);
  const shut = toolEnv(showcaseSources(), gatesFor(true, 'today', '/app', {sensitive: true}), 'provider');
  expect(toolsFor(shut)).toEqual([]);
  await drain(runWithTools({...chat('openai', none.fetcher), env: shut, stream: streamChat}));
  expect(none.calls[0]!.body).not.toHaveProperty('tools');
});
