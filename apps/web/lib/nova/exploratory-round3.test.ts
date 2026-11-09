import 'fake-indexeddb/auto';
import {describe, expect, test} from 'vitest';
import {LOCAL_SERVERS, probeServer, scanLine} from './local-servers';
import {AI_KEYS_DATABASE, dropMemoryKeys, hasRememberedKey, readKey, rememberKey} from '../ai/keys';
import {hermesKeyToBrain, keepHermesKey} from './hermes-keys';
import {testHermes, withCheck, type HermesTest} from './hermes';
import {hermesCheckLine, hermesStatus} from './hermes-record';

/**
 * Session AK lane P7: exploratory round 3 (docs/review/session-ak/EXPLORATORY_ROUND3.md), the bugs a unit test can hold.
 * Every server here is a MOCK answered in the test; nothing is contacted.
 */
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
const [OLLAMA, LMSTUDIO] = [LOCAL_SERVERS[0]!, LOCAL_SERVERS[1]!];

const KEY1 = 'hermes-old-key-0123456789abcdef', KEY2 = 'hermes-new-key-fedcba9876543210';
const wipeKeys = async () => { dropMemoryKeys(); await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(AI_KEYS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); };
describe('EX3-4: a Hermes brain sends the key that works now', () => {
  test('a new key tested in the guide reaches the brain\'s slot, kept as the guide keeps it', async () => {
    await wipeKeys();
    await keepHermesKey('local', KEY1, true);
    expect(await hermesKeyToBrain('local')).toBe(true);
    expect(await readKey('local', 'local')).toBe(KEY1);
    // Hermes's API_SERVER_KEY changed: the guide tests the new one (remembered again), and the brain follows.
    await keepHermesKey('local', KEY2, true);
    await hermesKeyToBrain('local');
    expect(await readKey('local', 'local')).toBe(KEY2);
    dropMemoryKeys(); // a reload
    expect(await readKey('local', 'local')).toBe(KEY2);
    await wipeKeys();
  });
  test('a key not to be remembered is gone on reload: no older sealed key comes back in its place', async () => {
    await wipeKeys();
    await rememberKey('local', 'hermes', KEY1); await rememberKey('local', 'local', KEY1);
    await keepHermesKey('local', KEY2, false);
    expect(await hermesKeyToBrain('local')).toBe(false);
    expect(await readKey('local', 'local')).toBe(KEY2);
    expect(await hasRememberedKey('local', 'hermes')).toBe(false);
    dropMemoryKeys();
    expect(await readKey('local', 'hermes')).toBeNull();
    expect(await readKey('local', 'local')).toBeNull();
    // The Showcase never seals a key.
    await keepHermesKey('showcase', KEY1, true);
    expect(await hasRememberedKey('showcase', 'hermes')).toBe(false);
    expect(await readKey('showcase', 'hermes')).toBe(KEY1);
    await wipeKeys();
  });
});

describe('EX3-3: "Find models on this computer" names what really happened', () => {
  test('a server that asks for a key: said so, never "check it in Settings … create a new one at your provider"', async () => {
    const fetcher = (async () => json({error: {message: 'Unauthorized'}}, 401)) as typeof fetch;
    const result = await probeServer(LMSTUDIO, {fetcher, ms: 500});
    expect(result).toMatchObject({found: false, reason: 'key'});
    const line = scanLine(result);
    expect(line).toMatch(/^LM Studio is running at http:\/\/localhost:1234, but asks for an API key/);
    expect(line).not.toMatch(/Settings|provider/);
  });
  test('a server that is running but does not allow this site (CORS): its own fix, not "nothing answered"', async () => {
    const modes: (RequestMode | undefined)[] = [];
    // The browser hides a CORS-refused answer from the page (a TypeError); a no-cors request gets an opaque answer.
    const fetcher = (async (_: RequestInfo | URL, init?: RequestInit) => { modes.push(init?.mode); if (init?.mode === 'no-cors') return new Response(null, {status: 200}); throw new TypeError('Failed to fetch'); }) as typeof fetch;
    const result = await probeServer(OLLAMA, {fetcher, ms: 500});
    expect(result).toMatchObject({found: false, reason: 'origin'});
    expect(scanLine(result)).toMatch(/^Ollama is running, but does not allow this site yet: set OLLAMA_ORIGINS/);
    // Session AL (LA-012, deliberate): the opaque knock comes first, so a scan with nothing running sends one request per server.
    expect(modes).toEqual(['no-cors', 'cors']);
    const lm = await probeServer(LMSTUDIO, {fetcher, ms: 500});
    expect(scanLine(lm)).toMatch(/Enable CORS/);
  });
  test('nothing listening: "nothing answered", and only then', async () => {
    const fetcher = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
    const result = await probeServer(OLLAMA, {fetcher, ms: 500});
    expect(result).toMatchObject({found: false, reason: 'unreachable'});
    expect(scanLine(result)).toBe('Ollama: nothing answered at http://127.0.0.1:11434 (not running)');
  });
});

describe('EX3-5: the Hermes test with no key at all', () => {
  test('a gateway that wants a key when none was sent says so, never "Hermes refused the key"', async () => {
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input), auth = (init?.headers as Record<string, string> | undefined)?.authorization;
      if (url.endsWith('/health')) return json({status: 'ok', platform: 'hermes-agent', version: '0.22.5'});
      return auth === 'Bearer right-key-0123456789abcdef' ? json({object: 'list', data: [{id: 'hermes-agent'}]}) : json({error: {message: 'Invalid gateway API key (API_SERVER_KEY)'}}, 401);
    }) as typeof fetch;
    const none = await testHermes('', null, {fetcher});
    expect(none).toMatchObject({ok: false, problem: 'needs-key'});
    expect(none.ok ? '' : none.title).not.toMatch(/refused/);
    expect(none.ok ? '' : none.steps.join(' ')).toMatch(/API_SERVER_KEY/);
    expect(await testHermes('', 'wrong-key-0123456789abcdef', {fetcher})).toMatchObject({ok: false, problem: 'wrong-key', title: 'Hermes refused the key.'});
    expect(await testHermes('', 'right-key-0123456789abcdef', {fetcher})).toMatchObject({ok: true, model: 'hermes-agent'});
  });
});

describe('EX3-6: a Hermes that never answered is not "your Hermes"', () => {
  const down = {ok: false, problem: 'gateway-down', title: '', steps: [], ms: 3} as HermesTest;
  const up = {ok: true, health: 'ok', version: '0.22.5', models: ['hermes-agent'], model: 'hermes-agent', ms: 12} as HermesTest;
  test('a first test that fails saves no gateway (NOVA lists no Hermes agent); one that passes does; a later failure keeps it', () => {
    const failed = withCheck({version: 1}, down, 'http://127.0.0.1:8642', new Date('2026-11-01T10:00:00Z'));
    expect(hermesStatus(failed).connected).toBe(false);
    expect(failed.lastCheck).toMatchObject({reachable: false, problem: 'gateway-down'});
    const linked = withCheck(failed, up, 'http://127.0.0.1:8642', new Date('2026-11-01T10:01:00Z'));
    expect(hermesStatus(linked)).toMatchObject({connected: true, reachable: true, model: 'hermes-agent'});
    const later = withCheck(linked, down, 'http://127.0.0.1:9999', new Date('2026-11-01T10:02:00Z'));
    expect(later.baseUrl).toBe('http://127.0.0.1:8642');
    expect(hermesStatus(later)).toMatchObject({connected: true, reachable: false});
  });
  test('EX3-5: a gateway that refused or wanted the key was reached: the status line says so', () => {
    const status = (problem: string) => hermesStatus({version: 1, baseUrl: 'http://127.0.0.1:8642', lastCheck: {at: '2026-11-01T10:00:00.000Z', reachable: false, problem}});
    expect(hermesCheckLine(status('wrong-key'))).toBe('Gateway answered at the last check, but refused the key');
    expect(hermesCheckLine(status('needs-key'))).toMatch(/asks for its key/);
    expect(hermesCheckLine(status('gateway-down'))).toBe('Gateway not reachable at the last check');
  });
});
