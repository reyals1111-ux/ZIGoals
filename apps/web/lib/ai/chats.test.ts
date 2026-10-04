import 'fake-indexeddb/auto';
import {afterEach, expect, test} from 'vitest';
import {AI_CHATS_DATABASE, MAX_CHATS, chatSchema, forgetChats, indexedDbChatStore, newChat, sessionChatStore, titleFor, type Chat} from './chats';
import {AI_CHATS_SESSION_KEY} from './settings';

// ADR-012, Part 2: conversations per scope, bounded and validated; Showcase chats stay in the tab's storage.
afterEach(async () => { await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(AI_CHATS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); });
const now = new Date('2026-10-04T10:00:00Z');
function chat(scope: string, id: string, text: string, minutes = 0): Chat {
  const c = newChat(scope, 'openai', 'mock-chat-1', new Date(now.getTime() + minutes * 60_000), id);
  return {...c, title: titleFor(text), turns: [{id: `${id}-u`, role: 'user', text, at: c.createdAt}, {id: `${id}-a`, role: 'assistant', text: 'MOCK answer', at: c.createdAt, provider: 'openai', model: 'mock-chat-1', usage: {input: 10, output: 2}}]};
}
test('IndexedDB: list, read, save, rename, search and remove within one scope; another scope sees nothing; the cap refuses, never trims', async () => {
  const a = indexedDbChatStore('local'), b = indexedDbChatStore('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  expect(await a.list()).toEqual([]); expect(await a.read('x')).toBeNull();
  await a.save(chat('local', 'c1', 'How many glasses of water today?')); await a.save(chat('local', 'c2', 'Plan my week', 5)); await b.save(chat('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'c3', 'Other account'));
  expect((await a.list()).map(c => c.id)).toEqual(['c2', 'c1']); expect((await a.list())[0]).toMatchObject({title: 'Plan my week', turnCount: 2, provider: 'openai', model: 'mock-chat-1'});
  expect((await b.list()).map(c => c.id)).toEqual(['c3']);
  expect((await a.search('water')).map(c => c.id)).toEqual(['c1']); expect((await a.search('mock answer')).map(c => c.id)).toEqual(['c2', 'c1']);
  await a.rename('c1', 'Water'); expect((await a.read('c1'))?.title).toBe('Water');
  await a.remove('c1'); expect((await a.list()).map(c => c.id)).toEqual(['c2']);
  await forgetChats('local'); expect(await a.list()).toEqual([]); expect((await b.list()).length).toBe(1);
  for (let i = 0; i < MAX_CHATS; i++) await a.save(chat('local', `fill-${i}`, `chat ${i}`));
  await expect(a.save(chat('local', 'one-too-many', 'x'))).rejects.toThrow(/saved chats/);
  await a.save(chat('local', 'fill-3', 'an existing chat may still be updated'));
  expect((await a.list()).length).toBe(MAX_CHATS);
});
test('a chat never carries a key field; invalid records are refused on save and skipped on read', async () => {
  expect(Object.keys(chatSchema.shape).join()).not.toMatch(/key|secret|token/i);
  const store = indexedDbChatStore('local');
  await expect(store.save({...chat('local', 'c1', 'x'), apiKey: 'sk-test-FAKE'} as never)).rejects.toThrow();
  await store.save(chat('local', 'ok', 'fine'));
  await new Promise<void>((resolve, reject) => { const open = indexedDB.open(AI_CHATS_DATABASE, 1); open.onsuccess = () => { const db = open.result, t = db.transaction('chats', 'readwrite'); t.objectStore('chats').put({version: 9, junk: true}, 'local:junk'); t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error); }; });
  expect((await store.list()).map(c => c.id)).toEqual(['ok']); expect(await store.read('junk')).toBeNull();
});
test('Showcase: the tab storage holds the chats under zigoals:ai-chats:v1; unreadable bytes read as none; removeAll clears the key', async () => {
  const map = new Map<string, string>(), storage = {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }};
  const store = sessionChatStore(storage, 'showcase');
  await store.save(chat('showcase', 's1', 'Showcase question'));
  expect(map.has(AI_CHATS_SESSION_KEY)).toBe(true); expect((await store.list()).map(c => c.id)).toEqual(['s1']); expect((await store.read('s1'))?.turns.length).toBe(2);
  await store.rename('s1', 'Renamed'); expect((await store.read('s1'))?.title).toBe('Renamed');
  map.set(AI_CHATS_SESSION_KEY, 'broken'); expect(await store.list()).toEqual([]);
  await store.save(chat('showcase', 's2', 'again')); expect((await store.list()).map(c => c.id)).toEqual(['s2']);
  await store.removeAll(); expect(map.has(AI_CHATS_SESSION_KEY)).toBe(false);
  expect(titleFor('  a very long first message that keeps going and going well past sixty characters in total ')).toMatch(/…$/); expect(titleFor('   ')).toBe('New chat');
});
