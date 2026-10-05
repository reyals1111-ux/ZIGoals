import 'fake-indexeddb/auto';
import {afterEach, expect, test} from 'vitest';
import {AI_KEYS_DATABASE, SHOWCASE_SCOPE, dropMemoryKeys, forgetAiKeys, forgetKey, hasRememberedKey, holdKey, readKey, rememberKey, rememberedScopes} from './keys';

// ADR-012, Part 2 [TIER 3]: a remembered key is sealed with a non-extractable device key; nothing readable is stored.
const FAKE = 'sk-test-FAKE-1111111111111111', ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const listed = async () => (await indexedDB.databases()).some(db => db.name === AI_KEYS_DATABASE);
async function rawRecords(): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(AI_KEYS_DATABASE, 1);
    open.onsuccess = () => { const db = open.result; const r = db.transaction('keys', 'readonly').objectStore('keys').getAll(); r.onsuccess = () => { db.close(); resolve(r.result); }; r.onerror = () => reject(r.error); };
    open.onerror = () => reject(open.error);
  });
}
afterEach(async () => { dropMemoryKeys(); await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(AI_KEYS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); });

test('reading on a browser that never remembered creates nothing; a held key stays in memory only', async () => {
  expect(await readKey('local', 'openai')).toBeNull(); expect(await hasRememberedKey('local', 'openai')).toBe(false); expect(await rememberedScopes()).toEqual([]);
  expect(await listed()).toBe(false);
  holdKey('local', 'openai', FAKE);
  expect(await readKey('local', 'openai')).toBe(FAKE); expect(await listed()).toBe(false); expect(await hasRememberedKey('local', 'openai')).toBe(false);
  dropMemoryKeys(); expect(await readKey('local', 'openai')).toBeNull();
});
test('a remembered key round-trips, is sealed on disk, is bound to its scope and provider, and is forgotten per key or per scope', async () => {
  await rememberKey('local', 'openai', FAKE); await rememberKey(ACCOUNT, 'anthropic', 'sk-ant-FAKE-2222');
  expect(await readKey('local', 'openai')).toBe(FAKE); expect(await readKey(ACCOUNT, 'anthropic')).toBe('sk-ant-FAKE-2222');
  expect(await readKey('local', 'anthropic')).toBeNull(); expect(await readKey(ACCOUNT, 'openai')).toBeNull();
  expect(await hasRememberedKey('local', 'openai')).toBe(true); expect((await rememberedScopes()).sort()).toEqual([ACCOUNT, 'local']);
  const records = await rawRecords(); expect(records).toHaveLength(2);
  const bytes = JSON.stringify(records); expect(bytes).not.toContain(FAKE); expect(bytes).not.toContain('sk-ant'); expect(bytes).toMatch(/"ciphertext"/);
  await forgetKey('local', 'openai'); expect(await readKey('local', 'openai')).toBeNull(); expect(await readKey(ACCOUNT, 'anthropic')).toBe('sk-ant-FAKE-2222');
  await forgetAiKeys(ACCOUNT); expect(await readKey(ACCOUNT, 'anthropic')).toBeNull(); expect(await rememberedScopes()).toEqual([]);
});
test('the wrapping key is a non-extractable AES-GCM key; a record moved to another slot cannot be opened; Showcase is refused', async () => {
  await rememberKey('local', 'gemini', FAKE);
  const wrap = await new Promise<unknown>((resolve, reject) => { const open = indexedDB.open(AI_KEYS_DATABASE, 1); open.onsuccess = () => { const db = open.result; const r = db.transaction('wrap', 'readonly').objectStore('wrap').get('device'); r.onsuccess = () => { db.close(); resolve(r.result); }; r.onerror = () => reject(r.error); }; });
  expect(wrap).toBeInstanceOf(CryptoKey); expect((wrap as CryptoKey).extractable).toBe(false); expect(((wrap as CryptoKey).algorithm as AesKeyAlgorithm).length).toBe(256);
  await expect(crypto.subtle.exportKey('raw', wrap as CryptoKey)).rejects.toThrow();
  // The same sealed record under another provider's slot: the additional data no longer matches, so nothing opens.
  await new Promise<void>((resolve, reject) => { const open = indexedDB.open(AI_KEYS_DATABASE, 1); open.onsuccess = () => { const db = open.result, t = db.transaction('keys', 'readwrite'), store = t.objectStore('keys'); const get = store.get('local:gemini'); get.onsuccess = () => { store.put({...(get.result as object), provider: 'xai'}, 'local:xai'); }; t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error); }; });
  expect(await readKey('local', 'xai')).toBeNull(); expect(await readKey('local', 'gemini')).toBe(FAKE);
  await expect(rememberKey(SHOWCASE_SCOPE, 'openai', FAKE)).rejects.toThrow(/tab only/);
  await expect(rememberKey('local', 'openai', '')).rejects.toThrow();
  holdKey(SHOWCASE_SCOPE, 'openai', FAKE); expect(await readKey(SHOWCASE_SCOPE, 'openai')).toBe(FAKE);
});
