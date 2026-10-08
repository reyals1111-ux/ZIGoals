import {expect, test} from 'vitest';
import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord} from '../../device-record';
import {DEVICE_KEYS, EVERYTHING_KEYS} from '../../export/everything';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from '../../onboarding';
import {AI_SETTINGS_KEY, readAiSettings, turnOffAi, updateAiSettings} from '../settings';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {AI_ACTIONS_KEY, AI_MEMORY_KEY, AI_OPTIONS_KEY, AI_USAGE_KEY, ZIGI_DISPLAY_KEYS, ZIGI_KEY, ZIGI_KNOCK_KEY, ZIGI_PERSONAL_KEYS, ZIGI_REMINDERS_KEY} from './keys';
import {ACTION_DAYS, AI_ACTIONS, AI_MEMORY, AI_OPTIONS, forgetAction, HEALTH_NOTE_CATEGORIES, MAX_ACTIONS, readZigiPrefs, recordAction, resetOnTurnOff, ZIGI, ZIGI_DEFAULTS, ZIGI_KNOCK, ZIGI_RECORDS, zigiPrefs} from './records';

// Session V storage foundation ([TIER 3], ADR-014 S3/S18): every new device key defined once, read tolerantly, written
// only on a choice, loose so a later part's fields survive an older build, registered for onboarding and the export.
function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial)), writes: string[] = [];
  return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, map, writes,
    get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null};
}

test('every record: missing reads empty, garbage reads empty and is never rewritten by a read, a write validates first', () => {
  for (const spec of ZIGI_RECORDS) {
    const s = storage();
    expect(readDeviceRecord(s, spec), spec.key).toEqual({data: {version: 1}, unreadable: false});
    s.map.set(spec.key, '{not json');
    expect(readDeviceRecord(s, spec), spec.key).toEqual({data: {version: 1}, unreadable: true});
    s.map.set(spec.key, JSON.stringify({version: 2}));
    expect(readDeviceRecord(s, spec).unreadable, spec.key).toBe(true);
    expect(s.writes, spec.key).toEqual([]); expect(s.map.get(spec.key), spec.key).toBe(JSON.stringify({version: 2}));
    // A write that does not validate throws with nothing written.
    const clean = storage();
    expect(() => updateDeviceRecord(clean, spec, current => ({...current, version: 3} as never)), spec.key).toThrow();
    expect(clean.writes, spec.key).toEqual([]);
  }
});
test('loose records: a field a later part (or a later build) wrote survives an older reader\'s write, so a revert never resets a key', () => {
  const s = storage({[AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'tools', futureSwitch: {on: true}, deepModel: {openai: 'mock-deep'}})});
  const next = updateDeviceRecord(s, AI_OPTIONS, current => ({...current, toolMode: 'attach' as const}));
  expect(next).toEqual({version: 1, toolMode: 'attach', futureSwitch: {on: true}, deepModel: {openai: 'mock-deep'}});
  expect(JSON.parse(s.map.get(AI_OPTIONS_KEY)!)).toEqual(next);
  const z = storage({[ZIGI_KEY]: JSON.stringify({version: 1, skin: 'paper-fox', knock: {enabled: true, offer: 'accepted', laterField: 1}, newPanel: 'x'})});
  updateDeviceRecord(z, ZIGI, current => ({...current, size: 'l' as const}));
  expect(JSON.parse(z.map.get(ZIGI_KEY)!)).toEqual({version: 1, skin: 'paper-fox', knock: {enabled: true, offer: 'accepted', laterField: 1}, newPanel: 'x', size: 'l'});
});
test('ZIGi\'s look and feel defaults: the original skin, Calm, right, M, friendly, the edge tab on, knock off and never offered yet', () => {
  expect(zigiPrefs({version: 1})).toEqual(ZIGI_DEFAULTS);
  expect(ZIGI_DEFAULTS).toMatchObject({animation: 'calm', edgeTab: true, knock: {enabled: false, offer: null, maxPerDay: 3, quietFrom: '22:00', quietTo: '08:00', sound: false}});
  expect(readZigiPrefs(storage({[ZIGI_KEY]: 'garbage'}))).toEqual(ZIGI_DEFAULTS);
  expect(readZigiPrefs(storage({[ZIGI_KEY]: JSON.stringify({version: 1, animation: 'off', knock: {offer: 'declined'}})}))).toMatchObject({animation: 'off', knock: {enabled: false, offer: 'declined'}});
});
test('the actions log keeps 500 lines and 180 days, one line per action, and Undo removes its line', () => {
  const s = storage(), now = new Date('2026-10-05T12:00:00Z');
  recordAction(s, {activityId: 'old', kind: 'check-in', title: 'Old', at: new Date(now.getTime() - (ACTION_DAYS + 1) * 86_400_000).toISOString()}, now);
  recordAction(s, {activityId: 'a1', kind: 'check-in', title: 'Meditate · 10 min', at: now.toISOString()}, now);
  expect(readDeviceRecord(s, AI_ACTIONS).data.actions!.map(a => a.activityId)).toEqual(['a1']);
  recordAction(s, {activityId: 'a1', kind: 'check-in', title: 'Meditate · 15 min', at: now.toISOString()}, now);
  expect(readDeviceRecord(s, AI_ACTIONS).data.actions).toEqual([{activityId: 'a1', kind: 'check-in', title: 'Meditate · 15 min', at: now.toISOString()}]);
  for (let i = 0; i < MAX_ACTIONS + 5; i++) recordAction(s, {activityId: `n${i}`, kind: 'water', title: 'Water', at: now.toISOString()}, now);
  const actions = readDeviceRecord(s, AI_ACTIONS).data.actions!;
  expect(actions).toHaveLength(MAX_ACTIONS); expect(actions.at(-1)!.activityId).toBe(`n${MAX_ACTIONS + 4}`);
  forgetAction(s, `n${MAX_ACTIONS + 4}`);
  expect(readDeviceRecord(s, AI_ACTIONS).data.actions!.some(a => a.activityId === `n${MAX_ACTIONS + 4}`)).toBe(false);
});
test('"Turn off ZIGi" resets V\'s options and stops knocking; the look, notes, actions, usage and reminders stay', () => {
  const s = storage({
    [AI_OPTIONS_KEY]: JSON.stringify({version: 1, route: 'hosted', webmcp: true, hostedConsent: {at: '2026-10-05T10:00:00.000Z', health: false}}),
    [ZIGI_KEY]: JSON.stringify({version: 1, skin: 'origami-nebula', size: 'l', knock: {enabled: true, offer: 'accepted'}}),
    [ZIGI_KNOCK_KEY]: JSON.stringify({version: 1, counts: {'2026-10-05': 2}}),
    [AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [{id: 'n1', text: 'Prefers mornings', category: 'schedule', source: 'person', createdAt: '2026-10-05T10:00:00.000Z', updatedAt: '2026-10-05T10:00:00.000Z'}]}),
    [AI_USAGE_KEY]: JSON.stringify({version: 1, months: {'2026-10': {openai: {input: 10, output: 5, requests: 1}}}}),
    [ZIGI_REMINDERS_KEY]: JSON.stringify({version: 1, wealthLook: {weekday: 0, time: '18:00'}}),
    [AI_ACTIONS_KEY]: JSON.stringify({version: 1, actions: []}),
  });
  updateAiSettings(s, current => ({...current, enabled: true, mode: 'api', provider: 'openai', model: 'mock'}));
  turnOffAi(s);
  expect(readAiSettings(s).data.enabled).toBe(false);
  expect(s.map.has(AI_OPTIONS_KEY)).toBe(false); expect(s.map.has(ZIGI_KNOCK_KEY)).toBe(false);
  expect(JSON.parse(s.map.get(ZIGI_KEY)!)).toEqual({version: 1, skin: 'origami-nebula', size: 'l', knock: {enabled: false, offer: 'accepted'}});
  for (const key of [AI_MEMORY_KEY, AI_USAGE_KEY, ZIGI_REMINDERS_KEY, AI_ACTIONS_KEY]) expect(s.map.has(key), key).toBe(true);
  // An unreadable look-and-feel record is left exactly as it is.
  const odd = storage({[ZIGI_KEY]: '{broken'});
  resetOnTurnOff(odd); expect(odd.map.get(ZIGI_KEY)).toBe('{broken');
  expect(readDeviceRecord(storage(), ZIGI_KNOCK).data).toEqual({version: 1});
});
test('registration: personal keys keep the welcome away, display keys do not; every key is in "Export everything"; T\'s key is untouched', () => {
  for (const key of ZIGI_PERSONAL_KEYS) { expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key); }
  for (const key of ZIGI_DISPLAY_KEYS) { expect(NON_PERSONAL_KEYS).toContain(key); expect(DEVICE_RECORD_KEYS).not.toContain(key); }
  for (const spec of ZIGI_RECORDS) expect(EVERYTHING_KEYS).toContain(spec.key);
  expect(Object.values(DEVICE_KEYS)).toEqual(expect.arrayContaining([AI_OPTIONS_KEY, AI_USAGE_KEY, AI_MEMORY_KEY, AI_ACTIONS_KEY, ZIGI_KEY, ZIGI_REMINDERS_KEY, ZIGI_KNOCK_KEY, AI_SETTINGS_KEY]));
  expect(noExistingData(storage({[ZIGI_KEY]: '{}', [ZIGI_KNOCK_KEY]: '{}'}))).toBe(true);
  expect(noExistingData(storage({[AI_MEMORY_KEY]: '{}'}))).toBe(false);
  expect(new Set(ZIGI_RECORDS.map(r => r.key)).size).toBe(7);
  for (const spec of ZIGI_RECORDS) expect(spec.key).toMatch(/^zigoals:(ai-|zigi)[a-z-]*:v1$/);
});
test('no record can hold a secret, and notes about health or diet need the Health gate like Health itself', () => {
  for (const spec of ZIGI_RECORDS) expect(JSON.stringify(Object.keys((spec.schema as unknown as {shape: object}).shape)), spec.key).not.toMatch(/key|secret|token|password|seed|mnemonic|address/i);
  expect(HEALTH_NOTE_CATEGORIES).toEqual(['health', 'diet']);
  const notes = [{text: 'Vegetarian', category: 'diet'}, {text: 'Knee injury', category: 'health'}, {text: 'Saving for Japan', category: 'goals'}];
  expect(toolEnv({...showcaseSources(), notes}, gatesFor(false), 'provider').notes!.map(n => n.text)).toEqual(['Saving for Japan']);
  expect(toolEnv({...showcaseSources(), notes}, gatesFor(true), 'provider').notes!.map(n => n.text)).toEqual(['Vegetarian', 'Knee injury', 'Saving for Japan']);
  // A note longer than 500 characters or a 101st note is refused, never cut.
  const s = storage();
  expect(() => updateDeviceRecord(s, AI_MEMORY, current => ({...current, notes: [{id: 'n', text: 'x'.repeat(501), category: 'other' as const, source: 'person' as const, createdAt: '2026-10-05T10:00:00.000Z', updatedAt: '2026-10-05T10:00:00.000Z'}]}))).toThrow();
  expect(s.writes).toEqual([]);
});
test('T\'s record stays exactly what build #29 reads: a frozen copy of its reader accepts every record this build writes', () => {
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const frozen29 = z.strictObject({
    version: z.literal(1), enabled: z.boolean(), mode: z.enum(['api', 'local', 'subscription']).nullable(),
    provider: z.enum(['openai', 'anthropic', 'gemini', 'xai', 'openrouter', 'local']).nullable(), model: z.string().min(1).max(200).nullable(),
    localServer: z.enum(['ollama', 'openai-compatible']).nullable(), baseUrl: z.string().max(200).nullable(), subscriptionApp: z.enum(['chatgpt', 'claude', 'grok', 'gemini']).nullable(),
    rememberKey: z.boolean(), pageShare: z.strictObject({today: z.boolean(), goals: z.boolean(), habits: z.boolean(), health: z.boolean(), wealth: z.boolean(), help: z.boolean()}),
    includeHealth: z.boolean(), customInstructions: z.string().max(2000), contextBudgetTokens: z.number().int().min(1000).max(200_000), maxOutputTokens: z.number().int().min(64).max(32_000),
    launcherHidden: z.boolean(), voice: z.strictObject({transcription: z.enum(['provider', 'browser', 'off']), transcriptionModel: z.string().min(1).max(200).nullable(), language: z.string().min(2).max(35).nullable(), readAloud: z.boolean()}),
    connectedOn: day.optional(),
  });
  const s = storage();
  updateAiSettings(s, current => ({...current, enabled: true, mode: 'api', provider: 'anthropic', model: 'mock-claude', includeHealth: true, pageShare: {...current.pageShare, health: true}, connectedOn: '2026-10-05'}));
  expect(frozen29.safeParse(JSON.parse(s.map.get(AI_SETTINGS_KEY)!)).success).toBe(true);
  updateDeviceRecord(s, AI_OPTIONS, current => ({...current, route: 'hosted' as const, toolMode: 'tools' as const}));
  turnOffAi(s);
  expect(frozen29.safeParse(JSON.parse(s.map.get(AI_SETTINGS_KEY)!)).success).toBe(true);
  // V's options never enter T's record: its mode and provider stay T's.
  expect(JSON.parse(s.map.get(AI_SETTINGS_KEY)!)).not.toHaveProperty('route');
});
