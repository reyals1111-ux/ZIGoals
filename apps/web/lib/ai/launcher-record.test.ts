import {describe, expect, it} from 'vitest';
import {AI_SETTINGS_KEY, DEFAULT_LAUNCHER_RECORD, readLauncherRecord} from './launcher-record';
import {defaultAiSettings, readAiSettings, updateAiSettings} from './settings';
import {launcherApp} from './apps';

const storage = (raw: string | null) => ({getItem: () => raw});
describe('the launcher record (follow-up part A)', () => {
  it('reads the same fields the full Zod reader reads, without Zod', () => {
    const store = new Map<string, string>();
    const s: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {getItem: k => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: k => void store.delete(k)};
    updateAiSettings(s, c => ({...c, enabled: true, mode: 'api', provider: 'openai', model: 'gpt-x', launcherHidden: true}));
    const full = readAiSettings(s).data, light = readLauncherRecord(s);
    expect(light).toEqual({enabled: full.enabled, mode: full.mode, provider: full.provider, subscriptionApp: full.subscriptionApp, launcherHidden: full.launcherHidden});
  });
  it('reads nothing, garbage, a wrong version and a throwing storage as off with the launcher shown', () => {
    expect(readLauncherRecord(storage(null))).toEqual(DEFAULT_LAUNCHER_RECORD);
    expect(readLauncherRecord(storage('{not json'))).toEqual(DEFAULT_LAUNCHER_RECORD);
    expect(readLauncherRecord(storage(JSON.stringify({version: 2, launcherHidden: true})))).toEqual(DEFAULT_LAUNCHER_RECORD);
    expect(readLauncherRecord(storage(JSON.stringify({...defaultAiSettings(), mode: 'weird', provider: 42, launcherHidden: 'yes'})))).toEqual(DEFAULT_LAUNCHER_RECORD);
    expect(readLauncherRecord({getItem: () => { throw new Error('denied'); }})).toEqual(DEFAULT_LAUNCHER_RECORD);
    expect(AI_SETTINGS_KEY).toBe('zigoals:ai:v1');
  });
  it('never carries a key: the record has no secret field to read', () => {
    const record = readLauncherRecord(storage(JSON.stringify({...defaultAiSettings(), key: 'sk-test-FAKE', apiKey: 'sk-test-FAKE'})));
    expect(JSON.stringify(record)).not.toContain('sk-test');
  });
  it('picks the app the pill opens: the subscription app, else the connected provider\'s own app, else none', () => {
    expect(launcherApp({...DEFAULT_LAUNCHER_RECORD, mode: 'subscription', subscriptionApp: 'claude'})?.name).toBe('Claude');
    expect(launcherApp({...DEFAULT_LAUNCHER_RECORD, enabled: true, mode: 'api', provider: 'openai'})?.url).toBe('https://chatgpt.com/');
    expect(launcherApp({...DEFAULT_LAUNCHER_RECORD, enabled: true, mode: 'local', provider: 'local'})).toBeNull();
    expect(launcherApp({...DEFAULT_LAUNCHER_RECORD, enabled: false, mode: 'api', provider: 'openai'})).toBeNull();
    expect(launcherApp({...DEFAULT_LAUNCHER_RECORD, enabled: true, mode: 'api', provider: 'nope'})).toBeNull();
  });
});
