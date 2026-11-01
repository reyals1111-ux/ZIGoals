import {describe, expect, test} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {defaultAiSettings, type AiSettings} from '../ai/settings';
import {SETUP_STEPS, NOVA_SETUP, NOVA_SETUP_KEY, CHECK_NOTE_MAX, showcaseNovaSetup as showcaseNovaSetupForTest, markCelebrated, novaOnline, readPrivacyMode, recordCheck, setCardHidden, setPrivacyMode, setupProgress, showSetupCard, stepDone, unmarkStep, type NovaSetup} from './setup';
import {setupPathModel} from './setup-model';
import {ORBITS, PLANETS, MODEL_PICKS, ollamaSteps, lmStudioSteps, llamaCppSteps, detectOs, isLocalOrigin, SUBSCRIPTION_NOTE, SUBSCRIPTION_DETAILS, KEY_NOTES} from './setup-guide';
import {pathProblems, pathProgress, milestoneState} from '../path/model';
import {checkBrain, checkBrief, checkFirstChat, checkMeet, checkMemory, checkPrivacy, checkVoice, checkWorkflows, checkYours, pickVoice} from './setup-checks';
import {checkNovaScopes, novaScopesFrom, packPrivacyMode} from './setup-scopes';
import {buildNovaPack, DEFAULT_NOVA_SCOPES, whatNovaCanSee} from '../ai/context-pack/nova';
import {gatesFor, showcaseSources} from '../ai/tools/fixtures';
import {redactForSend} from './privacy-mode';
import {browserKind, loopbackNote, loopbackPermission, ollamaCloudNames, probeServer, scanLine, scanLocalServers, LOCAL_SERVERS} from './local-servers';

const NOW = new Date('2026-11-01T09:00:00.000Z'), TODAY = '2026-11-01';
const mem = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), map: m}; };

describe('the setup record (zigoals:nova-setup:v1)', () => {
  test('empty start: nothing done, the card shows, no mode chosen (ZIGi as before)', () => {
    const s = mem(), r = readDeviceRecord(s, NOVA_SETUP).data;
    expect(setupProgress(r)).toEqual({done: 0, total: 10, next: 'meet', finished: false});
    expect(showSetupCard(r)).toBe(true);
    expect(readPrivacyMode(s)).toBeNull();
  });
  test('a passing check marks the step done with the day; a failing one keeps the day; notes are bounded', () => {
    let r: NovaSetup = {version: 1};
    r = recordCheck(r, 'brain', {ok: false, note: 'Nothing answered'}, NOW, TODAY);
    expect(stepDone(r, 'brain')).toBe(false);
    r = recordCheck(r, 'brain', {ok: true, note: `Found qwen3.5:9b ${'x'.repeat(400)}`}, NOW, TODAY);
    expect(r.steps?.brain).toEqual({doneOn: TODAY, check: {ok: true, at: NOW.toISOString(), note: expect.any(String)}});
    expect(r.steps!.brain!.check!.note!.length).toBe(CHECK_NOTE_MAX);
    r = recordCheck(r, 'brain', {ok: false, note: 'server stopped'}, new Date('2026-11-02T09:00:00Z'), '2026-11-02');
    expect(r.steps?.brain?.doneOn).toBe(TODAY);
    expect(r.steps?.brain?.check?.ok).toBe(false);
    expect(unmarkStep(r, 'brain').steps?.brain).toEqual({check: r.steps!.brain!.check});
  });
  test('ten checks finish the guide once; the badge stays earned; the celebration is remembered', () => {
    let r: NovaSetup = {version: 1};
    for (const id of SETUP_STEPS) r = recordCheck(r, id, {ok: true}, NOW, TODAY);
    expect(setupProgress(r).finished).toBe(true);
    expect(r.finishedOn).toBe(TODAY);
    expect(novaOnline(r)).toBe(true);
    expect(showSetupCard(r)).toBe(false);
    r = unmarkStep(r, 'voice');
    expect(novaOnline(r)).toBe(false);
    expect(markCelebrated(r).celebrated).toBe(true);
    expect(showSetupCard(setCardHidden({version: 1}, true))).toBe(false);
  });
  test('the privacy mode: stored with its day; a damaged record reads as Strict; the schema is loose and bounded', () => {
    const s = mem();
    updateDeviceRecord(s, NOVA_SETUP, r => setPrivacyMode(r, 'guarded', TODAY));
    expect(readPrivacyMode(s)).toBe('guarded');
    expect(JSON.parse(s.map.get(NOVA_SETUP_KEY)!)).toEqual({version: 1, privacyMode: 'guarded', privacyChosenOn: TODAY});
    s.setItem(NOVA_SETUP_KEY, '{"version":1,"privacyMode":"open"}');
    expect(readPrivacyMode(s)).toBe('strict');
    s.setItem(NOVA_SETUP_KEY, '{"version":1,"later":true,"steps":{"step11":{"x":1},"meet":{"doneOn":"2026-11-01"}}}');
    const read = readDeviceRecord(s, NOVA_SETUP);
    expect(read.unreadable).toBe(false);
    expect(stepDone(read.data, 'meet')).toBe(true);
    expect(() => NOVA_SETUP.schema.parse({version: 1, steps: {meet: {check: {ok: true, at: NOW.toISOString(), note: 'x'.repeat(201)}}}})).toThrow();
    expect(readPrivacyMode({getItem: () => { throw Error('blocked'); }})).toBe('strict');
  });
});

describe('the path model on the shared engine', () => {
  test('ten planets in four orbits, in N3 order, with the NOVA online finale', () => {
    expect(ORBITS.flatMap(o => o.steps)).toEqual([...SETUP_STEPS]);
    const model = setupPathModel({version: 1});
    expect(pathProblems(model)).toEqual([]);
    expect(pathProgress(model)).toEqual({done: 0, total: 10, fraction: 0});
    let r: NovaSetup = {version: 1};
    for (const id of SETUP_STEPS) r = recordCheck(r, id, {ok: true}, NOW, TODAY);
    expect(milestoneState(setupPathModel(r))[0]).toMatchObject({id: 'nova-online', reached: true});
    expect(Object.keys(PLANETS)).toEqual([...SETUP_STEPS]);
  });
});

describe('the guide\'s commands and facts', () => {
  const origin = 'https://alpha.zigoals.app';
  test('every OS gets install, a model, the origin and a check, one command per block', () => {
    for (const os of ['mac', 'windows', 'linux'] as const) {
      const steps = ollamaSteps(os, origin, 'qwen3.5:9b'), cmds = steps.flatMap(s => s.command ? [s.command] : []);
      expect(cmds).toContain('ollama pull qwen3.5:9b');
      expect(cmds.some(c => c.includes('/api/version') && c.includes(`Origin: ${origin}`))).toBe(true);
      for (const c of cmds) expect(c.split('\n')).toHaveLength(1);
    }
    expect(ollamaSteps('mac', origin, 'm').map(s => s.command)).toContain(`launchctl setenv OLLAMA_ORIGINS "${origin}"`);
    expect(ollamaSteps('mac', origin, 'm').some(s => /until the Mac restarts/.test(s.text))).toBe(true);
    expect(ollamaSteps('windows', origin, 'm').map(s => s.command)).toEqual(expect.arrayContaining(['irm https://ollama.com/install.ps1 | iex', `setx OLLAMA_ORIGINS "${origin}"`]));
    expect(ollamaSteps('linux', origin, 'm').map(s => s.command)).toEqual(expect.arrayContaining(['curl -fsSL https://ollama.com/install.sh | sh', 'sudo systemctl edit ollama.service', 'sudo systemctl daemon-reload', 'sudo systemctl restart ollama']));
    expect(ollamaSteps('windows', origin, 'm').find(s => s.command?.includes('/api/version'))!.command).toMatch(/^curl\.exe /);
  });
  test('a page on this computer needs no Ollama origin; LM Studio and llama.cpp', () => {
    expect(isLocalOrigin('http://127.0.0.1:3101')).toBe(true);
    expect(ollamaSteps('mac', 'http://localhost:3100', 'm').some(s => s.command?.includes('OLLAMA_ORIGINS'))).toBe(false);
    expect(lmStudioSteps('linux').map(s => s.command)).toContain('lms server start --cors --port 1234');
    expect(lmStudioSteps('mac').some(s => /Require Authentication/.test(s.text))).toBe(true);
    expect(llamaCppSteps('windows', origin, 'unsloth/Qwen3.5-9B-GGUF').flatMap(s => s.command ? [s.command] : [])).toEqual(['winget install llama.cpp', `llama-server -hf unsloth/Qwen3.5-9B-GGUF --port 9931 --cors-origins ${origin}`]);
    expect(llamaCppSteps('mac', origin, 'x').map(s => s.command)).toContain('brew install llama.cpp');
  });
  test('model picks cover 8 GB to 64 GB with open licences; OS detection', () => {
    expect(MODEL_PICKS.map(p => p.ollama)).toEqual(['qwen3.5:4b', 'qwen3.5:9b', 'gpt-oss:20b', 'qwen3.8:27b', 'qwen3.6:35b', 'qwen3.6:35b']);
    for (const p of MODEL_PICKS) expect(p.licence).toBe('Apache 2.0');
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
    expect(detectOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac');
    expect(detectOs('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux');
  });
  test('honesty: no subscription signs in; Claude credits said precisely; Gemini\'s free tier not for the EEA, CH or UK', () => {
    expect(SUBSCRIPTION_NOTE).toMatch(/can’t sign in here/);
    expect(SUBSCRIPTION_DETAILS.join(' ')).toMatch(/Claude Max, Ultra and Team include monthly API credits/);
    expect(KEY_NOTES.gemini.free).toMatch(/EEA, Switzerland or the UK/);
  });
});

/** MOCK local servers, answered here: Ollama (/api/version, /api/tags with one cloud model), LM Studio and llama.cpp (/v1/models). */
function mockServers(up: {ollama?: boolean; lmstudio?: boolean; llamacpp?: boolean} = {ollama: true, lmstudio: true, llamacpp: true}) {
  const seen: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input); seen.push(url);
    const json = (body: unknown) => new Response(JSON.stringify(body), {status: 200, headers: {'content-type': 'application/json'}});
    if (url.startsWith('http://127.0.0.1:11434') && up.ollama) {
      if (url.endsWith('/api/version')) return json({version: '0.30.0'});
      if (url.endsWith('/api/tags')) return json({models: [{name: 'qwen3.5:9b', model: 'qwen3.5:9b'}, {name: 'gemma4:31b-cloud', remote_model: 'gemma4:31b', remote_host: 'https://ollama.com:443'}, {name: 'nomic-embed-text:latest'}]});
    }
    if (url.startsWith('http://localhost:1234') && up.lmstudio && url.endsWith('/v1/models')) return json({object: 'list', data: [{id: 'qwen3.5-9b'}, {id: 'text-embedding-nomic'}]});
    if (url.startsWith('http://127.0.0.1:9931') && up.llamacpp && url.endsWith('/v1/models')) return json({object: 'list', data: [{id: 'Qwen3.5-9B-Q4_K_M.gguf'}]});
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  return {fetcher, seen};
}

describe('local servers: the scan, with MOCK Ollama, LM Studio and llama.cpp', () => {
  test('all three found, chat models only, the Ollama cloud model marked; port 8080 not running', async () => {
    const {fetcher} = mockServers(), results = await scanLocalServers({fetcher, ms: 500});
    const by = Object.fromEntries(results.map(r => [r.server.id, r]));
    expect(by.ollama).toMatchObject({found: true, models: [{id: 'qwen3.5:9b', cloud: false}, {id: 'gemma4:31b-cloud', cloud: true}]});
    expect(by.lmstudio).toMatchObject({found: true, models: [{id: 'qwen3.5-9b', cloud: false}]});
    expect(by.llamacpp).toMatchObject({found: true, models: [{id: 'Qwen3.5-9B-Q4_K_M.gguf', cloud: false}]});
    expect(by['llamacpp-8080']).toMatchObject({found: false, reason: 'unreachable'});
    expect(scanLine(by.ollama!)).toBe('Ollama: 2 models (qwen3.5:9b, gemma4:31b-cloud); 1 runs on ollama.com, not on this computer');
    expect(scanLine(by['llamacpp-8080']!)).toMatch(/nothing answered at http:\/\/127\.0\.0\.1:8080/);
  });
  test('nothing running: every probe answers "unreachable", within its time', async () => {
    const {fetcher} = mockServers({}), results = await scanLocalServers({fetcher, ms: 200});
    expect(results.every(r => !r.found && r.reason === 'unreachable')).toBe(true);
    expect(LOCAL_SERVERS.map(s => s.baseUrl)).toEqual(['http://127.0.0.1:11434', 'http://localhost:1234', 'http://127.0.0.1:9931', 'http://127.0.0.1:8080']);
  });
  test('a hanging server is given up after the probe time', async () => {
    const hang = ((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as typeof fetch;
    const t = Date.now(), result = await probeServer(LOCAL_SERVERS[1]!, {fetcher: hang, ms: 100});
    expect(result.found).toBe(false);
    expect(Date.now() - t).toBeLessThan(2000);
  });
  test('ollamaCloudNames, the loopback permission and the browser notes', async () => {
    expect([...ollamaCloudNames({models: [{name: 'a', remote_host: 'x'}, {name: 'b'}]})]).toEqual(['a']);
    expect(await loopbackPermission({query: async (d: PermissionDescriptor) => { if (d.name as string === 'loopback-network') throw TypeError('unknown'); return {state: 'denied'} as PermissionStatus; }})).toBe('denied');
    expect(await loopbackPermission(undefined)).toBe('unknown');
    expect(browserKind('Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/27.0 Safari/605.1.15')).toBe('safari');
    expect(loopbackNote('safari', false)).toMatch(/Use Chrome, Edge or Firefox/);
    expect(loopbackNote('chromium', true)).toMatch(/phone cannot reach/);
    expect(loopbackNote('chromium', false)).toMatch(/Access other apps and services on this device/);
  });
});

describe('each planet\'s check', () => {
  const local = (over: Partial<AiSettings> = {}): AiSettings => ({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'qwen3.5:9b', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434', ...over});
  test('1 meet: no plain key in storage', () => {
    expect(checkMeet(['{"version":1}', 'plain text']).ok).toBe(true);
    expect(checkMeet(['{"key":"sk-proj-abcdefghijklmnop"}']).ok).toBe(false);
  });
  test('2 privacy: the engine\'s own guard, per mode, and the stored mode must match', async () => {
    expect((await checkPrivacy(null, null)).ok).toBe(false);
    expect((await checkPrivacy('strict', null)).ok).toBe(false);
    expect(await checkPrivacy('strict', 'strict')).toMatchObject({ok: true, note: expect.stringMatching(/refused/)});
    const guarded = await checkPrivacy('guarded', 'guarded');
    expect(guarded.ok).toBe(true);
    expect(guarded.note).toMatch(/\[name\].*\[address\].*about €1,200/);
    expect((await checkPrivacy('relaxed', 'relaxed')).ok).toBe(true);
  });
  test('3 brain: a live test against MOCK servers names the model found', async () => {
    const {fetcher} = mockServers();
    expect(await checkBrain({settings: local(), mode: 'strict', key: null, fetcher, onDevice: 'unavailable', onDeviceOn: false})).toEqual({ok: true, note: 'Found qwen3.5:9b on Ollama at http://127.0.0.1:11434. It runs on this computer.'});
    expect((await checkBrain({settings: local({model: 'missing:1b'}), mode: null, key: null, fetcher, onDevice: 'unavailable', onDeviceOn: false})).note).toMatch(/not in its list/);
    expect((await checkBrain({settings: local({model: 'gemma4:31b-cloud'}), mode: 'strict', key: null, fetcher, onDevice: 'unavailable', onDeviceOn: false})).ok).toBe(false);
    const lm = await checkBrain({settings: local({localServer: 'openai-compatible', baseUrl: 'http://localhost:1234', model: 'qwen3.5-9b'}), mode: 'strict', key: null, fetcher, onDevice: 'unavailable', onDeviceOn: false});
    expect(lm.note).toBe('Found qwen3.5-9b on LM Studio at http://localhost:1234. It runs on this computer.');
    const cpp = await checkBrain({settings: local({localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:9931', model: 'Qwen3.5-9B-Q4_K_M.gguf'}), mode: 'guarded', key: null, fetcher, onDevice: 'unavailable', onDeviceOn: false});
    expect(cpp.note).toMatch(/^Found Qwen3\.5-9B-Q4_K_M\.gguf on llama\.cpp/);
    const down = await checkBrain({settings: local(), mode: null, key: null, fetcher: mockServers({}).fetcher, onDevice: 'unavailable', onDeviceOn: false});
    expect(down.ok).toBe(false);
    expect((await checkBrain({settings: defaultAiSettings(), mode: null, key: null, onDevice: 'available', onDeviceOn: true})).ok).toBe(true);
    expect((await checkBrain({settings: defaultAiSettings(), mode: null, key: null, onDevice: 'unavailable', onDeviceOn: false})).ok).toBe(false);
  });
  test('3 brain: MOCK cloud key tests (OpenAI and Anthropic list their models with the key); Strict refuses a cloud', async () => {
    const seen: {url: string; headers: Record<string, string>}[] = [];
    const cloud = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); seen.push({url, headers: Object.fromEntries(Object.entries(init?.headers ?? {}))});
      if (url === 'https://api.openai.com/v1/models') return new Response(JSON.stringify({data: [{id: 'gpt-6-luna'}]}), {status: 200});
      if (url.startsWith('https://api.anthropic.com/v1/models')) return new Response(JSON.stringify({data: [{id: 'claude-haiku-5-5', display_name: 'Claude Haiku 5.5'}]}), {status: 200});
      return new Response('{"error":{"message":"bad key"}}', {status: 401});
    }) as typeof fetch;
    const openai = {...defaultAiSettings(), enabled: true, mode: 'api' as const, provider: 'openai' as const, model: 'gpt-6-luna'};
    expect(await checkBrain({settings: openai, mode: 'relaxed', key: 'sk-test-0000000000000000', fetcher: cloud, onDevice: 'unavailable', onDeviceOn: false})).toEqual({ok: true, note: 'Connected to OpenAI: gpt-6-luna is available with your key.'});
    expect(seen[0]!.headers.authorization).toBe('Bearer sk-test-0000000000000000');
    expect((await checkBrain({settings: {...openai, provider: 'anthropic', model: 'claude-haiku-5-5'}, mode: 'guarded', key: 'sk-ant-test', fetcher: cloud, onDevice: 'unavailable', onDeviceOn: false})).ok).toBe(true);
    expect((await checkBrain({settings: {...openai, provider: 'xai', model: 'grok-4.7'}, mode: null, key: 'xai-bad', fetcher: cloud, onDevice: 'unavailable', onDeviceOn: false})).ok).toBe(false);
    const before = seen.length;
    expect((await checkBrain({settings: openai, mode: 'strict', key: 'sk-test', fetcher: cloud, onDevice: 'unavailable', onDeviceOn: false})).note).toMatch(/Strict sends nothing to a cloud/);
    expect(seen.length).toBe(before);
    expect((await checkBrain({settings: openai, mode: null, key: null, fetcher: cloud, onDevice: 'unavailable', onDeviceOn: false})).note).toMatch(/key is not on this device/);
    expect((await checkBrain({settings: {...defaultAiSettings(), enabled: true, mode: 'subscription'}, mode: null, key: null, onDevice: 'unavailable', onDeviceOn: false})).ok).toBe(false);
  });
  test('4 first chat: a question and an answer from the last day', () => {
    expect(checkFirstChat([{title: 'What is on today?', turnCount: 2, updatedAt: '2026-11-01T08:30:00.000Z'}], NOW).ok).toBe(true);
    expect(checkFirstChat([{title: 'old', turnCount: 4, updatedAt: '2026-10-20T08:30:00.000Z'}, {title: 'q', turnCount: 1, updatedAt: NOW.toISOString()}], NOW).ok).toBe(false);
  });
  test('5 scopes: read from the same records as NOVA → Permissions; the check matches the NOVA pack', () => {
    const settings = {...defaultAiSettings(), pageShare: {...defaultAiSettings().pageShare, wealth: false}};
    const scopes = novaScopesFrom(settings, false);
    expect(scopes).toEqual({...DEFAULT_NOVA_SCOPES, wealth: false, health: false, journal: false});
    expect(novaScopesFrom({...settings, pageShare: {...settings.pageShare, health: true}, includeHealth: true}, true)).toMatchObject({health: true, journal: true});
    const pack = buildNovaPack({sources: showcaseSources(), gates: gatesFor(false), scopes, chainChosen: false, privacy: {mode: null, redactForSend: (t, m) => redactForSend(t, m === 'guarded' ? 'guarded' : null)}});
    expect(pack.included.some(p => p === 'money' || p === 'budgets' || p === 'bills')).toBe(false);
    expect(checkNovaScopes(scopes, pack, false, false)).toMatchObject({ok: true, note: expect.stringMatching(/^NOVA can see: .*Goals and their pace.*Health: off\.$/)});
    expect(checkNovaScopes(scopes, {included: ['money'], notShared: []}, false, false).ok).toBe(false);
    expect(checkNovaScopes({...scopes, health: true}, {included: ['health'], notShared: []}, false, false).ok).toBe(false);
  });
  test('5 scopes: the pack is redacted exactly when the send path would redact (whatNovaCanSee shows that text)', () => {
    expect(packPrivacyMode('guarded', {provider: 'openai'})).toBe('guarded');
    expect(packPrivacyMode('guarded', {provider: 'local', model: 'qwen3.5:9b'})).toBeNull();
    expect(packPrivacyMode('strict', {provider: 'openai'})).toBeNull();
    expect(packPrivacyMode('strict', {provider: 'local', hermesUnconfirmed: true})).toBe('guarded');
    expect(packPrivacyMode('relaxed', {provider: 'anthropic'})).toBeNull();
    const input = (mode: ReturnType<typeof packPrivacyMode>) => ({sources: showcaseSources(), gates: gatesFor(false), scopes: DEFAULT_NOVA_SCOPES, chainChosen: false, privacy: {mode, redactForSend: (t: string, m: typeof mode) => redactForSend(t, m === 'guarded' ? 'guarded' : null)}});
    const plain = whatNovaCanSee(input(null)), guarded = whatNovaCanSee(input('guarded'));
    expect(buildNovaPack(input('guarded')).text).toBe(guarded);
    expect(guarded).toBe(redactForSend(plain, 'guarded').text);
  });
  test('6 memory, 7 voice, 8 briefs, 9 workflows, 10 make it yours', () => {
    const note = {id: 'note_1', text: 'I run in the morning', category: 'schedule', source: 'person', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString()} as const;
    expect(checkMemory({version: 1}, {version: 1, notes: [note]}, false).note).toMatch(/1 of your 1 note/);
    expect(checkMemory({version: 1, useNotes: false}, {version: 1}, false).note).toMatch(/Memory is off/);
    expect(checkMemory({version: 1}, {version: 1}, true).ok).toBe(false);
    const voices = [{name: 'Google UK English Female', lang: 'en-GB', localService: false}, {name: 'Daniel', lang: 'en-GB', localService: true}, {name: 'Xander', lang: 'nl-NL', localService: true}];
    expect(pickVoice(voices, 'en-GB', true)?.name).toBe('Daniel');
    expect(pickVoice(voices.slice(0, 1), 'en-GB', true)).toBeNull();
    expect(pickVoice(voices.slice(0, 1), 'en-US', false)?.name).toBe('Google UK English Female');
    expect(checkVoice({spoke: true, voice: voices[1]!}, true)).toEqual({ok: true, note: 'NOVA spoke with “Daniel”, a voice on this device.'});
    expect(checkVoice({spoke: false, voice: null}, true).note).toMatch(/Strict/);
    expect(checkVoice({spoke: false, voice: voices[1]!, error: 'not-allowed'}, false).ok).toBe(false);
    expect(checkBrief(['Two habits left today.']).ok).toBe(true);
    expect(checkBrief(null)).toMatchObject({ok: true, note: expect.stringMatching(/nothing to say yet/)});
    expect(checkWorkflows({ranReview: true, savedOwn: false})).toEqual({ok: false, note: 'Save one workflow of your own (Edit a template, then Save).'});
    expect(checkWorkflows({ranReview: true, savedOwn: true}).ok).toBe(true);
    expect(checkYours({version: 1}, null).ok).toBe(false);
    expect(checkYours({version: 1, layout: 'bento', persona: {name: 'Iris'}}, {dailyCap: {amount: '1', currency: 'USD', mode: 'warn'}}).note).toBe('NOVA is yours: layout bento, the name “Iris”, a cost cap.');
  });
});

describe('Hermes guide facts', async () => {
  const {apiServerSteps, gatewaySteps, hermesKeyProblem, installSteps, makeHermesKey, skillFile, skillFolder} = await import('./hermes-guide');
  const {hermesVersionIn, hermesProgress, recordHermesCheck, HERMES_STEPS} = await import('./hermes-record');
  const {hermesPathModel} = await import('./hermes-model');
  test('install per OS (no WSL on Windows), the API server lines with this site, the gateway and the key rules', () => {
    expect(installSteps('windows').map(s => s.command)).toEqual(['iex (irm https://hermes-agent.nousresearch.com/install.ps1)', 'hermes --version']);
    expect(installSteps('mac').map(s => s.command)).toEqual(['curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash', 'source ~/.zshrc', 'hermes --version']);
    expect(installSteps('linux')[1]!.command).toBe('source ~/.bashrc');
    const api = apiServerSteps('linux', 'https://alpha.zigoals.app', null).map(s => s.command);
    expect(api).toEqual(['KEY="$(openssl rand -hex 32)"', 'hermes config set API_SERVER_ENABLED true', 'hermes config set API_SERVER_KEY "$KEY"', 'hermes config set API_SERVER_CORS_ORIGINS https://alpha.zigoals.app', 'hermes config get API_SERVER_CORS_ORIGINS']);
    expect(apiServerSteps('windows', 'https://alpha.zigoals.app', 'ab'.repeat(32))[1]!.command).toBe(`hermes config set API_SERVER_KEY ${'ab'.repeat(32)}`);
    expect(gatewaySteps('linux').map(s => s.command)).toContain('sudo loginctl enable-linger $USER');
    expect(gatewaySteps('windows').at(-1)!.command).toBe('curl.exe -s http://127.0.0.1:8642/health');
    expect(hermesKeyProblem('your-secret-key')).toMatch(/16/);
    expect(hermesKeyProblem('changeme')).toBeTruthy();
    expect(hermesKeyProblem('x'.repeat(20))).toMatch(/placeholder/);
    const key = makeHermesKey(n => new Uint8Array(n).fill(171));
    expect(key).toBe('ab'.repeat(32));
    expect(hermesKeyProblem(key)).toBeNull();
    expect(hermesVersionIn('Hermes Agent v0.22.5 (2026-10-22)\nPython 3.12')).toBe('0.22.5');
    expect(hermesVersionIn('command not found: hermes')).toBeNull();
    expect(skillFolder('windows')).toBe('%LOCALAPPDATA%\\hermes\\skills\\personal\\zigoals-summary\\');
    expect(skillFile('2026-11-01', 'Guarded', '# My ZIGoals summary')).toMatch(/^---\nname: zigoals-summary\n/);
  });
  test('the Hermes path: ten planets, progress and the finale', () => {
    let r = {version: 1 as const};
    expect(hermesProgress(r)).toMatchObject({done: 0, next: 'what'});
    let rec: Parameters<typeof recordHermesCheck>[0] = r;
    for (const id of HERMES_STEPS) rec = recordHermesCheck(rec, id, {ok: true}, NOW, TODAY);
    expect(hermesProgress(rec).finished).toBe(true);
    expect(rec.finishedOn).toBe(TODAY);
    const model = hermesPathModel(rec);
    expect(pathProblems(model)).toEqual([]);
    expect(milestoneState(model)[0]!.reached).toBe(true);
    r = {version: 1};
  });
});

test('the Showcase example is labelled and valid', () => {
  const r = NOVA_SETUP.schema.parse(showcaseNovaSetupForTest('2026-09-20', '2026-09-20T19:00:00.000Z'));
  expect(setupProgress(r)).toMatchObject({done: 3, next: 'first-chat'});
  expect((['meet', 'privacy', 'brain'] as const).every(id => r.steps?.[id]?.check?.note?.startsWith('Showcase example:'))).toBe(true);
});
