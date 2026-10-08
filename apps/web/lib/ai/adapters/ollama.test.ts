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
