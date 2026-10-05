import 'fake-indexeddb/auto';
import {afterEach, expect, test} from 'vitest';
import {DEVICE_KEYS, EVERYTHING_KEYS, collectEverything} from '../export/everything';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS} from '../onboarding';
import {AI_CHATS_DATABASE, indexedDbChatStore, newChat} from './chats';
import {AI_KEYS_DATABASE, dropMemoryKeys, holdKey, rememberKey} from './keys';
import {AI_SETTINGS_KEY, defaultAiSettings} from './settings';

// ADR-012, Part 2: the export carries ZIGi's settings and chats, never a provider key; the settings key is personal.
const FAKE = 'sk-test-FAKE-3333333333333333';
afterEach(async () => { dropMemoryKeys(); for (const name of [AI_KEYS_DATABASE, AI_CHATS_DATABASE]) await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); });

test('the settings key is a personal device key, exported with the device keys; no key store is ever read by the export', () => {
  expect(DEVICE_RECORD_KEYS).toContain(AI_SETTINGS_KEY); expect(NON_PERSONAL_KEYS).not.toContain(AI_SETTINGS_KEY);
  expect(DEVICE_KEYS.ai).toBe(AI_SETTINGS_KEY);
  expect(EVERYTHING_KEYS).toContain(AI_SETTINGS_KEY);
  expect(EVERYTHING_KEYS.join(' ')).not.toMatch(/ai-keys|zigoals-ai-keys/);
});
test('an export with a remembered and a held key, settings and chats contains the settings and the chats and not one byte of a key', async () => {
  await rememberKey('local', 'openai', FAKE); holdKey('local', 'anthropic', 'sk-ant-FAKE-4444');
  const store = indexedDbChatStore('local'), chat = newChat('local', 'openai', 'mock-chat-1', new Date('2026-10-04T10:00:00Z'), 'c1');
  await store.save({...chat, title: 'Water', turns: [{id: 't1', role: 'user', text: 'How much water?', at: chat.createdAt}, {id: 't2', role: 'assistant', text: 'MOCK: two glasses', at: chat.createdAt, provider: 'openai', model: 'mock-chat-1', usage: {input: 12, output: 4}}]});
  const settings = {...defaultAiSettings(), enabled: true, mode: 'api' as const, provider: 'openai' as const, model: 'mock-chat-1', rememberKey: true};
  const chats = await Promise.all((await store.list()).map(s => store.read(s.id)));
  const collected = collectEverything({[AI_SETTINGS_KEY]: JSON.stringify(settings)}, {now: new Date('2026-10-04T10:05:00Z'), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null, aiChats: chats});
  expect(collected.json.device.ai).toEqual(settings);
  expect(collected.json.device.aiChats).toHaveLength(1);
  const text = JSON.stringify(collected.json) + Object.values(collected.csv).join('\n');
  expect(text).toContain('MOCK: two glasses'); expect(text).not.toContain(FAKE); expect(text).not.toContain('sk-ant'); expect(text).not.toMatch(/ciphertext/);
  expect(collected.unreadable).toEqual([]);
});
