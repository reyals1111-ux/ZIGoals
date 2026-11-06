import {describe, expect, test} from 'vitest';
import {defaultAiSettings} from '../ai/settings';
import {checkBrain} from './setup-checks';
import {LOCAL_SERVERS, NOT_OLLAMA, ollamaTagsOk, ollamaVersionOk, probeServer, verifyOllama} from './local-servers';

/**
 * Session AL (lane L7; Berlin BN-035/BN-036, N-BN-15): a server on Ollama's port is Ollama only when it answers like Ollama.
 * Berlin's mock answered /api/version with "0.0.0-mock" and /api/tags with a bare "mock:latest"; it got a green check.
 */
const BASE = 'http://127.0.0.1:11434';
const json = (body: unknown) => new Response(JSON.stringify(body), {status: 200, headers: {'content-type': 'application/json'}});
const REAL_TAG = {name: 'qwen2.5:0.5b', model: 'qwen2.5:0.5b', modified_at: '2026-11-03T22:00:00Z', size: 397_821_319, digest: 'a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67', details: {format: 'gguf', family: 'qwen2', parameter_size: '494.03M', quantization_level: 'Q4_K_M'}};
function server(version: unknown, tags: unknown): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/version')) return json(version);
    if (url.endsWith('/api/tags')) return json(tags);
    return new Response('', {status: 404});
  }) as typeof fetch;
}
describe('the shape of a real Ollama', () => {
  test('versions', () => {
    expect(ollamaVersionOk({version: '0.40.14'})).toBe('0.40.14');
    expect(ollamaVersionOk({version: '0.12.3-rc1'})).toBe('0.12.3-rc1');
    for (const v of [{version: '0.0.0-mock'}, {version: '0.0.0'}, {version: 'mock'}, {version: 1}, {}, null, {version: '1.2.3-fake'}]) expect(ollamaVersionOk(v), JSON.stringify(v)).toBeNull();
  });
  test('model lists', () => {
    expect(ollamaTagsOk({models: [REAL_TAG]})).toBe(true);
    expect(ollamaTagsOk({models: []})).toBe(true); // Ollama with nothing pulled yet
    expect(ollamaTagsOk({models: [{name: 'gemma4:31b-cloud', modified_at: '2026-10-30T10:00:00Z', remote_host: 'https://ollama.com:443', remote_model: 'gemma4:31b'}]})).toBe(true);
    expect(ollamaTagsOk({models: [{name: 'mock:latest'}]})).toBe(false);
    expect(ollamaTagsOk({models: [{name: 'mock:latest', model: 'mock:latest', modified_at: '2026-11-03T22:00:00Z', size: 1, digest: 'abc'}]})).toBe(false);
    expect(ollamaTagsOk({data: []})).toBe(false);
  });
});
describe('the setup refuses a server that is not Ollama (BN-035)', () => {
  const mock = server({version: '0.0.0-mock'}, {models: [{name: 'mock:latest', model: 'mock:latest'}]}), real = server({version: '0.40.14'}, {models: [REAL_TAG]});
  test('verifyOllama', async () => {
    expect(await verifyOllama(BASE, {fetcher: mock})).toEqual({ok: false, message: NOT_OLLAMA(BASE)});
    expect(await verifyOllama(BASE, {fetcher: real})).toEqual({ok: true, version: '0.40.14'});
    expect(NOT_OLLAMA(BASE)).toContain('it is not Ollama'); expect(NOT_OLLAMA(BASE)).toContain('port 11434'); expect(NOT_OLLAMA(BASE)).toContain('Nothing was sent to it.');
  });
  test('the scan (with verify) does not offer the mock; a real Ollama is found', async () => {
    const ollama = LOCAL_SERVERS[0]!;
    expect(await probeServer(ollama, {fetcher: mock, verify: true})).toMatchObject({found: false, reason: 'not-ollama'});
    expect(await probeServer(ollama, {fetcher: real, verify: true})).toMatchObject({found: true, version: '0.40.14', models: [{id: 'qwen2.5:0.5b', cloud: false}]});
  });
  test('the brain check never turns green for the mock', async () => {
    const settings = {...defaultAiSettings(), enabled: true, mode: 'local' as const, provider: 'local' as const, model: 'mock:latest', localServer: 'ollama' as const, baseUrl: BASE};
    const result = await checkBrain({settings, mode: 'strict', key: null, fetcher: mock, onDevice: 'unavailable', onDeviceOn: false});
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain('it is not Ollama');
    const ok = await checkBrain({settings: {...settings, model: 'qwen2.5:0.5b'}, mode: 'strict', key: null, fetcher: real, onDevice: 'unavailable', onDeviceOn: false});
    expect(ok.ok).toBe(true);
  });
});
