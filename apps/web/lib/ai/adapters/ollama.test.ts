import {expect, test} from 'vitest';
import {ollamaBody} from './ollama';

// Session X-Local Part 6d: Ollama's body carries think:false unless the request asks for thought; tools map as before.
const base = {model: 'gemma4:12b', system: 'You are ZIGi.', messages: [{role: 'user' as const, content: 'Hi'}], maxOutputTokens: 512};
test('think is off unless asked, so a thinking model answers instead of spending its cap on hidden thought', () => {
  expect(ollamaBody(base)).toMatchObject({model: 'gemma4:12b', stream: true, think: false, options: {num_predict: 512}});
  expect(ollamaBody({...base, think: true})).toMatchObject({think: true});
  expect(ollamaBody({...base, think: false})).toMatchObject({think: false});
  expect((ollamaBody(base).messages as unknown[])[0]).toEqual({role: 'system', content: 'You are ZIGi.'});
});
test('tools are sent in Ollama\'s shape only when given', () => {
  expect(ollamaBody(base)).not.toHaveProperty('tools');
  const body = ollamaBody({...base, tools: [{name: 'water', description: 'Water per day', parameters: {type: 'object', properties: {range: {type: 'string'}}}}]});
  expect(body.tools).toEqual([{type: 'function', function: {name: 'water', description: 'Water per day', parameters: {type: 'object', properties: {range: {type: 'string'}}}}}]);
});

// Session AL (lane L7; Berlin BN-034 BLOCKER, BN-042): num_ctx on every request, a first-token wait that grows with the
// prompt, and schemas Ollama accepts (no `prefixItems` / boolean `items`).
import {estimateTokens as alEstimate, firstTokenMs as alFirst, NUM_CTX as AL_NUM_CTX, ollamaBody as alBody, ollamaContextSize as alCtx, ollamaSchema as alSchema} from './ollama';
import {structuredFormat as alFormat} from '../actions/repair';
import {test as alTest, expect as alExpect} from 'vitest';
alTest('BN-034: every request names its context window, sized to what it sends', () => {
  const small = {model: 'qwen2.5:0.5b', system: 'You are NOVA.', messages: [{role: 'user' as const, content: 'Hi'}], maxOutputTokens: 1024};
  alExpect((alBody(small).options as {num_ctx: number}).num_ctx).toBe(AL_NUM_CTX.min);
  const big = {...small, system: 'x'.repeat(15_044 * 3.5)}; // Berlin's measured 15,044-token prompt
  const ctx = alCtx(big);
  alExpect(ctx).toBeGreaterThanOrEqual(16_384); alExpect(ctx).toBeLessThanOrEqual(AL_NUM_CTX.max);
  alExpect(alCtx({...small, system: 'x'.repeat(400_000)})).toBe(AL_NUM_CTX.max);
  alExpect(alFirst(alEstimate(small))).toBe(60_000);
  alExpect(alFirst(alEstimate(big))).toBeGreaterThan(60_000); alExpect(alFirst(10_000_000)).toBe(240_000);
});
alTest('BN-042: the structured-output schema Ollama receives has no prefixItems and no boolean items', () => {
  const sent = JSON.stringify(alBody({model: 'm', system: 's', messages: [], maxOutputTokens: 10, format: alFormat()}).format);
  alExpect(sent).not.toContain('prefixItems'); alExpect(sent).not.toMatch(/"items":(?:false|true|\[)/);
  alExpect(alSchema({type: 'array', prefixItems: [{type: 'number'}, {type: 'number'}], items: false})).toEqual({type: 'array', items: {type: 'number'}, minItems: 2, maxItems: 2});
  const tools = alBody({model: 'm', system: 's', messages: [], maxOutputTokens: 10, tools: [{name: 't', description: 'd', parameters: {type: 'object', properties: {r: {type: 'array', prefixItems: [{type: 'number'}], items: false}}}}]}).tools as {function: {parameters: unknown}}[];
  alExpect(JSON.stringify(tools[0]!.function.parameters)).not.toContain('prefixItems');
});
