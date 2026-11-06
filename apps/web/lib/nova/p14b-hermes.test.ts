import {describe, expect, test} from 'vitest';
import {guardRequest, mapArguments, redactRequest} from '../ai/privacy-mode';
import {hermesAt, ollamaShowsCloud} from '../ai/privacy-probes';
import type {ChatRequest} from '../ai/types';
import {hideRecoveryWordsInRequest} from '../secret-guard/redact-span';
import {HERMES_FIXES} from './hermes';
import {HERMES_POWER, HERMES_SANDBOX} from './hermes-guide';
import {noModeCloudNote} from './setup-guide';
import {confirmationLapsedLine, confirmLocalModel, hermesKeyFailure, hermesPanel, hermesStatus, isHermesBase, isHermesHealth, localModelStillConfirmed, NOVA_HERMES_KEY, withSeenHermes, type NovaHermes} from './hermes-record';
import {scanStatus, type ScanResult} from './local-servers';
import {NOVA_SETUP_KEY} from './setup';

/**
 * Session AL Part 14 (lane P14-B): EXPLORATORY_ROUND3's left-overs (NOVA's panels after a refused key; a running scan
 * called "Offline"; a Hermes 401 in ZIGi's generic words) and the Z1A security review's rest (Z1A-5 copy, Z1A-6 /health,
 * Z1A-7 /api/show, I1 no mode, I3 tool-call arguments, I5 the local-model confirmation). MOCK fetchers; nothing leaves.
 */
const at = '2026-11-04T09:00:00.000Z';
describe('EX3 left-overs 1–3', () => {
  test('1: a gateway that answered but refused or wanted the key is never "Not reachable" in NOVA’s panels', () => {
    const record = (problem?: string, reachable = false): NovaHermes => ({version: 1, baseUrl: 'http://127.0.0.1:8642', lastCheck: {at, reachable, ...(problem ? {problem} : {})}});
    expect(hermesPanel(hermesStatus(record('wrong-key')))).toEqual({pill: 'Key refused', line: 'Hermes gateway answered at the last check, but refused the key', on: true});
    expect(hermesPanel(hermesStatus(record('needs-key'))).pill).toBe('Key needed');
    expect(hermesPanel(hermesStatus(record('cors'))).pill).toBe('Site not allowed');
    expect(hermesPanel(hermesStatus(record(undefined, true))).pill).toBe('Reachable');
    expect(hermesPanel(hermesStatus(record('gateway-down')))).toMatchObject({pill: 'Not reachable', on: false});
  });
  test('2: a server that answered but refused this site, wanted a key or sent an unreadable list is "Running", never "Offline"', () => {
    const server = {id: 'ollama', name: 'Ollama', baseUrl: 'http://127.0.0.1:11434', wire: 'ollama'} as unknown as ScanResult['server'];
    for (const reason of ['key', 'refused', 'origin', 'unreadable', 'not-ollama'] as const) expect(scanStatus({server, found: false, reason, message: ''}), reason).toEqual({word: 'Running', on: true});
    expect(scanStatus({server, found: false, reason: 'unreachable', message: ''})).toEqual({word: 'Offline', on: false});
    expect(scanStatus({server, found: true, models: []} as ScanResult)).toEqual({word: 'Online', on: true});
  });
  test('3: a 401 from the person’s Hermes says what Hermes needs and where to paste the key, in the guide’s words', () => {
    const refused = hermesKeyFailure('bad-key', true)!;
    expect(refused.title).toBe(HERMES_FIXES['wrong-key'].title);
    expect(refused.steps.join(' ')).toMatch(/hermes config get API_SERVER_KEY --raw.*NOVA → Connect your Hermes Agent/);
    expect(refused.steps.join(' ')).not.toMatch(/ZIGi · Your Personal AI Companion/);
    expect(hermesKeyFailure('bad-key', false)!.title).toBe(HERMES_FIXES['needs-key'].title);
    expect(hermesKeyFailure('rate-limit', true)).toBeNull();
  });
});
describe('Z1A rest', () => {
  test('Z1A-5: the guide says NOVA’s text reaches a terminal-capable agent and recommends a sandbox and memory approval', () => {
    expect(HERMES_POWER).toContain(HERMES_SANDBOX);
    expect(HERMES_SANDBOX).toMatch(/Docker terminal backend/);
    expect(HERMES_SANDBOX).toMatch(/memory\.write_approval/);
    expect(HERMES_SANDBOX).toMatch(/can run commands/);
  });
  test('Z1A-6: /health with platform hermes-agent marks an address as Hermes, in any spelling', async () => {
    expect(isHermesHealth({status: 'ok', platform: 'hermes-agent'})).toBe(true);
    expect(isHermesHealth({status: 'ok'})).toBe(false);
    const record = withSeenHermes({version: 1}, 'http://LOCALHOST:8650/v1/');
    expect(record.seenBases).toEqual(['http://127.0.0.1:8650']);
    expect(withSeenHermes(record, 'http://127.0.0.1:8650')).toBe(record);
    expect(isHermesBase('http://localhost:8650', record)).toBe(true);
    expect(isHermesBase('http://localhost:1234', record)).toBe(false);
    const asked: string[] = [];
    const fetcher = (async (url: RequestInfo | URL) => { asked.push(String(url)); return new Response(JSON.stringify({status: 'ok', platform: 'hermes-agent'}), {status: 200}); }) as typeof fetch;
    expect(await hermesAt('http://localhost:8650/v1', fetcher)).toBe(true);
    expect(asked).toEqual(['http://127.0.0.1:8650/health']);
    expect(await hermesAt('http://127.0.0.1:1234', (async () => new Response('not found', {status: 404})) as typeof fetch)).toBe(false);
    expect(await hermesAt('http://127.0.0.1:1234', (async () => { throw new TypeError('refused'); }) as typeof fetch)).toBe(false);
  });
  test('Z1A-6: in Strict, a server whose /health says Hermes is redacted and gets no tools, though never connected through the guide', async () => {
    const r: ChatRequest = {provider: 'local', localServer: 'openai-compatible', baseUrl: 'http://localhost:8650', model: 'hermes-agent', system: 'S', messages: [{role: 'user', content: 'my sister Anna, IBAN BE68539007547034'}], maxOutputTokens: 64, key: null, tools: [{name: 't', description: 'd', parameters: {}}]};
    const store = {getItem: (k: string) => k === NOVA_SETUP_KEY ? JSON.stringify({version: 1, privacyMode: 'strict'}) : null};
    const out = await guardRequest(r, {storage: store, knownNames: [], probes: {hermes: async () => true}});
    expect(out.messages[0]!.content).not.toContain('BE68539007547034');
    expect(out.tools).toBeUndefined();
    // Without the probe (or when it says no), an ordinary local server: sent as it is.
    expect(await guardRequest(r, {storage: store, knownNames: [], probes: {hermes: async () => false}})).toBe(r);
  });
  test('Z1A-7 alternative: a model Ollama never listed is asked once with /api/show; a cloud mark is refused in Strict', async () => {
    const shown = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), {status})) as typeof fetch;
    expect(await ollamaShowsCloud('http://127.0.0.1:11434', 'mymodel', shown({remote_host: 'https://ollama.com:443', remote_model: 'gpt-oss:120b'}))).toBe(true);
    expect(await ollamaShowsCloud('http://127.0.0.1:11434', 'qwen', shown({modelfile: '...', details: {}}))).toBe(false);
    expect(await ollamaShowsCloud('http://127.0.0.1:11434', 'qwen', shown({}, 404))).toBeNull();
    const r: ChatRequest = {provider: 'local', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'mymodel', system: 'S', messages: [{role: 'user', content: 'hi'}], maxOutputTokens: 64, key: null};
    const store = {getItem: (k: string) => k === NOVA_SETUP_KEY ? JSON.stringify({version: 1, privacyMode: 'strict'}) : null};
    await expect(guardRequest(r, {storage: store, knownNames: [], probes: {ollamaCloud: async () => true}})).rejects.toThrow(/Strict/);
    expect(await guardRequest(r, {storage: store, knownNames: [], probes: {ollamaCloud: async () => null}})).toBe(r);
  });
  test('I1: with no mode chosen and a cloud brain, NOVA’s composer says the chat and the briefs disagree', () => {
    expect(noModeCloudNote(null, 'openai', 'OpenAI')).toMatch(/not chosen a privacy mode yet, so this chat sends to OpenAI.*briefs and workflows act as Strict/);
    expect(noModeCloudNote('guarded', 'openai', 'OpenAI')).toBeNull();
    expect(noModeCloudNote(null, 'local', 'Ollama')).toBeNull();
  });
  test('I3: Guarded redaction also covers a tool call’s arguments and a raw provider turn, keeping names and signatures', () => {
    const redactor = {redactText: (t: string) => ({text: t.replace(/Anna/g, '[name]'), found: {}}), totalRedactions: () => 0, knownNamesFrom: () => []} as unknown as Parameters<typeof redactRequest>[1];
    const r = {provider: 'gemini', model: 'm', system: 'S', maxOutputTokens: 64, key: 'k', messages: [{role: 'assistant', content: 'Looking up Anna', toolCalls: [{id: 'c1', name: 'search_notes', arguments: '{"query":"Anna","limit":3}'}], raw: {role: 'model', parts: [{text: 'Anna'}, {functionCall: {name: 'search_notes', args: {query: 'Anna'}}, thoughtSignature: 'Anna-sig'}]}}]} as unknown as ChatRequest;
    const out = redactRequest(r, redactor, []).request.messages[0] as {content: string; toolCalls: {arguments: string; name: string}[]; raw: {parts: Record<string, unknown>[]}};
    expect(out.content).toBe('Looking up [name]');
    expect(JSON.parse(out.toolCalls[0]!.arguments)).toEqual({query: '[name]', limit: 3});
    expect(out.toolCalls[0]!.name).toBe('search_notes');
    expect(out.raw.parts[0]).toEqual({text: '[name]'});
    expect(out.raw.parts[1]).toEqual({functionCall: {name: 'search_notes', args: {query: '[name]'}}, thoughtSignature: 'Anna-sig'});
    expect(mapArguments('not json Anna', t => t.replace('Anna', '[name]'))).toBe('not json [name]');
  });
  test('I3: recovery words inside a tool call’s arguments are hidden too', async () => {
    // Built at runtime so the repository secret scan doesn't read a twelve-word fixture as a seed phrase.
    const words = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'].join(' ');
    const r = {provider: 'openai', model: 'm', system: 'S', maxOutputTokens: 64, key: 'k', messages: [{role: 'assistant', content: 'ok', toolCalls: [{id: 'c1', name: 'search_notes', arguments: JSON.stringify({query: words})}]}]} as unknown as ChatRequest;
    const out = await hideRecoveryWordsInRequest(r);
    expect((out.messages[0] as {toolCalls: {arguments: string}[]}).toolCalls[0]!.arguments).not.toContain('abandon ability able');
  });
  test('I5: the local-model confirmation holds for the gateway and Hermes version it was given for, and lapses when either changes', () => {
    const base: NovaHermes = {version: 1, baseUrl: 'http://127.0.0.1:8642', lastCheck: {at, reachable: true, version: '0.22.5'}};
    const confirmed = confirmLocalModel(base, true, '2026-11-04');
    expect(confirmed).toMatchObject({localModelConfirmed: true, confirmedBase: 'http://127.0.0.1:8642', confirmedVersion: '0.22.5'});
    expect(localModelStillConfirmed(confirmed)).toBe(true);
    expect(localModelStillConfirmed({...confirmed, lastCheck: {at, reachable: true, version: '0.23.0'}})).toBe(false);
    expect(localModelStillConfirmed({...confirmed, baseUrl: 'http://127.0.0.1:8650'})).toBe(false);
    expect(confirmationLapsedLine({...confirmed, baseUrl: 'http://127.0.0.1:8650'})).toMatch(/Confirm it again/);
    expect(hermesStatus({...confirmed, lastCheck: {at, reachable: true, version: '0.23.0'}}).localModelConfirmed).toBe(false);
    // A confirmation from before (no address or version kept) stands; "no" clears what was kept.
    expect(localModelStillConfirmed({baseUrl: 'http://127.0.0.1:9000', localModelConfirmed: true})).toBe(true);
    expect(confirmLocalModel(confirmed, false, '2026-11-05')).not.toHaveProperty('confirmedBase');
    void NOVA_HERMES_KEY;
  });
});
