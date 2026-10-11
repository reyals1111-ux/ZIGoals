import {expect, test} from 'vitest';
import {AI_SETTINGS_KEY, VOICE_LANGUAGES, aiSettingsSchema, connectionLabel, defaultAiSettings, readAiSettings, turnOffAi, updateAiSettings} from './settings';

// ADR-012, Part 2: the device key holds choices, never a secret; unreadable bytes read as off and stay untouched.
function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, map};
}
test('the defaults: off, Health not shared, the key remembered only in the installed app, a 2,048-token output cap and a 10,000-token context budget', () => {
  const tab = defaultAiSettings(false), installed = defaultAiSettings(true);
  expect(tab).toMatchObject({version: 1, enabled: false, rememberKey: false, includeHealth: false, pageShare: {today: true, goals: true, habits: true, health: false, wealth: true, help: true}, maxOutputTokens: 2048, contextBudgetTokens: 10000, launcherHidden: false, voice: {transcription: 'off', readAloud: false}});
  expect(installed.rememberKey).toBe(true);
  // No field can hold a secret: "rememberKey" is a switch, the "…Tokens" fields are counts.
  expect(Object.keys(tab).filter(field => /^(api)?key$|secret|^token$|password/i.test(field))).toEqual([]);
});
test('read-tolerance: nothing stored, a valid record, unreadable bytes left untouched, storage that throws', () => {
  const s = storage();
  expect(readAiSettings(s)).toEqual({data: defaultAiSettings(), unreadable: false});
  const written = updateAiSettings(s, current => ({...current, enabled: true, mode: 'api', provider: 'openai', model: 'mock-chat-1', connectedOn: '2026-10-04'}));
  expect(readAiSettings(s)).toEqual({data: written, unreadable: false});
  s.setItem(AI_SETTINGS_KEY, '{"version":2,"enabled":true}');
  expect(readAiSettings(s)).toEqual({data: defaultAiSettings(), unreadable: true});
  expect(s.map.get(AI_SETTINGS_KEY)).toBe('{"version":2,"enabled":true}');
  s.setItem(AI_SETTINGS_KEY, 'not json');
  expect(readAiSettings(s).unreadable).toBe(true);
  expect(readAiSettings({getItem: () => { throw Error('blocked'); }})).toEqual({data: defaultAiSettings(), unreadable: true});
});
test('writes are validated whole: an unknown field, an out-of-range cap, a key-shaped field or a remote local address write nothing', () => {
  const s = storage();
  expect(() => updateAiSettings(s, current => ({...current, maxOutputTokens: 10}))).toThrow();
  expect(() => updateAiSettings(s, current => ({...current, apiKey: 'sk-test-FAKE'} as never))).toThrow();
  expect(() => updateAiSettings(s, current => ({...current, baseUrl: 'http://192.168.0.5:11434'}))).toThrow();
  expect(s.map.size).toBe(0);
  const local = updateAiSettings(s, current => ({...current, enabled: true, mode: 'local', provider: 'local', localServer: 'ollama', baseUrl: ' http://127.0.0.1:11434/ ', model: 'mock-llama:8b'}));
  expect(local.baseUrl).toBe('http://127.0.0.1:11434');
  expect(aiSettingsSchema.safeParse({...local, extra: 1}).success).toBe(false);
});
test('turnOffAi returns to the start but keeps the launcher and remember choices; connectionLabel names provider and model', () => {
  const s = storage();
  updateAiSettings(s, current => ({...current, enabled: true, mode: 'api', provider: 'anthropic', model: 'mock-claude-a', includeHealth: true, launcherHidden: true, rememberKey: true, customInstructions: 'Be brief.'}));
  const off = turnOffAi(s);
  expect(off).toMatchObject({enabled: false, mode: null, provider: null, model: null, includeHealth: false, customInstructions: '', launcherHidden: true, rememberKey: true});
  expect(connectionLabel(off, () => 'x')).toBeNull();
  expect(connectionLabel({...off, enabled: true, provider: 'anthropic', model: 'mock-claude-a'}, id => id === 'anthropic' ? 'Anthropic' : id)).toBe('via Anthropic · mock-claude-a');
});

// Session Z-Local Part 4 (owner edit 6): the voice languages are English and Dutch; a stored French choice reads as the device default.
test('frozen reader: a record with voice.language "fr-FR" reads as the device default, is not unreadable, keeps every other field, and writes back as null', () => {
  const store = new Map<string, string>(), storage = {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }};
  const frozen = {...defaultAiSettings(true), customInstructions: 'Keep it short', voice: {transcription: 'browser', transcriptionModel: null, language: 'fr-FR', readAloud: true}};
  store.set(AI_SETTINGS_KEY, JSON.stringify(frozen));
  const read = readAiSettings(storage, true);
  expect(read.unreadable).toBe(false); expect(read.data.voice).toEqual({transcription: 'browser', transcriptionModel: null, language: null, readAloud: true}); expect(read.data.customInstructions).toBe('Keep it short');
  for (const kept of ['nl-NL', 'en-GB', 'nl-BE', 'en-US', 'de-DE']) { store.set(AI_SETTINGS_KEY, JSON.stringify({...frozen, voice: {...frozen.voice, language: kept}})); expect(readAiSettings(storage, true).data.voice.language).toBe(kept); }
  store.set(AI_SETTINGS_KEY, JSON.stringify({...frozen, voice: {...frozen.voice, language: 'fr'}}));
  const written = updateAiSettings(storage, current => ({...current, voice: {...current.voice, readAloud: false}}), true);
  expect(written.voice.language).toBeNull(); expect(JSON.parse(store.get(AI_SETTINGS_KEY)!).voice.language).toBeNull();
  expect(VOICE_LANGUAGES.map(l => l.id)).toEqual(['en-GB', 'en-US', 'nl-BE', 'nl-NL']);
});

// Session Z-Local (ADR-020 L26): the default budget is 10,000; a stored 6,000 (the old default) follows it, any other value stays.
test('frozen reader: a stored budget of 6,000 reads as 10,000; 7,000 stays 7,000', () => {
  const store = new Map<string, string>(), storage = {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }};
  store.set(AI_SETTINGS_KEY, JSON.stringify({...defaultAiSettings(true), contextBudgetTokens: 6000}));
  expect(readAiSettings(storage, true).data.contextBudgetTokens).toBe(10000);
  store.set(AI_SETTINGS_KEY, JSON.stringify({...defaultAiSettings(true), contextBudgetTokens: 7000}));
  expect(readAiSettings(storage, true).data.contextBudgetTokens).toBe(7000);
});

// Session Z-Local (ADR-020 L35): the default output cap is 2,048; a stored 1,024 (the old default) follows it, any other value stays.
test('frozen reader: a stored output cap of 1,024 reads as 2,048; 1,500 stays 1,500', () => {
  const store = new Map<string, string>(), storage = {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }};
  store.set(AI_SETTINGS_KEY, JSON.stringify({...defaultAiSettings(true), maxOutputTokens: 1024}));
  expect(readAiSettings(storage, true).data.maxOutputTokens).toBe(2048);
  store.set(AI_SETTINGS_KEY, JSON.stringify({...defaultAiSettings(true), maxOutputTokens: 1500}));
  expect(readAiSettings(storage, true).data.maxOutputTokens).toBe(1500);
});
