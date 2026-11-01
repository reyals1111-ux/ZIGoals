import {expect, test} from 'vitest';
import {paramsOf, suggestModel} from './suggest-model';

/** Session AK P4 (FIRST_RUN_REVIEW FR-11): a found local model is chosen already, so Connect works at once. */
const found = [{id: 'llama3.2:3b'}, {id: 'qwen3:8b'}];
test('the guide\'s pick when it is installed', () => {
  expect(suggestModel([...found, {id: 'qwen3.5:9b'}], {prefer: ['qwen3.5:9b'], maxParams: 12})).toBe('qwen3.5:9b');
  expect(suggestModel([{id: 'qwen3.5:9b:latest'}], {prefer: ['qwen3.5:9b']})).toBe('qwen3.5:9b:latest');
});
test('else the largest that fits the memory chosen, else the first', () => {
  expect(suggestModel(found, {prefer: ['qwen3.5:9b'], maxParams: 12})).toBe('qwen3:8b');
  expect(suggestModel(found, {prefer: ['qwen3.5:4b'], maxParams: 4})).toBe('llama3.2:3b');
  expect(suggestModel([{id: 'mistral'}, {id: 'phi'}], {maxParams: 12})).toBe('mistral');
  expect(suggestModel([], {maxParams: 12})).toBeNull();
});
test('a model running in a cloud is not suggested while a local one is listed', () => {
  expect(suggestModel([{id: 'gemma4:31b-cloud', cloud: true}, {id: 'llama3.2:3b'}], {maxParams: 72})).toBe('llama3.2:3b');
  expect(suggestModel([{id: 'gemma4:31b-cloud', cloud: true}])).toBe('gemma4:31b-cloud');
});
test('sizes are read from the names', () => {
  expect(paramsOf('qwen3:8b')).toBe(8); expect(paramsOf('llama3.2:3b')).toBe(3); expect(paramsOf('Qwen3.5-9B-Q4_K_M.gguf')).toBe(9);
  expect(paramsOf('gpt-oss:20b')).toBe(20); expect(paramsOf('mistral')).toBeNull(); expect(paramsOf('qwen3.6:35b-a3b')).toBe(35);
});
