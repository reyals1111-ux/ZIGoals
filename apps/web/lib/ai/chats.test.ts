import 'fake-indexeddb/auto';
import {afterEach, expect, test} from 'vitest';
import {z} from 'zod';
import {AI_CHATS_DATABASE, MAX_CHATS, chatSchema, chatV2Schema, forgetChats, indexedDbChatStore, needsVersion2, newChat, sessionChatStore, titleFor, type Chat} from './chats';
import {PROVIDER_IDS} from './providers';
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

// Session V storage foundation ([TIER 3], ADR-014 S4): build #29's chat reader, frozen here exactly as it shipped, so
// a chat that uses nothing new is still written as version 1 that #29 reads, and a version 2 chat is skipped by #29
// without an error and without being touched.
const frozen29 = (() => {
  const stamp = z.iso.datetime();
  const turn = z.strictObject({id: z.string().min(1).max(80), role: z.enum(['user', 'assistant']), text: z.string().max(20_000), at: stamp, provider: z.enum(PROVIDER_IDS).nullable().optional(), model: z.string().max(200).nullable().optional(), usage: z.strictObject({input: z.number().int().min(0).nullable(), output: z.number().int().min(0).nullable()}).nullable().optional(), stopped: z.string().max(200).optional()});
  return z.strictObject({version: z.literal(1), id: z.string().min(1).max(80), scope: z.string().min(1).max(80), title: z.string().min(1).max(120), provider: z.enum(PROVIDER_IDS).nullable(), model: z.string().max(200).nullable(), createdAt: stamp, updatedAt: stamp, turns: z.array(turn).max(200)});
})();
const raw = (key: string) => new Promise<unknown>((resolve, reject) => { const open = indexedDB.open(AI_CHATS_DATABASE, 1); open.onsuccess = () => { const db = open.result, r = db.transaction('chats', 'readonly').objectStore('chats').get(key); r.onsuccess = () => { db.close(); resolve(r.result); }; r.onerror = () => reject(r.error); }; open.onerror = () => reject(open.error); });
test('chats stay version 1 for build #29 unless they use something new; version 2 only then, and #29 skips it untouched', async () => {
  const store = indexedDbChatStore('local');
  await store.save(chat('local', 'plain', 'How many glasses of water today?'));
  const plain = await raw('local:plain');
  expect(frozen29.safeParse(plain).success).toBe(true); expect((plain as {version: number}).version).toBe(1);
  // V fields left undefined change nothing.
  await store.save({...chat('local', 'undef', 'x'), pinned: undefined, turns: chat('local', 'undef', 'x').turns.map(t => ({...t, source: undefined, tools: undefined}))});
  expect(frozen29.safeParse(await raw('local:undef')).success).toBe(true);
  const rich = chat('local', 'rich', 'How many minutes did I meditate this month?');
  await store.save({...rich, pinned: true, turns: [rich.turns[0]!, {...rich.turns[1]!, source: 'local', tools: [{tool: 'habit_stats', args: {habit: 'h1', range: 'this month', metric: 'minutes'}, label: 'Meditate · this month'}], feedback: 'up'}]});
  const stored = await raw('local:rich');
  expect((stored as {version: number}).version).toBe(2); expect(frozen29.safeParse(stored).success).toBe(false);
  expect(JSON.stringify(stored)).not.toMatch(/"result"|"data":/); // a tool's arguments and label only, never its result
  // This build reads both; #29's per-record read skips the version 2 chat and keeps the rest.
  expect((await store.list()).map(c => c.id).sort()).toEqual(['plain', 'rich', 'undef']);
  expect(await store.read('rich')).toMatchObject({version: 2, pinned: true, turns: [{role: 'user'}, {source: 'local', feedback: 'up', tools: [{tool: 'habit_stats', label: 'Meditate · this month'}]}]});
  const all = await new Promise<unknown[]>((resolve, reject) => { const open = indexedDB.open(AI_CHATS_DATABASE, 1); open.onsuccess = () => { const db = open.result, r = db.transaction('chats', 'readonly').objectStore('chats').getAll(); r.onsuccess = () => { db.close(); resolve(r.result); }; r.onerror = () => reject(r.error); }; open.onerror = () => reject(open.error); });
  expect(all.filter(v => frozen29.safeParse(v).success).map(v => (v as {id: string}).id).sort()).toEqual(['plain', 'undef']);
  // Renaming keeps the version; removing every V field writes version 1 again.
  await store.rename('rich', 'Meditation'); expect(await raw('local:rich')).toMatchObject({version: 2, title: 'Meditation', pinned: true});
  const back = (await store.read('rich'))!;
  await store.save({...back, pinned: undefined, turns: back.turns.map(({source, tools, feedback, ...turn}) => { void source; void tools; void feedback; return turn; })});
  expect(frozen29.safeParse(await raw('local:rich')).success).toBe(true);
});
test('version 2 is strict: no unlisted field and no image bytes are ever stored; the Showcase store reads both versions', async () => {
  const store = indexedDbChatStore('local'), base = chat('local', 'photo', 'x');
  await store.save({...base, turns: [{...base.turns[0]!, attachments: [{kind: 'photo'}]}, base.turns[1]!]});
  expect(await raw('local:photo')).toMatchObject({version: 2, turns: [{attachments: [{kind: 'photo'}]}, {}]});
  await expect(store.save({...base, turns: [{...base.turns[0]!, attachments: [{kind: 'photo', dataUrl: 'data:image/jpeg;base64,AAAA'}]}]} as never)).rejects.toThrow();
  await expect(store.save({...base, pinned: true, apiKey: 'sk-test-FAKE'} as never)).rejects.toThrow();
  await expect(store.save({...base, turns: [{...base.turns[0]!, tools: [{tool: 'habit_stats', label: 'x', result: {minutes: 5}}]}]} as never)).rejects.toThrow();
  expect(Object.keys(chatV2Schema.shape).join()).not.toMatch(/key|secret|token/i);
  // A record a later build wrote with a field this build does not know is skipped here and left exactly as it is.
  await new Promise<void>((resolve, reject) => { const open = indexedDB.open(AI_CHATS_DATABASE, 1); open.onsuccess = () => { const db = open.result, t = db.transaction('chats', 'readwrite'); t.objectStore('chats').put({...base, id: 'future', version: 2, later: true}, 'local:future'); t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error); }; open.onerror = () => reject(open.error); });
  expect((await store.list()).map(c => c.id)).toEqual(['photo']); expect(await raw('local:future')).toMatchObject({later: true});
  const map = new Map<string, string>(), session = {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }};
  const showcase = sessionChatStore(session, 'showcase'), c = chat('showcase', 's2', 'Showcase question');
  await showcase.save(c); await showcase.save({...chat('showcase', 's3', 'Pinned one'), pinned: true});
  expect((await showcase.list()).map(x => x.id).sort()).toEqual(['s2', 's3']);
  expect(JSON.parse(map.get(AI_CHATS_SESSION_KEY)!).chats.map((x: {version: number}) => x.version).sort()).toEqual([1, 2]);
  expect(needsVersion2(c)).toBe(false); expect(needsVersion2({...c, area: 'health'})).toBe(true);
});
