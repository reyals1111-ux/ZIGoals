import {describe, expect, test} from 'vitest';
import {guardRequest, sendDecision} from '../ai/privacy-mode';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {askHermes, askHermesText, HERMES_DEFAULT_BASE, hermesNeedsRedaction, hermesRequest, hermesStatus, hermesSummary, hermesTestLine, isHermesBase, normalizeHermesBase, NOVA_HERMES, NOVA_HERMES_KEY, testHermes, withCheck, type HermesTest} from './hermes';
import {NOVA_SETUP_KEY} from './setup';
import {previewFor} from './privacy-mode';

/** A MOCK Hermes API server (owner N11: /health → {"status":"ok"}, /v1/models lists hermes-agent, bearer key), answered here. */
const KEY = 'hermes-test-key-0123456789abcdef';
type Mode = 'up' | 'down' | 'cors' | 'other-server';
function mockHermes(mode: Mode = 'up') {
  const seen: {url: string; mode?: RequestMode; auth?: string; body?: string}[] = [];
  let t = 1000;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), headers = (init?.headers ?? {}) as Record<string, string>;
    seen.push({url, mode: init?.mode, auth: headers.authorization, body: init?.body ? String(init.body) : undefined}); t += 21;
    if (mode === 'down') throw new TypeError('Failed to fetch');
    if (mode === 'cors') { if (init?.mode === 'no-cors') return new Response(null, {status: 200}); throw new TypeError('Failed to fetch'); }
    if (!url.startsWith('http://127.0.0.1:8642') && !url.startsWith('http://localhost:8642')) throw new TypeError('Failed to fetch');
    if (url.endsWith('/health')) return mode === 'other-server' ? new Response('<html>', {status: 200}) : Response.json({status: 'ok'});
    if (headers.authorization !== `Bearer ${KEY}`) return new Response(JSON.stringify({error: {message: 'Invalid API key'}}), {status: 401});
    if (url.endsWith('/v1/models')) return Response.json({object: 'list', data: [{id: 'hermes-agent', object: 'model'}]});
    if (url.endsWith('/v1/chat/completions')) {
      const chunk = (content: string, finish: string | null = null) => `data: ${JSON.stringify({choices: [{delta: {content}, finish_reason: finish}]})}\n\n`;
      return new Response(`${chunk('Here is ')}${chunk('your week.')}${chunk('', 'stop')}data: [DONE]\n\n`, {status: 200, headers: {'content-type': 'text/event-stream'}});
    }
    return new Response('', {status: 404});
  }) as typeof fetch;
  return {fetcher, seen, now: () => t};
}
const store = (values: Record<string, string> = {}) => { const m = new Map(Object.entries(values)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v)}; };

describe('the gateway address', () => {
  test('the default and the forms people paste, localhost only', () => {
    expect(normalizeHermesBase('')).toBe(HERMES_DEFAULT_BASE);
    expect(normalizeHermesBase('http://127.0.0.1:8642/v1')).toBe('http://127.0.0.1:8642');
    expect(normalizeHermesBase('localhost:8642/v1/')).toBe('http://localhost:8642');
    expect(() => normalizeHermesBase('http://192.168.1.20:8642/v1')).toThrow(/this computer/);
    expect(() => normalizeHermesBase('https://example.com/v1')).toThrow();
    expect(isHermesBase('http://127.0.0.1:8642', null)).toBe(true);
    expect(isHermesBase('http://127.0.0.1:9000', {baseUrl: 'http://127.0.0.1:9000'})).toBe(true);
    expect(isHermesBase('http://127.0.0.1:11434', null)).toBe(false);
  });
});

describe('the live test, with a MOCK Hermes server', () => {
  test('up: /health then /v1/models with the bearer key, naming the model and the time', async () => {
    const {fetcher, seen, now} = mockHermes(), t = await testHermes('http://127.0.0.1:8642/v1', KEY, {fetcher, now});
    expect(t).toMatchObject({ok: true, health: 'ok', models: ['hermes-agent'], model: 'hermes-agent'});
    expect(seen.map(s => s.url)).toEqual(['http://127.0.0.1:8642/health', 'http://127.0.0.1:8642/v1/models']);
    expect(seen[1]!.auth).toBe(`Bearer ${KEY}`);
    expect(hermesTestLine(t)).toMatch(/^Hermes is reachable on this computer: hermes-agent answered in \d+ ms\.$/);
  });
  test('wrong key, gateway down, CORS refusal, the browser\'s permission off, another server', async () => {
    expect(await testHermes('', 'wrong', mockHermes())).toMatchObject({ok: false, problem: 'wrong-key', steps: expect.arrayContaining([expect.stringMatching(/API_SERVER_KEY/)])});
    expect(await testHermes('', KEY, mockHermes('down'))).toMatchObject({ok: false, problem: 'gateway-down', steps: expect.arrayContaining([expect.stringMatching(/hermes gateway/)])});
    const cors = mockHermes('cors'), c = await testHermes('', KEY, cors);
    expect(c).toMatchObject({ok: false, problem: 'cors'});
    expect(cors.seen.map(s => s.mode)).toEqual(['cors', 'no-cors']);
    expect(await testHermes('', KEY, {...mockHermes('down'), permission: async () => 'denied'})).toMatchObject({problem: 'permission'});
    expect(await testHermes('', KEY, mockHermes('other-server'))).toMatchObject({problem: 'not-hermes'});
  });
  test('the record keeps the last check for NOVA\'s panels; hermesStatus reads it', async () => {
    const s = store(), {fetcher, now} = mockHermes(), t = await testHermes('', KEY, {fetcher, now});
    updateDeviceRecord(s, NOVA_HERMES, r => withCheck(r, t, HERMES_DEFAULT_BASE, new Date('2026-11-01T10:00:00Z')));
    const read = readDeviceRecord(s, NOVA_HERMES).data;
    expect(hermesStatus(read)).toMatchObject({connected: true, reachable: true, model: 'hermes-agent', localModelConfirmed: false, checkedAt: '2026-11-01T10:00:00.000Z'});
    expect(hermesStatus()).toEqual({connected: false, reachable: false, localModelConfirmed: false});
    const down = withCheck(read, {ok: false, problem: 'gateway-down', title: '', steps: [], ms: 3} as HermesTest, HERMES_DEFAULT_BASE, new Date());
    expect(hermesStatus(down)).toMatchObject({reachable: false, model: 'hermes-agent'});
    expect(JSON.stringify(read)).not.toContain(KEY);
  });
});

describe('streaming and delegation through the privacy guard', () => {
  test('"Ask my Hermes" streams the reply on the local OpenAI-compatible wire', async () => {
    const {fetcher, seen} = mockHermes(), r = hermesRequest({base: 'http://127.0.0.1:8642/v1', key: KEY, model: 'hermes-agent', system: 'S', question: 'Plan my week from my goals', fetcher});
    const events = []; for await (const e of askHermes(r, async x => x)) events.push(e);
    expect(events.filter(e => e.type === 'text').map(e => (e as {delta: string}).delta).join('')).toBe('Here is your week.');
    expect(seen.at(-1)!.url).toBe('http://127.0.0.1:8642/v1/chat/completions');
    expect(seen.at(-1)!.auth).toBe(`Bearer ${KEY}`);
  });
  test('the privacy rule: an unconfirmed Hermes is redacted in Strict and Guarded, sent as it is once confirmed local, in Relaxed or with no mode', async () => {
    expect(hermesNeedsRedaction('strict', false)).toBe(true);
    expect(hermesNeedsRedaction('guarded', false)).toBe(true);
    expect(hermesNeedsRedaction('strict', true)).toBe(false);
    expect(hermesNeedsRedaction('relaxed', false)).toBe(false);
    expect(hermesNeedsRedaction(null, false)).toBe(false);
    expect(sendDecision('strict', {provider: 'local', hermesUnconfirmed: true})).toBe('redact');
    expect(sendDecision('strict', {provider: 'local', hermesUnconfirmed: false})).toBe('send');
    const question = 'Plan dinner with my sister Anna; budget €184.50';
    for (const [mode, confirmed, expected] of [['strict', false, '[name]'], ['guarded', false, '[name]'], ['strict', true, 'Anna'], ['relaxed', false, 'Anna']] as const) {
      const {fetcher, seen} = mockHermes();
      const s = store({[NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: mode}), [NOVA_HERMES_KEY]: JSON.stringify({version: 1, baseUrl: HERMES_DEFAULT_BASE, localModelConfirmed: confirmed})});
      const text = await askHermesText(hermesRequest({base: HERMES_DEFAULT_BASE, key: KEY, model: 'hermes-agent', system: 'S', question, fetcher}), r => guardRequest(r, {storage: s}));
      expect(text).toBe('Here is your week.');
      expect(seen.at(-1)!.body).toContain(expected);
    }
  });
  test('the preview names Hermes and shows the redacted text', () => {
    const p = previewFor({message: 'Lunch with my sister Anna', mode: 'strict', provider: 'local', hermesUnconfirmed: true});
    expect(p.line).toBe('NOVA is about to send this to your Hermes Agent.');
    expect(p.message).toBe('Lunch with my sister [name]');
  });
});

describe('"Give Hermes my ZIGoals summary"', () => {
  const pack = '## Goals\n| Goal | Now |\n| Emergency Fund | 4321.99 EUR |\nMy sister Anna helps.';
  test('redacted unless the mode allows it as it is; nothing is sent (no fetch at all)', () => {
    const guarded = hermesSummary({packMarkdown: pack, mode: 'guarded', confirmedLocal: false});
    expect(guarded.redacted).toBe(true);
    expect(guarded.markdown).toContain('about 4,300 EUR');
    expect(guarded.markdown).toContain('[name]');
    expect(guarded.markdown.startsWith('# My ZIGoals summary')).toBe(true);
    expect(hermesSummary({packMarkdown: pack, mode: 'strict', confirmedLocal: true}).markdown).toContain('4321.99 EUR');
    expect(hermesSummary({packMarkdown: pack, mode: null, confirmedLocal: false}).redacted).toBe(false);
  });
});

describe('research facts (HERMES_AGENT.md, v0.22.5)', () => {
  test('/health with platform and version; 429 and 503 read as busy', async () => {
    const health = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/health')) return Response.json({status: 'ok', platform: 'hermes-agent', version: '0.22.5'});
      return (init?.headers as Record<string, string>)?.authorization === `Bearer ${KEY}` ? new Response('{}', {status: 429}) : new Response('{}', {status: 401});
    }) as typeof fetch;
    expect(await testHermes('', KEY, {fetcher: health})).toMatchObject({ok: false, problem: 'busy'});
    const {fetcher, now} = mockHermes();
    const withVersion = (async (i: RequestInfo | URL, init?: RequestInit) => String(i).endsWith('/health') ? Response.json({status: 'ok', platform: 'hermes-agent', version: '0.22.5'}) : fetcher(i, init)) as typeof fetch;
    const t = await testHermes('', KEY, {fetcher: withVersion, now});
    expect(t).toMatchObject({ok: true, version: '0.22.5'});
    expect(hermesTestLine(t)).toMatch(/^Hermes 0\.22\.5 is reachable on this computer: hermes-agent answered in \d+ ms\.$/);
  });
  test('ZIGi\'s tool definitions never go to a connected Hermes; they still go to other local servers', async () => {
    const s = store({[NOVA_HERMES_KEY]: JSON.stringify({version: 1, baseUrl: HERMES_DEFAULT_BASE})});
    const tools = [{name: 'list_goals', description: 'd', parameters: {type: 'object'}}];
    const toHermes = await guardRequest({...hermesRequest({base: HERMES_DEFAULT_BASE, key: KEY, model: 'hermes-agent', system: 'S', question: 'q'}), tools}, {storage: s});
    expect(toHermes.tools).toBeUndefined();
    const ollama = {...hermesRequest({base: 'http://127.0.0.1:11434', key: null, model: 'qwen3.5:9b', system: 'S', question: 'q'}), tools};
    expect(await guardRequest(ollama, {storage: s})).toBe(ollama);
  });
});
