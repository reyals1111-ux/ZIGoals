import {expect, test} from 'vitest';
import {runWithTools} from '../tool-loop';
import {toolEnv} from './env';
import {gatesFor, showcaseSources} from './fixtures';
import {toolsUnsupported, TOOLS_NEED_RESPONSES_API} from './model-support';
import type {ChatEvent, ChatRequest} from '../types';

/**
 * Owner follow-up 2 (NOVA.md §1.7): OpenAI's gpt-6.1-sol and gpt-6.1-terra call tools only through the Responses API,
 * which ZIGi's OpenAI adapter does not use; the tool loop offers them no tools and says so once. Every other model, and
 * the same names on another route, keep their tools.
 */
test('which models get no tools: only gpt-6.1-sol and gpt-6.1-terra on OpenAI\'s own wire (snapshots too)', () => {
  for (const model of ['gpt-6.1-sol', 'gpt-6.1-terra', 'GPT-6.1-Sol', 'gpt-6.1-terra-2026-09-30']) expect(toolsUnsupported('openai', model), model).toBe(TOOLS_NEED_RESPONSES_API);
  for (const model of ['gpt-6-astra', 'gpt-6-luna', 'gpt-6.1-solar', 'gpt-5.2', '']) expect(toolsUnsupported('openai', model), model).toBeNull();
  expect(toolsUnsupported('openrouter', 'openai/gpt-6.1-sol')).toBeNull(); expect(toolsUnsupported('anthropic', 'gpt-6.1-sol')).toBeNull(); expect(toolsUnsupported(null, null)).toBeNull();
});
test('the loop sends such a model no tools, says so once, and still answers', async () => {
  const requests: ChatRequest[] = [];
  const stream = async function* (r: ChatRequest): AsyncGenerator<ChatEvent> { requests.push(r); yield {type: 'text', delta: 'From the attached records.'}; yield {type: 'done', reason: 'stop'}; };
  const run = async (model: string) => { requests.length = 0; const events = []; for await (const e of runWithTools({provider: 'openai', model, system: 'x', messages: [{role: 'user', content: 'Hi'}], maxOutputTokens: 64, key: null, env: toolEnv(showcaseSources(), gatesFor(true), 'provider'), stream})) events.push(e); return events; };
  const sol = await run('gpt-6.1-sol');
  expect(requests).toHaveLength(1); expect(requests[0]!.tools).toBeUndefined();
  expect(sol.filter(e => e.type === 'tool-limit')).toEqual([{type: 'tool-limit', reason: TOOLS_NEED_RESPONSES_API}]);
  expect(sol.some(e => e.type === 'text')).toBe(true);
  const astra = await run('gpt-6-astra');
  expect(requests[0]!.tools?.length).toBeGreaterThan(10); expect(astra.some(e => e.type === 'tool-limit')).toBe(false);
});
